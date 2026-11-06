# @fewchurs/react

A Fewchurs feature-request board for any React app — the client, the store, the hooks and the
components. See the [repository README](../../README.md) for the full guide.

```bash
pnpm add @fewchurs/react
```

```tsx
import { FewchursBoard, FewchursProvider } from "@fewchurs/react";
import "@fewchurs/react/styles.css";

<FewchursProvider apiKey={import.meta.env.VITE_FEWCHURS_KEY}>
  <FewchursBoard />
</FewchursProvider>;
```

Add your domain to your app in the Fewchurs dashboard. The API key only works there.

`FewchursButton` shows only a button that opens the board in a sheet, and `floating` keeps it on
the corner of the page. `FewchursBoardDialog` renders
the same board in a modal or a sheet (`open`, `onClose`, `variant`, plus every board prop), and
`initialFeatureId` opens the board on one request with its comments expanded.

In a Next.js app, use [`@fewchurs/next`](../next) instead: it renders the board on the server
and keeps the API key out of the browser.

`@fewchurs/react/core` is the server-safe half — the fetch client, the types, validation and
error mapping, with no React and no `"use client"` boundary.
