import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFewchursClient } from "../src/client/client";
import { SDK_VERSION } from "../src/client/constants";
import { userMessage } from "../src/client/errors";
import packageJson from "../package.json";
import { BASE_URL, lastRequest, rawFeature, server } from "./server";

function client(overrides = {}) {
  return createFewchursClient({
    apiKey: "fr_live_test",
    baseUrl: BASE_URL,
    deviceId: "device-1",
    language: "de-DE",
    retryDelayMs: 0,
    ...overrides,
  });
}

describe("headers", () => {
  it("sends the key, device id, SDK name and language", async () => {
    await client().listFeatures();
    const request = lastRequest();

    expect(request.headers.get("authorization")).toBe("Bearer fr_live_test");
    expect(request.headers.get("x-device-id")).toBe("device-1");
    expect(request.headers.get("x-fewchurs-sdk")).toBe(`react/${packageJson.version}`);
    expect(request.headers.get("accept-language")).toBe("de-DE");
  });

  // The header is generated from package.json at build time; this catches a stale checkout.
  it("reports the published package version", () => {
    expect(SDK_VERSION).toBe(packageJson.version);
  });

  it("omits the key in proxy mode", async () => {
    await client({ apiKey: undefined }).listFeatures();
    expect(lastRequest().headers.get("authorization")).toBeNull();
  });
});

describe("endpoints", () => {
  it("passes sort, limit and cursor through", async () => {
    await client().listFeatures({ sort: "top", limit: 5, cursor: "page2" });
    const url = new URL(lastRequest().url);

    expect(url.searchParams.get("sort")).toBe("top");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.get("cursor")).toBe("page2");
  });

  it("creates a comment at POST /comments with the feature id in the body", async () => {
    const result = await client().createComment({ featureId: "a", text: "+1" });
    const request = lastRequest();

    expect(new URL(request.url).pathname).toBe("/v1/comments");
    expect(await request.json()).toMatchObject({ featureId: "a", text: "+1" });
    expect(result.ok).toBe(true);
  });

  it("reads an unknown status as `unknown` instead of failing", async () => {
    server.use(
      http.get(`${BASE_URL}/features`, () =>
        HttpResponse.json({
          features: [rawFeature({ id: "a", status: "shipped_to_beta" })],
          nextCursor: null,
        }),
      ),
    );

    const result = await client().listFeatures();
    expect(result.ok && result.data.features[0]?.status).toBe("unknown");
  });

  it("marks the visitor's own comment as theirs", async () => {
    const result = await client().listComments("a");
    expect(result.ok && result.data.comments[0]?.isMine).toBe(true);
    expect(result.ok && "deviceId" in (result.data.comments[0] ?? {})).toBe(false);
  });
});

describe("errors", () => {
  it.each([
    [401, "invalid_key", "invalid_key"],
    [403, "wrong_app", "invalid_key"],
    [400, "validation_failed", "validation_failed"],
    [400, "missing_device_id", "validation_failed"],
    [429, "rate_limited", "rate_limited"],
    [404, "not_found", "not_found"],
    [402, "limit_reached", "limit_reached"],
    [500, "internal", "server"],
  ])("maps %i %s to %s", async (status, code, expected) => {
    server.use(
      http.get(`${BASE_URL}/config`, () =>
        HttpResponse.json({ error: { code, message: "nope" } }, { status }),
      ),
    );

    const result = await client({ retries: 0 }).getConfig();
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe(expected);
  });

  it("reports a transport failure as a network error", async () => {
    server.use(http.get(`${BASE_URL}/config`, () => HttpResponse.error()));

    const result = await client({ retries: 0 }).getConfig();
    expect(!result.ok && result.error.code).toBe("network");
  });

  it("rejects input the server would reject, without a round trip", async () => {
    const result = await client().submitFeature({ title: "no" });

    expect(!result.ok && result.error.code).toBe("validation_failed");
    expect(() => lastRequest()).toThrow();
  });
});

describe("appId", () => {
  it("is sent when set", async () => {
    await createFewchursClient({ baseUrl: BASE_URL, appId: "afthal.app" }).getConfig();
    expect(lastRequest()?.headers.get("x-fewchurs-app-id")).toBe("afthal.app");
  });

  it("is left out by default, so a browser relies on Origin", async () => {
    await client().getConfig();
    expect(lastRequest()?.headers.has("x-fewchurs-app-id")).toBe(false);
  });
});

describe("wrong_app", () => {
  const message =
    "This API key is not set up for other.com. Add it to your app in the Fewchurs dashboard.";

  function refuseConfig() {
    let calls = 0;
    server.use(
      http.get(`${BASE_URL}/config`, () => {
        calls += 1;
        return HttpResponse.json({ error: { code: "wrong_app", message } }, { status: 403 });
      }),
    );
    return () => calls;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("becomes invalid_key and keeps the server's message", async () => {
    refuseConfig();

    const result = await client().getConfig();
    expect(!result.ok && result.error).toEqual({ code: "invalid_key", status: 403, message });
  });

  it("is not retried", async () => {
    const calls = refuseConfig();

    await client().getConfig();
    expect(calls()).toBe(1);
  });

  it("shows a visitor the safe message, not the app id", async () => {
    refuseConfig();

    const result = await client().getConfig();
    expect(!result.ok && userMessage(result.error)).toBe("Feedback is unavailable right now.");
  });

  it("logs the server's message once", async () => {
    refuseConfig();
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.resetModules();
    const fresh = await import("../src/client/client");
    const freshClient = fresh.createFewchursClient({ baseUrl: BASE_URL, retryDelayMs: 0 });

    await freshClient.getConfig();
    await freshClient.getConfig();

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(`[fewchurs] : ${message}`);
    expect(error).not.toHaveBeenCalled();
  });
});

describe("logging", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function freshClient() {
    vi.resetModules();
    const fresh = await import("../src/client/client");
    return fresh.createFewchursClient({ baseUrl: BASE_URL, retries: 0, retryDelayMs: 0 });
  }

  function failConfig(status: number, code: string, message: string) {
    server.use(
      http.get(`${BASE_URL}/config`, () =>
        HttpResponse.json({ error: { code, message } }, { status }),
      ),
    );
  }

  it.each([
    [500, "internal", "Database is down."],
    [429, "rate_limited", "Too many requests."],
    [404, "not_found", "No such feature."],
    [402, "limit_reached", "Plan limit reached."],
    [400, "validation_failed", "Title is too short."],
  ])("logs a %i %s with the server's message", async (status, code, message) => {
    failConfig(status, code, message);
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});

    await (await freshClient()).getConfig();

    expect(log).toHaveBeenCalledWith(`[fewchurs] : ${message}`);
  });

  it("explains a rejected key", async () => {
    failConfig(401, "invalid_key", "Invalid or inactive API key.");
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});

    await (await freshClient()).getConfig();

    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/^\[fewchurs\] : The API key was rejected/),
    );
  });

  it("logs a network failure", async () => {
    server.use(http.get(`${BASE_URL}/config`, () => HttpResponse.error()));
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});

    await (await freshClient()).getConfig();

    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]?.[0]).toMatch(/^\[fewchurs\] : /);
  });

  it("logs each different error once", async () => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fresh = await freshClient();

    failConfig(500, "internal", "First.");
    await fresh.getConfig();
    await fresh.getConfig();
    failConfig(500, "internal", "Second.");
    await fresh.getConfig();

    expect(log.mock.calls).toEqual([["[fewchurs] : First."], ["[fewchurs] : Second."]]);
  });

  it("does not log an aborted request", async () => {
    server.use(http.get(`${BASE_URL}/config`, () => HttpResponse.error()));
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    const controller = new AbortController();
    controller.abort();

    await (await freshClient()).getConfig(controller.signal);

    expect(log).not.toHaveBeenCalled();
  });

  it("does not log in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    failConfig(500, "internal", "Database is down.");
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});

    await (await freshClient()).getConfig();

    expect(log).not.toHaveBeenCalled();
  });
});

describe("retries", () => {
  it("retries a GET once after a server error", async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE_URL}/config`, () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json({ error: { code: "internal", message: "boom" } }, { status: 500 })
          : HttpResponse.json({ showBranding: false });
      }),
    );

    const result = await client().getConfig();
    expect(calls).toBe(2);
    expect(result.ok).toBe(true);
  });

  it("never retries a write", async () => {
    let calls = 0;
    server.use(
      http.post(`${BASE_URL}/comments`, () => {
        calls += 1;
        return HttpResponse.json({ error: { code: "internal", message: "boom" } }, { status: 500 });
      }),
    );

    await client().createComment({ featureId: "a", text: "hello" });
    expect(calls).toBe(1);
  });
});
