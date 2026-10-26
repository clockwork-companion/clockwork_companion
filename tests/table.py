"""The Table page: campaign banner, setting, party (with the side panel), stash and handouts, in Ledger light and dark.
python3 tests/table.py SITE SHOTS"""
import functools, http.server, json, os, pathlib, sys, threading
from playwright.sync_api import sync_playwright
SITE = pathlib.Path(sys.argv[1]); SH = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "smoke-shots"); SH.mkdir(parents=True, exist_ok=True)
SKINS = ["ledger", "ledger-dark"]; WIDTHS = [1280, 390]; bad = 0
BLOCK = ("gstatic.com", "googleapis.com", "firebaseio.com", "firebaseapp.com", "identitytoolkit", "securetoken")
IGNORE = ("Failed to load resource", "net::ERR_", "ERR_FAILED", "firestore", "Firestore", "firebase")
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(SITE)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{srv.server_address[1]}/index.html"
MAKE = """() => { const mk = (id, name, player, prof, at, bio) => { const c = CW.blankCharacter(); c.id = id; c.name = name; c.player = player; c.campaign = 'Talon Saga'; c.profession = prof; c.bio = bio;
    Object.entries(at).forEach(([k, v]) => c.attrs[k] = {base: v, value: v}); c.modules = {craft: false, magic: false}; return c; };
  const a = mk('tst', 'Batasai Khan', 'Sinan', 'Warder', {STR: 14, DEX: 13, END: 15, MND: 12, WIL: 14, WIS: 13, PRS: 11}, 'A banner-rider of the Ninth, sworn to the Eternal Blue Sky.\\n\\nHe keeps a falcon and an old grudge.');
  const b = mk('t2', 'Odval', 'Utku', 'Shaman', {STR: 9, DEX: 12, END: 11, MND: 13, WIL: 16, WIS: 15, PRS: 12}, 'Speaks to the dead in the felt tents of the north.');
  localStorage.setItem('cw-companion-chars', JSON.stringify({tst: a, t2: b})); localStorage.setItem('cw-current', JSON.stringify('tst'));
  localStorage.setItem('cw-table-camp', JSON.stringify('Talon Saga'));
  const next = new Date(Date.now() + 3 * 86400e3); next.setHours(19, 30, 0, 0); const iso = new Date(next - next.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  localStorage.setItem('cw-board', JSON.stringify({ boards: { 'talon-saga': { tagline: 'The year is 1227. The Great Khan is dead, and the sky has opened.', next: iso,
    setting: 'The steppe runs from the Altai to the Khingan, and every river has a spirit.\\n\\n**Steam** came to the khanates on Uyghur barges; **magick** was always here, in the drums of the shamans and the runes on the horse-standards.',
    recap: 'The party reached the Orkhon and found the ger camp burned. A falcon led them north to a *talking stone*.' } },
    stashes: { 'talon-saga': { coins: 42, items: [{id: 'i1', name: 'Coil of horsehair rope', qty: 2, note: ''}, {id: 'i2', name: 'Uyghur map case', qty: 1, note: 'sealed'}] } },
    handouts: [{ id: 'h1', camp: 'talon-saga', title: 'A letter sealed in black wax', text: 'To the riders of the Ninth Banner: come to Karakorum before the new moon.', shown: true, at: 2 },
      { id: 'h2', camp: 'talon-saga', title: 'The talking stone', text: 'Runes cut deep, older than the khanate.', shown: false, at: 1 }] })); }"""
with sync_playwright() as p:
    b = p.chromium.launch(channel=os.environ.get("PW_CHANNEL") or None)
    for w in WIDTHS:
        for skin in SKINS:
            mob = w < 600; dark = skin.endswith("-dark"); skin_ = skin[:-5] if dark else skin
            ctx = b.new_context(viewport={"width": w, "height": 900}, has_touch=mob, is_mobile=mob, color_scheme="dark" if dark else "light")
            ctx.route("**/*", lambda r: r.abort() if any(x in r.request.url for x in BLOCK) else r.continue_())
            ctx.add_init_script(f"try {{ localStorage.setItem('cw-skin', {json.dumps(json.dumps(skin_))}); }} catch (e) {{}}")
            pg = ctx.new_page(); probs = []
            pg.on("pageerror", lambda e: probs.append(f"pageerror {e}"))
            pg.on("console", lambda m: m.type == "error" and not any(i in m.text for i in IGNORE) and probs.append(f"console {m.text}"))
            pg.goto(url); pg.wait_for_timeout(1000); pg.evaluate(MAKE); pg.reload(); pg.wait_for_timeout(1500)
            n = f"{w}-{skin}"
            pg.locator(".charnav").get_by_role("button", name="Table", exact=True).click(); pg.wait_for_timeout(900)
            pg.screenshot(path=str(SH / f"table-{n}-table.png"), full_page=True)
            if pg.evaluate("document.documentElement.scrollWidth > innerWidth + 1"): probs.append("sideways scroll")
            pg.locator(".tmember").first.click(); pg.wait_for_timeout(500); pg.screenshot(path=str(SH / f"table-{n}-member.png")); pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
            pg.locator(".hopen").first.click(); pg.wait_for_timeout(400); pg.screenshot(path=str(SH / f"table-{n}-handout.png")); pg.keyboard.press("Escape"); pg.get_by_role("button", name="Close").click(); pg.wait_for_timeout(300)
            pg.locator(".tadd input").fill("Strange bronze key"); pg.locator(".tadd button").click(); pg.wait_for_timeout(300)
            if pg.locator(".titem").count() != 3: probs.append("stash add failed")
            pg.get_by_role("button", name="Edit").first.click(); pg.wait_for_timeout(300); pg.screenshot(path=str(SH / f"table-{n}-edit.png"))
            pg.locator(".tmember").first.click(); pg.wait_for_timeout(300)
            if pg.locator(".tattr").count() != 7: probs.append("member panel lacks the seven attributes")
            print(("FAIL " if probs else "ok   ") + n, probs[:4]); bad += bool(probs); ctx.close()
    b.close()
sys.exit(1 if bad else 0)
