"""Syntax-check every inline <script> in a built page with Node.

    python3 tests/check_scripts.py path/to/index.html
"""
import pathlib, re, subprocess, sys, tempfile

html = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
scripts = re.findall(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", html, re.S)
bad = 0
with tempfile.TemporaryDirectory() as d:
    for i, code in enumerate(scripts):
        f = pathlib.Path(d) / f"inline-{i}.js"; f.write_text(code, encoding="utf-8")
        r = subprocess.run(["node", "--check", str(f)], capture_output=True, text=True)
        if r.returncode:
            bad += 1; print(f"inline script {i} doesn't parse:\n{r.stderr.strip()[:1500]}")
print(f"{len(scripts) - bad}/{len(scripts)} inline scripts parse")
sys.exit(1 if bad else 0)
