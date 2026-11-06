"use client";

import { useCallback, useEffect, useState } from "react";
import { useFewchurs } from "../context/provider";
import { commentsStateOf } from "../store/store";
import { useStoreState } from "./useStoreState";
import type { FewchursError } from "../client/errors";
import type { Comment } from "../types";

export interface UseCommentsOptions {
  enabled?: boolean;
}

export interface UseCommentsResult {
  comments: Comment[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isSubmitting: boolean;
  error: FewchursError | null;
  submitError: FewchursError | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  add: (text: string, authorName?: string) => Promise<boolean>;
}

export function useComments(
  featureId: string,
  { enabled = true }: UseCommentsOptions = {},
): UseCommentsResult {
  const { store, isReady } = useFewchurs();
  const state = useStoreState();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<FewchursError | null>(null);

  const comments = commentsStateOf(state, featureId);

  useEffect(() => {
    if (!enabled || !isReady) return;
    store.ensureComments(featureId);
  }, [store, featureId, enabled, isReady]);

  const loadMore = useCallback(() => store.loadMoreComments(featureId), [store, featureId]);

  const refresh = useCallback(() => store.refreshComments(featureId), [store, featureId]);

  const add = useCallback(
    async (text: string, authorName?: string) => {
      setIsSubmitting(true);
      setSubmitError(null);
      const result = await store.addComment({ featureId, text, authorName });
      if (!result.ok) setSubmitError(result.error);
      setIsSubmitting(false);
      return result.ok;
    },
    [store, featureId],
  );

  return {
    comments: comments.comments,
    isLoading: comments.status === "loading" || (comments.status === "idle" && enabled),
    isLoadingMore: comments.status === "loadingMore",
    isSubmitting,
    error: comments.error,
    submitError,
    hasMore: comments.cursor !== null,
    loadMore,
    refresh,
    add,
  };
}
