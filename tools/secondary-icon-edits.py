#!/usr/bin/env python3
"""Round 2 of the secondary-chain pilot (2026-10-29, docs/V5_SECONDARY_PILOT_2026-10-29.md): pixel edits
that resolve the art review's ambiguities on the board icons. They start from the painted masters in
docs/art-source/{rover,kite}-secondary-2026-10-29/, which are not changed:

- Gear (mech-1): laid flat (62 % height, turned 14 degrees), so it no longer reads as the upright Brass
  cog currency;
- Gear assembly (mech-2): its blue housing removed, leaving two meshed gears, so it no longer shares the
  Hand-crank mechanism's housing silhouette (mech-3 keeps housing and handle);
- Captain's logbook (notes-3): the story's wave seal on the cover replaced by a neutral gold compass
  star, the mark of the Kite's papers;
- Note fragment, Expedition note (notes-0, notes-1): pale paper deepened a little and a thin ink-brown
  edge along the sprite's own outline, for contrast with the sand-coloured cells (no tile is added).

These are interim edits, not new artwork: the report lists the assets that still need repainting.

    python3 tools/secondary-icon-edits.py && python3 tools/measure-art-fit.py
"""
import math, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROVER = os.path.join(ROOT, 'docs/art-source/rover-secondary-2026-10-29')
KITE = os.path.join(ROOT, 'docs/art-source/kite-secondary-2026-10-29')
ICONS = os.path.join(ROOT, 'v5/assets/premium/coast/icons')


def hsv(A):
    r, g, b = (A[..., i] / 255 for i in range(3))
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b); d = mx - mn + 1e-6
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, d / (mx + 1e-6), mx


def gear(src):
    """A gear lying on the bench: 62 % height, turned 14 degrees."""
    g = Image.open(src).convert('RGBA'); W, H = g.size
    t = g.resize((W, int(H * .62)), Image.LANCZOS)
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0)); c.paste(t, (0, (H - t.size[1]) // 2), t)
    return c.rotate(-14, resample=Image.BICUBIC)


def assembly(src):
    """The blue housing removed; only what joins the two gears is kept (rivets and stray highlights go)."""
    a = Image.open(src).convert('RGBA'); A = np.array(a).astype(float); W, H = a.size
    h, s, _ = hsv(A)
    blue = (h > 185) & (h < 250) & (s > 0.30) & (A[..., 3] > 12)
    grow = np.array(Image.fromarray((blue * 255).astype('uint8')).filter(ImageFilter.MaxFilter(5))) > 0
    alpha = np.where(grow, 0, A[..., 3])
    solid = Image.fromarray(((alpha > 60) * 255).astype('uint8')).copy()  # (an array-backed image ignores floodfill)
    seed = next(p for p in ((int(W * .30), int(H * .45)), (int(W * .25), int(H * .40)), (int(W * .35), int(H * .35))) if solid.getpixel(p) == 255)
    ImageDraw.floodfill(solid, seed, 128)
    keep = np.array(Image.fromarray(((np.array(solid) == 128) * 255).astype('uint8')).filter(ImageFilter.MaxFilter(5))) > 0
    A[..., 3] = np.where(keep, alpha, 0)
    return Image.fromarray(A.astype('uint8'))


def logbook(src, ring_edge=0.87):
    """The wave seal inside the cover's gold ring becomes a gold compass star."""
    im = Image.open(src).convert('RGBA'); A = np.array(im).astype(float); al = A[..., 3] / 255
    h, s, mx = hsv(A)
    gold = (h > 25) & (h < 60) & (s > 0.3) & (mx > 0.45) & (al > 0.5)
    box = np.zeros_like(gold); box[280:720, 470:960] = True  # the emblem, found by eye on the master
    ys, xs = np.nonzero(gold & box); cx, cy = xs.mean(), ys.mean()
    dx, dy = xs - cx, ys - cy; outer = np.hypot(dx, dy) > np.percentile(np.hypot(dx, dy), 60)
    w, v = np.linalg.eigh(np.cov(np.vstack([dx[outer], dy[outer]])))
    ang = (math.atan2(v[1, 1], v[0, 1]) + math.pi / 2) % math.pi - math.pi / 2
    ra, rb = math.sqrt(2 * w[1]), math.sqrt(2 * w[0])
    yy, xx = np.mgrid[0:A.shape[0], 0:A.shape[1]]
    u = ((xx - cx) * math.cos(ang) + (yy - cy) * math.sin(ang)) / ra
    vv = (-(xx - cx) * math.sin(ang) + (yy - cy) * math.cos(ang)) / rb
    e = np.hypot(u, vv)
    hole = (e < ring_edge) & (al > 0.5)  # everything inside the ring: the wave and its pressed-in shading
    m = np.array(Image.fromarray((hole * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(3))).astype(float) / 255
    rgb = A[..., :3].copy()
    near_gold = np.array(Image.fromarray(gold.astype('uint8') * 255).filter(ImageFilter.MaxFilter(31))) > 0
    have = ((m < 0.02) & ~near_gold & (al > 0.9)).astype(float); fill = rgb.copy()
    for rad in (8, 16, 32, 64, 96):  # the leather around it, filled in coarse to fine
        est = np.array(Image.fromarray(np.clip(rgb * have[..., None], 0, 255).astype('uint8')).filter(ImageFilter.GaussianBlur(rad))).astype(float)
        kw = np.array(Image.fromarray((have * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(rad))).astype(float) / 255
        need = (have < 0.5) & (kw > 0.05); fill[need] = (est / np.maximum(kw[..., None], 1e-3))[need]; have = np.where(need, 1, have)
    rng = np.random.default_rng(29)  # a fine leather grain, the same every run
    noise = np.array(Image.fromarray(np.clip(128 + rng.normal(0, 22, rgb.shape[:2]), 0, 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2))).astype(float) - 128
    fill = fill * (1 + noise[..., None] / 255 * 0.9)
    ring_near = np.array(Image.fromarray(gold.astype('uint8') * 255).filter(ImageFilter.MaxFilter(25))) > 0
    recess = (e < ring_edge * 0.95) & ~gold & ~ring_near & (al > 0.9)
    fill = fill * (rgb[recess].mean(axis=0) / fill[hole].mean(axis=0))  # the recess's own red
    out = rgb * (1 - m[..., None]) + fill * m[..., None]
    S = 1024; star = Image.new('RGBA', (S, S), (0, 0, 0, 0)); dr = ImageDraw.Draw(star); c = S / 2

    def pts(R, r, n, rot):
        return [(c + (R if k % 2 == 0 else r) * math.cos(rot + k * math.pi / n), c + (R if k % 2 == 0 else r) * math.sin(rot + k * math.pi / n)) for k in range(2 * n)]
    dark, mid, light = (122, 78, 22, 255), (214, 162, 64, 255), (247, 214, 132, 255)
    dr.polygon(pts(330, 120, 4, -math.pi / 4), fill=dark); dr.polygon(pts(300, 100, 4, -math.pi / 4), fill=mid)  # diagonal points
    dr.polygon(pts(500, 150, 4, -math.pi / 2), fill=dark); dr.polygon(pts(470, 128, 4, -math.pi / 2), fill=mid)  # cardinal points
    for k in range(4):  # lit from the top left, as the cover is
        a = -math.pi / 2 + k * math.pi / 2
        dr.polygon([(c, c), (c + 470 * math.cos(a), c + 470 * math.sin(a)), (c + 128 * math.cos(a - math.pi / 4), c + 128 * math.sin(a - math.pi / 4))], fill=light)
    dr.ellipse((c - 70, c - 70, c + 70, c + 70), fill=dark); dr.ellipse((c - 48, c - 48, c + 48, c + 48), fill=light)
    st = star.resize((int(2 * ra * 0.66), int(2 * rb * 0.66)), Image.LANCZOS).rotate(-math.degrees(ang), resample=Image.BICUBIC, expand=True)
    base = Image.fromarray(np.dstack([np.clip(out, 0, 255), A[..., 3]]).astype('uint8'), 'RGBA')
    px, py = int(cx - st.size[0] / 2), int(cy - st.size[1] / 2)
    shadow = Image.new('RGBA', st.size, (60, 8, 12, 0)); shadow.putalpha(st.getchannel('A').filter(ImageFilter.GaussianBlur(6)).point(lambda q: int(q * 0.55)))
    base.alpha_composite(shadow, (px + 6, py + 8)); base.alpha_composite(st, (px, py))
    return base


def paper(src):
    """Pale paper a little deeper and warmer, and a thin ink-brown edge under the sprite's own outline."""
    im = Image.open(src).convert('RGBA'); A = np.array(im).astype(float); rgb, al = A[..., :3], A[..., 3]
    k = np.clip((rgb.mean(axis=2) / 255 - 0.72) / 0.28, 0, 1)[..., None]
    rgb = rgb * (1 - 0.2 * k) * np.array([1.0, 0.97, 0.92]) ** k
    grow = max(3, round(im.size[0] * 0.012)) | 1
    ring = np.array(Image.fromarray(((al > 40) * 255).astype('uint8')).filter(ImageFilter.MaxFilter(grow)).filter(ImageFilter.GaussianBlur(1.2))).astype(float)
    a1 = al[..., None] / 255; a0 = ring[..., None] * 0.95 / 255; ao = a1 + a0 * (1 - a1)
    col = (np.clip(rgb, 0, 255) * a1 + np.array([104, 66, 34]) * a0 * (1 - a1)) / np.maximum(ao, 1e-6)
    return Image.fromarray(np.dstack([col, ao[..., 0] * 255]).clip(0, 255).astype('uint8'))


EDITS = [('mech-1', gear, f'{ROVER}/gear-master.webp'), ('mech-2', assembly, f'{ROVER}/gear-assembly-master.webp'),
         ('notes-0', paper, f'{KITE}/note-fragment-master.webp'), ('notes-1', paper, f'{KITE}/expedition-note-master.webp'),
         ('notes-3', logbook, f'{KITE}/captains-logbook-master.webp')]
with tempfile.TemporaryDirectory() as tmp:
    for name, edit, src in EDITS:
        path = os.path.join(tmp, name + '.png'); edit(src).save(path)
        # the board icon recipe (Build 45l): trimmed, centred at 92 % of a 192 px canvas, WebP q92
        subprocess.run([sys.executable, os.path.join(ROOT, 'tools/prepare-icon.py'), path, os.path.join(ICONS, name + '.webp')], check=True)
