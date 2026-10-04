"use client";

import { useEffect, useRef, useState } from "react";
import { sound } from "@/lib/sound";

/*
  Karesansui, a dry garden you can play in.

  Tools: rake lines (熊手), stamp raked rings around a pebble (輪), place,
  lift or drag stones (石; the sand re-rakes itself around them), scatter
  momiji leaves that the wind pushes about (葉), and sweep it all smooth (掃).
  A calico cat wanders through now and then, leaving paw prints; tap it and
  it meows and runs. The shishi-odoshi fills and knocks; tap it to tip it.
  Tap the stone lantern to light it. Sound (音) is off until turned on.

  Layers, back to front: raked sand (rendered per pixel only when stones
  move or the size/theme changes), the visitor's marks, stones and the
  lantern, then everything that moves. The loop pauses off screen and in
  background tabs; with reduced motion nothing animates on its own.
*/

type Tool = "rake" | "ring" | "stone" | "leaf";
type Stone = { fx: number; fy: number; fr: number; shape: number[]; tone: number };
type Leaf = { x: number; y: number; z: number; vx: number; vy: number; vz: number; rot: number; spin: number; s: number; c: number; age: number };
type Ring = { x: number; y: number; t: number; max: number };
type Drop = { x: number; y: number; vx: number; vy: number; floor: number };
type Cat = { x: number; y: number; dir: 1 | -1; state: "walk" | "sit" | "run"; t: number; phase: number; hop: number; sitAt: number; printAcc: number; foot: number };

const SQUASH = 0.62; // the garden is seen at an angle: circles become ellipses
const TOOLS: { id: Tool; kanji: string; label: string; hint: string }[] = [
  { id: "rake", kanji: "熊手", label: "Rake", hint: "drag across the sand to rake it" },
  { id: "ring", kanji: "輪", label: "Rings", hint: "tap the sand to rake rings round a pebble" },
  { id: "stone", kanji: "石", label: "Stones", hint: "tap to set a stone, tap one to lift it, drag to move" },
  { id: "leaf", kanji: "葉", label: "Leaves", hint: "tap or drag to scatter momiji" },
];

export default function Garden() {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("rake");
  const [soundOn, setSoundOn] = useState(false);
  const toolRef = useRef<Tool>("rake");
  const api = useRef<{ sweep: () => void }>({ sweep: () => {} });

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  useEffect(() => {
    try {
      if (localStorage.getItem("garden-sound") === "on") {
        setSoundOn(true);
        sound.set(true); // the audio itself starts on the first tap in the garden
      }
    } catch {}
  }, []);
  const toggleSound = () => {
    const on = !soundOn;
    setSoundOn(on);
    sound.set(on);
    try {
      localStorage.setItem("garden-sound", on ? "on" : "off");
    } catch {}
    if (on) sound.knock();
  };

  useEffect(() => {
    const canvas = cv.current!;
    const box = wrap.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sand = document.createElement("canvas");
    const marks = document.createElement("canvas");
    const stonesLayer = document.createElement("canvas");
    const pine = document.createElement("canvas");
    const mk = marks.getContext("2d")!;

    let W = 1,
      H = 1,
      dpr = 1,
      SP = 9, // groove spacing, CSS px
      S = 1; // scale for props (lantern, shishi-odoshi, cat)
    let raf = 0,
      running = false,
      visible = true,
      t = 0,
      last = performance.now();

    let stones: Stone[] = [];
    let leaves: Leaf[] = [];
    let rings: Ring[] = [];
    let drops: Drop[] = [];
    let cat: Cat | null = null;
    let catTimer = 4;
    let lanternLit: boolean | null = null; // null: follow the theme
    let sweepX = -1;
    let gust = 0,
      gustTimer = 6;
    // Shishi-odoshi: fill 0..1, angle of the tube, tipping phase.
    const shishi = { fill: 0.4, angle: -0.42, phase: "fill" as "fill" | "tip" | "back", pt: 0, dripT: 0, splashed: false, wobble: 0 };

    let pointer: { x: number; y: number } | null = null;
    let drag: { stone: Stone; dx: number; dy: number; moved: boolean; x0: number; y0: number } | null = null;
    let leafT = 0;

    const col: Record<string, number[]> = {};
    let dark = false;
    const readColours = () => {
      const cs = getComputedStyle(document.documentElement);
      for (const k of ["sand", "sand-deep", "stone", "leaf", "shadow", "glow", "paper", "ink"]) {
        col[k] = (cs.getPropertyValue(`--${k}`).trim() || "0 0 0").split(/\s+/).map(Number);
      }
      const [r, g, b] = col.paper;
      dark = 0.299 * r + 0.587 * g + 0.114 * b < 128;
    };
    const rgb = (k: string, a = 1) => `rgb(${col[k].join(" ")} / ${a})`;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const lit = () => (lanternLit === null ? dark : lanternLit);

    /* ---------- geometry ---------- */

    const unit = () => Math.min(H, W * 0.42);
    const sx = (s: Stone) => s.fx * W;
    const sy = (s: Stone) => s.fy * H;
    const sr = (s: Stone) => s.fr * unit() * 1.6;
    const shape = () => Array.from({ length: 11 }, () => 0.78 + Math.random() * 0.3);

    const initStones = () => {
      let seed = 7;
      const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const spec = [
        { fx: 0.33, fy: 0.55, fr: 0.12, tone: 0 },
        { fx: 0.42, fy: 0.36, fr: 0.065, tone: 1 },
        { fx: 0.66, fy: 0.62, fr: 0.095, tone: 2 },
        { fx: 0.74, fy: 0.38, fr: 0.045, tone: 1 },
      ];
      stones = spec.map((s) => ({ ...s, shape: Array.from({ length: 11 }, () => 0.78 + rand() * 0.3) }));
    };

    // Props are placed relative to the garden's corners.
    const lanternPos = () => ({ x: W - 46 * S, base: H - 22 * S });
    const shishiPivot = () => ({ x: 52 * S, y: H - 58 * S });

    /* ---------- the raked sand, pixel by pixel ---------- */

    const renderSand = (scale = 1) => {
      const w = Math.max(1, Math.round(W * dpr * scale)),
        h = Math.max(1, Math.round(H * dpr * scale));
      sand.width = w;
      sand.height = h;
      const sctx = sand.getContext("2d")!;
      const img = sctx.createImageData(w, h);
      const d = img.data;
      const [r0, g0, b0] = col.sand;
      const amp = dark ? 9 : 13;
      const ring = SP * 4.2;
      const k = (2 * Math.PI) / SP;
      const st = stones.map((s) => ({ x: sx(s), y: sy(s), r: sr(s) }));
      const px2css = 1 / (dpr * scale);
      for (let y = 0; y < h; y++) {
        const py = y * px2css;
        for (let x = 0; x < w; x++) {
          const px = x * px2css;
          let dmin = 1e9;
          for (const s of st) {
            const dx = px - s.x,
              dy = (py - s.y) / SQUASH;
            const dd = Math.sqrt(dx * dx + dy * dy) - s.r;
            if (dd < dmin) dmin = dd;
          }
          const phase = dmin < ring ? dmin : py + Math.sin(px / 140) * 2.2 + Math.sin(px / 47) * 0.6;
          const g = Math.cos(phase * k);
          const v = g > 0 ? Math.pow(g, 0.55) : -Math.pow(-g, 0.55);
          const n = ((((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000) / 1000 - 0.5;
          const shade = v * amp + n * 10;
          const i = (y * w + x) * 4;
          d[i] = r0 + shade;
          d[i + 1] = g0 + shade;
          d[i + 2] = b0 + shade * 0.9;
          d[i + 3] = 255;
        }
      }
      sctx.putImageData(img, 0, 0);
    };

    /* ---------- stones and the lantern (static layer) ---------- */

    const stonePath = (c: CanvasRenderingContext2D, x: number, y: number, r: number, sh: number[]) => {
      const n = sh.length;
      const pt = (a: number, m: number) => {
        const lift = Math.sin(a) < 0 ? r * 0.35 * -Math.sin(a) : 0;
        return [x + Math.cos(a) * r * m, y + Math.sin(a) * r * m * SQUASH - lift];
      };
      c.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const [px, py] = pt(a, sh[i % n]);
        if (i === 0) c.moveTo(px, py);
        else {
          const pa = ((i - 0.5) / n) * Math.PI * 2;
          const [cx, cy] = pt(pa, ((sh[(i - 1) % n] + sh[i % n]) / 2) * 1.04);
          c.quadraticCurveTo(cx, cy, px, py);
        }
      }
      c.closePath();
    };

    const drawStone = (c: CanvasRenderingContext2D, s: Stone, lifted = 0) => {
      const x = sx(s),
        y = sy(s) - lifted,
        r = sr(s);
      const tones = dark ? [0.85, 1, 0.75] : [0.82, 1, 0.9];
      c.save();
      c.filter = "blur(4px)";
      c.fillStyle = rgb("shadow", (dark ? 0.45 : 0.18) * (lifted ? 0.6 : 1));
      c.beginPath();
      c.ellipse(x + r * 0.25 + lifted * 0.3, sy(s) + r * 0.3, r * 1.1, r * SQUASH * 0.9, 0, 0, Math.PI * 2);
      c.fill();
      if (!lifted) {
        c.fillStyle = rgb("leaf", dark ? 0.55 : 0.6);
        c.beginPath();
        c.ellipse(x, y + r * 0.12, r * 1.22, r * SQUASH * 1.05, 0, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
      const [cr, cg, cb] = col.stone.map((v) => v * tones[s.tone]);
      const grad = c.createRadialGradient(x - r * 0.35, y - r * 0.55, r * 0.1, x, y, r * 1.3);
      grad.addColorStop(0, `rgb(${cr * 1.35} ${cg * 1.35} ${cb * 1.35})`);
      grad.addColorStop(0.6, `rgb(${cr} ${cg} ${cb})`);
      grad.addColorStop(1, `rgb(${cr * 0.6} ${cg * 0.6} ${cb * 0.6})`);
      c.fillStyle = grad;
      stonePath(c, x, y, r, s.shape);
      c.fill();
      c.save();
      stonePath(c, x, y, r, s.shape);
      c.clip();
      c.strokeStyle = dark ? "rgb(255 255 255 / 0.06)" : "rgb(0 0 0 / 0.08)";
      c.lineWidth = 1;
      for (let i = -2; i <= 2; i++) {
        c.beginPath();
        c.moveTo(x - r * 1.2, y + i * r * 0.22 - r * 0.2);
        c.quadraticCurveTo(x, y + i * r * 0.22 - r * 0.35, x + r * 1.2, y + i * r * 0.22 - r * 0.1);
        c.stroke();
      }
      c.restore();
    };

    const drawLanternBody = (c: CanvasRenderingContext2D) => {
      const { x, base } = lanternPos();
      const s = S;
      const [r, g, b] = col.stone;
      const stoneC = `rgb(${r * 0.95} ${g * 0.95} ${b * 0.95})`;
      const edge = `rgb(${r * 0.7} ${g * 0.7} ${b * 0.7})`;
      c.fillStyle = rgb("shadow", dark ? 0.4 : 0.15);
      c.beginPath();
      c.ellipse(x + 8 * s, base + 2 * s, 22 * s, 6 * s, 0, 0, Math.PI * 2);
      c.fill();
      const blk = (bx: number, by: number, bw: number, bh: number) => {
        c.fillStyle = stoneC;
        c.fillRect(bx - bw / 2, by, bw, bh);
        c.fillStyle = edge;
        c.fillRect(bx + bw / 2 - bw * 0.18, by, bw * 0.18, bh);
      };
      blk(x, base - 8 * s, 30 * s, 8 * s);
      blk(x, base - 34 * s, 9 * s, 26 * s);
      blk(x, base - 40 * s, 24 * s, 6 * s);
      blk(x, base - 56 * s, 18 * s, 16 * s);
      c.fillStyle = stoneC;
      c.beginPath();
      c.moveTo(x - 20 * s, base - 56 * s);
      c.quadraticCurveTo(x, base - 60 * s, x + 20 * s, base - 56 * s);
      c.lineTo(x + 7 * s, base - 66 * s);
      c.lineTo(x - 7 * s, base - 66 * s);
      c.closePath();
      c.fill();
      c.beginPath();
      c.arc(x, base - 69 * s, 3.2 * s, 0, Math.PI * 2);
      c.fill();
    };

    const renderStones = () => {
      stonesLayer.width = Math.round(W * dpr);
      stonesLayer.height = Math.round(H * dpr);
      const c = stonesLayer.getContext("2d")!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const s of stones) if (s !== drag?.stone) drawStone(c, s);
      drawLanternBody(c);
    };

    /* ---------- the pine shadow ---------- */

    const renderPine = () => {
      const sharp = document.createElement("canvas");
      sharp.width = pine.width = Math.round(W * dpr);
      sharp.height = pine.height = Math.round(H * dpr);
      const c = sharp.getContext("2d")!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.strokeStyle = "#000";
      c.lineCap = "round";
      const reach = Math.min(W * 0.45, 380);
      const P = (u: number) => ({ x: W + 10 - reach * u, y: -10 + H * 0.3 * u - Math.sin(u * Math.PI) * H * 0.08 });
      c.lineWidth = 7;
      c.beginPath();
      for (let i = 0; i <= 20; i++) {
        const p = P(i / 20);
        if (i) c.lineTo(p.x, p.y);
        else c.moveTo(p.x, p.y);
      }
      c.stroke();
      let seed = 3;
      const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (const u of [0.32, 0.55, 0.78, 0.98]) {
        const p = P(u);
        c.lineWidth = 1.3;
        for (let i = 0; i < 46; i++) {
          const a = Math.PI * (0.05 + 0.9 * (i / 46)) + (rand() - 0.5) * 0.2;
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

    /* ---------- marks in the sand ---------- */

    const rakeStroke = (x0: number, y0: number, x1: number, y1: number) => {
      const dx = x1 - x0,
        dy = y1 - y0;
      const len = Math.hypot(dx, dy);
      if (len < 0.5) return;
      const nx = -dy / len,
        ny = dx / len;
      const tines = 5;
      mk.globalCompositeOperation = "source-over";
      mk.lineCap = "butt";
      mk.strokeStyle = rgb("sand");
      mk.lineWidth = SP * tines;
      mk.beginPath();
      mk.moveTo(x0, y0);
      mk.lineTo(x1, y1);
      mk.stroke();
      mk.lineCap = "round";
      for (let i = 0; i < tines; i++) {
        const off = (i - (tines - 1) / 2) * SP;
        groove(mk, x0 + nx * off, y0 + ny * off, x1 + nx * off, y1 + ny * off, nx, ny);
      }
      sound.swish(len);
    };

    const groove = (c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, nx: number, ny: number) => {
      c.strokeStyle = rgb("sand-deep", 0.95);
      c.lineWidth = SP * 0.42;
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
      c.stroke();
      const hi = SP * 0.45;
      c.strokeStyle = dark ? "rgb(255 255 255 / 0.10)" : "rgb(255 255 255 / 0.55)";
      c.lineWidth = SP * 0.24;
      c.beginPath();
      c.moveTo(x0 + nx * hi, y0 + ny * hi);
      c.lineTo(x1 + nx * hi, y1 + ny * hi);
      c.stroke();
    };

    // Raked rings round a pebble, drawn up to radius R.
    const ringMarks = (c: CanvasRenderingContext2D, x: number, y: number, R: number) => {
      c.fillStyle = rgb("sand");
      c.beginPath();
      c.ellipse(x, y, R + SP * 0.5, (R + SP * 0.5) * SQUASH, 0, 0, Math.PI * 2);
      c.fill();
      for (let r = SP * 1.2; r <= R; r += SP) {
        c.strokeStyle = rgb("sand-deep", 0.95);
        c.lineWidth = SP * 0.42;
        c.beginPath();
        c.ellipse(x, y, r, r * SQUASH, 0, 0, Math.PI * 2);
        c.stroke();
        c.strokeStyle = dark ? "rgb(255 255 255 / 0.10)" : "rgb(255 255 255 / 0.55)";
        c.lineWidth = SP * 0.24;
        c.beginPath();
        c.ellipse(x, y + SP * 0.3, r + SP * 0.4, (r + SP * 0.4) * SQUASH, 0, Math.PI * 0.05, Math.PI * 0.95);
        c.stroke();
      }
      // The pebble.
      const pr = SP * 0.75;
      const g = c.createRadialGradient(x - pr * 0.3, y - pr * 0.4, 0, x, y, pr * 1.2);
      g.addColorStop(0, dark ? "rgb(210 212 220)" : "rgb(250 250 246)");
      g.addColorStop(1, dark ? "rgb(120 124 136)" : "rgb(170 168 160)");
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(x, y, pr, pr * 0.75, 0, 0, Math.PI * 2);
      c.fill();
    };

    const pawPrint = (x: number, y: number) => {
      const s = S * 0.9;
      mk.globalCompositeOperation = "source-over";
      mk.fillStyle = rgb("sand-deep", 0.85);
      mk.beginPath();
      mk.ellipse(x, y, 2.6 * s, 2 * s, 0, 0, Math.PI * 2);
      mk.fill();
      for (const [dx, dy] of [
        [-2.6, -2.8],
        [0, -3.6],
        [2.6, -2.8],
      ]) {
        mk.beginPath();
        mk.ellipse(x + dx * s, y + dy * s, 1 * s, 0.9 * s, 0, 0, Math.PI * 2);
        mk.fill();
      }
    };

    /* ---------- leaves ---------- */

    const LEAF_COLOURS = ["206 52 34", "232 108 32", "228 168 40", "190 40 50"];
    const addLeaf = (x: number, y: number) => {
      if (leaves.length > 90) leaves.shift();
      leaves.push({
        x: x + rnd(-14, 14),
        y: y + rnd(-6, 10),
        z: reduce ? 0 : rnd(30, 80),
        vx: rnd(-20, 20),
        vy: rnd(-4, 4),
        vz: 0,
        rot: rnd(0, 6.28),
        spin: rnd(-3, 3),
        s: rnd(4.5, 7) * Math.min(1.1, S + 0.1),
        c: Math.floor(Math.random() * LEAF_COLOURS.length),
        age: 0,
      });
    };
    const maple = (c: CanvasRenderingContext2D, s: number) => {
      c.beginPath();
      for (let i = 0; i <= 50; i++) {
        const th = (i / 50) * Math.PI * 2;
        const r = s * (0.45 + 0.55 * Math.pow(Math.abs(Math.cos(2.5 * th)), 0.6));
        const x = Math.cos(th - Math.PI / 2) * r,
          y = Math.sin(th - Math.PI / 2) * r;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
      c.fill();
    };

    /* ---------- the cat (a calico, mike-neko) ---------- */

    const spawnCat = () => {
      const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      cat = {
        x: dir > 0 ? -40 * S : W + 40 * S,
        y: rnd(H * 0.5, H * 0.82),
        dir,
        state: "walk",
        t: 0,
        phase: 0,
        hop: 0,
        sitAt: Math.random() < 0.6 ? rnd(W * 0.3, W * 0.7) : -1,
        printAcc: 0,
        foot: 0,
      };
    };

    const startle = () => {
      if (!cat || cat.state === "run") return;
      cat.state = "run";
      cat.t = 0;
      cat.hop = 1;
      sound.meow();
    };

    const drawCat = (c: CanvasRenderingContext2D, k: Cat) => {
      const s = S * 1.05;
      const d = k.dir;
      const hopY = k.hop > 0 ? Math.sin((1 - k.hop) * Math.PI) * 16 * s : 0;
      const x = k.x,
        y = k.y - hopY;
      const white = "rgb(250 247 240)",
        orange = "rgb(226 134 56)",
        black = "rgb(40 36 36)",
        line = "rgb(40 36 40 / 0.55)";
      c.save();
      // Shadow on the sand.
      c.fillStyle = rgb("shadow", dark ? 0.4 : 0.16);
      c.beginPath();
      c.ellipse(k.x, k.y + 1, 18 * s * (1 - hopY / (60 * s)), 4 * s, 0, 0, Math.PI * 2);
      c.fill();
      c.lineCap = "round";
      if (k.state === "sit") {
        // Sitting, side on, tail curled round, swishing.
        c.strokeStyle = orange;
        c.lineWidth = 3.2 * s;
        const sw = Math.sin(t * 3) * 4 * s;
        c.beginPath();
        c.moveTo(x - d * 6 * s, y - 2 * s);
        c.quadraticCurveTo(x - d * 18 * s, y - 2 * s + sw * 0.3, x - d * 16 * s, y - 12 * s + sw);
        c.stroke();
        c.fillStyle = white;
        c.strokeStyle = line;
        c.lineWidth = 1;
        c.beginPath();
        c.ellipse(x, y - 11 * s, 9 * s, 12 * s, d * 0.15, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.fillStyle = orange;
        c.beginPath();
        c.ellipse(x - d * 4 * s, y - 14 * s, 5 * s, 6 * s, 0, 0, Math.PI * 2);
        c.fill();
        drawHead(c, x + d * 4 * s, y - 25 * s, s, d, white, orange, black, line);
      } else {
        const gait = k.state === "run" ? 1.4 : 1;
        c.strokeStyle = white;
        c.lineWidth = 2.6 * s;
        const legs = [
          [9, 0],
          [6, Math.PI],
          [-9, Math.PI],
          [-12, 0],
        ];
        for (const [lx, off] of legs) {
          const a = Math.sin(k.phase + off) * 0.45 * gait;
          c.strokeStyle = line;
          c.lineWidth = 3.6 * s;
          c.beginPath();
          c.moveTo(x + d * lx * s, y - 9 * s);
          c.lineTo(x + d * lx * s + Math.sin(a) * 8 * s * d, y - 9 * s + Math.cos(a) * 9 * s);
          c.stroke();
          c.strokeStyle = white;
          c.lineWidth = 2.4 * s;
          c.stroke();
        }
        // Tail up, with a little curl.
        c.strokeStyle = black;
        c.lineWidth = 3 * s;
        const sw = Math.sin(k.phase * 0.5) * 3 * s;
        c.beginPath();
        c.moveTo(x - d * 14 * s, y - 15 * s);
        c.quadraticCurveTo(x - d * 22 * s, y - 22 * s, x - d * 19 * s + sw, y - 32 * s);
        c.stroke();
        // Body with calico patches.
        c.save();
        c.beginPath();
        c.ellipse(x, y - 14 * s, 17 * s, 7.5 * s, 0, 0, Math.PI * 2);
        c.fillStyle = white;
        c.fill();
        c.strokeStyle = line;
        c.lineWidth = 1;
        c.stroke();
        c.clip();
        c.fillStyle = orange;
        c.beginPath();
        c.ellipse(x - d * 6 * s, y - 19 * s, 8 * s, 6 * s, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = black;
        c.beginPath();
        c.ellipse(x + d * 6 * s, y - 20 * s, 5 * s, 4 * s, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
        drawHead(c, x + d * 18 * s, y - 19 * s, s, d, white, orange, black, line);
      }
      c.restore();
    };

    const drawHead = (c: CanvasRenderingContext2D, hx: number, hy: number, s: number, d: number, white: string, orange: string, black: string, line: string) => {
      // Ears.
      c.fillStyle = orange;
      c.beginPath();
      c.moveTo(hx - 5.5 * s, hy - 3 * s);
      c.lineTo(hx - 4 * s, hy - 10.5 * s);
      c.lineTo(hx - 0.5 * s, hy - 5 * s);
      c.fill();
      c.fillStyle = black;
      c.beginPath();
      c.moveTo(hx + 5.5 * s, hy - 3 * s);
      c.lineTo(hx + 4 * s, hy - 10.5 * s);
      c.lineTo(hx + 0.5 * s, hy - 5 * s);
      c.fill();
      c.fillStyle = white;
      c.strokeStyle = line;
      c.lineWidth = 1;
      c.beginPath();
      c.ellipse(hx, hy, 7 * s, 6.2 * s, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = orange;
      c.beginPath();
      c.ellipse(hx - 3.2 * s, hy - 2.4 * s, 3.4 * s, 3 * s, 0, 0, Math.PI * 2);
      c.fill();
      // Eyes and nose, looking the way it walks.
      c.fillStyle = black;
      for (const ex of [-2.3, 2.3]) {
        c.beginPath();
        c.ellipse(hx + ex * s + d * 1.2 * s, hy - 0.5 * s, 0.9 * s, 1.3 * s, 0, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = "rgb(230 120 130)";
      c.beginPath();
      c.arc(hx + d * 1.4 * s, hy + 2 * s, 0.9 * s, 0, Math.PI * 2);
      c.fill();
    };

    /* ---------- shishi-odoshi ---------- */

    const drawShishi = (c: CanvasRenderingContext2D) => {
      const s = S;
      const p = shishiPivot();
      const bamboo = dark ? "rgb(110 140 70)" : "rgb(132 160 74)";
      const bambooDark = dark ? "rgb(76 100 46)" : "rgb(96 122 52)";
      // Basin of water under the mouth.
      const bx = p.x + 40 * s,
        by = p.y + 44 * s;
      c.fillStyle = rgb("shadow", dark ? 0.4 : 0.15);
      c.beginPath();
      c.ellipse(bx + 4 * s, by + 6 * s, 30 * s, 8 * s, 0, 0, Math.PI * 2);
      c.fill();
      const [r, g, b] = col.stone;
      c.fillStyle = `rgb(${r * 0.9} ${g * 0.9} ${b * 0.9})`;
      c.beginPath();
      c.ellipse(bx, by, 28 * s, 10 * s, 0, 0, Math.PI);
      c.lineTo(bx - 28 * s, by - 4 * s);
      c.ellipse(bx, by - 4 * s, 28 * s, 9 * s, 0, Math.PI, 0);
      c.fill();
      c.fillStyle = dark ? "rgb(30 52 70)" : "rgb(70 120 140)";
      c.beginPath();
      c.ellipse(bx, by - 4 * s, 22 * s, 6.5 * s, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "rgb(255 255 255 / 0.35)";
      c.lineWidth = 1;
      const rip = (t * 0.8) % 1;
      c.beginPath();
      c.ellipse(bx + 4 * s, by - 4 * s, 4 * s + rip * 14 * s, (4 * s + rip * 14 * s) * 0.3, 0, 0, Math.PI * 2);
      c.globalAlpha = 1 - rip;
      c.stroke();
      c.globalAlpha = 1;
      // Spout (kakei) bringing water in from the left edge.
      const spoutY = p.y - 34 * s,
        spoutEnd = p.x + 38 * s;
      c.strokeStyle = bambooDark;
      c.lineWidth = 6 * s;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(-10, spoutY - 6 * s);
      c.lineTo(spoutEnd, spoutY);
      c.stroke();
      c.strokeStyle = bamboo;
      c.lineWidth = 4 * s;
      c.stroke();
      // Posts.
      c.strokeStyle = bambooDark;
      c.lineWidth = 4 * s;
      for (const ox of [-5, 5]) {
        c.beginPath();
        c.moveTo(p.x + ox * s, p.y + 46 * s);
        c.lineTo(p.x + ox * s, p.y - 3 * s);
        c.stroke();
      }
      // The rocking tube.
      const a = shishi.angle + Math.sin(shishi.wobble * 30) * shishi.wobble * 0.15;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(a);
      c.fillStyle = bamboo;
      c.strokeStyle = bambooDark;
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(-34 * s, -6.5 * s);
      c.lineTo(42 * s, -6.5 * s);
      c.lineTo(52 * s, 6.5 * s); // the slanted mouth
      c.lineTo(-34 * s, 6.5 * s);
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = "rgb(40 50 30 / 0.55)";
      c.beginPath();
      c.ellipse(47 * s, 0, 2.6 * s, 6 * s, -0.65, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = bambooDark;
      for (const nx of [-14, 18]) {
        c.beginPath();
        c.moveTo(nx * s, -6.5 * s);
        c.lineTo(nx * s, 6.5 * s);
        c.stroke();
      }
      c.restore();
      c.fillStyle = bambooDark;
      c.beginPath();
      c.arc(p.x, p.y, 2.5 * s, 0, Math.PI * 2);
      c.fill();
      // Water drops.
      c.fillStyle = dark ? "rgb(160 200 230 / 0.8)" : "rgb(90 150 190 / 0.85)";
      for (const dr of drops) {
        c.beginPath();
        c.ellipse(dr.x, dr.y, 1.4 * s, 2 * s, 0, 0, Math.PI * 2);
        c.fill();
      }
    };

    const mouth = () => {
      const p = shishiPivot();
      return { x: p.x + Math.cos(shishi.angle) * 48 * S, y: p.y + Math.sin(shishi.angle) * 48 * S };
    };

    const stepShishi = (dt: number) => {
      const p = shishiPivot();
      const REST = -0.42,
        TIP = 0.55;
      shishi.wobble = Math.max(0, shishi.wobble - dt);
      if (shishi.phase === "fill") {
        shishi.dripT -= dt;
        if (shishi.dripT <= 0) {
          shishi.dripT = 0.32;
          drops.push({ x: p.x + 38 * S, y: p.y - 32 * S, vx: 0, vy: 20, floor: mouth().y });
        }
        shishi.angle = REST + shishi.fill * 0.32;
        if (shishi.fill >= 1) {
          shishi.phase = "tip";
          shishi.pt = 0;
          shishi.splashed = false;
        }
      } else if (shishi.phase === "tip") {
        shishi.pt += dt;
        const u = Math.min(1, shishi.pt / 0.28);
        shishi.angle = REST + 0.32 + (TIP - REST - 0.32) * u * u;
        if (u > 0.6 && !shishi.splashed) {
          shishi.splashed = true;
          const m = mouth();
          for (let i = 0; i < 10; i++) drops.push({ x: m.x, y: m.y, vx: rnd(-30, 30), vy: rnd(-40, 20), floor: p.y + 40 * S });
        }
        if (u >= 1) {
          shishi.phase = "back";
          shishi.pt = 0;
          shishi.fill = 0;
        }
      } else {
        shishi.pt += dt;
        const u = Math.min(1, shishi.pt / 0.32);
        shishi.angle = TIP + (REST - TIP) * (1 - Math.pow(1 - u, 3));
        if (u >= 1) {
          shishi.phase = "fill";
          shishi.wobble = 0.35;
          sound.knock();
        }
      }
      for (const dr of drops) {
        dr.vy += 380 * dt;
        dr.x += dr.vx * dt;
        dr.y += dr.vy * dt;
      }
      const before = drops.length;
      drops = drops.filter((dr) => dr.y < dr.floor);
      if (shishi.phase === "fill") shishi.fill = Math.min(1, shishi.fill + (before - drops.length) * 0.045);
    };

    /* ---------- frame ---------- */

    const drawLanternLight = (c: CanvasRenderingContext2D) => {
      const { x, base } = lanternPos();
      const s = S;
      const on = lit();
      if (on) {
        const flick = 1 + Math.sin(t * 9) * 0.04 + Math.sin(t * 5.3) * 0.04;
        const g = c.createRadialGradient(x, base - 40 * s, 0, x, base - 40 * s, 120 * s * flick);
        g.addColorStop(0, rgb("glow", dark ? 0.38 : 0.28));
        g.addColorStop(1, rgb("glow", 0));
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, base - 40 * s, 120 * s * flick, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = on ? rgb("glow", 0.95) : "rgb(40 40 44 / 0.55)";
      c.fillRect(x - 5 * s, base - 52 * s, 10 * s, 9 * s);
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(sand, 0, 0, canvas.width, canvas.height);
      ctx.drawImage(marks, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const rg of rings) ringMarks(ctx, rg.x, rg.y, rg.max * Math.min(1, rg.t / 0.55));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(stonesLayer, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (drag) drawStone(ctx, drag.stone, 6);
      // Settled leaves lie under the cat; falling ones above it.
      const drawLeaf = (l: Leaf) => {
        if (l.z > 0) {
          ctx.fillStyle = rgb("shadow", 0.12);
          ctx.beginPath();
          ctx.ellipse(l.x, l.y, l.s, l.s * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.save();
        ctx.translate(l.x, l.y - l.z);
        ctx.rotate(l.rot);
        ctx.scale(1, l.z > 0 ? 1 : 0.7);
        ctx.fillStyle = `rgb(${LEAF_COLOURS[l.c]} / 0.95)`;
        maple(ctx, l.s);
        ctx.restore();
      };
      for (const l of leaves) if (l.z <= 0) drawLeaf(l);
      drawShishi(ctx);
      if (cat) drawCat(ctx, cat);
      for (const l of leaves) if (l.z > 0) drawLeaf(l);
      drawLanternLight(ctx);
      // Sweep: a band of fresh sand following the broom.
      if (sweepX >= 0) {
        ctx.fillStyle = rgb("ink", 0.12);
        ctx.fillRect(sweepX - 3, 0, 6, H);
      }
      // The pine shadow sways around a pivot beyond the top-right corner.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.save();
      const px = (W + 40) * dpr,
        py = -40 * dpr;
      ctx.translate(px, py);
      ctx.rotate(Math.sin(t * 0.45) * 0.018 + Math.sin(t * 1.3) * 0.005);
      ctx.translate(-px, -py);
      ctx.globalAlpha = dark ? 0.3 : 0.1;
      ctx.drawImage(pine, 0, 0);
      ctx.restore();
    };

    const step = (dt: number) => {
      t += dt;

      for (const rg of rings) rg.t += dt;
      for (const rg of rings.filter((r) => r.t >= 0.55)) ringMarks(mk, rg.x, rg.y, rg.max);
      rings = rings.filter((r) => r.t < 0.55);

      // Wind gusts nudge the leaves.
      gustTimer -= dt;
      if (gustTimer <= 0) {
        gust = rnd(-55, 55);
        gustTimer = rnd(5, 9);
      }
      gust *= Math.pow(0.35, dt);
      for (const l of leaves) {
        l.age += dt;
        if (l.z > 0) {
          l.vz -= 70 * dt;
          l.vz = Math.max(l.vz, -26);
          l.z += l.vz * dt;
          l.x += (l.vx + Math.sin(t * 2 + l.rot * 5) * 14 + gust) * dt;
          l.rot += l.spin * dt;
          if (l.z <= 0) {
            l.z = 0;
            l.vx *= 0.2;
          }
        } else {
          l.vx += gust * 0.9 * dt;
          l.vx *= Math.pow(0.25, dt);
          l.x += l.vx * dt;
          l.rot += l.vx * 0.01 * dt;
        }
        if (sweepX >= 0 && l.x < sweepX + 16 && l.x > sweepX - 40) {
          l.x = sweepX + 16 + rnd(0, 10);
          l.z = Math.max(l.z, 4);
          l.vz = 20;
        }
      }
      leaves = leaves.filter((l) => l.x > -30 && l.x < W + 30);

      // The broom.
      if (sweepX >= 0) {
        sweepX += W * dt * 0.75;
        mk.globalCompositeOperation = "destination-out";
        mk.fillStyle = "#000";
        mk.fillRect(0, 0, sweepX, H);
        mk.globalCompositeOperation = "source-over";
        if (sweepX > W + 20) sweepX = -1;
      }

      // The cat.
      catTimer -= dt;
      if (!cat && catTimer <= 0) spawnCat();
      if (cat) {
        const k = cat;
        k.t += dt;
        if (k.hop > 0) k.hop = Math.max(0, k.hop - dt * 2.4);
        if (k.state === "sit") {
          if (k.t > 3.5) {
            k.state = "walk";
            k.t = 0;
            k.sitAt = -1;
          }
        } else {
          const v = (k.state === "run" ? 150 : 34) * S;
          k.x += k.dir * v * dt;
          k.phase += dt * (k.state === "run" ? 16 : 7);
          k.printAcc += v * dt;
          const gap = (k.state === "run" ? 22 : 12) * S;
          if (k.printAcc > gap && k.hop === 0) {
            k.printAcc = 0;
            k.foot ^= 1;
            pawPrint(k.x - k.dir * 4 * S, k.y + (k.foot ? 2 : -2) * S);
          }
          if (k.state === "walk" && k.sitAt >= 0 && Math.abs(k.x - k.sitAt) < 3) {
            k.state = "sit";
            k.t = 0;
          }
          if (k.x < -60 * S || k.x > W + 60 * S) {
            cat = null;
            catTimer = rnd(16, 30);
          }
        }
      }

      stepShishi(dt);
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
    // With reduced motion there's no loop: apply changes and redraw at once.
    const settle = () => {
      if (running) return;
      for (const rg of rings) ringMarks(mk, rg.x, rg.y, rg.max);
      rings = [];
      if (sweepX >= 0) {
        mk.clearRect(0, 0, W, H);
        leaves = [];
        sweepX = -1;
      }
      draw();
    };

    const build = () => {
      const rect = box.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
      SP = W < 520 ? 7.5 : 9;
      S = Math.min(1.15, Math.max(0.7, H / 280)) * (W < 520 ? 0.85 : 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      marks.width = canvas.width;
      marks.height = canvas.height;
      mk.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderSand();
      renderStones();
      renderPine();
      draw();
    };

    api.current.sweep = () => {
      sweepX = 0;
      sound.broom();
      if (!running) settle();
    };

    /* ---------- input ---------- */

    const at = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const hitStone = (x: number, y: number) => {
      for (let i = stones.length - 1; i >= 0; i--) {
        const s = stones[i];
        const r = sr(s);
        const dx = x - sx(s),
          dy = (y - (sy(s) - r * 0.15)) / SQUASH;
        if (dx * dx + dy * dy < r * r * 1.1) return s;
      }
      return null;
    };
    const hitCat = (x: number, y: number) => cat && Math.abs(x - cat.x) < 26 * S && y > cat.y - 36 * S && y < cat.y + 6 * S;
    const hitShishi = (x: number, y: number) => {
      const p = shishiPivot();
      return x > p.x - 40 * S && x < p.x + 72 * S && y > p.y - 40 * S && y < p.y + 54 * S;
    };
    const hitLantern = (x: number, y: number) => {
      const { x: lx, base } = lanternPos();
      return Math.abs(x - lx) < 22 * S && y > base - 74 * S && y < base + 4 * S;
    };

    const onDown = (e: PointerEvent) => {
      const p = at(e);
      pointer = p;
      if (hitCat(p.x, p.y)) return startle();
      if (hitShishi(p.x, p.y)) {
        if (shishi.phase === "fill") shishi.fill = 1;
        if (!running) draw();
        return;
      }
      if (hitLantern(p.x, p.y)) {
        lanternLit = !lit();
        if (!running) draw();
        return;
      }
      const s = hitStone(p.x, p.y);
      if (s) {
        drag = { stone: s, dx: p.x - sx(s), dy: p.y - sy(s), moved: false, x0: p.x, y0: p.y };
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {}
        renderStones();
        if (!running) draw();
        return;
      }
      const tl = toolRef.current;
      if (tl === "ring") {
        rings.push({ x: p.x, y: p.y, t: 0, max: SP * rnd(4, 6) });
        sound.chime();
        if (cat && Math.hypot(cat.x - p.x, cat.y - p.y) < 70 * S) startle();
      } else if (tl === "stone") {
        if (stones.length >= 8) stones.shift();
        stones.push({ fx: p.x / W, fy: Math.min(0.9, Math.max(0.15, p.y / H)), fr: rnd(0.045, 0.1), shape: shape(), tone: Math.floor(Math.random() * 3) });
        renderSand();
        renderStones();
        sound.thunk();
      } else if (tl === "leaf") {
        for (let i = 0; i < 7; i++) addLeaf(p.x, p.y);
        sound.rustle();
      }
      if (!running) settle();
    };

    const onMove = (e: PointerEvent) => {
      const p = at(e);
      if (drag) {
        if (Math.hypot(p.x - drag.x0, p.y - drag.y0) > 4) drag.moved = true;
        if (drag.moved) {
          drag.stone.fx = Math.min(0.95, Math.max(0.05, (p.x - drag.dx) / W));
          drag.stone.fy = Math.min(0.9, Math.max(0.15, (p.y - drag.dy) / H));
          renderSand(0.35);
          if (!running) draw();
        }
        return;
      }
      const tl = toolRef.current;
      const pressed = e.buttons > 0;
      if (tl === "rake" && (e.pointerType === "mouse" || pressed)) {
        if (pointer && Math.hypot(p.x - pointer.x, p.y - pointer.y) < 3) return;
        if (pointer) {
          rakeStroke(pointer.x, pointer.y, p.x, p.y);
          if (cat && cat.state !== "run" && Math.hypot(cat.x - p.x, cat.y - p.y) < 40 * S) startle();
        }
        pointer = p;
        if (!running) draw();
      } else if (tl === "leaf" && pressed) {
        const now = performance.now();
        if (now - leafT > 50) {
          leafT = now;
          addLeaf(p.x, p.y);
          if (!running) settle();
        }
        pointer = p;
      } else {
        pointer = p;
      }
    };

    const onUp = () => {
      if (drag) {
        const s = drag.stone;
        if (!drag.moved && toolRef.current === "stone" && stones.length > 1) {
          stones = stones.filter((x) => x !== s);
        }
        drag = null;
        renderSand();
        renderStones();
        sound.thunk();
        if (!running) draw();
      }
      pointer = null;
    };

    readColours();
    initStones();
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
      renderSand();
      renderStones();
      draw();
    };
    const mq = matchMedia("(prefers-color-scheme: dark)");
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("themechange", onTheme);
    mq.addEventListener("change", onTheme);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", () => {
      if (!drag) pointer = null;
    });

    return () => {
      stop();
      clearTimeout(resizeTimer);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("themechange", onTheme);
      mq.removeEventListener("change", onTheme);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const current = TOOLS.find((x) => x.id === tool)!;
  return (
    <div className="garden-wrap" data-rise="" style={{ animationDelay: "420ms" }}>
      <div className="garden" ref={wrap} data-tool={tool}>
        <canvas ref={cv} role="img" aria-label="An interactive zen garden: rake the sand, set stones, scatter leaves. A cat visits now and then." />
      </div>
      <div className="garden-bar">
        <div className="garden-title">
          <b lang="ja">枯山水</b>
          <span className="hint">{current.hint}</span>
        </div>
        <div className="garden-tools" role="toolbar" aria-label="Garden tools">
          {TOOLS.map((tl) => (
            <button key={tl.id} type="button" className="gtool" aria-pressed={tool === tl.id} onClick={() => setTool(tl.id)} title={tl.label}>
              <b lang="ja">{tl.kanji}</b>
              <span>{tl.label}</span>
            </button>
          ))}
          <button type="button" className="gtool" onClick={() => api.current.sweep()} title="Sweep the sand smooth">
            <b lang="ja">掃</b>
            <span>Sweep</span>
          </button>
          <button type="button" className="gtool" aria-pressed={soundOn} onClick={toggleSound} title={soundOn ? "Sound off" : "Sound on"}>
            <b lang="ja">音</b>
            <span>{soundOn ? "On" : "Off"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
