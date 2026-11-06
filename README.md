# Fewchurs for React and Next.js

A feature-request board in any React app: install, add one env var, render one component.
Server-rendered in Next.js with the API key kept on the server, or client-side in a Vite/CRA SPA.

```bash
pnpm add @fewchurs/next    # Next.js App Router
pnpm add @fewchurs/react   # any other React app
```

| Package                             | What it is                                                            | Where it runs          |
| ----------------------------------- | --------------------------------------------------------------------- | ---------------------- |
| [`@fewchurs/react`](packages/react) | Fetch client, store, hooks, components, styles                        | Any React 18 or 19 app |
| [`@fewchurs/next`](packages/next)   | Server-rendered board, route handler, server actions, cookie identity | Next.js 14+ App Router |

---

## Next.js

```dotenv
FEWCHURS_API_KEY=fr_live_…
```

```ts
// app/api/fewchurs/[...route]/route.ts
export { GET, POST, DELETE } from "@fewchurs/next/handler";
```

```tsx
// app/feedback/page.tsx
import { FewchursBoard } from "@fewchurs/next";
import "@fewchurs/next/styles.css";

export default function Page() {
  return <FewchursBoard />;
}
```

The board renders on the server with real data. Voting, commenting and submitting post to your
own route handler, which adds the key — so the key is never in the client bundle, and no CORS
is involved.

Add your domain to your app in the Fewchurs dashboard. The API key only works there, and
`localhost` always works while you build. The package reads the domain from each request. Set
`FEWCHURS_APP_ID=yourcompany.com` when your site runs on another address, such as a preview
deployment. Setting it also lets you test your domain from localhost.

`<FewchursBoard>` is a server component (it imports `server-only`). Importing it from a
`"use client"` file is a build error rather than a key silently serialized into the browser
bundle.

## React SPA

```tsx
import { FewchursBoard, FewchursProvider } from "@fewchurs/react";
import "@fewchurs/react/styles.css";

export function App() {
  return (
    <FewchursProvider apiKey={import.meta.env.VITE_FEWCHURS_KEY}>
      <FewchursBoard />
    </FewchursProvider>
  );
}
```

Add your domain to your app in the Fewchurs dashboard. The API key only works there.

The key is publishable here, the same way it is in the mobile SDKs — protection is server-side
rate limiting, not secrecy. This mode needs CORS on the Fewchurs API. Until that ships, point
the provider at a proxy instead and keep the key on your own server:

```tsx
<FewchursProvider baseUrl="/api/fewchurs">
```

## Hooks

```tsx
const { features, isLoading, error, loadMore, hasMore } = useFeatures({ sort: "top" });
const { hasVoted, upvoteCount, toggle, isPending } = useVote(featureId);
const { comments, add, loadMore } = useComments(featureId);
const { submit, isPending } = useSubmitFeature();
const { isFollowing, follow, unfollow } = useFollow(featureId);
const { feature, isLoading, refresh } = useFeature(featureId);
const { showBranding, hideVoteCounts } = useFewchursConfig();
```

Hooks never throw on a failed request. Every failure is a typed value:

```ts
type FewchursError =
  | { code: "invalid_key"; status: 401 | 403; message: string }
  | { code: "validation_failed"; status: 400; message: string }
  | { code: "rate_limited"; status: 429; message: string }
  | { code: "not_found"; status: 404; message: string }
  | { code: "limit_reached"; status: 402; message: string }
  | { code: "server"; status: number; message: string }
  | { code: "network"; message: string };
```

`userMessage(error)` returns a sentence you can show on screen:

| Error                       | Message                                                    |
| --------------------------- | ---------------------------------------------------------- |
| `network`                   | You're offline.                                            |
| `rate_limited`              | You've reached today's limit. Try again tomorrow.          |
| `limit_reached`             | This board isn't accepting requests right now.             |
| `not_found`                 | This request no longer exists.                             |
| `validation_failed`         | The reason, such as "Title must be 3–100 characters."      |
| `invalid_key`, status `401` | Invalid API key. Check the key in your Fewchurs dashboard. |
| `invalid_key`, status `403` | The server's text, which names the domain to add           |
| `server`                    | Something went wrong. Try again.                           |

A server `wrong_app` response arrives as `invalid_key` with status `403`.

When the board can't load, it shows a title, a message and a **Try again** button:

| Problem       | Title                  | Message                              |
| ------------- | ---------------------- | ------------------------------------ |
| No API key    | Fewchurs isn't set up  | How to pass the key (no button)      |
| Rejected key  | Invalid API key        | Where to copy the key from           |
| `wrong_app`   | Invalid API key        | The server's text                    |
| Offline       | You're offline         | Check your connection and try again. |
| Anything else | Couldn't load requests | The `userMessage` text               |

The setup messages are written for the developer, and a visitor sees them if an app ships without a
working key. Change the wording through `labels`, such as `errorInvalidKeyTitle` and
`errorInvalidKeyDetail`. Outside production, each failed request is also logged once to the console
as `[fewchurs] : <details>`.

## Customization

**Level 1 — defaults.** `<FewchursBoard />` renders tabs, the list, voting, comments, the submit
form, and the Fewchurs badge when the app is on a plan that shows it. Light and dark follow
`prefers-color-scheme`, and the first paint is placeholder rows shaped like the cards, so the
board keeps its height instead of jumping when the first page lands.

**Level 2 — CSS variables.**

```css
.fewchurs {
  --fw-primary: #ed5f18;
  --fw-radius: 12px;
  --fw-font: var(--font-sans);
  --fw-surface: #fff;
}
```

or `<FewchursBoard theme={{ primary: "#0f766e", radius: 4 }} />`.

**Level 3 — props.**

```tsx
<FewchursBoard
  tabs={["top", "new", "roadmap"]} // default: ["top", "new"]
  defaultTab="top"
  showDeclined={false}
  allowComments
  emailField="optional"
  pageSize={20}
  initialFeatureId={requestId} // shows that one request above the list
  labels={{ title: "Ideas", submit: "Suggest an idea" }}
/>
```

**Level 4 — slots.**

```tsx
<FewchursBoard
  renderHeader={() => <MyHeader />}
  renderEmpty={() => <MyEmpty />}
  renderFeature={(feature, actions) => <MyRow feature={feature} onVote={actions.toggleVote} />}
/>
```

**Level 5 — headless.**

```tsx
<FewchursBoard.Root>
  <FewchursBoard.Tabs />
  <FewchursBoard.List />
  <FewchursBoard.SubmitTrigger />
</FewchursBoard.Root>
```

`unstyled` drops every class name and keeps behaviour, ARIA and keyboard handling. Or skip the
components entirely and build your own UI on the hooks.

Slots and `onEvent` are functions, so they cannot be passed to the Next.js server component.
Wrap the client board in your own `"use client"` file when you need them.

## A button that slides the board in

`FewchursButton` shows only a button. Clicking it slides the board in as a sheet: from the side on
a wide screen, from the bottom on a phone. Nothing is fetched until it opens. Escape, the close
button and the backdrop all close it, and focus returns to the button.

In Next.js the key stays on your server, and the button works in a layout without making your
pages dynamic:

```tsx
import { FewchursButton } from "@fewchurs/next";
import "@fewchurs/next/styles.css";

<FewchursButton />;
```

In a React SPA, put it inside the provider:

```tsx
import { FewchursButton, FewchursProvider } from "@fewchurs/react";
import "@fewchurs/react/styles.css";

<FewchursProvider apiKey={import.meta.env.VITE_FEWCHURS_KEY}>
  <FewchursButton />
</FewchursProvider>;
```

Add `floating` to keep the button on the bottom right of every page, or `floating="left"` for the
bottom left. Put it in your root layout so it shows everywhere:

```tsx
<FewchursButton floating />
```

The board in the sheet has its **New request** button, which shows the form for adding a request.

Pass your own label as children, such as `<FewchursButton>Suggest a feature</FewchursButton>`.
`className` and `style` go on the button, and every other `FewchursBoard` prop goes to the board.

To open the sheet from your own button, use `FewchursBoardDialog` with `variant="sheet"`, `open`
and `onClose`. It is a client component, so in Next.js render it from your own `"use client"` file
with `FewchursProvider baseUrl="/api/fewchurs"` around it. Without the variant it is a centered
modal.

## Linking to one request

`initialFeatureId` shows one request above the list with its comments already open — for a link
from an email or a changelog straight to what someone voted on. `@fewchurs/next` renders that
request on the server too. An id that no longer exists is ignored: the list still shows.

```tsx
<FewchursBoard
  initialFeatureId={new URLSearchParams(location.search).get("request") ?? undefined}
/>
```

`useFeature(featureId)` fetches one request on its own, into the same store the lists use, so
voting or commenting on it updates everywhere at once.

## Identity

Votes are anonymous and tied to an `X-Device-Id`.

- **Next.js** — an `httpOnly` cookie, set by the route handler on the first request. The server
  and the browser agree, so there is no hydration mismatch.
- **SPA** — a cookie when same-origin, `localStorage` as a fallback, generated on first use.
- **Signed-in users** — hash the user id so votes follow the account across devices:

```tsx
<FewchursProvider deviceId={hashedUserId}>
```

```ts
export const { GET, POST, DELETE } = createHandler({
  deviceId: async () => hash((await auth()).userId),
});
```

Always hash. Never send a raw id or an email address as the device id.

## Analytics

```tsx
<FewchursProvider onEvent={(event) => track(event.name, event)}>
```

Events: `boardOpened`, `featureSubmitted`, `voted`, `commented`, `followed`, `error`.

## Repo layout

```
packages/react   the client package
packages/next    the Next.js package
examples/next-app   server-rendered board, route handler, no key in the bundle
examples/vite-spa   client-only board, publishable key or dev-server proxy
```

```bash
pnpm install
pnpm test          # vitest + MSW + Testing Library
pnpm build         # tsup → ESM + CJS + types
pnpm size          # bundle budget
pnpm check:packaging   # publint + are-the-types-wrong
```

## Requirements

React 18 or 19. Next.js 14+ (App Router) for `@fewchurs/next`, Node 20+ for its route handler,
which also runs on the edge runtime. No runtime dependencies — React is a peer dependency, and
the styles are a plain stylesheet with no Tailwind or CSS-in-JS requirement.

## License

Proprietary. You may use the packages in your own apps to connect them to Fewchurs, and customise
them through the documented props, CSS variables, slots and hooks. The source is public for
transparency, not open source. See [LICENSE](LICENSE).
