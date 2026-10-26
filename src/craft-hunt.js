/* ================= Crafting → Hunting =================
   Three pages, in this order:
   - Trophies & belt: the trophy case (cards with a picture, level, positive / negative / void properties) and a leather
     belt with loops the trophies hang from. Belted trophies can be attuned (one; a second for 3 turns from Hunting 6) and
     released (Hunting 5: numbers doubled for 3 turns).
   - Carving: a slain monster with cut lines on its parts; pick a part, the GM's trophy level, and carve. The Hunting check
     and the Salvaging Roll table decide how many properties are positive or negative; the rest are rolled one by one.
     Then name the trophy and write what each property does (the GM's card).
   - Merging (Hunting 7): a giver trophy's positive properties pass to a receiver by the Combining Roll; the giver burns.
     The merged trophy can take a new name and picture.
   Rules: huntState, salvagePlan, salvageRest, combineCount in rules.js; data in c.craft.hunt. */

const HuntFrag = preact.Fragment;
// One page: the trophies on top; Carving and Merging fold open beneath them and take over the picture above.
const HUNT_DROPS = [["carve", "Carving"], ["merge", "Merging"]];
const huntSrc = t => !t ? "" : t.img ? (Store.assets && Store.assets.urlFor ? Store.assets.urlFor(t.img) : "") : t.imgData || "";
const HUNT_KIND = { pos: ["+", "Positive"], neg: ["−", "Negative"], void: ["∅", "Void"] };

// The monster's parts you can carve, where they sit on the carcass (viewBox 0 0 600 320), and the line the knife follows.
// Textures, painted once on a canvas the first time they're needed and kept as images: fur, leather, wood, stone, dirt.
// Laid over the drawings as patterns, so nothing is redrawn while things move.
const HUNT_TEX = {};
function huntTex(k) {
  if (HUNT_TEX[k] !== undefined) return HUNT_TEX[k];
  try {
    const W = k === "wood" ? 512 : 256, H = k === "wood" ? 256 : k === "dirt" ? 128 : 256;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d"), rnd = Math.random;
    // every mark is drawn again on the far side of any edge it crosses, so the texture tiles without seams
    const wrap = (x, y, r, fn) => { for (const dx of [0, -W, W]) for (const dy of [0, -H, H]) if (x + dx + r > 0 && x + dx - r < W && y + dy + r > 0 && y + dy - r < H) fn(x + dx, y + dy); };
    const blot = (n, rmin, rmax, dark, light) => { for (let i = 0; i < n; i++) { const x0 = rnd() * W, y0 = rnd() * H, r = rmin + rnd() * (rmax - rmin), col = rnd() < .55 ? dark : light;
      wrap(x0, y0, r, (x, y) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }); } };
    const grain = (n, a) => { for (let i = 0; i < n; i++) { g.fillStyle = rnd() < .5 ? `rgba(0,0,0,${a})` : `rgba(255,240,220,${a * .7})`; g.fillRect(rnd() * W, rnd() * H, 1, 1); } };
    if (k === "fur") {
      g.lineCap = "round";
      for (let i = 0; i < 3400; i++) { const x0 = rnd() * W, y0 = rnd() * H, a = .22 + Math.sin(y0 / 32 * Math.PI) * .18 + (rnd() - .5) * .5, l = 5 + rnd() * 9, dark = rnd() < .7;
        g.strokeStyle = dark ? `rgba(18,10,6,${.16 + rnd() * .22})` : `rgba(226,204,170,${.08 + rnd() * .14})`; g.lineWidth = .7 + rnd() * .8;
        wrap(x0, y0, l, (x, y) => { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * .5, y + Math.sin(a) * l * .5 - 1, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }); }
    } else if (k === "leather") {
      blot(420, 6, 26, "rgba(0,0,0,.07)", "rgba(255,226,190,.05)"); grain(9000, .09);
      g.strokeStyle = "rgba(0,0,0,.12)"; g.lineWidth = .8;
      for (let i = 0; i < 26; i++) { let x = rnd() * W, y = rnd() * H; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 5; j++) { x += (rnd() - .5) * 18; y += (rnd() - .5) * 8; g.lineTo(x, y); } g.stroke(); }
    } else if (k === "wood") {
      g.fillStyle = "#6a4a2f"; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 150; i++) { const y0 = rnd() * H, amp = 2 + rnd() * 5, f = .004 + rnd() * .01, ph = rnd() * 6;
        g.strokeStyle = rnd() < .5 ? `rgba(40,24,12,${.15 + rnd() * .3})` : `rgba(160,112,70,${.1 + rnd() * .25})`; g.lineWidth = .6 + rnd() * 2.4;
        g.beginPath(); for (let x = 0; x <= W; x += 8) { const y = y0 + Math.sin(x * f + ph) * amp + Math.sin(x * f * 3.1) * amp * .3; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
      [[150, 90], [400, 190]].forEach(([x, y]) => { for (let r = 3; r < 26; r += 3.2) { g.strokeStyle = `rgba(40,24,12,${.35 - r / 90})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y, r * 2.2, r * .8, 0, 0, 7); g.stroke(); } });
      g.fillStyle = "rgba(0,0,0,.18)"; for (let x = 0; x < W; x += 128) g.fillRect(x, 0, 1.5, H);
      grain(6000, .07);
    } else if (k === "stone") {
      blot(520, 5, 30, "rgba(0,0,0,.08)", "rgba(255,255,255,.07)"); grain(12000, .11);
    } else if (k === "dirt") {
      blot(260, 3, 14, "rgba(40,26,14,.18)", "rgba(220,196,160,.12)"); grain(7000, .14);
      for (let i = 0; i < 40; i++) { const x = rnd() * W, y = rnd() * H, r = 1 + rnd() * 2.6; g.fillStyle = `rgba(${90 + rnd() * 60},${80 + rnd() * 40},${70 + rnd() * 30},.7)`; g.beginPath(); g.ellipse(x, y, r * 1.3, r, 0, 0, 7); g.fill(); }
    }
    HUNT_TEX[k] = cv.toDataURL("image/png");
  } catch (e) { HUNT_TEX[k] = ""; }
  return HUNT_TEX[k];
}
const HuntPattern = ({ id, k, w = 256, h = 256 }) => huntTex(k) ? html`<pattern id=${id} patternUnits="userSpaceOnUse" width=${w} height=${h}><image href=${huntTex(k)} width=${w} height=${h} /></pattern>` : null;

// The monster's parts you can carve, where they sit on the carcass (viewBox 0 0 600 320), and the line the knife follows.
const HUNT_PARTS = [
  { k: "horn", n: "Horn", at: [174, 122], cut: "M158 168 C166 160 178 158 190 162" },
  { k: "eye", n: "Eye", at: [150, 186], cut: "M136 186 C142 177 158 177 164 186 C158 194 142 194 136 186" },
  { k: "fang", n: "Fang", at: [96, 228], cut: "M78 214 C80 230 96 240 116 230" },
  { k: "claw", n: "Claw", at: [152, 278], cut: "M168 266 C174 278 164 290 146 288" },
  { k: "hide", n: "Hide", at: [384, 192], cut: "M310 150 C350 138 420 138 460 156 C470 180 466 214 456 232 C400 244 340 244 304 232 C296 206 298 176 310 150" },
  { k: "heart", n: "Heart", at: [262, 212], cut: "M250 198 C256 190 270 192 274 202 C276 214 266 224 260 228 C252 222 246 210 250 198" },
  { k: "tail", n: "Tail", at: [548, 240], cut: "M512 214 C506 222 504 230 506 238" },
  { k: "bone", n: "Bone", at: [492, 270], cut: "M486 256 C493 264 494 274 489 283" },
  { k: "head", n: "Head", at: [208, 212], cut: "M200 176 C212 196 214 226 200 250" },
  { k: "spike", n: "Spike", at: [370, 104], cut: "M359 121 C365 117 373 117 379 121" },
  { k: "tongue", n: "Tongue", at: [62, 262], cut: "M82 238 C87 237 92 239 95 244" },
  { k: "ear", n: "Ear", at: [210, 156], cut: "M184 172 C188 176 192 179 196 180" },
];
// The carcass, as layers drawn twice: once in colour, once more with the fur texture over it.
const HC_SHAPES = {
  farFront: "M244 230 C228 236 212 241 196 243 C180 245 164 245 152 247 C142 249 138 255 144 259 C152 261 166 259 182 257 C204 255 226 251 250 246 Z",
  farHind: "M452 228 C470 233 490 237 510 237 C526 237 540 237 548 241 C554 247 548 253 538 253 C520 253 498 251 476 249 C462 247 450 245 444 243 Z",
  tail: "M500 212 C528 220 554 234 576 252 C584 258 580 266 570 263 C548 253 524 240 496 230 Z",
  body: "M200 176 C232 150 268 132 312 124 C370 114 430 120 468 140 C500 158 512 190 504 220 C498 244 478 254 450 258 L300 262 C262 262 236 256 222 244 C208 232 200 214 194 200 Z",
  nearFront: "M270 234 C254 246 238 254 224 258 C206 262 190 264 172 266 C160 266 150 268 146 274 C144 280 152 285 162 283 C176 281 196 279 216 276 C238 272 256 264 276 252 Z",
  nearHind: "M426 228 C450 236 470 250 490 259 C506 265 524 267 540 267 C552 267 558 275 551 281 C539 286 520 284 502 280 C476 274 452 266 430 256 Z",
  head: "M200 176 C190 166 172 160 150 162 C128 164 104 172 84 182 C70 188 58 196 56 206 C56 214 64 218 76 218 L118 220 C104 232 86 240 70 244 C66 250 74 256 88 256 C122 258 160 258 186 252 C204 246 210 230 206 214 C206 198 206 186 200 176 Z",
  ear: "M184 172 C196 156 210 148 226 146 C216 160 206 170 196 180 Z",
};
const HUNT_GLYPH = {
  horn: "M-7 9C-5 0 -2 -6 6 -10C2 -4 2 3 4 9Z", eye: "M-9 0C-5 -6 5 -6 9 0C5 6 -5 6 -9 0Z M-2.6 0a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0",
  fang: "M-5 -9H5C5 -2 2 5 0 10C-2 5 -5 -2 -5 -9Z", claw: "M-8 8C-6 0 -1 -6 7 -9C3 -4 1 2 1 8Z M-2 9C0 3 3 -1 8 -3",
  hide: "M-9 -7C-4 -9 4 -9 9 -7C8 -2 9 3 8 8C3 9 -3 9 -8 8C-9 3 -8 -2 -9 -7Z", heart: "M0 8C-8 2 -9 -3 -6 -6C-3 -9 0 -6 0 -4C0 -6 3 -9 6 -6C9 -3 8 2 0 8Z",
  tail: "M-9 6C-4 6 2 3 4 -2C5 -6 8 -8 9 -9C9 -4 7 2 3 5C0 7 -5 8 -9 6Z", bone: "M-7 -7a2.4 2.4 0 1 1 3 -1L4 6a2.4 2.4 0 1 1 1 3a2.4 2.4 0 1 1 -3 1L-6 -2a2.4 2.4 0 1 1 -1 -5Z",
  head: "M-8 -1C-8 -7 8 -7 8 -1C8 4 5 5 4 9H-4C-5 5 -8 4 -8 -1Z M-7 -5L-11 -10L-5 -7Z M7 -5L11 -10L5 -7Z", spike: "M-7 -8C-3 -10 3 -10 7 -8L1 10H-1Z",
  tongue: "M-4 -9H4V2C4 7 2 10 0 10C-2 10 -4 7 -4 2Z", ear: "M-6 -8C-8 0 -5 5 1 10C4 3 6 -3 5 -9C1 -10 -3 -10 -6 -8Z",
  other: "M0 -9L8 0L0 9L-8 0Z",
};
const HuntGlyph = ({ part }) => html`<svg class="hglyph" viewBox="-11 -11 22 22" aria-hidden="true"><path d=${HUNT_GLYPH[part] || HUNT_GLYPH.other} /></svg>`;
const HuntPips = ({ lvl }) => html`<span class="hpips" aria-label=${`Level ${lvl}`}>${[1, 2, 3, 4, 5].map(i => html`<i class=${i <= lvl ? "on" : ""}></i>`)}</span>`;


function Hunting({ c, update }) {
  const st = R.huntState(c), h = c.craft.hunt;
  const [page, setPageState] = useState(() => { const p = lsGet("cw-hunt-page", "case"); return p === "carve" || p === "merge" ? p : "case"; });
  const [busy, setBusy] = useState(false), wrap = useRef(null), first = useRef(true);
  const setPage = p => { lsSet("cw-hunt-page", p);
    if (!document.startViewTransition || reduceMotion() || document.hidden) return setPageState(p);
    document.startViewTransition(() => new Promise(res => { setPageState(p); setTimeout(res, 0); })); };
  // Opening a drop-down changes the picture above it: bring that into view if it scrolled away.
  useEffect(() => { if (first.current) { first.current = false; return; }
    const el = wrap.current && wrap.current.querySelector(".huntone"); if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start", behavior: reduceMotion() ? "auto" : "smooth" }); }, [page]);
  const bars = body => html`<div class="huntdrops">${page !== "case" && html`<div class="huntdrop hback" key="back">
      <button type="button" class="huntdropb" disabled=${busy} title=${busy ? "Finish this first" : ""} onClick=${() => setPage("case")}>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 10H4m5-5-5 5 5 5" /></svg><span>Your trophies</span></button></div>`}${HUNT_DROPS.map(([k, n]) => { const on = page === k;
    return html`<div class=${"huntdrop" + (on ? " open" : "")} key=${k}>
      <button type="button" class="huntdropb" aria-expanded=${on} disabled=${busy} title=${on ? "Close: back to your trophies" : ""} onClick=${() => setPage(on ? "case" : k)}>
        ${k === "carve" ? KNIFE : MERGE_ICON}<span>${n}</span><svg class="hchev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" /></svg></button>
      ${on && html`<div class="huntdropbody" key="b">${body}</div>`}</div>`; })}</div>`;
  const log = (x, name, rolls) => { x.craft.hunt.ledger = [{ id: rid(), t: Date.now(), name, rolls: rolls || [] }, ...x.craft.hunt.ledger].slice(0, 30); addLog(x, "Hunting: " + name); };
  const kids = { c, st, update, log, bars, onBusy: setBusy, toCase: () => setPage("case") };
  return html`<div class="hunting" ref=${wrap}><${HuntArtDefs} />
    <section class="frame hunthead"><${Head} title="Hunting" topic="hunting" />
      <div class="facts ptfacts">${[["Hunting", `${st.lvl} · ${st.mod}%`], ["Trophies you can use", st.maxLvl ? `Up to level ${st.maxLvl}` : "From Hunting 3"],
        ["Belt", `${st.belted.length} of ${st.slots}${st.attuned.length ? ` · ${st.attuned.length} attuned` : ""}`]].map(([k, v]) => html`<div class="fact"><span>${k}</span><b>${v}</b></div>`)}</div>
      <${HuntMyths} c=${c} st=${st} update=${update} />
    </section>
    ${page === "case" && html`<${HuntCase} key="case" ...${kids} toCarve=${() => setPage("carve")} />`}
    ${page === "carve" && html`<${HuntCarve} key="carve" ...${kids} />`}
    ${page === "merge" && html`<${HuntMerge} key="merge" ...${kids} />`}
    <${HuntLedger} c=${c} update=${update} />
  </div>`;
}

// The mythologies the hunter knows: Lore checks about them use the Hunting modifier.
function HuntMyths({ c, st, update }) {
  const [v, setV] = useState(""), [adding, setAdding] = useState(false), myths = c.craft.hunt.myths;
  if (!st.myths && !myths.length) return null;
  return html`<div class="huntmyths row"><span class="lbl" title="Lore checks about these use your Hunting modifier">Mythologies ${myths.length}/${st.myths}</span>
    ${myths.map((m, i) => html`<span class="hmyth" key=${m + i}>${m}<button class="iconbtn" aria-label=${`Forget ${m}`} onClick=${() => update(x => { x.craft.hunt.myths.splice(i, 1); })}>×</button></span>`)}
    ${myths.length < st.myths && (adding ? html`<form class="row" key="add" onSubmit=${e => { e.preventDefault(); const n = v.trim(); if (n) update(x => { x.craft.hunt.myths.push(n); }); setV(""); setAdding(false); }}>
        <input class="hmythin" aria-label="A mythology" placeholder="e.g. Slavic folklore" value=${v} onInput=${e => setV(e.target.value)} ref=${el => el && el.focus()} /><button class="btn small">Add</button></form>`
      : html`<button class="iconbtn" key="plus" aria-label="Add a mythology" onClick=${() => setAdding(true)}>+</button>`)}</div>`;
}

/* ---------------- Trophies & belt ---------------- */
function HuntCase({ c, st, update, log, toCarve, bars }) {
  const h = c.craft.hunt, [sel, setSel] = useState(""), [edit, setEdit] = useState(null), [fx, setFx] = useState(null);
  const flash = (id, kind) => { setFx({ id, kind, k: Date.now() }); setTimeout(() => setFx(f => f && f.id === id && f.kind === kind ? null : f), reduceMotion() ? 50 : 1600); };
  const cur = h.trophies.find(t => t.id === sel);
  const belt = h.trophies.filter(t => t.belted);
  const can = t => {   // why a trophy can't be attuned, or "" if it can
    if (!st.use) return "Using trophies needs Hunting 3.";
    if (!t.belted) return "Put it on your belt first.";
    if (t.lvl > st.maxLvl) return `Level ${t.lvl} is too strong for you yet: you can use up to level ${st.maxLvl}.`;
    return "";
  };
  const setT = (id, fn) => update(x => { const t = x.craft.hunt.trophies.find(y => y.id === id); if (t) fn(t, x); });
  const toBelt = t => { if (belt.length >= st.slots) return toast(`Your belt has ${st.slots} loops, all taken.`); setT(t.id, y => { y.belted = true; }); setSel(t.id); flash(t.id, "hang"); };
  const offBelt = t => update(x => { const y = x.craft.hunt.trophies.find(z => z.id === t.id); y.belted = false; y.attuned = false;
    ["release", "second"].forEach(k => { if (x.craft.hunt[k] && x.craft.hunt[k].id === t.id) x.craft.hunt[k] = null; }); });
  const attune = t => {
    const why = can(t); if (why) return toast(why);
    update(x => { x.craft.hunt.trophies.forEach(y => { if (y.id !== t.id && !(x.craft.hunt.second && x.craft.hunt.second.id === y.id)) y.attuned = false; });
      x.craft.hunt.trophies.find(y => y.id === t.id).attuned = true; log(x, `attuned ${t.n || "a trophy"}`); });
    flash(t.id, "attune");
  };
  // The two empowerments: 1 AP (0 from Hunting 9), 1 Stamina, 3 turns.
  const empower = (k, t) => {
    const why = can(t); if (why) return toast(why);
    if (k === "release" && !t.attuned) return toast("Only an attuned trophy can be released.");
    update(x => { R.setStamina(x, num(x.vitals.exhaustion) + 1); x.craft.hunt[k] = { id: t.id, turns: 3 };
      if (k === "second") x.craft.hunt.trophies.find(y => y.id === t.id).attuned = true;
      log(x, k === "release" ? `released ${t.n || "a trophy"}: its numbers double for 3 turns (${st.ap} AP, 1 Stamina)` : `attuned a second trophy, ${t.n || "unnamed"}, for 3 turns (${st.ap} AP, 1 Stamina)`); });
    flash(t.id, k);
  };
  const tick = () => update(x => { ["release", "second"].forEach(k => { const e = x.craft.hunt[k]; if (!e) return; e.turns = num(e.turns) - 1;
    if (e.turns <= 0) { if (k === "second") { const y = x.craft.hunt.trophies.find(z => z.id === e.id); if (y) y.attuned = false; } x.craft.hunt[k] = null; } }); });
  const rel = h.release, sec = h.second;
  const remove = t => { if (!confirm(`Throw away ${t.n || "this trophy"}? It can't be undone.`)) return;
    update(x => { if (t.img && Store.assets && Store.assets.remove) Store.assets.remove(t.img); x.craft.hunt.trophies = x.craft.hunt.trophies.filter(y => y.id !== t.id);
      ["release", "second"].forEach(k => { if (x.craft.hunt[k] && x.craft.hunt[k].id === t.id) x.craft.hunt[k] = null; }); }); setSel(""); };

  const blank = () => setEdit({ n: "", monster: "", part: "other", lvl: 1, props: [{ id: rid(), kind: "pos", t: "" }, { id: rid(), kind: "void", t: "" }], note: "" });
  return html`<section class="frame huntone huntbeltf">
    <h2 class="h"><span>Your trophies</span><i class="orn" aria-hidden="true"></i>${!edit && html`<button class="btn small hadd" key="add" onClick=${blank} title="Add a trophy you found or bought">+ Add</button>`}</h2>
    <div class="huntbeltwrap">
      <${HuntBelt} st=${st} h=${h} belt=${belt} sel=${sel} fx=${fx} onPick=${id => setSel(id === sel ? "" : id)} />
      <span class="ptstepper hloops" title="Loops on your belt (the GM's)">
        <button class="iconbtn" aria-label="One loop fewer" disabled=${st.slots <= Math.max(1, belt.length)} onClick=${() => update(x => { x.craft.hunt.slots = Math.max(1, num(x.craft.hunt.slots) - 1); })}>−</button><b>${st.slots} loops</b>
        <button class="iconbtn" aria-label="One loop more" disabled=${st.slots >= 12} onClick=${() => update(x => { x.craft.hunt.slots = Math.min(12, num(x.craft.hunt.slots) + 1); })}>+</button></span>
    </div>
    ${cur && cur.belted ? html`<div class="huntsel" key=${"sel" + cur.id}>
        <b class="huntseln">${cur.n || "Unnamed trophy"}</b>
        ${rel && rel.id === cur.id && html`<span class="flag brass" key="rel">Released · ${rel.turns}</span>`}${sec && sec.id === cur.id && html`<span class="flag" key="sec">Second · ${sec.turns}</span>`}
        ${!cur.attuned ? html`<button class="btn small primary" disabled=${!!can(cur)} title=${can(cur) || "Its properties work while it's on your belt"} onClick=${() => attune(cur)}>Attune</button>`
          : html`<button class="btn small" onClick=${() => setT(cur.id, y => { y.attuned = false; })}>Unattune</button>`}
        ${st.second && !cur.attuned && st.attuned.length >= 1 && !sec && html`<button class="btn small" disabled=${!!can(cur)} title=${`Hunting 6: attune it too for 3 turns · ${st.ap} AP, 1 Stamina`} onClick=${() => empower("second", cur)}>Attune too</button>`}
        ${st.release && cur.attuned && !(rel && rel.id === cur.id) && html`<button class="btn small" title=${`Hunting 5: double its numbers for 3 turns · ${st.ap} AP, 1 Stamina`} onClick=${() => empower("release", cur)}>Release</button>`}
        ${(rel || sec) && html`<button class="btn small" key="tick" onClick=${tick}>End of turn</button>`}
        <button class="btn small" onClick=${() => offBelt(cur)}>Take off</button>
        ${can(cur) && html`<small class="muted">${can(cur)}</small>`}</div>`
      : (rel || sec) ? html`<div class="huntsel" key="turns">${rel && html`<span class="flag brass">Released · ${rel.turns}</span>`}${sec && html`<span class="flag">Second · ${sec.turns}</span>`}<button class="btn small" onClick=${tick}>End of turn</button></div>` : null}
    ${edit ? html`<${TrophyForm} key=${"edit" + (edit.id || "new")} init=${edit} onCancel=${() => setEdit(null)}
        onSave=${t => { update(x => { const i = x.craft.hunt.trophies.findIndex(y => y.id === t.id);
          if (i >= 0) x.craft.hunt.trophies[i] = Object.assign({}, x.craft.hunt.trophies[i], t); else x.craft.hunt.trophies.push(Object.assign({ id: rid(), belted: false, attuned: false, t: Date.now() }, t)); }); setEdit(null); }} />`
      : h.trophies.length ? html`<div class="huntcards" key="cards">${h.trophies.map(t => html`<${TrophyCard} key=${t.id} t=${t} st=${st} sel=${sel === t.id} rel=${rel && rel.id === t.id}
          onBelt=${() => (t.belted ? offBelt(t) : toBelt(t))} onEdit=${() => setEdit(t)} onRemove=${() => remove(t)} onPick=${() => setSel(t.id)} />`)}</div>`
      : html`<p class="muted" key="none">No trophies yet. ${st.salvage ? html`<a href="#" onClick=${e => { e.preventDefault(); toCarve(); }}>Carve one</a>, or add` : "Add"} one you found or bought.</p>`}
    ${!edit && bars(null)}
  </section>`;
}

// The belt, laid on a wooden table: a tooled leather strap with a brass buckle and riveted loops; each belted trophy
// hangs from a braided cord as a brass-rimmed medallion with its picture, or the part's glyph engraved in bone.
function HuntBelt({ st, h, belt, sel, fx, onPick }) {
  const n = st.slots, x0 = 120, x1 = 570, step = (x1 - x0) / n;
  const slot = i => x0 + step * (i + .5);
  return html`<div class="huntbelt huntframe" style=${huntTex("wood") ? `background-image: radial-gradient(ellipse at 50% 40%, transparent 40%, rgb(20 10 4 / .55)), url(${huntTex("wood")})` : ""}>
    <svg viewBox="0 0 600 250" role="group" aria-label=${`Your belt: ${belt.length} of ${n} loops taken`}>
      <defs>
        <linearGradient id="hb-leather" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5532" /><stop offset=".18" stop-color="#6e4024" /><stop offset=".8" stop-color="#4e2b16" /><stop offset="1" stop-color="#2e180a" /></linearGradient>
        <linearGradient id="hb-loop" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a200e" /><stop offset=".3" stop-color="#6a3d20" /><stop offset=".7" stop-color="#5a321a" /><stop offset="1" stop-color="#2a170a" /></linearGradient>
        <linearGradient id="hb-brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe7a6" /><stop offset=".3" stop-color="#d1a24a" /><stop offset=".6" stop-color="#8f6522" /><stop offset=".8" stop-color="#d8ad58" /><stop offset="1" stop-color="#5e4012" /></linearGradient>
        <radialGradient id="hb-rivet" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#fff2c0" /><stop offset=".45" stop-color="#c6953e" /><stop offset="1" stop-color="#4d3410" /></radialGradient>
        <radialGradient id="hb-bone" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#f1e6cc" /><stop offset=".6" stop-color="#cdbb94" /><stop offset="1" stop-color="#8f7b58" /></radialGradient>
        <radialGradient id="hb-glow"><stop offset=".55" stop-color="var(--hglow)" stop-opacity=".6" /><stop offset="1" stop-color="var(--hglow)" stop-opacity="0" /></radialGradient>
        <radialGradient id="hb-shadow"><stop offset="0" stop-color="#0c0603" stop-opacity=".55" /><stop offset="1" stop-color="#0c0603" stop-opacity="0" /></radialGradient>
        <linearGradient id="hb-shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35" /><stop offset=".5" stop-color="#fff" stop-opacity="0" /></linearGradient>
        <${HuntPattern} id="hb-tex" k="leather" />
        <clipPath id="hb-disc"><circle r="24" /></clipPath>
      </defs>
      <path d="M-400 62 C150 52 450 52 1000 62 L1000 100 C450 90 150 90 -400 100Z" fill="#0c0603" opacity=".35" transform="translate(0 7)" />
      <path class="hbstrap" d="M-400 54 C150 44 450 44 1000 54 L1000 90 C450 80 150 80 -400 90Z" fill="url(#hb-leather)" />
      <path d="M-400 54 C150 44 450 44 1000 54 L1000 90 C450 80 150 80 -400 90Z" fill="url(#hb-tex)" />
      <path class="hbedge" d="M-400 55 C150 45 450 45 1000 55 M-400 89 C150 79 450 79 1000 89" />
      <path class="hbstitch" d="M-400 59.5 C150 49.5 450 49.5 1000 59.5 M-400 84.5 C150 74.5 450 74.5 1000 84.5" />
      <path class="hbtool" d="M-400 69 C150 58 450 58 1000 69" />
      <g class="hbbuckle">
        <rect x="40" y="35" width="56" height="66" rx="8" fill="none" stroke="#1a0e05" stroke-width="9" opacity=".45" transform="translate(2 4)" />
        <rect x="40" y="35" width="56" height="66" rx="8" fill="none" stroke="url(#hb-brass)" stroke-width="8" />
        <rect x="40" y="35" width="56" height="66" rx="8" fill="none" stroke="#fff6d0" stroke-width="1" opacity=".5" />
        <path d="M68 40V96" stroke="url(#hb-brass)" stroke-width="5" stroke-linecap="round" /><circle cx="68" cy="69" r="3.4" fill="#2a1608" />
      </g>
      ${Array.from({ length: n }, (_, i) => { const x = slot(i), t = belt[i];
        return html`<g class=${"hbloop" + (t ? " full" : "")} key=${"loop" + i}>
          <rect x=${x - 15} y="42" width="30" height="48" rx="4" fill="url(#hb-loop)" class="hbloopr" /><rect x=${x - 15} y="42" width="30" height="48" rx="4" fill="url(#hb-tex)" />
          <path d=${`M${x - 12} 47 H${x + 12} M${x - 12} 85 H${x + 12}`} class="hbstitch" />
          <circle cx=${x - 9} cy="52" r="2.6" fill="url(#hb-rivet)" /><circle cx=${x + 9} cy="52" r="2.6" fill="url(#hb-rivet)" /><circle cx=${x - 9} cy="80" r="2.6" fill="url(#hb-rivet)" /><circle cx=${x + 9} cy="80" r="2.6" fill="url(#hb-rivet)" /></g>`; })}
      ${belt.map((t, i) => { const x = slot(i), on = sel === t.id, released = h.release && h.release.id === t.id, f = fx && fx.id === t.id ? fx.kind : "";
        const pic = huntSrc(t), sc = (t.attached || []).length ? .78 : 1, top = pic ? 139 : 170 - 38 * sc;   // the cord ends where the trophy is tied
        return html`<g key=${t.id} class=${"hbcharm" + (on ? " sel" : "") + (t.attuned ? " attuned" : "") + (released ? " released" : "") + (f ? " fx-" + f : "")}
            style=${`--x:${x}px; --d:${(i * .37).toFixed(2)}s`} role="button" tabindex="0" aria-label=${`${t.n || "Trophy"}${t.attuned ? ", attuned" : ""}`}
            onClick=${() => onPick(t.id)} onKeyDown=${e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(t.id); } }}>
          <g class="hbswing">
            <ellipse class="hbcast" cx=${x + 10} cy="214" rx="30" ry="9" fill="url(#hb-shadow)" />
            <path class="hbcord" d=${`M${x} 72 C${x - 3} 100 ${x + 3} ${top - 18} ${x} ${top}`} /><path class="hbcord2" d=${`M${x} 72 C${x - 3} 100 ${x + 3} ${top - 18} ${x} ${top}`} />
            <g transform=${`translate(${x} 170)`}>
              <circle class="hbaura" r="48" fill="url(#hb-glow)" />
              ${t.attuned && html`<circle class="hbring" r="40" />`}
              ${pic ? html`<g key="pic"><circle r="30" fill="#1a0e05" opacity=".5" transform="translate(2 3)" />
                  <circle class="hbrim" r="29" fill="url(#hb-brass)" /><circle r="25.5" fill="#2a1608" />
                  <image href=${pic} x="-24" y="-24" width="48" height="48" preserveAspectRatio="xMidYMid slice" clip-path="url(#hb-disc)" />
                  <circle r="24" fill="url(#hb-shine)" /><circle r="28" fill="none" stroke="#fff3c8" stroke-width=".8" opacity=".6" />
                  <circle cy="-31" r="4.5" fill="none" stroke="url(#hb-brass)" stroke-width="2.4" /></g>`
                : html`<g key="art"><g transform=${`scale(${sc})`}><${HuntTrophyArt} part=${t.part} attached=${t.attached} /></g>
                  <circle cy=${-38 * sc} r="3" fill="none" stroke="url(#hb-brass)" stroke-width="1.8" /></g>`}
              <text y="62" class="hbname">${(() => { const nm = t.n || "Trophy", fit = Math.max(5, Math.floor(step / 6.6)); return nm.length > fit ? nm.slice(0, fit - 1) + "…" : nm; })()}</text>
              ${released && html`<g class="hbrays">${Array.from({ length: 12 }, (_, k) => html`<path d="M0 -36V-46" transform=${`rotate(${k * 30})`} />`)}</g>`}
            </g></g></g>`; })}
    </svg></div>`;
}

function TrophyCard({ t, st, sel, rel, onBelt, onEdit, onRemove, onPick }) {
  const part = (HUNT_PARTS.find(p => p.k === t.part) || {}).n;
  const tooStrong = st.maxLvl && t.lvl > st.maxLvl;
  return html`<article class=${"huntcard" + (t.belted ? " belted" : "") + (t.attuned ? " attuned" : "") + (sel ? " sel" : "")} onClick=${e => { if (!e.target.closest("button")) onPick(); }}>
    <header><${HuntTrophy} t=${t} size=${54} /><div class="huntcardn"><b>${t.n || "Unnamed trophy"}</b>
      <small><${HuntPips} lvl=${t.lvl} /> ${[t.monster, part].filter(Boolean).join(" · ")}${t.attuned ? html` <span class="flag brass">Attuned</span>` : ""}${rel ? html` <span class="flag brass">Released</span>` : ""}${tooStrong ? html` <span class="flag bad">Too strong</span>` : ""}</small></div>
      <div class="hcardbtns"><button class=${"iconbtn hbeltbtn" + (t.belted ? " on" : "")} aria-pressed=${!!t.belted} aria-label=${t.belted ? "Take it off the belt" : "Put it on the belt"} title=${t.belted ? "On your belt: click to take it off" : "Put it on your belt"} onClick=${onBelt}>${BELT_ICON}</button>
        <button class="iconbtn" aria-label=${`Edit ${t.n || "this trophy"}`} title="Edit" onClick=${onEdit}>✎</button><button class="iconbtn" aria-label=${`Throw away ${t.n || "this trophy"}`} title="Throw away" onClick=${onRemove}>×</button></div></header>
    <ul class="hprops">${t.props.filter(p => p.kind !== "void" || p.t).map(p => html`<li class=${"hp-" + p.kind} key=${p.id}><span aria-label=${HUNT_KIND[p.kind][1]}>${HUNT_KIND[p.kind][0]}</span>${p.t || html`<i class="muted">Not written yet</i>`}</li>`)}
      ${t.props.some(p => p.kind === "void" && !p.t) && html`<li class="hp-void" key="void"><span>∅</span>${t.props.filter(p => p.kind === "void" && !p.t).length} void</li>`}</ul>
    ${(t.note || (t.merged && t.merged.length)) && html`<p class="muted huntnote">${[t.note, t.merged && t.merged.length ? `Merged with ${t.merged.join(", ")}` : ""].filter(Boolean).join(" · ")}</p>`}
  </article>`;
}

// Name a trophy, write its properties, give it a picture.
function TrophyForm({ init, onSave, onCancel, title = "The trophy", fixedKinds = false }) {
  const [f, setF] = useState(() => Object.assign({ n: "", monster: "", part: "other", lvl: 1, note: "", img: "", imgData: "", attached: [] }, init, { props: (init.props || []).map(p => Object.assign({ id: rid() }, p)) }));
  const [busy, setBusy] = useState(false);
  const set = p => setF(Object.assign({}, f, p));
  const setP = (i, p) => set({ props: f.props.map((x, j) => j === i ? Object.assign({}, x, p) : x) });
  const pic = async e => { const file = e.target.files && e.target.files[0]; if (!file) return; setBusy(true);
    try { if (Store.assets && Store.assets.upload) { const r = await Store.assets.upload(file, f.img); set({ img: r.id, imgData: "" }); } else set({ img: "", imgData: await shrinkImage(file, 240) }); }
    catch (err) { toast("That picture couldn't be used."); } setBusy(false); };
  const id = k => "tf-" + k;
  return html`<form class="trophyform" onSubmit=${e => { e.preventDefault(); onSave(Object.assign({}, f, { n: f.n.trim(), monster: f.monster.trim(), note: f.note.trim(), props: f.props.map(p => Object.assign({}, p, { t: (p.t || "").trim() })) })); }}>
    <div class="trophyformtop"><label class="huntpic">${huntSrc(f) ? html`<img src=${huntSrc(f)} alt="" />` : html`<svg viewBox=${huntBox(f)} aria-hidden="true"><${HuntTrophyArt} part=${f.part} attached=${f.attached} /></svg>`}
        <input type="file" accept="image/*" onChange=${pic} /><span>${busy ? "Loading…" : huntSrc(f) ? "Change the picture" : "Add a picture"}</span></label>
      <div class="trophyformf">
        <div class="mini"><label for=${id("n")}>Name</label><input id=${id("n")} value=${f.n} placeholder="e.g. Chimera's Fang" onInput=${e => set({ n: e.target.value })} /></div>
        <div class="row">
          <div class="mini grow"><label for=${id("m")}>Monster</label><input id=${id("m")} value=${f.monster} placeholder="e.g. Chimera" onInput=${e => set({ monster: e.target.value })} /></div>
          <div class="mini"><label for=${id("p")}>Part</label><select id=${id("p")} value=${f.part} onChange=${e => set({ part: e.target.value })}>
            ${[...HUNT_PARTS, { k: "other", n: "Other" }].map(p => html`<option value=${p.k}>${p.n}</option>`)}</select></div>
          <div class="mini"><label for=${id("l")}>Level</label><select id=${id("l")} value=${f.lvl} disabled=${fixedKinds} onChange=${e => set({ lvl: +e.target.value })}>${[1, 2, 3, 4, 5].map(l => html`<option value=${l}>${l}</option>`)}</select></div>
        </div>
        ${huntSrc(f) && html`<button type="button" class="btn small" onClick=${() => set({ img: "", imgData: "" })}>Remove the picture</button>`}
      </div></div>
    <h3 class="lbl">Properties</h3>
    <div class="hpropedit">${f.props.map((p, i) => html`<div class=${"row hpe hp-" + p.kind} key=${p.id}>
      <div class="seg three hkind" role="group" aria-label="Kind of property">${Object.entries(HUNT_KIND).map(([k, [s, n]]) => html`<button type="button" aria-pressed=${p.kind === k} disabled=${fixedKinds} title=${n} onClick=${() => setP(i, { kind: k })}>${s}</button>`)}</div>
      <input class="grow" aria-label=${`Property ${i + 1}`} value=${p.t} placeholder=${p.kind === "void" ? "Void: does nothing" : p.kind === "pos" ? "e.g. +2 to Perception against beasts" : "e.g. Animals grow restless near you"} onInput=${e => setP(i, { t: e.target.value })} />
      ${!fixedKinds && html`<button type="button" class="iconbtn" aria-label="Remove this property" onClick=${() => set({ props: f.props.filter((_, j) => j !== i) })}>×</button>`}</div>`)}
      ${!fixedKinds && html`<button type="button" class="btn small" onClick=${() => set({ props: [...f.props, { id: rid(), kind: "pos", t: "" }] })}>+ A property</button>`}</div>
    <div class="mini"><label for=${id("note")}>Notes</label><input id=${id("note")} value=${f.note} placeholder="Where it came from, what it's against…" onInput=${e => set({ note: e.target.value })} /></div>
    <div class="row"><button class="btn small primary" disabled=${busy}>Save the trophy</button>${onCancel && html`<button type="button" class="btn small" onClick=${onCancel}>Cancel</button>`}</div>
  </form>`;
}

function HuntLedger({ c, update }) {
  const L = c.craft.hunt.ledger;
  if (!L.length) return null;
  return html`<details class="frame huntledger"><summary class="h"><span>Ledger · ${L.length}</span></summary>
    ${html`<div class="ptledger">${L.map((e, i) => html`<div class="pled" key=${e.id}>
      <div class="row" style="justify-content:space-between;flex-wrap:nowrap"><b>${e.name}</b><button class="iconbtn" aria-label="Remove this entry" onClick=${() => update(x => { x.craft.hunt.ledger.splice(i, 1); })}>×</button></div>
      <span class="muted">${new Date(e.t).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}${e.rolls && e.rolls.length ? " · " + e.rolls.join(" · ") : ""}</span></div>`)}</div>`}</details>`;
}

/* ---------------- Carving ---------------- */
function HuntCarve({ c, st, update, log, toCase, bars, onBusy }) {
  const [part, setPart] = useState("horn"), [monster, setMonster] = useState(""), [lvl, setLvl] = useState(1);
  const [run, setRunState] = useState(null), runRef = useRef(null), timers = useRef([]);
  const setRun = r => { runRef.current = r; setRunState(r); };
  const patch = p => { const r = runRef.current; if (r) setRun(Object.assign({}, r, typeof p === "function" ? p(r) : p)); };
  const wait = ms => new Promise(res => timers.current.push(setTimeout(res, reduceMotion() ? Math.min(ms, 60) : ms)));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const P = HUNT_PARTS.find(p => p.k === part) || HUNT_PARTS[0];
  const block = !st.salvage ? `Carving trophies needs Hunting 4. ${c.name || "This character"} has ${st.lvl}.` : "";
  const busy = !!run && !run.done;
  const held = busy || (!!run && run.phase === "name");   // a carved trophy waiting for its name is lost if you leave
  useEffect(() => { onBusy(held); }, [held]); useEffect(() => () => onBusy(false), []);
  const carve = async () => {
    if (block || busy) return;
    const n = 2 * lvl, name = monster.trim();
    const first = await askRoll({ title: "Hunting check: salvaging", dice: [{ n: 1, sides: 100 }], cancel: true,
      note: `d100 − ${st.mod}. A level ${lvl} trophy has ${n} properties; the Salvaging Roll table decides how many are positive.` });
    if (!first) return;
    setRun({ phase: "cut", part, lvl, monster: name, kinds: [], rolls: [] });
    await wait(1500);
    const total = first[0] - st.mod, plan = R.salvagePlan(lvl, total);
    patch({ phase: "read", r: first[0], total, plan, rolls: [`${first[0]}−${st.mod}=${total}`] });
    await wait(900);
    if (plan.fail) {
      patch({ phase: "fail", done: true });
      update(x => log(x, `carving a ${P.n.toLowerCase()} from ${name || "a monster"} failed: no trophy`, [`${first[0]}−${st.mod}=${total}`]));
      return;
    }
    let kinds = [...Array(plan.pos).fill("pos"), ...Array(plan.neg).fill("neg")];
    patch({ phase: "props", kinds });
    for (let i = 0; i < plan.rest; i++) {
      await wait(450);
      const r = await askRoll({ title: `Hunting check: property ${plan.pos + plan.neg + i + 1} of ${n}`, dice: [{ n: 1, sides: 100 }],
        note: `d100 − ${st.mod}. 51 or more and it's negative; lower and it's void.` });
      const tt = r[0] - st.mod; kinds = [...kinds, R.salvageRest(tt)];
      patch(g => ({ kinds, rolls: [...g.rolls, `${r[0]}−${st.mod}=${tt}`] }));
    }
    await wait(700);
    patch({ phase: "name", done: true });
  };
  const keep = t => {
    const r = runRef.current; if (!r) return;
    update(x => { x.craft.hunt.trophies.push(Object.assign({ id: rid(), belted: false, attuned: false, t: Date.now() }, t));
      log(x, `carved ${t.n || "a trophy"} (level ${t.lvl}) from ${t.monster || "a monster"}: ${t.props.filter(p => p.kind === "pos").length} positive, ${t.props.filter(p => p.kind === "neg").length} negative, ${t.props.filter(p => p.kind === "void").length} void`, r.rolls); });
    toast(`${t.n || "The trophy"} is in your trophy case.`); setRun(null); toCase();
  };
  const sum = run && run.kinds ? run.kinds : [];
  return html`<section class="frame huntone huntcarvef">
    <h2 class="h"><span>Carving</span><i class="orn" aria-hidden="true"></i></h2>
    <div class="huntstage" key="stage">
      <${HuntCarcass} part=${run ? run.part : part} run=${run} onPick=${k => !busy && setPart(k)} />
      ${run && html`<div class="ptforge"><div class="huntread" key="read" aria-live="polite">
        <p><b>${run.phase === "cut" ? "Cutting…" : run.phase === "fail" ? "The trophy is ruined." : run.plan ? `${run.r} − ${st.mod} = ${run.total}` : ""}</b>
          ${run.plan && !run.plan.fail && html` · ${run.plan.neg === run.plan.n ? "all negative" : run.plan.pos ? `${run.plan.pos} positive${run.plan.capped ? " (a trophy can't be all positive)" : ""}` : `${run.plan.neg} negative`}${run.plan.rest ? `, ${run.plan.rest} to roll` : ""}`}</p>
        <div class="hkinds">${Array.from({ length: 2 * run.lvl }, (_, i) => html`<span key=${i} class=${"hk " + (sum[i] ? "hp-" + sum[i] : "wait")}>${sum[i] ? HUNT_KIND[sum[i]][0] : ""}</span>`)}</div>
        ${run.phase === "fail" && html`<button class="btn small" onClick=${() => setRun(null)}>Done</button>`}
      </div></div>`}
    </div>
    ${bars(run && run.phase === "name" ? html`<${TrophyForm} key="name" title="Name your trophy" fixedKinds=${true}
        init=${{ n: run.monster ? `${run.monster}'s ${P.n}` : "", monster: run.monster, part: run.part, lvl: run.lvl, props: run.kinds.map(k => ({ kind: k, t: "" })), note: "" }}
        onSave=${keep} onCancel=${null} />`
      : html`<div class="huntpick" key="pick">
        <div class="mini"><label for="hc-m">Monster</label><input id="hc-m" value=${monster} disabled=${busy} placeholder="e.g. Chimera" onInput=${e => setMonster(e.target.value)} /></div>
        <div class="mini"><span class="lbl">Level (the GM's) · ${2 * lvl} properties</span>
          <div class="seg huntlvl" role="group" aria-label="Trophy level">${[1, 2, 3, 4, 5].map(l => html`<button type="button" aria-pressed=${lvl === l} disabled=${busy} onClick=${() => setLvl(l)}>${l}</button>`)}</div></div>
        <div class="mini hpartsw"><span class="lbl">Part</span>
          <div class="hparts">${HUNT_PARTS.map(p => html`<button type="button" class=${"dvchip" + (part === p.k ? " on" : "")} aria-pressed=${part === p.k} disabled=${busy} onClick=${() => setPart(p.k)}><${HuntGlyph} part=${p.k} />${p.n}</button>`)}</div></div>
        ${st.maxLvl && lvl > st.maxLvl && html`<small class="muted hpartsw">You can only use up to level ${st.maxLvl} for now.</small>`}
        <div class="huntgo">${!run && html`<button class="btn primary forgebtn" key="go" disabled=${!!block} onClick=${carve}>${KNIFE}Carve the ${P.n.toLowerCase()}</button>`}${block && html`<small class="muted">${block}</small>`}</div>
      </div>`)}
  </section>`;
}
const KNIFE = html`<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 17 12.5 7.5 15 5c1.5-1.5 2.5-1 2.5-1s.5 1-1 2.5L14 9 4.5 18.5Z M10.5 9.5l2 2" /></svg>`;

// A slain horned beast lying dead on its side in the dirt: legs limp along the ground, jaw slack, tongue out, arrows in
// its flank. Fur, dirt and blood are textured; light falls from above. Every part you can carve has a dashed cut line.
function HuntCarcass({ part, run, onPick }) {
  const P = HUNT_PARTS.find(p => p.k === part) || HUNT_PARTS[0], phase = run ? run.phase : "";
  const order = ["farFront", "farHind", "tail", "body", "nearFront", "nearHind", "head", "ear"];
  return html`<div class=${"huntcarcass huntframe ph-" + (phase || "idle")} style=${huntTex("dirt") ? `background-image: linear-gradient(transparent 58%, rgb(216 207 186 / .6) 64%, transparent 72%), linear-gradient(transparent 66%, rgb(92 74 51 / .15) 66%), url(${huntTex("dirt")}), linear-gradient(#adaa9b 0%, #cdc3ad 56%, #a69273 63%, #7d6849 67%, #5c4a33 100%); background-size: auto, auto, auto 34%, auto; background-position: 0 0, 0 0, left bottom, 0 0; background-repeat: no-repeat, no-repeat, repeat-x, no-repeat` : ""}>
    <svg viewBox="-12 28 624 260" role="group" aria-label="The slain monster: choose a part to carve">
      <defs>
        <linearGradient id="hc-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9a597" /><stop offset=".55" stop-color="#cdc3ad" /><stop offset=".64" stop-color="#9c8a6b" /><stop offset="1" stop-color="#5c4a33" /></linearGradient>
        <linearGradient id="hc-mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8cfba" stop-opacity="0" /><stop offset=".5" stop-color="#d8cfba" stop-opacity=".75" /><stop offset="1" stop-color="#8a7556" stop-opacity="0" /></linearGradient>
        <linearGradient id="hc-spike" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#3a2e24" /><stop offset=".6" stop-color="#8f8068" /><stop offset="1" stop-color="#d8ccb0" /></linearGradient>
        <linearGradient id="hc-fur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e5a48" /><stop offset=".4" stop-color="#4a3a2d" /><stop offset="1" stop-color="#231912" /></linearGradient>
        <linearGradient id="hc-furfar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3e3026" /><stop offset="1" stop-color="#1a120d" /></linearGradient>
        <linearGradient id="hc-horn" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#6f6250" /><stop offset=".55" stop-color="#cdbf9f" /><stop offset=".8" stop-color="#efe6cf" /><stop offset="1" stop-color="#b9aa88" /></linearGradient>
        <radialGradient id="hc-pool" cx=".45" cy=".5" r=".5"><stop offset="0" stop-color="#3d0507" stop-opacity=".92" /><stop offset=".7" stop-color="#5a0d10" stop-opacity=".75" /><stop offset="1" stop-color="#5a0d10" stop-opacity="0" /></radialGradient>
        <radialGradient id="hc-contact" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#140c06" stop-opacity=".7" /><stop offset="1" stop-color="#140c06" stop-opacity="0" /></radialGradient>
        <linearGradient id="hc-sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2d8" stop-opacity=".32" /><stop offset=".35" stop-color="#fff2d8" stop-opacity="0" /></linearGradient>
        <radialGradient id="hc-trophy"><stop offset="0" stop-color="#fff2c4" stop-opacity=".95" /><stop offset=".5" stop-color="#e8b04a" stop-opacity=".55" /><stop offset="1" stop-color="#e8b04a" stop-opacity="0" /></radialGradient>
        <${HuntPattern} id="hc-furtex" k="fur" /><${HuntPattern} id="hc-dirt" k="dirt" h=${128} />
      </defs>
      <rect x="-20" width="640" height="320" fill="url(#hc-sky)" />
      <path class="hchills" d="M-20 198 L0 196 C60 180 110 186 160 178 C220 168 270 184 330 176 C390 168 440 182 500 174 C540 170 570 178 600 176 L620 176 V206 H-20 Z" />
      <path class="hchills near" d="M-20 205 L0 204 C80 192 140 200 220 192 C300 186 380 198 460 190 C520 186 560 194 600 190 L620 190 V210 H-20 Z" />
      <rect x="-20" y="200" width="640" height="120" fill="url(#hc-dirt)" opacity=".9" />
      <rect x="-20" y="180" width="640" height="44" fill="url(#hc-mist)" />
      <path class="hcgrass" d="M20 214 l3 -12 l2 12 M34 210 l-2 -10 l5 10 M560 212 l2 -11 l3 11 M584 222 l-3 -12 l4 12 M300 300 l2 -9 l3 9 M120 306 l-2 -10 l4 10 M430 304 l3 -9 l2 9" />
      <ellipse cx="320" cy="266" rx="250" ry="20" fill="url(#hc-contact)" />
      <ellipse cx="128" cy="262" rx="120" ry="16" fill="url(#hc-pool)" />
      <path class="hcblood" d="M96 254 C112 262 140 266 170 262 M60 262 C70 270 92 272 110 268" />
      <g class="hcbody">
        ${order.map(k => html`<path key=${k} class=${"hcfur " + k} d=${HC_SHAPES[k]} fill=${k.startsWith("far") ? "url(#hc-furfar)" : "url(#hc-fur)"} />`)}
        <g class="hctex">${order.map(k => html`<path key=${"t" + k} d=${HC_SHAPES[k]} fill="url(#hc-furtex)" />`)}</g>
        <path class="hcsheen" d=${HC_SHAPES.body} fill="url(#hc-sheen)" /><path class="hcsheen" d=${HC_SHAPES.head} fill="url(#hc-sheen)" />
        <path class="hcbelly" d="M300 258 C340 248 410 246 452 252 L450 258 L300 262 Z" />
        <path class="hcrib" d="M326 150 C330 186 330 216 324 244 M354 146 C358 184 358 216 354 246 M382 148 C386 184 386 218 382 246" />
        ${[[300, 128, 14], [330, 121, 18], [362, 118, 20], [396, 119, 18], [428, 125, 15], [456, 137, 11]].map(([x, y, h], i) => html`<path key=${"sp" + i} class="hcspine"
          d=${`M${x} ${y + 2} C${x + 2} ${y - h * .45} ${x + 5} ${y - h * .8} ${x + 11} ${y - h} C${x + 9} ${y - h * .55} ${x + 11} ${y - h * .2} ${x + 15} ${y + 3} Z`} fill="url(#hc-spike)" />`)}
        <path class="hcmane" d="M206 178 C224 160 246 150 270 146 M214 194 C232 178 254 168 278 166 M222 212 C240 196 262 188 284 186 M312 128 C340 122 380 120 420 126" />
        <path class="hcmouth" d="M76 218 L118 220 C104 232 86 240 70 244 C70 234 72 226 76 218 Z" />
        <path class="hctongue" d="M84 236 C78 248 70 256 60 262 C70 268 84 264 92 252 C96 246 94 238 84 236 Z" />
        <path class="hcfang" d="M86 218 L90 230 L94 219 Z M100 219 L103 228 L106 220 Z M80 240 L84 231 L88 239 Z" />
        <ellipse class="hcnose" cx="59" cy="203" rx="5.5" ry="4" /><ellipse class="hcnoseshine" cx="57" cy="201" rx="1.8" ry="1" />
        <path fill="url(#hc-horn)" class="hchorn" d="M162 166 C150 140 156 110 182 92 C176 114 178 138 188 160 Z" />
        <path class="hchornring" d="M162 154 C168 150 176 150 182 152 M158 140 C165 136 172 135 180 137 M160 126 C166 121 172 119 180 120 M166 112 C171 107 176 104 182 104" />
        <path class="hceye" d="M140 187 Q150 182 160 188" /><path class="hclash" d="M143 186 l-2 3 M149 184.5 l-1 3.4 M155 185 l0 3.4" />
        <path class="hcclaw" d="M147 275 l-9 1 M148 280 l-8 5 M155 284 l-4 7 M552 271 l9 1 M552 277 l8 5 M546 283 l4 7 M142 253 l-7 0 M143 258 l-6 4" />
        <path class="hcjoint" d="M224 258 c-4 4 -4 10 0 14 M490 259 c4 4 4 11 -1 15 M196 244 c-3 3 -3 8 0 11" />
        <g class="hcarrow"><path d="M372 172 L344 126" /><path class="fl" d="M344 126 l-9 -3 l4 7 Z M344 126 l-3 -9 l7 5 Z" /><path class="hcwound" d="M368 168 c4 2 6 8 4 14" /></g>
        <g class="hcarrow"><path d="M414 180 L404 136" /><path class="fl" d="M404 136 l-7 -5 l1 8 Z M404 136 l1 -9 l5 7 Z" /><path class="hcwound" d="M412 176 c4 3 5 9 3 14" /></g>
      </g>
      ${HUNT_PARTS.map(p => html`<g key=${p.k} class=${"hcpart" + (p.k === part ? " on" : "")} role="button" tabindex="0" aria-label=${`Carve the ${p.n.toLowerCase()}`}
          onClick=${() => onPick(p.k)} onKeyDown=${e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(p.k); } }}>
        <path class="hccut" d=${p.cut} /><circle class="hchit" cx=${p.at[0]} cy=${p.at[1]} r="22" />
        ${p.k === part && html`<text class="hclabel" x=${p.at[0]} y=${p.at[1] - 28}>${p.n}</text>`}</g>`)}
      ${run && html`<g key=${"run" + run.part} class="hcrun">
        <path class="hcslice" d=${P.cut} pathLength="100" />
        <g class="hcknife" style=${`offset-path: path("${P.cut}")`}><path class="hcblade" d="M0 0 L20 -6 L24 -2 L4 4 Z" /><path class="hcgrip" d="M-16 7 L0 0 L4 4 L-12 11 Z" /></g>
        ${phase !== "cut" && phase !== "fail" && html`<g class="hcprize" transform=${`translate(${P.at[0]} ${P.at[1]})`}><circle r="40" fill="url(#hc-trophy)" /><g class="hcprizeart" transform="scale(.72)"><${HuntTrophyArt} part=${P.k} /></g></g>`}
        ${phase === "fail" && html`<g class="hcdust" transform=${`translate(${P.at[0]} ${P.at[1]})`}>${Array.from({ length: 10 }, (_, k) => html`<circle r="2.4" style=${`--a:${k * 36}deg`} />`)}</g>`}
      </g>`}
    </svg></div>`;
}

/* ---------------- Merging ---------------- */
function HuntMerge({ c, st, update, log, bars, onBusy, toCase }) {
  const h = c.craft.hunt, [recv, setRecv] = useState(""), [give, setGive] = useState(""), [cost, setCost] = useState("");
  const [run, setRunState] = useState(null), runRef = useRef(null), timers = useRef([]);
  const setRun = r => { runRef.current = r; setRunState(r); };
  const patch = p => { const r = runRef.current; if (r) setRun(Object.assign({}, r, typeof p === "function" ? p(r) : p)); };
  const wait = ms => new Promise(res => timers.current.push(setTimeout(res, reduceMotion() ? Math.min(ms, 60) : ms)));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const R1 = h.trophies.find(t => t.id === recv), G1 = h.trophies.find(t => t.id === give);
  const gPos = G1 ? G1.props.filter(p => p.kind === "pos") : [];
  const busy = !!run && !run.done;
  useEffect(() => { onBusy(busy); }, [busy]); useEffect(() => () => onBusy(false), []);
  const block = !st.combine ? `Merging trophies needs Hunting 7. ${c.name || "This character"} has ${st.lvl}.`
    : !R1 || !G1 ? "Choose a trophy to receive and one to give." : !gPos.length ? `${G1.n || "The giver"} has no positive properties to pass on.` : "";
  const roll = async again => {
    const r = await askRoll({ title: again ? "Hunting check: merging, again" : "Hunting check: merging", dice: [{ n: 1, sides: 100 }], cancel: !again,
      note: `d100 − ${st.mod}. Below 60 passes one positive property, lower passes more; 80 or more and nothing passes.` });
    if (!r) return null; const total = r[0] - st.mod; return { r: r[0], total, res: R.combineCount(total) };
  };
  const start = async () => {
    if (block || busy) return;
    const first = await roll(false); if (!first) return;
    setRun({ phase: "fuse", recv: R1, give: G1, rolls: [first], rerolled: false });
    await wait(1800);
    patch({ phase: "read" });
  };
  const again = async () => {
    const r = await roll(true); if (!r) return;
    patch(g => ({ phase: "fuse", rolls: [...g.rolls, r], rerolled: true })); await wait(1400); patch({ phase: "read" });
  };
  const last = run && run.rolls[run.rolls.length - 1];
  const nMove = last && !last.res.fail ? Math.min(last.res.n, run.give.props.filter(p => p.kind === "pos").length) : 0;
  const [chosen, setChosen] = useState([]);
  useEffect(() => { if (run && run.phase === "read") setChosen(run.give.props.filter(p => p.kind === "pos").slice(0, nMove).map(p => p.id)); }, [run && run.phase, run && run.rolls.length]);
  // The giver's chosen positives replace the receiver's void properties first, then its negatives, then are added.
  const apply = () => {
    const f = runRef.current; if (!f) return;
    const moving = f.give.props.filter(p => chosen.includes(p.id)).slice(0, nMove);
    const spent = num(cost) * (f.rerolled ? 3 : 1);
    update(x => {
      const H = x.craft.hunt, rv = H.trophies.find(t => t.id === f.recv.id);
      if (rv) {
        moving.forEach(p => { const at = rv.props.findIndex(q => q.kind === "void"), at2 = at >= 0 ? at : rv.props.findIndex(q => q.kind === "neg"), np = { id: rid(), kind: "pos", t: p.t };
          if (at2 >= 0) rv.props[at2] = np; else rv.props.push(np); });
        rv.merged = [...(rv.merged || []), f.give.n || "a trophy"];
        rv.attached = [...(rv.attached || []), f.give.part || "other", ...(f.give.attached || [])].slice(0, HUNT_ATTACH_MAX);
      }
      H.trophies = H.trophies.filter(t => t.id !== f.give.id);
      ["release", "second"].forEach(k => { if (H[k] && H[k].id === f.give.id) H[k] = null; });
      log(x, `merged ${f.give.n || "a trophy"} into ${f.recv.n || "a trophy"}: ${moving.length} positive propert${moving.length === 1 ? "y" : "ies"} passed${spent ? `, cost ${spent}` : ""}; the giver burned`,
        f.rolls.map(r => `${r.r}−${st.mod}=${r.total}`).concat(f.rerolled ? ["re-rolled (cost ×3)"] : []));
    });
    if (f.give.img && Store.assets && Store.assets.remove) Store.assets.remove(f.give.img);
    patch({ phase: "made", done: true, moved: moving.length }); setGive("");
  };
  const fresh = run && run.phase === "made" ? h.trophies.find(t => t.id === run.recv.id) : null;
  const pickRow = (label, val, set, other) => html`<div class="mini hpartsw"><label>${label}</label>
    <div class="hmergepick">${h.trophies.filter(t => t.id !== other).map(t => html`<button type="button" key=${t.id} class=${"hmchip" + (val === t.id ? " on" : "")} aria-pressed=${val === t.id} disabled=${busy} onClick=${() => set(t.id)}>
      <${HuntTrophy} t=${t} size=${30} /><span>${t.n || "Unnamed"}</span><small>${t.props.filter(p => p.kind === "pos").length}+</small></button>`)}</div></div>`;
  return html`<section class="frame huntone huntmergef">
    <h2 class="h"><span>Merging</span><i class="orn" aria-hidden="true"></i></h2>
    <div class="huntstage" key="stage">
      <${HuntAltar} recv=${run ? run.recv : R1} give=${run ? run.give : G1} run=${run} fresh=${fresh} />
      ${run && html`<div class="ptforge"><div class="huntread" key="read" aria-live="polite">
        ${run.phase === "fuse" && html`<p><b>The trophies fuse…</b></p>`}
        ${run.phase === "read" && html`<div key="read2"><p><b>${last.r} − ${st.mod} = ${last.total}</b> · ${last.res.fail ? "nothing passes" : `${last.res.n} positive propert${last.res.n === 1 ? "y" : "ies"} can pass`}${!last.res.fail && last.res.n > nMove ? ` (the giver has ${nMove})` : ""}</p>
          ${nMove > 0 && run.give.props.filter(p => p.kind === "pos").length > nMove && html`<div class="hmovepick">${run.give.props.filter(p => p.kind === "pos").map(p => html`<label class="demonguard" key=${p.id}>
            <input type="checkbox" checked=${chosen.includes(p.id)} disabled=${!chosen.includes(p.id) && chosen.length >= nMove} onChange=${e => setChosen(e.target.checked ? [...chosen, p.id] : chosen.filter(i => i !== p.id))} /> ${p.t || "Positive property"}</label>`)}</div>`}
          <div class="row">${st.reroll && !run.rerolled && html`<button class="btn small" onClick=${again}>Ignore it and roll again (cost ×3)</button>`}
            <button class="btn small primary" onClick=${apply}>${nMove ? `Pass ${chosen.length} to ${run.recv.n || "the receiver"}` : "Burn the giver"}</button>
            <button class="btn small" onClick=${() => setRun(null)}>Cancel</button></div></div>`}
        ${run.phase === "made" && html`<p key="made"><b>${run.moved ? `${run.moved} propert${run.moved === 1 ? "y" : "ies"} passed to ${run.recv.n || "the receiver"}.` : "Nothing passed; the giver is gone."}</b></p>`}
      </div></div>`}
    </div>
    ${bars(run && run.phase === "made" && fresh ? html`<${TrophyForm} key=${"rn" + fresh.id} init=${fresh} onSave=${t => { update(x => { const i = x.craft.hunt.trophies.findIndex(y => y.id === t.id); if (i >= 0) x.craft.hunt.trophies[i] = Object.assign({}, x.craft.hunt.trophies[i], t); }); setRun(null); toast(`${t.n || "The trophy"} is saved.`); toCase(); }}
        onCancel=${() => { setRun(null); toCase(); }} />`
      : html`<div class="huntpick" key="pick">
        ${h.trophies.length < 2 ? html`<p class="muted hpartsw">You need two trophies to merge.</p>` : html`<${HuntFrag}>
          ${pickRow("Receiver", recv, setRecv, give)}
          ${pickRow("Giver (burns)", give, setGive, recv)}
          <div class="mini"><label for="hm-cost">Cost (the GM's)</label><input id="hm-cost" type="number" min="0" value=${cost} placeholder="e.g. 200" disabled=${busy} onInput=${e => setCost(e.target.value)} /></div>
        </${HuntFrag}>`}
        <div class="huntgo">${!run && html`<button class="btn primary forgebtn" key="go" disabled=${!!block} onClick=${start}>${MERGE_ICON}Merge</button>`}${block && h.trophies.length >= 2 && html`<small class="muted">${block}</small>`}</div>
      </div>`)}
  </section>`;
}
const BELT_ICON = html`<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M1 7h18v5H1z M7 5.5h5v8H7z M9.5 13.5v2.5 M8 17.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0" /></svg>`;
const MERGE_ICON = html`<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="7" cy="10" r="4.5" /><circle cx="13" cy="10" r="4.5" /></svg>`;

// A stone altar with a ring of carved notches: the receiver on the left, the giver on the right. Merging spins them
// together; the giver breaks into motes that pour into the receiver, which flares.
function HuntAltar({ recv, give, run, fresh }) {
  const phase = run ? run.phase : "", R0 = fresh || recv;
  const medal = (t, x, cls) => html`<g class=${"hamedal " + cls} style=${`--x:${x}px`}>${t ? html`<g transform=${`translate(${x} 130)`}>
      ${huntSrc(t) ? html`<g key="pic"><circle r="47" fill="#0d0805" opacity=".45" transform="translate(3 5)" /><circle r="45" class="harim" fill="url(#ha-brass)" /><circle r="41" fill="#2a1608" />
          <image href=${huntSrc(t)} x="-40" y="-40" width="80" height="80" preserveAspectRatio="xMidYMid slice" clip-path="url(#ha-disc)" /><circle r="40" fill="url(#ha-shine)" /></g>`
        : html`<g key="art"><ellipse cy="50" rx="38" ry="9" fill="#0d0805" opacity=".4" /><g transform=${`scale(${(t.attached || []).length ? 1.15 : 1.4})`}><${HuntTrophyArt} part=${t.part} attached=${t.attached} /></g></g>`}
      <text y="74" class="hbname">${(t.n || "Trophy").slice(0, 20)}</text></g>`
    : html`<g transform=${`translate(${x} 130)`}><circle r="44" class="haempty" /><text y="5" class="haq">${cls === "recv" ? "Receiver" : "Giver"}</text></g>`}</g>`;
  return html`<div class=${"huntaltar huntframe ph-" + (phase || "idle")} style=${huntTex("stone") ? `background-image: radial-gradient(ellipse 55% 110% at 50% 55%, rgb(107 102 94 / .45), rgb(43 41 37 / .9) 80%), url(${huntTex("stone")})` : ""}>
    <svg viewBox="0 15 600 250" role="img" aria-label="The merging altar">
      <defs><clipPath id="ha-disc"><circle r="40" /></clipPath>
        
        <linearGradient id="ha-brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe7a6" /><stop offset=".3" stop-color="#d1a24a" /><stop offset=".6" stop-color="#8f6522" /><stop offset=".8" stop-color="#d8ad58" /><stop offset="1" stop-color="#5e4012" /></linearGradient>
        <radialGradient id="ha-bone" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#f1e6cc" /><stop offset=".6" stop-color="#cdbb94" /><stop offset="1" stop-color="#8f7b58" /></radialGradient>
        <linearGradient id="ha-shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".3" /><stop offset=".5" stop-color="#fff" stop-opacity="0" /></linearGradient>
        <radialGradient id="ha-floor" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#6b665e" /><stop offset="1" stop-color="#2b2925" /></radialGradient>
        <${HuntPattern} id="ha-stone" k="stone" />
        <radialGradient id="ha-flare"><stop offset="0" stop-color="#fff6d8" /><stop offset=".4" stop-color="#e8b04a" stop-opacity=".6" /><stop offset="1" stop-color="#e8b04a" stop-opacity="0" /></radialGradient></defs>
      <rect width="600" height="280" fill="url(#ha-floor)" /><rect width="600" height="280" fill="url(#ha-stone)" />
      <ellipse cx="300" cy="150" rx="236" ry="112" fill="#141210" opacity=".35" />
      <ellipse cx="300" cy="140" rx="228" ry="106" fill="#8d877d" /><ellipse cx="300" cy="140" rx="228" ry="106" fill="url(#ha-stone)" />
      <ellipse cx="300" cy="140" rx="228" ry="106" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="2" />
      <ellipse cx="300" cy="140" rx="210" ry="100" class="haring" />
      <ellipse cx="300" cy="140" rx="190" ry="88" class="haring thin" />
      ${Array.from({ length: 24 }, (_, i) => { const a = i / 24 * Math.PI * 2; return html`<path class="hanotch" d=${`M${300 + Math.cos(a) * 196} ${140 + Math.sin(a) * 92}l${Math.cos(a) * 10} ${Math.sin(a) * 5}`} />`; })}
      <path class="hastream" d="M420 130 C380 90 340 92 300 110 C260 128 220 132 180 130" />
      ${medal(R0, 180, "recv")}${phase !== "made" && medal(give, 420, "give")}
      ${(phase === "fuse" || phase === "made") && html`<g class="hamotes" key=${"m" + (run ? run.rolls.length : 0)}>${Array.from({ length: 16 }, (_, i) => html`<circle r=${1.6 + (i % 3)} style=${`--i:${i}`} />`)}</g>`}
      ${phase === "made" && html`<circle class="haflare" cx="180" cy="130" r="80" fill="url(#ha-flare)" />`}
    </svg></div>`;
}
