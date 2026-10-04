/*
  A lo-fi pixel scene on a 48×48 grid: a developer in a hoodie and
  headphones, side-on, typing at a monitor late at night. The screen's code
  scrolls and its light falls on his face; the city outside twinkles; the
  mug steams. Drawn with plain rectangles so every part can move; `t` is
  seconds since the scene started.
*/

export const GRID = 48;

const C = {
  wall: "#161a28",
  wallDark: "#121522",
  frame: "#11151f",
  sky1: "#1e2b52",
  sky2: "#2c3d6e",
  moon: "#f3e9c8",
  city: "#121828",
  lit: "#f6d67b",
  desk: "#4a3428",
  deskTop: "#6b4a36",
  deskGlow: "#7d6a63",
  hoodie: "#3a4262",
  hoodieDark: "#2b3149",
  hoodieLight: "#55618a",
  skin: "#d9a07a",
  skinShade: "#b47f5c",
  skinGlow: "#e6b897",
  hair: "#1f1b26",
  hairLight: "#383145",
  eye: "#15131c",
  phone: "#3a4258",
  phoneLight: "#56607d",
  led: "#e0523a",
  monitor: "#0e121b",
  screen: "#0a1520",
  keyboard: "#8d93a6",
  keyTop: "#b3b8c8",
  mug: "#b8323a",
  mugDark: "#8c2129",
  steam: "#c9d3e6",
};

const CODE = ["#7fdbca", "#c792ea", "#82aaff", "#f78c6c", "#addb67", "#ffcb6b"];

// Fixed pseudo-random so the code and city look the same every time.
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}
const r1 = rng(11);
const LINES = Array.from({ length: 40 }, () => ({
  indent: Math.floor(r1() * 4) * 2,
  parts: Array.from({ length: 1 + Math.floor(r1() * 3) }, () => ({ len: 2 + Math.floor(r1() * 4), c: CODE[Math.floor(r1() * CODE.length)] })),
}));
const r2 = rng(5);
const BUILDINGS = [
  { x: 4, w: 3, h: 7 },
  { x: 7, w: 2, h: 4 },
  { x: 9, w: 3, h: 9 },
  { x: 12, w: 2, h: 5 },
  { x: 14, w: 3, h: 8 },
].map((b) => ({ ...b, lights: Array.from({ length: 6 }, () => ({ dx: Math.floor(r2() * b.w), dy: 1 + Math.floor(r2() * (b.h - 1)), p: r2() * 10 })) }));

export function drawScene(ctx: CanvasRenderingContext2D, t: number) {
  const px = (x: number, y: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  };
  const rect = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };

  // Wall.
  rect(0, 0, GRID, GRID, C.wall);
  for (let x = 0; x < GRID; x += 6) rect(x, 0, 1, 38, C.wallDark);

  // Window: night sky, moon, a skyline whose lights come and go.
  rect(2, 2, 17, 20, C.frame);
  rect(3, 3, 15, 18, C.sky1);
  rect(3, 3, 15, 7, C.sky2);
  for (const [x, y] of [
    [12, 5],
    [13, 5],
    [11, 6],
    [12, 6],
    [13, 6],
    [14, 6],
    [11, 7],
    [12, 7],
    [13, 7],
    [14, 7],
    [12, 8],
    [13, 8],
  ])
    px(x, y, C.moon);
  px(5, 5, "#9fb2e0");
  px(8, 4, "#9fb2e0");
  px(16, 9, "#9fb2e0");
  for (const b of BUILDINGS) {
    rect(b.x - 1, 21 - b.h, b.w, b.h, C.city);
    for (const l of b.lights) if (Math.sin(t * 0.7 + l.p * 3) > -0.2) px(b.x - 1 + l.dx, 21 - b.h + l.dy, C.lit);
  }
  rect(10, 3, 1, 18, C.frame); // window bars
  rect(3, 12, 15, 1, C.frame);

  // Desk.
  rect(0, 38, GRID, 10, C.desk);
  rect(0, 38, GRID, 1, C.deskTop);
  rect(26, 39, 14, 1, C.deskGlow);

  // Monitor with scrolling code.
  rect(31, 11, 17, 24, C.monitor);
  rect(32, 12, 15, 21, C.screen);
  const scroll = Math.floor(t * 2.5);
  for (let row = 0; row < 10; row++) {
    const line = LINES[(row + scroll) % LINES.length];
    let x = 33 + line.indent;
    const y = 13 + row * 2;
    for (const part of line.parts) {
      if (x >= 46) break;
      rect(x, y, Math.min(part.len, 46 - x), 1, part.c);
      x += part.len + 1;
    }
  }
  if (Math.floor(t * 2) % 2 === 0) rect(34, 31, 2, 1, "#e6edf7"); // cursor
  rect(37, 35, 4, 3, C.monitor); // stand
  rect(35, 37, 8, 1, C.monitor);

  // Mug with steam.
  rect(41, 33, 4, 5, C.mug);
  rect(41, 37, 4, 1, C.mugDark);
  px(40, 34, C.mug);
  px(39, 35, C.mug);
  px(40, 36, C.mug);
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.8 + i / 3) % 1;
    const sy = Math.round(31 - k * 7);
    const sx = 41 + i + Math.round(Math.sin((t + i) * 3) * 0.6);
    if (k < 0.85) px(sx, sy, C.steam);
  }

  // Hoodie and shoulders.
  for (let y = 30; y < GRID; y++) {
    const x0 = Math.round(9 - (y - 30) * 0.45);
    const x1 = Math.round(27 + (y - 30) * 0.25);
    rect(x0, y, x1 - x0, 1, C.hoodie);
    rect(x0, y, 1, 1, C.hoodieLight);
    rect(x0 + 1, y, 2, 1, C.hoodieDark);
  }
  rect(11, 27, 9, 4, C.hoodieDark); // hood bunched behind the neck
  rect(12, 26, 6, 1, C.hoodieDark);
  rect(23, 31, 4, 1, C.hoodieLight); // light from the screen on the chest

  // Arm reaching to the keyboard, hand tapping.
  const tap = Math.floor(t * 7) % 2;
  for (let i = 0; i < 9; i++) rect(21 + i, 33 + Math.round(i * 0.45), 3, 3, C.hoodie);
  rect(22, 33, 6, 1, C.hoodieLight);
  rect(26, 38, 12, 1, C.keyboard);
  rect(27, 37, 10, 1, C.keyTop);
  rect(30, 35 + tap, 3, 2, C.skin);
  px(33, 36 + tap, C.skinShade);

  // Neck and head (side-on, facing the screen).
  rect(18, 24, 5, 4, C.skinShade);
  for (let y = 11; y <= 25; y++) {
    const dy = (y - 18) / 7.5;
    const half = Math.round(6 * Math.sqrt(Math.max(0, 1 - dy * dy)));
    rect(20 - half, y, half * 2 + 1, 1, C.skin);
  }
  rect(24, 15, 3, 9, C.skin); // face front
  rect(26, 16, 1, 7, C.skinGlow);
  px(27, 19, C.skin); // nose
  px(27, 20, C.skinGlow);
  rect(24, 24, 2, 1, C.skin); // chin
  px(23, 25, C.skinShade);
  px(25, 22, C.skinShade); // mouth
  px(24, 22, C.skinShade);
  rect(15, 16, 3, 7, C.skinShade); // shadowed back of the head

  // Eye (blinks) and brow.
  const blink = t % 4.3 > 4.15;
  if (blink) rect(24, 18, 2, 1, C.skinShade);
  else {
    px(24, 18, C.eye);
    px(25, 18, "#f2efe8");
  }
  rect(23, 16, 3, 1, C.hair);

  // Hair: short at the sides, a fringe falling forward.
  for (let y = 10; y <= 15; y++) {
    const dy = (y - 17.5) / 7.5;
    const half = Math.round(6.6 * Math.sqrt(Math.max(0, 1 - dy * dy)));
    rect(20 - half, y, half * 2 + 2, 1, C.hair);
  }
  rect(14, 14, 4, 5, C.hair);
  rect(14, 19, 2, 2, C.hairLight); // faded undercut
  px(26, 13, C.hair); // fringe falling forward
  px(27, 14, C.hair);
  px(26, 15, C.hair);
  px(18, 11, C.hairLight); // a little shine
  px(19, 11, C.hairLight);
  px(20, 12, C.hairLight);

  // Headphones: band over the head, cup over the ear, a small red light.
  rect(17, 10, 5, 1, C.phone);
  px(16, 11, C.phone);
  px(15, 12, C.phone);
  px(15, 13, C.phone);
  px(15, 14, C.phone);
  rect(15, 17, 4, 4, C.phone);
  rect(16, 16, 2, 6, C.phone);
  rect(16, 17, 2, 4, C.phoneLight);
  if (Math.floor(t * 1.2) % 3 !== 0) px(17, 21, C.led);

  // The screen's light washing over the face.
  ctx.fillStyle = "rgba(120, 200, 255, 0.16)";
  ctx.fillRect(24, 16, 3, 8);
  ctx.fillRect(27, 19, 1, 2);
}
