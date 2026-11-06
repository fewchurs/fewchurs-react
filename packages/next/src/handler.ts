import "server-only";
import { createDeviceId, NOT_CONFIGURED_MESSAGE } from "@fewchurs/react/core";
import {
  configuredAppId,
  requestHostname,
  resolveApiKey,
  resolveApiPath,
  resolveBaseUrl,
} from "./config";
import { DEVICE_ID_COOKIE, DEVICE_ID_MAX_AGE, SDK_HEADER } from "./constants";
import type { DeviceIdResolver } from "./identity";

export interface HandlerOptions {
  apiKey?: string;
  baseUrl?: string;
  /** The domain the API key is checked against. Defaults to `FEWCHURS_APP_ID`, then your site's host. */
  appId?: string;
  /** Where the handler is mounted, when it is not `/api/fewchurs`. */
  apiPath?: string;
  /** Return a stable, hashed id for the signed-in visitor so votes follow the account. */
  deviceId?: DeviceIdResolver;
}

type RouteParams = { route?: string[] };

/** What Next passes: a Promise in 15, a plain object in 14. Both are awaited the same way. */
type IncomingContext = { params?: RouteParams | Promise<RouteParams> };

// Next 15's route check wants a required second argument whose `params` is a Promise. The
// handler itself takes `IncomingContext`, so Next 14's plain object still works at runtime.
type RouteContext = { params: Promise<RouteParams> };

export type RouteHandler = (request: Request, context: RouteContext) => Promise<Response>;

/** Only the endpoints the board needs: everything else is a 404, not a proxy to the API. */
const ALLOWED: Array<{ method: string; pattern: RegExp }> = [
  { method: "GET", pattern: /^config$/ },
  { method: "GET", pattern: /^features$/ },
  { method: "POST", pattern: /^features$/ },
  { method: "GET", pattern: /^features\/[^/]+$/ },
  { method: "POST", pattern: /^features\/[^/]+\/vote$/ },
  { method: "DELETE", pattern: /^features\/[^/]+\/vote$/ },
  { method: "POST", pattern: /^features\/[^/]+\/follow$/ },
  { method: "DELETE", pattern: /^features\/[^/]+\/follow$/ },
  { method: "GET", pattern: /^features\/[^/]+\/comments$/ },
  { method: "POST", pattern: /^comments$/ },
];

const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

export function createHandler(options: HandlerOptions = {}): {
  GET: RouteHandler;
  POST: RouteHandler;
  DELETE: RouteHandler;
} {
  async function handle(request: Request, context?: IncomingContext): Promise<Response> {
    const path = await routePath(request, context, resolveApiPath(options.apiPath));

    if (!ALLOWED.some((route) => route.method === request.method && route.pattern.test(path))) {
      return json({ error: { code: "not_found", message: "Unknown Fewchurs route." } }, 404);
    }

    const apiKey = resolveApiKey(options.apiKey);
    if (!apiKey) {
      console.error(
        "[fewchurs] No API key. Set FEWCHURS_API_KEY, or pass apiKey to createHandler().",
      );
      return json({ error: { code: "internal", message: NOT_CONFIGURED_MESSAGE } }, 500);
    }

    const cookieValue = readCookie(request, DEVICE_ID_COOKIE);
    const custom = options.deviceId ? await options.deviceId() : null;
    const deviceId = custom ?? cookieValue ?? claimedDeviceId(request) ?? createDeviceId();

    const target = `${resolveBaseUrl(options.baseUrl)}/${path}${new URL(request.url).search}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "X-Device-Id": deviceId,
      "X-Fewchurs-Sdk": SDK_HEADER,
      "X-Fewchurs-App-Id":
        configuredAppId(options.appId) ??
        requestHostname(request.headers) ??
        new URL(request.url).hostname,
      Accept: "application/json",
    };
    const language = request.headers.get("accept-language");
    if (language) headers["Accept-Language"] = language;

    const body = request.method === "GET" ? undefined : await request.text();
    if (body) headers["Content-Type"] = "application/json";

    let upstream: Response;
    try {
      upstream = await fetch(target, { method: request.method, headers, body, cache: "no-store" });
    } catch {
      return json({ error: { code: "internal", message: "Could not reach Fewchurs." } }, 502);
    }

    const text = await upstream.text();
    if (upstream.status === 403) logRefusal(text);

    const response = new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });

    // A visitor keeps the same id across requests without the browser ever seeing the key,
    // and an httpOnly cookie means page scripts cannot read or change it either.
    if (!custom && deviceId !== cookieValue) {
      response.headers.append("Set-Cookie", serializeCookie(deviceId));
    }

    return response;
  }

  return { GET: handle, POST: handle, DELETE: handle };
}

const defaultHandler = createHandler();

export const GET = defaultHandler.GET;
export const POST = defaultHandler.POST;
export const DELETE = defaultHandler.DELETE;

let loggedRefusal = false;

/** Visitors only see a safe message, so a live site's server log is where the domain gets named. */
function logRefusal(body: string): void {
  if (loggedRefusal) return;
  try {
    const error = (JSON.parse(body) as { error?: { code?: string; message?: string } }).error;
    if (error?.code !== "wrong_app") return;
    loggedRefusal = true;
    console.error(`[fewchurs] ${error.message}`);
  } catch {
    // Not JSON, so it isn't a refusal from Fewchurs.
  }
}

async function routePath(
  request: Request,
  context: IncomingContext | undefined,
  apiPath: string,
): Promise<string> {
  const params = await context?.params;
  if (params?.route?.length) return params.route.map(encodeURIComponent).join("/");

  const { pathname } = new URL(request.url);
  const index = pathname.indexOf(apiPath);
  return index === -1 ? "" : pathname.slice(index + apiPath.length).replace(/^\//, "");
}

/**
 * The first request from a server-rendered board carries the id the page was rendered with,
 * so adopting it keeps the server's `hasVoted` answers and the browser's in agreement.
 */
function claimedDeviceId(request: Request): string | null {
  const claimed = request.headers.get("x-device-id");
  return claimed && DEVICE_ID_PATTERN.test(claimed) ? claimed : null;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function serializeCookie(deviceId: string): string {
  const parts = [
    `${DEVICE_ID_COOKIE}=${encodeURIComponent(deviceId)}`,
    "Path=/",
    `Max-Age=${DEVICE_ID_MAX_AGE}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
