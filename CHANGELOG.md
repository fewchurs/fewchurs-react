# Changelog

## 1.5.0 — 2026-11-06

- The error messages now match the other Fewchurs SDKs. `userMessage` returns the new text, and the
  board shows a title and message for each problem: "Fewchurs isn't set up", "Invalid API key",
  "You're offline" or "Couldn't load requests".
- `wrong_app` now shows the server's text on screen, which names the domain to add. It used to show
  "Wrong platform".
- New messages for a failed next page, a failed vote, a failed unfollow, a failed comment load (with
  **Try again**) and a linked request that no longer exists.
- The request form shows "At least 3 characters." and "Enter a valid email address." under the
  fields, and counts title and description characters. Submit, Post and Notify me stay off until the
  input is valid.
- `missing_device_id` now arrives as a `server` error instead of `validation_failed`.
- With no API key, `FewchursBoard` from `@fewchurs/next` shows "Fewchurs isn't set up" instead of
  throwing.

## 1.4.0 — 2026-11-06

- When the board can't load, it shows a title, a friendly line and a text **Try again** button:
  "Invalid API key", "Wrong platform" or "Something went wrong". The wording can be changed through
  `labels`.
- Outside production, every failed request is logged once to the console as `[fewchurs] : <details>`.

## 1.3.0 — 2026-11-06

- `FewchursButton` takes `floating`, which keeps the button on the bottom right of the page, or
  `floating="left"` for the bottom left.

## 1.2.1 — 2026-11-06

- A rejected API key no longer opens the Next.js error popup in development. The SDK logs it with
  `console.warn`, and the board or sheet shows the error.

## 1.2.0 — 2026-11-05

- `FewchursButton` in `@fewchurs/react` and `@fewchurs/next`: shows only a button that opens the
  board in a sheet, from the side on a wide screen and from the bottom on a phone. In Next.js it
  keeps the key on your server and does not make the page dynamic.
- `FewchursBoardDialog` takes `variant="sheet"`.
- `react-dom` is now a required peer dependency of `@fewchurs/react`.

## 1.1.0 — 2026-11-05

- `@fewchurs/react`: your API key only works on your own domains, which the browser reports through
  `Origin`. Handles `wrong_app`: it arrives as `invalid_key` with status `403`, keeps the server's
  message, and is logged once outside production. The `invalid_key` status type is now `401 | 403`.
- `@fewchurs/react`: new `appId` client option for calls made from a server.
- `@fewchurs/next`: your API key now only works on your own domains. The handler, server component
  and server actions send your site's host as `X-Fewchurs-App-Id`. Add your domain in the Fewchurs
  dashboard before you upgrade, or your live board will be refused. Use `FEWCHURS_APP_ID` or the
  `appId` option for a site on another address, such as a preview deployment.
- `@fewchurs/next`: a `wrong_app` refusal is logged once on your server, in production too. The
  handler always sends its own `X-Fewchurs-Sdk` rather than passing on the browser's.

## 1.0.1 — 2026-10-21

- The default API host is now `https://www.fewchurs.com/api/v1` (was `https://www.fewchurs.shop/api/v1`).
  Anything that passes an explicit `baseUrl` is unaffected; everything else moves to the new host on
  upgrade. If you proxy the API, update your own rewrite target too — the `Authorization` header is
  commonly dropped across a cross-domain redirect, so relying on a redirect from the old host is not
  a safe substitute.
- `homepage` and the "powered by" link now point at `https://www.fewchurs.com`.

## 1.0.0 — 2026-10-19

- `@fewchurs/react`: fetch client, store, hooks (`useFeatures`, `useComments`, `useVote`,
  `useSubmitFeature`, `useFollow`, `useFewchursConfig`), board components and scoped styles.
- `@fewchurs/next`: server-rendered `<FewchursBoard>`, `createHandler()` route handler,
  server actions, and `httpOnly` cookie identity — with no API key in the client bundle.
- Five customization levels: defaults, CSS variables, props, slots, headless/unstyled.
- Typed errors, optimistic voting with rollback, cursor paging that survives deleted comments,
  and an `onEvent` callback for analytics.
- Defaults to the live API at `https://www.fewchurs.shop/api/v1`.
- `@fewchurs/next/styles.css`: the board stylesheet is re-exported from the Next.js package,
  so an app that installed only `@fewchurs/next` can import it under pnpm and Yarn PnP.
- Placeholder rows shaped like the cards on first paint, so the board keeps its height.
- `initialFeatureId` on `<FewchursBoard>` and a `useFeature(featureId)` hook: open the board on
  one request with its comments expanded, rendered on the server by `@fewchurs/next`.
- `SDK_VERSION` and the `X-Fewchurs-Sdk` header are generated from each `package.json` at build
  time, with a CI check that fails if they drift.
- Released under the proprietary Fewchurs SDK License.
