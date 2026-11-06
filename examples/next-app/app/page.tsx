import { FewchursButton } from "@fewchurs/next";
import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: "44rem", margin: "0 auto" }}>
      <h1>Fewchurs · Next.js example</h1>
      <p>
        The board renders on the server with real data. Voting, commenting and submitting go
        through <code>/api/fewchurs</code>, so the API key stays out of the browser.
      </p>
      <p>
        <Link href="/feedback">Open the board →</Link>
      </p>
      <FewchursButton floating />
    </main>
  );
}
