/* ================= Magic tab =================
   One section per school of magic, shown only once the character has points in it (like Crafting).
   Warding is the first: a dictionary of Words of Power (Words), a board where those words float and are linked into a
   Ward sentence that draws its own sigil (Inscribe), and the warder's saved and formulaic wards (Wards).
   The rules (costs, grammar, Sigils per AP, Fatigue, the Active perks) live in rules.js: wardState, wardCost, … */
const MAGIC = [
  ["ward", "Warding", "Warding", "Sentences of Words of Power, inscribed as Sigils."],
  ["harm", "Harmony", "Occult: Harmony", "The body's spiritual energy, guided through its chakras."],
  ["demon", "Daemonology", "Demonology", "Contracts with daemons, summoned to the prime plane."],
  ["dream", "Dreamwalking", "Dreamwalking", "The dream realm, and bending it to your will."],
];
const magicOpen = c => MAGIC.filter(([, , skill]) => num((c.skills || {})[skill]) > 0);

function MagicTab({ c, update }) {
  const open = magicOpen(c);
  const [chosen, setSub] = useState(() => lsGet("cw-magic-sub", "ward"));
  const sub = open.some(x => x[0] === chosen) ? chosen : (open[0] || MAGIC[0])[0];
  useEffect(() => lsSet("cw-magic-sub", sub), [sub]);
  return html`<div class="tabpane magic">
    ${open.length > 1 && html`<nav class="craftnav" aria-label="Schools">${open.map(([k, n, skill]) => html`<button type="button" aria-pressed=${sub === k} onClick=${() => setSub(k)}>
      <span>${n}</span><small>${skill} ${num(c.skills[skill])}</small></button>`)}</nav>`}
    ${sub === "ward" && html`<${Warding} c=${c} update=${update} />`}
    ${sub === "harm" && html`<${Harmony} c=${c} update=${update} />`}
    ${sub === "demon" && html`<${Demonology} c=${c} update=${update} />`}
    ${sub === "dream" && html`<${Dreamwalking} c=${c} update=${update} />`}
  </div>`;
}

/* ---------- Warding ---------- */
const WARD_PAGES = [["words", "Words"], ["inscribe", "Inscribe"], ["wards", "Wards"]];
const wardText = tokens => tokens.map(t => t.text).join(" ");
// A steady pseudo-random number from a string, so each word floats in its own place every time.
const wardSeed = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return ((h >>> 0) % 10000) / 10000; };
// Every word has its own rune, drawn from its spelling: a stave with two or three branches, hooks or crossings on a
// small grid, like the old runic alphabets. The same word always gets the same rune; its kind gives the colour.
const WARD_RUNES = new Map();
function wardRune(text) {
  const key = String(text).toLowerCase();
  if (WARD_RUNES.has(key)) return WARD_RUNES.get(key);
  let h = 0x811c9dc5; for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const twin = rnd() < .22, Y = [-6, -2, 2], strokes = [];
  let d = twin ? "M-3 -6L-3 6M3 -6L3 6" : "M0 -6L0 6";
  const x0 = twin ? 3 : 0, n = 2 + (rnd() < .45 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const y = Y[Math.floor(rnd() * 3)], side = rnd() < .5 ? -1 : 1, form = Math.floor(rnd() * 4), sx = side * x0;
    const s = form === 0 ? `M${sx} ${y}L${sx + side * 4} ${y + 4}`            // a branch falling away
      : form === 1 ? `M${sx} ${y + 4}L${sx + side * 4} ${y}`                     // a branch rising
      : form === 2 ? `M${sx} ${y}L${sx + side * 4} ${y + 2}L${sx} ${y + 4}`      // a hook
      : twin ? `M-3 ${y}L3 ${y + 4}` : `M-4 ${y}L4 ${y + 4}`;                    // a crossing
    if (!strokes.includes(s)) { strokes.push(s); d += s; }
  }
  WARD_RUNES.set(key, d);
  return d;
}
const Rune = ({ text, cls = "" }) => html`<svg class=${"rune " + cls} viewBox="-7 -8 14 16" aria-hidden="true"><path d=${wardRune(text)} /></svg>`;
const narrowNow = () => { try { return matchMedia("(max-width: 760px)").matches; } catch { return false; } };
function useNarrow() {
  const [n, setN] = useState(narrowNow);
  useEffect(() => { let m; try { m = matchMedia("(max-width: 760px)"); } catch { return; } const f = () => setN(m.matches); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
  return n;
}

function Warding({ c, update }) {
  const st = R.wardState(c);
  const [page, setPage] = useState(() => lsGet("cw-ward-page", "words"));
  useEffect(() => lsSet("cw-ward-page", page), [page]);
  const stamina = num(c.vitals && c.vitals.exhaustion);
  const setFatigue = v => update(x => { x.ward.fatigue = Math.max(0, Math.round(num(v))); });
  // Out of combat, each point of Stamina spent clears 10 Fatigue.
  const restWithStamina = () => update(x => {
    const was = num(x.ward.fatigue); x.ward.fatigue = Math.max(0, was - 10); R.setStamina(x, num(x.vitals.exhaustion) + 1);
    addLog(x, `Warding: spent 1 Stamina to clear Fatigue (${was} → ${x.ward.fatigue})`);
  });
  return html`
    <section class="frame wardhead"><${Head} title="Warding" topic="warding" />
      <p class="sub">Wards are sentences made of Words of Power. Each word costs Sigils; your AP buy Sigils, and Fatigue takes some back.</p>
      <div class="facts ptfacts">${[
        ["Warding", `${st.lvl}`],
        ["Modifier", `${st.mod}%${st.bonus ? ` (incl. ${st.bonus >= 0 ? "+" : ""}${st.bonus})` : ""}`],
        ["Sigils per AP", `${st.spa}`],
        ["Can inscribe", !st.formulaic ? "From Warding 3" : [st.formulaic && "Formulaic", st.ritual && "Ritual", st.spontaneous && "Spontaneous"].filter(Boolean).join(", ")],
      ].map(([k, v]) => html`<div class="fact"><span>${k}</span><b>${v}</b></div>`)}</div>
      <div class="row wardfat">
        <span class="lbl">Fatigue</span>
        <span class="ptstepper"><button class="iconbtn" aria-label="Lower Fatigue" disabled=${!st.fatigue} onClick=${() => setFatigue(st.fatigue - 1)}>−</button>
          <b class="wardfatn" aria-live="polite">${st.fatigue}</b>
          <button class="iconbtn" aria-label="Raise Fatigue" onClick=${() => setFatigue(st.fatigue + 1)}>+</button></span>
        <span class="muted">Takes ${st.fatigue} Sigils off every inscription. A long rest clears it.</span>
        ${st.fatigue > 0 && html`<button class="btn small" disabled=${stamina >= 10} title="Out of combat only. Each Stamina spent clears 10 Fatigue." onClick=${restWithStamina}>Spend 1 Stamina: −10 Fatigue</button>`}
      </div>
      ${st.formulaic && st.lvl < 8 && html`<p class="muted wardnote">Warding is used out of combat at this level; from Warding 8 you can inscribe as a reaction.</p>`}
    </section>
    <div class="seg wardpages" role="tablist" aria-label="Warding">${WARD_PAGES.map(([k, n]) => html`<button role="tab" aria-selected=${page === k} aria-pressed=${page === k} onClick=${() => setPage(k)}>${n}</button>`)}</div>
    ${page === "words" && html`<${WardWords} c=${c} st=${st} update=${update} />`}
    ${page === "inscribe" && html`<${WardBoard} c=${c} st=${st} update=${update} />`}
    ${page === "wards" && html`<${WardList} c=${c} st=${st} update=${update} toBoard=${() => setPage("inscribe")} />`}`;
}

/* ---------- Words: the warder's book ----------
   An old book on the desk: the first page holds the grammar (Subjects, Adverbs, Conjunctions), then the Words of Power
   in alphabetical order, six to a page, and a fresh page to write a new word on. Turn the pages with the corners or
   the arrows; on a phone the book shows one page at a time. */
/* The book's paper and leather textures. They are drawn once, here, from SVG noise into ordinary bitmaps: the browser
   would otherwise redraw the noise every frame while the pages turn, which is what made the book stutter. */
const TOME_TEX = {"stain": "<svg xmlns='http://www.w3.org/2000/svg' width='520' height='620'><filter id='s'><feTurbulence type='fractalNoise' baseFrequency='.011 .014' numOctaves='4' seed='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .42 0 0 0 0 .24 0 0 0 0 .08 0 0 0 -2.6 1.45'/></filter><rect width='100%' height='100%' filter='url(#s)'/></svg>", "noise": "<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .3 0 0 0 0 .17 0 0 0 0 .05 0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>", "marble": "<svg xmlns='http://www.w3.org/2000/svg' width='520' height='620'><filter id='s'><feTurbulence type='fractalNoise' baseFrequency='.013' numOctaves='4' seed='9' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .2 0 0 0 0 .1 0 0 0 0 .04 0 0 0 1.4 -.35'/></filter><rect width='100%' height='100%' filter='url(#s)'/></svg>"};
(function tomeTextures() {
  try {
    const root = document.documentElement;
    Object.entries(TOME_TEX).forEach(([k, svg]) => {
      const w = +svg.match(/width='(\d+)'/)[1], h = +svg.match(/height='(\d+)'/)[1], img = new Image();
      img.onload = () => { try {
        const cv = document.createElement("canvas"); cv.width = w; cv.height = h; cv.getContext("2d").drawImage(img, 0, 0);
        cv.toBlob(b => { if (b) root.style.setProperty("--tex-" + k, `url(${URL.createObjectURL(b)})`); });
      } catch (e) {} };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  } catch (e) {}
})();

/* ---------- the book's moving paper ----------
   A sheet (the cover or a page) is a row of thin strips, each hinged on the one before, so it bends as it turns:
   the strip at the spine leads and the free edge trails behind, a lot for a page and a little for the stiff cover.
   Each strip is shaded by how far it faces away from you. Sheets live on their own layer (.tomefx) laid exactly over
   the book while they move, so the book underneath is never redrawn: only the strips move, which keeps it smooth. */
const tomeEase = { inOut: p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2, sine: p => -(Math.cos(Math.PI * p) - 1) / 2 };
function tomeSheet(host, box, { s = 1, front = "", back = "", cls = "", n = 8 }) {
  const N = n, el = document.createElement("div"), strips = [], sw = box.w / N, ov = 1;
  el.className = "tsheet " + cls;
  Object.assign(el.style, { left: box.x + "px", top: box.y + "px", width: box.w + "px", height: box.h + "px" });
  let parent = el;
  for (let i = 0; i < N; i++) {
    const st = document.createElement("div"), fi = s > 0 ? i : N - 1 - i, bi = N - 1 - fi;
    st.className = "tstrip"; st.style.width = sw + "px";
    st.style[s > 0 ? "left" : "right"] = i ? "100%" : "0"; st.style.transformOrigin = s > 0 ? "left center" : "right center";
    // each face overlaps its neighbours by a pixel (no seams) and shows its own slice of the full-size picture
    st.innerHTML = `<div class="tface front"><div class="tfin" style="left:${ov - fi * sw}px;width:${box.w}px">${front}</div><i class="tshade"></i></div>`
      + `<div class="tface back"><div class="tfin" style="left:${ov - bi * sw}px;width:${box.w}px">${back}</div><i class="tshade"></i></div>`;
    parent.appendChild(st); strips.push({ st, sh: [...st.children].map(f => f.lastChild), o: -1 }); parent = st;
  }
  host.appendChild(el);
  // a: how far it has turned (0 lying on its own side, 180 on the other); b: how much it bends (its edge lags by b).
  const tail = N * (N - 1) / 2;
  el.pose = (a, b) => {
    let tot = 0;
    strips.forEach(x => {
      const i = strips.indexOf(x), rel = i === 0 ? a + .3 * b : -1.3 * b * i / tail;
      tot += rel; x.st.style.transform = `rotateY(${(-s * rel).toFixed(2)}deg)`;
      const d = Math.abs(Math.cos(tot * Math.PI / 180)), o = Math.round((.62 * (1 - d) + (tot > 90 ? .06 : 0)) * 40) / 40;
      if (o !== x.o) { x.o = o; x.sh[0].style.opacity = o; x.sh[1].style.opacity = o; }   // only touch what changed
    });
  };
  el.pose(0, 0);
  return el;
}
// Move a sheet from one angle to another over ms, starting after `wait`; onFrame gets the angle; onCross fires once
// when the sheet passes upright (90°), which is when a page changes sides.
function tomeMove(sheet, { from, to, ms, wait = 0, bend = 60, ease = tomeEase.inOut, fadeAt = 0, onFrame, onCross }) {
  return new Promise(done => {
    let t0 = 0, crossed = false;
    const step = now => {
      if (!t0) t0 = now + wait;
      const p = R.clamp((now - t0) / ms, 0, 1), e = ease(p), a = from + (to - from) * e;
      const b = Math.sign(to - from) * bend * Math.pow(Math.sin(Math.PI * Math.min(1, p * 1.08)), .9) * (1 - .25 * p);
      if (now >= t0) {
        sheet.pose(a, b);
        if (fadeAt && p > fadeAt) sheet.style.opacity = String(1 - (p - fadeAt) / (1 - fadeAt));
        onFrame && onFrame(a);
        if (!crossed && (from < to ? a >= 90 : a <= 90)) { crossed = true; onCross && onCross(); }
      }
      p < 1 ? requestAnimationFrame(step) : done();
    };
    requestAnimationFrame(step);
  });
}
const tomeWait = ms => new Promise(r => setTimeout(r, ms));
const tomeGeom = tome => {
  const pg = tome.querySelector(".tomepages"), x = pg.offsetLeft, y = pg.offsetTop, w = pg.offsetWidth, h = pg.offsetHeight;
  return { full: { x, y, w, h }, left: { x, y, w: w / 2, h }, right: { x: x + w / 2, y, w: w / 2, h } };
};
// The layer the paper moves on: the same size, place and tilt as the book.
function tomeFx(tome) {
  const fx = tome.parentNode.querySelector(".tomefx"); fx.innerHTML = "";
  fx.classList.toggle("single", tome.classList.contains("single"));
  Object.assign(fx.style, { display: "block", left: tome.offsetLeft + "px", top: tome.offsetTop + "px", width: tome.offsetWidth + "px", height: tome.offsetHeight + "px", transform: getComputedStyle(tome).transform });
  return fx;
}
const tomeFxClear = fx => { if (!fx) return; fx.innerHTML = ""; fx.style.display = "none"; fx.style.transform = ""; };
const tomeGhost = (host, box, htmlStr) => {
  const g = document.createElement("div"); g.className = "tghost";
  Object.assign(g.style, { left: box.x + "px", top: box.y + "px", width: box.w + "px", height: box.h + "px" });
  g.innerHTML = htmlStr; host.appendChild(g); return g;
};
const BLANK_R = `<div class="tomepage recto blank"></div>`, BLANK_V = `<div class="tomepage verso blank"></div>`;
/* The page edges along the bottom: a stack under each page, as thick as the pages lying on that side. The book holds
   plenty of blank pages after the written ones, so each turned leaf moves a little thickness from right to left. */
const TOME_STACK = 18, TOME_LEAF = 1.6;
const tomeLeftStack = turned => Math.min(TOME_STACK - 4, 2 + TOME_LEAF * turned);
function tomeBlocks(tome, left) {
  const G = tomeGeom(tome), single = tome.classList.contains("single"), [l, r] = tome.querySelectorAll(".tomeblock");
  if (!l || !r) return;
  const top = G.full.y + G.full.h - 1;
  if (single) { Object.assign(r.style, { left: G.full.x + "px", width: G.full.w + "px", top: top + "px", height: TOME_STACK - Math.min(left, TOME_STACK - 4) + "px" }); l.style.height = "0px"; return; }
  Object.assign(l.style, { left: G.left.x + "px", width: G.left.w + "px", top: top + "px", height: left + "px" });
  Object.assign(r.style, { left: G.right.x + "px", width: G.right.w + "px", top: top + "px", height: TOME_STACK - left + "px" });
}
// Opening: the shut book slides into place, the cover swings over to the left, then a few pages flutter after it.
// Closing is the same in reverse. `single` is the phone's one-page book: there the cover and pages swing away out of view.
async function tomeOpenClose(tome, { opening, single, coverHtml, leftHtml, turned }) {
  const fx = tomeFx(tome), G = tomeGeom(tome), W = tome.offsetWidth, H = tome.offsetHeight, base = fx.style.transform;
  const cbox = single ? { x: 0, y: 0, w: W, h: H - 22 } : { x: W / 2, y: 0, w: W / 2, h: H - 22 };
  // Until the cover lies open, only the right half of the book is there: the clip changes once, not every frame.
  let hidden = null;
  const hideLeft = v => { if (single || hidden === v) return; hidden = v; tome.style.clipPath = v ? `inset(-60px -60px -60px ${W / 2}px)` : ""; };
  const slide = v => { if (single) return; const t = `${base} translateX(${v.toFixed(1)}px)`; tome.style.transform = t; fx.style.transform = t; };
  const end = single ? 175 : 180, leaves = single ? 2 : 3, final = tomeLeftStack(turned);
  const cover = tomeSheet(fx, cbox, { s: 1, n: 5, front: `<div class="tomecover">${coverHtml}</div>`, back: `<div class="tendpaper"></div>`, cls: "tcover" });
  const pagesBox = single ? G.full : G.right;
  const ls = Array.from({ length: leaves }, (_, i) => tomeSheet(fx, pagesBox, { s: 1, front: BLANK_R, back: !single && i === leaves - 1 ? leftHtml : BLANK_V, cls: "tleaf" }));
  const lerp = (v, w) => tomeMove({ pose: () => {} }, { from: 0, to: 1, ms: 420, bend: 0, onFrame: x => slide(v + (w - v) * x) });
  const stack = v => tomeBlocks(tome, v);
  if (opening) {
    tome.classList.add("tmoving"); cover.style.zIndex = 8; hideLeft(true); slide(-W / 4); stack(0);
    if (!single) await lerp(-W / 4, 0);
    slide(0);
    const cv = tomeMove(cover, { from: 0, to: end, ms: 1350, bend: 24, fadeAt: single ? .7 : 0,
      onFrame: a => { if (a > 150) hideLeft(false); }, onCross: () => { cover.style.zIndex = 5; } });
    await Promise.all([cv, ...ls.map((l, i) => tomeMove(l, { from: 0, to: end, ms: 1050, wait: 520 + i * 190, bend: 95, ease: tomeEase.sine, fadeAt: single ? .7 : 0,
      onCross: () => stack(final * (i + 1) / leaves) }))]);
    hideLeft(false);
    return () => { tomeFxClear(fx); tome.classList.remove("tmoving"); tome.style.transform = ""; };
  }
  // closing: everything starts turned over to the left, lying on the open book
  tome.classList.add("tmoving", "tclosing"); cover.style.zIndex = 5; cover.pose(end, 0); ls.forEach(l => l.pose(end, 0)); ls.reverse();
  if (single) { cover.style.opacity = "0"; ls.forEach(l => { l.style.opacity = "0"; }); }
  const fadeIn = el => single ? a => { el.style.opacity = String(R.clamp((end - a) / 50, 0, 1)); } : null;
  await Promise.all(ls.map((l, i) => tomeMove(l, { from: end, to: 0, ms: 950, wait: i * 150, bend: 90, ease: tomeEase.sine, onFrame: fadeIn(l),
    onCross: () => stack(final * (leaves - 1 - i) / leaves) })));
  await tomeMove(cover, { from: end, to: 0, ms: 1250, bend: 24, onFrame: a => { if (a < 150) hideLeft(true); const f = fadeIn(cover); f && f(a); }, onCross: () => { cover.style.zIndex = 8; } });
  if (!single) await lerp(0, -W / 4);
  return () => tomeFxClear(fx);
}
// Turning a page: the page itself lifts, bends and lands on the other side, showing the next page on its back.
async function tomeTurn(tome, { dir, single, olds, news, turned }) {
  const fx = tomeFx(tome), G = tomeGeom(tome);
  const stack = () => tomeBlocks(tome, tomeLeftStack(turned));   // the leaf changes sides: so does its thickness
  if (single) {
    if (dir > 0) { const sh = tomeSheet(fx, G.full, { s: 1, front: olds[0], back: BLANK_V, cls: "tleaf" });
      await tomeMove(sh, { from: 0, to: 175, ms: 900, bend: 80, ease: tomeEase.sine, fadeAt: .6, onCross: stack }); }
    else { tomeGhost(fx, G.full, olds[0]); const sh = tomeSheet(fx, G.full, { s: 1, front: news[0], back: BLANK_V, cls: "tleaf" });
      sh.pose(175, 0); sh.style.opacity = "0";
      await tomeMove(sh, { from: 175, to: 0, ms: 900, bend: 80, ease: tomeEase.sine, onCross: stack, onFrame: a => { sh.style.opacity = String(R.clamp((175 - a) / 50, 0, 1)); } }); }
  } else if (dir > 0) {
    tomeGhost(fx, G.left, olds[0]);
    const sh = tomeSheet(fx, G.right, { s: 1, front: olds[1], back: news[0], cls: "tleaf" });
    await tomeMove(sh, { from: 0, to: 180, ms: 950, bend: 85, ease: tomeEase.sine, onCross: stack });
  } else {
    tomeGhost(fx, G.right, olds[1]);
    const sh = tomeSheet(fx, G.left, { s: -1, front: olds[0], back: news[1], cls: "tleaf" });
    await tomeMove(sh, { from: 0, to: 180, ms: 950, bend: 85, ease: tomeEase.sine, onCross: stack });
  }
  tomeFxClear(fx);
}
const useTomeLayout = preactHooks.useLayoutEffect;

const WARD_ROMAN = n => { let r = "", v = [[10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]]; for (const [k, s] of v) while (n >= k) { r += s; n -= k; } return r; };
const PER_PAGE = 6;
function WardWords({ c, st, update }) {
  const w = c.ward, narrow = useNarrow();
  const [editId, setEditId] = useState(""), [writing, setWriting] = useState(false);
  const list = [...w.words].sort((a, b) => a.w.localeCompare(b.w));
  const chunks = []; for (let i = 0; i < list.length; i += PER_PAGE) chunks.push(list.slice(i, i + PER_PAGE));
  const pages = [{ k: "grammar" }, ...chunks.map(ws => ({ k: "words", ws }))];
  if (!chunks.length || chunks[chunks.length - 1].length >= PER_PAGE) pages.push({ k: "words", ws: [] });   // a fresh page to write on
  pages[pages.length - 1].last = true;
  const per = narrow ? 1 : 2, spreads = Math.ceil(pages.length / per);
  const [at, setAt] = useState(0), [turn, setTurn] = useState(null);
  // The book can be shut (remembered per browser): then only its cover shows.
  const [shut, setShut] = useState(() => !!lsGet("cw-tome-shut", false)), [swing, setSwing] = useState("");
  const tomeRef = useRef(null), tplRef = useRef(null), busy = useRef(false);
  const sp = Math.min(at, spreads - 1);
  const pagesHtml = () => [...((tomeRef.current && tomeRef.current.querySelectorAll(".tomepages > .tomepage")) || [])].map(e => e.outerHTML);
  const shutTo = v => {
    if (swing || busy.current) return; lsSet("cw-tome-shut", v);
    if (reduceMotion()) { setShut(v); return; }
    busy.current = true;
    if (v) setSwing("closing"); else { setShut(false); setSwing("opening"); }
  };
  // The paper moves right after the book is drawn, before the browser paints it, so nothing flashes.
  useTomeLayout(() => {
    if (!swing || !tomeRef.current) return;
    const tome = tomeRef.current, opening = swing === "opening";
    tomeOpenClose(tome, { opening, single: narrow, turned: sp, coverHtml: tplRef.current ? tplRef.current.innerHTML : "", leftHtml: pagesHtml()[0] || BLANK_V }).then(clear => {
      busy.current = false;
      if (opening) { clear(); setSwing(""); }
      // shut: the paper layer stays over the new cover for a frame, so the swap can't be seen
      else { setShut(true); setSwing(""); requestAnimationFrame(() => requestAnimationFrame(clear)); }
    });
  }, [swing]);
  const go = to => {
    to = R.clamp(to, 0, spreads - 1); if (to === sp || busy.current || swing) return;
    if (reduceMotion()) { setAt(to); return; }
    busy.current = true; setTurn({ dir: to > sp ? 1 : -1, olds: pagesHtml() }); setAt(to);
  };
  useTomeLayout(() => {
    if (!turn || !tomeRef.current) return;
    tomeTurn(tomeRef.current, { dir: turn.dir, single: narrow, olds: turn.olds, news: pagesHtml(), turned: sp }).then(() => { busy.current = false; setTurn(null); });
  }, [turn]);
  // The page stacks follow the open spread (the moving paper sets them itself while it moves).
  useTomeLayout(() => { if (tomeRef.current && !busy.current) tomeBlocks(tomeRef.current, tomeLeftStack(sp)); });
  // A new word lands on its page: turn there.
  const learn = v => {
    const id = "w" + rid();
    update(y => { y.ward.words.push(Object.assign({ id }, v)); });
    const idx = [...list, Object.assign({ id }, v)].sort((a, b) => a.w.localeCompare(b.w)).findIndex(x => x.id === id);
    const pg = 1 + Math.floor(idx / PER_PAGE); setWriting(false); toast(`${v.w} is written in your book.`);
    const to = Math.floor(pg / per); if (to !== sp) go(to);
  };
  const shown = pages.slice(sp * per, sp * per + per);
  // A plain function, not a component, so a word half-written on a page survives the sheet refreshing.
  const page = (p, n) => html`<div class=${"tomepage " + (n % 2 ? "verso" : "recto")} key=${n}>
    ${p.k === "grammar" ? html`<h3 class="tomeh">Grammar</h3>
      <p class="tomenote">Common words, at fixed costs.${st.lvl >= 9 ? " Shade of Erebus: Subjects and Adverbs cost less." : ""}</p>
      ${["subject", "adverb", "conj"].map(k => html`<${GrammarLine} k=${k} st=${st} w=${w} update=${update} />`)}`
    : html`${n === 1 && html`<h3 class="tomeh">Words of Power</h3>`}
      ${p.ws.map(x => editId === x.id ? html`<${WordForm} key=${x.id} init=${x} words=${w.words} onCancel=${() => setEditId("")}
          onSave=${v => { update(y => { const i = y.ward.words.findIndex(z => z.id === x.id); if (i >= 0) y.ward.words[i] = Object.assign({}, y.ward.words[i], v); }); setEditId(""); }} />`
        : html`<div class=${"tomeword k-" + ((x.kinds || [])[0] || "noun")} key=${x.id}>
          <${Rune} text=${x.w} />
          <div class="tomewordtext"><b>${x.w}</b><span class="tomecost">${num(x.cost)} Sigils · <i>${(x.kinds || []).map(k2 => R.WARD_KIND_NAME[k2].toLowerCase()).join(", ")}</i></span>
            ${x.alts && html`<small>also ${x.alts}</small>`}${x.note && html`<small class="tomeaside">${x.note}</small>`}</div>
          <span class="tomeacts"><button class="iconbtn" aria-label=${`Edit ${x.w}`} title="Edit (lower the cost as you study it)" onClick=${() => setEditId(x.id)}>${PENCIL}</button>
            <button class="iconbtn" aria-label=${`Forget ${x.w}`} title="Strike it from the book" onClick=${() => update(y => { y.ward.words = y.ward.words.filter(z => z.id !== x.id); })}>×</button></span></div>`)}
      ${!w.words.length && n === 1 && html`<p class="tomenote">The pages are empty. Write your first Word of Power: Fire, Ward, Ignite, Cold…</p>`}
      ${p.last && html`<div class="tomewrite">${writing ? html`<${WordForm} words=${w.words} onCancel=${() => setWriting(false)} onSave=${learn} />`
        : html`<button type="button" class="tomenew" onClick=${() => setWriting(true)}>+ Write a new word</button>`}</div>`}`}
    <span class="tomefolio">${WARD_ROMAN(n)}</span>
  </div>`;
  const seal = useMemo(() => Array.from({ length: 12 }, (_, i) => wardRune("seal" + i)), []);
  const cover = html`<span class="tomecoverin">
      <span class="tomecovert">Words of Power</span>
      <svg class="tomeseal" viewBox="-60 -60 120 120" aria-hidden="true"><circle r="56" /><circle r="44" class="thin" />
        ${seal.map((d, i) => html`<g transform=${`rotate(${i * 30}) translate(0 -50) scale(.5)`}><path d=${d} /></g>`)}
        <g transform="scale(2.6)"><path class="big" d=${wardRune(c.name || "Warder")} /></g></svg>
      <span class="tomecovern">${c.name ? `The book of ${c.name}` : "A warder's book"}</span>
      <span class="tomecoverc">${w.words.length} word${w.words.length === 1 ? "" : "s"} written</span></span>
    <i class="tomeclasp" aria-hidden="true"></i>`;
  return html`<section class="frame wardbook">
    <h2 class="h"><span>Words</span><i class="orn" aria-hidden="true"></i></h2>
    <p class="sub">Your book of words. Adjectives, verbs and nouns are Words of Power: your own understanding of a concept, each with its own Sigil cost. You learn them by Research or Blueprinting, the cost comes down as you study them, and no other warder can teach them to you.</p>
    ${!st.spontaneous && html`<p class="ptlocked">Words of Power go into Spontaneous Wards from Warding 5 (Works of a Writer). You can fill the book now.</p>`}
    <div class="tomedesk">
    ${shut ? html`<div key="shut" class=${"tome shut" + (narrow ? " single" : "")}>
        <button type="button" class="tomecover" aria-label="Open the book" title="Open the book" onClick=${() => shutTo(false)}>${cover}</button></div>`
    : html`<div key="open" ref=${tomeRef} class=${"tome" + (narrow ? " single" : "") + (swing ? " " + swing : "")}>
      <div class="tomepages">${shown.map((p, i) => page(p, sp * per + i + 1))}
        ${!narrow && shown.length < 2 && html`<div class="tomepage recto blank"></div>`}</div>
      <i class="tomeblock l" aria-hidden="true"></i><i class="tomeblock r" aria-hidden="true"></i>
      <button type="button" class="tomecorner prev" aria-label="Turn back a page" disabled=${sp === 0} onClick=${() => go(sp - 1)}></button>
      <button type="button" class="tomecorner next" aria-label="Turn the page" disabled=${sp >= spreads - 1} onClick=${() => go(sp + 1)}></button>
    </div>`}<div class="tomefx" aria-hidden="true"></div></div>
    <div class="tomecovertpl" ref=${tplRef} hidden aria-hidden="true">${cover}</div>
    ${shut ? html`<div class="row tomenav shutnav"><button class="btn small primary" onClick=${() => shutTo(false)}>Open the book</button></div>`
    : html`<div class="row tomenav"><button class="btn small" disabled=${sp === 0} onClick=${() => go(sp - 1)}>‹ Back</button>
      <span class="muted">${per === 2 ? `Pages ${sp * 2 + 1}–${Math.min(pages.length, sp * 2 + 2)}` : `Page ${sp + 1}`} of ${pages.length}</span>
      <span class="row tomenavr"><button class="btn small" disabled=${!!swing || !!turn} onClick=${() => shutTo(true)}>Close the book</button>
      <button class="btn small" disabled=${sp >= spreads - 1} onClick=${() => go(sp + 1)}>Turn ›</button></span></div>`}
  </section>`;
}
// One line of the grammar page: its words (the book's and yours) and a place to write another.
function GrammarLine({ k, st, w, update }) {
  const G = R.WARD_GRAMMAR[k], cost = k === "subject" ? st.subjectCost : k === "adverb" ? st.adverbCost : G.cost;
  const [v, setV] = useState("");
  const add = () => { const t = v.trim(); if (!t) return;
    if ([...G.words, ...w.extra[k]].some(x => x.toLowerCase() === t.toLowerCase())) { toast(`"${t}" is already there.`); return; }
    update(x => { x.ward.extra[k].push(t); }); setV(""); };
  return html`<div class=${"tomegram k-" + k}>
    <h4>${G.n}s <span>${cost} Sigil${cost === 1 ? "" : "s"} each${k === "conj" && !st.conj ? " · from Warding 7" : ""}</span></h4>
    <p class="tomegramwords">${G.words.map(t => html`<span>${t}</span>`)}${w.extra[k].map(t => html`<span class="own">${t}<button class="iconbtn" aria-label=${`Remove ${t}`} onClick=${() => update(y => { y.ward.extra[k] = y.ward.extra[k].filter(z => z !== t); })}>×</button></span>`)}</p>
    <form class="tomeadd" onSubmit=${e => { e.preventDefault(); add(); }}>
      <input aria-label=${`Write a ${G.n.toLowerCase()}`} maxlength="30" placeholder=${k === "subject" ? "the wolves" : k === "adverb" ? "at" : "unless"} value=${v} onInput=${e => setV(e.target.value)} />
      <button class="iconbtn" type="submit" aria-label=${`Add the ${G.n.toLowerCase()}`} disabled=${!v.trim()}>+</button></form></div>`;
}

/* ---------- Inscribe ----------
   The words float; only those that can come next are lit. Picked in order, each flies into the circle as its rune and
   is linked to the one before. A finished Ward closes the figure, draws its inner star and flares. Inscribing happens
   right here: the check is rolled, the sigil is cast, and the GM's Fatigue is noted, all without leaving the board. */
function WardBoard({ c, st, update }) {
  const w = c.ward, tokens = w.board || [];
  const [o, setO] = useState({ double: false, calm: false, epic: false, ritual: false });
  const [name, setName] = useState(""), [cast, setCast] = useState(null), [phase, setPhase] = useState("");
  const sigilRef = useRef(null);
  const res = R.wardCost(c, tokens, o.epic && !o.ritual);
  const next = R.wardNext(tokens);
  const plan = R.wardPlan(c, res.total, o);
  const setBoard = fn => update(x => { x.ward.board = fn(x.ward.board || []); });
  // Every word on the board: the grammar words and the book. A word that is both a noun and a verb (Fire, Ignite)
  // takes whichever role fits next.
  const pool = [
    ...["subject", "adverb", "conj"].flatMap(k => (k === "conj" && !st.conj ? [] : [...R.WARD_GRAMMAR[k].words, ...w.extra[k]].map(t => ({ key: k + ":" + t, kinds: [k], text: t })))),
    ...(st.spontaneous ? w.words.map(x => ({ key: "w:" + x.id, kinds: x.kinds || [], text: x.w, id: x.id, cost: num(x.cost) })) : []),
  ];
  const fit = p => p.kinds.find(k => next.includes(k));
  // The field is a grid of cells, one per word, handed out in a steady shuffled order.
  const cols = Math.max(3, Math.ceil(Math.sqrt(pool.length * 1.4))), rows = Math.max(3, Math.ceil(pool.length / cols));
  const cells = useMemo(() => Array.from({ length: cols * rows }, (_, j) => j).sort((a, b) => wardSeed("c" + a) - wardSeed("c" + b)), [cols, rows]);
  const pick = (p, e) => { const k = fit(p); if (!k || cast) return;
    flyRune(e.currentTarget, sigilRef.current, p.text, k, tokens.length, [...tokens, { k }]);
    setBoard(b => [...b, { k, text: p.text, id: p.id }]); };
  const saved = w.wards.find(x => x.kind === "spontaneous" && wardText(x.tokens) === wardText(tokens));
  const save = () => { const n = name.trim(); if (!n || !res.ok) return;
    update(x => { const i = x.ward.wards.findIndex(y => y.n.toLowerCase() === n.toLowerCase());
      const it = { id: i >= 0 ? x.ward.wards[i].id : "d" + rid(), n, kind: "spontaneous", tokens: clean(tokens), intent: i >= 0 ? x.ward.wards[i].intent || "" : "" };
      if (i >= 0) x.ward.wards[i] = it; else x.ward.wards.push(it); });
    toast(`Saved "${n}" under Wards.`); setName(""); };
  if (!st.formulaic) return html`<section class="frame"><p class="ptlocked">Warding 3 (The Mightier Pen) lets you inscribe Formulaic Wards; Warding 5 adds Spontaneous Wards built from your Words of Power.</p></section>`;
  if (!st.spontaneous) return html`<section class="frame"><h2 class="h"><span>Inscribe</span><i class="orn" aria-hidden="true"></i></h2>
    <p class="ptlocked">Building your own Wards from Words of Power comes at Warding 5 (Works of a Writer). Until then, inscribe Formulaic Wards from the Wards page.</p></section>`;
  return html`<section class=${"frame wardboardf" + (cast ? " casting" : "")}>
    <h2 class="h"><span>Inscribe</span><i class="orn" aria-hidden="true"></i></h2>
    <p class="sub">Pick the words in order. Only the words that can come next are lit; each one you pick flies into the circle as its rune.</p>
    <div class="wardstage">
      <div class="wardfloat" role="group" aria-label="Words">
        ${pool.map((p, i) => { const k = fit(p), r = wardSeed(p.key), r2 = wardSeed(p.key + "~");
          // Each word gets its own cell of the field (in a shuffled order) and drifts a little inside it, so none cover another.
          const cell = cells[i], cx = (cell % cols + .05 + r * .14) / cols, cy = (Math.floor(cell / cols) + .14 + r2 * .36) / rows;
          return html`<button type="button" class=${"wardword k-" + (k || p.kinds[0]) + (k ? "" : " off")} disabled=${!k || !!cast} key=${p.key}
            style=${`--x:${(cx * 100).toFixed(1)}%;--y:${(cy * 100).toFixed(1)}%;--dx:${((r - .5) * 18).toFixed(0)}px;--dy:${((r2 - .5) * 14).toFixed(0)}px;--t:${(7 + r * 6).toFixed(1)}s;--d:${(-r2 * 6).toFixed(1)}s`}
            title=${k ? `${R.WARD_KIND_NAME[k]}${p.id ? ` · ${p.cost} Sigils` : ""}` : `Can't come next (${p.kinds.map(x => R.WARD_KIND_NAME[x].toLowerCase()).join(" / ")})`} onClick=${e => pick(p, e)}>
            <${Rune} text=${p.text} />${p.text}</button>`; })}
        ${!w.words.length && html`<p class="muted wardempty">Your book is empty. Write some Words of Power on the Words page.</p>`}
        <i class="wardmotes" aria-hidden="true"></i>
      </div>
      <${WardSigil} tokens=${tokens} ok=${res.ok} phase=${phase} svgRef=${sigilRef} />
    </div>
    <div class="wardsentence" aria-live="polite">
      ${tokens.length ? res.lines.map(l => html`<span class=${"wardtok k-" + l.t.k + (l.epic ? " epic" : "")} title=${R.WARD_KIND_NAME[l.t.k]}><${Rune} text=${l.t.text} /><b>${l.t.text}</b><small>${l.epic ? html`<s>${l.base}</s> 1` : l.cost}</small></span>`)
        : html`<span class="muted">Start with a Subject: I, The Ward…</span>`}
      <span class="wardtotal"><b>${res.total}</b> Sigils</span>
      ${!cast && html`<span class="row"><button class="btn small" disabled=${!tokens.length} onClick=${() => setBoard(b => b.slice(0, -1))}>Undo</button>
        <button class="btn small" disabled=${!tokens.length} onClick=${() => setBoard(() => [])}>Clear</button></span>`}
    </div>
    ${res.problems.length > 0 && tokens.length > 0 && html`<ul class="wardproblems">${res.problems.map(p => html`<li>${p}</li>`)}</ul>`}
    ${cast ? html`<${WardCast} c=${c} st=${st} update=${update} cast=${cast} onPhase=${setPhase} onClose=${() => { setCast(null); setPhase(""); }} />`
      : html`<${WardOptions} st=${st} o=${o} setO=${setO} wop=${tokens.some(t => R.WORD_KINDS.includes(t.k))} />
      <${WardCostBox} st=${st} plan=${plan} total=${res.total} o=${o} />
      <div class="row wardactions">
        <button class="btn primary" disabled=${!res.ok} onClick=${() => setCast({ name: saved ? saved.n : wardText(tokens), sentence: wardText(tokens), cost: res.total, o: Object.assign({}, o, { epic: o.epic && res.epicUsed > 0 }) })}>Inscribe</button>
        <form class="row wardsave" onSubmit=${e => { e.preventDefault(); save(); }}>
          <input class="inp" aria-label="Name this ward" maxlength="50" placeholder=${saved ? `Saved as ${saved.n}` : "Name it to save it"} value=${name} onInput=${e => setName(e.target.value)} />
          <button class="btn" type="submit" disabled=${!res.ok || !name.trim()}>${w.wards.some(x => x.n.toLowerCase() === name.trim().toLowerCase()) ? "Update ward" : "Save ward"}</button></form>
      </div>`}
  </section>`;
}
// Where the i-th of n words sits on the sigil (adverbs nearer the middle, conjunctions nearer still).
function sigilPoints(tokens) {
  const n = tokens.length, R0 = 72;
  return tokens.map((t, i) => { const a = -Math.PI / 2 + (i / Math.max(n, 3)) * Math.PI * 2, r = t.k === "adverb" ? R0 * .62 : t.k === "conj" ? R0 * .4 : R0;
    return [Math.cos(a) * r, Math.sin(a) * r]; });
}
// A picked word's rune flies from its chip into its place in the circle.
function flyRune(from, svg, text, k, i, after) {
  if (!from || !svg || reduceMotion()) return;
  const a = from.getBoundingClientRect(), b = svg.getBoundingClientRect(), p = sigilPoints(after)[i] || [0, 0];
  const tx = b.left + b.width / 2 + p[0] * b.width / 200, ty = b.top + b.height / 2 + p[1] * b.height / 200;
  const el = document.createElement("div");
  el.className = "runefly k-" + k; el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<svg viewBox="-7 -8 14 16"><path d="${wardRune(text)}" /></svg>`;
  el.style.left = a.left + 12 + "px"; el.style.top = a.top + a.height / 2 + "px";
  (document.querySelector(".magic") || document.body).appendChild(el);
  const dx = tx - (a.left + 12), dy = ty - (a.top + a.height / 2);
  el.animate([{ transform: "translate(-50%, -50%) scale(.9)", opacity: 0 }, { transform: `translate(calc(-50% + ${dx * .45}px), calc(-50% + ${dy * .45 - 40}px)) scale(1.6) rotate(-12deg)`, opacity: 1, offset: .45 },
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)`, opacity: .2 }], { duration: 560, easing: "cubic-bezier(.3,.1,.3,1)" }).onfinish = () => el.remove();
}
// The sigil: a band of runes turning slowly round the rim; each word's rune sits on the circle, linked to the one
// before. A finished Ward closes the figure, draws its inner star and flares. phase "casting" (the check is rolled):
// the band spins up, rays reach out from the core to every rune; "cast": a burst of light and a ring rolling outward.
function WardSigil({ tokens, ok, phase, svgRef, small }) {
  const n = tokens.length, pts = sigilPoints(tokens);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const band = useMemo(() => Array.from({ length: 18 }, (_, i) => wardRune("band" + i)), []);
  const was = useRef(ok), [flare, setFlare] = useState(0);
  useEffect(() => { if (ok && !was.current && n) setFlare(f => f + 1); was.current = ok; }, [ok, n]);
  return html`<svg ref=${svgRef} class=${"wardsigil" + (ok ? " ok" : "") + (phase ? " " + phase : "") + (small ? " small" : "")} viewBox="-100 -100 200 200" role="img"
    aria-label=${n ? `Sigil of ${n} word${n === 1 ? "" : "s"}${ok ? ", complete" : ""}` : "Empty sigil"}>
    <defs><radialGradient id="ward-glow"><stop offset="0" stop-color="var(--brass)" stop-opacity=".55" /><stop offset="1" stop-color="var(--brass)" stop-opacity="0" /></radialGradient></defs>
    <circle class="halo" r="96" fill="url(#ward-glow)" />
    <circle class="ring" r="95" /><circle class="ring thin" r="80" />
    <g class="band">${band.map((d, i) => { const a = i * 20; return html`<g transform=${`rotate(${a}) translate(0 -87.5) scale(.62)`}><path class="bandrune" style=${`--i:${i}`} d=${d} /></g>`; })}</g>
    <circle class="ring inner" r="54" />
    ${ok && n > 3 && html`<path class="star" d=${pts.map((_, i) => { const a = pts[i], b = pts[(i + 2) % n]; return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`; }).join("")} key=${"s" + n + flare} />`}
    ${n > 1 && html`<path class="link" d=${path + (ok && n > 2 ? " Z" : "")} key=${"p" + n} />`}
    ${phase === "casting" && pts.map((p, i) => html`<line class="ray" style=${`--i:${i}`} x1="0" y1="0" x2=${p[0].toFixed(1)} y2=${p[1].toFixed(1)} />`)}
    ${pts.map((p, i) => html`<g class=${"mark k-" + tokens[i].k} transform=${`translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`} key=${i + ":" + tokens[i].text}>
      <circle r="9.5" /><path d=${wardRune(tokens[i].text)} transform="scale(.95)" /></g>`)}
    ${ok && html`<circle class="core" r="8" />`}
    ${flare > 0 && html`<circle class="shock" r="20" key=${"f" + flare} />`}
    ${phase === "cast" && html`<circle class="shock big" r="20" /><circle class="burst" r="14" />`}
    ${phase === "fizzle" && html`<circle class="smoke" r="22" /><path class="crack" d="M-6 -70 L4 -38 L-8 -10 L6 18 L-4 46 L5 72" />`}
  </svg>`;
}
// The Active perks and inscribing as a Ritual. The perks only work on a Ward that isn't a Ritual Ward.
function WardOptions({ st, o, setO, wop, fixed }) {
  const flip = k => setO(Object.assign({}, o, { [k]: !o[k] }, k === "ritual" && !o.ritual ? { double: false, calm: false, epic: false } : {}));
  const opt = (k, lvl, label, left, tip) => st.lvl >= lvl && html`<label class=${"wardopt" + (o[k] ? " on" : "")} title=${tip}>
    <input type="checkbox" checked=${o[k]} disabled=${(k !== "ritual" && (o.ritual || (!o[k] && left < 1))) || (k === "epic" && !wop)} onChange=${() => flip(k)} />
    <span><b>${label}</b><small>${k === "ritual" ? "5 AP's worth of Sigils an hour; less Fatigue" : `${left} left`}</small></span></label>`;
  return html`<div class="wardopts" role="group" aria-label="How to inscribe it">
    ${opt("ritual", 4, "As a Ritual", 1, "Inscribed slowly: 5 AP's worth of Sigils take an hour. Fatigue under 10 becomes 1; 10 or more is halved.")}
    ${opt("double", 5, "2× Sigils per AP", st.active.double, "Works of a Writer: 2× Sigils per AP, but 2× Fatigue.")}
    ${opt("calm", 6, "No Fatigue", st.active.calm, "Works of a Writer: this inscription gains no Fatigue.")}
    ${!fixed && opt("epic", 7, "3 words at 1 Sigil", st.active.epic, "The First Epic: up to 3 Words of Power cost 1 Sigil (the dearest ones).")}
  </div>`;
}
function WardCostBox({ st, plan, total, o }) {
  if (!st.spa) return null;
  return html`<div class="facts wardcostbox">${[
    ["Ward", `${total} Sigils`],
    ["Fatigue", `−${st.fatigue} Sigils`],
    ["Sigils per AP", `${plan.spa}${o.double && !o.ritual ? " (doubled)" : ""}`],
    o.ritual ? ["Takes", `${plan.hours} hour${plan.hours === 1 ? "" : "s"} (${plan.ap} AP of Sigils)`] : ["AP needed", `${plan.ap} AP → ${plan.available(plan.ap)} Sigils`],
  ].map(([k, v]) => html`<div class="fact"><span>${k}</span><b>${v}</b></div>`)}</div>`;
}

/* ---------- inscribing, in place: the check is rolled while the sigil is cast, then the GM's Fatigue ---------- */
const CAST_MS = 2300;
function WardCast({ c, st, update, cast, onClose, onPhase }) {
  const [roll, setRoll] = useState(null), [gain, setGain] = useState(""), [done, setDone] = useState(null), [busy, setBusy] = useState(false);
  // The difficulty the GM gives (optional): d100 − modifier under it and the Ward holds.
  const [dc, setDc] = useState(cast.dc != null ? String(cast.dc) : "");
  const dcN = dc === "" ? null : R.clamp(Math.round(num(dc)), 1, 200);
  const holds = r => dcN == null ? null : r - st.mod < dcN;
  const plan = R.wardPlan(c, cast.cost, cast.o);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const go = async () => {
    const r = await askRoll({ title: `Warding check: ${cast.name}`, dice: [{ n: 1, sides: 100 }], cancel: true, note: dcN != null ? `d100 − ${st.mod}, under ${dcN} and the Ward holds.` : `d100 − ${st.mod}. The GM sets the DC; lower is better. A vague Ward can still go astray on a high roll.` });
    if (!r) return;
    setBusy(true); onPhase("casting");
    timer.current = setTimeout(() => { setRoll(r[0]); setBusy(false); onPhase(holds(r[0]) === false ? "fizzle" : "cast"); }, reduceMotion() ? 120 : CAST_MS);
  };
  const finish = () => {
    const f = R.wardFatigue(gain, cast.o);
    update(x => {
      x.uses = x.uses || {};
      const spend = lv => { x.uses["p:Warding:" + lv] = num(x.uses["p:Warding:" + lv]) + 1; };
      if (cast.o.double && !cast.o.ritual) spend(5);
      if (cast.o.calm && !cast.o.ritual) spend(6);
      if (cast.o.epic && !cast.o.ritual) spend(7);
      const was = num(x.ward.fatigue); x.ward.fatigue = was + f;
      const what = cast.o.ritual ? `as a Ritual, ${plan.hours} h` : `${plan.ap} AP`;
      x.ward.ledger = [{ id: rid(), t: Date.now(), n: cast.name, s: cast.sentence, sigils: cast.cost, how: what, roll: `${roll} − ${st.mod} = ${roll - st.mod}${dcN != null ? ` vs ${dcN}` : ""}`, held: holds(roll), fatigue: f }, ...(x.ward.ledger || [])].slice(0, 20);
      addLog(x, `Warding: inscribed ${cast.name} (${cast.cost} Sigils, ${what}; check ${roll} − ${st.mod} = ${roll - st.mod}${dcN != null ? (holds(roll) ? ` under ${dcN}, it holds` : ` not under ${dcN}, it fails`) : ""}; Fatigue +${f} → ${was + f})`);
    });
    setDone(f); onPhase("");
  };
  const with_ = [cast.o.ritual && "as a Ritual", cast.o.double && !cast.o.ritual && "2× Sigils", cast.o.calm && !cast.o.ritual && "no Fatigue", cast.o.epic && !cast.o.ritual && "The First Epic"].filter(Boolean).join(", ");
  return html`<div class="wardcast" role="region" aria-label="Inscribing">
    <p class="wardcastname"><span class="lbl">Inscribing</span><b>${cast.name}</b>
      <span class="muted">${cast.cost} Sigils · ${cast.o.ritual ? `${plan.hours} hour${plan.hours === 1 ? "" : "s"}` : `${plan.ap} AP`}${with_ ? ` · ${with_}` : ""}</span></p>
    ${done != null ? html`<p class="ptsavedok">Inscribed. Fatigue +${done}, now ${st.fatigue}. It's in the Ledger on the Wards page.</p><div class="row"><button class="btn primary" onClick=${onClose}>Back to the board</button></div>`
      : roll == null ? html`<div class="row">${busy ? html`<p class="wardchant" aria-live="polite">The Sigils take hold…</p>`
          : html`<div class="mini warddc"><label for="ward-dc">Difficulty</label><input id="ward-dc" type="number" min="1" max="200" placeholder="GM's DC" value=${dc} onInput=${e => setDc(e.target.value)} /></div>
            <button class="btn primary" onClick=${go}>Roll the Warding check</button><button class="btn" onClick=${onClose}>Cancel</button>
            <span class="muted warddchint">${dcN != null ? dcN + st.mod - 1 < 1 ? "No roll can hold at this difficulty." : dcN + st.mod - 1 >= 100 ? "Any roll holds at this difficulty." : `Roll ${dcN + st.mod - 1} or less to hold (${dcN + st.mod - 1}% chance).` : "Leave it empty if the GM keeps the DC to themselves."}</span>`}</div>`
      : html`<div class=${"ptdice wardroll " + (holds(roll) === false ? "bad" : "ok")}><span class="d100">${roll}</span><span class="ptmath">${roll} − ${st.mod} = <b>${roll - st.mod}</b> · ${dcN == null ? "the GM says whether it holds" : holds(roll) ? `under ${dcN}: the Ward holds` : `not under ${dcN}: the Ward fails`}</span></div>
        <form class="row wardgain" onSubmit=${e => { e.preventDefault(); finish(); }}>
          <div class="mini"><label for="ward-gain">Fatigue gained (the GM decides)</label><input id="ward-gain" type="number" min="0" placeholder="0" value=${gain} onInput=${e => setGain(e.target.value)} /></div>
          <span class="muted">${cast.o.calm && !cast.o.ritual ? "No Fatigue: this inscription gains none." : cast.o.ritual ? "As a Ritual: under 10 becomes 1, 10 or more is halved." : cast.o.double ? "2× Sigils: it counts double." : ""}${num(gain) ? ` You gain ${R.wardFatigue(gain, cast.o)}.` : ""}</span>
          <button class="btn primary" type="submit">Done</button></form>`}
  </div>`;
}

/* ---------- Wards: saved Spontaneous Wards and learned Formulaic Wards ---------- */
// A Formulaic Ward has no words of its own, so its sigil is drawn from the letters of its name.
const nameTokens = n => String(n).split(/\s+/).filter(Boolean).slice(0, 7).map((t, i) => ({ k: i === 0 ? "subject" : ["verb", "noun", "adjective", "noun"][i % 4], text: t }));
function WardList({ c, st, update, toBoard }) {
  const w = c.ward, [adding, setAdding] = useState(false), [cast, setCast] = useState(null), [phase, setPhase] = useState("");
  const [o, setO] = useState({ double: false, calm: false, epic: false, ritual: false });
  const spont = w.wards.filter(x => x.kind === "spontaneous"), form = w.wards.filter(x => x.kind === "formulaic");
  const del = id => update(x => { x.ward.wards = x.ward.wards.filter(y => y.id !== id); });
  return html`<section class="frame wardlist">
    <h2 class="h"><span>Wards</span><i class="orn" aria-hidden="true"></i></h2>
    <h3 class="lbl">Your Spontaneous Wards</h3>
    ${!spont.length ? html`<p class="muted">Build one on the Inscribe page and save it. Refined often enough, a Spontaneous Ward can become a Formulaic one.</p>`
      : html`<div class="cards">${spont.map(x => { const r = R.wardCost(c, x.tokens);
        return html`<div class="wcard wardcard"><div class="title"><b class="wname">${x.n}</b><span class="flag brass">${r.total} Sigils</span></div>
          <p class="wardsent">${x.tokens.map(t => html`<span class=${"k-" + t.k}>${t.text}</span> `)}</p>
          ${r.problems.length > 0 && html`<p class="flag bad">${r.problems[0]}</p>`}
          <div class="mini"><label for=${"wi-" + x.id}>What it should do</label><input id=${"wi-" + x.id} type="text" maxlength="200" placeholder="A fireball at the bandits" value=${x.intent || ""} onInput=${e => update(y => { const z = y.ward.wards.find(q => q.id === x.id); if (z) z.intent = e.target.value; })} /></div>
          <div class="row"><button class="btn small primary" onClick=${() => { update(y => { y.ward.board = clean(x.tokens); }); toBoard(); }}>Put on the board</button>
            <button class="btn small danger" onClick=${() => del(x.id)}>Delete</button></div></div>`; })}</div>`}
    <h3 class="lbl wardsubh">Formulaic Wards</h3>
    <p class="muted">Learned from manuals or from another warder: a set effect, Sigil cost and casting time.${!st.formulaic ? " Inscribing them needs Warding 3." : ""}</p>
    ${form.length > 0 && !cast && html`<${WardOptions} st=${st} o=${o} setO=${setO} fixed=${true} />`}
    <div class="cards">${form.map(x => { const plan = R.wardPlan(c, x.cost, Object.assign({}, o, { ritual: o.ritual || x.ritual })), mine = cast && cast.id === x.id;
      return html`<div class=${"wcard wardcard" + (mine ? " casting" : "")}><div class="title"><b class="wname">${x.n}</b><span class="flag brass">${num(x.cost)} Sigils</span>${x.ritual && html`<span class="flag">Ritual</span>`}</div>
        ${mine && html`<${WardSigil} tokens=${nameTokens(x.n)} ok=${true} phase=${phase} small=${true} />`}
        <p>${x.effect || html`<span class="muted">No effect written.</span>`}</p>
        <p class="muted">${[x.time && `Casting time: ${x.time}`, x.fatigueNote && `Fatigue: ${x.fatigueNote}`, x.materials && `Materials: ${x.materials}`].filter(Boolean).join(" · ") || ""}</p>
        ${mine ? html`<${WardCast} c=${c} st=${st} update=${update} cast=${cast} onPhase=${setPhase} onClose=${() => { setCast(null); setPhase(""); }} />`
          : html`<p class="muted">${o.ritual || x.ritual ? `About ${plan.hours} hour${plan.hours === 1 ? "" : "s"} as a Ritual` : `${plan.ap} AP at ${plan.spa} Sigils per AP`}</p>
          <div class="row"><button class="btn small primary" disabled=${!st.formulaic || (x.ritual && !st.ritual) || !!cast} onClick=${() => setCast({ id: x.id, name: x.n, sentence: x.n, cost: num(x.cost), o: Object.assign({}, o, { ritual: o.ritual || !!x.ritual, epic: false }) })}>Inscribe</button>
            <button class="btn small danger" disabled=${!!cast} onClick=${() => del(x.id)}>Delete</button></div>`}</div>`; })}</div>
    <div class="ptaddbox">${!adding ? html`<button class="btn small ptaddown" onClick=${() => setAdding(true)}>+ A Formulaic Ward</button>`
      : html`<${FormulaForm} onCancel=${() => setAdding(false)} onSave=${v => { update(y => { y.ward.wards.push(Object.assign({ id: "d" + rid(), kind: "formulaic" }, v)); }); setAdding(false); }} />`}</div>
    ${(w.ledger || []).length > 0 && html`<h3 class="lbl wardsubh">Ledger</h3><div class="ptledger">${w.ledger.map((e, i) => html`<div class="pled">
      <div class="row" style="justify-content:space-between;flex-wrap:nowrap"><b>${e.n}</b><button class="iconbtn" aria-label="Remove this entry" onClick=${() => update(y => { y.ward.ledger.splice(i, 1); })}>×</button></div>
      <small class="muted">${new Date(e.t).toLocaleString()} · ${e.sigils} Sigils · ${e.how} · check ${e.roll}${e.held === false ? " (failed)" : e.held ? " (held)" : ""} · Fatigue +${e.fatigue}</small></div>`)}</div>`}
  </section>`;
}

// Learn (or edit) a Word of Power: the word, what kinds of word it can be, its Sigil cost, related concepts.
function WordForm({ init, words, onSave, onCancel }) {
  const [f, setF] = useState(() => Object.assign({ w: "", kinds: ["noun"], cost: 20, alts: "", note: "" }, init || {}));
  const set = (k, v) => setF(Object.assign({}, f, { [k]: v }));
  const id = k => "wf-" + (init ? init.id : "new") + "-" + k, name = f.w.trim();
  const taken = name && words.some(x => x.id !== (init && init.id) && x.w.toLowerCase() === name.toLowerCase());
  const ok = name && !taken && f.kinds.length;
  return html`<form class="brform wardform" onSubmit=${e => { e.preventDefault(); if (ok) onSave({ w: name, kinds: f.kinds, cost: Math.max(0, Math.round(num(f.cost))), alts: f.alts.trim(), note: f.note.trim() }); }}>
    <div class="grid2"><div class="mini"><label for=${id("w")}>Word</label><input id=${id("w")} type="text" maxlength="30" placeholder="Fire" value=${f.w} onInput=${e => set("w", e.target.value)} /></div>
      <div class="mini"><label for=${id("c")}>Sigil cost</label><input id=${id("c")} type="number" min="0" value=${f.cost} onInput=${e => set("cost", e.target.value)} /></div></div>
    <div class="row wardkinds" role="group" aria-label="It can be a">${R.WORD_KINDS.map(k => html`<label class="amforge"><input type="checkbox" checked=${f.kinds.includes(k)}
      onChange=${e => set("kinds", e.target.checked ? [...f.kinds, k] : f.kinds.filter(x => x !== k))} /> ${R.WARD_KIND_NAME[k]}</label>`)}</div>
    <div class="mini"><label for=${id("a")}>Also covers (the same concept)</label><input id=${id("a")} type="text" maxlength="120" placeholder="heat, burning, ignite" value=${f.alts} onInput=${e => set("alts", e.target.value)} /></div>
    <div class="mini"><label for=${id("n")}>Note</label><input id=${id("n")} type="text" maxlength="160" placeholder="Learned from the burnt chapel's frescoes" value=${f.note} onInput=${e => set("note", e.target.value)} /></div>
    ${taken && html`<p class="flag bad">${name} is already in the dictionary.</p>`}
    ${!f.kinds.length && html`<p class="flag bad">Tick at least one: noun, verb or adjective.</p>`}
    <div class="row"><button class="btn small primary" type="submit" disabled=${!ok}>${init ? "Save" : "Learn it"}</button><button class="btn small" type="button" onClick=${onCancel}>Cancel</button></div></form>`;
}


// A Formulaic Ward from a manual or a teacher (the book's example: Ward of Alarming).
function FormulaForm({ onSave, onCancel }) {
  const [f, setF] = useState({ n: "", cost: 50, time: "", fatigueNote: "", materials: "", effect: "", ritual: false });
  const set = (k, v) => setF(Object.assign({}, f, { [k]: v }));
  const fld = (k, label, ph, type = "text") => html`<div class="mini"><label for=${"ff-" + k}>${label}</label><input id=${"ff-" + k} type=${type} min="0" maxlength="200" placeholder=${ph} value=${f[k]} onInput=${e => set(k, e.target.value)} /></div>`;
  return html`<form class="brform wardform" onSubmit=${e => { e.preventDefault(); if (f.n.trim()) onSave(Object.assign({}, f, { n: f.n.trim(), cost: Math.max(0, Math.round(num(f.cost))) })); }}>
    <div class="grid2">${fld("n", "Name", "Ward of Alarming")}${fld("cost", "Sigil cost", "50", "number")}${fld("time", "Casting time", "1 hour")}${fld("fatigueNote", "Fatigue", "1 for each hour sustained")}</div>
    ${fld("materials", "Material costs", "None")}${fld("effect", "Effect", "An invisible sphere of 10 m radius; you're alerted when a creature crosses it.")}
    <label class="amforge"><input type="checkbox" checked=${f.ritual} onChange=${e => set("ritual", e.target.checked)} /> A Ritual Ward <span class="muted">(needs Warding 4)</span></label>
    <div class="row"><button class="btn small primary" type="submit" disabled=${!f.n.trim()}>Save ward</button><button class="btn small" type="button" onClick=${onCancel}>Cancel</button></div></form>`;
}
