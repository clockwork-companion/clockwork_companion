"""Crafting → Hunting: carving trophies (the Salvaging Roll), the belt (attuning, Release), and merging (the Combining Roll).

    python3 tests/hunting.py SITE_DIR [SHOTS_DIR]

Runs in "this browser only" mode on a character with Hunting 10 (modifier 30%), at desktop and 390 px, with every die a 1
(1 − 30 = −29: 7 positives on the table, held to 5 on a level 3 trophy; the last property rolls −29, so it's void).
"""
import functools, http.server, json, os, pathlib, sys, threading
from playwright.sync_api import sync_playwright

SITE = pathlib.Path(sys.argv[1]).resolve(); SHOTS = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "smoke-shots"); SHOTS.mkdir(parents=True, exist_ok=True)
BLOCK = ("gstatic.com", "googleapis.com", "firebaseio.com", "firebaseapp.com", "identitytoolkit", "securetoken")
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(SITE))); threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{srv.server_address[1]}/index.html"
checks = []
def check(name, ok, got=""): checks.append(ok); print(("ok   " if ok else "FAIL ") + name + (f"  ({got})" if got and not ok else ""))
HUNTER = {"modules": {"craft": True, "magic": False}, "id": "hu", "name": "Batbayar", "players": [], "attrs": {k: {"base": 20, "value": 20} for k in ["STR", "DEX", "END", "MND", "WIL", "WIS", "PRS"]},
          "skills": {"Hunting": 10}}

with sync_playwright() as p:
    b = p.chromium.launch(channel=os.environ.get("PW_CHANNEL") or None)
    for W in (1280, 390):
        tag = f"{W}px: "
        ctx = b.new_context(viewport={"width": W, "height": 1000}, is_mobile=W < 500, has_touch=W < 500)
        ctx.route("**/*", lambda r: r.abort() if any(x in r.request.url for x in BLOCK) else r.continue_())
        ctx.add_init_script(f"try {{ if (!localStorage.getItem('cw-companion-chars')) {{ localStorage.setItem('cw-skin', JSON.stringify('ledger')); localStorage.setItem('cw-dice', JSON.stringify('app'));"
                            f" localStorage.setItem('cw-sel', JSON.stringify('hu')); localStorage.setItem('cw-companion-chars', JSON.stringify({{ hu: {json.dumps(HUNTER)} }})); }} }} catch (e) {{}}")
        pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(url); pg.wait_for_timeout(1500)
        pg.get_by_role("tab", name="Crafting").click(); pg.wait_for_timeout(1200)
        ch = lambda: pg.evaluate("Store.chars.hu")
        check(tag + "the Hunting bench is one page: the belt on top, Carving and Merging folded under it", pg.locator(".hunting").count() == 1 and pg.locator(".huntbelt").count() == 1
              and [x.strip() for x in pg.locator(".huntdropb").all_inner_texts()] == ["Carving", "Merging"] and pg.locator(".huntdropbody").count() == 0)
        pg.evaluate("CW.rollDie = () => 1")
        # carve a level 3 fang from a chimera
        pg.locator(".huntdropb", has_text="Carving").click(); pg.wait_for_timeout(400)
        check(tag + "opening Carving swaps the belt for the beast", pg.locator(".huntcarcass").count() == 1 and pg.locator(".huntbelt").count() == 0 and pg.locator(".huntdrop.open").count() == 1)
        pg.screenshot(path=str(SHOTS / f"hunt-carve-{W}.png"), full_page=True)
        pg.locator(".hback .huntdropb").click(); pg.wait_for_timeout(400)
        check(tag + "\"← Your trophies\" brings the belt back", pg.locator(".huntbelt").count() == 1 and pg.locator(".huntdrop.open").count() == 0)
        pg.locator(".huntdropb", has_text="Merging").click(); pg.wait_for_timeout(300); pg.locator(".huntdropb", has_text="Merging").click(); pg.wait_for_timeout(300)
        check(tag + "clicking an open bar again closes it", pg.locator(".huntbelt").count() == 1)
        pg.locator(".huntdropb", has_text="Carving").click(); pg.wait_for_timeout(400)
        pg.fill("#hc-m", "Chimera"); pg.locator(".hparts .dvchip", has_text="Fang").click(); pg.locator(".huntlvl button", has_text="3").click()
        pg.locator(".forgebtn", has_text="Carve").click(); pg.wait_for_selector(".trophyform .hpe input", timeout=30000); pg.wait_for_timeout(300)
        kinds = [k.get_attribute("class").split()[-1] for k in pg.locator(".hkinds .hk").all()]
        check(tag + "−29 on a level 3 trophy: 5 positive (never all), the last one rolled: void", kinds == ["hp-pos"] * 5 + ["hp-void"], kinds)
        ins = pg.locator(".trophyform .hpe input")
        for i in range(5): ins.nth(i).fill(f"Power {i + 1}")
        pg.locator(".trophyform .btn.primary").click(); pg.wait_for_timeout(1500)
        t = ch()["craft"]["hunt"]["trophies"]
        check(tag + "the trophy is saved: name, monster, part, level, properties", len(t) == 1 and t[0]["n"] == "Chimera's Fang" and t[0]["monster"] == "Chimera" and t[0]["part"] == "fang"
              and t[0]["lvl"] == 3 and [p["kind"] for p in t[0]["props"]] == ["pos"] * 5 + ["void"] and t[0]["props"][0]["t"] == "Power 1", t)
        check(tag + "and it's back on the trophy case, Carving folded", pg.locator(".huntcard").count() == 1 and pg.locator(".huntdropbody").count() == 0)
        # one found by hand
        pg.locator(".hadd").click(); pg.fill("#tf-n", "Wyrm Scale"); pg.locator(".trophyform .hpe input").first.fill("+2 AV against fire")
        pg.locator(".trophyform .btn.primary").click(); pg.wait_for_timeout(400)
        # belt, attune, release
        for nm in ["Chimera's Fang", "Wyrm Scale"]: pg.locator(".huntcard").filter(has_text=nm).locator(".hcardbtns .hbeltbtn").click(); pg.wait_for_timeout(250)
        pg.wait_for_timeout(1500)
        check(tag + "two trophies hang from the belt", pg.locator(".hbcharm").count() == 2 and sum(x["belted"] for x in ch()["craft"]["hunt"]["trophies"]) == 2)
        pg.locator(".hbcharm").first.click(force=True); pg.locator(".huntsel .btn", has_text="Attune").click(); pg.wait_for_timeout(300)
        pg.locator(".hbcharm").nth(1).click(force=True); pg.locator(".huntsel .btn", has_text="Attune").first.click(); pg.wait_for_timeout(1500)
        h = ch()["craft"]["hunt"]
        check(tag + "one attuned at a time", [x["attuned"] for x in h["trophies"]] == [False, True], [x["attuned"] for x in h["trophies"]])
        pg.locator(".huntsel .btn", has_text="Release").click(); pg.wait_for_timeout(1500)
        c = ch()
        check(tag + "Release: 3 turns, 1 Stamina", c["craft"]["hunt"]["release"]["turns"] == 3 and c["vitals"]["exhaustion"] == 1, (c["craft"]["hunt"]["release"], c["vitals"].get("exhaustion")))
        for _ in range(3): pg.locator(".huntsel .btn", has_text="End of turn").click(); pg.wait_for_timeout(200)
        pg.wait_for_timeout(1500)
        check(tag + "after 3 turns the release ends", ch()["craft"]["hunt"]["release"] is None)
        # merge: the fang gives to the scale; −29 passes up to 8, the fang has 5
        pg.screenshot(path=str(SHOTS / f"hunt-case-{W}.png"), full_page=True)
        pg.locator(".huntdropb", has_text="Merging").click(); pg.wait_for_timeout(400)
        check(tag + "opening Merging swaps in the altar", pg.locator(".huntaltar").count() == 1 and pg.locator(".huntbelt").count() == 0)
        pg.locator(".hmergepick").nth(0).locator(".hmchip", has_text="Wyrm").click(); pg.locator(".hmergepick").nth(1).locator(".hmchip", has_text="Chimera").click()
        pg.locator(".forgebtn", has_text="Merge").click(); pg.wait_for_selector(".huntread .btn.primary", timeout=30000); pg.wait_for_timeout(300)
        check(tag + "−29 on the Combining Roll: up to 8 pass, the giver has 5", "8 positive properties can pass" in pg.locator(".huntread").inner_text())
        pg.screenshot(path=str(SHOTS / f"hunt-merge-{W}.png"), full_page=True)
        pg.locator(".huntread .btn.primary").click(); pg.wait_for_timeout(1500)
        t = ch()["craft"]["hunt"]["trophies"]
        check(tag + "the giver burns; its 5 positives fill the scale's void, then are added", len(t) == 1 and t[0]["n"] == "Wyrm Scale"
              and [p["kind"] for p in t[0]["props"]] == ["pos"] * 6 and [p["t"] for p in t[0]["props"]][1] == "Power 1" and t[0]["merged"] == ["Chimera's Fang"], t)
        check(tag + "no sideways scroll", not pg.evaluate("document.documentElement.scrollWidth > innerWidth + 1"))
        check(tag + "no page errors", not errs, errs[:3])
        ctx.close()
    # the rules, pure
    pg = b.new_page(); pg.goto(url); pg.wait_for_timeout(800)
    r = pg.evaluate("""(() => ({
      ex: CW.salvagePlan(3, -14), fail: CW.salvagePlan(2, 85).fail, all: CW.salvagePlan(2, 75), n53: CW.salvagePlan(3, 53),
      rest: [CW.salvageRest(62), CW.salvageRest(50)], comb: [85, 79, 59, 49, 29, -31].map(t => CW.combineCount(t).n),
      lv: [2, 3, 4, 7, 10].map(l => CW.huntState(CW.normalize({ skills: { Hunting: l } })).maxLvl) }))()""")
    check("the book's example: level 3, −14 → 5 positive, 1 to roll", r["ex"]["pos"] == 5 and r["ex"]["rest"] == 1, r["ex"])
    check("81 or more: no trophy; 71-80: all negative", r["fail"] and r["all"]["neg"] == 4, r["all"])
    check("53: one negative, five to roll", r["n53"]["neg"] == 1 and r["n53"]["rest"] == 5, r["n53"])
    check("a property rolled alone: 62 negative, 50 void", r["rest"] == ["neg", "void"], r["rest"])
    check("Combining Roll: 0, 0, 1, 2, 3 … 9", r["comb"] == [0, 0, 1, 2, 3, 9], r["comb"])
    check("trophies you can use: none at 2, level 1 at 3, +1 a point, at most 5", r["lv"] == [0, 1, 2, 5, 5], r["lv"])
    b.close()

print("PASS" if all(checks) else "FAIL"); sys.exit(0 if all(checks) else 1)
