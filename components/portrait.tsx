"use client";

import { useState } from "react";
import profile from "@/data/profile.json";
import { Tanzaku } from "./ui";

/*
  The portrait has a second side. Tapping it (変身, henshin, "transform")
  sweeps an ink brush across the round window, revealing an anime version,
  and a straw hat drops onto the head with a manga "ドン!". Tapping again
  turns back.
*/

function StrawHat() {
  return (
    <svg viewBox="0 0 240 132" aria-hidden="true">
      <defs>
        <pattern id="straw" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
          <rect width="7" height="7" fill="#e9c46a" />
          <path d="M0 3.5h7" stroke="#c9a03f" strokeWidth="1.3" />
          <path d="M3.5 0v7" stroke="#f3d98c" strokeWidth=".8" />
        </pattern>
      </defs>
      {/* brim */}
      <ellipse cx="120" cy="100" rx="114" ry="28" fill="url(#straw)" stroke="#3b2a1a" strokeWidth="3.5" />
      <ellipse cx="120" cy="96" rx="84" ry="16" fill="#000" opacity=".12" />
      {/* crown */}
      <path d="M58 96c-3-30 6-62 26-74 22-13 50-13 72 0 20 12 29 44 26 74-38 9-86 9-124 0Z" fill="url(#straw)" stroke="#3b2a1a" strokeWidth="3.5" />
      {/* red band */}
      <path d="M59.5 78c38 9 83 9 121 0l1.5 18c-38 9-86 9-124 0Z" fill="#c8282d" stroke="#3b2a1a" strokeWidth="3" />
      <path d="M78 34c10-9 26-14 42-14" fill="none" stroke="#fff6d8" strokeWidth="4" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}

export default function Portrait() {
  const [anime, setAnime] = useState(false);
  const [burst, setBurst] = useState(0);
  const toggle = () => {
    setAnime((a) => !a);
    setBurst((n) => n + 1);
  };

  return (
    <div className="portrait" data-anime={anime} data-rise="" style={{ animationDelay: "140ms" }}>
      <span className="ring" aria-hidden="true" />
      <button type="button" className="marumado" onClick={toggle} aria-pressed={anime} aria-label={anime ? "Show the photo again" : "Transform the photo into an anime character"}>
        <picture>
          <source srcSet={profile.photo} type="image/webp" />
          <img src={profile.photoFallback} alt={profile.photoAlt} width={720} height={960} fetchPriority="high" />
        </picture>
        <img className="anime" src="/sai-anime.webp" alt="" width={720} height={960} loading="lazy" decoding="async" />
        {burst > 0 && <span className="ink-sweep" key={burst} aria-hidden="true" />}
      </button>
      <span className="hat" aria-hidden="true">
        <StrawHat />
      </span>
      {anime && (
        <span className="don" key={burst} aria-hidden="true" lang="ja">
          ドン!
        </span>
      )}
      <Tanzaku />
      <span className="henshin" aria-hidden="true">
        <b lang="ja">変身</b> {anime ? "tap to change back" : "tap me"}
      </span>
    </div>
  );
}
