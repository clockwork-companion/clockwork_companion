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
           "dream": {"tolls": [{"id": "t1", "n": "Translocation", "pct": 12}]}, "vitals": {"wounds": {"light": 1}}}
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
        pg.locator(".fightbtn").click(); pg.wait_for_timeout(1200)
        check(tag + "Start combat shows the band and the battle view", pg.locator(".fightband").count() == 1 and pg.locator(".combatview").count() == 1 and pg.locator(".tabs").count() == 0)
        check(tag + "the button hides while combat is on", pg.locator(".fightbtn").count() == 0)
        check(tag + "the AP dock shows 5 AP", pg.locator(".apdock .aptok.on").count() == 5 and pg.locator(".apnum").inner_text() == "5", pg.locator(".apdock .aptok.on").count())
        check(tag + "a light wound bleeds 8 at the start of round 1", ch()["vitals"]["bp"] == 192, ch()["vitals"].get("bp"))
        pg.locator(".fightband").get_by_role("button", name="Next round").click(); pg.wait_for_timeout(1200)
        check(tag + "and again at the start of round 2", ch()["vitals"]["bp"] == 184 and ch()["combat"]["bledRound"] == 2, (ch()["vitals"].get("bp"), ch()["combat"]))
        weaps = pg.locator(".cbweap .cbrowhead b").all_inner_texts()
        check(tag + "the weapon in the pack stays in Gear", weaps == ["Saber"], weaps)
        acts = pg.locator(".cbactives").inner_text().lower()
        check(tag + "crafting and magic stay out of Abilities", "powdertinker" not in acts and "warding 3" not in acts and "critical strikes" in acts and "defence" in acts, acts[:200])
        carve = pg.locator(".cbperk", has_text="Carve")
        check(tag + "abilities show a short line with More", carve.locator(".cbbrief").inner_text().startswith("Your next attack maims.") and carve.get_by_role("button", name="More").count() == 1, carve.locator(".cbbrief").inner_text())
        pg.get_by_role("button", name="Start my turn").click(); pg.wait_for_timeout(800)
        if W > 500:
            carve.get_by_role("button", name="Use · 1 AP").hover(); pg.wait_for_timeout(200)
            check(tag + "hovering an ability lights the AP it costs", pg.locator(".apdock .aptok.will").count() == 1 and "−1 AP" in pg.locator(".apstate").inner_text(), pg.locator(".apstate").inner_text())
        pg.locator(".cbperk", has_text="Minute Movement").get_by_role("button", name="Use", exact=True).click(); pg.wait_for_timeout(800)
        check(tag + "Minute Movement gives 2 AP", ch()["combat"]["ap"] == 7, ch()["combat"])
        carve.get_by_role("button", name="Use · 1 AP").click(); pg.wait_for_timeout(800)
        check(tag + "Carve spends 1 AP", ch()["combat"]["ap"] == 6, ch()["combat"])
        pg.locator(".apdock .aptok.on").first.click(); pg.wait_for_timeout(300)
        pg.locator(".apdock .aptok").last.click(button="right"); pg.wait_for_timeout(800)
        check(tag + "tokens spend and give back AP", ch()["combat"]["ap"] == 6, ch()["combat"])
        # a condition card: no uses, a countdown, offered when hit
        pg.get_by_role("button", name="+ A card").click()
        check(tag + "a condition has no uses field", pg.locator(".cbformnums label", has_text="Uses").count() == 0)
        pg.locator(".cbcardform input[aria-label='Card name']").fill("Cursed by the Zhoung")
        pg.locator(".cbcardform textarea").fill("−10% to every check.")
        pg.locator(".cbformnums input").nth(0).fill("2")
        pg.get_by_role("button", name="Add card").click(); pg.wait_for_timeout(800)
        check(tag + "the card is saved", ch()["cards"][0]["name"] == "Cursed by the Zhoung" and ch()["cards"][0]["left"] == 2 and ch()["cards"][0]["uses"] == 0, ch().get("cards"))
        # a pinned perk: only the perk, with its real uses
        pg.get_by_role("button", name="+ A card").click(); pg.locator(".cbcardform .seg button", has_text="Pinned perk").click()
        check(tag + "a pinned perk has no name or text fields", pg.locator(".cbcardform input[aria-label='Card name']").count() == 0)
        pg.locator(".cbcardform select").select_option(label="Parry 4: Guard (Active)")
        pg.get_by_role("button", name="Add card").click(); pg.wait_for_timeout(800)
        check(tag + "the pinned perk shows Guard with its uses", pg.locator(".cbtable .cbperk.pinned", has_text="Guard").count() == 1, ch().get("cards"))
        # taking damage: 10, parried with Guard (no roll), armor AV 2
        pg.locator(".apdock").get_by_role("button", name="Take damage").click(); pg.wait_for_timeout(400)
        pg.locator(".dmgbig input").fill("10"); pg.locator(".dmgfoot").get_by_role("button", name="Next").click(); pg.wait_for_timeout(200)
        pg.locator(".dmgopt", has_text="Parry").click()
        pg.locator(".dmgroll").get_by_role("button", name="Succeed without rolling", exact=False).click(); pg.wait_for_timeout(200)
        pg.locator(".dmgfoot").get_by_role("button", name="Next").click(); pg.locator(".dmgfoot").get_by_role("button", name="Next").click(); pg.wait_for_timeout(200)
        final = pg.locator(".dmgfinal").inner_text()
        check(tag + "parry halves 10 to 5, the armor takes 2: lose 3 HP", "3 HP" in final, final)
        pg.screenshot(path=str(SHOTS / f"combat-damage-{W}.png"))
        hp0 = ch()["vitals"].get("hp")
        pg.get_by_role("button", name="Take the damage").click(); pg.wait_for_timeout(900)
        cc = ch()
        check(tag + "the damage is applied: HP, Soak, 2 AP (Defend + Guard), Guard's use", cc["armor"][0]["soak"] == 18 and cc["combat"]["ap"] == 4 and cc["uses"].get("p:Parry:4") == 1, (hp0, cc["vitals"].get("hp"), cc["armor"][0]["soak"], cc["combat"]["ap"], cc.get("uses")))
        pg.get_by_role("button", name="End turn").click(); pg.wait_for_timeout(800)
        cb = ch()["combat"]
        check(tag + "End turn keeps AP for reactions and counts the card down", cb["turn"] is False and cb["ap"] == 4 and ch()["cards"][0]["left"] == 1, (cb, ch()["cards"]))
        # magic: Toll, daemons (dismiss spends 1 AP), Warding opens on Inscribe
        check(tag + "the Toll meter shows", "12%" in pg.locator(".cbtoll").inner_text())
        check(tag + "Morrow's card and the circle show", pg.locator(".cbdaemons .demoncard", has_text="Morrow").count() == 1 and pg.locator(".cbcircle .demoncircle").count() == 1)
        pg.locator(".cbdaemons .demoncard").get_by_role("button", name="Dismiss: 1 AP").click(); pg.wait_for_timeout(800)
        check(tag + "dismissing spends 1 AP", ch()["combat"]["ap"] == 3 and not ch()["demon"]["out"], ch()["combat"])
        pg.get_by_role("button", name="Inscribe a Ward").click(); pg.wait_for_timeout(900)
        check(tag + "Warding opens in a pop-up, on Inscribe", pg.locator(".cbpop-ward").count() == 1 and pg.locator(".cbpop [aria-selected=true]", has_text="Inscribe").count() == 1 and pg.locator(".cbpop .apmini").count() == 1)
        pg.screenshot(path=str(SHOTS / f"combat-ward-{W}.png"))
        pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
        check(tag + "Escape closes it", pg.locator(".cbpop").count() == 0)
        # the initiative deck: turn order in the band
        pg.evaluate("Store.saveEncounter({ v: 1, round: 3, combatants: [{ id: 'a', kind: 'pc', charId: 'ft', name: 'Batbayar' }, { id: 'o', kind: 'pc', charId: 'ot', name: 'Bystander' }, { id: 'e', kind: 'enemy', name: 'Goblin' }], deck: ['e:0', 'o:0'], drawn: [{ card: 'a:0' }], current: 'a:0', acted: ['a'], hist: [] })")
        pg.wait_for_timeout(1200)
        order = pg.locator(".fborder").inner_text()
        check(tag + "the band shows the turn order and your turn", "Batbayar" in order and "Still to act: Bystander, 1 enemy" in order and "your turn" in pg.locator(".fightband").inner_text().lower() and "Goblin" not in order, order)
        check(tag + "round 3 from the deck, and bleeding catches up", "3" in pg.locator(".fbround").inner_text() and ch()["combat"]["bledRound"] == 3 and ch()["vitals"]["bp"] == 176, (ch()["vitals"].get("bp"), ch()["combat"].get("bledRound")))
        wide = pg.evaluate("document.documentElement.scrollWidth > innerWidth + 1")
        check(tag + "no sideways scroll", not wide)
        pg.evaluate("window.scrollTo(0, 0)"); pg.wait_for_timeout(200)
        pg.screenshot(path=str(SHOTS / f"combat-{W}.png"), full_page=True)
        pg.locator(".fightband").get_by_role("button", name="Sheet").click(); pg.wait_for_timeout(500)
        check(tag + "Sheet shows the tabs again", pg.locator(".tabs").count() == 1 and pg.locator(".combatview").count() == 0)
        pg.locator(".fightband").get_by_role("button", name="Back to combat").click(); pg.wait_for_timeout(500)
        check(tag + "Back to combat", pg.locator(".combatview").count() == 1)
        pg.locator(".fightband").get_by_role("button", name="End combat").click(); pg.wait_for_timeout(200)
        pg.locator(".fbsure").get_by_role("button", name="End combat").click(); pg.wait_for_timeout(1200)
        check(tag + "End combat clears the band and the cards", pg.locator(".fightband").count() == 0 and pg.locator(".tabs").count() == 1 and not ch()["cards"] and ch()["combat"]["ap"] == 5, (ch()["cards"], ch()["combat"]))
        check(tag + "no errors", not errs, errs)
        ctx.close()
    b.close()
print(f"{sum(checks)}/{len(checks)} checks passed")
sys.exit(0 if all(checks) else 1)
