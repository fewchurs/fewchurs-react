"use client";

import { createContext, useContext } from "react";
import type { CSSProperties } from "react";
import { DEFAULT_LABELS, type BoardLabels } from "./labels";
import type { Feature, FeatureSort } from "../types";

export type BoardTab = FeatureSort | "roadmap";
export type EmailFieldMode = "off" | "optional" | "required";

export interface FeatureActions {
  toggleVote: () => Promise<void>;
  follow: (email: string) => Promise<boolean>;
  unfollow: () => Promise<boolean>;
}

export interface BoardContextValue {
  labels: BoardLabels;
  unstyled: boolean;
  themeStyle?: CSSProperties;
  dataTheme?: "light" | "dark";
  allowComments: boolean;
  emailField: EmailFieldMode;
  showDeclined: boolean;
  hideVoteCounts: boolean;
  pageSize?: number;
  userEmail?: string;
  isSubscriber: boolean;
  tab: BoardTab;
  setTab: (tab: BoardTab) => void;
  tabs: BoardTab[];
  /** A request to show above the list, for a deep link into the board. */
  initialFeatureId?: string;
  isFormOpen: boolean;
  setFormOpen: (open: boolean) => void;
  /** Survives the submit form closing, so the confirmation is not unmounted with it. */
  justSubmitted: boolean;
  setJustSubmitted: (submitted: boolean) => void;
  renderFeature?: (feature: Feature, actions: FeatureActions) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  renderHeader?: () => React.ReactNode;
  /** Returns a class name, or undefined in unstyled mode. */
  cx: (...names: string[]) => string | undefined;
}

const BoardContext = createContext<BoardContextValue | null>(null);

export const BoardContextProvider = BoardContext.Provider;

export function useBoard(): BoardContextValue {
  const value = useContext(BoardContext);
  if (!value) {
    throw new Error("Fewchurs board parts must be rendered inside <FewchursBoard.Root>.");
  }
  return value;
}

export function makeClassName(unstyled: boolean) {
  return (...names: string[]): string | undefined =>
    unstyled ? undefined : names.filter(Boolean).join(" ");
}

export const FALLBACK_LABELS = DEFAULT_LABELS;
