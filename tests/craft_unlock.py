"""Crafting stays hidden until the character has points in a crafting skill, and then shows only those benches.

    python3 tests/craft_unlock.py SITE_DIR

A blank character (all attributes 10) has no Crafting tab. Free edit raises Wisdom, then one point of Brewing:
the tab appears (forged in when it scrolls into view) with only the Brewing bench. A point of Weapon Maintenance
adds that bench, whose button is forged in the next time Crafting opens. Runs at desktop and 390 px.
"""
import functools, http.server, pathlib, sys, threading
import os
from playwright.sync_api import sync_playwright

SITE = pathlib.Path(sys.argv[1]).resolve()
BLOCK = ("gstatic.com", "googleapis.com", "firebaseio.com", "firebaseapp.com", "identitytoolkit", "securetoken")
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(SITE))); threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{srv.server_address[1]}/index.html"
checks = []
def check(name, ok, got=""): checks.append(ok); print(("ok   " if ok else "FAIL ") + name + (f"  ({got})" if got and not ok else ""))

with sync_playwright() as p:
    b = p.chromium.launch(channel=os.environ.get("PW_CHANNEL") or None)
    for W, skin in [(1280, "ledger"), (390, "moss")]:
        ctx = b.new_context(viewport={"width": W, "height": 860}, is_mobile=W < 500, has_touch=W < 500)
        ctx.route("**/*", lambda r: r.abort() if any(x in r.request.url for x in BLOCK) else r.continue_())
        ctx.add_init_script(f"try {{ localStorage.setItem('cw-skin', JSON.stringify('{skin}')); localStorage.setItem('cw-dice', JSON.stringify('app')); }} catch (e) {{}}")
        pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        tag = f"{W}px {skin}: "
        pg.goto(url); pg.wait_for_timeout(1200)
        pg.locator(".charnav .cnchev").click(); pg.wait_for_timeout(200); pg.get_by_text("+ New character").first.click(); pg.wait_for_timeout(300)
        pg.get_by_text("Blank character sheet").first.click(); pg.wait_for_timeout(900)
        tabs = lambda: pg.evaluate("[...document.querySelectorAll('.tabs [role=tab]')].map(t => t.textContent.trim())")
        check(tag + "no Crafting tab without crafting skills", "Crafting" not in tabs(), tabs())
        pg.get_by_role("button", name="Free edit").click(); pg.wait_for_timeout(200)
        row = pg.locator(".attr", has_text="Wisdom")
        for _ in range(2): row.locator(".half .cell").first.click(); pg.wait_for_timeout(150)
        pg.locator(".srow", has_text="Brewing").first.locator(".pip").first.click(); pg.wait_for_timeout(500)
        check(tag + "a point of Brewing asks to turn Crafting on", pg.locator(".modprompt.mp-craft").count() == 1 and "Crafting" not in tabs(), tabs())
        pg.get_by_role("button", name="Turn on Crafting").click(); pg.wait_for_timeout(500)
        check(tag + "turning it on brings the tab", "Crafting" in tabs(), tabs())
        pg.evaluate("document.querySelector('.tabs').scrollIntoView({ block: 'center' })"); pg.wait_for_timeout(600)
        check(tag + "and it forges in when it's on screen", pg.locator(".tabs .tab-craft.forging").count() == 1)
        check(tag + "no sideways scroll during the sparks", not pg.evaluate("document.documentElement.scrollWidth > innerWidth + 1"))
        pg.wait_for_timeout(2300)
        pg.get_by_role("tab", name="Crafting").click(); pg.wait_for_timeout(400)
        benches = lambda: pg.evaluate("[...document.querySelectorAll('.craftnav button span')].map(s => s.textContent)")
        check(tag + "only the Brewing bench", benches() == ["Brewing"], benches())
        pg.get_by_role("tab", name="Sheet").click(); pg.wait_for_timeout(300)
        pg.locator(".srow", has_text="Weapon Maintenance").first.locator(".pip").first.click(); pg.wait_for_timeout(300)
        pg.evaluate("scrollTo(0, 0)"); pg.get_by_role("tab", name="Crafting").click(); pg.wait_for_timeout(300)
        check(tag + "Weapon Maintenance adds its bench, forged in", benches() == ["Brewing", "Weapon upkeep"] and pg.locator(".craftnav .cn-weapon.forging").count() == 1, benches())
        check(tag + "no page errors", not errs, errs[:3])
        ctx.close()
    b.close()
srv.shutdown()
print("PASS" if all(checks) else "FAIL"); sys.exit(0 if all(checks) else 1)
