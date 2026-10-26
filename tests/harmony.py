"""Occult: Harmony (the Magic tab): learning elements, reinforcing chakras, Affinity, the level 5 Active, releasing.

    python3 tests/harmony.py SITE_DIR [SHOTS_DIR]

Runs in "this browser only" mode on a character with Occult: Harmony 7, at desktop and 390 px.
Rules from the 2020.1 book (12.4): a chakra opens at each level 3-10; elements at 3, 5, 7, 10; Affinity = chakras
holding the element + Aether (1 per released chakra); released for SP turns; closing costs 1 Stamina per chakra.
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
MONK = {"modules": {"craft": True, "magic": True}, "id": "hm", "name": "Ayla", "players": [], "attrs": {"WIL": {"base": 17, "value": 17}}, "skills": {"Occult: Harmony": 7}}
WARDER = {"modules": {"craft": True, "magic": True}, "id": "wd", "name": "Batbayar", "players": [], "attrs": {"WIL": {"base": 17, "value": 17}}, "skills": {"Warding": 3}}

with sync_playwright() as p:
    b = p.chromium.launch()
    for W, skin in [(1280, "ledger"), (390, "moss")]:
        tag = f"{W}px {skin}: "
        ctx = b.new_context(viewport={"width": W, "height": 900}, is_mobile=W < 500, has_touch=W < 500)
        ctx.route("**/*", lambda r: r.abort() if any(x in r.request.url for x in BLOCK) else r.continue_())
        ctx.add_init_script(f"try {{ localStorage.setItem('cw-skin', JSON.stringify('{skin}')); localStorage.setItem('cw-dice', JSON.stringify('app'));"
                            f" if (!localStorage.getItem('cw-companion-chars')) {{ localStorage.setItem('cw-sel', JSON.stringify('wd')); localStorage.setItem('cw-tab', JSON.stringify('magic'));"
                            f" localStorage.setItem('cw-companion-chars', JSON.stringify({{ hm: {json.dumps(MONK)}, wd: {json.dumps(WARDER)} }})); }} }} catch (e) {{}}")
        pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(url); pg.wait_for_timeout(1500)
        schools = lambda: pg.evaluate("[...document.querySelectorAll('.magic .craftnav button span')].map(b => b.textContent)")
        check(tag + "a warder without Harmony sees no Harmony", pg.locator(".harmony").count() == 0 and "Harmony" not in schools(), schools())
        pg.evaluate("localStorage.setItem('cw-sel', JSON.stringify('hm'))"); pg.reload(); pg.wait_for_timeout(1500)
        pg.get_by_role("tab", name="Magic").click(); pg.wait_for_timeout(500)
        ch = lambda: pg.evaluate("Store.chars.hm")
        check(tag + "Harmony 7: five chakras open, the rest wait", pg.locator(".chakra.open").count() == 5 and pg.locator(".chakra.shut").count() == 3)
        # learn three elements (Harmony 3, 5 and 7)
        check(tag + "three elements to choose at Harmony 7", "3 to choose" in pg.locator(".harmlearn").inner_text().lower(), pg.locator(".harmlearn").inner_text())
        for el in ["Fire", "Water", "Spirit"]:
            pg.locator(".harmlearn").click(); pg.locator(f".harmpick .harmorb[aria-label='{el}']").click(); pg.locator(".harmpick .btn.primary").click(); pg.wait_for_timeout(250)
        pg.wait_for_timeout(1500)
        check(tag + "learned Fire, Water and Spirit; no more to choose", ch()["harmony"]["els"] == ["fire", "water", "spirit"] and pg.locator(".harmlearn").count() == 0, ch()["harmony"]["els"])
        # tap an element, then chakras: the changes wait until made over a long rest
        orb = lambda n: pg.locator(f".harmorb[aria-label^='{n},']")
        core = lambda k: pg.locator(f"[data-chakra={k}] .ccore")
        orb("Fire").click(force=True); core("opening").click()
        orb("Fire").click(force=True); core("life").click()
        orb("Water").click(force=True); core("pain").click(); pg.wait_for_timeout(300)
        check(tag + "three changes wait, nothing saved yet", pg.locator(".harmchip").count() == 3 and not ch()["harmony"]["ch"])
        core("wonder").click(); pg.wait_for_timeout(200)
        check(tag + "a chakra that isn't open yet can't be chosen", pg.locator(".harmchip").count() == 3)
        pg.locator(".harmhow .btn", has_text="Over a long rest").click(); pg.wait_for_timeout(1500)
        c = ch()
        check(tag + "made over a long rest", c["harmony"]["ch"] == {"opening": "fire", "life": "fire", "pain": "water"} and len(c["harmony"]["ledger"]) == 1, c["harmony"])
        check(tag + "Affinity: Fire 2, Water 1, Spirit 0", orb("Fire").get_attribute("aria-label") == "Fire, Affinity 2" and orb("Water").get_attribute("aria-label") == "Water, Affinity 1"
              and orb("Spirit").get_attribute("aria-label") == "Spirit, Affinity 0")
        check(tag + "the figure breathes: body, head, hands and rising motes", all(pg.locator(f".harmfig {k}").count() >= 1 for k in (".hupper", ".hhead", ".hhands", ".hmotes circle")))
        out = pg.evaluate("""(() => { const f = document.querySelector('.harmfig').getBoundingClientRect();
          return [...document.querySelectorAll('.chakra .cring')].map(c => [c.closest('.chakra').dataset.chakra, c.getBoundingClientRect()])
            .filter(([k, r]) => r.top < f.top || r.bottom > f.bottom || r.left < f.left || r.right > f.right).map(([k]) => k); })()""")
        check(tag + "every chakra sits inside the figure", not out, out)
        # the At a glance panel follows the chakras (Fire in Opening: Reflex saves; nothing on Movement yet)
        glance = lambda: " ".join(pg.locator(".glanceharm").all_inner_texts()).lower()
        check(tag + "At a glance lists what the chakras give", "from your chakras" in glance() and pg.locator(".glanceharm .harmfact").count() >= 2, glance())
        check(tag + "the powers list fills in the numbers", "add your Fire Affinity2" in pg.locator(".harmnow").inner_text(), pg.locator(".harmnow").inner_text()[:300])
        # one change with the level 5 Active: spends a use
        orb("Spirit").click(force=True); core("healing").click(); pg.wait_for_timeout(200)
        pg.locator(".harmhow .btn.primary", has_text="2 AP").click(); pg.wait_for_timeout(1500)
        c = ch()
        check(tag + "the level 5 Active changes one chakra and uses one of its 3 uses", c["harmony"]["ch"].get("healing") == "spirit" and c["uses"].get("p:Occult: Harmony:5") == 1, (c["harmony"]["ch"], c.get("uses")))
        # right-click empties a chakra (a change waiting like any other)
        core("healing").click(button="right"); pg.wait_for_timeout(200)
        check(tag + "right-click empties a chakra", "Healing: Spirit → empty" in pg.locator(".harmwait").inner_text(), pg.locator(".harmwait").inner_text())
        pg.locator(".harmhow .btn", has_text="Undo").click(); pg.wait_for_timeout(200)
        # release two chakras: Aether 2 raises every Affinity; time is SP turns; closing costs 2 Stamina
        pg.locator(".harmrelbox .btn", has_text="Release").click(); core("opening").click(); core("life").click(); pg.wait_for_timeout(1500)
        c = ch()
        check(tag + "two chakras released for 7 turns", c["harmony"]["rel"] == ["opening", "life"] and c["harmony"]["turns"] == 7, c["harmony"])
        check(tag + "Aether +2: Fire 4, Water 3, Spirit 3", orb("Fire").get_attribute("aria-label") == "Fire, Affinity 4" and orb("Water").get_attribute("aria-label") == "Water, Affinity 3"
              and orb("Spirit").get_attribute("aria-label") == "Spirit, Affinity 3")
        pg.locator(".harmrelbox .btn", has_text="Done choosing").click()
        pg.locator(".harmrelbox .btn", has_text="End of turn").click(); pg.wait_for_timeout(1500)
        check(tag + "End of turn counts down", ch()["harmony"]["turns"] == 6)
        pg.locator(".harmrelbox .btn", has_text="Close them").click(); pg.wait_for_timeout(1500)
        c = ch()
        check(tag + "closing two costs 2 Stamina", not c["harmony"]["rel"] and c["vitals"]["exhaustion"] == 2, (c["harmony"]["rel"], c["vitals"].get("exhaustion")))
        # Wind in the Opening chakra raises Movement in the top panel
        pg.evaluate("(() => { const c = Store.chars.hm; c.harmony.els = ['fire', 'water', 'wind']; c.harmony.ch = { opening: 'wind', life: 'wind' }; Store.chars.hm = { ...c }; })()")
        mv = pg.evaluate("(() => { const n = CW.normalize(JSON.parse(JSON.stringify(Store.chars.hm))); const d = CW.derived(n); return [d.move, d.baseMove, d.harmony.move]; })()")
        check(tag + "Wind 2 in the Opening chakra adds 2 m of Movement", mv[2] == 2 and mv[0] == mv[1] + 2, mv)
        check(tag + "no sideways scroll", not pg.evaluate("document.documentElement.scrollWidth > innerWidth + 1"))
        check(tag + "no page errors", not errs, errs[:3])
        pg.locator(".harmf").screenshot(path=str(SHOTS / f"harmony-{W}.png"))
        ctx.close()
    # ---- the rules (pure)
    pg = b.new_page(); pg.goto(url); pg.wait_for_timeout(800)
    r = pg.evaluate("""(() => {
      const at = l => CW.harmonyState(CW.normalize({ skills: { 'Occult: Harmony': l } }));
      const c = CW.normalize({ skills: { 'Occult: Harmony': 10 }, harmony: { els: ['earth', 'wind'], ch: { opening: 'earth', view: 'earth', death: 'earth', life: 'wind' }, rel: ['life'] } });
      const s = CW.harmonyState(c), L = t => CW.harmonyLine(t, s.aff);
      return { open: [3, 4, 5, 7, 10].map(l => at(l).open.length), learn: [2, 3, 5, 7, 10].map(l => at(l).learnMax), aff: s.aff,
        tenEarth: L(CW.CHAKRA_BY.healing.fx.earth[0]).parts.filter(p => p.v != null).map(p => p.v),
        half: L(CW.CHAKRA_BY.pain.fx.wind[0]).parts.filter(p => p.v != null).map(p => p.v),
        need: [L(CW.CHAKRA_BY.view.fx.earth[1]).need, L(CW.CHAKRA_BY.view.fx.earth[2]).need, L(CW.CHAKRA_BY.view.fx.earth[0]).need] };
    })()""")
    check("a chakra opens at each level from 3: 1, 2, 3, 5, 8", r["open"] == [1, 2, 3, 5, 8], r["open"])
    check("elements known: 0 at 2, then 1, 2, 3, 4 at levels 3, 5, 7, 10", r["learn"] == [0, 1, 2, 3, 4], r["learn"])
    check("Affinity = chakras held + Aether (Earth 3 + 1, Wind 1 + 1)", r["aff"] == {"earth": 4, "wind": 2}, r["aff"])
    check("10xEarth Affinity = 40", r["tenEarth"] == [40], r["tenEarth"])
    check("Wind Affinity/2 rounds down (2 → 1)", r["half"] == [1], r["half"])
    check("'With a … Affinity of 4/6 or higher' lines know their threshold", r["need"] == [4, 6, 0], r["need"])
    b.close()

print("PASS" if all(checks) else "FAIL"); sys.exit(0 if all(checks) else 1)
