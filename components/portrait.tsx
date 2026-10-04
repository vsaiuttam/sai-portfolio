"use client";

import { useEffect, useRef, useState } from "react";
import profile from "@/data/profile.json";
import { sound } from "@/lib/sound";
import { drawSprite, SPRITE } from "@/lib/sprite";
import { Tanzaku } from "./ui";

/*
  The portrait has a second self: a pixel-art character in a straw hat
  (lib/sprite.ts). Tapping the window (変身, henshin, "transform") plays
  like an old game cartridge: the photo crunches into big pixels, the tiles
  flip over in a diagonal wave to reveal the character, and a little
  fanfare plays. Once there, the character blinks, breathes and now and
  then tips its hat. Tapping again plays it all back to the photo.
*/

const TILES = 8; // tiles per side while flipping
const FLIP_RES = TILES * 2; // pixels per side mid-transition (2×2 per tile)
const START_RES = 44; // pixels per side as the crunch begins
const GRID = SPRITE.length; // the character's pixels per side

const CRUNCH = 380;
const WAVE_STEP = 42;
const FLIP = 300;
const FLIP_END = CRUNCH + (TILES * 2 - 2) * WAVE_STEP + FLIP;
const END = FLIP_END + 420;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

type Source = { img: CanvasImageSource; sx: number; sy: number; s: number; crisp: boolean };

export default function Portrait() {
  const [twin, setTwin] = useState(false);
  const [playing, setPlaying] = useState(false);
  const photoRef = useRef<HTMLImageElement>(null);
  const charRef = useRef<HTMLCanvasElement>(null);
  const flipRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const idleRaf = useRef(0);
  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      cancelAnimationFrame(idleRaf.current);
    },
    [],
  );

  // The character at rest, one canvas pixel per sprite pixel.
  const still = () => {
    const c = document.createElement("canvas");
    c.width = c.height = GRID;
    drawSprite(c.getContext("2d")!, 1);
    return c;
  };

  // The living character: blinks, breathes, tips its hat now and then.
  useEffect(() => {
    const c = charRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const px = 8;
    c.width = c.height = GRID * px;
    drawSprite(ctx, px);
    if (!twin || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t0 = performance.now();
    let last = "";
    const loop = (now: number) => {
      const t = (now - t0) / 1000;
      const blink = t % 3.7 > 3.55 || (t % 11 > 10.4 && t % 11 < 10.55);
      const bob = Math.sin(t * 2.4) > 0.55 ? 1 : 0;
      const cycle = t % 9;
      const hat = cycle > 5 && cycle < 6 ? (cycle < 5.12 || cycle > 5.88 ? 1 : cycle < 5.25 || cycle > 5.75 ? 2 : 3) : 0;
      const key = `${blink}${bob}${hat}`;
      if (key !== last) {
        last = key;
        ctx.clearRect(0, 0, c.width, c.height);
        drawSprite(ctx, px, { blink, bob, hat });
      }
      idleRaf.current = requestAnimationFrame(loop);
    };
    idleRaf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(idleRaf.current);
  }, [twin]);

  const shrink = (src: Source, n: number, into?: HTMLCanvasElement) => {
    const c = into ?? document.createElement("canvas");
    c.width = c.height = n;
    const x = c.getContext("2d")!;
    x.imageSmoothingEnabled = !src.crisp;
    x.drawImage(src.img, src.sx, src.sy, src.s, src.s, 0, 0, n, n);
    return c;
  };

  const toggle = () => {
    if (playing) return;
    const photo = photoRef.current,
      canvas = flipRef.current;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const goingToChar = !twin;
    if (reduce || !photo?.complete || !photo.naturalWidth || !canvas) {
      sound.land(goingToChar);
      setTwin((v) => !v);
      return;
    }
    const pw = photo.naturalWidth,
      ph = photo.naturalHeight,
      ps = Math.min(pw, ph);
    const photoSrc: Source = { img: photo, sx: (pw - ps) / 2, sy: (ph - ps) * 0.14, s: ps, crisp: false };
    const charSrc: Source = { img: still(), sx: 0, sy: 0, s: GRID, crisp: true };
    const from = goingToChar ? photoSrc : charSrc;
    const to = goingToChar ? charSrc : photoSrc;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(canvas.getBoundingClientRect().width * dpr);
    canvas.width = canvas.height = W;
    const ctx = canvas.getContext("2d")!;
    const scratch = document.createElement("canvas");
    const fromSmall = shrink(from, FLIP_RES);
    const toSmall = shrink(to, FLIP_RES);
    const tile = W / TILES;
    const cell = FLIP_RES / TILES;

    const clear = (src: Source) => {
      ctx.imageSmoothingEnabled = !src.crisp;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(src.img, src.sx, src.sy, src.s, src.s, 0, 0, W, W);
    };
    // The picture with a blocky copy faded over it; at 0 it's the clear image.
    const blocky = (src: Source, amount: number) => {
      clear(src);
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

    sound.crunch(CRUNCH);
    sound.blips(TILES * 2 - 1, CRUNCH, WAVE_STEP, goingToChar);
    sound.land(goingToChar, FLIP_END);
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
        // The character is pixel art already: it lands crisp.
        if (to.crisp) clear(to);
        else blocky(to, 1 - p);
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
    <div className="portrait" data-twin={twin} data-rise="" style={{ animationDelay: "140ms" }}>
      <span className="ring" aria-hidden="true" />
      <button
        type="button"
        className="marumado"
        onClick={toggle}
        aria-pressed={twin}
        aria-label={`Portrait of ${profile.name}. Tap to switch between the photo and a pixel-art character.`}
      >
        <picture>
          <source srcSet={profile.photo} type="image/webp" />
          <img ref={photoRef} src={profile.photoFallback} alt="" width={720} height={960} fetchPriority="high" style={{ opacity: twin ? 0 : 1 }} />
        </picture>
        <canvas ref={charRef} className="twin" aria-hidden="true" style={{ opacity: twin ? 1 : 0 }} />
        <canvas ref={flipRef} className="flipper" aria-hidden="true" style={{ visibility: playing ? "visible" : "hidden" }} />
      </button>
      <Tanzaku />
      <span className="henshin" aria-hidden="true">
        <b lang="ja">変身</b> {twin ? "tap to switch back" : "tap me"}
      </span>
    </div>
  );
}
