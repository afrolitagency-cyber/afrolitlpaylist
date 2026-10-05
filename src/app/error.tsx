"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <h1 className="text-3xl font-black">Something went wrong</h1>
        <p className="mx-auto mt-3 max-w-sm text-(--sub-text)">
          The page didn&apos;t load. Trying again usually fixes it.
        </p>
        {error.digest ? <p className="mt-2 text-xs text-(--sub-text)">Reference: {error.digest}</p> : null}
        <button onClick={reset} className="mt-6 rounded bg-(--primary) px-5 py-3 text-sm font-semibold text-white">
          Try again
        </button>
      </div>
    </main>
  );
}
