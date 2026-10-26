"""Custom Powdertinkering parts: add a coat, a tip, a core (a new element) and a status of that element, use them in a
recipe, forge it, and remove one again.

    python3 tests/powder_custom.py SITE_DIR [SHOTS_DIR]

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
CH = {"modules": {"craft": True, "magic": True}, "id": "tink", "players": [], "name": "Tinker", "attrs": {"WIS": {"base": 17, "value": 17}, "MND": {"base": 17, "value": 17}}, "skills": {"Powdertinker": 7},
      "craft": {"supplies": {"container": 5000}, "recipe": {"type": "rifle"}}}

with sync_playwright() as p:
    b = p.chromium.launch()
    for W, skin in [(1280, "ledger"), (390, "moss")]:
        tag = f"{W}px {skin}: "
        ctx = b.new_context(viewport={"width": W, "height": 900}, is_mobile=W < 500, has_touch=W < 500)
        ctx.route("**/*", lambda r: r.abort() if any(x in r.request.url for x in BLOCK) else r.continue_())
        ctx.add_init_script(f"try {{ localStorage.setItem('cw-skin', JSON.stringify('{skin}')); localStorage.setItem('cw-dice', JSON.stringify('app'));"
                            f" localStorage.setItem('cw-craft-sub', JSON.stringify('powder')); localStorage.setItem('cw-tab', JSON.stringify('craft'));"
                            f" localStorage.setItem('cw-sel', JSON.stringify('tink')); localStorage.setItem('cw-companion-chars', JSON.stringify({{ tink: {json.dumps(CH)} }})); }} catch (e) {{}}")
        pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(url); pg.wait_for_timeout(1500)
        pg.get_by_role("tab", name="Crafting").click(); pg.wait_for_timeout(500)
        if pg.locator(".craftnav .cn-powder").count(): pg.locator(".craftnav .cn-powder").click(); pg.wait_for_timeout(300)
        check(tag + "Powdertinkering bench is open", pg.locator(".ptlabel").count() > 0)
        stray = pg.evaluate("(t => { const i = t.search(/\\*\\/|\\{ ?[a-z-]+: /); return i < 0 ? '' : t.slice(Math.max(0, i - 40), i + 60); })(document.body.innerText)")
        check(tag + "no stylesheet text shows on the page", not stray, stray)
        me = lambda: pg.evaluate("JSON.parse(JSON.stringify(Store.chars.tink.craft))")
        def add(part, name, dc, extra=None):
            pg.locator(".ptlabel", has_text={"coat": "Coat", "tip": "Tips", "core": "Core", "status": "Status", "area": "Area"}[part]).first.click(); pg.wait_for_timeout(200)
            pg.locator(".ptaddown").click(); pg.wait_for_timeout(150)
            pg.fill(f"#pf-{part}-n", name); pg.fill(f"#pf-{part}-dc", str(dc)); pg.fill(f"#pf-{part}-w", f"{name} does something")
            if extra: extra()
            pg.locator(".ptform .btn.primary").click(); pg.wait_for_timeout(300)
        add("coat", "Silvered", 55)
        check(tag + "a custom coat is listed, tagged", pg.locator(".ptopt", has_text="Silvered").locator(".flag", has_text="custom").count() == 1)
        pg.locator(".ptopt .ptcheck", has_text="Silvered").click(); pg.wait_for_timeout(150)
        add("tip", "Hollow point", 45)
        pg.locator(".ptopt .ptcheck", has_text="Hollow point").click(); pg.wait_for_timeout(150)
        add("core", "Steam", 35)
        pg.locator(".ptel", has_text="Steam").click(); pg.wait_for_timeout(150)
        check(tag + "a custom core is a new element with its own supply", pg.locator(f"label[for='sup-Steam{CH['id']}']").count() == 1)
        add("status", "Scalded", 30)
        pg.locator(".ptopt .ptcheck", has_text="Scalded").click(); pg.wait_for_timeout(1500)   # the sheet saves shortly after a change
        cr = me()
        check(tag + "the parts are saved on the character", sorted(x["n"] for x in cr["parts"]) == ["Hollow point", "Scalded", "Silvered", "Steam"] and any(x["n"] == "Scalded" and x["el"] == "Steam" for x in cr["parts"]), cr["parts"])
        steps = pg.evaluate("CW.ptSteps(Store.chars.tink, Store.chars.tink.craft.recipe).map(s => s.label + '|' + s.dc)")
        check(tag + "they become steps with their own difficulty", steps == ["Silvered coat|55", "Hollow point (7)|45", "Steam core (3)|35", "Scalded (3)|30"], steps)
        pg.screenshot(path=str(SHOTS / f"powder-custom-{W}.png"), full_page=False)
        check(tag + "no sideways scroll", not pg.evaluate("document.documentElement.scrollWidth > innerWidth + 1"))
        # removing the core takes its status and the recipe's core with it
        pg.locator(".ptlabel", has_text="Core").first.click(); pg.wait_for_timeout(150)
        check(tag + "the core's rating row shows once", pg.locator(".ptpick.part-core .ptrate").count() == 1)
        pg.locator(".ptpick .ptdel[aria-label='Remove Steam']").click(); pg.wait_for_timeout(1500)
        cr = me()
        check(tag + "removing a custom core takes its statuses off too", sorted(x["n"] for x in cr["parts"]) == ["Hollow point", "Silvered"] and not cr["recipe"].get("core"), (cr["parts"], cr["recipe"]))
        check(tag + "no page errors", not errs, errs[:3])
        ctx.close()
    b.close()
srv.shutdown()
print("PASS" if all(checks) else "FAIL"); sys.exit(0 if all(checks) else 1)
