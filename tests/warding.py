"""Warding (the Magic tab): the dictionary, the board, costs and grammar, inscribing, Fatigue, saved and formulaic wards.

    python3 tests/warding.py SITE_DIR [SHOTS_DIR]

Runs in "this browser only" mode on a character with Warding 7 (Willpower 17), at desktop and 390 px.
Rules from the 2020.1 book: Subject 5, Adverb 1, Conjunction 10 (Warding 7), Words of Power their own cost;
Sigils per AP = 3 × Warding; available = AP × Sigils per AP − Fatigue; Ritual Fatigue <10 → 1, else halved.
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
WARDER = {"modules": {"craft": True, "magic": True}, "id": "wd", "name": "Batbayar", "players": [], "attrs": {"WIL": {"base": 17, "value": 17}}, "skills": {"Warding": 7}}
PLAIN = {"modules": {"craft": True, "magic": True}, "id": "pl", "name": "Plain", "players": []}

with sync_playwright() as p:
    b = p.chromium.launch()
    for W, skin in [(1280, "ledger"), (390, "moss")]:
        tag = f"{W}px {skin}: "
        ctx = b.new_context(viewport={"width": W, "height": 900}, is_mobile=W < 500, has_touch=W < 500)
        ctx.route("**/*", lambda r: r.abort() if any(x in r.request.url for x in BLOCK) else r.continue_())
        ctx.add_init_script(f"try {{ localStorage.setItem('cw-skin', JSON.stringify('{skin}')); localStorage.setItem('cw-dice', JSON.stringify('app'));"
                            f" if (!localStorage.getItem('cw-companion-chars')) {{ localStorage.setItem('cw-sel', JSON.stringify('pl')); localStorage.setItem('cw-tab', JSON.stringify('sheet'));"
                            f" localStorage.setItem('cw-companion-chars', JSON.stringify({{ wd: {json.dumps(WARDER)}, pl: {json.dumps(PLAIN)} }})); }} }} catch (e) {{}}")
        pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(url); pg.wait_for_timeout(1500)
        tabs = lambda: pg.evaluate("[...document.querySelectorAll('.tabs [role=tab]')].map(t => t.textContent.trim())")
        check(tag + "no Warding, no Magic tab", "Magic" not in tabs(), tabs())
        pg.evaluate("localStorage.setItem('cw-sel', JSON.stringify('wd'))"); pg.reload(); pg.wait_for_timeout(1500)
        check(tag + "Warding 7: the Magic tab", "Magic" in tabs(), tabs())
        pg.get_by_role("tab", name="Magic").click(); pg.wait_for_timeout(500)
        ch = lambda: pg.evaluate("JSON.parse(JSON.stringify(Store.chars.wd))")
        facts = pg.evaluate("[...document.querySelectorAll('.wardhead .fact')].map(f => f.textContent)")
        check(tag + "Sigils per AP = 3 × Warding (21), modifier 21%", any("Sigils per AP21" in f for f in facts) and any("Modifier21%" in f for f in facts), facts)
        # ---- Words: learn three Words of Power and a subject
        pg.locator(".wardpages button", has_text="Words").click(); pg.wait_for_timeout(200)
        def learn(word, cost, kinds):
            for _ in range(6):   # the write-a-word line is on the book's last page
                if pg.locator(".tomenew").count() or pg.locator(".tome .wardform").count(): break
                pg.locator(".tomecorner.next").click(); pg.wait_for_timeout(1500)
            if pg.locator(".tomenew").count(): pg.locator(".tomenew").click(); pg.wait_for_timeout(150)
            pg.fill("#wf-new-w", word); pg.fill("#wf-new-c", str(cost))
            for k in ["noun", "verb", "adjective"]:
                box = pg.locator(".wardkinds label", has_text={"noun": "Noun", "verb": "Verb", "adjective": "Adjective"}[k]).locator("input")
                if box.is_checked() != (k in kinds): box.click()
            pg.locator(".tome .wardform .btn.primary").click(); pg.wait_for_timeout(1500)
        learn("Fire", 12, ["noun", "verb"]); learn("Ignite", 8, ["verb"]); learn("Big", 6, ["adjective"])
        while pg.locator(".tomeh", has_text="Grammar").count() == 0:
            pg.locator(".tomecorner.prev").click(); pg.wait_for_timeout(1500)
        pg.locator(".tomenavr .btn", has_text="Close the book").click(); pg.wait_for_timeout(4000)
        check(tag + "the book closes to its cover", pg.locator(".tome.shut .tomecover").count() == 1 and pg.locator(".tomepage").count() == 0 and "Batbayar" in pg.locator(".tomecover").inner_text())
        pg.reload(); pg.wait_for_timeout(1500); pg.get_by_role("tab", name="Magic").click(); pg.wait_for_timeout(400)
        check(tag + "and stays shut after a reload", pg.locator(".tome.shut").count() == 1)
        pg.locator(".tomecover").click(); pg.wait_for_timeout(3500)
        check(tag + "clicking the cover opens it, and the moving paper is cleared away", pg.locator(".tomepage").count() >= 1 and pg.locator(".tome .tomecover").count() == 0 and pg.locator(".tsheet, .tghost").count() == 0)
        check(tag + "the book turns back to its Grammar page", pg.locator(".tome .tomeh", has_text="Grammar").count() == 1)
        pg.fill(".tomegram.k-subject .tomeadd input", "the bandits"); pg.locator(".tomegram.k-subject .tomeadd button").click(); pg.wait_for_timeout(1500)
        w = ch()["ward"]
        check(tag + "the dictionary holds the words", sorted(x["w"] for x in w["words"]) == ["Big", "Fire", "Ignite"] and next(x for x in w["words"] if x["w"] == "Fire")["kinds"] == ["noun", "verb"] and w["extra"]["subject"] == ["the bandits"], w)
        pg.screenshot(path=str(SHOTS / f"ward-words-{W}.png"))
        # ---- Inscribe: grammar lights only what can come next
        pg.locator(".wardpages button", has_text="Inscribe").click(); pg.wait_for_timeout(300)
        lit = lambda: pg.evaluate("[...document.querySelectorAll('.wardword:not(.off)')].map(b => b.textContent.trim())")
        check(tag + "at the start only Subjects are lit", set(lit()) == {"I", "The Ward", "myself", "there", "the bandits"}, lit())
        for t in ["I", "Ignite", "a", "Big", "Big", "Fire"]:
            pg.evaluate(f"[...document.querySelectorAll('.wardword:not(.off)')].find(b => b.textContent.trim() === {json.dumps(t)}).click()"); pg.wait_for_timeout(250)
        total = pg.locator(".wardtotal b").inner_text()
        check(tag + "I ignite a big big fire = 5 + 8 + 1 + 6 + 6 + 12 = 38 Sigils, valid", total == "38" and pg.locator(".wardsigil.ok").count() == 1 and pg.locator(".wardproblems").count() == 0, total)
        check(tag + "the sigil is ringed with runes, and each word marks it with its own rune", pg.locator(".wardsigil .bandrune").count() >= 12 and pg.locator(".wardsigil .mark path").count() >= 6 and pg.locator(".wardsigil .mark rect").count() == 0)
        pg.wait_for_timeout(1500)   # the sheet saves shortly after a change
        check(tag + "Fire is lit as a noun after an adjective", (ch()["ward"]["board"] or [{}])[-1].get("k") == "noun", ch()["ward"]["board"])
        pg.locator(".wardopt", has_text="3 words at 1 Sigil").click(); pg.wait_for_timeout(200)
        check(tag + "The First Epic: the 3 dearest words cost 1 → 15", pg.locator(".wardtotal b").inner_text() == "15", pg.locator(".wardtotal b").inner_text())
        pg.locator(".wardopt", has_text="3 words at 1 Sigil").click(); pg.wait_for_timeout(200)
        pg.screenshot(path=str(SHOTS / f"ward-board-{W}.png"))
        # AP with Fatigue: (38 + 4) / 21 → 2 AP
        for _ in range(4): pg.locator(".wardfat .iconbtn[aria-label='Raise Fatigue']").click(); pg.wait_for_timeout(120)
        pg.wait_for_timeout(300)
        check(tag + "Fatigue is set with + (4)", pg.locator(".wardfatn").inner_text() == "4", pg.locator(".wardfatn").inner_text())
        ap = pg.evaluate("[...document.querySelectorAll('.wardcostbox .fact')].map(f => f.textContent)")
        check(tag + "Fatigue 4: 2 AP buy 2 × 21 − 4 = 38 Sigils", any("AP needed2 AP → 38 Sigils" in f for f in ap), ap)
        # inscribe with 2× Sigils per AP: one use spent, Fatigue gained counts double
        pg.locator(".wardopt", has_text="2× Sigils per AP").click(); pg.wait_for_timeout(150)
        ap = pg.evaluate("[...document.querySelectorAll('.wardcostbox .fact')].map(f => f.textContent)")
        check(tag + "2× Sigils per AP: 42 per AP, 1 AP", any("AP needed1 AP → 38 Sigils" in f for f in ap), ap)
        pg.evaluate("CW.rollDie = () => 20")
        pg.locator(".wardactions .btn.primary", has_text="Inscribe").click(); pg.wait_for_timeout(300)
        check(tag + "inscribing stays on the Inscribe page", pg.locator(".wardboardf .wardcast").count() == 1 and pg.locator(".wardfloat").count() == 1, (pg.locator(".wardboardf .wardcast").count(), pg.locator(".wardfloat").count()))
        pg.fill("#ward-dc", "40")
        check(tag + "the difficulty box says what to roll", "Roll 60 or less to hold" in pg.locator(".warddchint").inner_text(), pg.locator(".warddchint").inner_text())
        pg.locator(".wardcast .btn.primary", has_text="Roll the Warding check").click(); pg.wait_for_timeout(600)
        check(tag + "the casting animation plays", pg.locator(".wardsigil.casting").count() == 1 and pg.locator(".wardsigil .ray").count() > 0)
        pg.wait_for_timeout(2400)
        check(tag + "then the Ward is cast", pg.locator(".wardsigil.cast .burst").count() == 1)
        check(tag + "the check is d100 − modifier, under the difficulty", "20 − 21 = -1" in pg.locator(".wardroll").inner_text() and "the Ward holds" in pg.locator(".wardroll").inner_text(), pg.locator(".wardroll").inner_text())
        pg.fill("#ward-gain", "3"); pg.locator(".wardgain .btn.primary").click(); pg.wait_for_timeout(1500)
        c = ch()
        check(tag + "2× Fatigue: +6 (4 → 10), one use of the level 5 perk spent", c["ward"]["fatigue"] == 10 and c["uses"].get("p:Warding:5") == 1 and len(c["ward"]["ledger"]) == 1 and c["ward"]["ledger"][0].get("held") is True and "vs 40" in c["ward"]["ledger"][0]["roll"], (c["ward"]["fatigue"], c.get("uses"), c["ward"]["ledger"]))
        pg.locator(".wardcast .btn.primary", has_text="Back to the board").click(); pg.wait_for_timeout(300)
        # save the ward
        pg.fill(".wardsave input", "Firestorm"); pg.locator(".wardsave .btn").click(); pg.wait_for_timeout(1500)
        check(tag + "saved as a Spontaneous Ward", any(x["n"] == "Firestorm" and x["kind"] == "spontaneous" and len(x["tokens"]) == 6 for x in ch()["ward"]["wards"]))
        # ---- Wards: a Formulaic Ritual Ward; Ritual Fatigue 3 → 1
        pg.locator(".wardpages button", has_text="Wards").click(); pg.wait_for_timeout(300)
        check(tag + "the saved ward is listed with its cost", pg.locator(".wardcard", has_text="Firestorm").locator(".flag", has_text="38 Sigils").count() == 1)
        pg.locator(".wardlist .ptaddown").click(); pg.fill("#ff-n", "Ward of Alarming"); pg.fill("#ff-cost", "50"); pg.fill("#ff-time", "1 hour")
        pg.locator(".wardform label", has_text="A Ritual Ward").locator("input").click(); pg.locator(".wardform .btn.primary").click(); pg.wait_for_timeout(400)
        card = pg.locator(".wardcard", has_text="Ward of Alarming")
        check(tag + "a Ritual: (50 + 10 Fatigue) / 21 → 3 AP → 1 hour", "About 1 hour as a Ritual" in card.inner_text(), card.inner_text())
        card.locator(".btn.primary", has_text="Inscribe").click(); pg.wait_for_timeout(300)
        pg.locator(".wardcast .btn.primary", has_text="Roll the Warding check").click(); pg.wait_for_timeout(2900)
        pg.fill("#ward-gain", "3"); pg.locator(".wardgain .btn.primary").click(); pg.wait_for_timeout(1500)
        check(tag + "Ritual: 3 Fatigue becomes 1 (10 → 11)", ch()["ward"]["fatigue"] == 11, ch()["ward"]["fatigue"])
        pg.locator(".wardcast .btn.primary").click(); pg.wait_for_timeout(300)
        # Stamina clears 10 Fatigue; a long rest clears the rest
        pg.locator(".wardfat .btn", has_text="Spend 1 Stamina").click(); pg.wait_for_timeout(1500)
        c = ch()
        check(tag + "1 Stamina clears 10 Fatigue (11 → 1)", c["ward"]["fatigue"] == 1 and c["vitals"]["exhaustion"] == 1, (c["ward"]["fatigue"], c["vitals"]["exhaustion"]))
        msg = pg.evaluate("(() => { const x = JSON.parse(JSON.stringify(Store.chars.wd)); const m = CW.longRest(CW.normalize(x), 0); return [m, x.ward.fatigue]; })()")
        check(tag + "a long rest clears Fatigue", "Warding Fatigue 1 → 0" in msg[0], msg)
        stray = pg.evaluate("(t => { const i = t.search(/\\*\\/|\\{ ?[a-z-]+: /); return i < 0 ? '' : t.slice(Math.max(0, i - 40), i + 60); })(document.body.innerText)")
        check(tag + "no stylesheet text on the page", not stray, stray)
        check(tag + "no sideways scroll", not pg.evaluate("document.documentElement.scrollWidth > innerWidth + 1"))
        check(tag + "no page errors", not errs, errs[:3])
        ctx.close()
    # ---- the grammar rules below level 7 (pure rules)
    pg = b.new_page(); pg.goto(url); pg.wait_for_timeout(800)
    r = pg.evaluate("""(() => { const c = CW.normalize({ skills: { Warding: 5 } }); c.ward.words = [{ id: 'f', w: 'Fire', kinds: ['noun'], cost: 12 }, { id: 'b', w: 'Big', kinds: ['adjective'], cost: 6 }, { id: 'i', w: 'Ignite', kinds: ['verb'], cost: 8 }];
      const T = k => k.map(([k, text, id]) => ({ k, text, id }));
      const lv9 = CW.normalize({ skills: { Warding: 9 } }); lv9.ward.words = c.ward.words;
      return { rep: CW.wardCost(c, T([['subject','I'],['verb','Ignite','i'],['adjective','Big','b'],['adjective','Big','b'],['noun','Fire','f']])).problems,
        conj: CW.wardCost(c, T([['subject','I'],['verb','Ignite','i'],['noun','Fire','f'],['conj','and'],['verb','Ignite','i'],['noun','Fire','f']])).problems,
        noverb: CW.wardCost(c, T([['subject','I'],['adverb','the'],['noun','Fire','f']])).problems,
        open: CW.wardCost(c, T([['subject','I'],['verb','Ignite','i'],['adjective','Big','b']])).problems,
        l9: CW.wardCost(lv9, T([['subject','I'],['verb','Ignite','i'],['adverb','a'],['noun','Fire','f']])).total,
        l3: CW.wardCost(CW.normalize({ skills: { Warding: 3 } }), T([['subject','I'],['verb','Ignite','i'],['noun','Fire','f']])).problems,
        rit: [CW.wardFatigue(0, { ritual: 1 }), CW.wardFatigue(9, { ritual: 1 }), CW.wardFatigue(10, { ritual: 1 }), CW.wardFatigue(15, { ritual: 1 }), CW.wardFatigue(4, { calm: 1 }), CW.wardFatigue(4, { calm: 1, ritual: 1 })] }; })()""")
    check("Warding 5: repeating an adjective needs 6", any("needs Warding 6" in x for x in r["rep"]), r["rep"])
    check("Warding 5: conjunctions need 7", any("Warding 7" in x for x in r["conj"]), r["conj"])
    check("a Ward needs a verb", any("needs a verb" in x for x in r["noverb"]), r["noverb"])
    check("a sentence can't end on an adjective", any("isn't finished" in x for x in r["open"]), r["open"])
    check("Warding 9: Subject 2, Adverb 0 (2 + 8 + 0 + 12 = 22)", r["l9"] == 22, r["l9"])
    check("Warding 3: Words of Power need 5", any("Warding 5" in x for x in r["l3"]), r["l3"])
    check("Ritual Fatigue: 0→0, 9→1, 10→5, 15→8; no-Fatigue perk doesn't work on a Ritual", r["rit"] == [0, 1, 5, 8, 0, 1], r["rit"])
    b.close()
srv.shutdown()
print("PASS" if all(checks) else "FAIL"); sys.exit(0 if all(checks) else 1)
