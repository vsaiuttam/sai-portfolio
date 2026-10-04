import profile from "@/data/profile.json";

/**
 * The mark: "SU" set in mincho on an ai-indigo tile, with a small red sun
 * in the corner. Text is drawn as SVG so it stays sharp at any size.
 */
export function Mark({ size = 2, className = "" }: { size?: number; className?: string }) {
  return (
    <svg className={`mark ${className}`} viewBox="0 0 40 40" width={`${size}rem`} height={`${size}rem`} aria-hidden="true">
      <rect width="40" height="40" rx="9" fill="rgb(31 47 88)" />
      <rect x="2.5" y="2.5" width="35" height="35" rx="7" fill="none" stroke="rgb(255 255 255 / 0.18)" />
      <text
        x="20"
        y="27.2"
        textAnchor="middle"
        fontFamily="var(--font-serif), Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize="19"
        letterSpacing="-0.5"
        fill="#f6f3ea"
      >
        SU
      </text>
      <circle cx="31.5" cy="8.5" r="3" fill="#e0523a" />
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
