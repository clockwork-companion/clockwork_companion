"""Write the list the app's "What's new" pop-up shows: the changes since the last version.

    python3 tools/whatsnew.py REPO_DIR dev|main OUT_JSON

Every change players will notice adds one small file to changes/, written by the Claude that made it:
    changes/2026-10-27-perk-unfold.md      (the date it was written, then a short name)
holding one or two plain sentences for players. One file per change, so two branches never edit the same file.

    dev   the Dev page: every entry on Dev that the live site doesn't have yet (not in origin/main).
    main  the live site: the entries the latest release brought (in main now, not before that release).

REPO_DIR needs its history and origin/main (the publish workflow checks out with fetch-depth 0).
"""
import json, re, subprocess, sys, datetime as dt
from zoneinfo import ZoneInfo

repo, mode, out = sys.argv[1], sys.argv[2], sys.argv[3]
NAME = re.compile(r"^changes/(\d{4}-\d\d-\d\d)-([\w.-]+)\.md$")
git = lambda *a: subprocess.run(["git", "-C", repo, *a], capture_output=True, text=True).stdout

def entries(ref):
    """The changes/ files at a commit: {path: date}. Files that don't follow the naming are skipped."""
    found = {}
    for p in git("ls-tree", "-r", "--name-only", ref, "--", "changes/").splitlines():
        m = NAME.match(p)
        if m: found[p] = m.group(1)
    return found

# Releases are pull requests from Dev merged into main, newest first.
releases = [l.split(" ", 2) for l in git("log", "origin/main", "--first-parent", "--merges", "--format=%H %cI %s").splitlines()
            if re.search(r"Merge pull request #\d+ from [^/\s]+/Dev\b", l)]
now = entries("HEAD")
since = releases[0][1][:10] if releases else ""      # Dev: changes since this release; main: this release's date
if mode == "dev": have = entries("origin/main")
else: have = entries(releases[1][0]) if len(releases) > 1 else {}
items = []
for p, date in now.items():
    if p in have: continue
    text = " ".join(git("show", f"HEAD:{p}").split()).strip()
    if text: items.append({"id": p[8:-3], "date": date, "t": text})
items.sort(key=lambda i: (i["date"], i["id"]), reverse=True)

result = {"branch": "Dev" if mode == "dev" else "main", "since": since,
          "made": dt.datetime.now(ZoneInfo("Europe/Istanbul")).isoformat(timespec="minutes"), "items": items}
with open(out, "w", encoding="utf-8") as f: json.dump(result, f, ensure_ascii=False, separators=(",", ":"))
print(f"{out}: {len(items)} changes ({mode}, last release {since or 'none'})")
