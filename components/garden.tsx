"use client";

import { useEffect, useRef } from "react";

/*
  Karesansui, a dry garden. Sand is raked in straight lines that turn into
  rings around a group of stones. Moving across it (or dragging on a phone)
  rakes new lines, which the wind slowly smooths back into the old pattern.
  A pine branch's shadow sways over the sand; at night a stone lantern is lit.

  Layers, back to front: raked sand (rendered once per size/theme, pixel by
  pixel), the visitor's rake strokes, the stones and lantern, the pine
  shadow. Only the last two composites run per frame, and not at all off
  screen, in a background tab, or with reduced motion.
*/

type Stone = { x: number; y: number; r: number; shape: number[]; tone: number };

const SQUASH = 0.62; // the garden is seen at an angle: circles become ellipses

export default function Garden() {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = cv.current!;
    const box = wrap.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sand = document.createElement("canvas");
    const rake = document.createElement("canvas");
    const stonesLayer = document.createElement("canvas");
    const pine = document.createElement("canvas");
    const rk = rake.getContext("2d")!;

    let W = 1,
      H = 1,
      dpr = 1,
      SP = 9; // groove spacing, CSS px
    let stones: Stone[] = [];
    let raf = 0,
      running = false,
      visible = true,
      t = 0,
      last = performance.now(),
      raked = 0; // seconds of rake strokes left to fade
    let prev: { x: number; y: number } | null = null;

    const col: Record<string, number[]> = {};
    let dark = false;
    const readColours = () => {
      const cs = getComputedStyle(document.documentElement);
      for (const k of ["sand", "sand-deep", "stone", "leaf", "shadow", "glow", "paper"]) {
        col[k] = (cs.getPropertyValue(`--${k}`).trim() || "0 0 0").split(/\s+/).map(Number);
      }
      const [r, g, b] = col.paper;
      dark = 0.299 * r + 0.587 * g + 0.114 * b < 128;
    };
    const rgb = (k: string, a = 1) => `rgb(${col[k].join(" ")} / ${a})`;

    // A fixed, asymmetric group: a tall pair on the left, one low stone right.
    const placeStones = () => {
      const u = Math.min(H, W * 0.42);
      const spec = [
        { fx: 0.2, fy: 0.58, fr: 0.13, tone: 0 },
        { fx: 0.3, fy: 0.4, fr: 0.07, tone: 1 },
        { fx: 0.66, fy: 0.62, fr: 0.1, tone: 2 },
      ];
      if (W > 640) spec.push({ fx: 0.73, fy: 0.42, fr: 0.045, tone: 1 });
      // Deterministic shapes, so a resize doesn't reshuffle the stones.
      let seed = 7;
      const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      stones = spec.map((s) => ({
        x: s.fx * W,
        y: s.fy * H,
        r: s.fr * u * 1.6,
        tone: s.tone,
        shape: Array.from({ length: 11 }, () => 0.78 + rand() * 0.3),
      }));
    };

    /* ---------- the raked sand, pixel by pixel ---------- */

    const renderSand = () => {
      const w = Math.round(W * dpr),
        h = Math.round(H * dpr);
      sand.width = w;
      sand.height = h;
      const sctx = sand.getContext("2d")!;
      const img = sctx.createImageData(w, h);
      const d = img.data;
      const [sr, sg, sb] = col.sand;
      const amp = dark ? 9 : 13;
      const ring = SP * 4.2;
      const k = (2 * Math.PI) / SP;
      for (let y = 0; y < h; y++) {
        const py = y / dpr;
        for (let x = 0; x < w; x++) {
          const px = x / dpr;
          let dmin = 1e9;
          for (const s of stones) {
            const dx = px - s.x,
              dy = (py - s.y) / SQUASH;
            const dd = Math.sqrt(dx * dx + dy * dy) - s.r;
            if (dd < dmin) dmin = dd;
          }
          // Rings hug the stones; elsewhere the lines run straight, with
          // the slight wander of a hand-held rake.
          const phase = dmin < ring ? dmin : py + Math.sin(px / 140) * 2.2 + Math.sin(px / 47) * 0.6;
          const g = Math.cos(phase * k);
          const v = g > 0 ? Math.pow(g, 0.55) : -Math.pow(-g, 0.55);
          const n = ((((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000) / 1000 - 0.5;
          const shade = v * amp + n * 10;
          const i = (y * w + x) * 4;
          d[i] = sr + shade;
          d[i + 1] = sg + shade;
          d[i + 2] = sb + shade * 0.9;
          d[i + 3] = 255;
        }
      }
      sctx.putImageData(img, 0, 0);
    };

    /* ---------- stones, moss and the lantern ---------- */

    const stonePath = (c: CanvasRenderingContext2D, s: Stone, grow = 1) => {
      c.beginPath();
      const n = s.shape.length;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = s.r * s.shape[i % n] * grow;
        const x = s.x + Math.cos(a) * r,
          y = s.y + Math.sin(a) * r * SQUASH - (Math.sin(a) < 0 ? s.r * 0.35 * -Math.sin(a) : 0);
        if (i === 0) c.moveTo(x, y);
        else {
          const pa = ((i - 0.5) / n) * Math.PI * 2;
          const pr = s.r * ((s.shape[(i - 1) % n] + s.shape[i % n]) / 2) * grow * 1.04;
          c.quadraticCurveTo(
            s.x + Math.cos(pa) * pr,
            s.y + Math.sin(pa) * pr * SQUASH - (Math.sin(pa) < 0 ? s.r * 0.35 * -Math.sin(pa) : 0),
            x,
            y,
          );
        }
      }
      c.closePath();
    };

    const renderStones = () => {
      stonesLayer.width = Math.round(W * dpr);
      stonesLayer.height = Math.round(H * dpr);
      const c = stonesLayer.getContext("2d")!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const tones = dark ? [0.85, 1, 0.75] : [0.82, 1, 0.9];
      for (const s of stones) {
        // Shadow, then a ring of moss, then the stone.
        c.save();
        c.filter = "blur(4px)";
        c.fillStyle = rgb("shadow", dark ? 0.45 : 0.18);
        c.beginPath();
        c.ellipse(s.x + s.r * 0.25, s.y + s.r * 0.3, s.r * 1.1, s.r * SQUASH * 0.9, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = rgb("leaf", dark ? 0.55 : 0.6);
        c.beginPath();
        c.ellipse(s.x, s.y + s.r * 0.12, s.r * 1.22, s.r * SQUASH * 1.05, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();

        const [r, g, b] = col.stone.map((v) => v * tones[s.tone]);
        const grad = c.createRadialGradient(s.x - s.r * 0.35, s.y - s.r * 0.55, s.r * 0.1, s.x, s.y, s.r * 1.3);
        grad.addColorStop(0, `rgb(${r * 1.35} ${g * 1.35} ${b * 1.35})`);
        grad.addColorStop(0.6, `rgb(${r} ${g} ${b})`);
        grad.addColorStop(1, `rgb(${r * 0.6} ${g * 0.6} ${b * 0.6})`);
        c.fillStyle = grad;
        stonePath(c, s);
        c.fill();
        // Weathering: a few faint strata lines across the face.
        c.save();
        stonePath(c, s);
        c.clip();
        c.strokeStyle = dark ? "rgb(255 255 255 / 0.06)" : "rgb(0 0 0 / 0.08)";
        c.lineWidth = 1;
        for (let i = -2; i <= 2; i++) {
          c.beginPath();
          c.moveTo(s.x - s.r * 1.2, s.y + i * s.r * 0.22 - s.r * 0.2);
          c.quadraticCurveTo(s.x, s.y + i * s.r * 0.22 - s.r * 0.35, s.x + s.r * 1.2, s.y + i * s.r * 0.22 - s.r * 0.1);
          c.stroke();
        }
        c.restore();
      }
      drawLantern(c);
    };

    // Ishidōrō: a small stone lantern at the garden's edge, lit at night.
    const drawLantern = (c: CanvasRenderingContext2D) => {
      const s = Math.min(1, H / 260) * (W < 520 ? 0.8 : 1);
      const x = W * (W < 520 ? 0.88 : 0.9),
        base = H * 0.86;
      if (dark) {
        const g = c.createRadialGradient(x, base - 40 * s, 0, x, base - 40 * s, 120 * s);
        g.addColorStop(0, rgb("glow", 0.35));
        g.addColorStop(1, rgb("glow", 0));
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, base - 40 * s, 120 * s, 0, Math.PI * 2);
        c.fill();
      }
      const [r, g, b] = col.stone;
      const stoneC = `rgb(${r * 0.95} ${g * 0.95} ${b * 0.95})`;
      const edge = `rgb(${r * 0.7} ${g * 0.7} ${b * 0.7})`;
      c.fillStyle = rgb("shadow", dark ? 0.4 : 0.15);
      c.beginPath();
      c.ellipse(x + 8 * s, base + 2 * s, 22 * s, 6 * s, 0, 0, Math.PI * 2);
      c.fill();
      const box = (bx: number, by: number, bw: number, bh: number) => {
        c.fillStyle = stoneC;
        c.fillRect(bx - bw / 2, by, bw, bh);
        c.fillStyle = edge;
        c.fillRect(bx + bw / 2 - bw * 0.18, by, bw * 0.18, bh);
      };
      box(x, base - 8 * s, 30 * s, 8 * s); // base
      box(x, base - 34 * s, 9 * s, 26 * s); // pillar
      box(x, base - 40 * s, 24 * s, 6 * s); // platform
      box(x, base - 56 * s, 18 * s, 16 * s); // fire box
      c.fillStyle = dark ? rgb("glow", 0.95) : "rgb(40 40 44 / 0.55)";
      c.fillRect(x - 5 * s, base - 52 * s, 10 * s, 9 * s); // window
      c.fillStyle = stoneC;
      c.beginPath(); // roof
      c.moveTo(x - 20 * s, base - 56 * s);
      c.quadraticCurveTo(x, base - 60 * s, x + 20 * s, base - 56 * s);
      c.lineTo(x + 7 * s, base - 66 * s);
      c.lineTo(x - 7 * s, base - 66 * s);
      c.closePath();
      c.fill();
      c.beginPath(); // finial
      c.arc(x, base - 69 * s, 3.2 * s, 0, Math.PI * 2);
      c.fill();
    };

    /* ---------- the pine shadow ---------- */

    const renderPine = () => {
      // Drawn sharp on a scratch canvas, then blurred once onto the layer.
      const sharp = document.createElement("canvas");
      sharp.width = pine.width = Math.round(W * dpr);
      sharp.height = pine.height = Math.round(H * dpr);
      const c = sharp.getContext("2d")!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.strokeStyle = "#000";
      c.fillStyle = "#000";
      c.lineCap = "round";
      const reach = Math.min(W * 0.45, 380);
      // Main limb from beyond the top-right corner.
      const P = (u: number) => ({
        x: W + 10 - reach * u,
        y: -10 + H * 0.32 * u - Math.sin(u * Math.PI) * H * 0.08,
      });
      c.lineWidth = 7;
      c.beginPath();
      for (let i = 0; i <= 20; i++) {
        const p = P(i / 20);
        if (i) c.lineTo(p.x, p.y);
        else c.moveTo(p.x, p.y);
      }
      c.stroke();
      // Needle pads along it, the cloud-like shapes of a pruned pine.
      let seed = 3;
      const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (const u of [0.32, 0.55, 0.78, 0.98]) {
        const p = P(u);
        const n = 46;
        c.lineWidth = 1.3;
        for (let i = 0; i < n; i++) {
          const a = Math.PI * (0.05 + 0.9 * (i / n)) + (rand() - 0.5) * 0.2;
          const len = 20 + rand() * 16;
          c.beginPath();
          c.moveTo(p.x, p.y + 4);
          c.lineTo(p.x + Math.cos(a) * len * 1.5, p.y + 4 + Math.sin(a) * len * 0.7);
          c.stroke();
        }
      }
      const pc = pine.getContext("2d")!;
      pc.filter = `blur(${1.5 * dpr}px)`;
      pc.drawImage(sharp, 0, 0);
    };

    /* ---------- raking ---------- */

    const stroke = (x0: number, y0: number, x1: number, y1: number) => {
      const dx = x1 - x0,
        dy = y1 - y0;
      const len = Math.hypot(dx, dy);
      if (len < 0.5) return;
      const nx = -dy / len,
        ny = dx / len;
      const tines = 5;
      // Smooth the sand under the rake, then cut the new grooves.
      rk.globalCompositeOperation = "source-over";
      rk.lineCap = "butt";
      rk.strokeStyle = rgb("sand");
      rk.lineWidth = SP * tines;
      rk.beginPath();
      rk.moveTo(x0, y0);
      rk.lineTo(x1, y1);
      rk.stroke();
      rk.lineCap = "round";
      for (let i = 0; i < tines; i++) {
        const off = (i - (tines - 1) / 2) * SP;
        rk.strokeStyle = rgb("sand-deep", 0.95);
        rk.lineWidth = SP * 0.42;
        rk.beginPath();
        rk.moveTo(x0 + nx * off, y0 + ny * off);
        rk.lineTo(x1 + nx * off, y1 + ny * off);
        rk.stroke();
        const hi = off + SP * 0.45;
        rk.strokeStyle = dark ? "rgb(255 255 255 / 0.10)" : "rgb(255 255 255 / 0.55)";
        rk.lineWidth = SP * 0.24;
        rk.beginPath();
        rk.moveTo(x0 + nx * hi, y0 + ny * hi);
        rk.lineTo(x1 + nx * hi, y1 + ny * hi);
        rk.stroke();
      }
      raked = 20;
    };

    /* ---------- frame ---------- */

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(sand, 0, 0);
      ctx.drawImage(rake, 0, 0);
      ctx.drawImage(stonesLayer, 0, 0);
      // The pine sways around a pivot beyond the top-right corner.
      ctx.save();
      const px = (W + 40) * dpr,
        py = -40 * dpr;
      ctx.translate(px, py);
      ctx.rotate(Math.sin(t * 0.45) * 0.018 + Math.sin(t * 1.3) * 0.005);
      ctx.translate(-px, -py);
      ctx.globalAlpha = dark ? 0.32 : 0.11;
      ctx.drawImage(pine, 0, 0);
      ctx.restore();
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      if (raked > 0) {
        // Wind smooths the visitor's lines back into the garden's own.
        raked -= dt;
        rk.globalCompositeOperation = "destination-out";
        rk.fillStyle = `rgb(0 0 0 / ${Math.min(1, dt * 0.18)})`;
        rk.fillRect(0, 0, W, H);
        if (raked <= 0) rk.clearRect(0, 0, W, H);
      }
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

    const build = () => {
      const rect = box.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
      SP = W < 520 ? 7.5 : 9;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      rake.width = canvas.width;
      rake.height = canvas.height;
      rk.setTransform(dpr, 0, 0, dpr, 0, 0);
      raked = 0;
      placeStones();
      renderSand();
      renderStones();
      renderPine();
      draw();
    };

    /* ---------- input ---------- */

    const at = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.buttons === 0) return;
      const p = at(e);
      if (prev && Math.hypot(p.x - prev.x, p.y - prev.y) < 3) return;
      if (prev) stroke(prev.x, prev.y, p.x, p.y);
      prev = p;
      if (!running) draw();
    };
    const lift = () => {
      prev = null;
    };

    readColours();
    build();
    start();

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 120);
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
      build();
    };
    const mq = matchMedia("(prefers-color-scheme: dark)");
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("themechange", onTheme);
    mq.addEventListener("change", onTheme);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", lift);
    canvas.addEventListener("pointerup", lift);
    canvas.addEventListener("pointercancel", lift);

    return () => {
      stop();
      clearTimeout(resizeTimer);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("themechange", onTheme);
      mq.removeEventListener("change", onTheme);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", lift);
      canvas.removeEventListener("pointerup", lift);
      canvas.removeEventListener("pointercancel", lift);
    };
  }, []);

  return (
    <div className="garden" ref={wrap} data-rise="" style={{ animationDelay: "420ms" }}>
      <canvas ref={cv} role="img" aria-label="A raked zen garden with stones and a stone lantern. Move across the sand to rake it." />
      <div className="garden-caption">
        <b lang="ja">枯山水</b>
        <span>Karesansui</span>
        <span className="hint">· move across the sand to rake it</span>
      </div>
    </div>
  );
}
