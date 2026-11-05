import { FewchursBoard, FewchursButton, FewchursProvider } from "@fewchurs/react";

export function App() {
  return (
    <main style={{ maxWidth: "44rem", margin: "0 auto" }}>
      <h1>Fewchurs · Vite example</h1>

      {/* The key is publishable, like a Stripe or PostHog public key. Prefer the dev-server
          proxy below if you would rather keep it off the page entirely. */}
      <FewchursProvider
        apiKey={import.meta.env.VITE_FEWCHURS_KEY}
        baseUrl={import.meta.env.VITE_FEWCHURS_BASE_URL}
        onEvent={(event) => console.log("[fewchurs]", event.name)}
      >
        <FewchursButton theme={{ primary: "#ed5f18" }} />
        <FewchursBoard
          tabs={["top", "new"]}
          theme={{ primary: "#ed5f18", radius: 12 }}
          labels={{ title: "Ideas" }}
        />
      </FewchursProvider>
    </main>
  );
}
