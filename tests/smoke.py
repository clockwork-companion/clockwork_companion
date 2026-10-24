"""Smoke test for the website build.

    python3 tests/smoke.py SITE_DIR [SHOTS_DIR]

Serves SITE_DIR (made by `python3 src/build.py --web SITE_DIR`) on a local port and opens it in headless Chromium,
at a desktop width and at 390 px, in every theme in the theme picker. Firebase is blocked, so the page runs in
"this browser only" mode and no real data is touched. It creates a blank character, opens every tab, opens and
closes both hidden games, and fails on page errors, console errors or sideways scrolling.
"""
import functools, http.server, json, pathlib, sys, threading
from playwright.sync_api import sync_playwright

SITE = pathlib.Path(sys.argv[1]).resolve()
SHOTS = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "smoke-shots"); SHOTS.mkdir(parents=True, exist_ok=True)
BLOCK = ("gstatic.com", "googleapis.com", "firebaseio.com", "firebaseapp.com", "identitytoolkit", "securetoken")
IGNORE = ("Failed to load resource", "net::ERR_", "ERR_FAILED", "firestore", "Firestore", "firebase")

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

def serve():
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(SITE)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}/index.html"

def run_case(browser, url, width, height, skin, mobile, games):
    ctx = browser.new_context(viewport={"width": width, "height": height}, has_touch=mobile, is_mobile=mobile)
    ctx.route("**/*", lambda r: r.abort() if any(b in r.request.url for b in BLOCK) else r.continue_())
    # The app stores its settings JSON-encoded ("\"cyber\""), so the theme must be written the same way.
    ctx.add_init_script(f"try {{ localStorage.setItem('cw-skin', {json.dumps(json.dumps(skin))}); }} catch (e) {{}}")
    page = ctx.new_page(); problems = []
    page.on("pageerror", lambda e: problems.append(f"page error: {e}"))
    page.on("console", lambda m: m.type == "error" and not any(i in m.text for i in IGNORE) and problems.append(f"console: {m.text}"))
    name = f"{width}px-{skin}"
    try:
        page.goto(url); page.wait_for_timeout(1500)
        shown = page.evaluate("document.documentElement.dataset.skin || 'ledger'")
        if shown != skin: problems.append(f"theme didn't apply: asked for {skin!r}, the page shows {shown!r}")
        page.get_by_text("+ New character").first.click(); page.wait_for_timeout(300)
        page.get_by_text("Blank character sheet").first.click(); page.wait_for_timeout(800)
        tabs = page.get_by_role("tab")
        n = tabs.count()
        if n < 3: problems.append(f"expected the sheet's tabs, found {n}")
        for i in range(n):
            tabs.nth(i).click(); page.wait_for_timeout(250)
            if page.evaluate("document.documentElement.scrollWidth > innerWidth + 1"):
                problems.append(f"sideways scroll on tab {tabs.nth(i).inner_text().strip()!r}")
        page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=False)
        if games:   # the hidden games (keyboard triggers), once per run
            page.locator("body").click(position={"x": 5, "y": 5}); page.keyboard.type("steam"); page.wait_for_timeout(400)
            if not page.locator("#cw-egg").count(): problems.append("Skyward Boiler didn't open")
            page.keyboard.press("Escape"); page.wait_for_timeout(200)
            page.keyboard.type("furnace"); page.wait_for_timeout(2500)
            if not page.locator("#cw-doom").count(): problems.append("Furnace Below didn't open")
            page.keyboard.press("Escape"); page.wait_for_timeout(200)
    except Exception as e:
        problems.append(f"step failed: {e}")
        try: page.screenshot(path=str(SHOTS / f"{name}-failed.png"))
        except Exception: pass
    ctx.close()
    return name, problems

def main():
    srv, url = serve(); failed = False
    with sync_playwright() as p:
        browser = p.chromium.launch()
        # Every theme in the picker (new themes are picked up automatically), at a desktop width and at 390 px.
        probe = browser.new_page(); probe.goto(url); probe.wait_for_timeout(1000)
        skins = probe.evaluate("[...document.querySelector('.skinpick select').options].map(o => o.value)"); probe.close()
        if len(skins) < 2: print(f"FAIL couldn't read the theme list ({skins})"); sys.exit(1)
        print(f"themes: {', '.join(skins)}")
        for width, height, mobile in [(1280, 860, False), (390, 844, True)]:
            for i, skin in enumerate(skins):
                name, problems = run_case(browser, url, width, height, skin, mobile, games=(i == 0 and not mobile))
                print(("FAIL " if problems else "ok   ") + name)
                for pr in problems: print("     - " + pr)
                failed |= bool(problems)
        browser.close()
    srv.shutdown()
    sys.exit(1 if failed else 0)

main()
