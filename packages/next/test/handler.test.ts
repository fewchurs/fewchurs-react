import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHandler } from "../src/handler";
import { SDK_HEADER } from "../src/constants";
import packageJson from "../package.json";

const API_KEY = "fr_live_xyz";

function upstream(body: unknown = { features: [], nextCursor: null }, status = 200) {
  return vi.fn(
    async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }),
  );
}

function request(path: string, init: RequestInit = {}) {
  return new Request(`https://app.test${path}`, init);
}

function context(...route: string[]) {
  return { params: Promise.resolve({ route }) };
}

beforeEach(() => {
  process.env.FEWCHURS_API_KEY = API_KEY;
  process.env.FEWCHURS_BASE_URL = "https://api.test/v1";
  delete process.env.FEWCHURS_APP_ID;
});

function sentHeaders(fetchMock: ReturnType<typeof upstream>) {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return init.headers as Record<string, string>;
}

describe("the domain the key is checked against", () => {
  async function appIdFor(headers: Record<string, string>, options = {}) {
    const fetchMock = upstream();
    vi.stubGlobal("fetch", fetchMock);
    await createHandler(options).GET(
      request("/api/fewchurs/config", { headers }),
      context("config"),
    );
    return sentHeaders(fetchMock)["X-Fewchurs-App-Id"];
  }

  it("sends the request's host without the port", async () => {
    expect(await appIdFor({ host: "afthal.app:3000" })).toBe("afthal.app");
  });

  it("prefers the public host a reverse proxy reports", async () => {
    const headers = { host: "localhost:3000", "x-forwarded-host": "afthal.app, proxy.internal" };
    expect(await appIdFor(headers)).toBe("afthal.app");
  });

  it("falls back to the request URL", async () => {
    expect(await appIdFor({})).toBe("app.test");
  });

  it("uses FEWCHURS_APP_ID over the host", async () => {
    process.env.FEWCHURS_APP_ID = "afthal.app";
    expect(await appIdFor({ host: "staging.other.dev" })).toBe("afthal.app");
  });

  it("uses the appId option over FEWCHURS_APP_ID", async () => {
    process.env.FEWCHURS_APP_ID = "afthal.app";
    expect(await appIdFor({}, { appId: "docs.afthal.app" })).toBe("docs.afthal.app");
  });
});

describe("route handler", () => {
  it("forwards an allowed route with the key and a device id", async () => {
    const fetchMock = upstream();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = createHandler();
    const response = await GET(
      request("/api/fewchurs/features?sort=top&limit=5"),
      context("features"),
    );

    expect(response.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.test/v1/features?sort=top&limit=5");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${API_KEY}`);
    expect((init.headers as Record<string, string>)["X-Device-Id"]).toMatch(/.+/);
    expect((init.headers as Record<string, string>)["X-Fewchurs-Sdk"]).toBe(
      `next/${packageJson.version}`,
    );
  });

  it("always reports itself as the Next.js SDK", async () => {
    const fetchMock = upstream();
    vi.stubGlobal("fetch", fetchMock);

    await createHandler().GET(
      request("/api/fewchurs/config", { headers: { "x-fewchurs-sdk": "react/1.0.0" } }),
      context("config"),
    );

    expect(sentHeaders(fetchMock)["X-Fewchurs-Sdk"]).toBe(SDK_HEADER);
  });

  it("passes a wrong_app refusal to the browser and logs the domain once", async () => {
    const message = "This API key is not set up for other.com.";
    vi.stubGlobal("fetch", upstream({ error: { code: "wrong_app", message } }, 403));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const { GET } = createHandler();
    const first = await GET(request("/api/fewchurs/config"), context("config"));
    await GET(request("/api/fewchurs/config"), context("config"));

    expect(first.status).toBe(403);
    expect(await first.json()).toEqual({ error: { code: "wrong_app", message } });
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(`[fewchurs] ${message}`);
  });

  // The header is generated from package.json at build time; this catches a stale checkout.
  it("reports the published package version", () => {
    expect(SDK_HEADER).toBe(`next/${packageJson.version}`);
  });

  it("never lets the key reach the browser", async () => {
    vi.stubGlobal("fetch", upstream());

    const { GET } = createHandler();
    const response = await GET(request("/api/fewchurs/config"), context("config"));
    const text = await response.text();

    expect(text).not.toContain("fr_live");
    expect(JSON.stringify([...response.headers])).not.toContain("fr_live");
  });

  it("refuses a path the board never calls", async () => {
    const fetchMock = upstream();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = createHandler();
    const response = await GET(request("/api/fewchurs/admin/users"), context("admin", "users"));

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a method the route does not support", async () => {
    const fetchMock = upstream();
    vi.stubGlobal("fetch", fetchMock);

    const { DELETE } = createHandler();
    const response = await DELETE(
      request("/api/fewchurs/features", { method: "DELETE" }),
      context("features"),
    );

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stores a new device id in an httpOnly cookie", async () => {
    vi.stubGlobal("fetch", upstream());

    const { GET } = createHandler();
    const response = await GET(request("/api/fewchurs/features"), context("features"));
    const cookie = response.headers.get("set-cookie") ?? "";

    expect(cookie).toContain("fewchurs_did=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });

  it("keeps the id the cookie already holds", async () => {
    const fetchMock = upstream();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = createHandler();
    const response = await GET(
      request("/api/fewchurs/features", { headers: { cookie: "fewchurs_did=abc-123-xyz" } }),
      context("features"),
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["X-Device-Id"]).toBe("abc-123-xyz");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("adopts the id the server-rendered page was built with", async () => {
    const fetchMock = upstream();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = createHandler();
    await POST(
      request("/api/fewchurs/features/a/vote", {
        method: "POST",
        headers: { "x-device-id": "rendered-id-1234" },
      }),
      context("features", "a", "vote"),
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["X-Device-Id"]).toBe("rendered-id-1234");
  });

  it("ignores a junk device id header", async () => {
    const fetchMock = upstream();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = createHandler();
    await GET(
      request("/api/fewchurs/features", { headers: { "x-device-id": "../../etc/passwd" } }),
      context("features"),
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["X-Device-Id"]).not.toContain("/");
  });

  it("uses a custom resolver and leaves cookies alone", async () => {
    const fetchMock = upstream();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = createHandler({ deviceId: async () => "hashed-user-id" });
    const response = await GET(request("/api/fewchurs/features"), context("features"));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["X-Device-Id"]).toBe("hashed-user-id");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("answers 500 with a developer message when the key is missing", async () => {
    delete process.env.FEWCHURS_API_KEY;
    const fetchMock = upstream();
    vi.stubGlobal("fetch", fetchMock);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const { GET } = createHandler();
    const response = await GET(request("/api/fewchurs/config"), context("config"));

    expect(response.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
  });

  it("reports an unreachable API as a gateway error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );

    const { GET } = createHandler();
    const response = await GET(request("/api/fewchurs/config"), context("config"));

    expect(response.status).toBe(502);
  });

  it("falls back to the pathname when params are missing", async () => {
    const fetchMock = upstream();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = createHandler();
    // The public type requires a context for Next 15; the handler still copes without one.
    const bareGet = GET as (request: Request) => Promise<Response>;
    await bareGet(request("/api/fewchurs/features/abc/comments?limit=5"));

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("https://api.test/v1/features/abc/comments?limit=5");
  });
});
