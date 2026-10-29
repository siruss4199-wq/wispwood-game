#!/usr/bin/env python3
"""Make a Coast Camp board icon from a painted master (the Build 45l recipe, docs/V5_BOARD_CRATE_PASS).

    python3 tools/prepare-icon.py MASTER OUT.webp [--gamma G] [--fill 0.92]

- clears alpha noise (alpha <= 3: stray pixels some exports leave at the canvas edges);
- optional gamma on the colour only (G < 1 lifts a dark painting toward its chain's brightness);
- trims to alpha >= 8, puts the object on a square canvas at `fill` of its longest side, centred;
- Lanczos resize to 192 px, WebP q92 (alpha kept, nothing baked: no tile, glow or shadow, which the
  board draws itself).
It prints the solid object's measurements (alpha >= 160) the way tools/measure-art-fit.py does.
"""
import argparse
from PIL import Image, ImageStat

p = argparse.ArgumentParser()
p.add_argument('master'); p.add_argument('out')
p.add_argument('--gamma', type=float, default=1.0); p.add_argument('--fill', type=float, default=0.92)
p.add_argument('--size', type=int, default=192)
a = p.parse_args()

im = Image.open(a.master).convert('RGBA')
r, g, b, al = im.split()
al = al.point(lambda v: 0 if v <= 3 else v)
if a.gamma != 1.0:
    lut = [round(255 * (i / 255) ** a.gamma) for i in range(256)]
    r, g, b = (c.point(lut) for c in (r, g, b))
im = Image.merge('RGBA', (r, g, b, al))
box = al.point(lambda v: 255 if v >= 8 else 0).getbbox()
obj = im.crop(box)
side = round(max(obj.size) / a.fill)
canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
canvas.paste(obj, ((side - obj.width) // 2, (side - obj.height) // 2), obj)
icon = canvas.resize((a.size, a.size), Image.LANCZOS)
icon.save(a.out, 'WEBP', quality=92, method=6)

s = icon.getchannel('A').point(lambda v: 255 if v >= 160 else 0)
sb = s.getbbox(); w = a.size
luma = ImageStat.Stat(icon.convert('L'), mask=s).mean[0]
print(f"{a.out}: solid longest {max(sb[2]-sb[0], sb[3]-sb[1])/w:.3f}, short/long "
      f"{min(sb[2]-sb[0], sb[3]-sb[1])/max(sb[2]-sb[0], sb[3]-sb[1]):.3f}, centre "
      f"({(sb[0]+sb[2])/2/w:.3f}, {(sb[1]+sb[3])/2/w:.3f}), solid luma {luma:.0f}")
