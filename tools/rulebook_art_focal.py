"""Cut a clean 16:9 window from each rulebook painting, as large as possible, kept inside the paint (never the torn edge
or the parchment) and centred as near as it can be on the part that shows the skill (FOCUS: fractions of the page's
painted area, x then y; or a window picked by hand, [x0, y0, x1, y1] in page pixels).

    python3 tools/rulebook_art_focal.py PAGES_DIR src/web/art tools/rulebook_art_focus.json

PAGES_DIR holds the 2021 rulebook pages as PNGs (in the claude.ai project, "Clockwork Rulebook 2021 Skills")."""
import sys, glob, os, json, numpy as np
from PIL import Image
from scipy import ndimage as nd
src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
FOCUS = json.load(open(sys.argv[3]))
A = 16 / 9
for f in sorted(glob.glob(os.path.join(src, "*.png"))):
    name = os.path.basename(f)[:-4].lower()
    im = Image.open(f).convert("RGB"); a = np.asarray(im).astype(np.float32)
    ref = a[40:500, 40:500].reshape(-1, 3); mu = np.median(ref, 0)
    d = np.sqrt(((a - mu) ** 2).sum(2)); light = a.mean(2) > 200; sat = a.max(2) - a.min(2)
    notpaint = nd.binary_opening((d < 30) | (light & (sat < 45)), iterations=2)
    lab, n = nd.label(notpaint); sizes = nd.sum(notpaint, lab, range(1, n + 1)) if n else []
    bad = nd.binary_dilation(np.isin(lab, np.where(np.array(sizes) > 400)[0] + 1), iterations=8)
    paint = ~bad
    ys, xs = np.where(paint); py0, py1, px0, px1 = ys.min(), ys.max(), xs.min(), xs.max()
    spec = FOCUS.get(name, [0.5, 0.5])
    if len(spec) == 4:   # a window picked by hand, in page pixels
        best = tuple(spec); crop = im.crop(best); crop = crop.resize((640, 360), Image.LANCZOS) if crop.width > 640 else crop
        crop.save(os.path.join(out, name + ".webp"), quality=76, method=6); print(f"{name:22s} window {best} (by hand)"); continue
    fx, fy = spec; cx, cy = px0 + fx * (px1 - px0), py0 + fy * (py1 - py0)
    k = 4; m = bad[::k, ::k].astype(np.int32); I = np.pad(m.cumsum(0).cumsum(1), ((1, 0), (1, 0)))
    H, W = m.shape; best = None
    for w in range(min(W, int(H * A)), 30, -3):
        h = int(round(w / A))
        if h < 12: break
        s = I[h:, w:] - I[:-h, w:] - I[h:, :-w] + I[:-h, :-w]   # bad pixels in each window
        ok = np.argwhere(s == 0)
        if not len(ok): continue
        centres = (ok + [h / 2, w / 2]) * k
        dist = np.hypot(centres[:, 0] - cy, centres[:, 1] - cx)
        j = dist.argmin()
        # accept a big window if its centre is near the focus, otherwise keep shrinking towards it
        if dist[j] <= 0.12 * max(px1 - px0, py1 - py0) or w * k < 0.42 * (px1 - px0):
            y, x = ok[j] * k; best = (x, y, x + w * k, y + h * k); break
    crop = im.crop(best); crop = crop.resize((640, 360), Image.LANCZOS) if crop.width > 640 else crop
    crop.save(os.path.join(out, name + ".webp"), quality=76, method=6)
    print(f"{name:22s} window {best} -> {crop.size} {os.path.getsize(os.path.join(out, name + '.webp')) // 1024} KB")
