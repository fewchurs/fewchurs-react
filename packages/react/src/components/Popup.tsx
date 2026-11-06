"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { useBoard } from "./BoardContext";
import { canAnimate } from "./motion";

const LEAVE_MS = 140;
const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), textarea";

export interface PopupProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
  initialFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

export function Popup({
  open,
  title,
  subtitle,
  onClose,
  returnFocus,
  initialFocus,
  children,
}: PopupProps): React.JSX.Element | null {
  const { labels, unstyled, themeStyle, dataTheme, cx } = useBoard();
  const [isMounted, setMounted] = useState(open);
  const overlay = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();

  if (open && !isMounted) setMounted(true);

  useEffect(() => {
    if (!open) return;
    (initialFocus?.current ?? panel.current)?.focus({ preventScroll: true });
  }, [open, initialFocus]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: globalThis.KeyboardEvent): void {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  useEffect(() => {
    if (open || !isMounted) return;

    const finish = () => {
      setMounted(false);
      returnFocus.current?.focus({ preventScroll: true });
    };

    const element = overlay.current;
    if (unstyled || !canAnimate(element)) {
      finish();
      return;
    }

    const leaving = element.animate(
      { opacity: [1, 0] },
      { duration: LEAVE_MS, easing: "ease-in", fill: "forwards" },
    );
    const sliding = panel.current?.animate(
      { transform: ["translateY(0)", "translateY(8px)"] },
      { duration: LEAVE_MS, easing: "ease-in", fill: "forwards" },
    );
    leaving.onfinish = finish;

    return () => {
      leaving.cancel();
      sliding?.cancel();
    };
  }, [open, isMounted, unstyled, returnFocus]);

  if (!isMounted) return null;

  function onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) onClose();
  }

  function onPanelKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Tab" || !panel.current) return;
    const items = panel.current.querySelectorAll<HTMLElement>(FOCUSABLE);
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === panel.current)) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  const dialog = (
    <div
      ref={panel}
      className={cx("fw-popup")}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={onPanelKeyDown}
    >
      <div className={cx("fw-popup__head")}>
        <div className={cx("fw-popup__heading")}>
          <h3 id={titleId} className={cx("fw-popup__title")}>
            {title}
          </h3>
          {subtitle && <p className={cx("fw-muted")}>{subtitle}</p>}
        </div>
        <button
          type="button"
          className={cx("fw-popup__close")}
          aria-label={labels.close}
          onClick={onClose}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M3.5 3.5l9 9m0-9l-9 9"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <div className={cx("fw-popup__body")}>{children}</div>
    </div>
  );

  if (unstyled) return dialog;

  return createPortal(
    <div
      ref={overlay}
      className={cx("fewchurs", "fw-popup-overlay")}
      style={themeStyle}
      data-theme={dataTheme}
      onClick={onBackdropClick}
    >
      {dialog}
    </div>,
    document.body,
  );
}
