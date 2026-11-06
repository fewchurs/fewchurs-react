"use client";

import { useState } from "react";
import { isNotConfigured, userMessage } from "../client/errors";
import { LIMITS } from "../client/constants";
import { useComments } from "../hooks/useComments";
import { useBoard } from "./BoardContext";
import { formatDate } from "./time";

export function CommentList({ featureId }: { featureId: string }): React.JSX.Element {
  const { labels, cx } = useBoard();
  const { comments, isLoading, isLoadingMore, error, hasMore, loadMore, refresh } =
    useComments(featureId);

  return (
    <div className={cx("fw-comments")}>
      {isLoading && <p className={cx("fw-muted")}>{labels.loading}</p>}

      {error && comments.length === 0 && (
        <div className={cx("fw-empty", "fw-empty--compact")} role="alert">
          <p className={cx("fw-empty__title")}>{labels.errorComments}</p>
          <p className={cx("fw-empty__detail")}>
            {isNotConfigured(error) ? labels.errorNotSetUpTitle : userMessage(error)}
          </p>
          <button type="button" className={cx("fw-btn-text")} onClick={() => void refresh()}>
            {labels.retry}
          </button>
        </div>
      )}

      {error && comments.length > 0 && (
        <p className={cx("fw-error")} role="alert">
          {userMessage(error)}
        </p>
      )}

      {!isLoading && !error && comments.length === 0 && (
        <p className={cx("fw-muted")}>{labels.noComments}</p>
      )}

      <ul className={cx("fw-comment-list")}>
        {comments.map((comment) => (
          <li key={comment.id} className={cx("fw-comment")}>
            <span className={cx("fw-comment__author")}>{comment.authorName}</span>
            {comment.isDeveloper && <span className={cx("fw-badge")}> {labels.developer}</span>}
            <span className={cx("fw-muted")}> · {formatDate(comment.createdAt)}</span>
            <p className={cx("fw-comment__text")}>{comment.text}</p>
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          type="button"
          className={cx("fw-btn", "fw-btn--ghost")}
          disabled={isLoadingMore}
          onClick={() => void loadMore()}
        >
          {isLoadingMore ? labels.loading : labels.loadMore}
        </button>
      )}

      <CommentForm featureId={featureId} />
    </div>
  );
}

export function CommentForm({ featureId }: { featureId: string }): React.JSX.Element {
  const { labels, cx } = useBoard();
  const { add, isSubmitting, submitError } = useComments(featureId);
  const [text, setText] = useState("");
  const [authorName, setAuthorName] = useState("");

  return (
    <form
      className={cx("fw-form", "fw-form--inline")}
      onSubmit={async (event) => {
        event.preventDefault();
        const posted = await add(text, authorName);
        if (posted) setText("");
      }}
    >
      <div className={cx("fw-field")}>
        <label className={cx("fw-sr-only")} htmlFor={`fw-comment-${featureId}`}>
          {labels.commentPlaceholder}
        </label>
        <input
          id={`fw-comment-${featureId}`}
          className={cx("fw-input")}
          value={text}
          maxLength={LIMITS.commentMax}
          placeholder={labels.commentPlaceholder}
          onChange={(event) => setText(event.target.value)}
          required
        />
      </div>
      <div className={cx("fw-field")}>
        <label className={cx("fw-sr-only")} htmlFor={`fw-comment-name-${featureId}`}>
          {labels.fieldName}
        </label>
        <input
          id={`fw-comment-name-${featureId}`}
          className={cx("fw-input")}
          value={authorName}
          maxLength={LIMITS.authorNameMax}
          placeholder={labels.fieldName}
          onChange={(event) => setAuthorName(event.target.value)}
        />
      </div>
      <button type="submit" className={cx("fw-btn")} disabled={isSubmitting || !text.trim()}>
        {labels.postComment}
      </button>
      {submitError && (
        <p className={cx("fw-error")} role="alert">
          {userMessage(submitError)}
        </p>
      )}
    </form>
  );
}
