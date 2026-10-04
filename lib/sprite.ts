/*
  Pixel-art me: curly hair under a straw hat with a red band, glasses,
  beard, navy suit, white shirt and black tie. 32×32, drawn by hand; each
  character is one pixel (see PALETTE). The backdrop (sky, sun, clouds) is
  drawn separately so the figure can move on its own.
*/

export const SPRITE = [
  "................................",
  "...........KKKKKKKKKK...........",
  "..........KZZYYYYYYYYK..........",
  ".........KZYYYYYYYYYYyK.........",
  ".........KYYYYYYYYYYYyK.........",
  ".........KYYYYYYYYYYyyK.........",
  ".........KRRRRRRRRRRRrK.........",
  "....KKKKKKRRRRRRRRRRRrKKKKKK....",
  "..KKZZZYYYYYYYYYYYYYYYYYYYyyyKK.",
  ".KZZYYYYYYYYYYYYYYYYYYYYYyyyyyK.",
  "..KKyyyyyyyyyyyyyyyyyyyyyyyyKK..",
  "....KKKHHHHHHHHHHHHHHHHHHKKK....",
  ".....KHHhHHHHHHHHHHHHhHHHHK.....",
  "....KHHhHSSSSSSSSSSSSSSHhHHK....",
  "....KHHhHSGGGGGSSGGGGGSHhHHK....",
  "....KHhHHGGWSEGGGGWSEGGHHhHK....",
  "....KHHhHSGGGGGSSGGGGGSHhHHK....",
  ".....KHHHSLSSSSsSSSSSSsHHHK.....",
  ".....KHHBBSSSSBBBBSSSSBBHHK.....",
  "......KBBBBSBBMTTMBBSBBBK.......",
  "........KBbBBBBBBBBBBbBK........",
  ".........KBBBBBbbBBBBBK.........",
  "...........KKBBBBBBKK...........",
  "............KsSSSSsK............",
  "......KKKNNTTTsSSsTTTNNKKK......",
  "....KKNNNNmTTTTXXTTTTmNNNNKK....",
  "...KNNNNNNNmTTTXXTTTmNNNNNNNK...",
  "..KNNNNNNNNNmTTXXTTmNNNNNNNNNK..",
  "..KNNNNNNNNNNmTXXTmNNNNNNNNNNK..",
  ".KNnNNNNNNNNNNmXXmNNNNNNNNNNnNK.",
  ".KNnNNNNNNNNNNmXXmNNNNNNNNNNnNK.",
  ".KNnNNNNNNNNNNNNNNNNNNNNNNNNnNK.",
];

export const PALETTE: Record<string, string> = {
  K: "#1d1a26", // outline
  H: "#2a2230", // hair
  h: "#4a3f58", // hair highlight
  S: "#c98b62", // skin
  s: "#a96c49", // skin shadow
  L: "#dfa47a", // skin light
  B: "#3a2a26", // beard
  b: "#5a4038", // beard highlight
  M: "#8a4a3e", // mouth
  G: "#9a9daa", // glasses frame
  W: "#eef5ff", // lens glint
  E: "#1d1a26", // eye
  N: "#22305a", // suit
  n: "#18213f", // suit shadow
  m: "#3a4d84", // lapel edge
  T: "#f4f1ea", // shirt
  X: "#15131c", // tie
  Y: "#e9c46a", // straw
  y: "#c99a3f", // straw shadow
  Z: "#f6dc8e", // straw light
  R: "#c8282d", // band
  r: "#94191e", // band shadow
};

/** Rows that belong to the hat (lifted when it tips). */
export const HAT_ROWS = 11;

const SKY = ["#8fb8e0", "#a3c6e8", "#b8d4ee", "#cfe2f3"];

/**
 * Draws one frame on a 32×32 grid at `px` CSS pixels per sprite pixel.
 * `blink` closes the eyes, `bob` lowers the figure by a pixel (breathing),
 * `hat` lifts the hat by that many pixels (a tip of the hat).
 */
export function drawSprite(ctx: CanvasRenderingContext2D, px: number, opts: { blink?: boolean; bob?: number; hat?: number } = {}) {
  const { blink = false, bob = 0, hat = 0 } = opts;
  const N = SPRITE.length;
  // Sky in bands, a red sun, two clouds.
  for (let y = 0; y < N; y++) {
    ctx.fillStyle = SKY[Math.min(SKY.length - 1, Math.floor((y / N) * SKY.length))];
    ctx.fillRect(0, y * px, N * px, px);
  }
  ctx.fillStyle = "#e0523a";
  // Kept inside the round window's view (it crops the corners).
  for (let y = -2; y <= 2; y++)
    for (let x = -2; x <= 2; x++) if (x * x + y * y <= 5) ctx.fillRect((25 + x) * px, (4 + y) * px, px, px);
  ctx.fillStyle = "#ffffff";
  for (const [cx, cy, w] of [
    [2, 14, 5],
    [24, 17, 6],
  ] as const) {
    ctx.fillRect(cx * px, cy * px, w * px, px);
    ctx.fillRect((cx + 1) * px, (cy - 1) * px, (w - 2) * px, px);
  }
  for (let y = 0; y < N; y++) {
    const row = SPRITE[y];
    const dy = y < HAT_ROWS ? bob - hat : bob;
    for (let x = 0; x < row.length; x++) {
      let ch = row[x];
      if (ch === ".") continue;
      if (blink && y === 15 && (ch === "E" || ch === "W")) ch = "s";
      ctx.fillStyle = PALETTE[ch];
      ctx.fillRect(x * px, (y + dy) * px, px, px);
    }
  }
  // Keep the bottom edge filled when the figure bobs down.
  if (bob > 0) {
    const last = SPRITE[N - 1];
    for (let x = 0; x < last.length; x++) {
      if (last[x] === ".") continue;
      ctx.fillStyle = PALETTE[last[x]];
      ctx.fillRect(x * px, (N - 1 + bob) * px, px, px);
    }
  }
}
