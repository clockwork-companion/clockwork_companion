"""Prepare Furnace Below's CC0 assets: two image atlases, a frame map (JSON) and small mono MP3 sounds.

Usage: python3 -I prep.py ASSETS_DIR OUT_DIR
ASSETS_DIR holds the downloaded/unpacked packs; OUT_DIR receives walls.png, sprites.png, frames.json, sfx/*.mp3.
"""
import json, glob, subprocess, sys, pathlib
import numpy as np
from PIL import Image
from scipy import ndimage

A = pathlib.Path(sys.argv[1]); OUT = pathlib.Path(sys.argv[2]); (OUT / "sfx").mkdir(parents=True, exist_ok=True)
WT = A / "x_oldschool_fps_wall_textures"

# ---------- walls: one 64x64 tile per id, in this order ----------
WALLS = [
    ("brick", "Brick/Brick01"), ("brick2", "Brick/Brick03"), ("brickskull", "Brick/Brick02"),
    ("grey", "Brick/Brick04"), ("grey2", "Brick/Brick06"), ("greyvent", "Brick/Brick07"),
    ("stone", "Stone/Stone01"), ("stone2", "Stone/Stone02"), ("moss", "Stone/Stone06"), ("moss2", "Stone/Stone07"), ("gate", "Stone/Stone05"),
    ("teal", "Tiles/Tiles02"), ("teal2", "Tiles/Tiles03"), ("bars", "Tiles/Tiles01"),
    ("earth", "Stone/Stone10"), ("earth2", "Stone/Stone11"),
    ("steel", "Doors/Doors01"), ("steel2", "Doors/Doors03"), ("steel3", "Doors/Doors07"), ("pipe", "Doors/Doors08"),
    ("wood", "Wood/Wood01"),
    ("door", "Doors/Doors04"), ("locked", "Doors/Doors02"), ("lever", "Doors/Doors09"),
]
wall_img = Image.new("RGB", (64 * len(WALLS), 64))
for i, (_, f) in enumerate(WALLS):
    wall_img.paste(Image.open(WT / f"{f}.png").convert("RGB").resize((64, 64)), (i * 64, 0))
wall_img.save(OUT / "walls.png", optimize=True)

# ---------- sprites ----------
def keyed(path, key=(0, 255, 255)):
    a = np.array(Image.open(path).convert("RGBA"))
    a[(a[:, :, 0] == key[0]) & (a[:, :, 1] == key[1]) & (a[:, :, 2] == key[2]), 3] = 0
    return Image.fromarray(a)

def boxes(img):
    m = np.array(img)[:, :, 3] > 20
    lab, _ = ndimage.label(ndimage.binary_dilation(m, iterations=2))
    bs = [b for b in ndimage.find_objects(lab) if (b[0].stop - b[0].start) * (b[1].stop - b[1].start) > 60]
    bs.sort(key=lambda b: (round(b[0].start / 30), b[1].start))
    return [(b[1].start, b[0].start, b[1].stop, b[0].stop) for b in bs]

def trim(img):
    bb = img.getbbox()
    return img.crop(bb) if bb else img

frames = {}   # name -> image (trimmed, bottom of image = floor)
ppu = {}      # name -> pixels per world unit (sets drawn size)
mut = keyed(A / "dl/bmonkey_paletted.png"); mb = boxes(mut)
for name, idx in [("m_walk0", 0), ("m_walk1", 5), ("m_walk2", 10), ("m_walk3", 15), ("m_atk0", 20), ("m_atk1", 28), ("m_atk2", 36), ("m_pain", 44),
                  ("m_die0", 49), ("m_die1", 50), ("m_die2", 51), ("m_die3", 52), ("m_die4", 53), ("m_dead", 54)]:
    frames[name] = trim(mut.crop(mb[idx])); ppu[name] = 92
sol = Image.open(A / "dl/gunnerspritesheetpublicdomain.png").convert("RGBA")
for name, (r, c) in [("s_idle", (0, 0)), ("s_walk0", (0, 12)), ("s_walk1", (0, 13)), ("s_aim", (0, 8)), ("s_fire0", (0, 9)), ("s_fire1", (0, 10)), ("s_pain", (0, 4))]:
    frames[name] = trim(sol.crop((c * 64, r * 128, c * 64 + 64, r * 128 + 128))); ppu[name] = 132
items = keyed(A / "dl/items_paletted.png"); ib = boxes(items)
for name, idx in [("health", 13), ("bighealth", 14), ("ammo", 7), ("bigammo", 10)]:
    frames[name] = trim(items.crop(ib[idx])); ppu[name] = 72
D = A / "x_deco"
for name, f in [("key", "Items/Items02"), ("chest", "Items/Items08"), ("crown", "Items/Items09"), ("cup", "Items/Items07"),
                ("barrel", "Kitchen/Barrel01"), ("toxic", "Decoration/Decoration07"), ("candles", "Decoration/Decoration06"), ("plant", "Decoration/sprite010"),
                ("stove", "Kitchen/Kitchen03"), ("bones", "Gore/Gore02"), ("s_dead", "Gore/Gore04"), ("torchstand", "Decoration/Decoration03")]:
    frames[name] = trim(Image.open(D / f"{f}.png").convert("RGBA")); ppu[name] = 64 if name in ("key", "chest", "crown", "cup", "bones", "s_dead") else 92

# The soldier's shot: a small glowing ball from the robot pack's bullet art, or a generated one.
bul = sorted(glob.glob(str(A / "x_RobotFree/png/Objects/Bullet_00*.png")))
if bul:
    b = trim(Image.open(bul[0]).convert("RGBA")); b.thumbnail((24, 24)); frames["bolt"] = b; ppu["bolt"] = 64

# Shelf-pack the sprites into one atlas.
order = sorted(frames, key=lambda k: -frames[k].height)
W = 1024; x = y = row_h = 0; place = {}
for k in order:
    im = frames[k]
    if x + im.width + 1 > W: x = 0; y += row_h + 1; row_h = 0
    place[k] = (x, y); x += im.width + 1; row_h = max(row_h, im.height)
atlas = Image.new("RGBA", (W, y + row_h + 1), (0, 0, 0, 0))
for k, (px, py) in place.items(): atlas.paste(frames[k], (px, py))
atlas.save(OUT / "sprites.png", optimize=True)

# Weapon: five 320x180 shotgun frames side by side.
wf = sorted(glob.glob(str(A / "x_fps_weapon_sprites/**/frames/shotgun*.png"), recursive=True))
wimg = Image.new("RGBA", (320 * len(wf), 180), (0, 0, 0, 0))
for i, f in enumerate(wf): wimg.paste(Image.open(f).convert("RGBA").resize((320, 180)), (i * 320, 0))
wimg.save(OUT / "shotgun.png", optimize=True)

json.dump({"walls": [w for w, _ in WALLS], "sprites": {k: [*place[k], frames[k].width, frames[k].height, ppu[k]] for k in frames},
           "shotgun": len(wf)}, open(OUT / "frames.json", "w"), separators=(",", ":"))

# ---------- sounds ----------
def snd(src, name, start=0, dur=1.2, vol=1.0):
    src = glob.glob(str(A / src), recursive=True)[0]
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(start), "-t", str(dur), "-i", src, "-ac", "1", "-ar", "22050",
                    "-af", f"volume={vol},afade=t=out:st={max(0, dur - .15):.2f}:d=0.15", "-b:a", "48k", str(OUT / "sfx" / f"{name}.mp3")], check=True)
SFX = [("s_sounds/**/shotty.wav", "shot", 0, 1.0, 1.0),
       ("s_monster_-_starninjas/**/monster.3.ogg", "m_alert", 0, 1.2, 1.0), ("s_monster_-_starninjas/**/monster.7.ogg", "m_die", 0, 1.3, 1.0),
       ("dl/monster-snarl-attack.ogg", "m_attack", 0, .8, 1.0), ("s_monster_-_starninjas/**/monster.12.ogg", "m_pain", 0, .6, 1.0),
       ("s_50-CC0-retro-synth-SFX/**/synth_laser_04.ogg", "s_fire", 0, .6, .8), ("s_50-CC0-retro-synth-SFX/**/retro_die_01.ogg", "s_die", 0, .9, .8),
       ("s_100-CC0-wood-metal-SFX/**/metal_open_01.ogg", "door", 0, 1.0, 1.0), ("s_100-CC0-wood-metal-SFX/**/keys_01.ogg", "locked", 0, .7, 1.0),
       ("dl/key-176034.mp3", "key", 0, .9, 1.0), ("s_50-CC0-retro-synth-SFX/**/power_up_01.ogg", "pickup", 0, .6, .7),
       ("s_50-CC0-retro-synth-SFX/**/power_up_06.ogg", "lever", 0, 1.4, .8), ("s_100-CC0-wood-metal-SFX/**/metal_slam_01.ogg", "slam", 0, 1.0, 1.0),
       ("kenney/kenney_impactsounds/**/impactPunch_heavy_000.ogg", "hurt", 0, .5, 1.0), ("kenney/kenney_impactsounds/**/impactMetal_light_000.ogg", "click", 0, .3, .8),
       ("s_50-CC0-retro-synth-SFX/**/power_up_02.ogg", "treasure", 0, .9, .7)]
for s in SFX: snd(*s)
print("ok", atlas.size, len(frames), "frames,", len(SFX), "sounds")
