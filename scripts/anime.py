"""Cut the person out of the photo (mask.png, used by scripts/pixel.py), and
make a cel-shaded anime version of them (toon2.png; no longer on the site).

    python scripts/anime.py <original-photo.jpg> <output-dir>

Cuts the person out with GrabCut (seeded with a rough person shape for this
photo), cel-shades them (flattened detail, posterised lightness, natural
hue), draws ink outlines, and sets them against a flat anime sky. Writes
The crop and seed shapes are
tuned to this one photo.
"""
import cv2, numpy as np, sys
src = cv2.imread(sys.argv[1]); out = sys.argv[2]
img = cv2.resize(src[40:1405, 0:1024], (720, 960), interpolation=cv2.INTER_AREA)
H, W = img.shape[:2]

# 1. Separate the person from the office background.
mask = np.full((H, W), cv2.GC_PR_BGD, np.uint8)
# Rough person shape: probably foreground; core areas certainly foreground;
# open sky to the upper right certainly background.
cv2.ellipse(mask, (205, 200), (165, 205), 0, 0, 360, cv2.GC_PR_FGD, -1)
cv2.fillPoly(mask, [np.array([(150, 350), (0, 450), (0, 959), (660, 959), (650, 640), (570, 430), (400, 360)], np.int32)], cv2.GC_PR_FGD)
cv2.ellipse(mask, (215, 250), (80, 110), 0, 0, 360, cv2.GC_FGD, -1)
cv2.rectangle(mask, (110, 420), (270, 959), cv2.GC_FGD, -1)
cv2.rectangle(mask, (10, 640), (590, 959), cv2.GC_FGD, -1)
cv2.rectangle(mask, (450, 0), (719, 300), cv2.GC_BGD, -1)
cv2.rectangle(mask, (690, 0), (719, 959), cv2.GC_BGD, -1)
bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
cv2.grabCut(img, mask, None, bgd, fgd, 8, cv2.GC_INIT_WITH_MASK)
fg = np.where((mask == 1) | (mask == 3), 255, 0).astype(np.uint8)
fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
# keep the largest blob
n, lab, stats, _ = cv2.connectedComponentsWithStats(fg)
if n > 1:
    big = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA]); fg = np.where(lab == big, 255, 0).astype(np.uint8)
cv2.imwrite(f"{out}/mask.png", fg)

# 2. Cel shading: flatten detail, posterize lightness, keep natural hue.
sm = img.copy()
for _ in range(4):
    sm = cv2.bilateralFilter(sm, 9, 40, 9)
sm = cv2.edgePreservingFilter(sm, flags=1, sigma_s=50, sigma_r=0.3)
labc = cv2.cvtColor(sm, cv2.COLOR_BGR2LAB).astype(np.float32)
L = labc[..., 0]
levels = np.array([45, 85, 128, 168, 206, 238], np.float32)
idx = np.abs(L[..., None] - levels[None, None, :]).argmin(-1)
labc[..., 0] = levels[idx] * 0.62 + L * 0.38 + 6
for ch in (1, 2):
    labc[..., ch] = cv2.medianBlur(np.ascontiguousarray(labc[..., ch]).astype(np.uint8), 7).astype(np.float32)
labc[..., 1:] = 128 + (labc[..., 1:] - 128) * 1.25
cel = cv2.cvtColor(np.clip(labc, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR)
cel = cv2.medianBlur(cel, 5)

# 3. Ink lines.
g = cv2.cvtColor(cv2.bilateralFilter(img, 9, 50, 9), cv2.COLOR_BGR2GRAY)
e = cv2.Canny(cv2.bilateralFilter(g, 9, 30, 9), 45, 130)
e = cv2.dilate(e, np.ones((2, 2), np.uint8))
outline = cv2.Canny(fg, 50, 150); outline = cv2.dilate(outline, np.ones((4, 4), np.uint8))
lines = cv2.max(e, outline)
lines = cv2.GaussianBlur(lines, (3, 3), 0).astype(np.float32) / 255
ink = np.array([40, 26, 22], np.float32)  # dark indigo-brown ink (BGR)
person = cel.astype(np.float32) * (1 - lines[..., None]) + ink * lines[..., None]

# 4. Anime sky behind: gradient, a soft sun glow, a few flat clouds.
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
top, bot = np.array([235, 190, 120], np.float32), np.array([250, 240, 222], np.float32)  # BGR
t = (yy / H)[..., None]
sky = top * (1 - t) + bot * t
glow = np.exp(-(((xx - 560) ** 2 + (yy - 180) ** 2) / (2 * 140.0 ** 2)))[..., None]
sky = sky * (1 - glow * 0.5) + np.array([245, 252, 255], np.float32) * glow * 0.5
cloud = np.zeros((H, W), np.uint8)
for (cx, cy, s) in [(610, 345, 0.62), (665, 470, 0.45)]:
    for dx, dy, r in [(-60, 10, 40), (-20, -15, 55), (30, -5, 50), (75, 12, 38), (0, 20, 45)]:
        cv2.circle(cloud, (int(cx + dx * s), int(cy + dy * s)), int(r * s), 255, -1)
cloud = cv2.GaussianBlur(cloud, (5, 5), 0).astype(np.float32)[..., None] / 255
sky = sky * (1 - cloud) + np.array([255, 253, 250], np.float32) * cloud
ce = cv2.Canny((cloud[..., 0] * 255).astype(np.uint8), 50, 150)
sky = sky * (1 - (cv2.dilate(ce, None)[..., None] / 255.0) * 0.35)

a = cv2.GaussianBlur(fg, (5, 5), 0).astype(np.float32)[..., None] / 255
res = np.clip(person * a + sky * (1 - a), 0, 255).astype(np.uint8)
cv2.imwrite(f"{out}/toon2.png", res)
cv2.imwrite(f"{out}/toon2-side.png", np.hstack([cv2.resize(img, (360, 480)), cv2.resize(res, (360, 480))]))
