"""Combat mode: the GM's switch, the band, the battle view (AP, vitals, gear, abilities, cards, magic pop-ups).

    python3 tests/combat.py SITE_DIR [SHOTS_DIR]

Runs in "this browser only" mode (where you are the GM) at desktop and 390 px, in the Ledger theme (light and dark).
"""
import functools, http.server, json, pathlib, sys, threading, os
from playwright.sync_api import sync_playwright

SITE = pathlib.Path(sys.argv[1]).resolve(); SHOTS = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "smoke-shots"); SHOTS.mkdir(parents=True, exist_ok=True)
BLOCK = ("gstatic.com", "googleapis.com", "firebaseio.com", "firebaseapp.com", "identitytoolkit", "securetoken")
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(SITE))); threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{srv.server_address[1]}/index.html"
checks = []
def check(name, ok, got=""): checks.append(ok); print(("ok   " if ok else "FAIL ") + name + (f"  ({got})" if got and not ok else ""))
FIGHTER = {"modules": {"craft": False, "magic": True}, "id": "ft", "name": "Batbayar", "players": [],
           "attrs": {"DEX": {"base": 15, "value": 15}, "STR": {"base": 14, "value": 14}, "WIL": {"base": 15, "value": 15}, "MND": {"base": 14, "value": 14}},
           "skills": {"Alacrity": 5, "Parry": 5, "Maim": 4, "Powdertinker": 3, "Warding": 3, "Demonology": 3, "Dreamwalking": 4},
           "weapons": [{"id": "w1", "name": "Saber", "skill": "Sword", "damage": 12, "dur": 10, "durMax": 12, "final": True},
                       {"id": "w2", "name": "Spare pistol", "skill": "Pistol", "damage": 9, "where": "pack", "final": True}],
           "armor": [{"id": "a1", "name": "Hide coat", "type": "light", "av": 2, "soak": 20, "soakMax": 30, "worn": True, "final": True}],
           "demon": {"daemons": [{"id": "b", "n": "Morrow", "wp": 11, "abilities": []}], "out": ["b"]},
           "dream": {"tolls": [{"id": "t1", "n": "Translocation", "pct": 12}]}}
OTHER = {"id": "ot", "name": "Bystander", "players": []}

with sync_playwright() as p:
    b = p.chromium.launch(channel=os.environ.get("PW_CHANNEL") or None)
    for W, theme in [(1280, "light"), (390, "dark")]:
        tag = f"{W}px {theme}: "
        ctx = b.new_context(viewport={"width": W, "height": 900}, is_mobile=W < 500, has_touch=W < 500)
        ctx.route("**/*", lambda r: r.abort() if any(x in r.request.url for x in BLOCK) else r.continue_())
        ctx.add_init_script(f"try {{ localStorage.setItem('cw-skin', JSON.stringify('ledger')); localStorage.setItem('cw-theme', JSON.stringify('{theme}')); localStorage.setItem('cw-dice', JSON.stringify('app'));"
                            f" if (!localStorage.getItem('cw-companion-chars')) {{ localStorage.setItem('cw-sel', JSON.stringify('ft'));"
                            f" localStorage.setItem('cw-companion-chars', JSON.stringify({{ ft: {json.dumps(FIGHTER)}, ot: {json.dumps(OTHER)} }})); }} }} catch (e) {{}}")
        pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(url); pg.wait_for_timeout(1500)
        ch = lambda: pg.evaluate("norm(Store.chars.ft)")
        check(tag + "no band before combat", pg.locator(".fightband").count() == 0)
        pg.locator(".fightbtn").click(); pg.wait_for_timeout(800)
        check(tag + "Start combat shows the band and the battle view", pg.locator(".fightband").count() == 1 and pg.locator(".combatview").count() == 1 and pg.locator(".tabs").count() == 0)
        check(tag + "the button hides while combat is on", pg.locator(".fightbtn").count() == 0)
        check(tag + "5 AP dots", pg.locator(".apdot.on").count() == 5, pg.locator(".apdot.on").count())
        # weapons at hand only; armor worn
        weaps = pg.locator(".cbweap .cbrowhead b").all_inner_texts()
        check(tag + "the weapon in the pack stays in Gear", weaps == ["Saber"], weaps)
        check(tag + "the worn armor shows its soak", "20" in pg.locator(".cbarmor").inner_text())
        # abilities: no crafting, no magic schools; Maim in Critical strikes
        acts = pg.locator(".cbactives").inner_text().lower()
        check(tag + "crafting and magic stay out of Abilities", "powdertinker" not in acts and "warding 3" not in acts and "critical strikes" in acts and "defence" in acts, acts[:200])
        pg.get_by_role("button", name="Start my turn").click(); pg.wait_for_timeout(800)
        # Minute Movement (Alacrity 5): 0 AP, +2 AP
        perk = pg.locator(".cbperk", has_text="Minute Movement")
        perk.get_by_role("button", name="Use", exact=True).click(); pg.wait_for_timeout(800)
        check(tag + "Minute Movement gives 2 AP", ch()["combat"]["ap"] == 7, ch()["combat"])
        check(tag + "and ticks its use", ch()["uses"].get("p:Alacrity:5") == 1, ch().get("uses"))
        # Maim 4 Carve: 1 AP
        pg.locator(".cbperk", has_text="Carve").get_by_role("button", name="Use · 1 AP").click(); pg.wait_for_timeout(800)
        check(tag + "Carve spends 1 AP", ch()["combat"]["ap"] == 6, ch()["combat"])
        # spend AP by clicking a dot, give one back by right-click
        pg.locator(".apdot.on").first.click(); pg.wait_for_timeout(200)
        pg.locator(".apdot").last.click(button="right"); pg.wait_for_timeout(800)
        check(tag + "dots spend and give back AP", ch()["combat"]["ap"] == 6, ch()["combat"])
        # a custom card with a countdown
        pg.get_by_role("button", name="+ A card").click()
        pg.locator(".cbcardform input[aria-label='Card name']").fill("Cursed by the Zhoung")
        pg.locator(".cbcardform textarea").fill("−10% to every check.")
        pg.locator(".cbformnums input").nth(1).fill("2")
        pg.get_by_role("button", name="Add card").click(); pg.wait_for_timeout(800)
        check(tag + "the card is saved", ch()["cards"][0]["name"] == "Cursed by the Zhoung" and ch()["cards"][0]["left"] == 2, ch().get("cards"))
        pg.get_by_role("button", name="End turn").click(); pg.wait_for_timeout(800)
        cb = ch()["combat"]
        check(tag + "End turn keeps AP for reactions and counts the card down", cb["turn"] is False and cb["ap"] == 6 and ch()["cards"][0]["left"] == 1, (cb, ch()["cards"]))
        # magic: Toll meter, daemon counter, Warding opens on Inscribe
        check(tag + "the Toll meter shows", "12%" in pg.locator(".cbtoll").inner_text())
        check(tag + "the daemon counter names Morrow", "Morrow" in pg.locator(".cbdaemons").inner_text())
        pg.get_by_role("button", name="Inscribe a Ward").click(); pg.wait_for_timeout(900)
        check(tag + "Warding opens in a pop-up, on Inscribe", pg.locator(".cbpop .warding, .cbpop-ward").count() >= 1 and pg.locator(".cbpop [aria-selected=true]", has_text="Inscribe").count() == 1)
        pg.screenshot(path=str(SHOTS / f"combat-ward-{W}.png"))
        pg.keyboard.press("Escape"); pg.wait_for_timeout(800)
        check(tag + "Escape closes it", pg.locator(".cbpop").count() == 0)
        pg.locator(".cbdaemons").get_by_role("button", name="Summon…").click(); pg.wait_for_timeout(700)
        check(tag + "Summon opens Daemonology", pg.locator(".cbpop .demonology").count() == 1)
        pg.locator(".cbpophead .iconbtn").click(); pg.wait_for_timeout(800)
        wide = pg.evaluate("document.documentElement.scrollWidth > innerWidth + 1")
        check(tag + "no sideways scroll", not wide)
        pg.screenshot(path=str(SHOTS / f"combat-{W}.png"), full_page=True)
        # stepping out to the sheet and back
        pg.locator(".fightband").get_by_role("button", name="Sheet").click(); pg.wait_for_timeout(500)
        check(tag + "Sheet shows the tabs again", pg.locator(".tabs").count() == 1 and pg.locator(".combatview").count() == 0)
        pg.locator(".fightband").get_by_role("button", name="Back to combat").click(); pg.wait_for_timeout(500)
        check(tag + "Back to combat", pg.locator(".combatview").count() == 1)
        # end: two steps; the card that wasn't kept goes
        pg.locator(".fightband").get_by_role("button", name="End combat").click(); pg.wait_for_timeout(200)
        pg.locator(".fbsure").get_by_role("button", name="End combat").click(); pg.wait_for_timeout(900)
        check(tag + "End combat clears the band and the cards", pg.locator(".fightband").count() == 0 and pg.locator(".tabs").count() == 1 and not ch()["cards"] and ch()["combat"]["ap"] == 5, (ch()["cards"], ch()["combat"]))
        check(tag + "no errors", not errs, errs)
        ctx.close()
    b.close()
print(f"{sum(checks)}/{len(checks)} checks passed")
sys.exit(0 if all(checks) else 1)
