"""Saved Powdertinkering recipes: forge a batch, save it under a name, change a part (the name comes off), load the
recipe back with one click and forge it again into the same inventory line.

    python3 tests/powder_saved.py SITE_DIR [SHOTS_DIR]

Runs in "this browser only" mode (Firebase blocked) on a character with Powdertinker 7.
"""
import functools, http.server, json, pathlib, sys, threading
from playwright.sync_api import sync_playwright

SITE = pathlib.Path(sys.argv[1]).resolve(); SHOTS = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "smoke-shots"); SHOTS.mkdir(parents=True, exist_ok=True)
BLOCK = ("gstatic.com", "googleapis.com", "firebaseio.com", "firebaseapp.com", "identitytoolkit", "securetoken")
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(SITE))); threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{srv.server_address[1]}/index.html"
checks = []
def check(name, ok, got=""): checks.append(ok); print(("ok   " if ok else "FAIL ") + name + (f"  ({got})" if got and not ok else ""))
CH = {"id": "tink", "players": [], "name": "Tinker", "attrs": {"WIS": {"base": 17, "value": 17}, "MND": {"base": 17, "value": 17}}, "skills": {"Powdertinker": 7},
      "craft": {"supplies": {"container": 9000, "Fire": 9000}, "recipe": {"type": "pistol", "coat": "Slashing", "tips": {"Precise": 1}, "core": {"el": "Fire", "inc": 0}, "status": ["Scorched"]}}}

with sync_playwright() as p:
    b = p.chromium.launch()
    for W, skin in [(1280, "ledger"), (390, "moss")]:
        tag = f"{W}px {skin}: "
        ctx = b.new_context(viewport={"width": W, "height": 900}, is_mobile=W < 500, has_touch=W < 500)
        ctx.route("**/*", lambda r: r.abort() if any(x in r.request.url for x in BLOCK) else r.continue_())
        ctx.add_init_script(f"try {{ localStorage.setItem('cw-skin', JSON.stringify('{skin}')); localStorage.setItem('cw-dice', JSON.stringify('app'));"
                            f" localStorage.setItem('cw-craft-sub', JSON.stringify('powder')); localStorage.setItem('cw-sel', JSON.stringify('tink'));"
                            f" localStorage.setItem('cw-companion-chars', JSON.stringify({{ tink: {json.dumps(CH)} }})); }} catch (e) {{}}")
        pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(url); pg.wait_for_timeout(1500)
        pg.get_by_role("tab", name="Crafting").click(); pg.wait_for_timeout(500)
        pg.evaluate("(() => { CW.rollDie = () => 1; })()")   # every roll lands
        me = lambda: pg.evaluate("JSON.parse(JSON.stringify(Store.chars.tink))")
        def forge():
            pg.locator(".forgebtn").click(); pg.wait_for_selector(".ptread.end", timeout=30000); pg.wait_for_timeout(1500)
        check(tag + "no saved recipes yet, so no list", pg.locator(".ptsaved").count() == 0)
        forge()
        check(tag + "the craft offers to save the recipe, named after its parts", pg.locator(".ptsave input").input_value().startswith("Pistol ammo"), pg.locator(".ptsave input").input_value())
        pg.fill(".ptsave input", "Ironbite"); pg.locator(".ptsave .btn").click(); pg.wait_for_timeout(1500)
        pg.screenshot(path=str(SHOTS / f"powder-saved-{W}.png"))
        ch = me(); sv = ch["craft"]["saved"]
        check(tag + "saved with every part", len(sv) == 1 and sv[0]["n"] == "Ironbite" and sv[0]["recipe"]["tips"] == {"Precise": 1} and sv[0]["recipe"]["core"]["el"] == "Fire" and sv[0]["recipe"]["status"] == ["Scorched"] and sv[0]["recipe"]["type"] == "pistol", sv)
        pg.locator(".ptread.end .btn.primary").click(); pg.wait_for_timeout(300)
        check(tag + "the bench lists it, picked", pg.locator(".ptsavedchip.on", has_text="Ironbite").count() == 1)
        # change a part: a different recipe, so the name comes off
        pg.locator(".pttypes button", has_text="Rifle ammo").click(); pg.wait_for_timeout(1500)
        check(tag + "changing a part drops the name", not me()["craft"]["recipe"].get("name") and pg.locator(".ptsavedchip.on").count() == 0)
        pg.locator(".ptsavedchip .btn", has_text="Ironbite").click(); pg.wait_for_timeout(1500)
        rc = me()["craft"]["recipe"]
        check(tag + "one click loads every part back", rc.get("type") == "pistol" and rc.get("coat") == "Slashing" and rc.get("tips") == {"Precise": 1} and rc.get("status") == ["Scorched"] and rc.get("name") == "Ironbite", rc)
        forge()
        items = [i for i in me()["items"] if "Ironbite" in i.get("name", "")]
        check(tag + "the batch goes into the inventory as Ironbite", len(items) == 1 and items[0]["name"] == "Ironbite" and items[0]["qty"] == 4, me()["items"])
        check(tag + "the save box says Update for an existing name", pg.locator(".ptsave .btn", has_text="Update recipe").count() == 1)
        pg.locator(".ptread.end .btn.primary").click(); pg.wait_for_timeout(300)
        pg.locator(".ptsavedchip .iconbtn[aria-label='Delete the recipe Ironbite']").click(); pg.wait_for_timeout(1500)
        check(tag + "a saved recipe can be deleted", me()["craft"]["saved"] == [] and pg.locator(".ptsaved").count() == 0)
        check(tag + "no sideways scroll", not pg.evaluate("document.documentElement.scrollWidth > innerWidth + 1"))
        check(tag + "no page errors", not errs, errs[:3])
        ctx.close()
    b.close()
srv.shutdown()
print("PASS" if all(checks) else "FAIL"); sys.exit(0 if all(checks) else 1)
