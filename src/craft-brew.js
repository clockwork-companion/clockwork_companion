/* ================= crafting: brewing ================= */
// The rulebook's Brewing (16.1): a cauldron over a fire, a pouch of herbs, a catalyst vial and a flask. Pick a recipe
// (the book's five, or ones the GM gives), its increments, a catalyst and, from Brewing 7, a second brew for a Potent Brew.
// Brewing steeps the herbs, boils while the d100 rolls, then pours into the flask (or turns murky and smokes).
const BREW_HUE = { health: "#c8303a", skele: "#e6dfc4", sanguinar: "#6e0d1a", sleep: "#7b6ad2", pickme: "#e2ae36" };
const brewHue = r => (r && (BREW_HUE[r.k] || r.hue)) || "#4fa36b";
const BR_LABELS = { type: ["l", 140], av: ["r", 170], soak: ["l", 272], extra: ["r", 290] };
const BR_ANCHOR = { type: [108, 236], av: [214, 240], soak: [62, 372], extra: [246, 112] };
const BR_NAMES = { type: "Recipe", av: "Increments", soak: "Herbs", extra: "Catalyst" };

function BrewScene({ hue, hue2, run, labels, focus, onPick, catOn }) {
  const ph = run && run.phase;
  const boil = ph === "rolling", steep = ph === "steep", pour = ph === "pour" || ph === "done", bad = ph === "spoiled" || ph === "lost", inert = ph === "inert", boom = ph === "boom";
  const liquid = boom ? "#2e241d" : bad ? "#5a4a2a" : inert ? "#7d7f78" : hue;
  return html`<div class=${"ptmun brmun" + (boil ? " boil" : "") + (steep ? " steep" : "") + (pour ? " pour" : "") + (bad ? " spoiled" : "") + (boom ? " boom" : "")}>
    <svg class="ptsvg" viewBox="0 0 360 460" role="img" aria-label="A cauldron over a fire, a pouch of herbs, a catalyst vial and a flask">
      <defs>
        <radialGradient id="br-fire" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="#ffe08a" /><stop offset=".45" stop-color="#ff8a2a" /><stop offset="1" stop-color="#ff4a1a" stop-opacity="0" /></radialGradient>
        <linearGradient id="br-iron" x1="0" x2="1"><stop offset="0" stop-color="#16171a" /><stop offset=".35" stop-color="#4a4d53" /><stop offset=".6" stop-color="#2a2c30" /><stop offset="1" stop-color="#0e0f11" /></linearGradient>
        <linearGradient id="br-wood" x1="0" x2="1"><stop offset="0" stop-color="#4f2e14" /><stop offset=".45" stop-color="#a87442" /><stop offset="1" stop-color="#4a2b12" /></linearGradient>
        <linearGradient id="br-sack" x1="0" x2="1"><stop offset="0" stop-color="#6b5434" /><stop offset=".5" stop-color="#a88a5c" /><stop offset="1" stop-color="#5e482a" /></linearGradient>
        <radialGradient id="br-liq" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".35" /><stop offset=".4" stop-color="#fff" stop-opacity="0" /></radialGradient>
        <clipPath id="br-pot-in"><ellipse cx="170" cy="253" rx="76" ry="13" /></clipPath><clipPath id="br-flask-in"><path d="M282 300 h16 v26 a34 34 0 1 1 -16 0 z" /></clipPath>
      </defs>
      <ellipse class="br-glow" cx="170" cy="420" rx="130" ry="34" fill="url(#br-fire)" />
      <g class="br-fire">${[[150, 22], [170, 32], [190, 24], [160, 16], [182, 18]].map(([x, h], i) => html`<path style=${`--d:${i * 130}ms`} d=${`M${x - 9} 424 Q${x - 6} ${424 - h * .6} ${x} ${424 - h} Q${x + 6} ${424 - h * .6} ${x + 9} 424 Z`} fill=${i % 2 ? "#ffb347" : "#ff7a2a"} />`)}</g>
      <g class="br-logs"><rect x="118" y="420" width="104" height="10" rx="5" fill="url(#br-wood)" transform="rotate(-6 170 425)" /><rect x="118" y="422" width="104" height="10" rx="5" fill="url(#br-wood)" transform="rotate(7 170 427)" /></g>
      <path d="M96 432 L132 238 M244 432 L208 238 M170 432 L170 380" stroke="#2a2b2e" stroke-width="5" stroke-linecap="round" />
      <g class="br-pot"><path d="M84 250 Q84 386 170 392 Q256 386 256 250 Z" fill="url(#br-iron)" stroke="#060607" stroke-width="1.5" />
        <path d="M108 300 Q112 360 150 374" stroke="#fff" stroke-opacity=".12" stroke-width="5" fill="none" stroke-linecap="round" />
        <ellipse cx="170" cy="250" rx="88" ry="20" fill="#0b0b0d" stroke="#3a3c40" stroke-width="5" />
        <ellipse class="br-liquid" cx="170" cy="253" rx="78" ry="14" fill=${liquid} />
        ${hue2 && !bad && !inert && html`<g clip-path="url(#br-pot-in)"><path class="br-swirl" d="M96 253 Q130 243 160 253 T224 253 T288 253" stroke=${hue2} stroke-width="6" fill="none" stroke-linecap="round" opacity=".85" /></g>`}
        <ellipse cx="170" cy="253" rx="78" ry="14" fill="url(#br-liq)" />
        <g class="br-bubbles">${[[140, 0], [168, 1], [196, 2], [154, 3], [186, 4]].map(([x, i]) => html`<circle cx=${x} cy="252" r=${3 + (i % 3)} fill=${liquid} stroke="#fff" stroke-opacity=".35" style=${`--d:${i * 0.33}s`} />`)}</g>
        <path d="M82 248 q-16 -8 -12 8 M258 248 q16 -8 12 8" stroke="#3a3c40" stroke-width="5" fill="none" /></g>
      <g class="br-steam">${[0, 1, 2].map(i => html`<path style=${`--d:${i * .9}s`} d=${`M${150 + i * 20} 236 q-10 -20 0 -40 q10 -20 0 -40`} stroke=${bad ? "#4a4a4a" : "#d8dde2"} stroke-width="5" fill="none" stroke-linecap="round" opacity=".35" />`)}</g>
      <g class="br-pouch"><path d="M34 410 Q30 352 52 340 L84 340 Q106 352 102 410 Q68 422 34 410 Z" fill="url(#br-sack)" stroke="#3a2a14" stroke-width="1.4" />
        <path d="M50 342 Q68 332 86 342" stroke="#3a2a14" stroke-width="3" fill="none" />
        ${[[56, 334, -30], [70, 328, 0], [82, 334, 30]].map(([x, y, a]) => html`<path transform=${`translate(${x} ${y}) rotate(${a})`} d="M0 0 C-5 -6 -4 -14 0 -18 C4 -14 5 -6 0 0Z" fill="#4f8a3a" stroke="#1f3a14" stroke-width=".8" />`)}</g>
      ${steep && html`<g class="br-leaves">${[[150, 0], [174, 1], [196, 2], [162, 3]].map(([x, i]) => html`<g transform=${`translate(${x} 150)`}><path style=${`--d:${i * 220}ms`} d="M0 0 C-5 -6 -4 -14 0 -18 C4 -14 5 -6 0 0Z" fill=${i % 2 ? "#6fa64f" : "#4f8a3a"} stroke="#1f3a14" stroke-width=".8" /></g>`)}</g>`}
      <g class=${"br-vial" + (catOn ? " on" : "")}><path d="M246 40 V70" stroke="#6b5a40" stroke-width="1.4" />
        <rect x="236" y="70" width="20" height="44" rx="8" fill="#cfe3e6" fill-opacity=".35" stroke="#7a9aa0" stroke-width="1.6" /><rect x="239" y="88" width="14" height="23" rx="6" fill="#b06ad8" class="br-cat" />
        <circle class="br-drop" cx="246" cy="120" r="3.5" fill="#b06ad8" /></g>
      <g class="br-flask"><path d="M282 300 h16 v26 a34 34 0 1 1 -16 0 z" fill="#cfe3e6" fill-opacity=".2" stroke="#6f8a90" stroke-width="2" />
        <rect class="br-fill" x="250" y="300" width="80" height="96" fill=${liquid} clip-path="url(#br-flask-in)" />
        <path d="M268 352 q-8 14 2 30" stroke="#fff" stroke-opacity=".5" stroke-width="3" fill="none" stroke-linecap="round" />
        <rect class="br-cork" x="282" y="288" width="16" height="14" rx="3" fill="url(#br-wood)" /></g>
      <path class="br-stream" d="M232 248 C262 220 290 250 290 300" stroke=${liquid} stroke-width="5" fill="none" stroke-linecap="round" />
      ${ph === "done" && html`<g class="ptsparks burst br-spark" transform="translate(290 288)">${Array.from({ length: 9 }, (_, i) => html`<line x1="0" y1="0" x2="0" y2="-9" style=${`--a:${i * 40 + 10}deg;--d:0ms`} />`)}</g>`}
      <g class="br-smoke">${[0, 1, 2, 3].map(i => html`<circle cx=${140 + i * 20} cy="230" r=${14 + (i % 2) * 6} style=${`--d:${i * 150}ms`} />`)}</g>
      <rect class="br-flash" x="0" y="0" width="360" height="460" fill="#fff" />
      <g class="ptlines">${Object.keys(BR_LABELS).map(p => { const [side, ly] = BR_LABELS[p], [ax, ay] = BR_ANCHOR[p], lx = side === "l" ? 112 : 248;
        return html`<g class=${"ptline" + (focus === p ? " on" : "")}><path d=${`M${lx} ${ly} H${side === "l" ? lx + 12 : lx - 12} L${ax} ${ay}`} /><circle cx=${ax} cy=${ay} r="3.6" /></g>`; })}</g>
    </svg>
    ${Object.keys(BR_LABELS).map(p => { const [side, ly] = BR_LABELS[p];
      return html`<button type="button" class=${"ptlabel " + side + (focus === p ? " on" : "")} style=${`top:${(ly / 460) * 100}%`} disabled=${!!run} aria-pressed=${focus === p} onClick=${() => onPick(p)}>
        <span class="k">${BR_NAMES[p]}</span><span class="v">${labels[p]}</span></button>`; })}
  </div>`;
}

function Brewing({ c, update }) {
  const st = R.brewState(c), cb = c.craft.brew, o = cb.order;
  const [focus, setFocus] = useState("type");
  const [run, setRunState] = useState(null);
  const runRef = useRef(null), timers = useRef([]);
  const setRun = r => { runRef.current = r; setRunState(r); };
  const patch = p => { const r = runRef.current; if (r) setRun(Object.assign({}, r, typeof p === "function" ? p(r) : p)); };
  const later = (fn, ms) => timers.current.push(setTimeout(fn, reduceMotion() ? Math.min(ms, 90) : ms));
  const wait = ms => new Promise(res => later(res, ms));
  const stop = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => stop(), []);
  useEffect(() => { stop(); setRun(null); }, [c.id]);
  const busy = !!run && !run.done;
  const plan = R.brewPlan(c, o);
  const setO = fn => update(x => fn(x.craft.brew.order));
  const herbs = [...new Set(R.allBrews(c).map(r => r.herb || "herbs"))];
  const addLedger = (x, e) => { x.craft.brew.ledger = [Object.assign({ id: rid(), t: Date.now(), note: "" }, e), ...x.craft.brew.ledger].slice(0, 20); };
  const sum = a => a.reduce((s, x) => s + x, 0);

  /* ---------- the brew: steep, check (both, for a Potent Brew), catalyst, toxicity, pour ---------- */
  const start = async () => {
    if (plan.block) return;
    const p = plan, names = [p.a, p.p].filter(Boolean).map(b => b.rec.n);
    const first = await askRoll({ title: p.p ? `Brewing check: ${p.a.rec.n}` : "Brewing check", dice: [{ n: 1, sides: 100 }], cancel: true,
      note: `d100 − ${st.mod}, under ${p.dcs[0]}. A failure wastes the herbs.` });
    if (!first) return;
    setRun({ phase: "steep", plan: p, names, rolls: [], mod: st.mod, tox: null, vol: null });
    await wait(1500);
    for (let i = 0; i < p.dcs.length; i++) {
      const r = i === 0 ? first[0] : (await askRoll({ title: `Brewing check: ${p.p.rec.n}`, dice: [{ n: 1, sides: 100 }], note: `d100 − ${st.mod}, under ${p.dcs[1]}. If either fails, both do.` }))[0];
      if (!runRef.current) return;
      patch({ phase: "rolling", roll: null });
      await wait(1300);
      const ok = r - st.mod < p.dcs[i], row = { r, total: r - st.mod, ok, dc: p.dcs[i] };
      patch(g => ({ roll: row, rolls: [...g.rolls, row] }));
      await wait(700);
      if (!ok) return finish("spoiled");
    }
    // a volatile catalyst decides what happens next
    let extra = 0;
    if (p.cat && p.cat.k === "volatile") {
      const [v] = await askRoll({ title: "Volatile Catalyst", dice: [{ n: 1, sides: 100 }], note: "1–10 five more increments, 11–25 three more, 26–70 nothing, 71–94 inert, 95–100 it explodes." });
      const row = R.VOLATILE.find(([hi]) => v <= hi);
      patch({ vol: { v, text: row[2] } });
      if (row[1] === -2) { const [dmg] = await askRoll({ title: "The brew explodes", dice: [{ n: 1, sides: 20 }], note: "1d20 damage to everyone within 2 m." }); patch({ phase: "boom", boom: dmg }); await wait(900); return finish("boom"); }
      if (row[1] === -1) { patch({ phase: "inert" }); await wait(900); return finish("inert"); }
      extra = row[1];
    }
    patch({ phase: "pour" });
    await wait(1400);
    // toxicity: the dice of each brew; a Potent Brew at Brewing 9 keeps the higher of the two
    const toxA = await askRoll({ title: `Toxicity: ${p.a.rec.n}`, dice: p.a.tox, note: "Roll the toxicity dice." });
    let tox = sum(toxA), toxB = null;
    if (p.p) { toxB = sum(await askRoll({ title: `Toxicity: ${p.p.rec.n}`, dice: p.p.tox, note: st.potentPlus ? "Brewing 9: the higher of the two counts." : "Both add up." })); tox = st.potentPlus ? Math.max(tox, toxB) : tox + toxB; }
    if (p.cat && p.cat.k === "duration") tox *= 2;
    if (p.cat && p.cat.k === "toxicity") tox = Math.max(0, tox - st.lvl);
    patch({ tox, toxParts: [sum(toxA), toxB], extra });
    finish("done", { tox, extra });
  };
  const finish = (how, res = {}) => {
    const f = runRef.current; if (!f) return;
    const p = f.plan, made = how === "done";
    const effA = made ? R.brewOne(c, p.a.rec, p.a.n + (res.extra || 0)).effect : "", effB = made && p.p ? R.brewOne(c, p.p.rec, p.p.n + (res.extra || 0)).effect : "";
    const name = `${p.a.rec.n}${p.a.n + (res.extra || 0) ? ` +${p.a.n + (res.extra || 0)}` : ""}${p.p ? ` & ${p.p.rec.n}${p.p.n + (res.extra || 0) ? ` +${p.p.n + (res.extra || 0)}` : ""}` : ""}`;
    const stats = `${effA}${effB ? `; ${effB}` : ""}${p.cat && p.cat.k === "duration" ? "; duration doubled" : ""}${p.cat && p.cat.custom ? `; ${p.cat.n}${p.cat.what ? ` (${p.cat.what})` : ""}` : ""} · Toxicity ${res.tox}`;
    update(x => {
      Object.entries(p.need).forEach(([h, g]) => (x.craft.supplies["herb:" + h] = Math.max(0, num(x.craft.supplies["herb:" + h]) - g)));
      if (made) x.items.push({ id: rid(), name: `${name} (${stats})`, qty: 1, size: "small" });
      const rolls = f.rolls.map(r => `${r.r}−${f.mod}=${r.total} vs ${r.dc} ${r.ok ? "✓" : "✗"}`);
      if (f.vol) rolls.push(`volatile ${f.vol.v}: ${f.vol.text}`);
      addLedger(x, { kind: "brew", name: made ? `Brewed ${name}: ${stats}` : how === "boom" ? `${names(p)} exploded (${f.boom} damage within 2 m)` : how === "inert" ? `${names(p)} turned inert` : `${names(p)} spoiled`, scrap: !made, rolls });
      addLog(x, made ? `Brewing: ${name} (${stats})` : `Brewing: ${names(p)} ${how === "boom" ? "exploded" : how === "inert" ? "turned inert" : "spoiled"}; herbs lost`);
    });
    patch({ done: true, phase: made ? "done" : how, result: made ? { name, stats } : null });
  };
  const names = p => [p.a, p.p].filter(Boolean).map(b => b.rec.n).join(" & ");
  const close = () => { stop(); setRun(null); };

  const labels = { type: plan.p ? `${plan.a.rec.n} & ${plan.p.rec.n}` : plan.a.rec.n, av: `${plan.a.n ? `+${plan.a.n} · ` : ""}${plan.a.effect}`,
    soak: Object.entries(plan.need).map(([h, g]) => `${g} g ${h}`).join(", "), extra: plan.cat ? plan.cat.n.replace(" Catalyst", "") : st.catalysts ? "None" : "Brewing 5" };

  return html`
    <section class="frame brbench">
      <${Head} title="Brewing" topic="brewing" />
      <p class="sub">Pick a recipe, its strength and a catalyst, then brew. One roll under the difficulty and the potion is yours; then its toxicity is rolled.</p>
      <div class="facts ptfacts">${[["Brewing", `${st.lvl}${st.lvl < 3 ? " · can't brew yet" : ""}`], ["Modifier", `${st.mod}%`], ["Catalysts known", st.catalysts ? `${cb.known.length} of ${st.known}` : "From level 5"],
        ["Potent Brews", st.potent ? "Yes" : "From level 7"]].map(([k, v]) => html`<div class="fact"><span>${k}</span><b>${v}</b></div>`)}</div>
      <div class="ptgrid">
        <div class="ptstage">
          <${BrewScene} hue=${brewHue(plan.a.rec)} hue2=${plan.p ? brewHue(plan.p.rec) : null} run=${run} labels=${labels} focus=${focus} onPick=${setFocus} catOn=${!!plan.cat} />
          <div class="ptforge">
            ${!run && html`<button class="btn primary big forgebtn" disabled=${!!plan.block} onClick=${start}>${FLASK_ICON}Brew${plan.p ? " a Potent Brew" : ""} · ${plan.hours === 2 ? "2 hours" : "1 hour"}</button>
              ${plan.block && html`<p class="muted ptwhy">${plan.block}</p>`}`}
            ${run && html`<${BrewReadout} run=${run} onClose=${close} again=${plan.block || ""} onAgain=${() => { close(); start(); }} />`}
          </div>
        </div>
        <div class="ptside"><${BrewSide} c=${c} st=${st} plan=${plan} o=${o} setO=${setO} focus=${focus} busy=${busy} update=${update} /></div>
      </div>
    </section>

    <section class="frame"><h2 class="h"><span>Herbs</span><i class="orn" aria-hidden="true"></i></h2>
      <p class="sub">Herbs and monster parts, in grams (a pouch weighs 1 kg). You also need a brewing kit and a flask for each brew. Foraging can find herbs.</p>
      <div class="ptsupplies">${herbs.map(h => html`<div class="mini ptsup"><label for=${"hb-" + h.replace(/\W+/g, "-") + c.id}>${h[0].toUpperCase() + h.slice(1)} (g)</label>
          <input id=${"hb-" + h.replace(/\W+/g, "-") + c.id} type="number" min="0" step="100" value=${c.craft.supplies["herb:" + h] ?? 0} onInput=${e => update(x => { x.craft.supplies["herb:" + h] = Math.max(0, +e.target.value || 0); })} /></div>`)}
        <div class="mini ptsup"><label for=${"hb-b" + c.id}>Other bonus (%)</label>
          <input id=${"hb-b" + c.id} type="number" step="1" value=${cb.bonus ?? 0} onInput=${e => update(x => { x.craft.brew.bonus = +e.target.value || 0; })} /></div></div>
    </section>

    <section class="frame"><h2 class="h"><span>Ledger</span><i class="orn" aria-hidden="true"></i></h2>
      <p class="sub">Every brew, newest first. Finished potions go into the inventory with their stats.</p>
      ${cb.ledger.length === 0 ? html`<p class="muted">Nothing brewed yet.</p>` : html`<div class="ptledger">${cb.ledger.map((e, i) => html`<div class=${"pled" + (e.scrap ? " scrap" : "")}>
        <div class="row" style="justify-content:space-between;flex-wrap:nowrap"><b>${e.name}</b>
          <button class="iconbtn" aria-label="Remove this entry" onClick=${() => update(x => { x.craft.brew.ledger.splice(i, 1); })}>×</button></div>
        <span class="muted">${new Date(e.t).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}${e.rolls && e.rolls.length ? " · " + e.rolls.join(" · ") : ""}</span></div>`)}</div>`}
    </section>`;
}
const FLASK_ICON = html`<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 2.5h4 M8.6 2.5v4.2L4.5 15a1.6 1.6 0 0 0 1.4 2.5h8.2a1.6 1.6 0 0 0 1.4-2.5l-4.1-8.3V2.5 M6.4 11.5h7.2" /></svg>`;

function BrewReadout({ run, onClose, onAgain, again }) {
  const [spin, setSpin] = useState(0);
  useEffect(() => {
    if (run.phase !== "rolling" || reduceMotion()) return;
    const t = setInterval(() => setSpin(1 + Math.floor(Math.random() * 100)), 55);
    return () => clearInterval(t);
  }, [run.phase, run.rolls.length]);
  const p = run.plan, r = run.roll;
  if (run.done) {
    const ok = run.phase === "done";
    return html`<div class=${"ptread end " + (ok ? "done" : "scrap")} role="status">
      <p class="ptbig">${ok ? "Brewed" : run.phase === "boom" ? "It exploded!" : run.phase === "inert" ? "It turned inert" : "Spoiled"}</p>
      <p>${ok ? html`<b>${run.result.name}</b>: ${run.result.stats}` : run.phase === "boom" ? `${run.boom} damage to everyone within 2 m. The herbs are gone.` : run.phase === "inert" ? "The Volatile Catalyst fizzled; the brew does nothing. The herbs are gone." : "The roll missed: the herbs are wasted."}</p>
      ${run.vol && html`<p class="muted">Volatile Catalyst: ${run.vol.v}. ${run.vol.text}</p>`}
      ${ok && html`<p class="muted">Toxicity ${run.toxParts && run.toxParts[1] != null ? `${run.toxParts[0]} and ${run.toxParts[1]}` : run.toxParts ? run.toxParts[0] : ""}${p.cat && p.cat.k === "toxicity" ? `, less ${p.st.lvl} (Toxicity Catalyst)` : p.cat && p.cat.k === "duration" ? ", doubled (Duration Catalyst)" : ""} → ${run.tox}. In the inventory now. ${p.hours === 2 ? "Two hours" : "An hour"} at the cauldron.</p>`}
      <div class="row ptagain"><button class="btn primary" disabled=${!!again} onClick=${onAgain}>${ok ? "Brew the same again" : "Try again"}</button>
        <button class="btn" onClick=${onClose}>Back to the cauldron</button></div>
      ${again && html`<p class="muted ptwhy">${again}</p>`}</div>`;
  }
  return html`<div class="ptread" role="status" aria-live="polite">
    <div class="ptstep"><span class="lbl">${p.p ? `Potent Brew · roll ${Math.min(2, run.rolls.length + (r ? 0 : 1))} of 2` : "Brewing check"}</span>
      <b>${run.phase === "steep" ? "Steeping the herbs…" : run.phase === "pour" ? "Pouring…" : `Under ${r ? r.dc : p.dcs[Math.min(run.rolls.length, p.dcs.length - 1)]}%`}</b></div>
    ${run.phase !== "steep" && run.phase !== "pour" && html`<div class=${"ptdice" + (run.phase === "rolling" && !r ? " rolling" : r ? (r.ok ? " ok" : " fail") : "")}>
      <span class="d100">${run.phase === "rolling" && !r ? spin || "··" : r ? r.r : "··"}</span>
      <span class="ptmath">${run.phase === "rolling" && !r ? html`d100 − ${run.mod}` : r && html`${r.r} − ${run.mod} = <b>${r.total}</b> ${r.ok ? "<" : "≥"} ${r.dc}`}</span></div>`}
  </div>`;
}

function BrewSide({ c, st, plan, o, setO, focus, busy, update }) {
  const [adding, setAdding] = useState(false), [addCat, setAddCat] = useState(false);
  const Step = BrStep;
  const all = R.allBrews(c), cb = c.craft.brew;
  const pick = (rec, cur, on, short) => html`<button type="button" class="ptopt" aria-pressed=${cur === rec.k} disabled=${busy} onClick=${on}>
    <b><i class="dot" style=${`background:${brewHue(rec)}`}></i>${rec.n}${rec.custom ? " · GM" : ""}</b>${!short && html`<span>${R.brewOne(c, rec, 0).effect} · ${rec.g} g ${rec.herb} · ${rec.tox} toxicity · ${rec.dc}%</span>`}</button>`;
  let body;
  if (focus === "type") body = html`
    <div class="ptopts">${all.map(rec => pick(rec, o.k, () => setO(x => { x.k = rec.k; })))}</div>
    ${!adding ? html`<button class="btn small" style="margin-top:8px" disabled=${busy} onClick=${() => setAdding(true)}>+ A recipe from the GM</button>` : html`<${RecipeForm} onSave=${r => { update(x => { x.craft.brew.recipes.push(r); x.craft.brew.order.k = r.k; }); setAdding(false); }} onCancel=${() => setAdding(false)} />`}
    ${cb.recipes.length > 0 && html`<p class="muted" style="margin-top:8px">GM recipes: ${cb.recipes.map(r => html`<span class="flag">${r.n} <button class="linkbtn" aria-label=${`Remove ${r.n}`} disabled=${busy} onClick=${() => update(x => { x.craft.brew.recipes = x.craft.brew.recipes.filter(y => y.k !== r.k); if (x.craft.brew.order.k === r.k) x.craft.brew.order.k = "health"; })}>×</button></span> `)}</p>`}
    <h3 class="lbl" style="margin-top:16px">Potent Brew · a second effect</h3>
    ${st.potent ? html`<div class="ptopts brchips"><button type="button" class="ptopt" aria-pressed=${!o.potent} disabled=${busy} onClick=${() => setO(x => { x.potent = null; })}><b>None</b></button>
        ${all.map(rec => pick(rec, o.potent && o.potent.k, () => setO(x => { x.potent = { k: rec.k, inc: x.potent ? num(x.potent.inc) : 0 }; }), true))}</div>
      <p class="muted">Both rolls must hold, and it takes twice as long${st.potentPlus ? ". Increments apply to both." : "."}</p>`
      : html`<p class="ptlocked">Potent Brews unlock at Brewing 7.</p>`}`;
  else if (focus === "av") body = st.incs ? html`
    <div class="row ptrate"><span><b>${plan.a.rec.n} +${plan.a.n}</b> · ${plan.a.effect}</span><${Step} label="increments" busy=${busy} value=${num(o.inc)} max=${10} onSet=${v => setO(x => { x.inc = v; })} /></div>
    <p class="ptdc">Each increment: +${plan.a.rec.gi} g, +${plan.a.rec.toxi} toxicity, −${plan.a.dci}% difficulty (${plan.a.rec.dci}% less your Brewing)</p>
    ${plan.p && !st.potentPlus && html`<div class="row ptrate"><span><b>${plan.p.rec.n} +${plan.p.n}</b> · ${plan.p.effect}</span><${Step} label="second brew increments" busy=${busy} value=${num(o.potent.inc)} max=${10} onSet=${v => setO(x => { x.potent = Object.assign({}, x.potent, { inc: v }); })} /></div>`}`
    : html`<p class="ptlocked">Increments unlock at Brewing 5.</p>`;
  else if (focus === "soak") body = html`<p class="muted ptrule">What this brew takes, against what you carry.</p>
    <ol class="brneed">${Object.entries(plan.need).map(([h, g]) => html`<li><span>${g} g of ${h}</span><span class="muted">have ${num(c.craft.supplies["herb:" + h])} g</span></li>`)}</ol>`;
  else body = !st.catalysts ? html`<p class="ptlocked">Catalysts unlock at Brewing 5.</p>` : html`
    <p class="muted ptrule">You know ${st.known} catalyst${st.known > 1 ? "s" : ""}. Tick the ones you know, then pick one for this brew.</p>
    <div class="ptopts">${R.allCatalysts(c).map(k => { const known = cb.known.includes(k.k), full = !known && cb.known.length >= st.known;
      return html`<div class=${"ptopt row-opt" + (o.catalyst === k.k ? " on" : "")}>
        <button type="button" class="ptcheck" disabled=${busy || !known} onClick=${() => setO(x => { x.catalyst = x.catalyst === k.k ? "" : k.k; })}><b>${k.n}${k.custom ? " · GM" : ""} · −${Math.max(0, k.dc - st.lvl)}%</b><span>${k.what || "The GM decides what it does."}</span></button>
        <label class="brknown"><input type="checkbox" checked=${known} disabled=${busy || full} onChange=${e => update(x => { const on = e.target.checked; x.craft.brew.known = on ? [...x.craft.brew.known, k.k] : x.craft.brew.known.filter(y => y !== k.k); if (!on && x.craft.brew.order.catalyst === k.k) x.craft.brew.order.catalyst = ""; })} /> Known</label>
        ${k.custom && html`<button class="iconbtn brdel" aria-label=${`Remove ${k.n}`} disabled=${busy} onClick=${() => update(x => { x.craft.brew.catalysts = x.craft.brew.catalysts.filter(y => y.k !== k.k); x.craft.brew.known = x.craft.brew.known.filter(y => y !== k.k); if (x.craft.brew.order.catalyst === k.k) x.craft.brew.order.catalyst = ""; })}>×</button>`}</div>`; })}</div>
    ${!addCat ? html`<button class="btn small" style="margin-top:8px" disabled=${busy} onClick=${() => setAddCat(true)}>+ A catalyst from the GM</button>`
      : html`<${CatalystForm} onSave=${k => { update(x => { x.craft.brew.catalysts.push(k); }); setAddCat(false); }} onCancel=${() => setAddCat(false)} />`}`;
  return html`<div class="ptpick">
    <h3 class="ptpickh"><span>${BR_NAMES[focus]}</span></h3>
    <div class="ptbody" key=${focus}>${body}</div>
    <div class="ptplan"><${PlanHead} title="The brew" busy=${busy} onReset=${() => setO(x => refill(x, R.blankCharacter().craft.brew.order))} /><ol>
      ${[plan.a, plan.p].filter(Boolean).map((b, i) => html`<li><span>${b.rec.n}${b.n ? ` +${b.n}` : ""}: roll under ${plan.dcs[i]}%</span><span class="muted">${plan.chances[i]}% to hold · ${b.effect} · toxicity ${b.tox.map(d => `${d.n}d${d.sides}`).join(" + ")}</span></li>`)}
      <li><span>${plan.hours === 2 ? "Two hours" : "An hour"} at the cauldron</span><span class="muted">${plan.a.rec.how || "The GM decides how the effect works."}</span></li></ol></div>
  </div>`;
}

function BrStep({ label, value, max, onSet, busy }) {
  return html`<span class="ptstepper"><button class="iconbtn" aria-label=${`Lower ${label}`} disabled=${busy || value <= 0} onClick=${() => onSet(value - 1)}>−</button>
    <button class="iconbtn" aria-label=${`Raise ${label}`} disabled=${busy || value >= max} onClick=${() => onSet(value + 1)}>+</button></span>`;
}
// A catalyst the GM gives: a name, its difficulty (your Brewing is taken off, like the book's) and what it does.
function CatalystForm({ onSave, onCancel }) {
  const [k, setK] = useState({ n: "", dc: 10, what: "" });
  const ok = k.n.trim();
  return html`<div class="brform">
    <div class="grid2"><div class="mini"><label for="cf-n">Name</label><input id="cf-n" type="text" value=${k.n} placeholder="Frost Catalyst" onInput=${e => setK(Object.assign({}, k, { n: e.target.value }))} /></div>
      <div class="mini"><label for="cf-dc">Difficulty (%, less your Brewing)</label><input id="cf-dc" type="number" min="0" value=${k.dc} onInput=${e => setK(Object.assign({}, k, { dc: Math.max(0, +e.target.value || 0) }))} /></div></div>
    <div class="mini"><label for="cf-w">What it does</label><input id="cf-w" type="text" value=${k.what} placeholder="The brew also chills the drinker's blood: fire damage halved for an hour." onInput=${e => setK(Object.assign({}, k, { what: e.target.value }))} /></div>
    <div class="row" style="margin-top:8px"><button class="btn small primary" disabled=${!ok} onClick=${() => onSave({ k: "x" + rid(), n: k.n.trim(), dc: k.dc, what: k.what.trim() })}>Save catalyst</button>
      <button class="btn small" onClick=${onCancel}>Cancel</button></div></div>`;
}

// A recipe the GM gives: the same fields as the book's.
function RecipeForm({ onSave, onCancel }) {
  const [r, setR] = useState({ n: "", herb: "", effect: "", effecti: "", g: 300, gi: 100, tox: "1d6", toxi: "1d4", dc: 50, dci: 13, how: "" });
  const f = (k, label, type = "text", ph = "") => html`<div class="mini"><label for=${"rf-" + k}>${label}</label>
    <input id=${"rf-" + k} type=${type} value=${r[k]} placeholder=${ph} onInput=${e => setR(Object.assign({}, r, { [k]: type === "number" ? +e.target.value || 0 : e.target.value }))} /></div>`;
  const ok = r.n.trim() && r.herb.trim() && R.parseDie(r.tox);
  return html`<div class="brform">
    <div class="grid2">${f("n", "Name", "text", "Night-eye Draught")}${f("herb", "Herbs", "text", "moon herbs")}${f("effect", "Effect", "text", "See in the dark")}${f("effecti", "Per increment", "text", "+1 hour")}
      ${f("g", "Herbs (g)", "number")}${f("gi", "+ per increment (g)", "number")}${f("tox", "Toxicity die", "text", "1d6")}${f("toxi", "+ per increment", "text", "1d4")}
      ${f("dc", "Difficulty (%)", "number")}${f("dci", "Per increment (% less your Brewing)", "number")}</div>
    ${f("how", "How it works", "text", "Takes effect at once, for an hour.")}
    <div class="row" style="margin-top:8px"><button class="btn small primary" disabled=${!ok} onClick=${() => onSave(Object.assign({}, r, { k: "c" + rid(), n: r.n.trim(), herb: r.herb.trim().toLowerCase() }))}>Save recipe</button>
      <button class="btn small" onClick=${onCancel}>Cancel</button></div></div>`;
}
