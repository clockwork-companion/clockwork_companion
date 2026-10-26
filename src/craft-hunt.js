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
const HUNT_PAGES = [["case", "Trophies & belt"], ["carve", "Carving"], ["merge", "Merging"]];
const huntSrc = t => !t ? "" : t.img ? (Store.assets && Store.assets.urlFor ? Store.assets.urlFor(t.img) : "") : t.imgData || "";
const HUNT_KIND = { pos: ["+", "Positive"], neg: ["−", "Negative"], void: ["∅", "Void"] };

// The monster's parts you can carve, where they sit on the carcass (viewBox 0 0 600 320), and the line the knife follows.
const HUNT_PARTS = [
  { k: "horn", n: "Horn", at: [160, 96], cut: "M148 136 C156 130 166 128 176 131" },
  { k: "eye", n: "Eye", at: [138, 157], cut: "M124 157 C130 148 146 148 152 157 C146 165 130 165 124 157" },
  { k: "fang", n: "Fang", at: [96, 194], cut: "M82 184 C84 198 98 206 114 200" },
  { k: "claw", n: "Claw", at: [188, 286], cut: "M200 276 C204 288 192 296 180 292" },
  { k: "hide", n: "Hide", at: [372, 188], cut: "M300 160 C340 150 400 152 440 166 C448 190 442 214 430 226 C380 234 330 234 296 222 C290 200 292 180 300 160" },
  { k: "heart", n: "Heart", at: [270, 200], cut: "M258 186 C264 178 278 180 282 190 C284 202 274 212 268 216 C260 210 254 198 258 186" },
  { k: "tail", n: "Tail", at: [540, 196], cut: "M496 166 C492 176 492 186 496 194" },
  { k: "bone", n: "Bone", at: [458, 250], cut: "M444 238 C452 232 464 232 472 240" },
];
const HUNT_GLYPH = {
  horn: "M-7 9C-5 0 -2 -6 6 -10C2 -4 2 3 4 9Z", eye: "M-9 0C-5 -6 5 -6 9 0C5 6 -5 6 -9 0Z M-2.6 0a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0",
  fang: "M-5 -9H5C5 -2 2 5 0 10C-2 5 -5 -2 -5 -9Z", claw: "M-8 8C-6 0 -1 -6 7 -9C3 -4 1 2 1 8Z M-2 9C0 3 3 -1 8 -3",
  hide: "M-9 -7C-4 -9 4 -9 9 -7C8 -2 9 3 8 8C3 9 -3 9 -8 8C-9 3 -8 -2 -9 -7Z", heart: "M0 8C-8 2 -9 -3 -6 -6C-3 -9 0 -6 0 -4C0 -6 3 -9 6 -6C9 -3 8 2 0 8Z",
  tail: "M-9 6C-4 6 2 3 4 -2C5 -6 8 -8 9 -9C9 -4 7 2 3 5C0 7 -5 8 -9 6Z", bone: "M-7 -7a2.4 2.4 0 1 1 3 -1L4 6a2.4 2.4 0 1 1 1 3a2.4 2.4 0 1 1 -3 1L-6 -2a2.4 2.4 0 1 1 -1 -5Z",
  other: "M0 -9L8 0L0 9L-8 0Z",
};
const HuntGlyph = ({ part }) => html`<svg class="hglyph" viewBox="-11 -11 22 22" aria-hidden="true"><path d=${HUNT_GLYPH[part] || HUNT_GLYPH.other} /></svg>`;
const HuntPips = ({ lvl }) => html`<span class="hpips" aria-label=${`Level ${lvl}`}>${[1, 2, 3, 4, 5].map(i => html`<i class=${i <= lvl ? "on" : ""}></i>`)}</span>`;
// A trophy's medallion: its picture, or the part's glyph on a disc.
const HuntMedal = ({ t, size = 64, cls = "" }) => { const src = huntSrc(t);
  return html`<span class=${"hmedal " + cls} style=${`--s:${size}px`}>${src ? html`<img src=${src} alt="" />` : html`<${HuntGlyph} part=${t.part} />`}</span>`; };

function Hunting({ c, update }) {
  const st = R.huntState(c), h = c.craft.hunt;
  const [page, setPageState] = useState(() => lsGet("cw-hunt-page", "case"));
  const setPage = p => { setPageState(p); lsSet("cw-hunt-page", p); };
  const log = (x, name, rolls) => { x.craft.hunt.ledger = [{ id: rid(), t: Date.now(), name, rolls: rolls || [] }, ...x.craft.hunt.ledger].slice(0, 30); addLog(x, "Hunting: " + name); };
  return html`<div class="hunting">
    <section class="frame hunthead"><${Head} title="Hunting" topic="hunting" />
      <p class="sub">Carve trophies from the monsters you kill, hang them on your belt, and attune them to use their power. ${st.combine ? "Merge them to pass one trophy's strengths to another." : ""}</p>
      <div class="facts ptfacts">${[["Hunting", `${st.lvl}`], ["Modifier", `${st.mod}%`],
        ["Trophies you can use", st.maxLvl ? `Up to level ${st.maxLvl}` : "From Hunting 3"], ["Attuned", `${st.attuned.length} of ${st.attuneMax + (h.second ? 1 : 0)}`],
        ["On the belt", `${st.belted.length} of ${st.slots}`]].map(([k, v]) => html`<div class="fact"><span>${k}</span><b>${v}</b></div>`)}</div>
      <${HuntMyths} c=${c} st=${st} update=${update} />
    </section>
    <div class="seg huntpages" role="tablist" aria-label="Hunting">${HUNT_PAGES.map(([k, n]) => html`<button role="tab" aria-selected=${page === k} aria-pressed=${page === k} onClick=${() => setPage(k)}>${n}</button>`)}</div>
    ${page === "case" && html`<${HuntCase} key="case" c=${c} st=${st} update=${update} log=${log} toCarve=${() => setPage("carve")} />`}
    ${page === "carve" && html`<${HuntCarve} key="carve" c=${c} st=${st} update=${update} log=${log} toCase=${() => setPage("case")} />`}
    ${page === "merge" && html`<${HuntMerge} key="merge" c=${c} st=${st} update=${update} log=${log} />`}
  </div>`;
}

// The mythologies the hunter knows: Lore checks about them use the Hunting modifier.
function HuntMyths({ c, st, update }) {
  const [v, setV] = useState(""), myths = c.craft.hunt.myths;
  if (!st.myths && !myths.length) return null;
  return html`<div class="huntmyths"><span class="lbl">Mythologies you know (${myths.length} of ${st.myths})</span>
    <div class="row">${myths.map((m, i) => html`<span class="hmyth" key=${m + i}>${m}<button class="iconbtn" aria-label=${`Forget ${m}`} onClick=${() => update(x => { x.craft.hunt.myths.splice(i, 1); })}>×</button></span>`)}
      ${myths.length < st.myths && html`<form class="row" key="add" onSubmit=${e => { e.preventDefault(); const n = v.trim(); if (!n) return; update(x => { x.craft.hunt.myths.push(n); }); setV(""); }}>
        <input class="hmythin" aria-label="A mythology" placeholder="e.g. Slavic folklore" value=${v} onInput=${e => setV(e.target.value)} /><button class="btn small">Add</button></form>`}</div></div>`;
}

/* ---------------- Trophies & belt ---------------- */
function HuntCase({ c, st, update, log, toCarve }) {
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

  return html`<${HuntFrag}>
    <section class="frame huntbeltf">
      <h2 class="h"><span>Your belt</span><i class="orn" aria-hidden="true"></i></h2>
      <p class="sub">Trophies only work from your belt. Attune one to use its power${st.maxLvl ? ` (up to level ${st.maxLvl})` : ""}. Click a trophy to choose it.</p>
      <${HuntBelt} st=${st} h=${h} belt=${belt} sel=${sel} fx=${fx} onPick=${id => setSel(id === sel ? "" : id)} />
      <div class="row huntbeltctl">
        <span class="ptstepper"><span class="lbl">Loops on the belt</span>
          <button class="iconbtn" aria-label="One loop fewer" disabled=${st.slots <= Math.max(1, belt.length)} onClick=${() => update(x => { x.craft.hunt.slots = Math.max(1, num(x.craft.hunt.slots) - 1); })}>−</button><b>${st.slots}</b>
          <button class="iconbtn" aria-label="One loop more" disabled=${st.slots >= 12} onClick=${() => update(x => { x.craft.hunt.slots = Math.min(12, num(x.craft.hunt.slots) + 1); })}>+</button></span>
        ${(rel || sec) && html`<span class="huntturns" key="turns">${rel && html`<span class="flag brass">Released: ${rel.turns} turn${rel.turns === 1 ? "" : "s"}</span>`} ${sec && html`<span class="flag">Second attunement: ${sec.turns} turn${sec.turns === 1 ? "" : "s"}</span>`}
          <button class="btn small" onClick=${tick}>End of turn</button></span>`}
      </div>
      ${cur && cur.belted ? html`<div class="huntsel" key=${"sel" + cur.id}>
          <${HuntMedal} t=${cur} size=${44} /><div class="huntseln"><b>${cur.n || "Unnamed trophy"}</b><small>${[cur.monster, (HUNT_PARTS.find(p => p.k === cur.part) || {}).n, `level ${cur.lvl}`].filter(Boolean).join(" · ")}</small></div>
          <div class="row">
            ${!cur.attuned ? html`<button class="btn small primary" disabled=${!!can(cur)} title=${can(cur) || "Attune it: its properties work while it's on your belt"} onClick=${() => attune(cur)}>Attune</button>`
              : html`<button class="btn small" onClick=${() => setT(cur.id, y => { y.attuned = false; })}>Unattune</button>`}
            ${st.second && !cur.attuned && st.attuned.length >= 1 && !sec && html`<button class="btn small" disabled=${!!can(cur)} title="Hunting 6: attune it too, for 3 turns" onClick=${() => empower("second", cur)}>Attune a second: ${st.ap} AP, 1 Stamina</button>`}
            ${st.release && cur.attuned && !(rel && rel.id === cur.id) && html`<button class="btn small" title="Hunting 5: double its numbers for 3 turns" onClick=${() => empower("release", cur)}>Release: ${st.ap} AP, 1 Stamina</button>`}
            <button class="btn small" onClick=${() => offBelt(cur)}>Take it off</button></div>
          ${can(cur) && html`<p class="muted">${can(cur)}</p>`}</div>`
        : html`<p class="muted huntsel" key="none">${belt.length ? "Choose a trophy on the belt to attune or release it." : "Nothing on your belt yet. Put trophies on it from the case below."}</p>`}
    </section>

    <section class="frame">
      <h2 class="h"><span>Trophy case</span><i class="orn" aria-hidden="true"></i></h2>
      <p class="sub">Every trophy you own. Write what each property does from the GM's trophy card.</p>
      ${edit ? html`<${TrophyForm} key=${"edit" + (edit.id || "new")} init=${edit} onCancel=${() => setEdit(null)}
          onSave=${t => { update(x => { const i = x.craft.hunt.trophies.findIndex(y => y.id === t.id);
            if (i >= 0) x.craft.hunt.trophies[i] = Object.assign({}, x.craft.hunt.trophies[i], t); else x.craft.hunt.trophies.push(Object.assign({ id: rid(), belted: false, attuned: false, t: Date.now() }, t)); }); setEdit(null); }} />`
        : html`<div class="huntcards" key="cards">
          ${h.trophies.map(t => html`<${TrophyCard} key=${t.id} t=${t} st=${st} sel=${sel === t.id} rel=${rel && rel.id === t.id}
            onBelt=${() => (t.belted ? offBelt(t) : toBelt(t))} onEdit=${() => setEdit(t)} onRemove=${() => remove(t)} onPick=${() => setSel(t.id)} />`)}
          <button type="button" class="huntnew" onClick=${() => (st.salvage ? toCarve() : setEdit({ n: "", monster: "", part: "other", lvl: 1, props: [], note: "" }))}>
            <span>+</span>${st.salvage ? "Carve a new trophy" : "Add a trophy"}</button>
          <button type="button" class="huntnew small" onClick=${() => setEdit({ n: "", monster: "", part: "other", lvl: 1, props: [{ id: rid(), kind: "pos", t: "" }, { id: rid(), kind: "void", t: "" }], note: "" })}>
            <span>+</span>Add one you found or bought</button></div>`}
    </section>
    <${HuntLedger} c=${c} update=${update} />
  </${HuntFrag}>`;
}

// The belt: a strap of leather with a brass buckle and loops; each belted trophy hangs from a cord on its loop.
function HuntBelt({ st, h, belt, sel, fx, onPick }) {
  const n = st.slots, W = 600, x0 = 120, x1 = 570, step = (x1 - x0) / n;
  const slot = i => x0 + step * (i + .5);
  return html`<div class="huntbelt">
    <svg viewBox="0 0 600 250" role="group" aria-label=${`Your belt: ${belt.length} of ${n} loops taken`}>
      <defs>
        <linearGradient id="hb-leather" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a4a2a" /><stop offset=".45" stop-color="#5b3419" /><stop offset="1" stop-color="#3a200e" /></linearGradient>
        <linearGradient id="hb-brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3d58a" /><stop offset=".5" stop-color="#b98a35" /><stop offset="1" stop-color="#6e4d18" /></linearGradient>
        <radialGradient id="hb-glow"><stop offset=".55" stop-color="var(--hglow)" stop-opacity=".55" /><stop offset="1" stop-color="var(--hglow)" stop-opacity="0" /></radialGradient>
        <clipPath id="hb-disc"><circle r="25" /></clipPath>
      </defs>
      <path class="hbstrap" d="M-10 52 C150 44 450 44 610 52 L610 88 C450 80 150 80 -10 88Z" fill="url(#hb-leather)" />
      <path class="hbstitch" d="M-10 57 C150 49 450 49 610 57 M-10 83 C150 75 450 75 610 83" />
      <g class="hbbuckle"><rect x="40" y="38" width="54" height="62" rx="7" fill="none" stroke="url(#hb-brass)" stroke-width="7" /><path d="M67 42V96" stroke="url(#hb-brass)" stroke-width="4" /><circle cx="67" cy="69" r="3.2" fill="#3a200e" /></g>
      ${Array.from({ length: n }, (_, i) => { const x = slot(i), t = belt[i];
        return html`<g class=${"hbloop" + (t ? " full" : "")} key=${"loop" + i}><rect x=${x - 15} y="44" width="30" height="44" rx="4" class="hbloopr" /><path d=${`M${x - 15} 50 H${x + 15} M${x - 15} 82 H${x + 15}`} class="hbstitch" /></g>`; })}
      ${belt.map((t, i) => { const x = slot(i), on = sel === t.id, released = h.release && h.release.id === t.id, f = fx && fx.id === t.id ? fx.kind : "";
        return html`<g key=${t.id} class=${"hbcharm" + (on ? " sel" : "") + (t.attuned ? " attuned" : "") + (released ? " released" : "") + (f ? " fx-" + f : "")}
            style=${`--x:${x}px; --d:${(i * .37).toFixed(2)}s`} role="button" tabindex="0" aria-label=${`${t.n || "Trophy"}${t.attuned ? ", attuned" : ""}`}
            onClick=${() => onPick(t.id)} onKeyDown=${e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(t.id); } }}>
          <g class="hbswing"><path class="hbcord" d=${`M${x} 70 C${x - 3} 100 ${x + 3} 120 ${x} 140`} />
            <g transform=${`translate(${x} 170)`}>
              <circle class="hbaura" r="46" fill="url(#hb-glow)" />
              ${t.attuned && html`<circle class="hbring" r="33" />`}
              <circle class="hbrim" r="28" />
              ${huntSrc(t) ? html`<image href=${huntSrc(t)} x="-25" y="-25" width="50" height="50" preserveAspectRatio="xMidYMid slice" clip-path="url(#hb-disc)" />`
                : html`<circle r="25" class="hbdisc" /><g transform="scale(1.7)"><path class="hbglyph" d=${HUNT_GLYPH[t.part] || HUNT_GLYPH.other} /></g>`}
              <text y="60" class="hbname">${(t.n || "Trophy").slice(0, 16)}</text>
              ${released && html`<g class="hbrays">${Array.from({ length: 12 }, (_, k) => html`<path d="M0 -34V-44" transform=${`rotate(${k * 30})`} />`)}</g>`}
            </g></g></g>`; })}
    </svg></div>`;
}

function TrophyCard({ t, st, sel, rel, onBelt, onEdit, onRemove, onPick }) {
  const part = (HUNT_PARTS.find(p => p.k === t.part) || {}).n;
  const tooStrong = st.maxLvl && t.lvl > st.maxLvl;
  return html`<article class=${"huntcard" + (t.belted ? " belted" : "") + (t.attuned ? " attuned" : "") + (sel ? " sel" : "")} onClick=${e => { if (!e.target.closest("button")) onPick(); }}>
    <header><${HuntMedal} t=${t} size=${56} /><div class="huntcardn"><b>${t.n || "Unnamed trophy"}</b><small>${[t.monster, part].filter(Boolean).join(" · ") || "Trophy"}</small>
      <span class="row"><${HuntPips} lvl=${t.lvl} /><small>Level ${t.lvl}</small>${t.attuned ? html`<span class="flag brass">Attuned</span>` : t.belted ? html`<span class="flag">On the belt</span>` : ""}${rel ? html`<span class="flag brass">Released</span>` : ""}${tooStrong ? html`<span class="flag bad">Too strong yet</span>` : ""}</span></div></header>
    <ul class="hprops">${t.props.map(p => html`<li class=${"hp-" + p.kind} key=${p.id}><span aria-label=${HUNT_KIND[p.kind][1]}>${HUNT_KIND[p.kind][0]}</span>${p.t || html`<i class="muted">${p.kind === "void" ? "Void" : "Not written yet"}</i>`}</li>`)}</ul>
    ${t.note && html`<p class="muted huntnote">${t.note}</p>`}
    ${t.merged && t.merged.length > 0 && html`<p class="muted huntnote">Merged with ${t.merged.join(", ")}</p>`}
    <footer class="row"><button class=${"btn small" + (t.belted ? "" : " primary")} onClick=${onBelt}>${t.belted ? "Take off the belt" : "Put on the belt"}</button>
      <button class="btn small" onClick=${onEdit}>Edit</button><button class="iconbtn" aria-label=${`Throw away ${t.n || "this trophy"}`} onClick=${onRemove}>×</button></footer>
  </article>`;
}

// Name a trophy, write its properties, give it a picture.
function TrophyForm({ init, onSave, onCancel, title = "The trophy", fixedKinds = false }) {
  const [f, setF] = useState(() => Object.assign({ n: "", monster: "", part: "other", lvl: 1, note: "", img: "", imgData: "" }, init, { props: (init.props || []).map(p => Object.assign({ id: rid() }, p)) }));
  const [busy, setBusy] = useState(false);
  const set = p => setF(Object.assign({}, f, p));
  const setP = (i, p) => set({ props: f.props.map((x, j) => j === i ? Object.assign({}, x, p) : x) });
  const pic = async e => { const file = e.target.files && e.target.files[0]; if (!file) return; setBusy(true);
    try { if (Store.assets && Store.assets.upload) { const r = await Store.assets.upload(file, f.img); set({ img: r.id, imgData: "" }); } else set({ img: "", imgData: await shrinkImage(file, 240) }); }
    catch (err) { toast("That picture couldn't be used."); } setBusy(false); };
  const id = k => "tf-" + k;
  return html`<form class="trophyform" onSubmit=${e => { e.preventDefault(); onSave(Object.assign({}, f, { n: f.n.trim(), monster: f.monster.trim(), note: f.note.trim(), props: f.props.map(p => Object.assign({}, p, { t: (p.t || "").trim() })) })); }}>
    <div class="trophyformtop"><label class="huntpic">${huntSrc(f) ? html`<img src=${huntSrc(f)} alt="" />` : html`<${HuntGlyph} part=${f.part} />`}
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
  return html`<section class="frame"><h2 class="h"><span>Ledger</span><i class="orn" aria-hidden="true"></i></h2>
    ${L.length === 0 ? html`<p class="muted">No hunts yet.</p>` : html`<div class="ptledger">${L.map((e, i) => html`<div class="pled" key=${e.id}>
      <div class="row" style="justify-content:space-between;flex-wrap:nowrap"><b>${e.name}</b><button class="iconbtn" aria-label="Remove this entry" onClick=${() => update(x => { x.craft.hunt.ledger.splice(i, 1); })}>×</button></div>
      <span class="muted">${new Date(e.t).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}${e.rolls && e.rolls.length ? " · " + e.rolls.join(" · ") : ""}</span></div>`)}</div>`}</section>`;
}

/* ---------------- Carving ---------------- */
function HuntCarve({ c, st, update, log, toCase }) {
  const [part, setPart] = useState("horn"), [monster, setMonster] = useState(""), [lvl, setLvl] = useState(1);
  const [run, setRunState] = useState(null), runRef = useRef(null), timers = useRef([]);
  const setRun = r => { runRef.current = r; setRunState(r); };
  const patch = p => { const r = runRef.current; if (r) setRun(Object.assign({}, r, typeof p === "function" ? p(r) : p)); };
  const wait = ms => new Promise(res => timers.current.push(setTimeout(res, reduceMotion() ? Math.min(ms, 60) : ms)));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const P = HUNT_PARTS.find(p => p.k === part) || HUNT_PARTS[0];
  const block = !st.salvage ? `Carving trophies needs Hunting 4. ${c.name || "This character"} has ${st.lvl}.` : "";
  const busy = !!run && !run.done;
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
  return html`<${HuntFrag}>
    <section class="frame huntcarvef">
      <h2 class="h"><span>Carving</span><i class="orn" aria-hidden="true"></i></h2>
      <p class="sub">Choose the part to cut, ask the GM the trophy's level, and carve. One Hunting check against the Salvaging Roll table decides the trophy.</p>
      <div class="ptgrid">
        <div class="ptstage">
          <${HuntCarcass} part=${run ? run.part : part} run=${run} onPick=${k => !busy && setPart(k)} />
          <div class="ptforge">
            ${!run ? html`<button class="btn primary big forgebtn" key="go" disabled=${!!block} onClick=${carve}>${KNIFE}Carve the ${P.n.toLowerCase()}</button>${block && html`<p class="muted ptwhy">${block}</p>`}`
              : html`<div class="huntread" key="read" aria-live="polite">
                <p><b>${run.phase === "cut" ? "Cutting…" : run.phase === "fail" ? "The trophy is ruined." : run.plan ? `${run.r} − ${st.mod} = ${run.total}` : ""}</b>
                  ${run.plan && !run.plan.fail && html` · ${run.plan.neg === run.plan.n ? "all negative" : run.plan.pos ? `${run.plan.pos} positive${run.plan.capped ? " (a trophy can't be all positive)" : ""}` : `${run.plan.neg} negative`}${run.plan.rest ? `, ${run.plan.rest} to roll` : ""}`}</p>
                <div class="hkinds">${Array.from({ length: 2 * run.lvl }, (_, i) => html`<span key=${i} class=${"hk " + (sum[i] ? "hp-" + sum[i] : "wait")}>${sum[i] ? HUNT_KIND[sum[i]][0] : ""}</span>`)}</div>
                ${run.phase === "fail" && html`<button class="btn small" onClick=${() => setRun(null)}>Done</button>`}
              </div>`}
          </div>
        </div>
        <div class="ptside">
          ${run && run.phase === "name" ? html`<${TrophyForm} key="name" title="Name your trophy" fixedKinds=${true}
              init=${{ n: run.monster ? `${run.monster}'s ${P.n}` : "", monster: run.monster, part: run.part, lvl: run.lvl, props: run.kinds.map(k => ({ kind: k, t: "" })), note: "" }}
              onSave=${keep} onCancel=${null} />`
            : html`<div class="ptpick" key="pick"><h3 class="ptpickh"><span>The kill</span></h3>
              <div class="mini"><label for="hc-m">Monster</label><input id="hc-m" value=${monster} disabled=${busy} placeholder="e.g. Chimera" onInput=${e => setMonster(e.target.value)} /></div>
              <h3 class="lbl">Part</h3>
              <div class="hparts">${HUNT_PARTS.map(p => html`<button type="button" class=${"dvchip" + (part === p.k ? " on" : "")} aria-pressed=${part === p.k} disabled=${busy} onClick=${() => setPart(p.k)}><${HuntGlyph} part=${p.k} />${p.n}</button>`)}</div>
              <h3 class="lbl">Trophy level (the GM's)</h3>
              <div class="seg huntlvl" role="group" aria-label="Trophy level">${[1, 2, 3, 4, 5].map(l => html`<button type="button" aria-pressed=${lvl === l} disabled=${busy} onClick=${() => setLvl(l)}>${l}</button>`)}</div>
              <p class="muted">${2 * lvl} properties.${st.maxLvl && lvl > st.maxLvl ? ` You can carve it, but you can only use trophies up to level ${st.maxLvl} for now.` : ""}</p>
              <p class="ptdc">Under 51 gives positive properties: the lower the roll, the more. 51 to 80 gives negative ones; 81 or more ruins the trophy.</p>
            </div>`}
        </div>
      </div>
    </section>
    <${HuntLedger} c=${c} update=${update} />
  </${HuntFrag}>`;
}
const KNIFE = html`<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 17 12.5 7.5 15 5c1.5-1.5 2.5-1 2.5-1s.5 1-1 2.5L14 9 4.5 18.5Z M10.5 9.5l2 2" /></svg>`;

// A slain horned beast lying on its side, with a dashed cut line on every part you can carve.
function HuntCarcass({ part, run, onPick }) {
  const P = HUNT_PARTS.find(p => p.k === part) || HUNT_PARTS[0], phase = run ? run.phase : "";
  return html`<div class=${"huntcarcass ph-" + (phase || "idle")}>
    <svg viewBox="0 0 600 320" role="group" aria-label="The slain monster: choose a part to carve">
      <defs>
        <linearGradient id="hc-fur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d4a3c" /><stop offset=".55" stop-color="#3f3128" /><stop offset="1" stop-color="#241b16" /></linearGradient>
        <linearGradient id="hc-horn" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#8a7a63" /><stop offset="1" stop-color="#e6dcc4" /></linearGradient>
        <radialGradient id="hc-pool" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#5a0f12" stop-opacity=".75" /><stop offset="1" stop-color="#5a0f12" stop-opacity="0" /></radialGradient>
        <radialGradient id="hc-trophy"><stop offset="0" stop-color="#fff2c4" stop-opacity=".95" /><stop offset=".5" stop-color="#e8b04a" stop-opacity=".55" /><stop offset="1" stop-color="#e8b04a" stop-opacity="0" /></radialGradient>
      </defs>
      <ellipse cx="310" cy="282" rx="270" ry="22" class="hcground" />
      <ellipse cx="150" cy="232" rx="110" ry="16" fill="url(#hc-pool)" />
      <g class="hcbody">
        <path class="hcfur far" d="M244 214 C226 230 206 246 186 256 L172 266 C166 272 174 278 182 274 L200 262 C222 254 244 242 258 232 Z" />
        <path class="hcfur far" d="M410 226 C420 246 424 262 420 278 L418 288 C418 294 428 294 430 288 L434 270 C438 252 434 234 426 222 Z" />
        <path class="hcfur" d="M488 166 C512 158 540 166 558 186 C570 198 574 214 566 222 C560 212 548 198 534 190 C520 184 504 184 494 190 Z" />
        <path class="hcfur" d="M190 146 C210 134 232 130 252 134 C300 120 364 116 422 124 C462 130 492 148 498 176 C502 200 492 222 468 232 C422 246 342 248 282 242 C252 240 230 230 214 214 C202 202 198 184 190 146 Z" />
        <path class="hcbelly" d="M262 232 C300 240 380 242 444 232 C430 220 400 214 360 214 C320 214 284 220 262 232 Z" />
        <path class="hcspine" d="M262 130 l7 -15 l6 13 M292 123 l8 -16 l7 14 M324 119 l8 -17 l8 15 M358 118 l8 -16 l8 15 M392 120 l7 -14 l7 13 M424 126 l6 -12 l6 11" />
        <path class="hcfur" d="M262 224 C246 246 226 262 204 274 L190 282 C184 288 194 294 204 288 L222 278 C246 266 266 252 280 238 Z" />
        <path class="hcfur" d="M432 214 C452 228 466 248 472 266 L476 280 C478 290 492 290 490 280 L486 262 C482 240 470 220 456 206 Z" />
        <path class="hcfur head" d="M196 148 C180 132 156 128 136 134 C116 140 96 150 78 158 C66 163 56 170 58 178 C60 184 70 186 84 186 L120 188 C106 196 88 200 76 204 C74 210 82 214 94 214 C120 216 150 218 176 214 C198 210 212 196 208 178 C206 166 204 156 196 148 Z" />
        <path class="hcmouth" d="M84 186 L120 188 C106 196 88 200 76 204 C77 196 80 190 84 186 Z" />
        <path class="hcfang" d="M90 186 L94 197 L98 187 Z M104 187 L107 195 L110 188 Z M86 203 L90 194 L93 202 Z" />
        <ellipse class="hcnose" cx="61" cy="174" rx="5" ry="3.6" />
        <path class="hcfur" d="M178 140 C184 122 192 110 206 104 C202 118 200 130 194 144 Z" />
        <path fill="url(#hc-horn)" class="hchorn" d="M148 136 C138 112 146 86 172 70 C164 90 164 112 176 131 Z" />
        <path class="hchornring" d="M150 124 C156 122 162 122 168 124 M146 112 C153 108 160 108 166 110 M148 98 C154 94 160 92 166 94" />
        <path class="hceye" d="M128 157 Q138 152 148 158" />
        <path class="hcmane" d="M200 150 C214 140 232 138 250 142 M204 168 C220 156 240 152 258 156 M206 186 C222 174 242 170 260 174 M300 138 C330 130 370 128 408 134" />
        <path class="hcrib" d="M318 160 C322 186 322 206 316 226 M346 158 C350 186 350 208 346 230 M374 160 C378 186 378 208 374 230" />
        <path class="hcclaw" d="M190 284 l-8 4 M194 288 l-6 7 M200 290 l-2 8 M474 284 l1 8 M480 285 l4 7 M486 284 l6 5" />
        <g class="hcarrow"><path d="M370 152 L336 112" /><path class="fl" d="M336 112 l-8 -2 l4 6 Z M336 112 l-2 -8 l6 4 Z" /></g>
        <g class="hcarrow"><path d="M410 164 L398 122" /><path class="fl" d="M398 122 l-6 -4 l1 7 Z M398 122 l1 -8 l4 6 Z" /></g>
      </g>
      ${HUNT_PARTS.map(p => html`<g key=${p.k} class=${"hcpart" + (p.k === part ? " on" : "")} role="button" tabindex="0" aria-label=${`Carve the ${p.n.toLowerCase()}`}
          onClick=${() => onPick(p.k)} onKeyDown=${e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(p.k); } }}>
        <path class="hccut" d=${p.cut} /><circle class="hchit" cx=${p.at[0]} cy=${p.at[1]} r="22" />
        ${p.k === part && html`<text class="hclabel" x=${p.at[0]} y=${p.at[1] - 28}>${p.n}</text>`}</g>`)}
      ${run && html`<g key=${"run" + run.part} class="hcrun">
        <path class="hcslice" d=${P.cut} pathLength="100" />
        <g class="hcknife" style=${`offset-path: path("${P.cut}")`}><path d="M0 0 L18 -6 L22 -2 L4 4 Z M-14 6 L0 0 L4 4 L-10 10 Z" /></g>
        ${phase !== "cut" && phase !== "fail" && html`<g class="hcprize" transform=${`translate(${P.at[0]} ${P.at[1]})`}><circle r="40" fill="url(#hc-trophy)" /><g transform="scale(2)"><path class="hcprizeg" d=${HUNT_GLYPH[P.k]} /></g></g>`}
        ${phase === "fail" && html`<g class="hcdust" transform=${`translate(${P.at[0]} ${P.at[1]})`}>${Array.from({ length: 10 }, (_, k) => html`<circle r="2.4" style=${`--a:${k * 36}deg`} />`)}</g>`}
      </g>`}
    </svg></div>`;
}

/* ---------------- Merging ---------------- */
function HuntMerge({ c, st, update, log }) {
  const h = c.craft.hunt, [recv, setRecv] = useState(""), [give, setGive] = useState(""), [cost, setCost] = useState("");
  const [run, setRunState] = useState(null), runRef = useRef(null), timers = useRef([]);
  const setRun = r => { runRef.current = r; setRunState(r); };
  const patch = p => { const r = runRef.current; if (r) setRun(Object.assign({}, r, typeof p === "function" ? p(r) : p)); };
  const wait = ms => new Promise(res => timers.current.push(setTimeout(res, reduceMotion() ? Math.min(ms, 60) : ms)));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const R1 = h.trophies.find(t => t.id === recv), G1 = h.trophies.find(t => t.id === give);
  const gPos = G1 ? G1.props.filter(p => p.kind === "pos") : [];
  const busy = !!run && !run.done;
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
  const pickRow = (label, val, set, other) => html`<div class="mini"><label>${label}</label>
    <div class="hmergepick">${h.trophies.filter(t => t.id !== other).map(t => html`<button type="button" key=${t.id} class=${"hmchip" + (val === t.id ? " on" : "")} aria-pressed=${val === t.id} disabled=${busy} onClick=${() => set(t.id)}>
      <${HuntMedal} t=${t} size=${26} /><span>${t.n || "Unnamed"}</span><small>${t.props.filter(p => p.kind === "pos").length}+</small></button>`)}</div></div>`;
  return html`<${HuntFrag}>
    <section class="frame huntmergef">
      <h2 class="h"><span>Merging</span><i class="orn" aria-hidden="true"></i></h2>
      <p class="sub">The giver's positive properties pass to the receiver by the Combining Roll; the giver burns either way.${st.reroll ? " Once per giver you may ignore the roll and try again, at three times the cost." : ""}</p>
      <div class="ptgrid">
        <div class="ptstage">
          <${HuntAltar} recv=${run ? run.recv : R1} give=${run ? run.give : G1} run=${run} fresh=${fresh} />
          <div class="ptforge">
            ${!run ? html`<button class="btn primary big forgebtn" key="go" disabled=${!!block} onClick=${start}>${MERGE_ICON}Merge</button>${block && html`<p class="muted ptwhy">${block}</p>`}`
              : html`<div class="huntread" key="read" aria-live="polite">
                ${run.phase === "fuse" && html`<p><b>The trophies fuse…</b></p>`}
                ${run.phase === "read" && html`<div key="read2"><p><b>${last.r} − ${st.mod} = ${last.total}</b> · ${last.res.fail ? "nothing passes" : `${last.res.n} positive propert${last.res.n === 1 ? "y" : "ies"} can pass`}${!last.res.fail && last.res.n > nMove ? ` (the giver has ${nMove})` : ""}</p>
                  ${nMove > 0 && run.give.props.filter(p => p.kind === "pos").length > nMove && html`<div class="hmovepick">${run.give.props.filter(p => p.kind === "pos").map(p => html`<label class="demonguard" key=${p.id}>
                    <input type="checkbox" checked=${chosen.includes(p.id)} disabled=${!chosen.includes(p.id) && chosen.length >= nMove} onChange=${e => setChosen(e.target.checked ? [...chosen, p.id] : chosen.filter(i => i !== p.id))} /> ${p.t || "Positive property"}</label>`)}</div>`}
                  <div class="row">${st.reroll && !run.rerolled && html`<button class="btn small" onClick=${again}>Ignore it and roll again (cost ×3)</button>`}
                    <button class="btn small primary" onClick=${apply}>${nMove ? `Pass ${chosen.length} to ${run.recv.n || "the receiver"}` : "Burn the giver"}</button>
                    <button class="btn small" onClick=${() => setRun(null)}>Cancel</button></div></div>`}
                ${run.phase === "made" && html`<p key="made"><b>${run.moved ? `${run.moved} propert${run.moved === 1 ? "y" : "ies"} passed to ${run.recv.n || "the receiver"}.` : "Nothing passed; the giver is gone."}</b></p>`}
              </div>`}
          </div>
        </div>
        <div class="ptside">
          ${run && run.phase === "made" && fresh ? html`<div key="rename"><p class="muted">Give the merged trophy a new name or picture if you like.</p>
              <${TrophyForm} key=${"rn" + fresh.id} init=${fresh} onSave=${t => { update(x => { const i = x.craft.hunt.trophies.findIndex(y => y.id === t.id); if (i >= 0) x.craft.hunt.trophies[i] = Object.assign({}, x.craft.hunt.trophies[i], t); }); setRun(null); toast(`${t.n || "The trophy"} is saved.`); }}
                onCancel=${() => setRun(null)} /></div>`
            : html`<div class="ptpick" key="pick">
              ${h.trophies.length < 2 ? html`<p class="muted">You need two trophies to merge.</p>` : html`<${HuntFrag}>
                ${pickRow("Receiver: keeps its name and gains properties", recv, setRecv, give)}
                ${pickRow("Giver: burns, passing its positive properties", give, setGive, recv)}
                <div class="mini"><label for="hm-cost">Cost (the GM's)</label><input id="hm-cost" type="number" min="0" value=${cost} placeholder="e.g. 200" disabled=${busy} onInput=${e => setCost(e.target.value)} /></div>
                <p class="ptdc">Under 60 passes one positive property, and every 10 lower passes one more (under −30: nine). 80 or more passes nothing.</p></${HuntFrag}>`}
            </div>`}
        </div>
      </div>
    </section>
    <${HuntLedger} c=${c} update=${update} />
  </${HuntFrag}>`;
}
const MERGE_ICON = html`<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="7" cy="10" r="4.5" /><circle cx="13" cy="10" r="4.5" /></svg>`;

// A stone altar with a ring of carved notches: the receiver on the left, the giver on the right. Merging spins them
// together; the giver breaks into motes that pour into the receiver, which flares.
function HuntAltar({ recv, give, run, fresh }) {
  const phase = run ? run.phase : "", R0 = fresh || recv;
  const medal = (t, x, cls) => html`<g class=${"hamedal " + cls} style=${`--x:${x}px`}>${t ? html`<g transform=${`translate(${x} 130)`}>
      <circle r="44" class="harim" />${huntSrc(t) ? html`<image href=${huntSrc(t)} x="-40" y="-40" width="80" height="80" preserveAspectRatio="xMidYMid slice" clip-path="url(#ha-disc)" />`
        : html`<circle r="40" class="hadisc" /><g transform="scale(2.6)"><path class="hbglyph" d=${HUNT_GLYPH[t.part] || HUNT_GLYPH.other} /></g>`}
      <text y="66" class="hbname">${(t.n || "Trophy").slice(0, 20)}</text></g>`
    : html`<g transform=${`translate(${x} 130)`}><circle r="44" class="haempty" /><text y="5" class="haq">${cls === "recv" ? "Receiver" : "Giver"}</text></g>`}</g>`;
  return html`<div class=${"huntaltar ph-" + (phase || "idle")}>
    <svg viewBox="0 0 600 280" role="img" aria-label="The merging altar">
      <defs><clipPath id="ha-disc"><circle r="40" /></clipPath>
        <linearGradient id="ha-stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8d8a84" /><stop offset="1" stop-color="#4b4945" /></linearGradient>
        <radialGradient id="ha-flare"><stop offset="0" stop-color="#fff6d8" /><stop offset=".4" stop-color="#e8b04a" stop-opacity=".6" /><stop offset="1" stop-color="#e8b04a" stop-opacity="0" /></radialGradient></defs>
      <path d="M90 230 L510 230 L540 262 L60 262 Z" fill="url(#ha-stone)" class="haslab" />
      <ellipse cx="300" cy="140" rx="210" ry="100" class="haring" />
      <ellipse cx="300" cy="140" rx="190" ry="88" class="haring thin" />
      ${Array.from({ length: 24 }, (_, i) => { const a = i / 24 * Math.PI * 2; return html`<path class="hanotch" d=${`M${300 + Math.cos(a) * 196} ${140 + Math.sin(a) * 92}l${Math.cos(a) * 10} ${Math.sin(a) * 5}`} />`; })}
      <path class="hastream" d="M420 130 C380 90 340 92 300 110 C260 128 220 132 180 130" />
      ${medal(R0, 180, "recv")}${phase !== "made" && medal(give, 420, "give")}
      ${(phase === "fuse" || phase === "made") && html`<g class="hamotes" key=${"m" + (run ? run.rolls.length : 0)}>${Array.from({ length: 16 }, (_, i) => html`<circle r=${1.6 + (i % 3)} style=${`--i:${i}`} />`)}</g>`}
      ${phase === "made" && html`<circle class="haflare" cx="180" cy="130" r="80" fill="url(#ha-flare)" />`}
    </svg></div>`;
}
