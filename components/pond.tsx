"use client";

import { useEffect, useRef } from "react";
import type { Ritu } from "@/lib/ritu";
import { PondCaption, useRitu } from "./client";

/*
  A lotus pond, drawn on a canvas. Lotus pads drift and turn, touching the
  water sends ripples out (and nudges the pads), and the season (ritu) adds
  its own life: marigold petals, sun glints, monsoon rain, fireflies under
  the Sharad moon, floating diyas, winter mist and leaves.

  It pauses off screen and in background tabs, and draws one still frame
  when the visitor prefers reduced motion.
*/

type Pad = { x: number; y: number; r: number; rot: number; spin: number; vx: number; vy: number; flower: number; phase: number };
type Ripple = { x: number; y: number; r: number; max: number; a: number };
type Bit = { x: number; y: number; vx: number; vy: number; rot: number; spin: number; s: number; life: number; land: number; kind: number };

const LOTUS_OUTER = "236 150 175";
const LOTUS_INNER = "222 98 136";

export default function Pond() {
  const { ritu } = useRitu();
  const ritRef = useRef<Ritu>(ritu);
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const resetBits = useRef<() => void>(() => {});

  useEffect(() => {
    ritRef.current = ritu;
    resetBits.current();
  }, [ritu]);

  useEffect(() => {
    const canvas = cv.current!;
    const box = wrap.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0,
      H = 0,
      dpr = 1;
    let pads: Pad[] = [];
    let ripples: Ripple[] = [];
    let bits: Bit[] = [];
    let raf = 0;
    let running = false;
    let visible = true;
    let last = performance.now();
    let t = 0;
    let lastMove = 0;
    let spawnAcc = 0;

    // Theme colours, read from the CSS tokens ("r g b").
    let col: Record<string, string> = {};
    let dark = false;
    const readColours = () => {
      const cs = getComputedStyle(document.documentElement);
      for (const k of ["water", "water-deep", "ink", "sindoor", "haldi", "leaf", "glow", "paper", "shadow"]) {
        col[k] = cs.getPropertyValue(`--${k}`).trim() || "0 0 0";
      }
      const [r, g, b] = col.paper.split(/\s+/).map(Number);
      dark = 0.299 * r + 0.587 * g + 0.114 * b < 128;
    };
    const c = (k: string, a = 1) => `rgb(${col[k]} / ${a})`;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    const makePads = () => {
      const n = Math.max(4, Math.min(9, Math.round(W / 120)));
      pads = [];
      for (let i = 0; i < n; i++) {
        const r = rnd(18, 34) * Math.min(1, W / 700 + 0.4);
        pads.push({
          x: ((i + rnd(0.15, 0.85)) / n) * W,
          y: rnd(H * 0.2, H * 0.85),
          r,
          rot: rnd(0, Math.PI * 2),
          spin: rnd(-0.02, 0.02),
          vx: rnd(-3, 3),
          vy: rnd(-1.5, 1.5),
          flower: Math.random() < 0.4 ? rnd(0.7, 1) : 0,
          phase: rnd(0, 10),
        });
      }
    };

    const newBit = (r: Ritu, init = false): Bit => {
      const b: Bit = { x: rnd(0, W), y: rnd(0, H), vx: 0, vy: 0, rot: rnd(0, 6.28), spin: rnd(-1, 1), s: 1, life: 0, land: rnd(H * 0.25, H * 0.95), kind: Math.random() };
      switch (r) {
        case "vasanta": // petals drift down, land, float, fade
        case "shishira": // leaves, slower
          b.y = init ? rnd(0, H) : -10;
          b.vx = rnd(4, 16);
          b.vy = r === "vasanta" ? rnd(18, 30) : rnd(10, 18);
          b.s = r === "vasanta" ? rnd(3, 5) : rnd(4, 6.5);
          if (init && b.y > b.land) b.y = b.land;
          break;
        case "varsha":
          b.y = init ? rnd(-H, H) : rnd(-40, -5);
          b.vx = -60;
          b.vy = rnd(420, 560);
          b.s = rnd(8, 16);
          break;
        case "sharad": // fireflies
          b.vx = rnd(-8, 8);
          b.vy = rnd(-6, 6);
          b.s = rnd(1.4, 2.6);
          b.life = rnd(0, 10);
          break;
        case "grishma": // glints on the water
          b.life = init ? rnd(0, 1) : 0;
          b.s = rnd(2, 4.5);
          break;
        case "hemanta": // floating diyas
          b.x = init ? rnd(0, W) : -20;
          b.y = rnd(H * 0.3, H * 0.9);
          b.vx = rnd(5, 10);
          b.vy = 0;
          b.s = rnd(0.85, 1.15);
          b.life = rnd(0, 10);
          break;
      }
      return b;
    };

    const BIT_COUNT: Record<Ritu, number> = { vasanta: 18, grishma: 12, varsha: 70, sharad: 16, hemanta: 6, shishira: 12 };
    resetBits.current = () => {
      const r = ritRef.current;
      const n = Math.round(BIT_COUNT[r] * Math.min(1.2, Math.max(0.5, W / 800)));
      bits = Array.from({ length: n }, () => newBit(r, true));
      if (reduce || !running) draw();
    };

    const resize = () => {
      const rect = box.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makePads();
      resetBits.current();
    };

    const ripple = (x: number, y: number, max = 60, a = 0.45) => {
      if (ripples.length > 40) ripples.shift();
      ripples.push({ x, y, r: 2, max, a });
    };

    /* ---------- drawing ---------- */

    const drawWater = () => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, c("water"));
      g.addColorStop(1, c("water-deep"));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      if (ritRef.current === "varsha") {
        ctx.fillStyle = c("ink", dark ? 0.15 : 0.06);
        ctx.fillRect(0, 0, W, H);
      }

      // Moon (night, or the Sharad full moon) or sun, reflected as a soft blur.
      const r = ritRef.current;
      if (r !== "varsha") {
        const mx = W * 0.78,
          my = H * 0.3;
        const big = dark || r === "sharad";
        const R = big ? 95 : 75;
        const tint = dark ? "255 244 214" : r === "grishma" ? "255 236 180" : "255 250 235";
        // A round gradient squashed into an ellipse, so the glow fades out
        // evenly instead of ending at a hard edge.
        ctx.save();
        ctx.translate(mx, my);
        ctx.scale(1, 0.4);
        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
        rg.addColorStop(0, `rgb(${tint} / ${dark ? 0.3 : 0.55})`);
        rg.addColorStop(0.5, `rgb(${tint} / ${dark ? 0.12 : 0.22})`);
        rg.addColorStop(1, `rgb(${tint} / 0)`);
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Slow light bands across the surface.
      ctx.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        const y0 = ((i + 0.5) / 7) * H;
        ctx.strokeStyle = dark ? "rgb(255 255 255 / 0.035)" : "rgb(255 255 255 / 0.28)";
        ctx.beginPath();
        for (let x = 0; x <= W; x += 16) {
          const y = y0 + Math.sin(x / 70 + t * 0.5 + i) * 3 + Math.sin(x / 23 - t * 0.8 + i * 2) * 1.2;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };

    const drawRipples = () => {
      for (const rp of ripples) {
        const k = 1 - rp.r / rp.max;
        ctx.strokeStyle = dark ? `rgb(255 255 255 / ${rp.a * k * 0.6})` : `rgb(255 255 255 / ${rp.a * k * 1.4})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (rp.r > 10) {
          ctx.strokeStyle = c("ink", rp.a * k * 0.12);
          ctx.beginPath();
          ctx.ellipse(rp.x, rp.y, rp.r * 0.6, rp.r * 0.25, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    };

    const drawPad = (p: Pad) => {
      const bob = Math.sin(t * 1.2 + p.phase) * 0.8;
      ctx.save();
      ctx.translate(p.x, p.y + bob);
      ctx.scale(1, 0.6);
      // Shadow on the water.
      ctx.fillStyle = c("shadow", dark ? 0.35 : 0.1);
      ctx.beginPath();
      ctx.arc(3, 7, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(p.rot);
      const g = ctx.createRadialGradient(-p.r * 0.2, -p.r * 0.2, 1, 0, 0, p.r);
      g.addColorStop(0, c("leaf", dark ? 0.85 : 0.95));
      g.addColorStop(1, c("leaf", dark ? 0.6 : 0.78));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, p.r, 0.22, Math.PI * 2 - 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = dark ? "rgb(0 0 0 / 0.25)" : "rgb(255 255 255 / 0.3)";
      ctx.lineWidth = 0.8;
      for (let a = 0.5; a < Math.PI * 2 - 0.2; a += 0.55) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * p.r * 0.88, Math.sin(a) * p.r * 0.88);
        ctx.stroke();
      }
      ctx.restore();

      if (p.flower > 0) {
        const s = p.r * 0.55 * p.flower;
        ctx.save();
        ctx.translate(p.x + p.r * 0.15, p.y + bob - 2);
        ctx.scale(1, 0.72);
        const ring = (n: number, len: number, wid: number, colour: string, off: number) => {
          ctx.fillStyle = colour;
          for (let i = 0; i < n; i++) {
            ctx.save();
            ctx.rotate(off + (i / n) * Math.PI * 2 + Math.sin(t * 0.6 + p.phase) * 0.03);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(wid, -len * 0.5, 0, -len);
            ctx.quadraticCurveTo(-wid, -len * 0.5, 0, 0);
            ctx.fill();
            ctx.restore();
          }
        };
        ring(8, s * 1.25, s * 0.42, `rgb(${LOTUS_OUTER} / ${dark ? 0.75 : 0.95})`, 0);
        ring(6, s * 0.9, s * 0.34, `rgb(${LOTUS_INNER} / ${dark ? 0.8 : 0.95})`, 0.3);
        ctx.fillStyle = c("haldi");
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    const drawBits = () => {
      const r = ritRef.current;
      for (const b of bits) {
        switch (r) {
          case "vasanta":
          case "shishira": {
            const fade = b.y >= b.land ? Math.max(0, 1 - b.life / 9) : 1;
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(b.rot);
            if (r === "vasanta") {
              ctx.fillStyle = b.kind < 0.6 ? `rgb(240 140 20 / ${0.9 * fade})` : `rgb(250 196 40 / ${0.9 * fade})`;
              ctx.beginPath();
              ctx.ellipse(0, 0, b.s, b.s * 0.55, 0, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.fillStyle = b.kind < 0.5 ? `rgb(170 110 50 / ${0.85 * fade})` : `rgb(120 140 70 / ${0.8 * fade})`;
              ctx.beginPath();
              ctx.moveTo(-b.s, 0);
              ctx.quadraticCurveTo(0, -b.s * 0.6, b.s, 0);
              ctx.quadraticCurveTo(0, b.s * 0.6, -b.s, 0);
              ctx.fill();
            }
            ctx.restore();
            break;
          }
          case "varsha": {
            ctx.strokeStyle = dark ? "rgb(200 220 240 / 0.35)" : "rgb(70 90 110 / 0.3)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(b.x + b.vx * 0.02, b.y - b.s);
            ctx.stroke();
            break;
          }
          case "sharad": {
            const a = 0.35 + 0.65 * Math.max(0, Math.sin(b.life * 2.2));
            const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.s * 6);
            g.addColorStop(0, `rgb(255 230 120 / ${a * (dark ? 0.9 : 0.75)})`);
            g.addColorStop(1, "rgb(255 230 120 / 0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.s * 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = dark ? `rgb(255 245 190 / ${a})` : `rgb(190 140 20 / ${a})`;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.s * 0.7, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case "grishma": {
            const a = Math.sin(Math.min(1, b.life) * Math.PI);
            ctx.strokeStyle = `rgb(255 255 240 / ${a * 0.9})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(b.x - b.s, b.y);
            ctx.lineTo(b.x + b.s, b.y);
            ctx.moveTo(b.x, b.y - b.s * 0.6);
            ctx.lineTo(b.x, b.y + b.s * 0.6);
            ctx.stroke();
            break;
          }
          case "hemanta": {
            const s = b.s;
            const flick = 1 + Math.sin(b.life * 13) * 0.08 + Math.sin(b.life * 7.3) * 0.06;
            const y = b.y + Math.sin(t + b.kind * 6) * 1.2;
            // Glow and its reflection.
            const g = ctx.createRadialGradient(b.x, y - 6 * s, 0, b.x, y - 6 * s, 44 * s * flick);
            g.addColorStop(0, `rgb(${col.glow} / ${dark ? 0.45 : 0.3})`);
            g.addColorStop(1, `rgb(${col.glow} / 0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(b.x, y - 6 * s, 44 * s * flick, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgb(${col.glow} / ${dark ? 0.22 : 0.15})`;
            ctx.beginPath();
            ctx.ellipse(b.x, y + 9 * s, 3 * s, 14 * s, 0, 0, Math.PI * 2);
            ctx.fill();
            // Clay bowl.
            ctx.fillStyle = "rgb(160 82 45)";
            ctx.beginPath();
            ctx.ellipse(b.x, y, 9 * s, 4.2 * s, 0, 0, Math.PI);
            ctx.fill();
            ctx.fillStyle = "rgb(196 110 62)";
            ctx.beginPath();
            ctx.ellipse(b.x, y, 9 * s, 2.4 * s, 0, 0, Math.PI * 2);
            ctx.fill();
            // Flame.
            const fh = 9 * s * flick;
            ctx.fillStyle = "rgb(255 170 40)";
            ctx.beginPath();
            ctx.moveTo(b.x + 3 * s, y - 1);
            ctx.quadraticCurveTo(b.x + 3.2 * s, y - fh * 0.6, b.x, y - fh);
            ctx.quadraticCurveTo(b.x - 3.2 * s, y - fh * 0.6, b.x - 3 * s, y - 1);
            ctx.fill();
            ctx.fillStyle = "rgb(255 240 190)";
            ctx.beginPath();
            ctx.ellipse(b.x, y - fh * 0.32, 1.3 * s, 2.6 * s, 0, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
        }
      }
      if (r === "shishira") {
        // Mist bands drifting across.
        for (let i = 0; i < 3; i++) {
          const y = H * (0.25 + i * 0.28);
          const x = ((t * (6 + i * 3) + i * 300) % (W + 400)) - 200;
          const g = ctx.createRadialGradient(x, y, 0, x, y, 220);
          g.addColorStop(0, dark ? "rgb(200 210 220 / 0.09)" : "rgb(255 255 255 / 0.5)");
          g.addColorStop(1, "rgb(255 255 255 / 0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(x, y, 260, 50, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    function draw() {
      ctx!.clearRect(0, 0, W, H);
      drawWater();
      drawRipples();
      for (const p of pads) drawPad(p);
      drawBits();
    }

    /* ---------- simulation ---------- */

    const step = (dt: number) => {
      t += dt;
      for (const rp of ripples) rp.r += dt * 38;
      ripples = ripples.filter((rp) => rp.r < rp.max);

      for (const p of pads) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt * 10;
        p.vx *= 0.995;
        p.vy *= 0.995;
        // Keep a gentle drift alive.
        if (Math.abs(p.vx) < 1.5) p.vx += Math.sign(p.vx || 1) * 0.02;
        const m = p.r;
        if (p.x < -m) p.x = W + m;
        if (p.x > W + m) p.x = -m;
        if (p.y < m * 0.6) p.vy = Math.abs(p.vy);
        if (p.y > H - m * 0.6) p.vy = -Math.abs(p.vy);
      }

      const r = ritRef.current;
      for (let i = 0; i < bits.length; i++) {
        const b = bits[i];
        switch (r) {
          case "vasanta":
          case "shishira":
            if (b.y < b.land) {
              b.x += (b.vx + Math.sin(t * 1.3 + b.kind * 9) * 10) * dt;
              b.y += b.vy * dt;
              b.rot += b.spin * dt * 2;
              if (b.y >= b.land) ripple(b.x, b.y, 22, 0.35);
            } else {
              b.x += 3 * dt;
              b.life += dt;
              if (b.life > 9) bits[i] = newBit(r);
            }
            break;
          case "varsha":
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            if (b.y >= b.land) {
              if (Math.random() < 0.5) ripple(b.x, b.land, rnd(14, 26), 0.4);
              bits[i] = newBit(r);
            }
            break;
          case "sharad":
            b.life += dt;
            b.vx += Math.sin(b.life * 0.9 + b.kind * 20) * 6 * dt;
            b.vy += Math.cos(b.life * 0.7 + b.kind * 11) * 6 * dt;
            b.vx = Math.max(-12, Math.min(12, b.vx));
            b.vy = Math.max(-9, Math.min(9, b.vy));
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            if (b.x < -10) b.x = W + 10;
            if (b.x > W + 10) b.x = -10;
            if (b.y < 5 || b.y > H - 5) b.vy = -b.vy;
            break;
          case "grishma":
            b.life += dt * 0.7;
            if (b.life > 1) bits[i] = newBit(r);
            break;
          case "hemanta":
            b.life += dt;
            b.x += b.vx * dt;
            if (b.x > W + 30) bits[i] = newBit(r);
            break;
        }
      }

      // Ambient drops so the water never goes fully still.
      spawnAcc += dt;
      if (spawnAcc > 2.2) {
        spawnAcc = 0;
        if (r !== "varsha") ripple(rnd(0, W), rnd(H * 0.2, H * 0.9), rnd(26, 46), 0.3);
      }
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      step(dt);
      draw();
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || reduce || !visible || document.hidden) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    /* ---------- input ---------- */

    const point = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onMove = (e: PointerEvent) => {
      if (reduce) return;
      const now = performance.now();
      if (now - lastMove < 110) return;
      lastMove = now;
      const { x, y } = point(e);
      ripple(x, y, 34, 0.35);
    };
    const onDown = (e: PointerEvent) => {
      const { x, y } = point(e);
      ripple(x, y, 90, 0.6);
      ripple(x, y, 55, 0.4);
      for (const p of pads) {
        const dx = p.x - x,
          dy = p.y - y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 160) {
          const f = (160 - d) / 160;
          p.vx += (dx / d) * 40 * f;
          p.vy += (dy / d) * 22 * f;
          p.spin += (Math.random() - 0.5) * 0.04 * f;
        }
      }
      if (reduce) draw();
    };

    readColours();
    resize();
    draw();
    start();

    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(box);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(box);
    const onVis = () => (document.hidden ? stop() : start());
    const onTheme = () => {
      readColours();
      draw();
    };
    const mq = matchMedia("(prefers-color-scheme: dark)");
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("themechange", onTheme);
    mq.addEventListener("change", onTheme);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("themechange", onTheme);
      mq.removeEventListener("change", onTheme);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return (
    <div className="pond" ref={wrap} data-rise="" style={{ animationDelay: "420ms" }}>
      <canvas ref={cv} role="img" aria-label="An animated lotus pond. Touch or click the water to make ripples." />
      <PondCaption />
    </div>
  );
}
