"use client";

import { useCallback, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { FewchursBoardProps } from "./Board";
import { FewchursBoardDialog } from "./BoardDialog";
import { themeToStyle } from "./theme";

export interface FewchursButtonProps extends Omit<
  FewchursBoardProps,
  "children" | "className" | "style"
> {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  floating?: boolean | "left" | "right";
}

function launcherClasses(floating: FewchursButtonProps["floating"]): string {
  if (!floating) return "fw-launcher";
  const side = floating === "left" ? " fw-launcher--left" : "";
  return `fw-launcher fw-launcher--floating${side}`;
}

export function FewchursButton({
  children = "Feedback",
  className,
  style,
  ariaLabel,
  floating = false,
  ...board
}: FewchursButtonProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const classes = [board.unstyled ? "" : launcherClasses(floating), className]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <button
        type="button"
        className={classes || undefined}
        style={{ ...themeToStyle(board.theme), ...style }}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      {open
        ? createPortal(
            <FewchursBoardDialog
              {...board}
              variant="sheet"
              ariaLabel={ariaLabel}
              open
              onClose={close}
            />,
            document.body,
          )
        : null}
    </>
  );
}
