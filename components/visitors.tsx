"use client";

import { useEffect, useState } from "react";

/*
  訪 (visit): how many people have stopped by. A browser is counted as a
  visitor once (a random id kept in localStorage) and as a view once per
  session. Automated browsers only read the totals. Hidden until the
  counter's database is connected (see app/api/visit/route.ts).
*/

type Totals = { visitors: number; views: number };

function useCountUp(target: number, ms = 900) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!target) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setN(target);
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}

export default function Visitors() {
  const [totals, setTotals] = useState<Totals | null>(null);

  useEffect(() => {
    let id: string | null = null;
    let counted = false;
    try {
      id = localStorage.getItem("vid");
      if (!id) {
        id = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/-/g, "").slice(0, 24);
        localStorage.setItem("vid", id);
      }
      counted = sessionStorage.getItem("counted") === "1";
    } catch {}
    const record = !counted && !navigator.webdriver;
    fetch("/api/visit", {
      method: record ? "POST" : "GET",
      headers: record ? { "Content-Type": "application/json" } : undefined,
      body: record ? JSON.stringify({ id }) : undefined,
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.configured) return;
        if (record) {
          try {
            sessionStorage.setItem("counted", "1");
          } catch {}
        }
        setTotals({ visitors: d.visitors, views: d.views });
      })
      .catch(() => {});
  }, []);

  const visitors = useCountUp(totals?.visitors ?? 0);
  const views = useCountUp(totals?.views ?? 0);
  if (!totals) return null;
  const fmt = (n: number) => n.toLocaleString("en-IN");
  return (
    <span className="visitors" title="Visitors are counted once per browser; views once per visit">
      <b lang="ja">訪</b>
      <span>
        <strong>{fmt(visitors)}</strong> visitors
      </span>
      <span aria-hidden="true">·</span>
      <span>
        <strong>{fmt(views)}</strong> views
      </span>
    </span>
  );
}
