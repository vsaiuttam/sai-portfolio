"use client";

import { Mark } from "@/components/ui";

// Shown if something on a page throws while rendering in the browser.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="wrap lost">
      <div>
        <Mark size={5} />
        <h1>Something slipped</h1>
        <p>A part of this page failed to load. Trying again usually fixes it.</p>
        <button type="button" className="btn primary" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
