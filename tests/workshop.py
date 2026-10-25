"""Test the workshop (Crafting → Weapon/Armor upkeep jobs between players) against the in-memory Firebase stand-in.

    python3 tests/workshop.py SITE_DIR [SHOTS_DIR]

Two players at one test table: u1 plays Batbayar (owns a worn sabre), u2 plays Arslan (Weapon Maintenance 6).
Each page is one player; the stand-in's store is per page, so the other side of a job is written straight into it.
"""
import functools, hashlib, http.server, json, pathlib, re, shutil, sys, tempfile, threading
from playwright.sync_api import sync_playwright

SITE = pathlib.Path(sys.argv[1]).resolve(); SHOTS = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "smoke-shots"); SHOTS.mkdir(parents=True, exist_ok=True)
HERE = pathlib.Path(__file__).resolve().parent
work = pathlib.Path(tempfile.mkdtemp()); shutil.copytree(SITE, work, dirs_exist_ok=True)
page_html = (work / "index.html").read_text(encoding="utf-8")
page_html = re.sub(r'<script src="https://www\.gstatic\.com/firebasejs/[^"]+-compat\.js"></script>\n?', "", page_html)
page_html = page_html.replace('<script src="firebase-config.js"></script>', '<script src="firebase-mock.js"></script>\n<script src="firebase-config.js"></script>', 1)
(work / "index.html").write_text(page_html, encoding="utf-8"); shutil.copy(HERE / "firebase-mock.js", work / "firebase-mock.js")
(work / "firebase-config.js").write_text('window.CLOCKWORK_FIREBASE = { apiKey: "test", projectId: "test-project", authDomain: "test", appId: "test" };')

key = hashlib.sha256(b"clockwork-table:test table").hexdigest(); T = f"tables/{key}"
SABRE = {"id": "w1", "name": "Steppe sabre", "skill": "Slashing", "hands": 1, "damage": 6, "crit": 5, "dur": 20, "durMax": 100, "durDie": "d10", "props": "", "final": True}
BAT = {"name": "Batbayar", "campaign": "Steppe Wars", "players": ["u1"], "weapons": [SABRE], "coins": 100, "items": [{"id": "i1", "name": "Bandages", "qty": 10, "size": "bundle"}]}
PAY = {"coins": 30, "items": [{"name": "Bandages", "qty": 2, "size": "bundle"}], "note": "a round of ale"}
ARS = {"name": "Arslan", "campaign": "Steppe Wars", "players": ["u2"], "skills": {"Weapon Maintenance": 6}, "attrs": {"WIS": {"base": 16, "value": 16}}, "craft": {"supplies": {"weapon": 9000}}}
base = {f"{T}/meta/table": {"owner": "gm1"}, f"{T}/members/gm1": {"role": "gm", "name": "sinan"},
        f"{T}/members/u1": {"role": "player", "name": "utku"}, f"{T}/members/u2": {"role": "player", "name": "bedo"},
        f"{T}/characters/bat": BAT, f"{T}/characters/ars": ARS,
        f"{T}/roster/ars": {"name": "Arslan", "uids": ["u2"], "campaign": "Steppe Wars", "weapon": 6, "armor": 0},
        f"{T}/roster/kae": {"name": "Kael", "uids": ["u3"], "campaign": "Iron Coast", "weapon": 9, "armor": 9},
        f"{T}/roster/bat": {"name": "Batbayar", "uids": ["u1"], "campaign": "Steppe Wars", "weapon": 0, "armor": 0}}

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(work))); threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{srv.server_address[1]}/index.html"
checks = []
def check(name, ok, got=""): checks.append(ok); print(("ok   " if ok else "FAIL ") + name + (f"  ({got})" if got and not ok else ""))
def as_player(b, uid, seed):
    ctx = b.new_context(viewport={"width": 1280, "height": 900})
    ctx.route("**/*", lambda r: r.abort() if "fonts.g" in r.request.url else r.continue_())
    ctx.add_init_script(f"window.__MOCK_USER = {{ uid: '{uid}', email: '{uid}@test-project.firebaseapp.com' }}; window.__MOCK_SEED = {json.dumps(seed)};"
                        f"try {{ localStorage.setItem('cw-table-key', '{key}'); localStorage.setItem('cw-dice', '\"app\"'); }} catch (e) {{}}")
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(url); pg.wait_for_selector(".tabs", timeout=20000); pg.wait_for_timeout(800)
    pg.evaluate("(()=>{window.Q=[]; const o=CW.rollDie; CW.rollDie=s=>Q.length?Q.shift():o(s);})()")
    return pg, errs
def bench(pg, sub, mode):
    pg.get_by_role("tab", name="Crafting").click(); pg.wait_for_timeout(300)
    pg.locator(".craftnav button", has_text=sub).click(); pg.wait_for_timeout(300)
    pg.locator(".ammode button", has_text=mode).click(); pg.wait_for_timeout(300)
get = lambda pg, path: pg.evaluate(f"window.__mockStore.get('{T}/{path}') || null")
jobs = lambda pg: pg.evaluate(f"[...window.__mockStore.keys()].filter(k => k.startsWith('{T}/jobs/')).map(k => Object.assign({{id: k.split('/').pop()}}, window.__mockStore.get(k)))")
put = lambda pg, path, d: pg.evaluate(f"firebase.firestore().doc('{T}/{path}').set({json.dumps(d)})")

with sync_playwright() as p:
    b = p.chromium.launch()
    # ---- the owner (u1): sends the sabre from the Gear tab with a payment, then gets it back repaired
    pg, errs = as_player(b, "u1", base)
    me = lambda: get(pg, "characters/bat") or {}
    gear = lambda: (pg.get_by_role("tab", name="Gear").click(), pg.wait_for_timeout(300))
    gear()
    pg.locator(".wcard.final .shopbtn").click(); pg.wait_for_timeout(300)
    opts = pg.evaluate("[...document.querySelector(\".shopgear select[id^='sg-to']\").options].map(o => o.textContent)")
    check("owner sees Arslan as a weaponsmith", any("Arslan" in o for o in opts), opts)
    check("but not Kael, a smith in another campaign", not any("Kael" in o for o in opts), opts)
    pg.fill(".shopgear input[id^='sg-coins']", "30"); pg.select_option(".shopgear select[id^='sg-item']", "i1"); pg.wait_for_timeout(100)
    pg.fill(".shopgear input[id^='sg-qty']", "2"); pg.fill(".shopgear input[id^='sg-note']", "a round of ale")
    pg.screenshot(path=str(SHOTS / "workshop-gear-send.png"))
    pg.locator(".shopgear .btn.primary", has_text="Send to Arslan").click(); pg.wait_for_timeout(1600)   # the sheet saves shortly after a change
    js = jobs(pg); j = js[0] if js else {}
    check("job written with both sides' players", len(js) == 1 and j.get("from", {}).get("uids") == ["u1"] and j.get("to", {}).get("uids") == ["u2"] and j.get("status") == "open", js)
    check("only the sabre travels", j.get("item", {}).get("id") == "w1" and "skills" not in j.get("item", {}))
    check("the payment travels with it", j.get("pay") == PAY, j.get("pay"))
    check("and leaves the owner's sheet", me().get("coins") == 70 and me().get("items", [{}])[0].get("qty") == 8, (me().get("coins"), me().get("items")))
    check("the Gear card says it's away", pg.locator(".shopgear.away .flag", has_text="At Arslan's bench").count() == 1)
    check("it stays in the owner's Gear", [w.get("id") for w in me().get("weapons", [])] == ["w1"])
    check("but is locked: durability and edit can't be used", pg.locator(".wcard.final.away").count() == 1 and pg.locator(".wcard.away button[aria-label='Lose 1 durability']").is_disabled() and pg.locator(".wcard.away button[aria-label^='Edit']").is_disabled())
    pg.locator(".wcard.final").screenshot(path=str(SHOTS / "workshop-locked.png"))
    check("no crafting skills, so no Crafting tab for the owner", pg.get_by_role("tab", name="Crafting").count() == 0)
    done = dict(j); done.pop("id", None); done.update({"status": "done", "result": {"gained": 41, "roll": "check 7 → 9 × d10: 41", "times": 1, "by": "Arslan"}})
    put(pg, f"jobs/{j['id']}", done); pg.wait_for_timeout(1800)
    sab = me().get("weapons", [{}])[0]
    check("owner's app wrote the repair onto the sabre", sab.get("dur") == 61, sab.get("dur"))
    check("and cleared the job", jobs(pg) == [])
    check("the payment doesn't come back after a repair", me().get("coins") == 70)
    gear(); check("back from the smith, the card unlocks", pg.locator(".wcard.away").count() == 0 and pg.locator(".wcard.final .shopbtn").count() == 1)
    # sent back unrepaired: the payment comes home
    pg.locator(".wcard.final .shopbtn").click(); pg.fill(".shopgear input[id^='sg-coins']", "20")
    pg.locator(".shopgear .btn.primary").click(); pg.wait_for_timeout(600)
    j = jobs(pg)[0]; back = dict(j); back.pop("id", None); back.update({"status": "declined"})
    put(pg, f"jobs/{j['id']}", back); pg.wait_for_timeout(1800)
    check("sent back unrepaired: the coins come back, the sabre is as it was", me().get("coins") == 70 and jobs(pg) == [] and me().get("weapons", [{}])[0].get("dur") == 61, me().get("coins"))
    # taken back by the owner: the payment comes home too
    pg.locator(".wcard.final .shopbtn").click(); pg.fill(".shopgear input[id^='sg-coins']", "10")
    pg.locator(".shopgear .btn.primary").click(); pg.wait_for_timeout(1600)
    check("paid 10 more", me().get("coins") == 60)
    pg.locator(".shopgear.away .btn", has_text="Take it back").click(); pg.wait_for_timeout(1600)
    check("taken back: the coins come back", me().get("coins") == 70 and jobs(pg) == [], me().get("coins"))
    check("the sender never gets the smith's pop-up", pg.locator(".shopnote").count() == 0)
    check("owner's roster card is published", (get(pg, "roster/bat") or {}).get("uids") == ["u1"])
    check("no page errors (owner)", not errs, errs[:3])
    pg.context.close()

    # ---- a GM holds both characters: the pop-up shows only while the smith's character is open
    gseed = dict(base); gseed[f"{T}/jobs/j9"] = {"kind": "weapon", "mode": "repair", "status": "open", "t": 1,
        "from": {"char": "bat", "name": "Batbayar", "uids": ["u1"]}, "to": {"char": "ars", "name": "Arslan", "uids": ["u2"]}, "item": SABRE, "pay": PAY}
    gseed[f"{T}/characters/ars"] = dict(ARS, players=[])
    gseed[f"{T}/jobs/j9"]["to"]["uids"] = []
    pg, errs = as_player(b, "gm1", gseed)
    pg.evaluate("localStorage.setItem('cw-sel', JSON.stringify('bat'))"); pg.reload(); pg.wait_for_selector(".tabs", timeout=20000); pg.wait_for_timeout(900)
    check("GM on the sender's sheet: no pop-up", pg.locator(".shopnote").count() == 0)
    pg.locator(".rnow").click(); pg.wait_for_timeout(300); pg.locator(".rpanel .rmain", has_text="Arslan").click(); pg.wait_for_timeout(900)
    check("GM opens the smith's sheet: the pop-up shows", pg.locator(".shopnote", has_text="Batbayar").count() == 1)
    check("no page errors (GM)", not errs, errs[:3])
    pg.context.close()

    # ---- the smith (u2): sees the job, repairs it with his own roll and materials; crafts a gift
    seed = dict(base); seed[f"{T}/jobs/j1"] = {"kind": "weapon", "mode": "repair", "status": "open", "t": 1,
        "from": {"char": "bat", "name": "Batbayar", "uids": ["u1"]}, "to": {"char": "ars", "name": "Arslan", "uids": ["u2"]}, "item": SABRE, "pay": PAY}
    pg, errs = as_player(b, "u2", seed)
    check("a notice pops up for the smith", pg.locator(".shopnote", has_text="Batbayar").count() == 1 and pg.locator(".shopnote", has_text="30 coins").count() == 1)
    pg.screenshot(path=str(SHOTS / "workshop-notice.png"))
    pg.locator(".shopnote .btn", has_text="Open the Repair bench").click(); pg.wait_for_timeout(600)
    check("it opens the Repair bench on that job", pg.locator(".ptside .ptcheck[aria-pressed='true']", has_text="Batbayar's Steppe sabre").count() == 1)
    check("and doesn't pop up again", pg.locator(".shopnote").count() == 0)
    check("the job shows the payment", pg.locator(".ptside .shoppaid", has_text="30 coins").count() == 1)
    pg.screenshot(path=str(SHOTS / "workshop-smith.png"))
    pg.evaluate("window.Q=[25,8,8,8,8,8,8,8,8,8]"); pg.locator(".forgebtn").click(); pg.wait_for_selector(".ptread.end", timeout=20000); pg.wait_for_timeout(1500)
    j1 = get(pg, "jobs/j1") or {}
    check("one repair stays on the job, still open", j1.get("status") == "open" and (j1.get("result") or {}).get("gained") == 72 and (j1.get("result") or {}).get("times") == 1, j1)
    check("the owner's sheet is untouched by the smith", (get(pg, "characters/bat") or {}).get("weapons", [{}])[0].get("dur") == 20)
    check("the smith paid the materials", ((get(pg, "characters/ars") or {}).get("craft", {}).get("supplies", {}).get("weapon")) == 8600)
    check("no payment yet", not (get(pg, "characters/ars") or {}).get("coins"))
    check("the result offers Repair again and Send it back", pg.locator(".ptread.end .btn", has_text="Repair again").count() == 1 and pg.locator(".ptread.end .btn", has_text="Send it back to Batbayar").count() == 1)
    pg.screenshot(path=str(SHOTS / "workshop-again.png"))
    pg.evaluate("window.Q=[25,8,8,8,8,8,8,8,8,8]"); pg.locator(".ptread.end .btn", has_text="Repair again").click()
    pg.wait_for_selector(".ptread.end", timeout=20000); pg.wait_for_timeout(1500)
    j1 = get(pg, "jobs/j1") or {}
    check("a second repair adds up (up to full)", j1.get("status") == "open" and (j1.get("result") or {}).get("gained") == 80 and (j1.get("result") or {}).get("times") == 2, j1.get("result"))
    check("fully repaired: only Send it back", pg.locator(".ptread.end .btn", has_text="Repair again").count() == 0 and pg.locator(".ptread.end", has_text="fully repaired").count() == 1)
    pg.locator(".ptread.end .btn", has_text="Send it back to Batbayar").click(); pg.wait_for_timeout(1600)
    j1 = get(pg, "jobs/j1") or {}
    check("sent back: done, with both repairs", j1.get("status") == "done" and (j1.get("result") or {}).get("gained") == 80, j1)
    ars = get(pg, "characters/ars") or {}
    check("the smith paid materials twice", ars.get("craft", {}).get("supplies", {}).get("weapon") == 8200, ars.get("craft", {}).get("supplies"))
    check("and got the payment", ars.get("coins") == 30 and any(i.get("name") == "Bandages" and i.get("qty") == 2 for i in ars.get("items", [])), (ars.get("coins"), ars.get("items")))
    check("the bench is clear", pg.locator(".ptside .ptcheck", has_text="Batbayar's").count() == 0)
    pg.locator(".ammode button", has_text="Craft").click(); pg.wait_for_timeout(300)
    pg.locator(".ammode button", has_text="Repair").click(); pg.wait_for_timeout(300)
    pg.locator(".ammode button", has_text="Craft").click(); pg.wait_for_timeout(300)
    pg.locator(".ptlabel").first.click()
    opts = pg.evaluate("[...document.querySelector(\"select[id^='mf-']\").options].map(o => o.textContent)")
    check("Made for lists only the same campaign", "Batbayar" in opts and "Kael" not in opts, opts)
    pg.select_option("select[id^='mf-']", "bat"); pg.fill("input[id^='wc-n']", "Wolf fang")
    pg.evaluate("window.Q=[1]"); pg.locator(".forgebtn").click(); pg.wait_for_selector(".ptread.end", timeout=20000); pg.wait_for_timeout(1200)
    gifts = [x for x in jobs(pg) if x.get("mode") == "gift"]
    check("a crafted gift job goes to Batbayar's player", len(gifts) == 1 and gifts[0]["to"]["uids"] == ["u1"] and gifts[0]["item"]["name"] == "Wolf fang", gifts)
    check("the gift isn't in the smith's own Gear", not any(w.get("name") == "Wolf fang" for w in (get(pg, "characters/ars") or {}).get("weapons", [])))
    pg.locator(".ammode button", has_text="Craft").click(); pg.locator(".ptlabel").nth(1).click(); pg.wait_for_timeout(200)
    check("players can't type base stats", pg.locator(".ptpick input[id^='wc-damage']").count() == 0)
    check("no page errors (smith)", not errs, errs[:3])
    b.close()
srv.shutdown()
print("PASS" if all(checks) else "FAIL"); sys.exit(0 if all(checks) else 1)
