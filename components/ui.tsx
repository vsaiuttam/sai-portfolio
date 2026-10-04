import profile from "@/data/profile.json";

/**
 * The mark: an ensō, the Zen circle painted in one breath, left open where
 * the brush lifted, with a beni dot where it first touched the paper.
 */
export function Enso({ size = 2, className = "" }: { size?: number; className?: string }) {
  return (
    <svg className={`enso ${className}`} viewBox="0 0 64 64" width={`${size}rem`} height={`${size}rem`} aria-hidden="true">
      <path
        d="M41 9.5C28 5 13 12 10 27c-3 15 8 28 23 28 13 0 22-9 23-21 .6-7-2-13.5-6.5-17.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="6.5"
        strokeLinecap="round"
        filter="url(#ink)"
      />
      <path d="M49.5 16.2c-1.6-1.6-3.4-2.9-5.4-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".55" />
      <circle cx="41.5" cy="9.6" r="3.3" fill="rgb(var(--beni))" />
    </svg>
  );
}

/** A tanzaku: the narrow paper strip poems are written on, hung by a thread. */
export function Tanzaku({ className = "" }: { className?: string }) {
  return (
    <span className={`tanzaku ${className}`} aria-hidden="true" lang="ja">
      {profile.kana}
    </span>
  );
}

/** SVG filter that roughens brush edges (referenced as url(#ink)). */
export function InkFilter() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <filter id="ink">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="11" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
      </filter>
    </svg>
  );
}

/**
 * A section: its kanji name runs down the side in tategaki (vertical
 * writing), with the English title beside the content.
 */
export function Panel({
  id,
  num,
  vert,
  title,
  label,
  children,
}: {
  id: string;
  num: string;
  vert: string;
  title: string;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="panel" aria-labelledby={`${id}-title`}>
      <div className="panel-side" aria-hidden="true">
        <span className="num">{num}</span>
        <span className="vert" lang="ja">
          {vert}
        </span>
      </div>
      <div data-reveal>
        <h2 id={`${id}-title`}>
          {title}
          {label && <span className="label">{label}</span>}
        </h2>
        {children}
      </div>
    </section>
  );
}

/** A single dry-brush stroke between sections. */
export function BrushBreak() {
  return (
    <div className="brushbreak" aria-hidden="true">
      <svg viewBox="0 0 240 20">
        <path
          d="M8 11.5c30-4.2 62-5.6 98-5.2 34 .4 70 2.2 112 4.6 4 .2 6 1.4 5.6 2.6-.5 1.4-3.4 1.6-7.6 1.4-40-1.8-76-2.6-110-2.4-34 .2-66 1.4-97 3.4-3 .2-4.8-.5-4.8-1.9s1.3-2.3 3.8-2.5Z"
          fill="currentColor"
          filter="url(#ink)"
        />
        <circle cx="228" cy="8" r="2.4" fill="rgb(var(--beni))" />
      </svg>
    </div>
  );
}
