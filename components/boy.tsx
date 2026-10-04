import { forwardRef } from "react";

/*
  The portrait's other side: an original cartoon of a boy at his laptop
  (not a likeness of anyone). Drawn as SVG; the motion (blinking, a typing
  nod, code drifting up, steam off the tea, a few petals) is CSS in
  globals.css under `.boy`, so a still copy can be rasterised for the flip.
*/

const Boy = forwardRef<SVGSVGElement, { className?: string }>(function Boy({ className = "" }, ref) {
  return (
    <svg ref={ref} className={`boy ${className}`} width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="boy-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bcd6f0" />
          <stop offset="1" stopColor="#f4e8da" />
        </linearGradient>
        <radialGradient id="boy-glow" cx="0.5" cy="0.9" r="0.6">
          <stop offset="0" stopColor="#d7ecff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#d7ecff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="boy-hoodie" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34508f" />
          <stop offset="1" stopColor="#24386a" />
        </linearGradient>
      </defs>

      {/* Sky, sun and a window frame behind him. */}
      <rect width="200" height="200" fill="url(#boy-sky)" />
      <circle cx="152" cy="46" r="15" fill="#f08a6b" opacity="0.85" />
      <path d="M18 30h44v46H18z" fill="#ffffff" opacity="0.35" />
      <path d="M40 30v46M18 53h44" stroke="#ffffff" strokeWidth="2" opacity="0.6" />

      {/* Hoodie and shoulders. */}
      <path d="M44 200c2-34 18-58 56-60 38 2 54 26 56 60z" fill="url(#boy-hoodie)" />
      <path d="M78 142c6 10 14 14 22 14s16-4 22-14" fill="none" stroke="#1d2b52" strokeWidth="3" strokeLinecap="round" />
      <path d="M92 150v16M108 150v16" stroke="#f3efe6" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="92" cy="167" r="2" fill="#f3efe6" />
      <circle cx="108" cy="167" r="2" fill="#f3efe6" />

      {/* Head (nods while typing). */}
      <g className="boy-head">
        <rect x="92" y="118" width="16" height="18" rx="6" fill="#e9b892" />
        <circle cx="61" cy="96" r="8.5" fill="#f2c4a0" />
        <circle cx="139" cy="96" r="8.5" fill="#f2c4a0" />
        <circle cx="100" cy="92" r="38" fill="#f6d0ae" />
        <circle cx="100" cy="92" r="38" fill="url(#boy-glow)" className="boy-screenlight" />
        {/* Spiky anime hair. */}
        <path
          d="M60 96C54 60 76 44 100 44c26 0 46 16 40 52l-6-14-4 12-7-17-6 14-9-18-5 15-8-17-6 15-8-16-5 14-4-10z"
          fill="#2b2433"
        />
        <path d="M84 52c8-4 18-5 28-2" fill="none" stroke="#4d4560" strokeWidth="3" strokeLinecap="round" />
        <path d="M100 44c-4-8-1-14 6-17-2 6 0 11 4 15" fill="#2b2433" />
        {/* Brows, eyes (blink), blush, smile. */}
        <path d="M78 84l12-3M110 81l12 3" stroke="#2b2433" strokeWidth="2.6" strokeLinecap="round" />
        <g className="boy-eyes">
          <ellipse cx="86" cy="98" rx="5.6" ry="7.2" fill="#2b2433" />
          <ellipse cx="114" cy="98" rx="5.6" ry="7.2" fill="#2b2433" />
          <circle cx="88" cy="95" r="2" fill="#fff" />
          <circle cx="116" cy="95" r="2" fill="#fff" />
          <circle cx="84.5" cy="101" r="1" fill="#fff" opacity="0.8" />
          <circle cx="112.5" cy="101" r="1" fill="#fff" opacity="0.8" />
        </g>
        <ellipse cx="76" cy="110" rx="6" ry="3.4" fill="#f29b9b" opacity="0.55" />
        <ellipse cx="124" cy="110" rx="6" ry="3.4" fill="#f29b9b" opacity="0.55" />
        <path d="M93 113q7 7 14 0" fill="none" stroke="#7a3b33" strokeWidth="2.4" strokeLinecap="round" />
      </g>

      {/* Desk. */}
      <rect x="0" y="176" width="200" height="24" fill="#b98a5e" />
      <rect x="0" y="174" width="200" height="4" fill="#d6a77a" />

      {/* Hands on the keyboard, peeking round the lid. */}
      <ellipse className="boy-hand-l" cx="56" cy="168" rx="9" ry="6.5" fill="#f2c4a0" />
      <ellipse className="boy-hand-r" cx="144" cy="168" rx="9" ry="6.5" fill="#f2c4a0" />

      {/* Laptop, lid towards us, a sakura on the back. */}
      <rect x="54" y="122" width="92" height="56" rx="6" fill="#c9cdd8" />
      <rect x="54" y="122" width="92" height="56" rx="6" fill="none" stroke="#a7acba" strokeWidth="2" />
      <path d="M48 176h104l-6 6H54z" fill="#aeb3c1" />
      <g transform="translate(100 150)" fill="#f3a6bb">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="0" cy="-6.5" rx="4" ry="6" transform={`rotate(${a})`} />
        ))}
        <circle r="2.6" fill="#e0523a" />
      </g>

      {/* Tea with steam. */}
      <path d="M164 160h18v10a6 6 0 0 1-6 6h-6a6 6 0 0 1-6-6z" fill="#f3efe6" />
      <path d="M182 163h3a3 3 0 0 1 0 6h-3" fill="none" stroke="#f3efe6" strokeWidth="2" />
      <path d="M166 162h14" stroke="#9c6b3d" strokeWidth="2.5" />
      <path className="boy-steam s1" d="M170 154c-3-4 3-6 0-10" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <path className="boy-steam s2" d="M176 154c-3-4 3-6 0-10" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />

      {/* Code drifting up from the laptop. */}
      <g fontFamily="ui-monospace, Menlo, Consolas, monospace" fontWeight="700" fontSize="11">
        <text className="boy-code c1" x="22" y="134" fill="#34508f">{"</>"}</text>
        <text className="boy-code c2" x="156" y="128" fill="#c8282d">{"{ }"}</text>
        <text className="boy-code c3" x="34" y="112" fill="#2f7a55">AI</text>
      </g>

      {/* A few sakura petals. */}
      <g fill="#f6b7c8">
        <ellipse className="boy-petal p1" cx="30" cy="20" rx="3.4" ry="2.2" />
        <ellipse className="boy-petal p2" cx="120" cy="10" rx="3" ry="2" />
        <ellipse className="boy-petal p3" cx="175" cy="24" rx="3.2" ry="2.1" />
      </g>
    </svg>
  );
});

export default Boy;
