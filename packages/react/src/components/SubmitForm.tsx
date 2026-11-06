"use client";

import { useState } from "react";
import { EMAIL_PATTERN, LIMITS } from "../client/constants";
import { userMessage } from "../client/errors";
import { useSubmitFeature } from "../hooks/useSubmitFeature";
import { useBoard } from "./BoardContext";

export function SubmitForm(): React.JSX.Element {
  const { labels, emailField, userEmail, isSubscriber, setFormOpen, setJustSubmitted, cx } =
    useBoard();
  const { submit, isPending, error } = useSubmitFeature();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState(userEmail ?? "");

  const isTitleValid = title.trim().length >= LIMITS.titleMin;
  const isEmailInvalid = emailField !== "off" && email !== "" && !EMAIL_PATTERN.test(email.trim());
  const isEmailMissing = emailField === "required" && !email.trim();
  const canSubmit = isTitleValid && !isEmailInvalid && !isEmailMissing;

  return (
    <form
      className={cx("fw-form")}
      onSubmit={async (event) => {
        event.preventDefault();
        const created = await submit({
          title,
          description,
          ...(emailField !== "off" && email ? { email } : {}),
          isSubscriber,
        });
        if (!created) return;
        setTitle("");
        setDescription("");
        setJustSubmitted(true);
        setFormOpen(false);
      }}
    >
      <div className={cx("fw-field")}>
        <label className={cx("fw-label")} htmlFor="fw-title">
          {labels.fieldTitle}
        </label>
        <input
          id="fw-title"
          className={cx("fw-input")}
          value={title}
          minLength={LIMITS.titleMin}
          maxLength={LIMITS.titleMax}
          placeholder={labels.fieldTitlePlaceholder}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
        <div className={cx("fw-field__foot")}>
          <span className={cx("fw-error")}>
            {title !== "" && !isTitleValid ? labels.fieldTitleTooShort : ""}
          </span>
          <span className={cx("fw-muted")}>
            {title.length}/{LIMITS.titleMax}
          </span>
        </div>
      </div>

      <div className={cx("fw-field")}>
        <label className={cx("fw-label")} htmlFor="fw-description">
          {labels.fieldDescription}
        </label>
        <textarea
          id="fw-description"
          className={cx("fw-input", "fw-textarea")}
          value={description}
          maxLength={LIMITS.descriptionMax}
          placeholder={labels.fieldDescriptionPlaceholder}
          onChange={(event) => setDescription(event.target.value)}
        />
        <div className={cx("fw-field__foot")}>
          <span />
          <span className={cx("fw-muted")}>
            {description.length}/{LIMITS.descriptionMax}
          </span>
        </div>
      </div>

      {emailField !== "off" && (
        <div className={cx("fw-field")}>
          <label className={cx("fw-label")} htmlFor="fw-email">
            {labels.fieldEmail}
          </label>
          <input
            id="fw-email"
            className={cx("fw-input")}
            type="email"
            value={email}
            placeholder={labels.followPlaceholder}
            aria-describedby="fw-email-hint"
            onChange={(event) => setEmail(event.target.value)}
            required={emailField === "required"}
          />
          {isEmailInvalid ? (
            <p id="fw-email-hint" className={cx("fw-error")}>
              {labels.fieldEmailInvalid}
            </p>
          ) : (
            <p id="fw-email-hint" className={cx("fw-muted")}>
              {labels.fieldEmailHint}
            </p>
          )}
        </div>
      )}

      {error && (
        <p className={cx("fw-error")} role="alert">
          {userMessage(error)}
        </p>
      )}

      <div className={cx("fw-form__actions")}>
        <button type="submit" className={cx("fw-btn")} disabled={isPending || !canSubmit}>
          {isPending ? labels.submitting : labels.submit}
        </button>
        <button
          type="button"
          className={cx("fw-btn", "fw-btn--ghost")}
          onClick={() => setFormOpen(false)}
        >
          {labels.cancel}
        </button>
      </div>
    </form>
  );
}
