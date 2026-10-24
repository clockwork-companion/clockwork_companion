/* ================= crafting: runecrafting ================= */
// The rulebook's Runecrafting (16.3): a gem hovering over a ritual slab inside a circle of carved runes, two candles,
// a bowl of materials and a chisel. Pick the gem, the effect (enhancing or manifesting) and the materials; from
// Runecrafting 6 a Hoaxstone (a mundane object, paid for in life force), from 7 a second effect (a Potent Runestone).
// The ritual draws the materials into the gem, the runes light one by one while the d100 rolls, then a rune is
// carved into the gem (or the circle goes dark; a failed Potent Runestone shatters the gem).
const RN_LABELS = { type: ["l", 140], av: ["r", 170], soak: ["l", 330], extra: ["r", 290] };
const RN_ANCHOR = { type: [146, 232], av: [214, 232], soak: [76, 396], extra: [268, 336] };
const RN_NAMES = { type: "Vessel", av: "Effect", soak: "Materials", extra: "Second effect" };
// Ten runes of the elder futhark, as strokes in a 7 × 14 box.
const RUNES = ["M0 14V0M0 4L7 0M0 8L7 4", "M0 14V0L7 4V14", "M0 0V14M0 4L6 7L0 10", "M0 14V0M0 3L6 6M0 7L6 10", "M0 14V0L6 3L0 7L6 14",
  "M7 0L0 7L7 14", "M0 0L7 14M7 0L0 14", "M0 14V0L6 3L0 7", "M0 0V14M7 0V14M0 5L7 9", "M3.5 0V14M0 5L7 9"];
const GEM_OUT = [[180, 222], [214, 232], [228, 262], [214, 292], [180, 302], [146, 292], [132, 262], [146, 232]];
const GEM_IN = GEM_OUT.map(([x, y]) => [180 + (x - 180) * .48, 262 + (y - 262) * .48]);
const pts = a => a.map(p => p.join(" ")).join(" ");
const PAY_HUE = { hp: "#c8303a", bp: "#6e0d1a", dp: "#d29a3a" };

function RuneScene({ plan, run, labels, focus, onPick }) {
  const ph = run && run.phase, lit = run ? run.lit || 0 : 0;
  const hue = plan.hoax ? "#8d8a80" : plan.g.hue;
  const cls = "ptmun rnmun" + (ph === "ritual" ? " ritual" : "") + (ph === "rolling" ? " rolling" : "") + (ph === "bound" ? " bound" : "") +
    (ph === "failed" ? " failed" : "") + (ph === "shatter" ? " shatter" : "") + (plan.hoax ? " hoax" : "");
  const ring = RUNES.map((d, i) => { const a = Math.PI * (0.5 + (2 * i) / RUNES.length); return [180 + 104 * Math.cos(a), 340 + 22 * Math.sin(a), d, i]; });
  return html`<div class=${cls}>
    <svg class="ptsvg" viewBox="0 0 360 460" role="img" aria-label=${plan.hoax ? "A mundane stone above a ritual slab ringed with runes" : "A gem above a ritual slab ringed with runes, between two candles"}>
      <defs>
        <radialGradient id="rn-halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color=${hue} stop-opacity=".55" /><stop offset="1" stop-color=${hue} stop-opacity="0" /></radialGradient>
        <linearGradient id="rn-slab" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#77736b" /><stop offset="1" stop-color="#3b3833" /></linearGradient>
        <linearGradient id="rn-face" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4740" /><stop offset="1" stop-color="#25231f" /></linearGradient>
        <linearGradient id="rn-table" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55" /><stop offset=".5" stop-color="#fff" stop-opacity=".05" /><stop offset="1" stop-color="#000" stop-opacity=".2" /></linearGradient>
        <linearGradient id="rn-wax" x1="0" x2="1"><stop offset="0" stop-color="#cdbf9c" /><stop offset=".5" stop-color="#f4ead0" /><stop offset="1" stop-color="#b8aa86" /></linearGradient>
        <radialGradient id="rn-flame" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="#fff6c8" /><stop offset=".5" stop-color="#ffb347" /><stop offset="1" stop-color="#ff7a2a" stop-opacity="0" /></radialGradient>
      </defs>
      <!-- the slab -->
      <path d="M58 340 L302 340 L290 388 L70 388 Z" fill="url(#rn-face)" />
      <ellipse cx="180" cy="340" rx="124" ry="30" fill="url(#rn-slab)" stroke="#1f1d1a" stroke-width="1.2" />
      <path d="M86 380 l10 -14 M262 384 l-8 -12 M150 386 l6 -9" stroke="#1a1916" stroke-width="1.2" fill="none" opacity=".6" />
      <ellipse class="rn-circle" cx="180" cy="340" rx="104" ry="22" fill="none" stroke=${hue} stroke-width="1.4" stroke-dasharray="3 5" />
      <g class="rn-ring">${ring.map(([x, y, d, i]) => html`<path class=${"rn-glyph" + (i < lit ? " on" : "")} transform=${`translate(${(x - 3.5).toFixed(1)} ${(y - 7).toFixed(1)})`} d=${d} stroke=${i < lit ? hue : "#211f1b"} />`)}</g>
      <!-- candles -->
      ${[[120, 306], [228, 302]].map(([x, top], i) => html`<g class="rn-candle"><rect x=${x} y=${top} width="12" height=${336 - top} rx="2" fill="url(#rn-wax)" />
        <path d=${`M${x + 2} ${top + 2} q3 8 1 16`} stroke="#e8dcb8" stroke-width="2" fill="none" /><path d=${`M${x + 6} ${top} v-6`} stroke="#2a2a2a" stroke-width="1.2" />
        <ellipse class="rn-flame" style=${`--d:${i * 0.4}s`} cx=${x + 6} cy=${top - 12} rx="5" ry="10" fill="url(#rn-flame)" /></g>`)}
      <!-- the bowl of materials (or the life force for a Hoaxstone) -->
      <g class="rn-bowl"><path d="M44 384 Q48 410 76 412 Q104 410 108 384 Z" fill="#5a4630" stroke="#2c2015" stroke-width="1.2" />
        <ellipse cx="76" cy="384" rx="32" ry="7" fill="#2c2015" />
        ${plan.hoax ? html`<ellipse cx="76" cy="385" rx="27" ry="5" fill=${PAY_HUE[plan.pay]} />`
          : html`${[[62, 381, "#7fae5a"], [72, 379, "#c9a447"], [84, 381, "#8a5cd0"], [92, 383, "#5ba3c9"], [68, 385, "#a3824f"]].map(([x, y, f]) => html`<circle cx=${x} cy=${y} r="3.6" fill=${f} />`)}`}</g>
      <g class="rn-motes">${[0, 1, 2, 3, 4, 5].map(i => html`<circle cx="76" cy="380" r="2.6" fill=${plan.hoax ? PAY_HUE[plan.pay] : "#f2e3a6"} style=${`--d:${i * 0.22}s`} />`)}</g>
      <!-- chisel and mallet -->
      <g class="rn-tools"><rect x="236" y="404" width="54" height="5" rx="2" fill="#8e9298" transform="rotate(-8 263 406)" /><rect x="282" y="398" width="22" height="9" rx="2" fill="url(#rn-wax)" transform="rotate(-8 293 402)" />
        <rect x="212" y="414" width="44" height="7" rx="3" fill="#6b4422" /><rect x="252" y="408" width="18" height="18" rx="3" fill="#3f2a16" /></g>
      <!-- the vessel -->
      <ellipse class="rn-halo" cx="180" cy="262" rx="88" ry="88" fill="url(#rn-halo)" />
      <g class="rn-gem">
        ${plan.hoax ? html`<path d="M140 270 C136 238 168 222 192 226 C220 230 230 252 224 274 C218 296 190 304 166 298 C150 294 142 284 140 270 Z" fill="#8d8a80" stroke="#3d3b36" stroke-width="1.5" />
            <path d="M156 246 q14 -12 34 -8" stroke="#fff" stroke-opacity=".3" stroke-width="4" fill="none" stroke-linecap="round" />`
          : html`<polygon points=${pts(GEM_OUT)} fill=${hue} stroke="#111" stroke-opacity=".45" stroke-width="1.2" />
            ${GEM_OUT.map((p, i) => { const q = GEM_OUT[(i + 1) % 8], a = GEM_IN[i], b = GEM_IN[(i + 1) % 8];
              return html`<polygon points=${pts([p, q, b, a])} fill=${i < 3 || i === 7 ? "#fff" : "#000"} fill-opacity=${[0.32, 0.18, 0.06, 0.16, 0.3, 0.22, 0.1, 0.4][i]} />`; })}
            <polygon points=${pts(GEM_IN)} fill=${hue} /><polygon points=${pts(GEM_IN)} fill="url(#rn-table)" />`}
        <path class="rn-carve" transform="translate(173.5 253)" d=${RUNES[run && run.glyph != null ? run.glyph : 0]} stroke="#fff8dc" />
        <g class="rn-cracks"><path d="M180 222 L174 248 L186 262 L176 286 L182 302 M146 232 L172 252 M214 292 L188 268" stroke="#120f0c" stroke-width="1.6" fill="none" /></g>
      </g>
      <g class="rn-shards">${[[-40, -30], [36, -38], [48, 18], [-46, 24], [6, 46], [-8, -52]].map(([x, y], i) => html`<polygon style=${`--x:${x}px;--y:${y}px`} points=${`${176 + i * 2} 256 ${190 - i} 262 ${182} 274`} fill=${hue} />`)}</g>
      <g class="ptsparks burst rn-burst" transform="translate(180 262)">${ph === "bound" && Array.from({ length: 12 }, (_, i) => html`<line x1="0" y1="0" x2="0" y2="-12" style=${`--a:${i * 30}deg;--d:0ms`} />`)}</g>
      <g class="rn-smoke">${[0, 1, 2].map(i => html`<circle cx=${64 + i * 12} cy="376" r=${10 + i * 3} style=${`--d:${i * 200}ms`} />`)}</g>
      <g class="ptlines">${Object.keys(RN_LABELS).map(p => { const [side, ly] = RN_LABELS[p], [ax, ay] = RN_ANCHOR[p], lx = side === "l" ? 112 : 248;
        return html`<g class=${"ptline" + (focus === p ? " on" : "")}><path d=${`M${lx} ${ly} H${side === "l" ? lx + 12 : lx - 12} L${ax} ${ay}`} /><circle cx=${ax} cy=${ay} r="3.6" /></g>`; })}</g>
    </svg>
    ${Object.keys(RN_LABELS).map(p => { const [side, ly] = RN_LABELS[p];
      return html`<button type="button" class=${"ptlabel " + side + (focus === p ? " on" : "")} style=${`top:${(ly / 460) * 100}%`} disabled=${!!run} aria-pressed=${focus === p} onClick=${() => onPick(p)}>
        <span class="k">${p === "extra" && plan.hoax ? "Hoaxstone" : RN_NAMES[p]}</span><span class="v">${labels[p]}</span></button>`; })}
  </div>`;
}

function Runecrafting({ c, update }) {
  const st = R.runeState(c), cr = c.craft.rune, o = cr.order;
  const [focus, setFocus] = useState("type");
  const [run, setRunState] = useState(null);
  const runRef = useRef(null), timers = useRef([]), choice = useRef(null);
  const setRun = r => { runRef.current = r; setRunState(r); };
  const patch = p => { const r = runRef.current; if (r) setRun(Object.assign({}, r, typeof p === "function" ? p(r) : p)); };
  const later = (fn, ms) => timers.current.push(setTimeout(fn, reduceMotion() ? Math.min(ms, 90) : ms));
  const wait = ms => new Promise(res => later(res, ms));
  const stop = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => stop(), []);
  useEffect(() => { stop(); setRun(null); }, [c.id]);
  const busy = !!run && !run.done;
  const plan = R.runePlan(c, o);
  const setO = fn => update(x => fn(x.craft.rune.order));
  const d100 = (title, note, cancel) => askRoll({ title, dice: [{ n: 1, sides: 100 }], cancel, note });
  const judge = (e, r) => { const total = r - plan.mod;
    if (e.kind === "manifest") return { r, total, ok: total < e.dc, dc: e.dc };
    const p = R.runePotency(total, plan.semi); return { r, total, ok: !!p.pot, pot: p.pot, capped: p.capped }; };

  /* ---------- the ritual: materials in, one check per effect (with the level 8 re-roll), potency, the rune carved ---------- */
  const start = async () => {
    if (plan.block) return;
    const p = plan;
    const first = await d100(p.effects.length > 1 ? `Runecrafting check: ${p.effects[0].effect}` : "Runecrafting check",
      `d100 − ${p.mod}. ${p.effects[0].kind === "manifest" ? `Under ${p.effects[0].dc} holds.` : "Under 30 holds; lower is stronger."}${p.hoax ? " The life force is paid either way." : " A failure loses the materials."}`, true);
    if (!first) return;
    setRun({ phase: "ritual", plan: p, lit: 0, rolls: [], rerolled: false, glyph: Math.floor(Math.random() * RUNES.length) });
    for (let i = 1; i <= 4; i++) { await wait(320); patch({ lit: i }); }
    const res = [];
    for (let i = 0; i < p.effects.length; i++) {
      const e = p.effects[i];
      let r = i === 0 ? first[0] : (await d100(`Runecrafting check: ${e.effect}`, `d100 − ${p.mod}. ${e.kind === "manifest" ? `Under ${e.dc} holds.` : "Under 30 holds."} If either fails, both effects and the gem are lost.`))[0];
      if (!runRef.current) return;
      patch({ phase: "rolling", roll: null, step: i });
      for (let k = 5; k <= 10; k++) { await wait(200); patch({ lit: k }); }
      let j = judge(e, r);
      patch(g => ({ roll: j }));
      await wait(600);
      // Runecrafting 8: once per gemstone, roll again (the materials are lost and paid again; the new roll stands).
      const f = runRef.current;
      if (st.reroll && !p.hoax && !f.rerolled && num(c.craft.supplies.runemat) >= 2 * p.spend) {
        patch({ choose: true });
        const again = await new Promise(res2 => (choice.current = res2));
        patch({ choose: false });
        if (again) {
          r = (await d100("Runecrafting check, again", `The first materials are gone. This roll stands. d100 − ${p.mod}.`))[0];
          patch({ rerolled: true, phase: "rolling", roll: null, lit: 4 });
          for (let k = 5; k <= 10; k++) { await wait(160); patch({ lit: k }); }
          j = judge(e, r); patch({ roll: j }); await wait(600);
        }
      }
      res.push(Object.assign({ e }, j));
      patch(g => ({ rolls: [...g.rolls, Object.assign({ e }, j)] }));
      if (!j.ok) return finish(false, res);
    }
    // potency for enhancing effects: a die from the table, or a flat 12 or 1
    for (const x of res) {
      if (x.e.kind !== "enhance") continue;
      const die = R.parseDie(x.pot.replace(/^d/, "1d"));
      x.val = die ? (await askRoll({ title: `Potency: ${x.e.effect}`, dice: [{ n: 1, sides: die.sides }], note: `The table gave ${x.pot}${x.capped ? ` (a ${x.capped}, held to d6 by a semi-precious gem)` : ""}.` }))[0] : +x.pot;
    }
    finish(true, res);
  };
  const finish = (ok, res) => {
    const f = runRef.current; if (!f) return;
    const p = f.plan, spent = p.spend * (f.rerolled ? 2 : 1);
    const desc = res.map(x => x.e.kind === "enhance" ? `${x.e.effect}${x.e.note ? ` (${x.e.note})` : ""}, potency ${x.val} (${x.pot})` : `${x.e.effect} (manifesting${x.e.note ? `: ${x.e.note}` : ""})`).join(" & ");
    const vessel = p.hoax ? `Hoaxstone (${p.name})` : `Runestone (${p.name}, ${p.precious ? "precious" : "semi-precious"})`;
    const name = `${vessel}: ${desc}${p.hoax ? ` · lasts ${p.lasts} hour${p.lasts > 1 ? "s" : ""}` : ""}`;
    const what = p.effects.map(e => e.effect).join(" & ");
    update(x => {
      if (spent) x.craft.supplies.runemat = Math.max(0, num(x.craft.supplies.runemat) - spent);
      if (p.hoax) x.vitals[p.pay] = Math.max(0, R.derived(x).cur[p.pay] - p.life);
      if (ok) x.items.push({ id: rid(), name, qty: 1, size: "small" });
      x.craft.rune.ledger = [{ id: rid(), t: Date.now(), name: ok ? `Made ${name}` : `${p.hoax ? "Hoaxstone" : p.name} (${what}) failed${p.second ? "; the gem shattered" : ""}`, scrap: !ok,
        rolls: f.rolls.map(r => `${r.r}−${p.mod}=${r.total}${r.e.kind === "manifest" ? ` vs ${r.dc}` : ""} ${r.ok ? "✓" : "✗"}`).concat(f.rerolled ? ["re-rolled"] : [], spent ? [`${spent} rubles of materials`] : [], p.hoax ? [`${p.life} ${p.payName}`] : []) },
        ...x.craft.rune.ledger].slice(0, 20);
      addLog(x, ok ? `Runecrafting: ${name}` : `Runecrafting: ${what} failed${spent ? `; ${spent} rubles of materials lost` : ""}${p.hoax ? `; ${p.life} ${p.payName} paid` : ""}`);
    });
    patch({ done: true, phase: ok ? "bound" : p.second ? "shatter" : "failed", lit: ok ? 10 : 0, result: ok ? { name, desc, res } : null, spent });
  };
  const close = () => { stop(); setRun(null); };
  const pick = again => { const r = choice.current; choice.current = null; if (r) r(again); };

  const e0 = plan.effects[0];
  const labels = { type: plan.hoax ? plan.name : `${plan.name}${plan.g.k === "other" || plan.precious ? (plan.precious ? " · precious" : " · semi-precious") : ""}`,
    av: e0.effect ? `${e0.effect} · ${e0.kind === "manifest" ? `under ${e0.dc}` : "enhancing"}` : "Not set",
    soak: plan.hoax ? `${plan.life} ${plan.payName}` : `${plan.cost} rubles${plan.extra ? ` + ${plan.extra}` : ""}`,
    extra: plan.hoax ? `Lasts ${plan.lasts} h` : plan.second ? plan.effects[1].effect || "Not set" : st.potent ? "None" : "Runecrafting 7" };

  return html`
    <section class="frame rnbench">
      <${Head} title="Runecrafting" topic="runecrafting" />
      <p class="sub">Pick the gem and the effect the GM agreed, then hold the ritual. An enhancing stone's roll sets its strength; a manifesting stone just has to beat the GM's difficulty.</p>
      <div class="facts ptfacts">${[["Runecrafting", `${st.lvl}${st.lvl < 4 ? " · can't enchant yet" : ""}`], ["Modifier", `${plan.mod}%${plan.extraPct ? ` (+${plan.extraPct} extra)` : ""}`],
        ["Gems", st.precious ? "Precious and semi-precious" : st.semi ? "Semi-precious" : "From level 4"], ["Time", `${plan.hours} hours`]].map(([k, v]) => html`<div class="fact"><span>${k}</span><b>${v}</b></div>`)}</div>
      <div class="ptgrid">
        <div class="ptstage">
          <${RuneScene} plan=${run ? run.plan : plan} run=${run} labels=${labels} focus=${focus} onPick=${setFocus} />
          <div class="ptforge">
            ${!run && html`<button class="btn primary big forgebtn" disabled=${!!plan.block} onClick=${start}>${RUNE_ICON}${plan.hoax ? "Make the Hoaxstone" : plan.second ? "Enchant a Potent Runestone" : "Enchant"} · ${plan.hours} hours</button>
              ${plan.block && html`<p class="muted ptwhy">${plan.block}</p>`}`}
            ${run && html`<${RuneReadout} run=${run} onClose=${close} onPick=${pick} again=${plan.block || ""} onAgain=${() => { close(); start(); }} />`}
          </div>
        </div>
        <div class="ptside"><${RuneSide} c=${c} st=${st} plan=${plan} o=${o} setO=${setO} focus=${focus} busy=${busy} update=${update} /></div>
      </div>
      ${(st.identify || st.extract || st.sage) && html`<p class="muted rnalso">Also, without a roll: ${[st.identify && "identify a runestone you find (an hour)", st.extract && "take a rune out of an item without ruining either",
        st.sage && "move an enchantment between runestones, or merge two into a Potent Runestone"].filter(Boolean).join("; ")}.</p>`}
    </section>

    <section class="frame"><h2 class="h"><span>Materials</span><i class="orn" aria-hidden="true"></i></h2>
      <p class="sub">What your materials are worth, in rubles (herbs, monster parts, small gems, ointments). Appraising a gem tells you what its enchantment costs. You also need a runecrafting kit.</p>
      <div class="ptsupplies"><div class="mini ptsup"><label for=${"rn-m" + c.id}>Materials (rubles)</label>
          <input id=${"rn-m" + c.id} type="number" min="0" step="50" value=${c.craft.supplies.runemat ?? 0} onInput=${e => update(x => { x.craft.supplies.runemat = Math.max(0, +e.target.value || 0); })} /></div>
        <div class="mini ptsup"><label for=${"rn-b" + c.id}>Other bonus (%)</label>
          <input id=${"rn-b" + c.id} type="number" step="1" value=${cr.bonus ?? 0} onInput=${e => update(x => { x.craft.rune.bonus = +e.target.value || 0; })} /></div></div>
    </section>

    <section class="frame"><h2 class="h"><span>Ledger</span><i class="orn" aria-hidden="true"></i></h2>
      <p class="sub">Every enchantment, newest first. Finished stones go into the inventory with their stats.</p>
      ${cr.ledger.length === 0 ? html`<p class="muted">Nothing enchanted yet.</p>` : html`<div class="ptledger">${cr.ledger.map((e, i) => html`<div class=${"pled" + (e.scrap ? " scrap" : "")}>
        <div class="row" style="justify-content:space-between;flex-wrap:nowrap"><b>${e.name}</b>
          <button class="iconbtn" aria-label="Remove this entry" onClick=${() => update(x => { x.craft.rune.ledger.splice(i, 1); })}>×</button></div>
        <span class="muted">${new Date(e.t).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}${e.rolls && e.rolls.length ? " · " + e.rolls.join(" · ") : ""}</span></div>`)}</div>`}
    </section>`;
}
const RUNE_ICON = html`<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5 16 7.5 10 17.5 4 7.5Z M4 7.5h12 M8 3.8v13.7 M8 7.5l4 4" /></svg>`;

function RuneReadout({ run, onClose, onPick, onAgain, again }) {
  const [spin, setSpin] = useState(0);
  useEffect(() => {
    if (run.phase !== "rolling" || run.roll || reduceMotion()) return;
    const t = setInterval(() => setSpin(1 + Math.floor(Math.random() * 100)), 55);
    return () => clearInterval(t);
  }, [run.phase, run.roll]);
  const p = run.plan, r = run.roll, e = p.effects[run.step || 0];
  if (run.done) {
    const ok = !!run.result;
    return html`<div class=${"ptread end " + (ok ? "done" : "scrap")} role="status">
      <p class="ptbig">${ok ? (p.hoax ? "Hoaxstone made" : "Rune bound") : run.phase === "shatter" ? "The gem shattered" : "The ritual failed"}</p>
      <p>${ok ? html`<b>${p.hoax ? "Hoaxstone" : p.name}</b>: ${run.result.desc}` : run.phase === "shatter" ? "One roll missed, so both effects, the gem and the materials are lost." : p.hoax ? "The roll missed. The object stays mundane." : "The roll missed. The materials are spent; the gem is still yours."}</p>
      <p class="muted">${[run.spent && `${run.spent} rubles of materials used${run.spent > p.spend ? " (re-rolled)" : ""}`, p.hoax && `${p.life} ${p.payName} paid`,
        ok && p.hoax && `It crumbles after ${p.lasts} hour${p.lasts > 1 ? "s" : ""}`, ok && "In the inventory now", `${p.hours} hours of work`].filter(Boolean).join(". ")}.</p>
      <div class="row ptagain"><button class="btn primary" disabled=${!!again} onClick=${onAgain}>${ok ? (p.hoax ? "Make another the same way" : "Enchant another the same way") : "Try again"}</button>
        <button class="btn" onClick=${onClose}>Back to the slab</button></div>
      ${again && html`<p class="muted ptwhy">${again}</p>`}</div>`;
  }
  const verdict = r && (e.kind === "manifest" ? `${r.r} − ${p.mod} = ${r.total} ${r.ok ? "<" : "≥"} ${r.dc}` : `${r.r} − ${p.mod} = ${r.total} → ${r.ok ? `potency ${r.pot}${r.capped ? ` (held from ${r.capped})` : ""}` : "30 or more: fails"}`);
  return html`<div class="ptread" role="status" aria-live="polite">
    <div class="ptstep"><span class="lbl">${p.effects.length > 1 ? `Potent Runestone · effect ${(run.step || 0) + 1} of 2` : p.hoax ? "Hoaxstone" : "Runecrafting check"}</span>
      <b>${run.phase === "ritual" ? (p.hoax ? "Paying the life force…" : "Drawing in the materials…") : e.kind === "manifest" ? `Under ${e.dc}` : "Under 30"}</b></div>
    ${run.phase !== "ritual" && html`<div class=${"ptdice" + (!r ? " rolling" : r.ok ? " ok" : " fail")}>
      <span class="d100">${!r ? spin || "··" : r.r}</span><span class="ptmath">${!r ? html`d100 − ${p.mod}` : verdict}</span></div>`}
    ${run.choose && html`<div class="row rnchoose"><span class="muted">Runecrafting 8: roll again? The materials (${p.spend} rubles) are lost and paid again, and the new roll stands.</span>
      <button class="btn small primary" onClick=${() => onPick(false)}>Keep this roll</button><button class="btn small" onClick=${() => onPick(true)}>Roll again</button></div>`}
  </div>`;
}

function RuneEffect({ e, set, label, busy, cid }) {
  return html`<div class="rneff">
    <div class="seg two ammode" role="group" aria-label=${`${label}: kind of stone`}>${[["enhance", "Enhancing"], ["manifest", "Manifesting"]].map(([k, n]) => html`<button type="button" aria-pressed=${(e.kind || "enhance") === k} disabled=${busy} onClick=${() => set({ kind: k })}>${n}</button>`)}</div>
    <div class="mini"><label for=${"rn-e-" + label.replace(/\W+/g, "") + cid}>${label}</label><input id=${"rn-e-" + label.replace(/\W+/g, "") + cid} type="text" value=${e.effect || ""} disabled=${busy} placeholder=${(e.kind || "enhance") === "manifest" ? "Glows like a lantern, 3 times a day" : "Stealth"} onInput=${ev => set({ effect: ev.target.value, note: "" })} /></div>
    ${e.note && html`<p class="muted ptrule">${e.note}</p>`}
    ${e.kind === "manifest" && html`<div class="mini"><label for=${"rn-d-" + label.replace(/\W+/g, "") + cid}>Difficulty from the GM (%)</label><input id=${"rn-d-" + label.replace(/\W+/g, "") + cid} type="number" min="1" max="100" value=${e.dc} disabled=${busy} onInput=${ev => set({ dc: +ev.target.value || 0 })} /></div>`}
  </div>`;
}

// Effects the GM gave, saved for later (like Brewing's GM recipes): pick one to fill in an effect.
function RuneLibrary({ c, busy, update, slot, canPick = true }) {
  const [adding, setAdding] = useState(false);
  const put = (x, f) => { const o = x.craft.rune.order, v = { effect: f.n, kind: f.kind, dc: f.kind === "manifest" ? f.dc : 50, note: [f.uses, f.what].filter(Boolean).join(". ") };
    if (slot === "second") o.second = Object.assign({}, o.second, v); else Object.assign(o, v); };
  const list = c.craft.rune.effects;
  return html`<div class="rnlib">
    ${list.length > 0 && html`<h3 class="lbl">Saved effects</h3><div class="ptopts">${list.map(f => html`<div class="ptopt row-opt">
      <button type="button" class="ptcheck" disabled=${busy || !canPick} onClick=${() => update(x => put(x, f))}>
        <b>${f.n} · ${f.kind === "manifest" ? `manifesting, under ${f.dc}%` : "enhancing"}</b><span>${[f.uses, f.what].filter(Boolean).join(". ") || "No notes."}</span></button>
      <button class="iconbtn brdel" aria-label=${`Remove ${f.n}`} disabled=${busy} onClick=${() => update(x => { x.craft.rune.effects = x.craft.rune.effects.filter(y => y.k !== f.k); })}>×</button></div>`)}</div>`}
    ${!adding ? html`<button class="btn small" style="margin-top:8px" disabled=${busy} onClick=${() => setAdding(true)}>+ A custom effect</button>`
      : html`<${EffectForm} onSave=${f => { update(x => { x.craft.rune.effects.push(f); if (canPick) put(x, f); }); setAdding(false); }} onCancel=${() => setAdding(false)} />`}
  </div>`;
}
function EffectForm({ onSave, onCancel }) {
  const [f, setF] = useState({ n: "", kind: "enhance", dc: 50, uses: "", what: "" });
  const set = v => setF(Object.assign({}, f, v));
  const ok = f.n.trim() && (f.kind !== "manifest" || f.dc > 0);
  return html`<div class="brform">
    <div class="seg two ammode" role="group" aria-label="Kind of effect">${[["enhance", "Enhancing"], ["manifest", "Manifesting"]].map(([k, n]) => html`<button type="button" aria-pressed=${f.kind === k} onClick=${() => set({ kind: k })}>${n}</button>`)}</div>
    <div class="grid2"><div class="mini"><label for="ef-n">Name</label><input id="ef-n" type="text" value=${f.n} placeholder=${f.kind === "manifest" ? "Lantern light" : "Stealth"} onInput=${e => set({ n: e.target.value })} /></div>
      ${f.kind === "manifest" ? html`<div class="mini"><label for="ef-dc">Difficulty from the GM (%)</label><input id="ef-dc" type="number" min="1" max="100" value=${f.dc} onInput=${e => set({ dc: +e.target.value || 0 })} /></div>`
        : html`<div class="mini"><label for="ef-u">What it raises</label><input id="ef-u" type="text" value=${f.uses} placeholder="+potency to Stealth checks" onInput=${e => set({ uses: e.target.value })} /></div>`}</div>
    ${f.kind === "manifest" && html`<div class="mini"><label for="ef-u2">How often</label><input id="ef-u2" type="text" value=${f.uses} placeholder="3 times a day" onInput=${e => set({ uses: e.target.value })} /></div>`}
    <div class="mini"><label for="ef-w">What it does</label><input id="ef-w" type="text" value=${f.what} placeholder="Glows like a lantern for an hour when touched." onInput=${e => set({ what: e.target.value })} /></div>
    <div class="row" style="margin-top:8px"><button class="btn small primary" disabled=${!ok} onClick=${() => onSave({ k: "e" + rid(), n: f.n.trim(), kind: f.kind, dc: f.dc, uses: f.uses.trim(), what: f.what.trim() })}>Save effect</button>
      <button class="btn small" onClick=${onCancel}>Cancel</button></div></div>`;
}

function RuneSide({ c, st, plan, o, setO, focus, busy, update }) {
  let body;
  if (focus === "type") body = html`
    ${st.hoax && html`<div class="seg two ammode" role="group" aria-label="Gem or Hoaxstone"><button type="button" aria-pressed=${!o.hoax} disabled=${busy} onClick=${() => setO(x => { x.hoax = false; })}>A gem</button>
      <button type="button" aria-pressed=${!!o.hoax} disabled=${busy} onClick=${() => setO(x => { x.hoax = true; })}>Hoaxstone</button></div>`}
    ${plan.hoax ? html`<div class="mini" style="margin-top:8px"><label for=${"rn-obj" + c.id}>The mundane object</label><input id=${"rn-obj" + c.id} type="text" value=${o.gemName} disabled=${busy} placeholder="A river pebble" onChange=${e => setO(x => { x.gemName = e.target.value; })} /></div>
        <p class="muted ptrule">It works like a runestone for an hour, then crumbles. You pay in life force instead of materials (see Materials).</p>`
      : html`<div class="ptopts brchips" style="margin-top:8px">${R.GEMS.map(g => html`<button type="button" class="ptopt" aria-pressed=${o.gem === g.k} disabled=${busy || (g.precious && !st.precious)} onClick=${() => setO(x => { x.gem = g.k; })}>
          <b><i class="dot" style=${`background:${g.hue}`}></i>${g.n}</b></button>`)}</div>
        <p class="muted ptrule">${plan.precious ? "Precious: any potency, and room for a second effect from Runecrafting 7." : "Semi-precious: holds at most d6 and one effect."}${st.precious ? "" : " Precious gems unlock at Runecrafting 5."}</p>
        ${plan.g.k === "other" && html`<div class="row"><div class="mini" style="flex:1"><label for=${"rn-v" + c.id}>The vessel</label><input id=${"rn-v" + c.id} type="text" value=${o.gemName} disabled=${busy} placeholder="Wyvern eye" onChange=${e => setO(x => { x.gemName = e.target.value; })} /></div>
          <label class="brknown"><input type="checkbox" checked=${!!o.precious} disabled=${busy || !st.precious} onChange=${e => setO(x => { x.precious = e.target.checked; })} /> Precious</label></div>`}`}`;
  else if (focus === "av") body = html`<p class="muted ptrule">What the GM agreed the stone does. Enhancing stones raise a skill, attribute or ability; manifesting stones produce an effect.</p>
    <${RuneEffect} e=${o} busy=${busy} cid=${c.id} label="Effect" set=${v => setO(x => Object.assign(x, v))} />
    <${RuneLibrary} c=${c} busy=${busy} update=${update} slot="first" />`;
  else if (focus === "soak") body = plan.hoax ? html`
    <p class="muted ptrule">For every 100 rubles the materials would cost, per hour it lasts: 2 hit points, 10 blood points or 5 deprivation points, all from one. Paid even if it fails.</p>
    <div class="mini"><label for=${"rn-c" + c.id}>Materials it would take (rubles)</label><input id=${"rn-c" + c.id} type="number" min="0" step="50" value=${o.cost} disabled=${busy} onInput=${e => setO(x => { x.cost = Math.max(0, +e.target.value || 0); })} /></div>
    <div class="seg rnpay" role="group" aria-label="Pay with">${Object.entries(R.HOAX_PAY).map(([k, v]) => html`<button type="button" aria-pressed=${plan.pay === k} disabled=${busy} onClick=${() => setO(x => { x.pay = k; })}>${v.n[0].toUpperCase() + v.n.slice(1)}</button>`)}</div>
    <p class="ptdc">${plan.life} ${plan.payName} (you have ${R.derived(c).cur[plan.pay]})</p>`
    : html`<p class="muted ptrule">The GM tells you what the materials cost (an Appraisal check finds out).</p>
    <div class="mini"><label for=${"rn-c" + c.id}>Materials for this stone (rubles)</label><input id=${"rn-c" + c.id} type="number" min="0" step="50" value=${o.cost} disabled=${busy} onInput=${e => setO(x => { x.cost = Math.max(0, +e.target.value || 0); })} /></div>
    ${st.extra ? html`<div class="mini" style="margin-top:8px"><label for=${"rn-x" + c.id}>Extra materials (rubles): +1% per 50</label><input id=${"rn-x" + c.id} type="number" min="0" step="50" value=${o.extra} disabled=${busy} onInput=${e => setO(x => { x.extra = Math.max(0, +e.target.value || 0); })} /></div>
      <p class="ptdc">+${plan.extraPct}% for ${plan.extra} rubles</p>` : html`<p class="ptlocked">Extra materials for a bonus unlock at Runecrafting 5.</p>`}
    <p class="muted">You have ${num(c.craft.supplies.runemat)} rubles' worth.</p>`;
  else body = plan.hoax ? html`
    <div class="row ptrate"><span><b>Lasts ${plan.lasts} hour${plan.lasts > 1 ? "s" : ""}</b> · each hour costs the life force again</span>
      <span class="ptstepper"><button class="iconbtn" aria-label="Fewer hours" disabled=${busy || plan.lasts <= 1} onClick=${() => setO(x => { x.hours = Math.max(1, num(x.hours) - 1); })}>−</button>
      <button class="iconbtn" aria-label="More hours" disabled=${busy || plan.lasts >= 24} onClick=${() => setO(x => { x.hours = num(x.hours) + 1; })}>+</button></span></div>`
    : html`${!st.potent ? html`<p class="ptlocked">A second effect (a Potent Runestone) unlocks at Runecrafting 7. You can still save effects for later.</p>`
      : !plan.precious ? html`<p class="ptlocked">A semi-precious gem holds one effect. Pick a precious gem (Vessel) for a Potent Runestone.</p>`
      : html`<div class="seg two ammode" role="group" aria-label="Second effect"><button type="button" aria-pressed=${!o.second} disabled=${busy} onClick=${() => setO(x => { x.second = null; })}>One effect</button>
        <button type="button" aria-pressed=${!!o.second} disabled=${busy} onClick=${() => setO(x => { x.second = x.second || { kind: "enhance", effect: "", dc: 50 }; })}>Two effects</button></div>
      ${o.second && html`<${RuneEffect} e=${o.second} busy=${busy} cid=${c.id} label="Second effect" set=${v => setO(x => { x.second = Object.assign({}, x.second, v); })} />
        <p class="muted ptrule">Two rolls, twice the time. If either fails, both effects, the gem and the materials are lost. The same effect twice stacks.</p>`}`}
      <${RuneLibrary} c=${c} busy=${busy} update=${update} slot="second" canPick=${st.potent && plan.precious} />`;
  return html`<div class="ptpick">
    <h3 class="ptpickh"><span>${focus === "extra" && plan.hoax ? "Hoaxstone" : RN_NAMES[focus]}</span></h3>
    <div class="ptbody" key=${focus}>${body}</div>
    <div class="ptplan"><${PlanHead} title="The ritual" busy=${busy} onReset=${() => setO(x => refill(x, R.blankCharacter().craft.rune.order))} /><ol>
      ${plan.effects.map(e => html`<li><span>${e.effect || "An effect"}: ${e.kind === "manifest" ? `roll under ${e.dc}%` : "roll under 30, lower is stronger"}</span><span class="muted">${plan.chances[plan.effects.indexOf(e)]}% to hold${e.kind === "enhance" ? (plan.semi ? " · potency up to d6" : " · potency up to 12") : ""}</span></li>`)}
      <li><span>${plan.hoax ? `${plan.life} ${plan.payName}` : `${plan.spend} rubles of materials`}</span><span class="muted">${plan.hoax ? "Paid even if it fails" : "Lost if it fails"}${st.reroll && !plan.hoax ? " · one re-roll per gem (pays again)" : ""}</span></li>
      <li><span>${plan.hours} hours of work</span><span class="muted">${plan.hoax ? `Then it lasts ${plan.lasts} hour${plan.lasts > 1 ? "s" : ""}` : "Then set it into an item with a runeslot"}</span></li></ol></div>
  </div>`;
}
