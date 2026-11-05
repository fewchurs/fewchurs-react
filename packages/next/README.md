# @fewchurs/next

A server-rendered Fewchurs feature-request board for the Next.js App Router. The API key stays
on the server. See the [repository README](../../README.md) for the full guide.

```bash
pnpm add @fewchurs/next
```

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

Add your domain to your app in the Fewchurs dashboard. The API key only works there, and
`localhost` always works while you build. The package reads the domain from each request. Set
`FEWCHURS_APP_ID=yourcompany.com` when your site runs on another address, such as a preview
deployment.

- `<FewchursBoard initialFeatureId="…">` — opens the board on one request, rendered on the
  server, for a link straight to it.
- `createHandler({ apiKey, baseUrl, appId, apiPath, deviceId })` — the proxy, mounted wherever you like.
- `@fewchurs/next/actions` — `submitFeatureAction`, `voteAction`, `commentAction`, `followAction`
  for boards built from plain forms.
- `@fewchurs/next/identity` — the `httpOnly` device-id cookie helpers.
