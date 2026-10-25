/* ================= Magic tab =================
   One section per school of magic, shown only once the character has points in it (like Crafting).
   Warding is the first: a dictionary of Words of Power (Words), a board where those words float and are linked into a
   Ward sentence that draws its own sigil (Inscribe), and the warder's saved and formulaic wards (Wards).
   The rules (costs, grammar, Sigils per AP, Fatigue, the Active perks) live in rules.js: wardState, wardCost, … */
const MAGIC = [
  ["ward", "Warding", "Warding", "Sentences of Words of Power, inscribed as Sigils."],
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
  </div>`;
}

/* ---------- Warding ---------- */
const WARD_PAGES = [["words", "Words"], ["inscribe", "Inscribe"], ["wards", "Wards"]];
// A small glyph for each kind of word: the same marks are drawn on the chips and on the sigil.
const WARD_GLYPH = {
  subject: "M0 -6a6 6 0 1 0 0.01 0z",
  verb: "M0 -7L6.5 5H-6.5z",
  noun: "M-5.5 -5.5h11v11h-11z",
  adjective: "M0 -7L7 0L0 7L-7 0z",
  adverb: "M0 -3a3 3 0 1 0 0.01 0z",
  conj: "M0 -7a7 7 0 1 0 0.01 0z M0 -3.5a3.5 3.5 0 1 0 0.01 0z",
};
const wardText = tokens => tokens.map(t => t.text).join(" ");
// A steady pseudo-random number from a string, so each word floats in its own place every time.
const wardSeed = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return ((h >>> 0) % 10000) / 10000; };

function Warding({ c, update }) {
  const st = R.wardState(c), w = c.ward;
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
      ${st.lvl < 8 && st.formulaic ? html`<p class="muted wardnote">${st.lvl < 8 ? "Warding is used out of combat at this level; from Warding 8 you can inscribe as a reaction." : ""}</p>` : ""}
    </section>
    <div class="seg wardpages" role="tablist" aria-label="Warding">${WARD_PAGES.map(([k, n]) => html`<button role="tab" aria-selected=${page === k} aria-pressed=${page === k} onClick=${() => setPage(k)}>${n}</button>`)}</div>
    ${page === "words" && html`<${WardWords} c=${c} st=${st} update=${update} />`}
    ${page === "inscribe" && html`<${WardBoard} c=${c} st=${st} update=${update} />`}
    ${page === "wards" && html`<${WardList} c=${c} st=${st} update=${update} toBoard=${() => setPage("inscribe")} />`}`;
}

/* ---------- Words: the warder's dictionary ---------- */
function WardWords({ c, st, update }) {
  const w = c.ward, [adding, setAdding] = useState(false), [editId, setEditId] = useState("");
  const [extra, setExtra] = useState({ subject: "", adverb: "", conj: "" });
  const list = [...w.words].sort((a, b) => a.w.localeCompare(b.w));
  const addExtra = k => { const t = extra[k].trim(); if (!t) return;
    if ([...R.WARD_GRAMMAR[k].words, ...w.extra[k]].some(x => x.toLowerCase() === t.toLowerCase())) { toast(`"${t}" is already there.`); return; }
    update(x => { x.ward.extra[k].push(t); }); setExtra(Object.assign({}, extra, { [k]: "" })); };
  return html`<section class="frame wardbook">
    <h2 class="h"><span>Words</span><i class="orn" aria-hidden="true"></i></h2>
    <p class="sub">Your dictionary. Adjectives, verbs and nouns are Words of Power: each is your own understanding of a concept, with its own Sigil cost. You learn them by Research or Blueprinting, and the cost comes down as you study them. They can't be learned from another warder.</p>
    ${!st.spontaneous && html`<p class="ptlocked">Words of Power go into Spontaneous Wards from Warding 5 (Works of a Writer). You can fill the dictionary now.</p>`}
    <div class="wardpagesbook">
      <div class="wardleaf">
        <h3 class="wardleafh">Words of Power</h3>
        ${!w.words.length && html`<p class="muted">No words yet. Learn your first one below: Fire, Ward, Ignite, Cold…</p>`}
        ${list.length > 0 && html`<div class="wardgroup"><p class="wardkey">${R.WORD_KINDS.map(k => html`<span class=${"k-" + k}><svg viewBox="-8 -8 16 16" aria-hidden="true"><path d=${WARD_GLYPH[k]} /></svg>${R.WARD_KIND_NAME[k]}</span>`)}</p>
          ${list.map(x => editId === x.id ? html`<${WordForm} key=${x.id} init=${x} onCancel=${() => setEditId("")} onSave=${v => { update(y => { const i = y.ward.words.findIndex(z => z.id === x.id); if (i >= 0) y.ward.words[i] = Object.assign({}, y.ward.words[i], v); }); setEditId(""); }} words=${w.words} />`
            : html`<div class="wardentry"><div><b>${x.w}<span class="wardmarks" title=${(x.kinds || []).map(k2 => R.WARD_KIND_NAME[k2]).join(" / ")}>${(x.kinds || []).map(k2 => html`<svg class=${"k-" + k2} viewBox="-8 -8 16 16" aria-label=${R.WARD_KIND_NAME[k2]}><path d=${WARD_GLYPH[k2]} /></svg>`)}</span></b>
                <span class="wardcost">${num(x.cost)} Sigils · ${(x.kinds || []).map(k2 => R.WARD_KIND_NAME[k2].toLowerCase()).join(" / ")}</span>
                ${x.alts && html`<small>Also: ${x.alts}</small>`}${x.note && html`<small class="muted">${x.note}</small>`}</div>
              <span class="row"><button class="iconbtn" aria-label=${`Edit ${x.w}`} title="Edit (lower the cost as you study it)" onClick=${() => setEditId(x.id)}>${PENCIL}</button>
                <button class="iconbtn" aria-label=${`Forget ${x.w}`} title="Remove from the dictionary" onClick=${() => update(y => { y.ward.words = y.ward.words.filter(z => z.id !== x.id); })}>×</button></span></div>`)}</div>`}
        <div class="ptaddbox">${!adding ? html`<button class="btn small ptaddown" onClick=${() => setAdding(true)}>+ Learn a word</button>`
          : html`<${WordForm} words=${w.words} onCancel=${() => setAdding(false)} onSave=${v => { update(y => { y.ward.words.push(Object.assign({ id: "w" + rid() }, v)); }); setAdding(false); toast(`${v.w} is in your dictionary.`); }} />`}</div>
      </div>
      <div class="wardleaf">
        <h3 class="wardleafh">Grammar</h3>
        <p class="muted">Common words with fixed costs.${st.lvl >= 9 ? " Shade of Erebus: Subjects and Adverbs cost less." : ""}</p>
        ${["subject", "adverb", "conj"].map(k => { const G = R.WARD_GRAMMAR[k], cost = k === "subject" ? st.subjectCost : k === "adverb" ? st.adverbCost : G.cost;
          return html`<div class="wardgroup"><h4><svg viewBox="-8 -8 16 16" aria-hidden="true"><path d=${WARD_GLYPH[k]} /></svg>${G.n}s · ${cost} Sigil${cost === 1 ? "" : "s"} each${k === "conj" && !st.conj ? " · Warding 7" : ""}</h4>
            <div class="wardchips">${G.words.map(t => html`<span class="wardtag">${t}</span>`)}
              ${w.extra[k].map(t => html`<span class="wardtag own">${t}<button class="iconbtn" aria-label=${`Remove ${t}`} onClick=${() => update(y => { y.ward.extra[k] = y.ward.extra[k].filter(z => z !== t); })}>×</button></span>`)}</div>
            <form class="row wardaddx" onSubmit=${e => { e.preventDefault(); addExtra(k); }}>
              <input class="inp" aria-label=${`Add a ${G.n.toLowerCase()}`} maxlength="30" placeholder=${k === "subject" ? "the wolves" : k === "adverb" ? "at" : "unless"} value=${extra[k]} onInput=${e => setExtra(Object.assign({}, extra, { [k]: e.target.value }))} />
              <button class="btn small" type="submit" disabled=${!extra[k].trim()}>Add</button></form></div>`; })}
      </div>
    </div>
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

/* ---------- Inscribe: the words float; picked in order, they link into the Ward's sigil ---------- */
function WardBoard({ c, st, update }) {
  const w = c.ward, tokens = w.board || [];
  const [o, setO] = useState({ double: false, calm: false, epic: false, ritual: false });
  const [name, setName] = useState(""), [cast, setCast] = useState(null);
  const res = R.wardCost(c, tokens, o.epic && !o.ritual);
  const next = R.wardNext(tokens);
  const plan = R.wardPlan(c, res.total, o);
  const setBoard = fn => update(x => { x.ward.board = fn(x.ward.board || []); });
  // Every word on the board: the grammar words and the dictionary. A word that is both a noun and a verb (Fire,
  // Ignite) takes whichever role fits next.
  const pool = [
    ...["subject", "adverb", "conj"].flatMap(k => (k === "conj" && !st.conj ? [] : [...R.WARD_GRAMMAR[k].words, ...w.extra[k]].map(t => ({ key: k + ":" + t, kinds: [k], text: t })))),
    ...(st.spontaneous ? w.words.map(x => ({ key: "w:" + x.id, kinds: x.kinds || [], text: x.w, id: x.id, cost: num(x.cost) })) : []),
  ];
  const fit = p => p.kinds.find(k => next.includes(k));
  // The field is a grid of cells, one per word, handed out in a steady shuffled order.
  const cols = Math.max(3, Math.ceil(Math.sqrt(pool.length * 1.4))), rows = Math.max(3, Math.ceil(pool.length / cols));
  const cells = useMemo(() => Array.from({ length: cols * rows }, (_, j) => j).sort((a, b) => wardSeed("c" + a) - wardSeed("c" + b)), [cols, rows]);
  const pick = p => { const k = fit(p); if (!k) return; setBoard(b => [...b, { k, text: p.text, id: p.id }]); };
  const saved = w.wards.find(x => x.kind === "spontaneous" && wardText(x.tokens) === wardText(tokens));
  const save = () => { const n = name.trim(); if (!n || !res.ok) return;
    update(x => { const i = x.ward.wards.findIndex(y => y.n.toLowerCase() === n.toLowerCase());
      const it = { id: i >= 0 ? x.ward.wards[i].id : "d" + rid(), n, kind: "spontaneous", tokens: clean(tokens), intent: i >= 0 ? x.ward.wards[i].intent || "" : "" };
      if (i >= 0) x.ward.wards[i] = it; else x.ward.wards.push(it); });
    toast(`Saved "${n}" under Wards.`); setName(""); };
  if (!st.formulaic) return html`<section class="frame"><p class="ptlocked">Warding 3 (The Mightier Pen) lets you inscribe Formulaic Wards; Warding 5 adds Spontaneous Wards built from your Words of Power.</p></section>`;
  if (!st.spontaneous) return html`<section class="frame"><h2 class="h"><span>Inscribe</span><i class="orn" aria-hidden="true"></i></h2>
    <p class="ptlocked">Building your own Wards from Words of Power comes at Warding 5 (Works of a Writer). Until then, inscribe Formulaic Wards from the Wards page.</p></section>`;
  if (cast) return html`<${WardCast} c=${c} st=${st} update=${update} cast=${cast} onClose=${() => setCast(null)} />`;
  return html`<section class="frame wardboardf">
    <h2 class="h"><span>Inscribe</span><i class="orn" aria-hidden="true"></i></h2>
    <p class="sub">Pick the words in order. Only the words that can come next are lit; each one you pick is linked into the sigil.</p>
    <div class="wardstage">
      <div class="wardfloat" role="group" aria-label="Words">
        ${pool.map((p, i) => { const k = fit(p), r = wardSeed(p.key), r2 = wardSeed(p.key + "~");
          // Each word gets its own cell of the field (in a shuffled order) and drifts a little inside it, so none cover another.
          const cell = cells[i], cx = (cell % cols + .05 + r * .14) / cols, cy = (Math.floor(cell / cols) + .14 + r2 * .36) / rows;
          return html`<button type="button" class=${"wardword k-" + (k || p.kinds[0]) + (k ? "" : " off")} disabled=${!k} key=${p.key}
            style=${`--x:${(cx * 100).toFixed(1)}%;--y:${(cy * 100).toFixed(1)}%;--dx:${((r - .5) * 18).toFixed(0)}px;--dy:${((r2 - .5) * 14).toFixed(0)}px;--t:${(7 + r * 6).toFixed(1)}s;--d:${(-r2 * 6).toFixed(1)}s`}
            title=${k ? `${R.WARD_KIND_NAME[k]}${p.id ? ` · ${p.cost} Sigils` : ""}` : `Can't come next (${p.kinds.map(x => R.WARD_KIND_NAME[x].toLowerCase()).join(" / ")})`} onClick=${() => pick(p)}>
            <svg viewBox="-8 -8 16 16" aria-hidden="true"><path d=${WARD_GLYPH[k || p.kinds[0]]} /></svg>${p.text}</button>`; })}
        ${!w.words.length && html`<p class="muted wardempty">Your dictionary is empty. Learn some Words of Power on the Words page.</p>`}
      </div>
      <${WardSigil} tokens=${tokens} ok=${res.ok} />
    </div>
    <div class="wardsentence" aria-live="polite">
      ${tokens.length ? res.lines.map(l => html`<span class=${"wardtok k-" + l.t.k + (l.epic ? " epic" : "")} title=${R.WARD_KIND_NAME[l.t.k]}><b>${l.t.text}</b><small>${l.epic ? html`<s>${l.base}</s> 1` : l.cost}</small></span>`)
        : html`<span class="muted">Start with a Subject: I, The Ward…</span>`}
      <span class="wardtotal"><b>${res.total}</b> Sigils</span>
      <span class="row"><button class="btn small" disabled=${!tokens.length} onClick=${() => setBoard(b => b.slice(0, -1))}>Undo</button>
        <button class="btn small" disabled=${!tokens.length} onClick=${() => setBoard(() => [])}>Clear</button></span>
    </div>
    ${res.problems.length > 0 && tokens.length > 0 && html`<ul class="wardproblems">${res.problems.map(p => html`<li>${p}</li>`)}</ul>`}
    <${WardOptions} st=${st} o=${o} setO=${setO} wop=${tokens.some(t => R.WORD_KINDS.includes(t.k))} />
    <${WardCostBox} st=${st} plan=${plan} total=${res.total} o=${o} />
    <div class="row wardactions">
      <button class="btn primary" disabled=${!res.ok} onClick=${() => setCast({ name: saved ? saved.n : wardText(tokens), sentence: wardText(tokens), cost: res.total, o: Object.assign({}, o, { epic: o.epic && res.epicUsed > 0 }) })}>Inscribe</button>
      <form class="row wardsave" onSubmit=${e => { e.preventDefault(); save(); }}>
        <input class="inp" aria-label="Name this ward" maxlength="50" placeholder=${saved ? `Saved as ${saved.n}` : "Name it to save it"} value=${name} onInput=${e => setName(e.target.value)} />
        <button class="btn" type="submit" disabled=${!res.ok || !name.trim()}>${w.wards.some(x => x.n.toLowerCase() === name.trim().toLowerCase()) ? "Update ward" : "Save ward"}</button></form>
    </div>
  </section>`;
}
// The sigil: each word is a mark on a ring, linked to the one before it; a finished Ward closes the figure.
function WardSigil({ tokens, ok }) {
  const n = tokens.length, R0 = 74;
  const pts = tokens.map((t, i) => { const a = -Math.PI / 2 + (n ? (i / Math.max(n, 3)) * Math.PI * 2 : 0), r = t.k === "adverb" ? R0 * .62 : t.k === "conj" ? R0 * .4 : R0;
    return [Math.cos(a) * r, Math.sin(a) * r]; });
  const path = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  return html`<svg class=${"wardsigil" + (ok ? " ok" : "")} viewBox="-100 -100 200 200" role="img" aria-label=${n ? `Sigil of ${n} word${n === 1 ? "" : "s"}${ok ? ", complete" : ""}` : "Empty sigil"}>
    <circle class="ring" r="92" /><circle class="ring thin" r="84" />
    ${Array.from({ length: 24 }, (_, i) => { const a = i * Math.PI / 12; return html`<line class="tick" x1=${Math.cos(a) * 84} y1=${Math.sin(a) * 84} x2=${Math.cos(a) * (i % 2 ? 88 : 92)} y2=${Math.sin(a) * (i % 2 ? 88 : 92)} />`; })}
    ${ok && n > 3 && html`<path class="star" d=${pts.map((_, i) => { const a = pts[i], b = pts[(i + 2) % n]; return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`; }).join("")} key=${"s" + n} />`}
    ${n > 1 && html`<path class="link" d=${path + (ok && n > 2 ? " Z" : "")} key=${"p" + n} />`}
    ${pts.map((p, i) => html`<g class=${"mark k-" + tokens[i].k} transform=${`translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`} key=${i}><path d=${WARD_GLYPH[tokens[i].k]} /></g>`)}
    ${ok && html`<circle class="core" r="10" />`}
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

/* ---------- inscribing: the check, then the Fatigue the GM sets ---------- */
function WardCast({ c, st, update, cast, onClose }) {
  const [roll, setRoll] = useState(null), [gain, setGain] = useState(cast.fatigue == null ? "" : String(cast.fatigue)), [done, setDone] = useState(null);
  const plan = R.wardPlan(c, cast.cost, cast.o);
  const go = async () => { const r = await askRoll({ title: `Warding check: ${cast.name}`, dice: [{ n: 1, sides: 100 }], cancel: true, note: `d100 − ${st.mod}. The GM sets the DC; lower is better. A vague Ward can still go astray on a high roll.` });
    if (r) setRoll(r[0]); };
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
      x.ward.ledger = [{ id: rid(), t: Date.now(), n: cast.name, s: cast.sentence, sigils: cast.cost, how: what, roll: `${roll} − ${st.mod} = ${roll - st.mod}`, fatigue: f }, ...(x.ward.ledger || [])].slice(0, 20);
      addLog(x, `Warding: inscribed ${cast.name} (${cast.cost} Sigils, ${what}; check ${roll} − ${st.mod} = ${roll - st.mod}; Fatigue +${f} → ${was + f})`);
    });
    setDone(f);
  };
  return html`<section class="frame wardcast">
    <h2 class="h"><span>Inscribing</span><i class="orn" aria-hidden="true"></i></h2>
    <p class="wardcastname"><b>${cast.name}</b>${cast.sentence !== cast.name ? html`<span class="muted">“${cast.sentence}”</span>` : ""}</p>
    <div class="facts">${[["Sigils", cast.cost], cast.o.ritual ? ["Takes", `${plan.hours} hour${plan.hours === 1 ? "" : "s"}`] : ["AP", `${plan.ap}`],
      ["With", [cast.o.ritual && "Ritual", cast.o.double && !cast.o.ritual && "2× Sigils", cast.o.calm && !cast.o.ritual && "no Fatigue", cast.o.epic && !cast.o.ritual && "The First Epic"].filter(Boolean).join(", ") || "nothing extra"]]
      .map(([k, v]) => html`<div class="fact"><span>${k}</span><b>${v}</b></div>`)}</div>
    ${roll == null ? html`<div class="row"><button class="btn primary" onClick=${go}>Roll the Warding check</button><button class="btn" onClick=${onClose}>Back</button></div>`
      : done == null ? html`<div class="ptdice ok wardroll"><span class="d100">${roll}</span><span class="ptmath">${roll} − ${st.mod} = <b>${roll - st.mod}</b> · the GM says whether it holds</span></div>
        <form class="row wardgain" onSubmit=${e => { e.preventDefault(); finish(); }}>
          <div class="mini"><label for="ward-gain">Fatigue gained (the GM decides)</label><input id="ward-gain" type="number" min="0" placeholder="0" value=${gain} onInput=${e => setGain(e.target.value)} /></div>
          <span class="muted">${cast.o.calm && !cast.o.ritual ? "No Fatigue: this inscription gains none." : cast.o.ritual ? "As a Ritual: under 10 becomes 1, 10 or more is halved." : cast.o.double ? "2× Sigils: it counts double." : ""}${num(gain) ? ` You gain ${R.wardFatigue(gain, cast.o)}.` : ""}</span>
          <button class="btn primary" type="submit">Done</button></form>`
      : html`<p class="ptsavedok">Inscribed. Fatigue +${done}, now ${st.fatigue}. It's in the Ledger on the Wards page.</p><button class="btn primary" onClick=${onClose}>Back to the board</button>`}
  </section>`;
}

/* ---------- Wards: saved Spontaneous Wards and learned Formulaic Wards ---------- */
function WardList({ c, st, update, toBoard }) {
  const w = c.ward, [adding, setAdding] = useState(false), [cast, setCast] = useState(null), [o, setO] = useState({ double: false, calm: false, epic: false, ritual: false });
  const spont = w.wards.filter(x => x.kind === "spontaneous"), form = w.wards.filter(x => x.kind === "formulaic");
  const del = id => update(x => { x.ward.wards = x.ward.wards.filter(y => y.id !== id); });
  if (cast) return html`<${WardCast} c=${c} st=${st} update=${update} cast=${cast} onClose=${() => setCast(null)} />`;
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
    ${form.length > 0 && html`<${WardOptions} st=${st} o=${o} setO=${setO} fixed=${true} />`}
    <div class="cards">${form.map(x => { const plan = R.wardPlan(c, x.cost, Object.assign({}, o, { ritual: o.ritual || x.ritual }));
      return html`<div class="wcard wardcard"><div class="title"><b class="wname">${x.n}</b><span class="flag brass">${num(x.cost)} Sigils</span>${x.ritual && html`<span class="flag">Ritual</span>`}</div>
        <p>${x.effect || html`<span class="muted">No effect written.</span>`}</p>
        <p class="muted">${[x.time && `Casting time: ${x.time}`, x.fatigueNote && `Fatigue: ${x.fatigueNote}`, x.materials && `Materials: ${x.materials}`].filter(Boolean).join(" · ") || ""}</p>
        <p class="muted">${o.ritual || x.ritual ? `About ${plan.hours} hour${plan.hours === 1 ? "" : "s"} as a Ritual` : `${plan.ap} AP at ${plan.spa} Sigils per AP`}</p>
        <div class="row"><button class="btn small primary" disabled=${!st.formulaic || (x.ritual && !st.ritual)} onClick=${() => setCast({ name: x.n, sentence: x.n, cost: num(x.cost), o: Object.assign({}, o, { ritual: o.ritual || !!x.ritual, epic: false }) })}>Inscribe</button>
          <button class="btn small danger" onClick=${() => del(x.id)}>Delete</button></div></div>`; })}</div>
    <div class="ptaddbox">${!adding ? html`<button class="btn small ptaddown" onClick=${() => setAdding(true)}>+ A Formulaic Ward</button>`
      : html`<${FormulaForm} onCancel=${() => setAdding(false)} onSave=${v => { update(y => { y.ward.wards.push(Object.assign({ id: "d" + rid(), kind: "formulaic" }, v)); }); setAdding(false); }} />`}</div>
    ${(w.ledger || []).length > 0 && html`<h3 class="lbl wardsubh">Ledger</h3><div class="ptledger">${w.ledger.map((e, i) => html`<div class="pled">
      <div class="row" style="justify-content:space-between;flex-wrap:nowrap"><b>${e.n}</b><button class="iconbtn" aria-label="Remove this entry" onClick=${() => update(y => { y.ward.ledger.splice(i, 1); })}>×</button></div>
      <small class="muted">${new Date(e.t).toLocaleString()} · ${e.sigils} Sigils · ${e.how} · check ${e.roll} · Fatigue +${e.fatigue}</small></div>`)}</div>`}
  </section>`;
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
