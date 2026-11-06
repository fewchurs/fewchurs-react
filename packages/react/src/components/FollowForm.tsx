"use client";

import { useState } from "react";
import { EMAIL_PATTERN } from "../client/constants";
import { userMessage } from "../client/errors";
import { useFollow } from "../hooks/useFollow";
import { useBoard } from "./BoardContext";
import type { Feature } from "../types";

export function FollowForm({ feature }: { feature: Feature }): React.JSX.Element {
  const { labels, userEmail, cx } = useBoard();
  const { isFollowing, isPending, error, follow, unfollow } = useFollow(feature.id);
  const [email, setEmail] = useState(userEmail ?? "");
  const [isOpen, setIsOpen] = useState(false);

  if (isFollowing) {
    return (
      <>
        <button
          type="button"
          className={cx("fw-link")}
          disabled={isPending}
          onClick={() => void unfollow()}
        >
          {labels.following}
        </button>
        {error && (
          <p className={cx("fw-error")} role="alert">
            {userMessage(error)}
          </p>
        )}
      </>
    );
  }

  if (!isOpen) {
    return (
      <button type="button" className={cx("fw-link")} onClick={() => setIsOpen(true)}>
        {labels.follow}
      </button>
    );
  }

  const isEmailValid = EMAIL_PATTERN.test(email.trim());

  return (
    <form
      className={cx("fw-form", "fw-form--inline")}
      onSubmit={async (event) => {
        event.preventDefault();
        const ok = await follow(email);
        if (ok) setIsOpen(false);
      }}
    >
      <label className={cx("fw-sr-only")} htmlFor={`fw-follow-${feature.id}`}>
        {labels.fieldEmail}
      </label>
      <input
        id={`fw-follow-${feature.id}`}
        className={cx("fw-input")}
        type="email"
        value={email}
        placeholder={labels.followPlaceholder}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      {email !== "" && !isEmailValid && (
        <p className={cx("fw-error")}>{labels.fieldEmailInvalid}</p>
      )}
      <button type="submit" className={cx("fw-btn")} disabled={isPending || !isEmailValid}>
        {labels.follow}
      </button>
      {error && (
        <p className={cx("fw-error")} role="alert">
          {userMessage(error)}
        </p>
      )}
    </form>
  );
}
