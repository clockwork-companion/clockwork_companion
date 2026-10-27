"""Fixes from the Crafting and Magic check (2026-10-26).

    python3 tests/craft_magic_fixes.py SITE_DIR [SHOTS_DIR]

- Powdertinkering: each munition keeps its own parts (they used to share one recipe, so a Core picked for rifle ammo
  showed on every munition).
- The Crafting and Magic menus: every name and skill label stays inside its own button, and no word breaks in two.
- Armor upkeep: a suit with no Soak Pool yet says so instead of showing as Broken with a Rebuild button.
- Weapon upkeep: a weapon with no weapon skill doesn't start its line with a stray "·".
- Warding: no Fatigue shows "None", not "−0 Sigils".
Runs in "this browser only" mode, at desktop and 390 px.
"""
import functools, http.server, json, pathlib, re, sys, threading
import os
from playwright.sync_api import sync_playwright

SITE = pathlib.Path(sys.argv[1]).resolve(); SHOTS = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "smoke-shots"); SHOTS.mkdir(parents=True, exist_ok=True)
BLOCK = ("gstatic.com", "googleapis.com", "firebaseio.com", "firebaseapp.com", "identitytoolkit", "securetoken")
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(SITE))); threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{srv.server_address[1]}/index.html"
checks = []
def check(name, ok, got=""): checks.append(ok); print(("ok   " if ok else "FAIL ") + name + (f"  ({got})" if got and not ok else ""))
SK = ["Powdertinker", "Brewing", "Runecrafting", "Weapon Maintenance", "Armor Maintenance", "Warding", "Occult: Harmony", "Demonology", "Dreamwalking", "Alchemy"]
ALL = {"modules": {"craft": True, "magic": True}, "id": "al", "name": "Everything", "players": [], "attrs": {k: {"base": 20, "value": 20} for k in ["STR", "DEX", "END", "MND", "WIL", "WIS", "PRS"]},
       "skills": {s: 10 for s in SK}, "weapons": [{"id": "w1", "name": "Old sabre"}], "armor": [{"id": "a1", "name": "Ringmail", "type": "medium", "worn": True}],
       "craft": {"saved": [{"k": "s1", "n": "Sikici", "recipe": {"type": "heavy", "coat": "Bludgeoning", "tips": {"Impale": 0}, "core": {"el": "Acid", "inc": 0}, "status": ["Dissolve"], "area": {"k": "Cross"}}}]}}
# every label inside its own button, and no word split across lines
NAV = """sel => [...document.querySelectorAll(sel + ' button')].flatMap(b => { const r = b.getBoundingClientRect(), bad = [];
  b.querySelectorAll('span, small').forEach(t => { const q = t.getBoundingClientRect();
    if (q.left < r.left - 1 || q.right > r.right + 1) bad.push('outside: ' + t.textContent);
    const words = t.textContent.trim().split(/\\s+/), range = document.createRange();
    let n = 0; for (const node of t.childNodes) if (node.nodeType === 3) { range.selectNodeContents(node); n = new Set([...range.getClientRects()].map(x => Math.round(x.top))).size; }
    if (n > words.length) bad.push('word split: ' + t.textContent); });
  return bad; })"""

with sync_playwright() as p:
    b = p.chromium.launch(channel=os.environ.get("PW_CHANNEL") or None)
    for W, skin in [(1280, "ledger"), (390, "moss")]:
        tag = f"{W}px {skin}: "
        ctx = b.new_context(viewport={"width": W, "height": 900}, is_mobile=W < 500, has_touch=W < 500)
        ctx.route("**/*", lambda r: r.abort() if any(x in r.request.url for x in BLOCK) else r.continue_())
        ctx.add_init_script(f"try {{ if (!localStorage.getItem('cw-companion-chars')) {{ localStorage.setItem('cw-skin', JSON.stringify('{skin}')); localStorage.setItem('cw-sel', JSON.stringify('al'));"
                            f" localStorage.setItem('cw-companion-chars', JSON.stringify({{ al: {json.dumps(ALL)} }})); }} }} catch (e) {{}}")
        pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(url); pg.wait_for_timeout(1500)
        ch = lambda: pg.evaluate("Store.chars.al")
        pg.get_by_role("tab", name="Crafting").click(); pg.wait_for_timeout(1500)
        P = ".tabpane:has(> .craftnav[aria-label=Crafts])"
        bad = pg.evaluate(NAV, P + " > .craftnav")
        check(tag + "Crafting menu: every label inside its button, no split words", not bad, bad)
        # Powdertinkering: parts stay with their munition
        label = lambda k: pg.locator(P + " .ptlabel").filter(has_text=re.compile(r"^\s*" + k, re.I))
        labels = lambda: [" ".join(t.split()) for t in pg.locator(P + " .ptlabel").all_inner_texts()]
        label("core").click(); pg.locator(P + " button").filter(has_text=re.compile(r"^\s*fire\s*$", re.I)).first.click(); pg.wait_for_timeout(300)
        label("tips").click(); pg.locator(P + " .ptopt").filter(has_text=re.compile(r"penetrating", re.I)).first.locator("button").first.click(); pg.wait_for_timeout(300)
        rifle = labels()
        check(tag + "rifle ammo: a Fire core and Penetrating tips", "CORE Fire 5" in rifle and any(x.startswith("TIPS Penetrating") for x in rifle), rifle)
        pg.locator(P + " .pttypes button", has_text="Pistol ammo").click(); pg.wait_for_timeout(400)
        pistol = labels()
        check(tag + "pistol ammo starts with its own, empty parts", "CORE None" in pistol and "TIPS None" in pistol, pistol)
        pg.locator(P + " .pttypes button", has_text="Explosives").click(); pg.wait_for_timeout(400)
        check(tag + "explosives too", "CORE None" in labels(), labels())
        pg.locator(P + " .pttypes button", has_text="Rifle ammo").click(); pg.wait_for_timeout(1500)
        check(tag + "back on rifle ammo, its parts are still there", labels() == rifle, (labels(), ch()["craft"].get("recipes")))
        # loading a saved recipe opens the Coat; picking Status or Area afterwards must show only that part's choices
        # (the coat's list used to stay behind underneath)
        COATWORDS = ("default coat", "damage type to bludgeoning")
        for part in ["status", "area"]:
            pg.locator(P + " .ptsavedchip", has_text="Sikici").locator("button").first.click(); pg.wait_for_timeout(400)
            label(part).click(); pg.wait_for_timeout(400)
            t = pg.locator(P + " .ptpick").inner_text().lower()
            check(tag + f"saved recipe, then {part}: no coat choices left behind", not any(w in t for w in COATWORDS), t[:300])
        # Armor upkeep: a suit with no stats yet
        pg.locator(P + " > .craftnav .cn-armor").click(); pg.wait_for_timeout(1200)
        suit = pg.locator(P + " .amsuit").first.inner_text()
        check(tag + "a suit with no stats says so, and isn't Broken", "no stats yet" in suit.lower() and "broken" not in suit.lower(), suit)
        bench = pg.locator(P).inner_text()
        check(tag + "it asks for its AV and Soak, with no Rebuild button", "no Soak Pool set" in bench and not pg.locator(P + " .forgebtn", has_text=re.compile("rebuild", re.I)).count(), bench[:200])
        # Weapon upkeep: no stray dot
        pg.locator(P + " > .craftnav .cn-weapon").click(); pg.wait_for_timeout(1200)
        wl = pg.locator(P + " .ptopt").filter(has_text=re.compile("old sabre", re.I)).first.locator("span").first.inner_text().strip()
        check(tag + "a weapon with no skill: no stray dot", not wl.startswith("·") and "No durability yet" in wl, wl)
        # Magic
        pg.get_by_role("tab", name="Magic").click(); pg.wait_for_timeout(1800)
        bad = pg.evaluate(NAV, ".tabpane.magic > .craftnav")
        check(tag + "Magic menu: every label inside its button, no split words, an icon each", not bad and pg.locator(".tabpane.magic > .craftnav .tabicon").count() == 5, bad)
        pg.locator(".tabpane.magic > .craftnav button", has_text="Warding").click(); pg.wait_for_timeout(600)
        pg.locator(".wardpages button", has_text="Inscribe").click(); pg.wait_for_timeout(800)
        txt = pg.locator(".tabpane.magic").inner_text()
        check(tag + "no Fatigue shows None, not −0", "−0" not in txt and "-0 Sigils" not in txt, re.findall(r".{20}0 Sigils", txt))
        check(tag + "no sideways scroll", not pg.evaluate("document.documentElement.scrollWidth > innerWidth + 1"))
        check(tag + "no page errors", not errs, errs[:3])
        pg.locator(".tabpane.magic > .craftnav").screenshot(path=str(SHOTS / f"magicnav-{W}.png"))
        ctx.close()
    # an old character's shared recipe still loads, and a broken parked recipe is dropped
    pg = b.new_page(); pg.goto(url); pg.wait_for_timeout(800)
    r = pg.evaluate("(() => { const c = CW.normalize({ craft: { recipe: { type: 'pistol', core: { el: 'Fire', inc: 0 } }, recipes: { rifle: { type: 'rifle' }, sniper: { type: 'rifle' }, x: 5 } } }); return [c.craft.recipe.type, Object.keys(c.craft.recipes)]; })()")
    check("normalize keeps the open recipe and only well-formed parked ones", r == ["pistol", ["rifle"]], r)
    b.close()

print("PASS" if all(checks) else "FAIL"); sys.exit(0 if all(checks) else 1)
