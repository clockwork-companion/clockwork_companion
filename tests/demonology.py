"""Occult: Daemonology (the Magic tab): contracts with pictures, summoning, limits a day, the perks' checks, the Guardian.

    python3 tests/demonology.py SITE_DIR [SHOTS_DIR]

Runs in "this browser only" mode on a character with Demonology 9, at desktop and 390 px.
Rules from the 2020.1 book (10.1): summon 2 AP / dismiss 1 AP (1 / 0 from 7); one at a time; 1 summon a day per 2 SP
(the app renews them at a long rest); partial summon (4, 2 uses), boost (5, 2 uses), banish (7, 1 use); Guardian (9).
"""
import functools, http.server, json, pathlib, struct, sys, tempfile, threading, zlib
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
# a tiny red PNG for the daemon's picture
PNG = pathlib.Path(tempfile.mkdtemp()) / "vex.png"
def png(w, h, rgb):
    raw = b"".join(b"\x00" + bytes(rgb) * w for _ in range(h))
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")
PNG.write_bytes(png(16, 16, (180, 40, 30)))
SUMMONER = {"modules": {"craft": True, "magic": True}, "id": "dm", "name": "Batbayar", "players": [], "attrs": {"MND": {"base": 15, "value": 15}}, "skills": {"Demonology": 9},
            "demon": {"daemons": [{"id": "b", "n": "Morrow", "realm": "The Drowned Hall", "wp": 11, "abilities": [{"id": "y1", "n": "Undertow", "text": "Pulls a creature 4 m."}]}]}}
PLAIN = {"modules": {"craft": True, "magic": True}, "id": "pl", "name": "Plain", "players": [], "skills": {"Warding": 3}}

with sync_playwright() as p:
    b = p.chromium.launch(channel=os.environ.get("PW_CHANNEL") or None)
    for W, skin in [(1280, "ledger"), (390, "moss")]:
        tag = f"{W}px {skin}: "
        ctx = b.new_context(viewport={"width": W, "height": 900}, is_mobile=W < 500, has_touch=W < 500)
        ctx.route("**/*", lambda r: r.abort() if any(x in r.request.url for x in BLOCK) else r.continue_())
        ctx.add_init_script(f"try {{ localStorage.setItem('cw-skin', JSON.stringify('{skin}')); localStorage.setItem('cw-dice', JSON.stringify('app'));"
                            f" if (!localStorage.getItem('cw-companion-chars')) {{ localStorage.setItem('cw-sel', JSON.stringify('pl')); localStorage.setItem('cw-tab', JSON.stringify('magic'));"
                            f" localStorage.setItem('cw-companion-chars', JSON.stringify({{ dm: {json.dumps(SUMMONER)}, pl: {json.dumps(PLAIN)} }})); }} }} catch (e) {{}}")
        pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(url); pg.wait_for_timeout(1500)
        check(tag + "no Demonology, no grimoire", pg.locator(".demonology").count() == 0)
        pg.evaluate("localStorage.setItem('cw-sel', JSON.stringify('dm'))"); pg.reload(); pg.wait_for_timeout(1500)
        pg.get_by_role("tab", name="Magic").click(); pg.wait_for_timeout(500)
        ch = lambda: pg.evaluate("Store.chars.dm")
        pg.evaluate("CW.rollDie = () => 20")   # every roll is a 20: 20 − 27 = −7
        facts = pg.locator(".demonhead .fact").all_inner_texts()
        check(tag + "Demonology 9: 4 summons a day, 4.5 h, 1 AP / 0 AP", any("0 of 4" in f for f in facts) and any("4.5 h" in f for f in facts) and any("1 AP / 0 AP" in f for f in facts), facts)
        # a new contract, with a picture
        pg.locator(".demonnew").click(); pg.wait_for_timeout(200)
        pg.fill("#df-new-n", "Vex, the Ash Warden"); pg.fill("#df-new-realm", "The Cinder Wastes"); pg.fill("#df-new-wp", "14")
        pg.fill("#df-new-terms", "A drop of blood at every new moon.")
        pg.locator(".demonform input[type=file]").set_input_files(str(PNG)); pg.wait_for_timeout(600)
        check(tag + "the picture shows on the contract", pg.locator(".demonform img.dface").count() == 1)
        pg.locator(".demonform .demonaddab").click(); pg.locator(".demonformab input").nth(0).fill("Cinder Veil"); pg.locator(".demonformab input").nth(1).fill("A wall of ash for 2 turns.")
        pg.locator(".demonform .btn.primary").click(); pg.wait_for_timeout(1500)
        vex = next((d for d in ch()["demon"]["daemons"] if d["n"] == "Vex, the Ash Warden"), None)
        check(tag + "the contract is saved, with its picture kept with the character", vex and vex["realm"] == "The Cinder Wastes" and vex["wp"] == 14 and vex["imgData"].startswith("data:image/jpeg")
              and vex["abilities"][0]["n"] == "Cinder Veil", vex and {k: (v[:30] if isinstance(v, str) else v) for k, v in vex.items()})
        card = lambda n: pg.locator(".demoncard").filter(has=pg.locator(".demonname b", has_text=n))
        # summon: the candles catch, the daemon rises; one at a time
        card("Vex").locator(".btn.primary", has_text="Summon").click(); pg.wait_for_timeout(600)
        check(tag + "summoning lights the circle", pg.locator(".demoncircf.calling").count() == 1)
        pg.wait_for_timeout(2600 + 1600)   # the animation, then the sheet saves
        c = ch()
        check(tag + "Vex is summoned; 1 of 4 used", c["demon"]["out"] == [vex["id"]] and c["demon"]["today"] == 1 and pg.locator(".demoncircf.present").count() == 1, c["demon"])
        check(tag + "one at a time: Morrow waits", card("Morrow").locator(".btn.primary").is_disabled() and "Dismiss Vex" in card("Morrow").inner_text())
        # boost an ability of the summoned daemon
        card("Vex").locator(".btn", has_text="Boost").click(); pg.fill(f"#dc-{vex['abilities'][0]['id']}", "60")
        card("Vex").locator(".demoncheck .btn.primary").click(); pg.wait_for_timeout(1500)
        check(tag + "a boost uses one of its 2 uses", ch()["uses"].get("p:Demonology:5") == 1 and "it works" in card("Vex").inner_text(), ch().get("uses"))
        card("Vex").locator(".demoncheck .btn", has_text="Done").click()
        card("Vex").locator(".btn", has_text="Dismiss").click(); pg.wait_for_timeout(1500)
        check(tag + "dismissed", not ch()["demon"]["out"])
        # partial summon of a daemon that isn't here
        card("Morrow").locator(".btn", has_text="Partial summon").click(); card("Morrow").locator(".demoncheck .btn.primary").click(); pg.wait_for_timeout(1500)
        check(tag + "a partial summon uses one of its 2 uses", ch()["uses"].get("p:Demonology:4") == 1)
        card("Morrow").locator(".demoncheck .btn", has_text="Done").click()
        # the Guardian stays beside a normal summon
        card("Morrow").locator(".demonguard input").check(); pg.wait_for_timeout(300)
        card("Morrow").locator(".btn.primary", has_text="Summon").click(); pg.wait_for_timeout(3200)
        card("Vex").locator(".btn.primary", has_text="Summon").click(); pg.wait_for_timeout(3200 + 1600)
        c = ch()
        check(tag + "a Guardian and another daemon together", sorted(c["demon"]["out"]) == sorted(["b", vex["id"]]) and c["demon"]["guardian"] == "b" and c["demon"]["today"] == 3, c["demon"])
        card("Vex").locator(".btn", has_text="Dismiss").click(); pg.wait_for_timeout(300)
        card("Vex").locator(".btn.primary", has_text="Summon").click(); pg.wait_for_timeout(3200)
        card("Vex").locator(".btn", has_text="Dismiss").click(); pg.wait_for_timeout(1600)
        check(tag + "four summons used: no more today", ch()["demon"]["today"] == 4 and card("Vex").locator(".btn.primary").is_disabled() and "No summons left today" in card("Vex").inner_text())
        # banish
        pg.locator(".demonbanish .btn").click(); pg.fill("#ban-n", "Morrow"); pg.wait_for_timeout(100)
        check(tag + "banishing fills in a known daemon's Willpower", pg.input_value("#ban-wp") == "11", pg.input_value("#ban-wp"))
        pg.locator(".demonbanish .btn.primary").click(); pg.wait_for_timeout(1500)
        check(tag + "banishing uses its 1 use", ch()["uses"].get("p:Demonology:7") == 1 and "Willpower 11" in pg.locator(".demonbanish").inner_text())
        msg = pg.evaluate("(() => { const x = JSON.parse(JSON.stringify(Store.chars.dm)); const m = CW.longRest(CW.normalize(x), 0); return [m, x.demon.today]; })()")
        check(tag + "a long rest renews the summons", "daemon summons renewed" in msg[0], msg)
        check(tag + "no sideways scroll", not pg.evaluate("document.documentElement.scrollWidth > innerWidth + 1"))
        check(tag + "no page errors", not errs, errs[:3])
        pg.locator(".demoncircf").screenshot(path=str(SHOTS / f"demonology-{W}.png"))
        ctx.close()
    b.close()

print("PASS" if all(checks) else "FAIL"); sys.exit(0 if all(checks) else 1)
