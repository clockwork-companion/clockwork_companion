"""Alchemy (the Magic tab): the circle designer and book, Signature Circles, life energy, the check and re-roll, arrays.

    python3 tests/alchemy.py SITE_DIR [SHOTS_DIR]

Runs in "this browser only" mode on a character with Alchemy 9, at desktop and 390 px.
Rules from the 2020.1 book (10.2): the circle size table; (SP/2)d6 energy from the earth (4), a Medium or larger circle
eats a ration; Signature Circles at 6 (Medium or below) and 9 (Large or below); arrays at 8; re-roll at 9.
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
ALCHEMIST = {"modules": {"craft": True, "magic": True}, "id": "al", "name": "Edda", "players": [], "attrs": {"MND": {"base": 15, "value": 15}}, "skills": {"Alchemy": 9},
             "items": [{"id": "r", "name": "Rations", "qty": 3, "size": "small"}]}
PLAIN = {"modules": {"craft": True, "magic": True}, "id": "pl", "name": "Plain", "players": [], "skills": {"Warding": 3}}

with sync_playwright() as p:
    b = p.chromium.launch()
    for W, skin in [(1280, "ledger"), (390, "moss")]:
        tag = f"{W}px {skin}: "
        ctx = b.new_context(viewport={"width": W, "height": 900}, is_mobile=W < 500, has_touch=W < 500)
        ctx.route("**/*", lambda r: r.abort() if any(x in r.request.url for x in BLOCK) else r.continue_())
        ctx.add_init_script(f"try {{ localStorage.setItem('cw-skin', JSON.stringify('{skin}')); localStorage.setItem('cw-dice', JSON.stringify('app'));"
                            f" if (!localStorage.getItem('cw-companion-chars')) {{ localStorage.setItem('cw-sel', JSON.stringify('pl')); localStorage.setItem('cw-tab', JSON.stringify('magic'));"
                            f" localStorage.setItem('cw-companion-chars', JSON.stringify({{ al: {json.dumps(ALCHEMIST)}, pl: {json.dumps(PLAIN)} }})); }} }} catch (e) {{}}")
        pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(url); pg.wait_for_timeout(1500)
        check(tag + "no Alchemy, no circle book", pg.locator(".alchemy").count() == 0)
        pg.evaluate("localStorage.setItem('cw-sel', JSON.stringify('al'))"); pg.reload(); pg.wait_for_timeout(1500)
        pg.get_by_role("tab", name="Magic").click(); pg.wait_for_timeout(500)
        pg.evaluate("CW.rollDie = () => 20")
        ch = lambda: pg.evaluate("Store.chars.al")
        facts = " | ".join(" ".join(f.split()) for f in pg.locator(".alchhead .fact").all_inner_texts()).lower()
        check(tag + "Alchemy 9: 27%, 4d6 from the earth, 2 Signature Circles", "27%" in facts and "4d6" in facts and "0 of 2" in facts, facts)
        # draw a circle: a fresh one starts with seven layers; add spokes; Medium; a Signature Circle
        pg.locator(".alchthumb.new").click(); pg.wait_for_timeout(200)
        check(tag + "a new circle starts with seven layers", pg.locator(".alchlayer").count() == 7)
        check(tag + "the key says what the circle's signs mean", "Heat and energy" in pg.locator(".alchkey").inner_text())
        before = pg.evaluate("document.querySelector('.alchfig.big .alayers').innerHTML")
        pg.locator(".alchrandom .btn").click(); pg.wait_for_timeout(300)
        check(tag + "Random circle draws a new one", pg.evaluate("document.querySelector('.alchfig.big .alayers').innerHTML") != before and pg.locator(".alchlayer").count() >= 6)
        for k in ["Moons", "Petals", "Sun rays", "Dots", "Inscription"]: pg.locator(".alchadd .btn", has_text=k).click()
        pg.locator(".alchwords").fill("as above so below"); pg.wait_for_timeout(200)
        drawn = pg.evaluate("(() => { const f = document.querySelector('.alchfig.big'), w = [...f.querySelectorAll('.alayer.words text')].pop(), d = [...f.querySelectorAll('.alayer.dots')].pop(); return [w && w.textContent, d && d.querySelectorAll('circle').length]; })()")
        check(tag + "moons, petals, rays, dots and an inscription draw", (drawn[0] or "").startswith("AS ABOVE SO BELOW") and drawn[1] == 12, drawn)
        pg.locator(".alchlayer").first.locator(".btn", has_text="Line").click()
        check(tag + "a ring can be dashed", "dashed" in pg.locator(".alchlayer").first.inner_text().lower())
        pg.locator(".alchadd .btn", has_text="Spokes").click()
        pg.locator(".alchmeta input").nth(0).fill("Circle of Rust Undone"); pg.locator(".alchmeta input").nth(1).fill("Breaks iron oxide back into iron")
        pg.locator(".alchsize", has_text="Huge").click()
        check(tag + "a Huge circle: 1 to 5 minutes to draw, 1 A to activate; too big for a Signature Circle",
              "1 to 5 minutes to draw, 1 A to activate" in pg.locator(".alchtimes").inner_text() and pg.locator(".alchsave input").is_disabled(), pg.locator(".alchtimes").inner_text())
        pg.locator(".alchsize", has_text="Medium").click(); pg.locator(".alchsave input").check()
        pg.locator(".alchsave .btn.primary").click(); pg.wait_for_timeout(1500)
        c = ch()["alch"]["circles"]
        check(tag + "saved to the circle book: its layers, Medium, a Signature Circle", len(c) == 1 and len(c[0]["layers"]) >= 12 and c[0]["size"] == "medium" and c[0]["sig"] and c[0]["purpose"].startswith("Breaks"),
              c and {k: v for k, v in c[0].items() if k != "layers"})
        check(tag + "the book shows it", pg.locator(".alchthumb.sig", has_text="Circle of Rust Undone").count() == 1)
        # energy: 4d6 (all 20s here), and the Medium circle eats a ration
        pg.locator(".alchuse .btn", has_text="Draw energy").click(); pg.wait_for_timeout(1500)
        c = ch()
        check(tag + "energy drawn, a ration eaten (3 → 2)", "80" in pg.locator(".alchenergy").inner_text() and next(i for i in c["items"] if i["name"] == "Rations")["qty"] == 2, pg.locator(".alchenergy").inner_text())
        # activate: 20 − 27 = −7 under 30 works; the circle lights up; one re-roll at Alchemy 9
        pg.fill(f"#al-dc-{c['alch']['circles'][0]['id']}", "30"); pg.locator(".alchuse .btn.primary").click(); pg.wait_for_timeout(400)
        check(tag + "activating lights the circle up", pg.locator(".alchfig.big.active").count() == 1)
        check(tag + "20 − 27 = −7 under 30: it works", "it works" in pg.locator(".alchuse").inner_text())
        pg.wait_for_timeout(2400)
        pg.locator(".alchuse .btn", has_text="Re-roll").click(); pg.wait_for_timeout(1500)
        check(tag + "one re-roll, written in the ledger", pg.locator(".alchuse .btn", has_text="Re-roll").count() == 0 and "re-rolled" in ch()["alch"]["ledger"][0]["what"])
        # arrays: embed the circle in the torso, 5 hours at a time
        pg.locator(".alcharrayh", has_text="Torso").click(); pg.locator(".alcharrayedit .dvchip", has_text="Circle of Rust Undone").click(); pg.wait_for_timeout(200)
        pg.locator(".alcharrayedit .iconbtn[aria-label='5 more hours']").click(); pg.wait_for_timeout(1500)
        a = ch()["alch"]["arrays"].get("torso", {})
        check(tag + "embedding in the torso: 5 of 75 hours", a.get("circle") == ch()["alch"]["circles"][0]["id"] and a.get("hours") == 5 and a.get("need") == 75, a)
        # erasing the circle takes its array with it
        pg.locator(".alchsave .btn.danger").click(); pg.locator(".alchsave .btn.danger").click(); pg.wait_for_timeout(1500)
        check(tag + "erasing a circle removes it and its array", not ch()["alch"]["circles"] and not ch()["alch"]["arrays"])
        check(tag + "no sideways scroll", not pg.evaluate("document.documentElement.scrollWidth > innerWidth + 1"))
        check(tag + "no page errors", not errs, errs[:3])
        ctx.close()
    b.close()

print("PASS" if all(checks) else "FAIL"); sys.exit(0 if all(checks) else 1)
