"""Dreamwalking (the Magic tab): the Toll, entering the realm, manipulations, the vault, dreamspheres and dreamseeds.

    python3 tests/dreamwalking.py SITE_DIR [SHOTS_DIR]

Runs in "this browser only" mode on a character with Dreamwalking 10 (Willpower 17), at desktop and 390 px.
Rules from the 2020.1 book (12.3): bonus = modifier − Toll; Calamity = 5% + Toll; travellers +8% each; dreaming while
awake +15%; observation +5%; sphere +4% per 2 m, +5% per extra turn; dreamseeds past two +15% each; a long rest clears
Tolls and brings lost items back.
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
WALKER = {"modules": {"craft": True, "magic": True}, "id": "dw", "name": "Batbayar", "players": [], "attrs": {"WIL": {"base": 17, "value": 17}}, "skills": {"Dreamwalking": 10},
          "items": [{"id": "i1", "name": "Lantern", "qty": 1, "size": "small"}, {"id": "i2", "name": "Silver key", "qty": 1, "size": "small"}],
          "weapons": [{"id": "w1", "name": "Old sabre"}], "armor": [{"id": "a1", "name": "Ringmail", "type": "medium", "worn": True}]}
PLAIN = {"modules": {"craft": True, "magic": True}, "id": "pl", "name": "Plain", "players": [], "skills": {"Warding": 3}}

with sync_playwright() as p:
    b = p.chromium.launch()
    for W, skin in [(1280, "ledger"), (390, "moss")]:
        tag = f"{W}px {skin}: "
        ctx = b.new_context(viewport={"width": W, "height": 900}, is_mobile=W < 500, has_touch=W < 500)
        ctx.route("**/*", lambda r: r.abort() if any(x in r.request.url for x in BLOCK) else r.continue_())
        ctx.add_init_script(f"try {{ localStorage.setItem('cw-skin', JSON.stringify('{skin}')); localStorage.setItem('cw-dice', JSON.stringify('app'));"
                            f" if (!localStorage.getItem('cw-companion-chars')) {{ localStorage.setItem('cw-sel', JSON.stringify('pl')); localStorage.setItem('cw-tab', JSON.stringify('magic'));"
                            f" localStorage.setItem('cw-companion-chars', JSON.stringify({{ dw: {json.dumps(WALKER)}, pl: {json.dumps(PLAIN)} }})); }} }} catch (e) {{}}")
        pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(url); pg.wait_for_timeout(1500)
        check(tag + "no Dreamwalking, no dreamscape", pg.locator(".dreamwalking").count() == 0)
        pg.evaluate("localStorage.setItem('cw-sel', JSON.stringify('dw'))"); pg.reload(); pg.wait_for_timeout(1500)
        pg.get_by_role("tab", name="Magic").click(); pg.wait_for_timeout(500)
        pg.evaluate("CW.rollDie = () => 20")   # every roll is a 20: 20 − 30 = −10
        ch = lambda: pg.evaluate("Store.chars.dw")
        fact = lambda k: next((" ".join(f.split()) for f in pg.locator(".dreamhead .fact").all_inner_texts() if f.lower().startswith(k.lower())), "")
        check(tag + "Dreamwalking 10: modifier 30%, Toll 0, bonus 30%, Calamity 5%", "30%" in fact("Modifier") and fact("Toll").endswith("0%") and "30%" in fact("Your bonus") and "5%" in fact("Calamity"),
              [fact(k) for k in ("Modifier", "Toll", "Your bonus", "Calamity")])
        # enter while awake with two travellers: +15% and +16%, with a check carrying their Toll
        pg.locator(".dreamacts .btn", has_text="Enter the dream realm").click()
        pg.locator(".dreamform .demonguard input").check()
        pg.locator(".dreamform .iconbtn[aria-label='One more traveller']").click(); pg.locator(".dreamform .iconbtn[aria-label='One more traveller']").click()
        pg.locator(".dreamform .btn.primary", has_text="Enter").click(); pg.wait_for_timeout(1500)
        c = ch()
        check(tag + "in the dream realm, awake, with 2 travellers: Toll 31%", c["dream"]["inRealm"] and c["dream"]["mundane"] and c["dream"]["travelers"] == 2 and fact("Toll").endswith("31%"), (c["dream"], fact("Toll")))
        check(tag + "past 30%, the dreamscape turns to nightmare", pg.locator(".dreamf.nightmare").count() == 1)
        check(tag + "the sleeper dreams: the bubble is open and, past 30%, it's a nightmare with shadow hands", pg.locator(".dreamscene.open.mood-night").count() == 1
              and float(pg.evaluate("getComputedStyle(document.querySelector('.drhand')).opacity")) > 0)
        # translocate something: the GM's Toll held while it lasts
        pg.locator(".dreamacts .btn", has_text="Translocate").click()
        pg.fill("#dm-what-loc", "the iron gate"); pg.fill("#dm-pct-loc", "12"); pg.fill("#dr-dc-Translocate", "50")
        pg.locator(".dreamform .btn.primary", has_text="Translocate").click(); pg.wait_for_timeout(1500)
        check(tag + "a translocation holds 12% (Toll 43%)", any(t["pct"] == 12 for t in ch()["dream"]["tolls"]) and fact("Toll").endswith("43%"), fact("Toll"))
        pg.locator(".dreamform .btn", has_text="Done").click()
        pg.locator(".dtpart .iconbtn").first.click(); pg.wait_for_timeout(1500)
        check(tag + "releasing it lets the Toll go (31%)", not ch()["dream"]["tolls"] and fact("Toll").endswith("31%"), fact("Toll"))
        pg.locator(".dreamacts .btn", has_text="Wake up").click(); pg.wait_for_timeout(1500)
        check(tag + "waking ends the visit's Toll (0%)", not ch()["dream"]["inRealm"] and fact("Toll").endswith("0%"), fact("Toll"))
        check(tag + "waking pops the bubble and the sleeper starts", pg.locator(".dreamscene.mood-awake:not(.open)").count() == 1 and pg.locator(".drpop").count() == 1)
        # observation: a use and +5% until a long rest
        pg.locator(".dreamacts .btn", has_text="Observe").click(); pg.wait_for_timeout(1500)
        check(tag + "observation: +5% Toll, one of 2 uses", fact("Toll").endswith("5%") and ch()["uses"].get("p:Dreamwalking:6") == 1)
        # a 24 m dreamsphere: +8%; held one extra turn: +5%
        pg.locator(".dreamacts .btn", has_text="Dreamsphere").click(); pg.locator(".dreamform .iconbtn[aria-label^='Larger']").click(); pg.locator(".dreamform .iconbtn[aria-label^='Larger']").click()
        pg.locator(".dreamform .btn.primary", has_text="Open it").click(); pg.wait_for_timeout(300)
        check(tag + "a 24 m sphere: +8% Toll (13%), 3 turns", fact("Toll").endswith("13%") and pg.locator(".drsphere").count() == 1, fact("Toll"))
        for _ in range(3): pg.locator(".sphereon .btn", has_text="End of turn").click(); pg.wait_for_timeout(100)
        pg.locator(".sphereon .btn.primary", has_text="Hold it open").click(); pg.wait_for_timeout(1500)
        check(tag + "held open one more turn: +5% (18%)", fact("Toll").endswith("18%") and ch()["dream"]["sphere"]["extra"] == 1, fact("Toll"))
        pg.locator(".sphereon .btn", has_text="Close the sphere").click(); pg.wait_for_timeout(300)
        # the vault: an item leaves the inventory, floats in the dreamscape, and comes back
        pg.locator(".dreamvault .btn", has_text="Send something").click(); pg.locator(".dvchip", has_text="Lantern").click(); pg.fill("#dv-pct", "3")
        pg.locator(".dreamvault .btn.primary", has_text="Send it").click(); pg.wait_for_timeout(1500)
        c = ch()
        check(tag + "the Lantern leaves the inventory for the dream realm (+3%)", not any(i["name"] == "Lantern" for i in c["items"]) and c["dream"]["vault"][0]["name"] == "Lantern"
              and pg.locator(".drbubble").count() == 1 and fact("Toll").endswith("8%"), (c["dream"]["vault"], fact("Toll")))
        pg.locator(".dvitem .btn", has_text="Bring it back").click(); pg.wait_for_timeout(1500)
        check(tag + "and comes back", any(i["name"] == "Lantern" for i in ch()["items"]) and not ch()["dream"]["vault"])
        # weapons and armor go too (a worn suit is taken off), and come back to Gear
        pg.locator(".dreamvault .btn", has_text="Send something").click(); pg.locator(".dvchip", has_text="Old sabre").click(); pg.fill("#dv-pct", "4")
        pg.locator(".dreamvault .btn.primary", has_text="Send it").click(); pg.wait_for_timeout(300)
        pg.locator(".dreamvault .btn", has_text="Send something").click(); pg.locator(".dvchip", has_text="Ringmail").click()
        check(tag + "a worn suit says it will come off", "take it off" in pg.locator(".dreamvault").inner_text())
        pg.fill("#dv-pct", "6"); pg.locator(".dreamvault .btn.primary", has_text="Send it").click(); pg.wait_for_timeout(1500)
        c = ch()
        check(tag + "the sabre and the ringmail leave Gear for the dream realm", not c["weapons"] and not c["armor"] and sorted(v.get("kind") for v in c["dream"]["vault"]) == ["armor", "weapon"]
              and pg.locator(".drbubble").count() == 2, c["dream"]["vault"])
        for _ in range(2): pg.locator(".dvitem .btn", has_text="Bring it back").first.click(); pg.wait_for_timeout(300)
        pg.wait_for_timeout(1500); c = ch()
        check(tag + "and come back to Gear, the suit taken off", [w["name"] for w in c["weapons"]] == ["Old sabre"] and [(a["name"], a["worn"]) for a in c["armor"]] == [("Ringmail", False)], (c["weapons"], c["armor"]))
        # the dreamsphere can be dragged about the scene
        pg.locator(".dreamacts .btn", has_text="Dreamsphere").click(); pg.locator(".dreamform .btn.primary", has_text="Open it").click(); pg.wait_for_timeout(400)
        pg.locator(".dreamscene").scroll_into_view_if_needed(); bx = pg.locator(".drsphereb circle").bounding_box(); cx, cy = bx["x"] + bx["width"] / 2, bx["y"] + bx["height"] / 2
        pg.mouse.move(cx, cy); pg.mouse.down(); pg.mouse.move(cx + bx["width"] * .6, cy - bx["height"] * .3, steps=8); pg.mouse.up(); pg.wait_for_timeout(1500)
        sp = ch()["dream"]["sphere"]
        check(tag + "dragging the dreamsphere moves it (and it stays put)", sp.get("x", 236) > 280 and sp.get("y", 262) < 262, sp)
        pg.locator(".sphereon .btn", has_text="Close the sphere").click(); pg.wait_for_timeout(300)
        # dreamseeds: two free, the third +15%
        for n in ["Brass button", "Moth wing", "Wolf tooth"]:
            pg.fill("#ds-n", n); pg.locator(".dreamseeds .btn", has_text="Make it a dreamseed").click(); pg.wait_for_timeout(150)
        check(tag + "a third dreamseed adds 15% (5% + 15% = 20%)", fact("Toll").endswith("20%"), fact("Toll"))
        pg.wait_for_timeout(1500)
        msg = pg.evaluate("(() => { const x = CW.normalize(JSON.parse(JSON.stringify(Store.chars.dw))); const m = CW.longRest(x, 0); return [m, CW.dreamState(x).toll]; })()")
        check(tag + "a long rest clears the Tolls but not the dreamseeds' (15%)", "dreamwalking Toll cleared" in msg[0] and msg[1] == 15, msg)
        check(tag + "no sideways scroll", not pg.evaluate("document.documentElement.scrollWidth > innerWidth + 1"))
        check(tag + "no page errors", not errs, errs[:3])
        pg.locator(".dreamf").screenshot(path=str(SHOTS / f"dreamwalking-{W}.png"))
        ctx.close()
    b.close()

print("PASS" if all(checks) else "FAIL"); sys.exit(0 if all(checks) else 1)
