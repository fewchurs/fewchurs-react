"use client";

import { useCallback, useRef, useState } from "react";
import { EMAIL_PATTERN } from "../client/constants";
import { userMessage } from "../client/errors";
import { useFollow } from "../hooks/useFollow";
import { useBoard } from "./BoardContext";
import { Popup } from "./Popup";
import type { Feature } from "../types";

export function FollowForm({ feature }: { feature: Feature }): React.JSX.Element {
  const { labels, userEmail, cx } = useBoard();
  const { isFollowing, isPending, error, follow, unfollow } = useFollow(feature.id);
  const [email, setEmail] = useState(userEmail ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const close = useCallback(() => setIsOpen(false), []);

  const isEmailValid = EMAIL_PATTERN.test(email.trim());

  return (
    <>
      <button
        ref={button}
        type="button"
        className={cx("fw-link")}
        disabled={isFollowing && isPending}
        aria-haspopup={isFollowing ? undefined : "dialog"}
        onClick={() => (isFollowing ? void unfollow() : setIsOpen(true))}
      >
        {isFollowing ? labels.following : labels.follow}
      </button>

      {!isOpen && error && (
        <p className={cx("fw-error")} role="alert">
          {userMessage(error)}
        </p>
      )}

      <Popup
        open={isOpen}
        title={labels.follow}
        subtitle={feature.title}
        onClose={close}
        returnFocus={button}
        initialFocus={input}
      >
        <form
          className={cx("fw-form")}
          onSubmit={async (event) => {
            event.preventDefault();
            const ok = await follow(email);
            if (ok) setIsOpen(false);
          }}
        >
          <div className={cx("fw-field")}>
            <label className={cx("fw-sr-only")} htmlFor={`fw-follow-${feature.id}`}>
              {labels.fieldEmail}
            </label>
            <input
              ref={input}
              id={`fw-follow-${feature.id}`}
              className={cx("fw-input")}
              type="email"
              value={email}
              placeholder={labels.followPlaceholder}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            {email !== "" && !isEmailValid ? (
              <p className={cx("fw-error")}>{labels.fieldEmailInvalid}</p>
            ) : (
              <p className={cx("fw-muted")}>{labels.fieldEmailHint}</p>
            )}
          </div>
          {isOpen && error && (
            <p className={cx("fw-error")} role="alert">
              {userMessage(error)}
            </p>
          )}
          <button type="submit" className={cx("fw-btn")} disabled={isPending || !isEmailValid}>
            {labels.follow}
          </button>
        </form>
      </Popup>
    </>
  );
}
