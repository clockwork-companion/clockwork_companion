"""Test the GM's "Move all to…" (the password-reset path) against the in-memory Firebase stand-in.

    python3 tests/move_characters.py SITE_DIR [SHOTS_DIR]

SITE_DIR is a website build (`python3 src/build.py --web SITE_DIR`). The page is served with the three Firebase
scripts swapped for tests/firebase-mock.js, signed in as the GM of a test table with two player accounts.
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
seed = {
    f"{T}/meta/table": {"owner": "gm1", "name": "Test table"},
    f"{T}/members/gm1": {"role": "gm", "name": "sinan", "joined": 1},
    f"{T}/members/old1": {"role": "player", "name": "bedo", "joined": 2},
    f"{T}/members/new1": {"role": "player", "name": "bedo2", "joined": 3},
    f"{T}/characters/c1": {"name": "Batasai", "players": ["old1"]},
    f"{T}/characters/c2": {"name": "Hawk", "companionOf": "c1", "players": ["old1"]},
    f"{T}/characters/c3": {"name": "Mira", "players": ["new1", "old1"]},
    f"{T}/characters/c4": {"name": "Other", "players": ["gm1"]},
}

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(work))); threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{srv.server_address[1]}/index.html"
ok = True
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 1280, "height": 900})
    ctx.route("**/*", lambda r: r.abort() if "fonts.g" in r.request.url else r.continue_())
    ctx.add_init_script(f"window.__MOCK_USER = {{ uid: 'gm1', email: 'sinan@test-project.firebaseapp.com' }}; window.__MOCK_SEED = {json.dumps(seed)};"
                        f"try {{ localStorage.setItem('cw-table-key', '{key}'); }} catch (e) {{}}")
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(url); pg.wait_for_timeout(2000)
    pg.get_by_text("GM table").first.click(); pg.wait_for_timeout(800)
    sel = pg.get_by_label("Move all of bedo's characters to another account")
    print("move control for bedo:", sel.count())
    sel.select_option(label="bedo2"); pg.wait_for_timeout(300)
    print("confirm:", pg.get_by_text("Move 3 characters from bedo to bedo2?").count())
    pg.screenshot(path=str(SHOTS / "move-confirm.png"))
    pg.get_by_role("button", name="Move", exact=True).click(); pg.wait_for_timeout(1500)
    players = pg.evaluate(f"""Object.fromEntries(['c1','c2','c3','c4'].map(id => [id, (window.__mockStore.get('{T}/characters/' + id) || {{}}).players]))""")
    print("players after move:", players)
    want = {"c1": ["new1"], "c2": ["new1"], "c3": ["new1"], "c4": ["gm1"]}
    ok = players == want and not errs
    pg.screenshot(path=str(SHOTS / "move-done.png"))
    print("errors:", errs[:4]); b.close()
srv.shutdown()
print("PASS" if ok else "FAIL"); sys.exit(0 if ok else 1)
