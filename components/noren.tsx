"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { sound } from "@/lib/sound";

/*
  Moving between pages means walking through a noren, the split indigo
  curtain hung in a shop doorway. Clicking a link to another page drops the
  curtain panel by panel, each carrying one character of where you're going
  (履歴書 rirekisho, "résumé"; 作品集 sakuhinshū, "portfolio"). The page
  changes behind it, then the panels swing up and apart as you pass through.
*/

const SIGNS: Record<string, { chars: string[]; reading: string }> = {
  "/resume": { chars: ["履", "歴", "書"], reading: "rirekisho · résumé" },
  "/": { chars: ["作", "品", "集"], reading: "sakuhinshū · portfolio" },
};
const signFor = (path: string) => SIGNS[path] ?? SIGNS["/"];

// Timings in ms; they match the transitions in globals.css (.noren).
const DROP = 560;
const STAGGER = 70;
const HOLD = 260;
const LIFT = 820;

type Phase = "idle" | "ready" | "down" | "up";

export default function Noren() {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const [sign, setSign] = useState(signFor("/"));
  const phaseRef = useRef<Phase>("idle");
  const target = useRef<{ href: string; path: string; hash: boolean } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const go = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Catch clicks on links to another page of this site.
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      // Files (the PDF, images) load normally.
      if (/\.[a-z0-9]{2,5}$/i.test(url.pathname)) return;
      e.preventDefault();
      if (phaseRef.current !== "idle") return;
      target.current = { href: url.pathname + url.search + url.hash, path: url.pathname, hash: !!url.hash };
      setSign(signFor(url.pathname));
      router.prefetch(url.pathname);
      // Mount the curtain raised, then let it fall on the next frame.
      go("ready");
      requestAnimationFrame(() => requestAnimationFrame(() => go("down")));
      sound.norenDown(DROP + STAGGER * 2);
      later(() => {
        if (target.current) router.push(target.current.href, { scroll: false });
        // If the page never changes (an error), lift the curtain anyway.
        later(() => phaseRef.current === "down" && lift(), 4000);
      }, DROP + STAGGER * 2 + HOLD);
    };
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, [router]);

  const lift = () => {
    if (!target.current?.hash) window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    go("up");
    sound.norenUp(LIFT);
    later(() => {
      target.current = null;
      go("idle");
    }, LIFT + STAGGER * 2 + 60);
  };

  // The new page has rendered behind the curtain: pass through it.
  useEffect(() => {
    if (phaseRef.current === "down" && target.current?.path === pathname) {
      requestAnimationFrame(() => {
        if (target.current?.hash) document.getElementById(target.current.href.split("#")[1])?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
        lift();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (phase === "idle") return null;
  const mid = (sign.chars.length - 1) / 2;
  return (
    <div className="noren" data-phase={phase} aria-hidden="true">
      <div className="noren-rod" />
      {sign.chars.map((ch, i) => (
        <div
          className="noren-panel"
          key={i}
          style={
            {
              "--d": `${(phase === "up" ? Math.abs(i - mid) : i) * STAGGER}ms`,
              "--tilt": `${(i - mid) * 7}deg`,
              "--drift": `${(i - mid) * 18}%`,
            } as React.CSSProperties
          }
        >
          <span className="noren-char" lang="ja">
            {ch}
          </span>
          {i === Math.floor(mid) && <span className="noren-reading">{sign.reading}</span>}
        </div>
      ))}
    </div>
  );
}
