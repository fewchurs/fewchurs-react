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

export const NOT_CONFIGURED_MESSAGE = "Fewchurs is not configured.";

const USER_MESSAGES: Record<FewchursError["code"], string> = {
  invalid_key: "Invalid API key. Check the key in your Fewchurs dashboard.",
  validation_failed: "Invalid input.",
  rate_limited: "You've reached today's limit. Try again tomorrow.",
  not_found: "This request no longer exists.",
  limit_reached: "This board isn't accepting requests right now.",
  server: "Something went wrong. Try again.",
  network: "You're offline.",
};

export function isWrongApp(error: FewchursError): boolean {
  return error.code === "invalid_key" && error.status === 403;
}

export function isNotConfigured(error: FewchursError): boolean {
  return error.code === "server" && error.message === NOT_CONFIGURED_MESSAGE;
}

export function notConfiguredError(): FewchursError {
  return { code: "server", status: 500, message: NOT_CONFIGURED_MESSAGE };
}

/** Safe to show a visitor. Only validation and `wrong_app` use the server's own text. */
export function userMessage(error: FewchursError): string {
  if (error.code === "validation_failed" && error.message) return error.message;
  if (isWrongApp(error) && error.message) return error.message;
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
  const serverMessage = (body as ServerErrorBody | null)?.error?.message;
  const message = serverMessage ?? `Request failed (${status}).`;

  switch (code) {
    case "invalid_key":
      return { code: "invalid_key", status: 401, message };
    case "wrong_app":
      return { code: "invalid_key", status: 403, message };
    case "missing_device_id":
      return { code: "server", status: 400, message };
    case "validation_failed":
      return { code: "validation_failed", status: 400, message: serverMessage ?? "Invalid input." };
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
