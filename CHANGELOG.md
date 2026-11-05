# Changelog

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
