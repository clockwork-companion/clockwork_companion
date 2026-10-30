"""How big is the page, and what makes it big? A size report for the built site.

    python3 tools/size_report.py            # a report on the current src/
    python3 tools/size_report.py --json     # the same numbers as JSON

It measures, for each part of the app (core, crafting, magic, themes, background effects, combat, hidden games, data):
the bytes it adds to index.html, raw and gzipped (what GitHub Pages sends). CSS rules are put with the part whose
code uses their classes (a rule keyed on html[data-skin="…"] goes with that theme). It also lists candidates for
removal: CSS classes that no code uses any more, @keyframes nothing plays, and top-level names nothing calls.
Candidates are only candidates: a class can be built at run time ("tab-" + k), so check before deleting.
"""
import gzip, json, pathlib, re, sys
from collections import defaultdict

SRC = pathlib.Path(__file__).resolve().parent.parent / "src"
gz = lambda s: len(gzip.compress(s.encode(), 9))

# Which part of the app each file belongs to.
def part_of(name):
    if name.startswith("craft"): return "Crafting"
    if name.startswith("magic"): return "Magic"
    if name.startswith("fx-"): return "Theme effects"
    if name.startswith("egg"): return "Hidden games"
    if name in ("skills-data.js", "skill-tables.js", "rules-info.js"): return "Rulebook data"
    if name == "combat.js": return "Combat"
    if name.startswith("vendor") or name in ("preact.umd.js", "hooks.umd.js", "htm.umd.js"): return "Libraries"
    return "Core"

JS = sorted(p for p in SRC.glob("*.js")) + sorted((SRC / "vendor").glob("*.js")) + [SRC / "web" / "pwa.js"]
HTML = sorted(SRC.glob("egg*.html"))
CSS = (SRC / "app.css").read_text()

# ---- CSS: split into rules (selector + body), keeping @media / @supports wrappers' text with their rules.
def css_rules(text):
    text = re.sub(r"/\*.*?\*/", lambda m: " " * len(m.group(0)), text, flags=re.S)   # comments out, positions kept
    out, i, n, stack = [], 0, len(text), []
    start = 0
    while i < n:
        ch = text[i]
        if ch == "{":
            head = text[start:i].strip()
            if head.startswith("@keyframes") or head.startswith("@font-face"):
                depth, j = 1, i + 1
                while j < n and depth: depth += {"{": 1, "}": -1}.get(text[j], 0); j += 1
                out.append((head, text[start:j], stack[:])); i = j; start = j; continue
            if head.startswith("@"): stack.append(head); start = i + 1; i += 1; continue
            j = text.index("}", i)
            out.append((head, text[start:j + 1], stack[:])); i = j + 1; start = i; continue
        if ch == "}":
            if stack: stack.pop()
            start = i + 1
        i += 1
    return out

rules = css_rules(CSS.replace("</style>", ""))
cls_re = re.compile(r"\.(-?[a-zA-Z_][\w-]*)")
skin_re = re.compile(r'data-skin="([\w-]+)"')

# Every word that appears in the code (class names live in strings: class="a b", "x" + y, `a ${b}`).
words_of = {}
for p in JS + HTML:
    t = p.read_text()
    words_of[p.name] = set(re.findall(r"[a-zA-Z_][\w-]*", t))
all_words = set().union(*words_of.values())
# Class names built at run time: a string ending in "-" (like "tab-" + k or `mood-${m}`) makes every class with that start "used".
prefixes = set()
for p in JS + HTML:
    t = p.read_text()
    prefixes |= set(re.findall(r"""["'` ]([a-z][\w]*-)["'`$]""", t)) | set(re.findall(r"""([a-z][\w]*-)\$\{""", t))

def owner_parts(c):
    ps = {part_of(f) for f, ws in words_of.items() if c in ws}
    return ps

css_by_part = defaultdict(str)
unused_cls = defaultdict(int)   # class -> bytes of rules that only exist for it
kf_defined = {}
for head, body, wraps in rules:
    if head.startswith("@keyframes"):
        name = head.split()[1]; kf_defined[name] = kf_defined.get(name, 0) + len(body)
    skins = set(skin_re.findall(head))
    if skins - {"ledger"}:
        part = "Themes: " + sorted(skins - {"ledger"})[0]
    elif head.startswith("@keyframes"):
        part = None
    else:
        classes = set(cls_re.findall(head))
        ps = set().union(*(owner_parts(c) for c in classes)) if classes else {"Core"}
        dead = [c for c in classes if c not in all_words and not any(c.startswith(px) for px in prefixes)]
        if classes and len(dead) == len(classes):
            for c in dead: unused_cls[c] += len(body)
            part = "Unused CSS"
        else:
            ps.discard("Rulebook data"); ps.discard("Libraries")
            part = "Core" if not ps or "Core" in ps else sorted(ps)[0]
    if part: css_by_part[part] += body + "\n"

# Keyframes go with whoever plays them.
plays = defaultdict(set)
for head, body, wraps in rules:
    for m in re.finditer(r"animation(?:-name)?\s*:\s*([^;}]+)", body):
        for w in re.findall(r"[a-zA-Z_][\w-]*", m.group(1)): plays[w].add(head)
unused_kf = {}
for head, body, wraps in rules:
    if not head.startswith("@keyframes"): continue
    name = head.split()[1]
    used_js = name in all_words
    if not plays.get(name) and not used_js: unused_kf[name] = len(body); css_by_part["Unused CSS"] += body + "\n"; continue
    users = [h for h in plays.get(name, [])]
    sk = {s for h in users for s in skin_re.findall(h)} - {"ledger"}
    if users and sk and all(skin_re.search(h) for h in users): css_by_part["Themes: " + sorted(sk)[0]] += body + "\n"; continue
    cls = set().union(*(set(cls_re.findall(h)) for h in users)) if users else set()
    ps = set().union(*(owner_parts(c) for c in cls)) if cls else {"Core"}
    ps -= {"Rulebook data", "Libraries"}
    css_by_part["Core" if not ps or "Core" in ps else sorted(ps)[0]] += body + "\n"

# ---- JS: bytes per part, and top-level names nothing else uses.
js_by_part = defaultdict(str)
for p in JS + HTML: js_by_part[part_of(p.name)] += p.read_text() + "\n"
all_code = "\n".join(p.read_text() for p in JS + HTML)
unused_js = []
for p in JS:
    if "vendor" in str(p): continue
    t = p.read_text()
    for m in re.finditer(r"^(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=)", t, re.M):
        name = m.group(1) or m.group(2)
        if len(re.findall(r"(?<![\w$.])" + re.escape(name) + r"(?![\w$])", all_code)) <= 1:
            # its size: up to the next top-level line
            end = re.search(r"^\S", t[m.end():], re.M); size = (end.start() if end else len(t) - m.end()) + len(m.group(0))
            unused_js.append((p.name, name, size))

parts = sorted(set(js_by_part) | set(css_by_part))
total_raw = sum(len(js_by_part[k]) + len(css_by_part[k]) for k in parts)
report = []
for k in parts:
    j, c = js_by_part.get(k, ""), css_by_part.get(k, "")
    report.append({"part": k, "js": len(j), "css": len(c), "raw": len(j) + len(c), "gzip": gz(j + c)})
report.sort(key=lambda r: -r["raw"])

if "--json" in sys.argv:
    print(json.dumps({"parts": report, "unused_css": sorted(unused_cls.items(), key=lambda x: -x[1]), "unused_keyframes": unused_kf,
                      "unused_js": unused_js, "total_raw": total_raw}, indent=1)); sys.exit()
print(f"{'Part':28} {'JS KB':>7} {'CSS KB':>7} {'Total KB':>9} {'gzip KB':>8}")
for r in report: print(f"{r['part']:28} {r['js']/1024:7.0f} {r['css']/1024:7.0f} {r['raw']/1024:9.0f} {r['gzip']/1024:8.0f}")
print(f"{'All':28} {'':7} {'':7} {total_raw/1024:9.0f}")
print(f"\nCSS classes no code uses ({len(unused_cls)}, {sum(unused_cls.values())/1024:.1f} KB of rules):")
for c, b in sorted(unused_cls.items(), key=lambda x: -x[1])[:60]: print(f"  .{c}  {b} B")
print(f"\n@keyframes nothing plays ({len(unused_kf)}): " + ", ".join(sorted(unused_kf)))
print(f"\nTop-level names nothing uses ({len(unused_js)}, {sum(s for _, _, s in unused_js)/1024:.1f} KB):")
for f, n, s in sorted(unused_js, key=lambda x: -x[2]): print(f"  {f}: {n}  ~{s} B")
