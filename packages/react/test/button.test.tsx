import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { FewchursButton } from "../src/components/BoardButton";
import { FewchursProvider } from "../src/context/provider";
import { BASE_URL, requests } from "./server";

function renderButton(button = <FewchursButton />) {
  return render(
    <FewchursProvider apiKey="fr_live_test" baseUrl={BASE_URL} deviceId="device-1">
      {button}
    </FewchursProvider>,
  );
}

describe("FewchursButton", () => {
  it("shows only the button and makes no request until it is clicked", () => {
    renderButton();

    expect(screen.getByRole("button", { name: "Feedback" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it("opens the board in a sheet on the page body", async () => {
    const user = userEvent.setup();
    const { container } = renderButton();

    await user.click(screen.getByRole("button", { name: "Feedback" }));

    const sheet = screen.getByRole("dialog", { name: "Feature requests" });
    expect(sheet).toHaveClass("fw-dialog--sheet");
    expect(container).not.toContainElement(sheet);
    expect(await screen.findByText("Dark mode")).toBeInTheDocument();
  });

  it("closes on Escape and gives focus back to the button", async () => {
    const user = userEvent.setup();
    renderButton();
    const button = screen.getByRole("button", { name: "Feedback" });

    await user.click(button);
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveFocus());
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it("closes from the close button", async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "Feedback" }));
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("takes its own label and class, and passes board props to the sheet", async () => {
    const user = userEvent.setup();
    renderButton(
      <FewchursButton className="mine" labels={{ title: "Ideas" }} colorScheme="dark">
        Suggest
      </FewchursButton>,
    );
    const button = screen.getByRole("button", { name: "Suggest" });
    expect(button).toHaveClass("fw-launcher", "mine");

    await user.click(button);

    expect(screen.getByRole("dialog")).toHaveAttribute("data-theme", "dark");
    expect(await screen.findByRole("heading", { name: "Ideas" })).toBeInTheDocument();
  });

  it("drops its class when unstyled", () => {
    renderButton(<FewchursButton unstyled />);
    expect(screen.getByRole("button", { name: "Feedback" })).not.toHaveAttribute("class");
  });

  it("has no accessibility violations while open", async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "Feedback" }));
    await screen.findByText("Dark mode");

    expect(await axe(document.body)).toHaveNoViolations();
  });
});
