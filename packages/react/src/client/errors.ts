export type FewchursError =
  | { code: "invalid_key"; status: 401 | 403; message: string }
  | { code: "validation_failed"; status: 400; message: string }
  | { code: "rate_limited"; status: 429; message: string }
  | { code: "not_found"; status: 404; message: string }
  | { code: "limit_reached"; status: 402; message: string }
  | { code: "server"; status: number; message: string }
  | { code: "network"; message: string };

export type Result<T> = { ok: true; data: T } | { ok: false; error: FewchursError };

interface ServerErrorBody {
  error?: { code?: string; message?: string };
}

const USER_MESSAGES: Record<FewchursError["code"], string> = {
  invalid_key: "Feedback is unavailable right now.",
  validation_failed: "Please check what you entered and try again.",
  rate_limited: "You have reached today's limit. Try again tomorrow.",
  not_found: "That request no longer exists.",
  limit_reached: "Feedback is unavailable right now.",
  server: "Something went wrong. Please try again.",
  network: "Could not reach the server. Check your connection.",
};

/** Safe to show a visitor: never leaks a server message that may name internals. */
export function userMessage(error: FewchursError): string {
  if (error.code === "validation_failed" && error.message) return error.message;
  return USER_MESSAGES[error.code];
}

export function networkError(message = "Network request failed."): FewchursError {
  return { code: "network", message };
}

export function validationError(message: string): FewchursError {
  return { code: "validation_failed", status: 400, message };
}

export function errorFromResponse(status: number, body: unknown): FewchursError {
  const code = (body as ServerErrorBody | null)?.error?.code;
  const message = (body as ServerErrorBody | null)?.error?.message ?? `Request failed (${status}).`;

  switch (code) {
    case "invalid_key":
      return { code: "invalid_key", status: 401, message };
    case "wrong_app":
      return { code: "invalid_key", status: 403, message };
    // missing_device_id is a client mistake the caller fixes the same way a bad field is fixed,
    // so it collapses into validation_failed rather than widening the public union.
    case "missing_device_id":
    case "validation_failed":
      return { code: "validation_failed", status: 400, message };
    case "rate_limited":
      return { code: "rate_limited", status: 429, message };
    case "not_found":
      return { code: "not_found", status: 404, message };
    case "limit_reached":
      return { code: "limit_reached", status: 402, message };
    default:
      return status === 401
        ? { code: "invalid_key", status: 401, message }
        : { code: "server", status, message };
  }
}
