"use client";

import { useEffect, useRef } from "react";

/*
  Live wallpaper: sakura petals drifting down behind the whole page. Each
  petal sways, tumbles (its width follows the cosine of a turn, so it reads
  as flipping in 3D) and rides the occasional gust. They're few and faint so
  text stays easy to read, softly glowing on the indigo night in dark mode.

  One fixed canvas, pointer-events off. Fewer petals on small screens, about
  30 fps, paused in background tabs, and nothing at all with reduced motion.
*/

type Petal = { x: number; y: number; vy: number; sway: number; phase: number; spin: number; turn: number; size: number; tint: number; depth: number };

export default function Petals() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0,
      H = 0,
      dpr = 1,
      raf = 0,
      last = 0,
      t = 0,
      gust = 0,
      gustTimer = 4;
    let petals: Petal[] = [];
    let dark = false;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    const readTheme = () => {
      const t = document.documentElement.dataset.theme;
      dark = t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    };

    const make = (top: boolean): Petal => {
      const depth = Math.random(); // 0 far, 1 near: bigger, faster, stronger
      return {
        x: rnd(-20, W + 20),
        y: top ? rnd(-60, -10) : rnd(0, H),
        vy: 16 + depth * 26,
        sway: rnd(10, 26),
        phase: rnd(0, Math.PI * 2),
        spin: rnd(-1.2, 1.2),
        turn: rnd(1.2, 2.6),
        size: 4.5 + depth * 5.5,
        tint: Math.random(),
        depth,
      };
    };

    const resize = () => {
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round(Math.min(42, Math.max(16, (W * H) / 30000)));
      while (petals.length < target) petals.push(make(false));
      petals.length = target;
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of petals) {
        const flip = Math.cos(t * p.turn + p.phase); // -1..1: the petal turning
        const a = (dark ? 0.5 : 0.62) * (0.55 + p.depth * 0.45);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.phase + t * p.spin);
        ctx.scale(Math.max(0.15, Math.abs(flip)), 1);
        const s = p.size;
        // Two shades: the face and the paler back of the petal.
        const light = flip > 0;
        ctx.fillStyle = dark
          ? `rgba(255, ${light ? 190 : 210}, ${light ? 214 : 226}, ${a})`
          : p.tint < 0.5
            ? `rgba(244, ${light ? 168 : 192}, ${light ? 190 : 208}, ${a})`
            : `rgba(250, ${light ? 196 : 214}, ${light ? 212 : 224}, ${a})`;
        if (dark) {
          ctx.shadowColor = "rgba(255, 180, 210, 0.6)";
          ctx.shadowBlur = 6;
        }
        // A sakura petal: rounded, with the notch at its tip.
        ctx.beginPath();
        ctx.moveTo(0, s);
        ctx.bezierCurveTo(s * 1.15, s * 0.4, s * 0.8, -s * 0.9, s * 0.3, -s);
        ctx.lineTo(0, -s * 0.62);
        ctx.lineTo(-s * 0.3, -s);
        ctx.bezierCurveTo(-s * 0.8, -s * 0.9, -s * 1.15, s * 0.4, 0, s);
        ctx.fill();
        ctx.restore();
      }
    };

    const step = (dt: number) => {
      t += dt;
      gustTimer -= dt;
      if (gustTimer <= 0) {
        gust = rnd(-40, 55);
        gustTimer = rnd(5, 10);
      }
      gust *= Math.pow(0.5, dt);
      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];
        p.y += p.vy * dt;
        p.x += (Math.sin(t * 0.9 + p.phase) * p.sway * 0.6 + gust * (0.4 + p.depth * 0.6) + 6) * dt;
        if (p.y > H + 20 || p.x < -40 || p.x > W + 40) petals[i] = make(true);
      }
    };

    const frame = (now: number) => {
      // About 30 fps is plenty for drifting petals.
      if (now - last >= 32) {
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        step(dt);
        draw();
      }
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const onVis = () => (document.hidden ? cancelAnimationFrame(raf) : start());

    readTheme();
    resize();
    start();
    const mq = matchMedia("(prefers-color-scheme: dark)");
    window.addEventListener("resize", resize);
    window.addEventListener("themechange", readTheme);
    mq.addEventListener("change", readTheme);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("themechange", readTheme);
      mq.removeEventListener("change", readTheme);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} className="petals" aria-hidden="true" />;
}
