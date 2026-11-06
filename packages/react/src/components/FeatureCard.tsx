"use client";

import { useCallback, useRef, useState } from "react";
import { userMessage } from "../client/errors";
import { useVote } from "../hooks/useVote";
import { useBoard } from "./BoardContext";
import { CommentList } from "./Comments";
import { FollowForm } from "./FollowForm";
import { Popup } from "./Popup";
import { StatusBadge } from "./StatusBadge";
import { VoteButton } from "./VoteButton";
import { formatDate } from "./time";
import type { Feature } from "../types";

export function FeatureCard({
  feature,
  defaultCommentsOpen = false,
}: {
  feature: Feature;
  /** Opens the thread straight away, for a board linked to this one request. */
  defaultCommentsOpen?: boolean;
}): React.JSX.Element {
  const { labels, allowComments, cx } = useBoard();
  const { isPending, toggle, error: voteError } = useVote(feature.id);
  const [showComments, setShowComments] = useState(defaultCommentsOpen);
  const commentsButton = useRef<HTMLButtonElement>(null);
  const closeComments = useCallback(() => setShowComments(false), []);

  return (
    <li className={cx("fw-card")}>
      <VoteButton feature={feature} isPending={isPending} onToggle={() => void toggle()} />

      <div className={cx("fw-card__body")}>
        <h3 className={cx("fw-card__title")}>{feature.title}</h3>
        {feature.description && <p className={cx("fw-card__desc")}>{feature.description}</p>}

        <div className={cx("fw-meta")}>
          <StatusBadge status={feature.status} />
          <span>{formatDate(feature.createdAt)}</span>

          {allowComments && (
            <button
              ref={commentsButton}
              type="button"
              className={cx("fw-link")}
              aria-haspopup={defaultCommentsOpen ? undefined : "dialog"}
              aria-expanded={defaultCommentsOpen ? showComments : undefined}
              onClick={() => setShowComments((open) => !open)}
            >
              {labels.comments} ({feature.commentCount})
            </button>
          )}

          <FollowForm feature={feature} />
        </div>

        {voteError && (
          <p className={cx("fw-error")} role="alert">
            {userMessage(voteError)}
          </p>
        )}

        {allowComments && defaultCommentsOpen && showComments && (
          <CommentList featureId={feature.id} />
        )}

        {allowComments && !defaultCommentsOpen && (
          <Popup
            open={showComments}
            title={labels.comments}
            subtitle={feature.title}
            onClose={closeComments}
            returnFocus={commentsButton}
          >
            <CommentList featureId={feature.id} />
          </Popup>
        )}
      </div>
    </li>
  );
}
