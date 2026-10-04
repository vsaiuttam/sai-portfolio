import profile from "@/data/profile.json";

/** The hanko: a vermilion seal with "साई", slightly rough like a real stamp. */
export function Seal({ size = 2.1, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`seal ${className}`} style={{ width: `${size}rem`, height: `${size}rem`, fontSize: `${size * 0.36}rem` }} aria-hidden="true">
      {profile.seal}
    </span>
  );
}

/** SVG filter that roughens the seal's edges (referenced as url(#ink)). */
export function InkFilter() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <filter id="ink">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" />
      </filter>
    </svg>
  );
}

/**
 * A section: the Devanagari name runs down the side like Japanese vertical
 * writing, with the English title beside the content.
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
        <span className="vert" lang="hi">
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

/** Seigaiha waves strung with kolam dots. */
export function WaveBreak() {
  const arcs = [20, 60, 100, 140, 180];
  return (
    <div className="wavebreak" aria-hidden="true">
      <svg viewBox="0 0 200 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        {arcs.map((x) => (
          <g key={x}>
            <path d={`M${x - 12} 20a12 12 0 0 1 24 0`} />
            <path d={`M${x - 7.5} 20a7.5 7.5 0 0 1 15 0`} />
            <path d={`M${x - 3} 20a3 3 0 0 1 6 0`} />
          </g>
        ))}
        {[40, 80, 120, 160].map((x) => (
          <circle key={x} cx={x} cy={8} r={1.6} fill="currentColor" stroke="none" />
        ))}
        <circle cx={100} cy={4} r={1.6} fill="rgb(var(--sindoor))" stroke="none" />
      </svg>
    </div>
  );
}
