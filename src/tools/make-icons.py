"""Draw the app icons (the sign-in crest: a brass gear ring around an ember gem) into src/web/icons/.

    python3 src/tools/make-icons.py
"""
import math, pathlib
from PIL import Image, ImageDraw

OUT = pathlib.Path(__file__).resolve().parent.parent / "web" / "icons"; OUT.mkdir(parents=True, exist_ok=True)
S = 1024   # draw large, then shrink for smooth edges

def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def crest(size, pad, bg=(20, 13, 8)):
    im = Image.new("RGBA", (S, S), bg + (255,)); d = ImageDraw.Draw(im)
    c = S / 2; R = S / 2 - pad
    # soft forge glow
    for r in range(int(R * 1.05), 0, -6):
        t = r / (R * 1.05); d.ellipse([c - r, c - r, c + r, c + r], fill=lerp((120, 50, 14), bg, t ** .6) + (255,))
    # gear ring: 24 teeth
    teeth, outer, inner = 24, R, R * .87
    pts = []
    for i in range(teeth):
        a = i * 2 * math.pi / teeth; st = 2 * math.pi / teeth
        for aa, rr in [(a, inner), (a + st * .12, outer), (a + st * .42, outer), (a + st * .54, inner)]:
            pts.append((c + rr * math.cos(aa), c + rr * math.sin(aa)))
    d.polygon(pts, fill=(212, 154, 69, 255))
    d.ellipse([c - R * .73, c - R * .73, c + R * .73, c + R * .73], fill=(20, 13, 8, 255))
    d.ellipse([c - R * .67, c - R * .67, c + R * .67, c + R * .67], outline=(251, 231, 176, 255), width=max(2, int(R * .03)))
    # ember gem (a tall diamond) with a light facet
    g = R * .5
    d.polygon([(c, c - g), (c + g * .44, c), (c, c + g), (c - g * .44, c)], fill=(240, 120, 40, 255), outline=(251, 231, 176, 255))
    d.polygon([(c, c - g), (c + g * .44, c), (c, c + g * .05)], fill=(255, 176, 74, 255))
    d.polygon([(c, c - g), (c - g * .44, c), (c - g * .05, c - g * .2)], fill=(255, 244, 210, 255))
    for (x1, y1, x2, y2) in [(c - R * .86, c, c - R * .74, c), (c + R * .74, c, c + R * .86, c)]:
        d.line([x1, y1, x2, y2], fill=(212, 154, 69, 255), width=max(3, int(R * .04)))
    return im.resize((size, size), Image.LANCZOS)

crest(192, 40).save(OUT / "icon-192.png", optimize=True)
crest(512, 40).save(OUT / "icon-512.png", optimize=True)
crest(512, 150).save(OUT / "icon-maskable-512.png", optimize=True)   # safe zone for round/squircle masks
crest(180, 60).convert("RGB").save(OUT / "apple-touch-icon.png", optimize=True)
crest(48, 30).save(OUT / "favicon-48.png", optimize=True)
print("icons written to", OUT)
