"""Write the changelog the app shows in Settings → What's new: a daily summary of the pull requests merged into a branch.

    python3 tools/changelog.py REPO_DIR BRANCH OUT_JSON [DAYS]

REPO_DIR is a checkout of BRANCH with its history (the publish workflow checks out with fetch-depth 0). Each pull
request merged into the branch is one line: its title, who made it (from the branch name: sinan/…, bedo/…, utku/…,
SinanDev…), and its number. Days are counted in Istanbul time, newest first, for the last DAYS days (default 30).

Pull requests that change nothing a player sees are left out: titles starting with "CI:", "Tests:", "Docs:" or
"CLAUDE.md", titles mentioning CI, tests, checks, workflows or CLAUDE.md, and anything with "[skip changelog]" in the title. So are release and sync
merges (Dev into main, main into Dev).
"""
import datetime as dt, json, re, subprocess, sys
from zoneinfo import ZoneInfo

repo, branch, out = sys.argv[1], sys.argv[2], sys.argv[3]
days_kept = int(sys.argv[4]) if len(sys.argv) > 4 else 30
TZ = ZoneInfo("Europe/Istanbul")
PEOPLE = {"sinan": "Sinan", "bedo": "Bedo", "utku": "Utku"}
SKIP = re.compile(r"^\s*(CI|Tests?|Docs?)\s*:|CLAUDE\.md|\bCI\b|\btests?\b|\bchecks\b|\bworkflows?\b|\[skip changelog\]", re.I)

log = subprocess.run(["git", "-C", repo, "log", "--first-parent", "--merges", "--format=%cI%x1f%s%x1f%b%x1e", branch],
                     capture_output=True, text=True, check=True).stdout
cutoff = dt.datetime.now(TZ).date() - dt.timedelta(days=days_kept)
days = {}
for rec in log.split("\x1e"):
    rec = rec.strip("\n")
    if not rec: continue
    when, subject, body = (rec.split("\x1f") + ["", ""])[:3]
    m = re.match(r"Merge pull request #(\d+) from ([^/\s]+)/(\S+)", subject)
    if not m: continue                                  # local merges ("Merge branch …") aren't pull requests
    num, head = int(m.group(1)), m.group(3)
    if head in ("Dev", "main"): continue                # releases and syncs repeat entries already listed
    title = next((l.strip() for l in body.splitlines() if l.strip()), "")
    # A title GitHub filled in from the branch name ("Sinan/table page") becomes "Table page".
    bm = re.match(r"^([A-Za-z]+)/(.+)$", title)
    if bm and bm.group(1).lower() in PEOPLE: title = bm.group(2).replace("-", " ").strip().capitalize()
    if not title or SKIP.search(title): continue
    day = dt.datetime.fromisoformat(when).astimezone(TZ).date()
    if day < cutoff: break                              # first-parent history is newest first
    who = next((n for k, n in PEOPLE.items() if head.lower().startswith(k)), "")
    days.setdefault(day.isoformat(), []).append({"t": title, "pr": num, "by": who})

result = {"branch": branch, "made": dt.datetime.now(TZ).isoformat(timespec="minutes"),
          "days": [{"date": d, "items": items} for d, items in sorted(days.items(), reverse=True)]}
with open(out, "w", encoding="utf-8") as f: json.dump(result, f, ensure_ascii=False, separators=(",", ":"))
print(f"{out}: {sum(len(d['items']) for d in result['days'])} changes over {len(result['days'])} days")
