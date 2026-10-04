"use client";

import { useEffect, useRef, useState } from "react";
import profile from "@/data/profile.json";
import { sound } from "@/lib/sound";
import { Tanzaku } from "./ui";

/*
  The portrait has a pixel-art twin. Tapping it (変身, henshin, "transform")
  plays like an old game cartridge: the photo crunches down into big
  pixels, the window's tiles flip over in a diagonal wave to show the other
  side, then the picture sharpens back. Soft scanlines come and go with it.
*/

const TILES = 8; // tiles per side while flipping
const FLIP_RES = TILES * 2; // pixels per side mid-transition (2×2 per tile)
const START_RES = 44; // pixels per side as the crunch begins

// Timeline (ms).
const CRUNCH = 380;
const WAVE_STEP = 42; // delay between diagonals
const FLIP = 300;
const FLIP_END = CRUNCH + (TILES * 2 - 2) * WAVE_STEP + FLIP;
const END = FLIP_END + 420;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

type Source = { img: HTMLImageElement; sx: number; sy: number; s: number };

export default function Portrait() {
  const [twin, setTwin] = useState(false);
  const [playing, setPlaying] = useState(false);
  const photoRef = useRef<HTMLImageElement>(null);
  const twinRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // The square of each image that the round window shows.
  const source = (img: HTMLImageElement, isPhoto: boolean): Source => {
    const w = img.naturalWidth,
      h = img.naturalHeight;
    const s = Math.min(w, h);
    return { img, sx: (w - s) / 2, sy: isPhoto ? (h - s) * 0.14 : (h - s) / 2, s };
  };

  // Downsample a source to n×n pixels.
  const shrink = (src: Source, n: number, into?: HTMLCanvasElement) => {
    const c = into ?? document.createElement("canvas");
    c.width = c.height = n;
    const x = c.getContext("2d")!;
    x.imageSmoothingEnabled = true;
    x.drawImage(src.img, src.sx, src.sy, src.s, src.s, 0, 0, n, n);
    return c;
  };

  const toggle = () => {
    if (playing) return;
    const photo = photoRef.current,
      pix = twinRef.current,
      canvas = canvasRef.current;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !photo?.complete || !pix?.complete || !canvas || !photo.naturalWidth || !pix.naturalWidth) {
      setTwin((v) => !v);
      return;
    }
    const from = twin ? source(pix, false) : source(photo, true);
    const to = twin ? source(photo, true) : source(pix, false);

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(canvas.getBoundingClientRect().width * dpr);
    canvas.width = canvas.height = W;
    const ctx = canvas.getContext("2d")!;
    const scratch = document.createElement("canvas");
    const fromSmall = shrink(from, FLIP_RES);
    const toSmall = shrink(to, FLIP_RES);
    const tile = W / TILES;
    const cell = FLIP_RES / TILES;

    // The picture with a blocky copy faded over it; at 0 it's the clear image.
    const blocky = (src: Source, amount: number) => {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(src.img, src.sx, src.sy, src.s, src.s, 0, 0, W, W);
      if (amount <= 0) return;
      const n = Math.round(START_RES + (FLIP_RES - START_RES) * amount);
      ctx.globalAlpha = Math.min(1, amount * 2.4);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(shrink(src, n, scratch), 0, 0, W, W);
      ctx.globalAlpha = 1;
    };

    const scanlines = (k: number) => {
      if (k <= 0) return;
      ctx.fillStyle = `rgba(14, 19, 33, ${0.18 * k})`;
      for (let y = 0; y < W; y += 3 * dpr) ctx.fillRect(0, y, W, dpr);
    };

    // Tiles flip top-over-bottom, in a wave running corner to corner.
    const flip = (t: number) => {
      const open = Math.min(clamp01((t - CRUNCH) / 90), clamp01((FLIP_END - t) / 90));
      ctx.fillStyle = "rgb(14 19 33)";
      ctx.globalAlpha = open;
      ctx.fillRect(0, 0, W, W);
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
      const gap = dpr * open;
      for (let r = 0; r < TILES; r++) {
        for (let c = 0; c < TILES; c++) {
          const p = ease(clamp01((t - CRUNCH - (r + c) * WAVE_STEP) / FLIP));
          const k = Math.abs(Math.cos(p * Math.PI));
          const img = p < 0.5 ? fromSmall : toSmall;
          const h = tile * Math.max(0.05, k);
          const y = r * tile + (tile - h) / 2;
          ctx.drawImage(img, c * cell, r * cell, cell, cell, c * tile + gap / 2, y + gap / 2, tile - gap, h - gap);
          if (k < 0.999) {
            ctx.fillStyle = `rgba(0, 0, 0, ${(1 - k) * 0.35})`;
            ctx.fillRect(c * tile, y, tile, h);
          }
        }
      }
    };

    sound.blips(TILES * 2 - 1, CRUNCH, WAVE_STEP);
    setPlaying(true);
    const t0 = performance.now();
    const frame = (now: number) => {
      const t = now - t0;
      ctx.clearRect(0, 0, W, W);
      if (t < CRUNCH) {
        const p = ease(clamp01(t / CRUNCH));
        blocky(from, p);
        scanlines(p);
      } else if (t < FLIP_END) {
        flip(t);
        scanlines(1);
      } else if (t < END) {
        const p = ease(clamp01((t - FLIP_END) / (END - FLIP_END)));
        // The pixel twin is already pixel art: it lands crisp.
        if (to.img === pix) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(pix, 0, 0, W, W);
        } else blocky(to, 1 - p);
        scanlines(1 - p);
      } else {
        setTwin((v) => !v);
        setPlaying(false);
        return;
      }
      raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
  };

  return (
    <div className="portrait" data-rise="" style={{ animationDelay: "140ms" }}>
      <span className="ring" aria-hidden="true" />
      <button
        type="button"
        className="marumado"
        onClick={toggle}
        aria-pressed={twin}
        aria-label={`Portrait of ${profile.name}. Tap to switch between the photo and a pixel-art version.`}
      >
        <picture>
          <source srcSet={profile.photo} type="image/webp" />
          <img ref={photoRef} src={profile.photoFallback} alt="" width={720} height={960} fetchPriority="high" style={{ opacity: twin ? 0 : 1 }} />
        </picture>
        <img ref={twinRef} className="twin" src="/sai-pixel.png" alt="" width={512} height={512} decoding="async" style={{ opacity: twin ? 1 : 0 }} />
        <canvas ref={canvasRef} className="flipper" aria-hidden="true" style={{ visibility: playing ? "visible" : "hidden" }} />
      </button>
      <Tanzaku />
      <span className="henshin" aria-hidden="true">
        <b lang="ja">変身</b> {twin ? "tap to switch back" : "tap me"}
      </span>
    </div>
  );
}
