"""Make the pixel-art side of the portrait (public/sai-pixel.png).

    python scripts/pixel.py <original-photo.jpg> <person-mask.png> <out.png> [grid]

Takes the square the round window shows, flattens the background into a few
bands of sky, quantises the person to a small palette, adds a one-pixel
outline like a game sprite, and scales it up with hard edges. The mask is
the cut-out from scripts/anime.py (white = person).
"""
import sys
import cv2
import numpy as np

src, mask_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
N = int(sys.argv[4]) if len(sys.argv) > 4 else 56

img = cv2.resize(cv2.imread(src)[40:1405, 0:1024], (720, 960), interpolation=cv2.INTER_AREA)
mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
# The square the marumado shows (object-position 50% 14%).
y0 = round((960 - 720) * 0.14)
img, mask = img[y0:y0 + 720], mask[y0:y0 + 720]

img = cv2.bilateralFilter(img, 9, 40, 9)
small = cv2.resize(img, (N, N), interpolation=cv2.INTER_AREA)
m = cv2.resize(mask, (N, N), interpolation=cv2.INTER_AREA) > 110

# Person: a small palette, a little more colour.
person = small[m].reshape(-1, 1, 3)
lab = cv2.cvtColor(person, cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5)
_, labels, centres = cv2.kmeans(lab, 14, None, crit, 5, cv2.KMEANS_PP_CENTERS)
centres[:, 1:] = 128 + (centres[:, 1:] - 128) * 1.3
q = cv2.cvtColor(np.clip(centres[labels.flatten()], 0, 255).astype(np.uint8).reshape(-1, 1, 3), cv2.COLOR_LAB2BGR).reshape(-1, 3)
art = np.zeros_like(small)
art[m] = q

# Background: banded sky, light at the bottom (BGR).
bands = [(214, 178, 132), (224, 194, 152), (234, 211, 175), (241, 226, 199)]
for y in range(N):
    art[y][~m[y]] = bands[min(len(bands) - 1, y * len(bands) // N)]
# A few pixel clouds.
for cx, cy in [(int(N * 0.78), int(N * 0.22)), (int(N * 0.9), int(N * 0.42))]:
    for dx, dy in [(0, 0), (1, 0), (2, 0), (-1, 0), (0, -1), (1, -1), (3, 0), (-2, 0)]:
        x, y = cx + dx, cy + dy
        if 0 <= x < N and 0 <= y < N and not m[y, x]:
            art[y, x] = (250, 248, 244)

# One-pixel dark outline around the person.
edge = m & ~cv2.erode(m.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
art[edge] = (52, 30, 28)

cv2.imwrite(out, cv2.resize(art, (N * 12, N * 12), interpolation=cv2.INTER_NEAREST))
