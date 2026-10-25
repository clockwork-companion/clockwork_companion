"""Lift each painting off its rulebook page: the parchment becomes transparent, the torn-paper edge stays."""
import sys, glob, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
for f in sorted(glob.glob(os.path.join(src, "*.png"))):
    im = Image.open(f).convert("RGB"); a = np.asarray(im).astype(np.float32)
    # the parchment: sample the top-left third (never painted) for its colour and spread
    ref = a[40:500, 40:500].reshape(-1, 3); mu = np.median(ref, 0); sd = ref.std(0) + 1
    # local parchment colour varies (stains); compare against a smoothed copy of the parchment-coloured pixels
    z = np.abs((a - mu) / sd).max(2)
    parch0 = z < 3.2
    w = nd.gaussian_filter(parch0.astype(np.float32), 25) + 1e-3
    loc = np.stack([nd.gaussian_filter(a[..., i] * parch0, 25) / w for i in range(3)], 2)
    loc = np.where(w[..., None] > .05, loc, mu)
    d = np.sqrt(((a - loc) ** 2).sum(2))
    art = d > 26
    art = nd.binary_opening(art, iterations=2)
    lab, n = nd.label(art); sizes = nd.sum(art, lab, range(1, n + 1))
    keep = np.isin(lab, np.where(sizes > 0.02 * sizes.max())[0] + 1)
    keep = nd.binary_closing(keep, iterations=6); keep = nd.binary_fill_holes(keep)
    alpha = nd.gaussian_filter(keep.astype(np.float32), 1.2)
    ys, xs = np.where(keep); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.dstack([a, alpha * 255]).astype(np.uint8)[y0:y1, x0:x1]
    img = Image.fromarray(rgba, "RGBA"); s = 520 / max(img.size)
    if s < 1: img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    name = os.path.basename(f)[:-4]
    img.save(os.path.join(out, name + ".webp"), quality=72, method=6)
    print(f"{name:22s} {img.size} {os.path.getsize(os.path.join(out, name + '.webp')) // 1024} KB")
