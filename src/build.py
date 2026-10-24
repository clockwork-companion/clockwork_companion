"""Assemble the Clockwork Companion pages from the source files.

    python3 build.py                 -> clockwork-companion.html (the claude.ai artifact)
    python3 build.py --web DIR       -> DIR/ ready to upload as a website (GitHub Pages): index.html, firebase-config.js, …
    python3 build.py --web DIR --dev -> the same, marked as the Dev test page (a DEV ribbon and title)
    python3 build.py --local DIR     -> DIR/test.html, loading Preact/htm from DIR/node_modules (offline testing)
    python3 build.py --local-web DIR -> DIR/test-web.html, the website build with local libraries (offline testing)
"""
import sys, pathlib, shutil, json, hashlib

HERE = pathlib.Path(__file__).parent
CDN = {
    "preact": "https://unpkg.com/preact@10.19.3/dist/preact.umd.js",
    "hooks": "https://unpkg.com/preact@10.19.3/hooks/dist/hooks.umd.js",
    "htm": "https://unpkg.com/htm@3.1.1/dist/htm.umd.js",
    "fb-app": "https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js",
    "fb-store": "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore-compat.js",
    "fb-auth": "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth-compat.js",
}
VENDOR = {"preact": "vendor/preact.umd.js", "hooks": "vendor/hooks.umd.js", "htm": "vendor/htm.umd.js"}   # Preact 10.19.3, htm 3.1.1
LOCAL = {
    "preact": "node_modules/preact/dist/preact.umd.js",
    "hooks": "node_modules/preact/hooks/dist/hooks.umd.js",
    "htm": "node_modules/htm/dist/htm.umd.js",
    "fb-app": "firebase-mock.js",
    "fb-store": "firebase-mock.js",
    "fb-auth": "firebase-mock.js",
}


def read(name):
    return (HERE / name).read_text().rstrip("\n")


DEV_MARK = ('<style>.devflag{position:fixed;z-index:999;top:10px;left:-34px;transform:rotate(-45deg);width:130px;padding:3px 0;'
            'background:#c0392b;color:#fff;font:700 11px/1.4 system-ui,sans-serif;letter-spacing:.2em;text-align:center;'
            'box-shadow:0 2px 6px rgb(0 0 0 / .35);pointer-events:none}</style>\n'
            '<div class="devflag" title="Dev test page. Use a test table password so real characters stay untouched.">DEV</div>\n')


# Installable app (website only): manifest, icons and the offline worker.
APP_HEAD = ('<link rel="manifest" href="manifest.webmanifest">\n<meta name="theme-color" content="#1b130b">\n'
            '<link rel="icon" type="image/png" href="icons/favicon-48.png">\n<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
            '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n'
            '<meta name="apple-mobile-web-app-title" content="Clockwork">\n')


def manifest(dev=False):
    return json.dumps({
        "name": "Clockwork Companion" + (" (Dev)" if dev else ""), "short_name": "Clockwork" + (" Dev" if dev else ""),
        "id": "./" , "start_url": "./", "scope": "./", "display": "standalone", "orientation": "any",
        "background_color": "#140d08", "theme_color": "#1b130b",
        "description": "Character sheets, Karma, vitals, gear and the GM table for Clockwork: Tales of Steam and Magick.",
        "icons": [{"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
                  {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
                  {"src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}],
    }, indent=2)


def build(libs, web=False, dev=False):
    head = read("app.css")
    if dev:
        head = head.replace("<title>Clockwork Companion</title>", "<title>Clockwork Companion · DEV</title>", 1)
    keys = ["preact", "hooks", "htm"]
    backend = ""
    if web:
        head = head.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "")
        head = '<!doctype html>\n<html lang="en">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + APP_HEAD + head
        keys = ["fb-app", "fb-store", "fb-auth"] + keys
        backend = '<script src="firebase-config.js"></script>\n<script>\n' + read("web-backend.js") + "\n</script>\n<script>\n" + read("web/pwa.js") + "\n</script>\n"
    seen, tags = set(), []
    for k in keys:
        if web and libs is CDN and k in VENDOR:   # the website carries its own copy of Preact and htm (no outside download)
            tags.append("<script>\n" + read(VENDOR[k]) + "\n</script>"); continue
        if libs[k] not in seen:
            seen.add(libs[k]); tags.append(f'<script src="{libs[k]}"></script>')
    data = "\n".join(read(f) for f in ["rules.js", "skills-data.js", "skill-tables.js", "rules-info.js"])
    app = "\n".join(read(f) for f in ["app.js", "fx-blackwall.js", "craft.js", "craft-armor.js", "genesis.js", "gm.js"])
    if dev:
        head += "\n" + DEV_MARK
    egg = ("\n" + read("egg.html") + "\n" + read("egg-furnace.html") + "\n") if web else ""   # hidden mini-games (Skyward Boiler, Furnace Below), website only
    return f'{head}\n<div id="app"></div>\n' + "\n".join(tags) + f"\n{backend}<script>\n{data}\n</script>\n<script>\n{app}\n</script>\n{egg}"


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["--local"]:
        out = pathlib.Path(a[1]) / "test.html"; out.write_text(build(LOCAL))
    elif a[:1] == ["--local-web"]:
        out = pathlib.Path(a[1]) / "test-web.html"; out.write_text(build(LOCAL, web=True))
    elif a[:1] == ["--web"]:
        d = pathlib.Path(a[1]); d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(build(CDN, web=True, dev="--dev" in a))
        for f in ["firestore.rules", "README.md"]:
            shutil.copy(HERE / "web" / f, d / f)
        if (HERE / "web" / "egg").is_dir():   # art and sound for the hidden games
            shutil.copytree(HERE / "web" / "egg", d / "egg", dirs_exist_ok=True)
        (d / "manifest.webmanifest").write_text(manifest("--dev" in a))
        version = hashlib.sha256((d / "index.html").read_bytes()).hexdigest()[:12]
        (d / "sw.js").write_text(read("web/sw.js").replace("__BUILD_VERSION__", version))
        shutil.copytree(HERE / "web" / "icons", d / "icons", dirs_exist_ok=True)
        if not (d / "firebase-config.js").exists():
            shutil.copy(HERE / "web" / "firebase-config.js", d / "firebase-config.js")
        out = d / "index.html"
    else:
        out = HERE / "clockwork-companion.html"; out.write_text(build(CDN))
    print(out, out.stat().st_size, "bytes")
