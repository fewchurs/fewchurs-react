import { describe, expect, it, vi } from "vitest";
import { FewchursButton } from "../src/button";

vi.mock("next/headers", () => ({
  cookies: () => {
    throw new Error("The button must not read cookies.");
  },
  headers: () => {
    throw new Error("The button must not read headers.");
  },
}));

describe("FewchursButton", () => {
  it("talks to the route handler and never receives the key", async () => {
    process.env.FEWCHURS_API_KEY = "fr_live_xyz";

    const element = await FewchursButton({ children: "Ideas" });

    expect(element.props.baseUrl).toBe("/api/fewchurs");
    expect(JSON.stringify(element.props)).not.toContain("fr_live_xyz");
    expect(element.props.children.props.children).toBe("Ideas");
  });

  it("uses a custom path and device id", async () => {
    const element = await FewchursButton({ apiPath: "/fb/", deviceId: () => "device-9" });

    expect(element.props.baseUrl).toBe("/fb");
    expect(element.props.deviceId).toBe("device-9");
  });
});
