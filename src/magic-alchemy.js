/* ================= Magic → Alchemy =================
   The circle book and the workbench. A circle is built from precise layers (rings, regular polygons, star polygons,
   spokes, a ring of alchemical signs, a central sign) and saved with its size and the one thing it does; one or two may be
   Signature Circles. Using a circle shows its drawing and activation times, draws life energy from the earth, rolls the
   Alchemy check and lights the circle up. From Alchemy 8 circles can be embedded as arrays on the body. The rules are
   alchState and ALCH_SIZES in rules.js; data in c.alch. */
const ALCH_SIGNS = {
  fire: "M0 -7L7 6H-7Z", water: "M0 7L7 -6H-7Z", air: "M0 -7L7 6H-7Z M-4.6 1.2H4.6", earth: "M0 7L7 -6H-7Z M-4.6 -1.2H4.6",
  salt: "M-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0 M-7 0H7",
  sulfur: "M0 -8L5 0H-5Z M0 0V8 M-3.5 4.5H3.5",
  mercury: "M-4 -9a4 3 0 0 0 8 0 M-4.5 -1a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0 -9 0 M0 3.5V9 M-3 6.5H3",
  gold: "M-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0 M-1.2 0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0",
  silver: "M2 -7A7 7 0 1 0 2 7A5.4 5.4 0 1 1 2 -7Z",
  iron: "M-7.5 2.5a5 5 0 1 0 10 0a5 5 0 1 0 -10 0 M1 -1L7 -7 M3 -7H7V-3",
  copper: "M-5 -3a5 5 0 1 0 10 0a5 5 0 1 0 -10 0 M0 2V9 M-3 5.5H3",
};
const ALCH_SIGN_NAME = { fire: "Fire", water: "Water", air: "Air", earth: "Earth", salt: "Salt", sulfur: "Sulfur", mercury: "Mercury", gold: "Gold", silver: "Silver", iron: "Iron", copper: "Copper" };
const ALCH_KINDS = [["ring", "Ring"], ["poly", "Polygon"], ["star", "Star"], ["spokes", "Spokes"], ["signs", "Ring of signs"], ["sign", "Central sign"]];
const ALCH_NEW = () => [
  { id: rid(), k: "ring", r: 1, w: 2, double: true }, { id: rid(), k: "signs", n: 7, r: .9, sym: "mix" }, { id: rid(), k: "ring", r: .8, w: 1 },
  { id: rid(), k: "star", n: 7, step: 3, r: .8, rot: 0 }, { id: rid(), k: "ring", r: .42, w: 1.4 }, { id: rid(), k: "poly", n: 3, r: .42, rot: 0 }, { id: rid(), k: "sign", sym: "fire" },
];
const alchPts = (n, r, rot) => Array.from({ length: n }, (_, i) => { const a = (rot - 90 + i * 360 / n) * Math.PI / 180; return [Math.cos(a) * r, Math.sin(a) * r]; });
const alchPath = pts => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" ") + " Z";
const ALCH_MIX = Object.keys(ALCH_SIGNS);
// One layer of a circle, drawn in a -100..100 box.
function alchLayer(L, i) {
  const R = 90 * num(L.r || 1), style = `--i:${i}`;
  if (L.k === "ring") return html`<g class="alayer" style=${style}><circle r=${R} style=${`stroke-width:${num(L.w) || 1}`} />${L.double && html`<circle r=${R - 5} style="stroke-width:.8" />`}</g>`;
  if (L.k === "poly") return html`<path class="alayer" style=${style} d=${alchPath(alchPts(Math.max(3, num(L.n)), R, num(L.rot)))} />`;
  if (L.k === "star") { const n = Math.max(5, num(L.n)), step = Math.max(2, Math.min(Math.floor((n - 1) / 2), num(L.step) || 2)), pts = alchPts(n, R, num(L.rot));
    const seen = new Set(), segs = [];
    for (let s = 0; s < n; s++) { if (seen.has(s)) continue; const loop = []; let j = s; do { seen.add(j); loop.push(pts[j]); j = (j + step) % n; } while (j !== s); segs.push(alchPath(loop)); }
    return html`<path class="alayer" style=${style} d=${segs.join(" ")} />`; }
  if (L.k === "spokes") return html`<g class="alayer" style=${style}>${alchPts(Math.max(2, num(L.n)), R, num(L.rot)).map(p => html`<line x1=${(p[0] * .25).toFixed(1)} y1=${(p[1] * .25).toFixed(1)} x2=${p[0].toFixed(1)} y2=${p[1].toFixed(1)} />`)}</g>`;
  if (L.k === "signs") return html`<g class="alayer signs" style=${style}>${alchPts(Math.max(2, num(L.n)), R, num(L.rot)).map((p, j) => {
    const sym = L.sym === "mix" ? ALCH_MIX[j % ALCH_MIX.length] : L.sym; return html`<path d=${ALCH_SIGNS[sym] || ALCH_SIGNS.fire} transform=${`translate(${p[0].toFixed(1)} ${p[1].toFixed(1)}) scale(.62)`} />`; })}</g>`;
  if (L.k === "sign") return html`<path class="alayer sign" style=${style} d=${ALCH_SIGNS[L.sym] || ALCH_SIGNS.fire} transform=${`scale(${(2.4 * num(L.r || 1)).toFixed(2)})`} />`;
  return null;
}
function AlchFigure({ layers, cls = "", phase = "", label }) {
  return html`<svg class=${"alchfig " + cls + (phase ? " " + phase : "")} viewBox="-104 -104 208 208" role="img" aria-label=${label || "An alchemical circle"}>
    <circle class="aglow" r="100" />
    <g class="alayers">${layers.map((L, i) => html`<g key=${L.id}>${alchLayer(L, i)}</g>`)}</g>
    ${phase === "active" && html`<g class="aarcs">${[0, 1, 2, 3, 4].map(i => { const a = wardSeed("arc" + i + Date.now() % 7) * Math.PI * 2, b = a + 1.2 + wardSeed("arcb" + i) * 1.6;
      const pts = Array.from({ length: 7 }, (_, j) => { const t = j / 6, ang = a + (b - a) * t, rr = 88 - Math.sin(t * Math.PI) * 50 + (wardSeed("j" + i + j) - .5) * 16; return [Math.cos(ang) * rr, Math.sin(ang) * rr]; });
      return html`<path style=${`--i:${i}`} d=${pts.map((p, j) => `${j ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ")} />`; })}</g>`}
    ${phase === "active" && html`<circle class="aflash" r="30" />`}
  </svg>`;
}

function Alchemy({ c, update }) {
  const st = R.alchState(c), A = c.alch;
  const [open, setOpen] = useState(() => (A.circles[0] && A.circles[0].id) || "");   // the circle on the workbench ("new" for a fresh one)
  const cur = A.circles.find(x => x.id === open);
  const log = (x, what) => { x.alch.ledger = [{ id: rid(), t: Date.now(), what }, ...x.alch.ledger].slice(0, 30); addLog(x, "Alchemy: " + what); };
  return html`<div class="alchemy">
    <section class="frame alchhead"><${Head} title="Alchemy" topic="alchemy" />
      <p class="sub">Every transmutation runs through a circle, and every circle does one thing. Draw yours precisely: a careless circle invites disaster.</p>
      <div class="facts ptfacts">${[
        ["Alchemy", `${st.lvl}`], ["Modifier", `${st.mod}%`], ["Can transmute", st.can],
        ["Energy from the earth", st.earth ? `${st.earth}d6` : "From Alchemy 4"],
        ["Signature Circles", st.sigMax ? `${st.sigs} of ${st.sigMax}` : "From Alchemy 6"],
      ].map(([k, v]) => html`<div class="fact"><span>${k}</span><b>${v}</b></div>`)}</div>
    </section>

    <section class="frame alchbook">
      <h2 class="h"><span>Circle book</span><i class="orn" aria-hidden="true"></i></h2>
      <div class="alchshelf">
        ${A.circles.map(x => html`<button type="button" class=${"alchthumb" + (open === x.id ? " on" : "") + (x.sig ? " sig" : "")} aria-pressed=${open === x.id} onClick=${() => setOpen(x.id)}>
          <${AlchFigure} layers=${x.layers} label=${x.n} /><b>${x.n || "Unnamed circle"}</b><small>${R.ALCH_SIZES[R.ALCH_SIZE_I[x.size]][1]}${x.sig ? " · Signature" : ""}</small></button>`)}
        <button type="button" class=${"alchthumb new" + (open === "new" ? " on" : "")} onClick=${() => setOpen("new")}><span>+</span><b>Draw a new circle</b></button>
      </div>
    </section>

    ${(cur || open === "new") && html`<${AlchBench} key=${open} c=${c} st=${st} update=${update} log=${log} circle=${cur} onSaved=${id => setOpen(id)} onGone=${() => setOpen("")} />`}
    ${st.arrays && html`<${AlchArrays} c=${c} update=${update} log=${log} />`}
    ${A.ledger.length > 0 && html`<section class="frame"><h2 class="h"><span>Ledger</span><i class="orn" aria-hidden="true"></i></h2>
      <div class="ptledger">${A.ledger.map(e => html`<div class="pled"><small class="muted">${new Date(e.t).toLocaleString()}</small> ${e.what}</div>`)}</div></section>`}
  </div>`;
}

// The workbench: design the circle (layers), save it, and use it (energy, the check, the activation).
function AlchBench({ c, st, update, log, circle, onSaved, onGone }) {
  const [f, setF] = useState(() => circle ? JSON.parse(JSON.stringify(circle)) : { id: "", n: "", size: "small", purpose: "", sig: false, layers: ALCH_NEW() });
  const [phase, setPhase] = useState(""), [energy, setEnergy] = useState(null), [dc, setDc] = useState(""), [roll, setRoll] = useState(null), [sure, setSure] = useState(false);
  const timer = useRef(0); useEffect(() => () => clearTimeout(timer.current), []);
  const dirty = !circle || JSON.stringify(circle) !== JSON.stringify(f);
  const sizeI = R.ALCH_SIZE_I[f.size], size = R.ALCH_SIZES[sizeI];
  const sigsOther = c.alch.circles.filter(x => x.sig && x.id !== f.id).length;
  const sigOk = st.sigMax > sigsOther && sizeI <= st.sigBiggest(sigsOther);
  const setL = (i, k, v) => setF(Object.assign({}, f, { layers: f.layers.map((L, j) => j === i ? Object.assign({}, L, { [k]: v }) : L) }));
  const moveL = (i, d) => { const l = f.layers.slice(), j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; setF(Object.assign({}, f, { layers: l })); };
  const addL = k => setF(Object.assign({}, f, { layers: [...f.layers, Object.assign({ id: rid(), k, r: k === "sign" ? .5 : .6, rot: 0 },
    k === "ring" ? { w: 1 } : k === "poly" ? { n: 4 } : k === "star" ? { n: 5, step: 2 } : k === "spokes" ? { n: 8 } : k === "signs" ? { n: 4, sym: "mix", r: .7 } : { sym: "gold" })] }));
  const save = () => {
    const id = f.id || "c" + rid(), v = Object.assign({}, f, { id, n: f.n.trim() || "Unnamed circle", purpose: f.purpose.trim(), sig: f.sig && sigOk });
    update(x => { const i = x.alch.circles.findIndex(y => y.id === id); if (i >= 0) x.alch.circles[i] = v; else x.alch.circles.push(v); });
    setF(v); toast(`${v.n} is in your circle book.`); onSaved(id);
  };
  // Draw life energy from the earth: (Alchemy ÷ 2)d6, or the maximum with Rubedo. A Medium or larger circle eats a ration.
  const draw = async rubedo => {
    let total = st.earth * 6, dice = [];
    if (!rubedo) { const r = await askRoll({ title: "Life energy from the earth", dice: [{ n: st.earth, sides: 6 }], cancel: true, note: `${st.earth}d6 of life energy.` }); if (!r) return; dice = r; total = r.reduce((a, b) => a + num(b), 0); }
    const ration = sizeI >= R.ALCH_SIZE_I.medium;
    setEnergy({ total, dice, rubedo, ration });
    update(x => {
      if (rubedo) R.setStamina(x, num(x.vitals.exhaustion) + 2);
      let ate = "";
      if (ration) { const r = (x.items || []).find(i => /^rations?\b/i.test(i.name || "") && num(i.qty) > 0); if (r) { r.qty = num(r.qty) - 1; ate = ", ate 1 ration"; } else ate = ", needs 1 ration (none in the inventory)"; }
      log(x, `drew ${total} life energy${rubedo ? " (Rubedo: the maximum, 2 Stamina)" : ` (${dice.join(" + ")})`}${ate}`);
    });
  };
  const check = async again => {
    const r = await askRoll({ title: `Alchemy: ${f.n || "transmutation"}`, dice: [{ n: 1, sides: 100 }], cancel: true, note: `d100 − ${st.mod}${dc !== "" ? `, under ${dc} and it works` : ""}.` });
    if (!r) return;
    const total = r[0] - st.mod, ok = dc === "" ? null : total < num(dc);
    setRoll({ r: r[0], total, ok, again: !!again });
    update(x => log(x, `${again ? "re-rolled" : "activated"} ${f.n || "a circle"} (${size[1]}): ${r[0]} − ${st.mod} = ${total}${dc !== "" ? ` vs ${dc}, ${ok ? "it works" : "it fails"}` : ""}${again ? "; lost the most Deprivation possible" : ""}`));
    if (reduceMotion()) return;
    setPhase(ok === false ? "fail" : "active"); clearTimeout(timer.current); timer.current = setTimeout(() => setPhase(""), 2400);
  };
  const remove = () => { update(x => { x.alch.circles = x.alch.circles.filter(y => y.id !== f.id); Object.keys(x.alch.arrays).forEach(k => { if (x.alch.arrays[k] && x.alch.arrays[k].circle === f.id) delete x.alch.arrays[k]; }); }); onGone(); };

  return html`<section class=${"frame alchbench" + (phase ? " " + phase : "")}>
    <h2 class="h"><span>${circle ? f.n || "Unnamed circle" : "A new circle"}</span><i class="orn" aria-hidden="true"></i></h2>
    <div class="alchstage">
      <div class="alchview"><${AlchFigure} layers=${f.layers} phase=${phase} cls="big" label=${f.n || "Your circle"} />
        ${f.sig && html`<p class="alchsig">Signature Circle</p>`}</div>
      <div class="alchdesign">
        <div class="row alchmeta">
          <span class="mini grow"><label for=${"al-n-" + (f.id || "new")}>Name</label><input id=${"al-n-" + (f.id || "new")} value=${f.n} onInput=${e => setF(Object.assign({}, f, { n: e.target.value }))} placeholder="Circle of Rust Undone" /></span>
          <span class="mini grow"><label for=${"al-p-" + (f.id || "new")}>What it does (one thing)</label><input id=${"al-p-" + (f.id || "new")} value=${f.purpose} onInput=${e => setF(Object.assign({}, f, { purpose: e.target.value }))} placeholder="Breaks iron oxide back into iron" /></span>
        </div>
        <div class="alchsizes" role="radiogroup" aria-label="Size">${R.ALCH_SIZES.map(([k, n, m]) => html`<button type="button" role="radio" aria-checked=${f.size === k} class=${"alchsize" + (f.size === k ? " on" : "")} title=${m} onClick=${() => setF(Object.assign({}, f, { size: k }))}>${n}</button>`)}</div>
        <p class="muted alchtimes">${size[1]} (${size[2]}): <b>${size[3]}</b> to draw, <b>${size[4]}</b> to activate.</p>
        <div class="alchlayers">${f.layers.map((L, i) => html`<div class="alchlayer" key=${L.id}>
          <b>${(ALCH_KINDS.find(k => k[0] === L.k) || [, "Layer"])[1]}</b>
          ${L.k !== "sign" && html`<span class="ptstepper"><span class="lbl">Size</span><button class="iconbtn" aria-label="Smaller" disabled=${num(L.r) <= .15} onClick=${() => setL(i, "r", Math.round((num(L.r) - .05) * 100) / 100)}>−</button><b>${Math.round(num(L.r) * 100)}</b><button class="iconbtn" aria-label="Larger" disabled=${num(L.r) >= 1} onClick=${() => setL(i, "r", Math.round((num(L.r) + .05) * 100) / 100)}>+</button></span>`}
          ${["poly", "star", "spokes", "signs"].includes(L.k) && html`<span class="ptstepper"><span class="lbl">Points</span><button class="iconbtn" aria-label="Fewer" onClick=${() => setL(i, "n", Math.max(L.k === "star" ? 5 : L.k === "poly" ? 3 : 2, num(L.n) - 1))}>−</button><b>${L.n}</b><button class="iconbtn" aria-label="More" onClick=${() => setL(i, "n", Math.min(16, num(L.n) + 1))}>+</button></span>`}
          ${L.k === "star" && html`<span class="ptstepper"><span class="lbl">Step</span><button class="iconbtn" aria-label="Smaller step" onClick=${() => setL(i, "step", Math.max(2, num(L.step) - 1))}>−</button><b>${L.step}</b><button class="iconbtn" aria-label="Bigger step" onClick=${() => setL(i, "step", Math.min(Math.floor((num(L.n) - 1) / 2), num(L.step) + 1))}>+</button></span>`}
          ${["poly", "star", "spokes", "signs"].includes(L.k) && html`<button class="btn small" title="Turn it" onClick=${() => setL(i, "rot", (num(L.rot) + 15) % 360)}>Turn ↻</button>`}
          ${L.k === "ring" && html`<button class=${"btn small" + (L.double ? " primary" : "")} aria-pressed=${!!L.double} onClick=${() => setL(i, "double", !L.double)}>Double</button>`}
          ${(L.k === "signs" || L.k === "sign") && html`<span class="alchsyms">${[...(L.k === "signs" ? ["mix"] : []), ...Object.keys(ALCH_SIGNS)].map(s => html`<button type="button" class=${"alchsym" + (L.sym === s ? " on" : "")} aria-label=${s === "mix" ? "All the signs" : ALCH_SIGN_NAME[s]} title=${s === "mix" ? "All the signs" : ALCH_SIGN_NAME[s]} onClick=${() => setL(i, "sym", s)}>
            ${s === "mix" ? "∗" : html`<svg viewBox="-9 -9 18 18" aria-hidden="true"><path d=${ALCH_SIGNS[s]} /></svg>`}</button>`)}</span>`}
          <span class="alchlayeracts"><button class="iconbtn" aria-label="Move out" disabled=${!i} onClick=${() => moveL(i, -1)}>↑</button><button class="iconbtn" aria-label="Move in" disabled=${i === f.layers.length - 1} onClick=${() => moveL(i, 1)}>↓</button>
            <button class="iconbtn" aria-label="Remove layer" onClick=${() => setF(Object.assign({}, f, { layers: f.layers.filter((_, j) => j !== i) }))}>×</button></span>
        </div>`)}</div>
        <div class="row alchadd"><span class="lbl">Add</span>${ALCH_KINDS.map(([k, n]) => html`<button class="btn small" onClick=${() => addL(k)}>${n}</button>`)}</div>
        <div class="row alchsave">
          ${st.sigMax > 0 && html`<label class="demonguard" title=${sigOk ? "Mark it as one of your Signature Circles" : `Your Signature Circles: ${st.sigMax}; the first Medium or below, the second Large or below`}>
            <input type="checkbox" checked=${f.sig} disabled=${!f.sig && !sigOk} onChange=${e => setF(Object.assign({}, f, { sig: e.target.checked }))} /> Signature Circle</label>`}
          <button class="btn small primary" disabled=${!dirty || !f.layers.length} onClick=${save}>${circle ? "Save changes" : "Save to the circle book"}</button>
          ${circle && html`<button class="btn small danger" onClick=${() => sure ? remove() : setSure(true)}>${sure ? "Really erase it?" : "Erase"}</button>`}
        </div>
      </div>
    </div>

    ${circle && html`<div class="alchuse">
      <h3 class="lbl">Transmute</h3>
      <p class="muted">${f.purpose ? `${f.purpose}. ` : ""}The GM decides the energy it needs and the difficulty. Make sure you can fuel it: a transmutation bigger than you can fuel means starvation.</p>
      <div class="row harmhow">
        ${st.earth > 0 && html`<button class="btn small" onClick=${() => draw(false)}>Draw energy from the earth: ${st.earth}d6</button>`}
        ${st.maxEnergy && html`<button class="btn small" disabled=${num(c.vitals && c.vitals.exhaustion) + 2 >= 10} title="Alchemy 10, Empowered: 2 AP, 2 Stamina" onClick=${() => draw(true)}>Rubedo: the maximum (${st.earth * 6})</button>`}
        ${energy && html`<span class="alchenergy"><b>${energy.total}</b> life energy${energy.rubedo ? " (the maximum)" : ` (${energy.dice.join(" + ")})`}${energy.ration ? " · a ration eaten" : ""}</span>`}
      </div>
      <div class="row harmhow">
        <span class="mini warddc"><label for=${"al-dc-" + f.id}>DC</label><input id=${"al-dc-" + f.id} type="number" min="1" placeholder="GM's" value=${dc} onInput=${e => setDc(e.target.value)} /></span>
        <button class="btn small primary" disabled=${!!phase} onClick=${() => check(false)}>Activate: roll Alchemy</button>
        ${roll && st.reroll && !roll.again && html`<button class="btn small" title="Alchemy 9: re-roll once before the result is declared; you lose the most Deprivation possible" onClick=${() => check(true)}>Re-roll</button>`}
        ${roll && html`<span class=${"harmkeepr " + (roll.ok === false ? "bad" : "ok")}>${roll.r} − ${st.mod} = <b>${roll.total}</b>${roll.ok == null ? " · the GM says how it goes" : roll.ok ? " · it works" : " · it fails: disaster follows"}${roll.again ? " (re-rolled)" : ""}</span>`}
      </div>
    </div>`}
  </section>`;
}

// Arrays (Alchemy 8): circles embedded in the body, one per limb and the torso, 50–100 hours each.
function AlchArrays({ c, update, log }) {
  const A = c.alch, small = A.circles.filter(x => R.ALCH_SIZE_I[x.size] <= R.ALCH_SIZE_I.medium), large = A.circles.filter(x => x.size === "large");
  const [slot, setSlot] = useState("");
  // One save per change (two saves in a row would start from the same old copy, and the second would undo the first).
  const set = (k, v, what) => update(x => { if (v) x.alch.arrays[k] = Object.assign({ hours: 0, need: 75 }, x.alch.arrays[k], v); else delete x.alch.arrays[k]; if (what) log(x, what); });
  const joined = A.arrays.torso && (A.circles.find(x => x.id === A.arrays.torso.circle) || {}).size === "large";   // a Large circle takes the torso and both arms
  const POS = { larm: [60, 98], rarm: [140, 98], torso: [100, 96], lleg: [86, 196], rleg: [114, 196] };
  return html`<section class="frame alcharrays">
    <h2 class="h"><span>Arrays</span><i class="orn" aria-hidden="true"></i></h2>
    <p class="sub">Circles embedded in your body, one effect each, for good: arms, legs and torso, Medium or smaller, or one Large circle across the torso and both arms. 50 to 100 hours to embed. A damaged or severed limb loses its array.</p>
    <div class="alcharraystage">
      <svg class="alchbody" viewBox="0 0 200 260" role="group" aria-label="Your arrays">
        <path class="abody" d="M100 14a18 18 0 1 0 0.1 0z M84 50h32l14 8 18 70-10 4-16-52v58l4 92h-16l-6-80-6 80h-16l4-92V80l-16 52-10-4 18-70z" />
        ${R.ALCH_LIMBS.map(([k, n]) => { const a = A.arrays[k], cir = a && A.circles.find(x => x.id === a.circle), [x, y] = POS[k], off = joined && (k === "larm" || k === "rarm");
          return html`<g class=${"aslot" + (cir ? " has" : "") + (a && num(a.hours) >= num(a.need) ? " done" : "") + (slot === k ? " sel" : "") + (off ? " joined" : "")} transform=${`translate(${x} ${y})`}
            role="button" tabindex="0" aria-label=${`${n}: ${off ? "part of the torso's Large array" : cir ? cir.n : "empty"}`} onClick=${() => setSlot(slot === k ? "" : k)} onKeyDown=${e => { if (e.key === "Enter") setSlot(slot === k ? "" : k); }}>
            <circle r="15" class="aslotbg" />${cir && html`<g transform="scale(.14)">${cir.layers.map((L, i) => html`<g key=${L.id}>${alchLayer(L, i)}</g>`)}</g>`}</g>`; })}
      </svg>
      <div class="alcharraylist">${R.ALCH_LIMBS.map(([k, n]) => { const a = A.arrays[k], cir = a && A.circles.find(x => x.id === a.circle), off = joined && (k === "larm" || k === "rarm");
        return html`<div class=${"alcharray" + (slot === k ? " sel" : "")}>
          <button type="button" class="alcharrayh" onClick=${() => setSlot(slot === k ? "" : k)}><b>${n}</b><small>${off ? "Part of the torso's Large array" : !cir ? "Empty" : num(a.hours) >= num(a.need) ? `${cir.n}: embedded` : `${cir.n}: ${a.hours} of ${a.need} hours`}</small></button>
          ${slot === k && !off && html`<div class="alcharrayedit">
            <div class="dvpick">${[...small, ...(k === "torso" ? large : [])].map(x => html`<button type="button" class=${"dvchip" + (a && a.circle === x.id ? " on" : "")} onClick=${() => set(k, { circle: x.id }, `began embedding ${x.n} in the ${n.toLowerCase()}`)}>${x.n}${x.size === "large" ? " (Large: torso and both arms)" : ""}</button>`)}
              ${!small.length && html`<span class="muted">Save a Medium or smaller circle in your circle book first.</span>`}</div>
            ${cir && html`<div class="row harmhow">
              <span class="ptstepper"><span class="lbl">Hours</span><button class="iconbtn" aria-label="Fewer hours" disabled=${!num(a.hours)} onClick=${() => set(k, { hours: Math.max(0, num(a.hours) - 5) })}>−</button><b>${a.hours}</b><button class="iconbtn" aria-label="5 more hours" onClick=${() => set(k, { hours: Math.min(num(a.need), num(a.hours) + 5) })}>+</button></span>
              <span class="ptstepper"><span class="lbl">Needs</span><button class="iconbtn" aria-label="Less" disabled=${num(a.need) <= 50} onClick=${() => set(k, { need: Math.max(50, num(a.need) - 5) })}>−</button><b>${a.need} h</b><button class="iconbtn" aria-label="More" disabled=${num(a.need) >= 100} onClick=${() => set(k, { need: Math.min(100, num(a.need) + 5) })}>+</button></span>
              <button class="btn small danger" onClick=${() => set(k, null, `lost the array in the ${n.toLowerCase()}`)}>Lost</button></div>`}
          </div>`}
        </div>`; })}</div>
    </div>
  </section>`;
}
