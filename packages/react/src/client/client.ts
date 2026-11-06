import { DEFAULT_BASE_URL, DEFAULT_PAGE_SIZE, SDK_HEADER } from "./constants";
import { errorFromResponse, networkError, type FewchursError, type Result } from "./errors";
import {
  normalizeComment,
  normalizeCommentPage,
  normalizeConfig,
  normalizeFeature,
  normalizeFeaturePage,
  normalizeVote,
} from "./normalize";
import { validateCommentInput, validateEmail, validateFeatureInput } from "./validate";
import type {
  Comment,
  CommentPage,
  CreateCommentInput,
  Feature,
  FeaturePage,
  FewchursConfig,
  ListCommentsParams,
  ListFeaturesParams,
  SubmitFeatureInput,
} from "../types";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface FewchursClientOptions {
  /** Server-side, or in a SPA where the key is publishable. Omit when calling your own proxy. */
  apiKey?: string;
  /** `https://www.fewchurs.com/api/v1` by default, or a proxy path such as `/api/fewchurs`. */
  baseUrl?: string;
  deviceId?: string | null | (() => string | null);
  /** Sent as `Accept-Language`, so server-side copy and emails match the visitor. */
  language?: string;
  /**
   * The domain the API key is checked against, for calls made from a server. A browser reports
   * its own domain through `Origin`, which always wins, so leave this out in a SPA.
   */
  appId?: string;
  fetch?: FetchLike;
  retries?: number;
  retryDelayMs?: number;
}

export interface FewchursClient {
  readonly baseUrl: string;
  getDeviceId(): string | null;
  getConfig(signal?: AbortSignal): Promise<Result<FewchursConfig>>;
  listFeatures(params?: ListFeaturesParams, signal?: AbortSignal): Promise<Result<FeaturePage>>;
  getFeature(featureId: string, signal?: AbortSignal): Promise<Result<Feature>>;
  submitFeature(input: SubmitFeatureInput): Promise<Result<Feature>>;
  vote(featureId: string): Promise<Result<{ upvoteCount: number; hasVoted: boolean }>>;
  unvote(featureId: string): Promise<Result<{ upvoteCount: number; hasVoted: boolean }>>;
  follow(featureId: string, email: string): Promise<Result<{ following: boolean }>>;
  unfollow(featureId: string): Promise<Result<{ following: boolean }>>;
  listComments(
    featureId: string,
    params?: ListCommentsParams,
    signal?: AbortSignal,
  ): Promise<Result<CommentPage>>;
  createComment(input: CreateCommentInput): Promise<Result<Comment>>;
}

interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  signal?: AbortSignal;
}

export function createFewchursClient(options: FewchursClientOptions = {}): FewchursClient {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const doFetch = options.fetch ?? globalThis.fetch?.bind(globalThis);
  const retries = options.retries ?? 1;
  const retryDelayMs = options.retryDelayMs ?? 250;

  function getDeviceId(): string | null {
    return typeof options.deviceId === "function" ? options.deviceId() : (options.deviceId ?? null);
  }

  function headers(hasBody: boolean): Record<string, string> {
    const result: Record<string, string> = {
      Accept: "application/json",
      "X-Fewchurs-Sdk": SDK_HEADER,
    };
    if (hasBody) result["Content-Type"] = "application/json";
    if (options.apiKey) result.Authorization = `Bearer ${options.apiKey}`;
    const deviceId = getDeviceId();
    if (deviceId) result["X-Device-Id"] = deviceId;
    if (options.language) result["Accept-Language"] = options.language;
    if (options.appId) result["X-Fewchurs-App-Id"] = options.appId;
    return result;
  }

  function url(path: string, query?: RequestOptions["query"]): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
    }
    const qs = search.toString();
    return `${baseUrl}${path}${qs ? `?${qs}` : ""}`;
  }

  async function request<T>(
    path: string,
    map: (body: unknown) => T,
    { method = "GET", body, query, signal }: RequestOptions = {},
  ): Promise<Result<T>> {
    if (!doFetch) return { ok: false, error: networkError("No fetch implementation available.") };

    const target = url(path, query);
    const init: RequestInit = { method, headers: headers(body !== undefined) };
    if (body !== undefined) init.body = JSON.stringify(body);
    if (signal) init.signal = signal;

    // Only GETs are retried: a retried POST could double-submit a request or a comment.
    const attempts = method === "GET" ? retries + 1 : 1;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      let response: Response;
      try {
        response = await doFetch(target, init);
      } catch (error) {
        if (signal?.aborted) return { ok: false, error: networkError("Request aborted.") };
        if (attempt < attempts - 1) {
          await delay(retryDelayMs);
          continue;
        }
        const failure = networkError(messageOf(error));
        logError(failure);
        return { ok: false, error: failure };
      }

      if (response.ok) {
        const payload = await readJson(response);
        return { ok: true, data: map(payload) };
      }

      if (response.status >= 500 && attempt < attempts - 1) {
        await delay(retryDelayMs);
        continue;
      }

      const failure = errorFromResponse(response.status, await readJson(response));
      logError(failure);
      return { ok: false, error: failure };
    }

    return { ok: false, error: networkError() };
  }

  return {
    baseUrl,
    getDeviceId,

    getConfig: (signal) => request("/config", normalizeConfig, { signal }),

    listFeatures: (params = {}, signal) =>
      request("/features", (body) => normalizeFeaturePage(body, getDeviceId()), {
        query: {
          sort: params.sort ?? "new",
          limit: params.limit ?? DEFAULT_PAGE_SIZE,
          cursor: params.cursor ?? undefined,
          status: params.status?.length ? params.status.join(",") : undefined,
        },
        signal,
      }),

    getFeature: (featureId, signal) =>
      request(
        `/features/${encodeURIComponent(featureId)}`,
        (body) => normalizeFeature(body, getDeviceId()),
        { signal },
      ),

    submitFeature: async (input) => {
      const invalid = validateFeatureInput(input);
      if (invalid) return { ok: false, error: invalid };
      return request("/features", (body) => normalizeFeature(body, getDeviceId()), {
        method: "POST",
        body: {
          title: input.title.trim(),
          description: (input.description ?? "").trim(),
          ...(input.email ? { email: input.email.trim() } : {}),
          isSubscriber: input.isSubscriber ?? false,
        },
      });
    },

    vote: (featureId) =>
      request(`/features/${encodeURIComponent(featureId)}/vote`, normalizeVote, { method: "POST" }),

    unvote: (featureId) =>
      request(`/features/${encodeURIComponent(featureId)}/vote`, normalizeVote, {
        method: "DELETE",
      }),

    follow: async (featureId, email) => {
      const invalid = validateEmail(email);
      if (invalid) return { ok: false, error: invalid };
      return request(
        `/features/${encodeURIComponent(featureId)}/follow`,
        () => ({ following: true }),
        {
          method: "POST",
          body: { email: email.trim() },
        },
      );
    },

    unfollow: (featureId) =>
      request(`/features/${encodeURIComponent(featureId)}/follow`, () => ({ following: false }), {
        method: "DELETE",
      }),

    listComments: (featureId, params = {}, signal) =>
      request(
        `/features/${encodeURIComponent(featureId)}/comments`,
        (body) => normalizeCommentPage(body, getDeviceId()),
        {
          query: { limit: params.limit ?? DEFAULT_PAGE_SIZE, cursor: params.cursor ?? undefined },
          signal,
        },
      ),

    // The server takes the feature id in the body here; POST /features/{id}/comments is a 405.
    createComment: async (input) => {
      const invalid = validateCommentInput(input);
      if (invalid) return { ok: false, error: invalid };
      return request("/comments", (body) => normalizeComment(body, getDeviceId()), {
        method: "POST",
        body: {
          featureId: input.featureId,
          text: input.text.trim(),
          ...(input.authorName?.trim() ? { authorName: input.authorName.trim() } : {}),
        },
      });
    },
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Network request failed.";
}

// Declared, not imported from @types/node: this is a browser package, and bundlers replace
// `process.env.NODE_ENV` inline, so the check costs nothing in a production build.
declare const process: { env?: Record<string, string | undefined> } | undefined;

const INVALID_KEY_HELP =
  "The API key was rejected. Check FEWCHURS_API_KEY (server) or the apiKey passed to FewchursProvider, and that the key is active in your Fewchurs dashboard.";

const loggedErrors = new Set<string>();

function logError(error: FewchursError): void {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") return;
  const isInvalidKey = error.code === "invalid_key" && error.status === 401;
  const detail = isInvalidKey ? INVALID_KEY_HELP : error.message;
  if (loggedErrors.has(detail)) return;
  loggedErrors.add(detail);
  console.warn(`[fewchurs] : ${detail}`);
}
