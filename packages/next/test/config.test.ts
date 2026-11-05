import { beforeEach, describe, expect, it, vi } from "vitest";
import { serverClient } from "../src/config";

const incoming = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({ headers: vi.fn(async () => incoming.headers) }));

async function sentAppId(config = {}) {
  const fetchMock = vi.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify({ features: [], nextCursor: null })),
  );
  vi.stubGlobal("fetch", fetchMock);

  const client = await serverClient("device-1234", config);
  await client.listFeatures();

  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return (init.headers as Record<string, string>)["X-Fewchurs-App-Id"];
}

beforeEach(() => {
  process.env.FEWCHURS_API_KEY = "fr_live_xyz";
  process.env.FEWCHURS_BASE_URL = "https://api.test/v1";
  delete process.env.FEWCHURS_APP_ID;
  incoming.headers = new Headers({ host: "afthal.app:3000" });
});

describe("server client", () => {
  it("sends the host of the page being rendered", async () => {
    expect(await sentAppId()).toBe("afthal.app");
  });

  it("uses FEWCHURS_APP_ID over the host", async () => {
    process.env.FEWCHURS_APP_ID = "yourcompany.com";
    expect(await sentAppId()).toBe("yourcompany.com");
  });

  it("uses the appId option over FEWCHURS_APP_ID", async () => {
    process.env.FEWCHURS_APP_ID = "yourcompany.com";
    expect(await sentAppId({ appId: "docs.yourcompany.com" })).toBe("docs.yourcompany.com");
  });

  it("ignores a blank FEWCHURS_APP_ID", async () => {
    process.env.FEWCHURS_APP_ID = "  ";
    expect(await sentAppId()).toBe("afthal.app");
  });

  it("sends nothing when no host is known", async () => {
    incoming.headers = new Headers();
    expect(await sentAppId()).toBeUndefined();
  });
});
