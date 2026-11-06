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
    [401, "invalid_key", "Invalid API key", "Copy the key from your Fewchurs dashboard"],
    [401, "unauthorized", "Invalid API key", "Copy the key from your Fewchurs dashboard"],
    [403, "wrong_app", "Invalid API key", "Server text."],
    [500, "internal", "Couldn't load requests", "Something went wrong. Try again."],
    [400, "missing_device_id", "Couldn't load requests", "Something went wrong. Try again."],
    [403, "forbidden", "Couldn't load requests", "Something went wrong. Try again."],
    [429, "rate_limited", "Couldn't load requests", "You've reached today's limit."],
    [402, "limit_reached", "Couldn't load requests", "This board isn't accepting requests"],
    [404, "not_found", "Couldn't load requests", "This request no longer exists."],
    [400, "validation_failed", "Couldn't load requests", "Server text."],
  ])("shows a %i %s with its title and message", async (status, code, title, detail) => {
    server.use(
      http.get(`${BASE_URL}/features`, () =>
        HttpResponse.json({ error: { code, message: "Server text." } }, { status }),
      ),
    );
    renderBoard();

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(title)).toHaveClass("fw-empty__title");
    expect(alert).toHaveTextContent(detail);
    expect(within(alert).getByRole("button", { name: "Try again" })).toHaveClass("fw-btn-text");
  });

  it("says when the visitor is offline", async () => {
    server.use(http.get(`${BASE_URL}/features`, () => HttpResponse.error()));
    renderBoard();

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("You're offline")).toBeInTheDocument();
    expect(alert).toHaveTextContent("Check your connection and try again.");
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("says when Fewchurs isn't set up, with no button", async () => {
    render(
      <FewchursProvider deviceId="device-1">
        <FewchursBoard />
      </FewchursProvider>,
    );

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Fewchurs isn't set up")).toBeInTheDocument();
    expect(within(alert).queryByRole("button")).not.toBeInTheDocument();
  });

  it("offers Try again when the next page fails", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${BASE_URL}/features`, ({ request }) => {
        if (new URL(request.url).searchParams.get("cursor")) {
          return HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 });
        }
        return HttpResponse.json({
          features: [rawFeature({ id: "a", title: "Dark mode" })],
          nextCursor: "page2",
        });
      }),
    );
    renderBoard();

    await user.click(await screen.findByRole("button", { name: "Load more" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load more.");
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByText("Dark mode")).toBeInTheDocument();
  });

  it("undoes a failed vote and says why", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${BASE_URL}/features/:id/vote`, () =>
        HttpResponse.json({ error: { code: "rate_limited", message: "x" } }, { status: 429 }),
      ),
    );
    renderBoard();

    const button = await screen.findByRole("button", { name: "Upvote Dark mode" });
    await user.click(button);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You've reached today's limit. Try again tomorrow.",
    );
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("offers Try again when comments fail to load", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(
        `${BASE_URL}/features/:id/comments`,
        () => HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 }),
        { once: true },
      ),
      http.get(
        `${BASE_URL}/features/:id/comments`,
        () => HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 }),
        { once: true },
      ),
    );
    renderBoard(<FewchursBoard initialFeatureId="b" />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load comments.");
    expect(alert).toHaveTextContent("Something went wrong. Try again.");

    await user.click(within(alert).getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Yes please")).toBeInTheDocument();
  });

  it("shows only the form, and the list again after Cancel", async () => {
    const user = userEvent.setup();
    renderBoard();

    const list = await screen.findByText("Dark mode");
    await user.click(screen.getByRole("button", { name: "New request" }));

    expect(screen.getByLabelText("Title")).toHaveFocus();
    expect(list).not.toBeVisible();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New request" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(list).toBeVisible();
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New request" })).toHaveFocus();
  });

  it("focuses the title even with an open comment box in the list", async () => {
    const user = userEvent.setup();
    renderBoard(<FewchursBoard initialFeatureId="b" />);

    await screen.findByPlaceholderText("Add a comment");
    await user.click(screen.getByRole("button", { name: "New request" }));

    expect(screen.getByLabelText("Title")).toHaveFocus();
  });

  it("shows the list and the thanks message after a request is sent", async () => {
    const user = userEvent.setup();
    renderBoard();

    const list = await screen.findByText("Dark mode");
    await user.click(screen.getByRole("button", { name: "New request" }));
    await user.type(screen.getByLabelText("Title"), "Offline mode");
    await user.click(screen.getByRole("button", { name: "Submit request" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Thanks — your request is in.");
    expect(list).toBeVisible();
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
  });

  it("keeps the form open when the request fails", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${BASE_URL}/features`, () =>
        HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 }),
      ),
    );
    renderBoard();

    const list = await screen.findByText("Dark mode");
    await user.click(screen.getByRole("button", { name: "New request" }));
    await user.type(screen.getByLabelText("Title"), "Offline mode");
    await user.click(screen.getByRole("button", { name: "Submit request" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(list).not.toBeVisible();
  });

  it("keeps submit off until the title is long enough", async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.click(await screen.findByRole("button", { name: "New request" }));
    const submit = screen.getByRole("button", { name: "Submit request" });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("Title"), "ab");
    expect(screen.getByText("At least 3 characters.")).toBeInTheDocument();
    expect(screen.getByText("2/100")).toBeInTheDocument();
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("Title"), "c");
    expect(screen.queryByText("At least 3 characters.")).not.toBeInTheDocument();
    expect(submit).toBeEnabled();
  });

  it("keeps the form filled and says why when submit fails", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${BASE_URL}/features`, () =>
        HttpResponse.json({ error: { code: "limit_reached", message: "x" } }, { status: 402 }),
      ),
    );
    renderBoard();

    await user.click(await screen.findByRole("button", { name: "New request" }));
    await user.type(screen.getByLabelText("Title"), "Offline mode");
    await user.click(screen.getByRole("button", { name: "Submit request" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This board isn't accepting requests right now.",
    );
    expect(screen.getByLabelText("Title")).toHaveValue("Offline mode");
  });

  it("keeps Post off until there is a comment", async () => {
    const user = userEvent.setup();
    renderBoard(<FewchursBoard initialFeatureId="b" />);

    const post = await screen.findByRole("button", { name: "Post" });
    expect(post).toBeDisabled();

    await user.type(screen.getByPlaceholderText("Add a comment"), "Hello");
    expect(post).toBeEnabled();
  });

  it("opens comments in a popup that the close button closes", async () => {
    const user = userEvent.setup();
    renderBoard();

    await screen.findByText("Dark mode");
    const [button] = screen.getAllByRole("button", { name: /^Comments/ });
    await user.click(button!);

    const popup = await screen.findByRole("dialog", { name: "Comments" });
    expect(within(popup).getByText("Dark mode")).toBeInTheDocument();
    expect(await within(popup).findByText("Yes please")).toBeInTheDocument();
    expect(await axe(popup)).toHaveNoViolations();

    await user.click(within(popup).getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it("closes the notify popup with Escape and the backdrop", async () => {
    const user = userEvent.setup();
    renderBoard();

    const [button] = await screen.findAllByRole("button", { name: "Notify me" });
    await user.click(button!);
    expect(screen.getByRole("dialog", { name: "Notify me" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(button).toHaveFocus();

    await user.click(button!);
    await user.click(screen.getByRole("dialog").parentElement!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps Tab inside the popup", async () => {
    const user = userEvent.setup();
    renderBoard();

    const [button] = await screen.findAllByRole("button", { name: "Notify me" });
    await user.click(button!);
    const popup = screen.getByRole("dialog");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");

    for (let step = 0; step < 4; step += 1) {
      await user.tab();
      expect(popup).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it("closes the notify popup after following", async () => {
    const user = userEvent.setup();
    renderBoard();

    const [button] = await screen.findAllByRole("button", { name: "Notify me" });
    await user.click(button!);
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Notify me" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "You'll be notified" })).toHaveFocus();
  });

  it("keeps the notify popup open and says why when following fails", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${BASE_URL}/features/:id/follow`, () =>
        HttpResponse.json({ error: { code: "rate_limited", message: "x" } }, { status: 429 }),
      ),
    );
    renderBoard();

    const [button] = await screen.findAllByRole("button", { name: "Notify me" });
    await user.click(button!);
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    const popup = screen.getByRole("dialog");
    await user.click(within(popup).getByRole("button", { name: "Notify me" }));

    expect(await within(popup).findByRole("alert")).toHaveTextContent(
      "You've reached today's limit.",
    );
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
  });

  it("renders the popup in place when unstyled", async () => {
    const user = userEvent.setup();
    const { container } = renderBoard(<FewchursBoard unstyled />);

    const [button] = await screen.findAllByRole("button", { name: "Notify me" });
    await user.click(button!);

    expect(container).toContainElement(screen.getByRole("dialog"));
  });

  it("checks the email before following", async () => {
    const user = userEvent.setup();
    renderBoard();

    const [notify] = await screen.findAllByRole("button", { name: "Notify me" });
    await user.click(notify!);

    const email = screen.getByLabelText("Email");
    const follow = within(email.closest("form")!).getByRole("button", { name: "Notify me" });
    expect(follow).toBeDisabled();

    await user.type(email, "nope");
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(follow).toBeDisabled();

    await user.type(email, "@example.com");
    expect(screen.queryByText("Enter a valid email address.")).not.toBeInTheDocument();
    expect(follow).toBeEnabled();
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

  it("says the linked request is gone and still shows the list", async () => {
    renderBoard(<FewchursBoard initialFeatureId="missing" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("This request no longer exists.");
    expect(await screen.findByText("Dark mode")).toBeInTheDocument();
  });

  it("has no obvious accessibility violations", async () => {
    const { container } = renderBoard();
    await screen.findByText("Dark mode");

    expect(await axe(container)).toHaveNoViolations();
  });
});
