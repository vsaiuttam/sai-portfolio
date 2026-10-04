import { Seal } from "@/components/ui";

export default function NotFound() {
  return (
    <main id="main" className="wrap lost">
      <div>
        <Seal size={5} />
        <h1>This page drifted off the pond</h1>
        <p>The link may be old, or the page has moved.</p>
        <a className="btn primary" href="/">
          Back home
        </a>
      </div>
    </main>
  );
}
