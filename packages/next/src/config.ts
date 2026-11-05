import "server-only";
import { headers } from "next/headers";
import { createFewchursClient, DEFAULT_BASE_URL, type FewchursClient } from "@fewchurs/react/core";

export const DEFAULT_API_PATH = "/api/fewchurs";

export interface ServerConfig {
  apiKey?: string;
  baseUrl?: string;
  language?: string;
  /** The domain the API key is checked against. Defaults to `FEWCHURS_APP_ID`, then your site's host. */
  appId?: string;
}

export function resolveApiKey(apiKey?: string): string | undefined {
  return apiKey ?? process.env.FEWCHURS_API_KEY;
}

export function resolveBaseUrl(baseUrl?: string): string {
  return baseUrl ?? process.env.FEWCHURS_BASE_URL ?? DEFAULT_BASE_URL;
}

export function resolveApiPath(apiPath?: string): string {
  return (apiPath ?? process.env.FEWCHURS_API_PATH ?? DEFAULT_API_PATH).replace(/\/$/, "");
}

/** A domain set by the developer, which replaces the one read from the request. */
export function configuredAppId(appId?: string): string | undefined {
  return appId?.trim() || process.env.FEWCHURS_APP_ID?.trim() || undefined;
}

/** The site's host name without a port. A reverse proxy reports the public one in `x-forwarded-host`. */
export function requestHostname(requestHeaders: Headers): string | undefined {
  const forwarded = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwarded || requestHeaders.get("host")?.trim();
  if (!host) return undefined;
  try {
    return new URL(`http://${host}`).hostname;
  } catch {
    return undefined;
  }
}

export async function serverClient(
  deviceId: string | null,
  config: ServerConfig = {},
): Promise<FewchursClient> {
  const apiKey = resolveApiKey(config.apiKey);
  if (!apiKey) {
    throw new Error(
      "[fewchurs] No API key. Set FEWCHURS_API_KEY in your environment, or pass apiKey to the server component or createHandler().",
    );
  }

  return createFewchursClient({
    apiKey,
    baseUrl: resolveBaseUrl(config.baseUrl),
    deviceId,
    language: config.language,
    // Only read the request when needed, so a page with a set domain can still render statically.
    appId: configuredAppId(config.appId) ?? requestHostname(await headers()),
  });
}
