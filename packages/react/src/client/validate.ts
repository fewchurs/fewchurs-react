import { EMAIL_PATTERN, LIMITS } from "./constants";
import { validationError, type FewchursError } from "./errors";
import type { CreateCommentInput, SubmitFeatureInput } from "../types";

export function validateFeatureInput(input: SubmitFeatureInput): FewchursError | null {
  const title = input.title.trim();
  if (title.length < LIMITS.titleMin || title.length > LIMITS.titleMax) {
    return validationError(`Title must be ${LIMITS.titleMin}–${LIMITS.titleMax} characters.`);
  }
  if ((input.description ?? "").trim().length > LIMITS.descriptionMax) {
    return validationError(`Description must be at most ${LIMITS.descriptionMax} characters.`);
  }
  if (input.email !== undefined && input.email !== "" && !isEmail(input.email)) {
    return validationError("Enter a valid email address.");
  }
  return null;
}

export function validateCommentInput(input: CreateCommentInput): FewchursError | null {
  const text = input.text.trim();
  if (text.length < LIMITS.commentMin || text.length > LIMITS.commentMax) {
    return validationError(`Comment must be ${LIMITS.commentMin}–${LIMITS.commentMax} characters.`);
  }
  if ((input.authorName ?? "").trim().length > LIMITS.authorNameMax) {
    return validationError(`Name must be at most ${LIMITS.authorNameMax} characters.`);
  }
  return null;
}

export function validateEmail(email: string): FewchursError | null {
  return isEmail(email) ? null : validationError("Enter a valid email address.");
}

function isEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}
