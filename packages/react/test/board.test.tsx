import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { delay, http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { FewchursBoard } from "../src/components/Board";
import { FewchursProvider } from "../src/context/provider";
import { BASE_URL, rawFeature, server } from "./server";

function renderBoard(board: ReactNode = <FewchursBoard />, providerProps = {}) {
  return render(
    <FewchursProvider
      apiKey="fr_live_test"
      baseUrl={BASE_URL}
      deviceId="device-1"
      {...providerProps}
    >
      {board}
    </FewchursProvider>,
  );
}

describe("board", () => {
  it("renders the list, the vote state and the status", async () => {
    renderBoard();

    expect(await screen.findByText("Dark mode")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upvote Dark mode" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByText("Planned")).toBeInTheDocument();
  });

  it("votes optimistically", async () => {
    const user = userEvent.setup();
    renderBoard();

    const button = await screen.findByRole("button", { name: "Upvote Dark mode" });
    await user.click(button);

    await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"));
    expect(within(button).getByText("4")).toBeInTheDocument();
  });

  it("shows Top and New by default, and Roadmap only when asked", async () => {
    const { unmount } = renderBoard();
    expect(await screen.findByRole("tab", { name: "Top" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "New" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Roadmap" })).not.toBeInTheDocument();
    unmount();

    renderBoard(<FewchursBoard tabs={["top", "new", "roadmap"]} />);
    expect(await screen.findByRole("tab", { name: "Roadmap" })).toBeInTheDocument();
  });

  it("moves between tabs with the arrow keys", async () => {
    const user = userEvent.setup();
    renderBoard();

    const top = await screen.findByRole("tab", { name: "Top" });
    top.focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "New" })).toHaveAttribute("aria-selected", "true");
  });

  it("submits a request and reports it", async () => {
    const user = userEvent.setup();
    const onEvent = vi.fn();
    renderBoard(<FewchursBoard />, { onEvent });

    await user.click(await screen.findByRole("button", { name: "New request" }));
    await user.type(screen.getByLabelText("Title"), "Offline mode");
    await user.click(screen.getByRole("button", { name: "Submit request" }));

    expect(await screen.findByText("Thanks — your request is in.")).toBeInTheDocument();
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ name: "featureSubmitted" }));
  });

  it("shows the empty state when there is nothing yet", async () => {
    server.use(
      http.get(`${BASE_URL}/features`, () => HttpResponse.json({ features: [], nextCursor: null })),
    );
    renderBoard();

    expect(await screen.findByText("No feature requests yet")).toBeInTheDocument();
  });

  it.each([
    [401, "invalid_key", "Invalid API key", "needs to check its setup"],
    [403, "wrong_app", "Wrong platform", "isn't set up for this site or app"],
    [500, "internal", "Something went wrong", "Please try again"],
    [429, "rate_limited", "Something went wrong", "Please try again"],
  ])("shows a %i %s as a title and friendly detail", async (status, code, title, detail) => {
    server.use(
      http.get(`${BASE_URL}/features`, () =>
        HttpResponse.json(
          { error: { code, message: "This API key is not set up for secret-host.com." } },
          { status },
        ),
      ),
    );
    renderBoard();

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(title)).toHaveClass("fw-empty__title");
    expect(alert).toHaveTextContent(detail);
    expect(alert).not.toHaveTextContent("secret-host.com");
    expect(within(alert).getByRole("button", { name: "Try again" })).toHaveClass("fw-btn-text");
  });

  it("loads the list when Try again works", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(
        `${BASE_URL}/features`,
        () =>
          HttpResponse.json({ error: { code: "invalid_key", message: "bad" } }, { status: 401 }),
        { once: true },
      ),
    );
    renderBoard();

    await user.click(await screen.findByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Dark mode")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("lets the error text be changed", async () => {
    server.use(
      http.get(`${BASE_URL}/features`, () =>
        HttpResponse.json({ error: { code: "invalid_key", message: "bad" } }, { status: 401 }),
      ),
    );
    renderBoard(<FewchursBoard labels={{ errorInvalidKeyTitle: "Not available" }} />);

    expect(await screen.findByText("Not available")).toBeInTheDocument();
  });

  it("offers a retry when the list fails", async () => {
    server.use(
      http.get(`${BASE_URL}/features`, () =>
        HttpResponse.json({ error: { code: "internal", message: "boom" } }, { status: 500 }),
      ),
    );
    renderBoard();

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("hides counts when the owner hid them", async () => {
    server.use(
      http.get(`${BASE_URL}/config`, () =>
        HttpResponse.json({ showBranding: false, hideVoteCounts: true }),
      ),
    );
    renderBoard();

    const button = await screen.findByRole("button", { name: "Upvote Dark mode" });
    await waitFor(() => expect(within(button).queryByText("3")).not.toBeInTheDocument());
  });

  it("escapes anything the API returns", async () => {
    server.use(
      http.get(`${BASE_URL}/features`, () =>
        HttpResponse.json({
          features: [
            {
              id: "x",
              title: "<img src=x onerror=alert(1)>",
              description: "",
              status: "open",
              upvoteCount: 0,
              commentCount: 0,
              followerCount: 0,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
          nextCursor: null,
        }),
      ),
    );
    const { container } = renderBoard();

    expect(await screen.findByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("drops class names in unstyled mode but keeps the roles", async () => {
    const { container } = renderBoard(<FewchursBoard unstyled />);

    expect(await screen.findByText("Dark mode")).toBeInTheDocument();
    expect(container.querySelector("[class]")).toBeNull();
    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });

  it("uses the custom row when one is given", async () => {
    renderBoard(
      <FewchursBoard
        renderFeature={(feature, actions) => (
          <li key={feature.id}>
            <button onClick={() => void actions.toggleVote()}>custom {feature.title}</button>
          </li>
        )}
      />,
    );

    expect(await screen.findByText("custom Dark mode")).toBeInTheDocument();
  });

  it("fills the first paint with placeholder rows shaped like the board", async () => {
    server.use(
      http.get(`${BASE_URL}/features`, async () => {
        await delay(40);
        return HttpResponse.json({
          features: [rawFeature({ id: "a", title: "Dark mode" })],
          nextCursor: null,
        });
      }),
    );
    const { container } = renderBoard();

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Loading…");
    expect(container.querySelectorAll(".fw-skeleton__card")).toHaveLength(3);

    expect(await screen.findByText("Dark mode")).toBeInTheDocument();
    expect(container.querySelectorAll(".fw-skeleton__card")).toHaveLength(0);
  });

  it("opens a linked request above the list, listing it only once", async () => {
    const { container } = renderBoard(<FewchursBoard initialFeatureId="b" />);

    const pinned = await waitFor(() => {
      const found = container.querySelector(".fw-pinned");
      if (!found) throw new Error("not pinned yet");
      return found as HTMLElement;
    });

    // "Export to CSV" is in the list response too; the pinned copy replaces that row.
    expect(within(pinned).getByText("Export to CSV")).toBeInTheDocument();
    expect(screen.getAllByText("Export to CSV")).toHaveLength(1);
    expect(await screen.findByText("Dark mode")).toBeInTheDocument();

    // Its comments are already open, so the link lands on the conversation.
    expect(await within(pinned).findByText("Yes please")).toBeInTheDocument();
  });

  it("still shows the list when the linked request is gone", async () => {
    const { container } = renderBoard(<FewchursBoard initialFeatureId="missing" />);

    expect(await screen.findByText("Dark mode")).toBeInTheDocument();
    expect(container.querySelector(".fw-pinned")).toBeNull();
  });

  it("has no obvious accessibility violations", async () => {
    const { container } = renderBoard();
    await screen.findByText("Dark mode");

    expect(await axe(container)).toHaveNoViolations();
  });
});
