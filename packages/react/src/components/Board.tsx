"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { flushSync } from "react-dom";
import { useFewchurs } from "../context/provider";
import { useFewchursConfig } from "../hooks/useFewchursConfig";
import {
  BoardContextProvider,
  makeClassName,
  useBoard,
  type BoardContextValue,
  type BoardTab,
  type EmailFieldMode,
  type FeatureActions,
} from "./BoardContext";
import { Branding } from "./Branding";
import { FeatureList } from "./FeatureList";
import { SubmitForm } from "./SubmitForm";
import { mergeLabels, type BoardLabels } from "./labels";
import { themeToStyle, type BoardTheme } from "./theme";
import type { Feature } from "../types";

export interface FewchursBoardProps {
  tabs?: BoardTab[];
  defaultTab?: BoardTab;
  /** Shows this request above the list, for a link straight to one request. */
  initialFeatureId?: string;
  showDeclined?: boolean;
  allowComments?: boolean;
  emailField?: EmailFieldMode;
  pageSize?: number;
  labels?: Partial<BoardLabels>;
  theme?: BoardTheme;
  /** Drops every class name but keeps behaviour, ARIA and keyboard handling. */
  unstyled?: boolean;
  colorScheme?: "light" | "dark" | "system";
  className?: string;
  style?: CSSProperties;
  /** Prefills the submit and follow forms. */
  userEmail?: string;
  isSubscriber?: boolean;
  renderHeader?: () => ReactNode;
  renderEmpty?: () => ReactNode;
  renderFeature?: (feature: Feature, actions: FeatureActions) => ReactNode;
  children?: ReactNode;
}

/** Hoisted so the default does not hand the context a new array identity every render. */
// Top and New, like the Flutter and Laravel boards. Roadmap is opt-in: tabs={["top", "new", "roadmap"]}.
const DEFAULT_TABS: BoardTab[] = ["top", "new"];

export function BoardRoot({
  tabs = DEFAULT_TABS,
  defaultTab,
  initialFeatureId,
  showDeclined = false,
  allowComments = true,
  emailField = "optional",
  pageSize,
  labels,
  theme,
  unstyled = false,
  colorScheme = "system",
  className,
  style,
  userEmail,
  isSubscriber = false,
  renderHeader,
  renderEmpty,
  renderFeature,
  children,
}: FewchursBoardProps): React.JSX.Element {
  const { store } = useFewchurs();
  const { hideVoteCounts } = useFewchursConfig();
  const [tab, setTab] = useState<BoardTab>(defaultTab ?? tabs[0] ?? "top");
  const [isFormOpen, setFormOpen] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    store.emit({ name: "boardOpened" });
  }, [store]);

  const value = useMemo<BoardContextValue>(
    () => ({
      labels: mergeLabels(labels),
      unstyled,
      allowComments,
      emailField,
      showDeclined,
      hideVoteCounts,
      pageSize,
      userEmail,
      isSubscriber,
      tab,
      setTab,
      tabs,
      initialFeatureId,
      isFormOpen,
      setFormOpen,
      justSubmitted,
      setJustSubmitted,
      renderFeature,
      renderEmpty,
      renderHeader,
      cx: makeClassName(unstyled),
    }),
    [
      labels,
      unstyled,
      allowComments,
      emailField,
      showDeclined,
      hideVoteCounts,
      pageSize,
      userEmail,
      isSubscriber,
      tab,
      tabs,
      initialFeatureId,
      isFormOpen,
      justSubmitted,
      renderFeature,
      renderEmpty,
      renderHeader,
    ],
  );

  return (
    <BoardContextProvider value={value}>
      <section
        className={[unstyled ? "" : "fewchurs", className].filter(Boolean).join(" ") || undefined}
        style={{ ...themeToStyle(theme), ...style }}
        data-theme={colorScheme === "system" ? undefined : colorScheme}
      >
        {children ?? <DefaultBoard />}
      </section>
    </BoardContextProvider>
  );
}

function DefaultBoard(): React.JSX.Element {
  const { renderHeader } = useBoard();

  return (
    <>
      {renderHeader ? renderHeader() : <BoardHeading />}
      <BoardPanels />
      <Branding />
    </>
  );
}

const LEAVE_MS = 110;
const ENTER_MS = 300;
const ENTER_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

function canAnimate(element: HTMLElement | null): element is HTMLElement {
  if (!element || typeof element.animate !== "function") return false;
  return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function BoardPanels(): React.JSX.Element {
  const { isFormOpen, setFormOpen, justSubmitted, setJustSubmitted, labels, unstyled, cx } =
    useBoard();
  const [showForm, setShowForm] = useState(isFormOpen);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const entering = useRef<Animation | null>(null);
  const hasSwapped = useRef(false);

  useEffect(() => {
    if (isFormOpen === showForm) return;
    hasSwapped.current = true;

    const element = panel.current;
    if (unstyled || !canAnimate(element)) {
      setShowForm(isFormOpen);
      return;
    }

    entering.current?.cancel();
    const leaving = element.animate(
      { opacity: [1, 0], transform: ["translateY(0)", "translateY(-4px)"] },
      { duration: LEAVE_MS, easing: "ease-in", fill: "forwards" },
    );

    leaving.onfinish = () => {
      const from = element.offsetHeight;
      flushSync(() => setShowForm(isFormOpen));
      leaving.cancel();
      const to = element.offsetHeight;

      element.style.overflow = "hidden";
      const enter = element.animate(
        {
          opacity: [0, 1],
          transform: ["translateY(6px)", "translateY(0)"],
          height: [`${from}px`, `${to}px`],
        },
        { duration: ENTER_MS, easing: ENTER_EASING },
      );
      const finish = () => {
        element.style.overflow = "";
      };
      enter.onfinish = finish;
      enter.oncancel = finish;
      entering.current = enter;
    };

    return () => leaving.cancel();
  }, [isFormOpen, showForm, unstyled]);

  useEffect(() => {
    if (!hasSwapped.current) return;
    const target = showForm
      ? panel.current?.querySelector<HTMLElement>("#fw-title")
      : trigger.current;
    target?.focus({ preventScroll: true });
  }, [showForm]);

  return (
    <div ref={panel}>
      <div hidden={showForm}>
        <div className={cx("fw-toolbar")}>
          <BoardTabs />
          <button
            ref={trigger}
            type="button"
            className={cx("fw-btn")}
            onClick={() => {
              setJustSubmitted(false);
              setFormOpen(true);
            }}
          >
            {labels.newRequest}
          </button>
        </div>
        {justSubmitted && (
          <p className={cx("fw-alert")} role="status">
            {labels.submitted}
          </p>
        )}
        <FeatureList />
      </div>
      {showForm && <SubmitForm />}
    </div>
  );
}

function BoardHeading(): React.JSX.Element {
  const { labels, cx } = useBoard();
  return <h2 className={cx("fw-heading")}>{labels.title}</h2>;
}

export function BoardTabs(): React.JSX.Element | null {
  const { tabs, tab, setTab, labels, cx } = useBoard();
  if (tabs.length < 2) return null;

  const labelOf: Record<BoardTab, string> = {
    top: labels.tabTop,
    new: labels.tabNew,
    roadmap: labels.tabRoadmap,
  };

  return (
    <div className={cx("fw-tabs")} role="tablist" aria-label={labels.title}>
      {tabs.map((name) => (
        <button
          key={name}
          type="button"
          role="tab"
          id={`fw-tab-${name}`}
          className={cx("fw-tab")}
          aria-selected={tab === name}
          tabIndex={tab === name ? 0 : -1}
          onClick={() => setTab(name)}
          onKeyDown={(event) => {
            const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
            if (step === 0) return;
            event.preventDefault();
            const next = tabs[(tabs.indexOf(tab) + step + tabs.length) % tabs.length];
            if (next) {
              setTab(next);
              document.getElementById(`fw-tab-${next}`)?.focus();
            }
          }}
        >
          {labelOf[name]}
        </button>
      ))}
    </div>
  );
}

export function SubmitTrigger(): React.JSX.Element {
  const { isFormOpen, setFormOpen, setJustSubmitted, labels, cx } = useBoard();

  return (
    <button
      type="button"
      className={cx("fw-btn")}
      aria-expanded={isFormOpen}
      onClick={() => {
        if (!isFormOpen) setJustSubmitted(false);
        setFormOpen(!isFormOpen);
      }}
    >
      {isFormOpen ? labels.cancel : labels.newRequest}
    </button>
  );
}

/** Level 1 by default, level 5 when given children to compose. */
export const FewchursBoard = Object.assign(BoardRoot, {
  Root: BoardRoot,
  Tabs: BoardTabs,
  List: FeatureList,
  SubmitTrigger,
  SubmitForm,
  Branding,
});
