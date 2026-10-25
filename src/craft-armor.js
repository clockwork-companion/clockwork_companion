/* ================= crafting: armor upkeep (Armor Maintenance) ================= */
// Two benches in one: Repair (the book's procedure) and Craft (our reading, built on the book's weapon crafting).
// The suit stands on a mannequin. Repair hammers out its dents one Repair Die at a time; crafting forges it from a ghost outline.
const AM_TORSO = "M150 98 Q180 122 210 98 L250 104 Q268 116 266 150 L246 214 L242 300 L250 352 L240 376 L120 376 L110 352 L118 300 L114 214 L94 150 Q92 116 110 104 Z";
const AM_SLEEVE = "M112 104 Q86 110 76 140 L64 194 L92 202 L100 156 Z";
const AM_BREAST = "M126 108 Q180 132 234 108 Q256 150 246 220 Q240 268 236 300 L124 300 Q120 268 114 220 Q104 150 126 108 Z";
const AM_PAULDRON = "M126 102 Q88 98 72 134 Q68 154 78 168 Q98 150 124 148 Z";
const AM_SKIRT = "M118 296 L242 296 L250 352 L240 376 L120 376 L110 352 Z";
// Mirror an absolute path left ↔ right across the stand (x = 180).
const amMirror = d => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${360 - +x} ${y}`);
// Where dents and tears sit, in the order they are hammered out.
const AM_SPOTS = [[150, 164], [214, 184], [166, 240], [226, 262], [142, 308], [204, 336]];
const AM_LABELS = { type: ["l", 140], soak: ["l", 330], av: ["r", 170], extra: ["r", 290] };
const AM_ANCHOR = { type: [96, 156], soak: [124, 340], av: [206, 176], extra: [238, 304] };
const AM_NAME = { type: "Type", av: "Armor Value", soak: "Soak Pool", extra: "Extras" };
const amMarks = (soak, max) => (max <= 0 || soak >= max ? 0 : Math.max(1, Math.round((6 * (max - soak)) / max)));

// The suit itself, drawn by type. cls: extra classes on the layers (ghost, assemble, broken).
function SuitArt({ type }) {
  const quilt = [];
  for (let k = -14; k <= 22; k++) quilt.push(`M${60 + k * 16} 90 l220 300 M${300 - k * 16} 90 l-220 300`);
  if (type === "light") return html`
    <g class="am-layer am-l1"><path d=${AM_SLEEVE} fill="url(#am-cloth)" stroke="#6b4f2a" stroke-width="1.4" /><path d=${amMirror(AM_SLEEVE)} fill="url(#am-cloth)" stroke="#6b4f2a" stroke-width="1.4" />
      <path d=${AM_TORSO} fill="url(#am-cloth)" stroke="#6b4f2a" stroke-width="1.6" /></g>
    <g class="am-layer am-l2"><path d=${quilt.join(" ")} clip-path="url(#am-clip)" stroke="#4a3218" stroke-opacity=".3" stroke-width="1.2" stroke-dasharray="4 3" fill="none" />
      <path d="M150 98 Q180 122 210 98" stroke="#6b4f2a" stroke-width="7" fill="none" stroke-linecap="round" />
      <path d="M116 356 L244 356" stroke="#6b4f2a" stroke-width="2" /></g>
    <g class="am-layer am-l3">${[132, 156, 180, 204, 228, 252, 276].map(y => html`<path d=${`M174 ${y} l12 10 M186 ${y} l-12 10`} stroke="#3c2810" stroke-width="1.7" />`)}</g>`;
  if (type === "medium") {
    const plates = [];
    [126, 156, 186, 216, 246, 318, 346].forEach(y => [110, 140, 170, 200, 230].forEach(x => plates.push([x, y])));
    return html`
    <g class="am-layer am-l1"><path d=${AM_TORSO} fill="url(#am-leather)" stroke="#2c1708" stroke-width="1.6" /></g>
    <g class="am-layer am-l2" clip-path="url(#am-clip)">${plates.map(([x, y]) => html`<rect x=${x} y=${y} width="27" height="27" rx="3" fill="#000" fill-opacity=".1" stroke="#1d0f05" stroke-opacity=".5" />`)}</g>
    <g class="am-layer am-l3"><g clip-path="url(#am-clip)">${plates.map(([x, y]) => html`<circle cx=${x + 5} cy=${y + 5} r="1.9" fill="#e0b25a" /><circle cx=${x + 22} cy=${y + 5} r="1.9" fill="#e0b25a" />`)}</g>
      <rect x="112" y="290" width="136" height="16" fill="#2a170a" /><rect x="170" y="286" width="20" height="24" rx="2" fill="none" stroke="#e0b25a" stroke-width="3" /></g>`;
  }
  if (type === "heavy") return html`
    <g class="am-layer am-l1"><path d=${AM_SLEEVE} fill="url(#am-steel)" stroke="#2b2f34" /><path d=${amMirror(AM_SLEEVE)} fill="url(#am-steel)" stroke="#2b2f34" />
      <path d=${AM_TORSO} fill="url(#am-steel)" stroke="#2b2f34" stroke-width="1.6" /></g>
    <g class="am-layer am-l2"><path d=${AM_SLEEVE} fill="url(#am-rings)" /><path d=${amMirror(AM_SLEEVE)} fill="url(#am-rings)" /><path d=${AM_TORSO} fill="url(#am-rings)" />
      <path d="M150 98 Q180 122 210 98" stroke="url(#am-cloth)" stroke-width="9" fill="none" stroke-linecap="round" /></g>
    <g class="am-layer am-l3"><rect x="114" y="288" width="132" height="14" fill="#3a2414" /><rect x="172" y="285" width="16" height="20" rx="2" fill="none" stroke="#b9bec4" stroke-width="3" /></g>`;
  return html`
    <g class="am-layer am-l1"><path d=${AM_SKIRT} fill="url(#am-steel)" /><path d=${AM_SKIRT} fill="url(#am-rings)" stroke="#2b2f34" /></g>
    <g class="am-layer am-l2">${[0, 1, 2].map(i => html`<path d=${`M${124 - i * 3} ${300 + i * 16} L${236 + i * 3} ${300 + i * 16} L${239 + i * 3} ${315 + i * 16} L${121 - i * 3} ${315 + i * 16} Z`} fill="url(#am-plate)" stroke="#23272b" />`)}
      <path d=${AM_BREAST} fill="url(#am-plate)" stroke="#23272b" stroke-width="1.8" />
      <path d="M180 126 Q183 212 180 296" stroke="#fff" stroke-opacity=".55" stroke-width="2.4" fill="none" /><path d="M184 128 Q187 212 184 296" stroke="#000" stroke-opacity=".25" stroke-width="1.5" fill="none" />
      <path d="M138 106 Q180 128 222 106" stroke="#d6dbe0" stroke-width="5" fill="none" stroke-linecap="round" /></g>
    <g class="am-layer am-l3"><path d=${AM_PAULDRON} fill="url(#am-plate)" stroke="#23272b" stroke-width="1.6" /><path d=${amMirror(AM_PAULDRON)} fill="url(#am-plate)" stroke="#23272b" stroke-width="1.6" />
      <path d="M78 150 Q98 134 122 136 M75 140 Q96 120 118 122" stroke="#23272b" stroke-width="1.3" fill="none" /><path d=${amMirror("M78 150 Q98 134 122 136 M75 140 Q96 120 118 122")} stroke="#23272b" stroke-width="1.3" fill="none" />
      ${[[132, 122], [228, 122], [122, 200], [238, 200], [128, 286], [232, 286]].map(([x, y]) => html`<circle cx=${x} cy=${y} r="2.6" fill="#e8ecef" stroke="#555" stroke-width=".8" />`)}</g>`;
}

function ArmorFigure({ type, marks, broken, mode, run, labels, focus, onPick, st }) {
  const names = mode === "repair" ? Object.assign({}, AM_NAME, { type: "Suit", extra: "Repair" }) : AM_NAME;
  const ph = run && run.phase;
  const ghost = mode === "craft" && (!run || ["heat", "rolling", "flaw", "lost"].includes(ph));
  const made = mode === "craft" && ph === "made";
  const hammering = run && (ph === "strike" || (mode === "craft" && ph === "rolling"));
  return html`<div class=${"ptmun ammun" + (ghost ? " ghost" : "") + (made ? " made" : "") + (ph === "lost" ? " lost" : "") + (broken && mode === "repair" ? " broken" : "") + (run && run.done && mode === "repair" ? " mended" : "")}>
    <svg class="ptsvg" viewBox="0 0 360 460" role="img" aria-label=${`${(R.ARMOR[type] || R.ARMOR.light).label} armor on a stand${marks ? `, ${marks} dents` : ""}`}>
      <defs>
        <linearGradient id="am-cloth" x1="0" x2="1"><stop offset="0" stop-color="#8f6a3b" /><stop offset=".4" stop-color="#d9b67e" /><stop offset="1" stop-color="#8a6436" /></linearGradient>
        <linearGradient id="am-leather" x1="0" x2="1"><stop offset="0" stop-color="#3f2410" /><stop offset=".4" stop-color="#8a5530" /><stop offset="1" stop-color="#3a200d" /></linearGradient>
        <linearGradient id="am-steel" x1="0" x2="1"><stop offset="0" stop-color="#3f454b" /><stop offset=".45" stop-color="#9aa2aa" /><stop offset="1" stop-color="#3a3f45" /></linearGradient>
        <linearGradient id="am-plate" x1="0" x2="1"><stop offset="0" stop-color="#5a6168" /><stop offset=".38" stop-color="#f1f4f6" /><stop offset=".62" stop-color="#aab3bb" /><stop offset="1" stop-color="#4b5258" /></linearGradient>
        <linearGradient id="am-wood" x1="0" x2="1"><stop offset="0" stop-color="#4f2e14" /><stop offset=".45" stop-color="#a87442" /><stop offset="1" stop-color="#4a2b12" /></linearGradient>
        <radialGradient id="am-fire" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd27a" stop-opacity=".95" /><stop offset=".45" stop-color="#ff7a2a" stop-opacity=".55" /><stop offset="1" stop-color="#ff4a1a" stop-opacity="0" /></radialGradient>
        <pattern id="am-rings" width="9" height="8" patternUnits="userSpaceOnUse">
          ${[[0, 0], [9, 0], [4.5, 4], [0, 8], [9, 8]].map(([x, y]) => html`<circle cx=${x} cy=${y} r="3.2" fill="none" stroke="#1f2327" stroke-opacity=".75" stroke-width="1.2" />`)}</pattern>
        <clipPath id="am-clip"><path d=${AM_TORSO} /></clipPath>
        <linearGradient id="am-glint" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0" /><stop offset=".5" stop-color="#fff" stop-opacity=".8" /><stop offset="1" stop-color="#fff" stop-opacity="0" /></linearGradient>
      </defs>
      ${mode === "craft" && html`<ellipse class=${"am-glow" + (run && ["heat", "rolling", "flaw"].includes(ph) ? " on" : "")} cx="180" cy="420" rx="150" ry="46" fill="url(#am-fire)" />`}
      <g class="am-stand"><rect x="175" y="370" width="10" height="58" fill="url(#am-wood)" /><ellipse cx="180" cy="432" rx="58" ry="10" fill="url(#am-wood)" />
        <rect x="172" y="80" width="16" height="26" fill="url(#am-wood)" /><circle cx="180" cy="62" r="22" fill="url(#am-wood)" /></g>
      ${labels && html`<g class="ptlines">${Object.keys(AM_LABELS).map(p => { const [side, ly] = AM_LABELS[p], [ax, ay] = AM_ANCHOR[p], lx = side === "l" ? 112 : 248;
        return html`<g class=${"ptline" + (focus === p ? " on" : "")}><path d=${`M${lx} ${ly} H${side === "l" ? lx + 12 : lx - 12} L${ax} ${ay}`} /><circle cx=${ax} cy=${ay} r="3.6" /></g>`; })}</g>`}
      <g class=${"am-suit" + (made ? " assemble" : "")}><${SuitArt} type=${type} /></g>
      ${mode === "craft" && run && run.flaws > 0 && html`<g class="am-flaw"><path d="M200 150 l-14 22 10 6 -16 28" /><path d="M150 250 l12 16 -8 6 14 18" style=${run.flaws > 1 ? "" : "display:none"} /></g>`}
      <g class="am-marks">${AM_SPOTS.slice(0, mode === "repair" ? marks : 0).map(([x, y], i) => html`<g class="am-dent" key=${i}>
        <ellipse cx=${x} cy=${y} rx="12" ry="7" fill="#000" fill-opacity=".3" /><path d=${`M${x - 10} ${y - 1} l5 4 l4 -6 l5 7 l4 -4`} stroke="#141414" stroke-width="1.7" fill="none" />
        <path d=${`M${x - 8} ${y + 5} q8 4 16 0`} stroke="#fff" stroke-opacity=".35" stroke-width="1.5" fill="none" /></g>`)}</g>
      ${broken && mode === "repair" && html`<path class="am-break" d="M196 112 l-18 40 14 10 -22 46 12 8 -16 52 10 30" />`}
      <g clip-path="url(#am-clip)"><rect class="am-glintbar" x="-60" y="60" width="70" height="340" fill="url(#am-glint)" /></g>
      ${hammering && html`<g transform="translate(318 250)"><g class="am-swing go" key=${run.strike != null ? "s" + run.strike : "r" + (run.flaws || 0)}>
        <rect x="-104" y="-4" width="104" height="8" rx="3" fill="url(#am-wood)" /><rect x="-124" y="-17" width="26" height="34" rx="3" fill="url(#am-steel)" stroke="#1d2024" /><rect x="-102" y="-6" width="7" height="12" fill="#3d4146" /></g></g>
        <g class="ptsparks burst" transform="translate(222 195)" key=${"sp" + (run.strike != null ? run.strike : run.flaws)}>${Array.from({ length: 9 }, (_, i) => html`<line x1="0" y1="0" x2="0" y2="-9" style=${`--a:${i * 40 + 10}deg;--d:220ms`} />`)}</g>`}
      ${run && ph === "strike" && run.dice[run.strike] != null && html`<text class="am-plus" key=${"t" + run.strike} x="236" y="182">+${run.dice[run.strike]}</text>`}
      ${(made || (run && run.done && mode === "repair")) && html`<g class="ptsteam">${[0, 1, 2, 3].map(i => html`<circle cx=${140 + i * 26} cy="380" r=${12 + (i % 2) * 5} style=${`--d:${i * 150}ms`} />`)}</g>`}
    </svg>
    ${labels && Object.keys(AM_LABELS).map(p => { const [side, ly] = AM_LABELS[p];
      return html`<button type="button" class=${"ptlabel " + side + (focus === p ? " on" : "")} style=${`top:${(ly / 460) * 100}%`} disabled=${!!run || !onPick} aria-pressed=${focus === p} onClick=${() => onPick && onPick(p)}>
        <span class="k">${names[p]}</span><span class="v">${labels[p]}</span></button>`; })}
  </div>`;
}

function ArmorUpkeep({ c, update }) {
  const st = R.amState(c);
  const ca = c.craft.armor;
  const [mode, setMode] = useState(() => lsGet("cw-am-mode", "repair"));
  useEffect(() => lsSet("cw-am-mode", mode), [mode]);
  const [selId, setSel] = useState("");
  const [focus, setFocus] = useState("type");
  const [run, setRunState] = useState(null);
  const runRef = useRef(null), timers = useRef([]);
  const setRun = r => { runRef.current = r; setRunState(r); };
  const patch = p => { const r = runRef.current; if (r) setRun(Object.assign({}, r, typeof p === "function" ? p(r) : p)); };
  const later = (fn, ms) => timers.current.push(setTimeout(fn, reduceMotion() ? Math.min(ms, 90) : ms));
  const stop = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => stop(), []);
  useEffect(() => { stop(); setRun(null); setSel(""); }, [c.id]);
  // The "new job" notice asked to open a job on this bench.
  const shop = useShop();
  useEffect(() => { const f = shop.focus; if (f && f.kind === "armor" && f.char === c.id && !runRef.current) { shop.focus = null; setMode("repair"); setSel(f.sel); } }, [shop.focusSeq, c.id]);
  const busy = !!run && !run.done;
  // The suit to repair: the one picked, else the most damaged.
  useShop();
  const suits = c.armor;
  const byNeed = [...suits].sort((a, b) => R.repairPlan(c, b).missing - R.repairPlan(c, a).missing);
  // Another player's suit on this bench (a workshop job), else one of this character's own.
  const job = run && run.kind === "repair" ? run.job : selId.startsWith("job:") ? Shop.incoming(c, "armor").find(j => "job:" + j.id === selId) || null : null;
  const suit = job ? Shop.view(job) : suits.find(a => a.id === (run && run.kind === "repair" ? run.id : selId)) || byNeed[0] || null;
  const away = !job && suit ? Shop.outgoing(c, "armor", suit.id) : null;   // sent to a smith: they repair it, not us
  const rp = suit ? Object.assign(R.repairPlan(c, suit), away ? { block: `It's at ${away.to.name}'s bench. Take it back on the Gear tab to repair it yourself.` } : {}) : null;
  const rc = ca.recipe, cp = R.craftPlan(c, rc);
  const setRc = fn => update(x => fn(x.craft.armor.recipe));
  const T = R.ARMOR;
  const addLedger = (x, e) => { x.craft.armor.ledger = [Object.assign({ id: rid(), t: Date.now(), note: "" }, e), ...x.craft.armor.ledger].slice(0, 20); };

  /* ---------- repair: one check, then one hammer strike per Repair Die ---------- */
  const startRepair = async () => {
    if (!suit || rp.block) return;
    const plan = rp, id = suit.id, theJob = job;
    const first = await askRoll({ title: theJob ? `Armor repair check: ${theJob.from.name}'s ${suit.name || "armor"}` : "Armor repair check", dice: [{ n: 1, sides: 100 }], cancel: true,
      note: `d100 − ${st.mod}. Repair Count = 10 − check ÷ 10: that many ${plan.die} restore Soak.` });
    if (!first) return;
    setSel(theJob ? "job:" + theJob.id : id);
    setRun({ kind: "repair", phase: "rolling", id, job: theJob, plan, dice: [], strike: null, shown: 0, gained: 0, mod: st.mod });
    later(() => {
      const r = first[0], check = r - st.mod, count = R.repairCount(check);
      patch({ phase: "counted", r, check, count, dice: [] });
      // Rolled at the table, the Repair Dice come back as one total: one strike for the lot.
      askRoll({ title: `Repair Dice: ${count}${plan.die}`, dice: [{ n: count, sides: plan.sides }], note: "Soak goes back up by the total." }).then(dice => {
        if (!runRef.current) return;
        patch({ dice });
        const strike = i => {
          if (i >= dice.length) return later(() => finishRepair(), 450);
          patch({ phase: "strike", strike: i });
          later(() => patch(g => ({ shown: i + 1, gained: Math.min(plan.missing, g.gained + dice[i]) })), 230);
          later(() => strike(i + 1), 560);
        };
        later(() => strike(0), 1100);
      });
    }, Dice.mode === "own" ? 500 : 1100);
  };
  const finishRepair = () => {
    const f = runRef.current; if (!f) return;
    const total = f.dice.reduce((s, x) => s + x, 0), gained = Math.min(f.plan.missing, total);
    if (f.job) {
      // Another player's suit: the repair adds to the job (the smith can repair again, then send it back); this smith pays the materials.
      const roll = `check ${f.r}−${f.mod}=${f.check} → ${f.count} × ${f.plan.die}${f.count ? ": " + total : ""}`;
      if (!Shop.progress(f.job, gained, roll, c.name || "")) { toast(`${f.job.from.name} took it back before you finished.`); patch({ done: true, phase: "done", total, gainedFinal: 0, gone: true }); return; }
      update(x => {
        x.craft.supplies[f.plan.mat] = Math.max(0, num(x.craft.supplies[f.plan.mat]) - f.plan.cost);
        const txt = `${f.job.from.name}'s ${f.job.item.name || T[f.job.item.type].label + " armor"}: Soak ${f.plan.soak} → ${f.plan.soak + gained}`;
        addLedger(x, { kind: "repair", name: `${f.plan.broken ? "Rebuilt" : "Repaired"} ${txt}`, rolls: [roll] });
        addLog(x, `Armor repair for ${f.job.from.name}: ${txt} (${f.plan.cost} g ${f.plan.mat} materials)`);
      });
      patch({ done: true, phase: "done", total, gainedFinal: gained });
      return;
    }
    update(x => {
      const a = x.armor.find(y => y.id === f.id); if (!a) return;
      a.soak = num(a.soak) + gained;
      x.craft.supplies[f.plan.mat] = Math.max(0, num(x.craft.supplies[f.plan.mat]) - f.plan.cost);
      const txt = `${a.name || T[a.type].label + " armor"}: Soak ${f.plan.soak} → ${f.plan.soak + gained}`;
      addLedger(x, { kind: "repair", name: f.plan.broken ? `Rebuilt ${txt}` : `Repaired ${txt}`, rolls: [`check ${f.r}−${f.mod}=${f.check} → ${f.count} × ${f.plan.die}${f.count ? ": " + (f.dice.length > 1 ? f.dice.join(" + ") + " = " : "") + total : ""}`] });
      addLog(x, `Armor repair: ${txt} (${f.plan.cost} g ${f.plan.mat} materials, ${f.count}${f.plan.die})`);
    });
    patch({ done: true, phase: "done", total, gainedFinal: gained });
  };

  /* ---------- craft: up to two rolls; a failure leaves a flaw, a second loses the suit ---------- */
  const startCraft = async () => {
    if (cp.block) return;
    const plan = cp, name = (rc.name || "").trim() || `${plan.t.label} armor`;
    const ask = n => askRoll({ title: n ? "Armor craft: second try" : "Armor craft check", dice: [{ n: 1, sides: 100 }], cancel: !n,
      note: `d100 − ${st.mod}, under ${plan.dc}.${n ? " A second failure loses the suit." : " A failure leaves a flaw and gives one more try."}` });
    const first = await ask(0);
    if (!first) return;
    setRun({ kind: "craft", phase: "heat", plan, name, for: rc.for || "", rolls: [], flaws: 0, mod: st.mod });
    const roll = async n => {
      const r = n ? (await ask(1))[0] : first[0];
      if (!runRef.current) return;
      patch({ phase: "rolling", roll: null });
      later(() => {
        const ok = r - st.mod < plan.dc;
        patch(g => ({ roll: { r, total: r - st.mod, ok }, rolls: [...g.rolls, { r, total: r - st.mod, ok }] }));
        if (ok) later(() => finishCraft(true), 500);
        else if (n === 0) later(() => { patch(g => ({ phase: "flaw", flaws: g.flaws + 1 })); later(() => roll(1), 1500); }, 600);
        else later(() => finishCraft(false), 700);
      }, 1400);
    };
    later(() => roll(0), 900);
  };
  const finishCraft = ok => {
    const f = runRef.current; if (!f) return;
    const nm = f.name + (f.flaws ? ` · ${f.flaws} flaw` : "");
    const forWho = ok && f.for && f.for !== c.id ? Shop.card(f.for) : null;
    update(x => {
      x.craft.supplies[f.plan.type] = Math.max(0, num(x.craft.supplies[f.plan.type]) - f.plan.cost);
      const made = ok && { id: rid(), name: nm, type: f.plan.type, av: f.plan.finalAV, soak: f.plan.finalSoak, soakMax: f.plan.finalSoak, worn: false, where: "pack" };
      if (made && !forWho) x.armor.push(made);
      if (made && forWho) Shop.gift("armor", c, made, forWho);
      addLedger(x, { kind: "craft", name: ok ? `Crafted ${nm}${forWho ? ` for ${forWho.name}` : ""} (AV ${f.plan.finalAV}, Soak ${f.plan.finalSoak})` : `Lost ${f.name} in the forge`, scrap: !ok, det: ok ? f.flaws : 0,
        rolls: f.rolls.map(r => `${r.r}−${f.mod}=${r.total} vs ${f.plan.dc} ${r.ok ? "✓" : "✗"}`) });
      addLog(x, ok ? `Armor crafting: made ${nm} (${f.plan.cost} g ${f.plan.type} materials)` : `Armor crafting: the suit was lost (${f.plan.cost} g ${f.plan.type} materials)`);
    });
    patch({ done: true, phase: ok ? "made" : "lost", forName: forWho ? forWho.name : "" });
  };
  const close = () => { stop(); setRun(null); };
  // On another player's item: repair it again straight away, or send it back with every repair made.
  const [again, setAgain] = useState(false);
  const liveJob = run && run.job ? Shop.jobs.find(j => j.id === run.job.id && j.status === "open") || null : null;
  const left = liveJob ? (v => (num(v.jobMax) || num(v.soakMax)) - num(v.soak))(Shop.view(liveJob)) : 0;   // still to repair
  const repairAgain = () => { const j = run.job; close(); setSel("job:" + j.id); setAgain(true); };
  const sendBack = () => { const j = run.job; if (Shop.finish(j, update, c.name || "")) toast(`Sent back to ${j.from.name}.`); close(); setSel(""); };
  useEffect(() => { if (again && !run && job) { setAgain(false); startRepair(); } }, [again, !!run, job && job.id]);

  const repairLabels = suit && { type: `${T[suit.type].label} · ${suit.name || "unnamed"}`, av: String(num(suit.av)), soak: `${run && run.kind === "repair" ? run.plan.soak + run.gained : rp.soak} / ${rp.max}`, extra: `${rp.die} · ${rp.cost} g` };
  const craftLabels = { type: cp.t.label, av: `${cp.finalAV}${cp.plusAV ? ` (+${cp.plusAV})` : ""}`, soak: `${cp.finalSoak}${cp.plusSoak ? ` (+${5 * cp.plusSoak})` : ""}`, extra: cp.plusAV || cp.plusSoak ? `${cp.dc}% to beat` : "None" };
  const shownType = mode === "repair" ? (suit ? suit.type : "medium") : cp.type;
  const shownSoak = run && run.kind === "repair" ? run.plan.soak + run.gained : rp ? rp.soak : 0;

  return html`
    <section class="frame ambench">
      <${Head} title=${mode === "repair" ? "Repairing armor" : "Crafting armor"} topic=${mode === "repair" ? "armorRepair" : "armorCraft"} />
      <p class="sub">${mode === "repair" ? "Pick a damaged suit and repair it. One check sets how many Repair Dice you roll; each die goes back into the Soak Pool." : "Set the suit the GM agreed on, then forge it. One roll against the difficulty; a failure leaves a flaw and you roll once more."}</p>
      <div class="seg two ammode" role="group" aria-label="Repair or craft">${[["repair", "Repair"], ["craft", "Craft"]].map(([k, n]) => html`<button aria-pressed=${mode === k} disabled=${busy} onClick=${() => { close(); setMode(k); }}>${n}</button>`)}</div>
      <div class="facts ptfacts">${[["Armor Maintenance", `${st.lvl}`], ["Modifier", `${st.mod}%`],
        ["Repair", st.repair ? (st.restore ? "Yes, broken suits too" : "Yes") : "From level 3"], ["Craft", st.craft ? (st.artisan ? "Mundane and Artisan" : "Mundane suits") : "From level 4"]].map(([k, v]) => html`<div class="fact"><span>${k}</span><b>${v}</b></div>`)}</div>

      <div class="ptgrid">
        <div class="ptstage amstage">
          ${mode === "repair" && !suit ? html`<p class="muted amempty">No armor yet. Add a suit on the Gear tab, or craft one.</p>` : html`
          <${ArmorFigure} type=${shownType} mode=${mode} run=${run} st=${st} focus=${mode === "craft" ? focus : null} onPick=${mode === "craft" ? setFocus : null}
            labels=${mode === "repair" ? repairLabels : craftLabels} broken=${rp && (run && run.kind === "repair" ? run.plan.broken && !run.gained : rp.broken)} marks=${mode === "repair" && rp ? amMarks(shownSoak, rp.max) : 0} />`}
          ${mode === "repair" && rp && html`<div class="amsoak" aria-hidden="true"><i style=${`width:${rp.max ? Math.min(100, (shownSoak / rp.max) * 100) : 0}%`}></i></div>`}
          <div class="ptforge">
            ${!run && mode === "repair" && suit && html`<button class="btn primary big forgebtn" disabled=${!!rp.block} onClick=${startRepair}>${HAMMER}${rp.broken ? "Rebuild" : "Repair"} · ${rp.cost} g</button>
              ${rp.block && html`<p class="muted ptwhy">${rp.block}</p>`}`}
            ${!run && mode === "craft" && html`<button class="btn primary big forgebtn" disabled=${!!cp.block} onClick=${startCraft}>${HAMMER}Forge the suit · ${cp.cost} g</button>
              ${cp.block && html`<p class="muted ptwhy">${cp.block}</p>`}`}
            ${run && html`<${AmReadout} run=${run} onClose=${close} job=${liveJob} left=${left} onAgain=${repairAgain} onSendBack=${sendBack} />`}
          </div>
        </div>
        <div class="ptside">${mode === "repair" ? html`<${RepairSide} c=${c} update=${update} suits=${suits} suit=${suit} job=${job} selId=${selId} rp=${rp} st=${st} busy=${busy} pick=${id => { close(); setSel(id); }} />`
          : html`<${CraftSide} c=${c} rc=${rc} cp=${cp} st=${st} focus=${focus} setFocus=${setFocus} setRc=${setRc} busy=${busy} />`}</div>
      </div>
    </section>

    <section class="frame"><h2 class="h"><span>Supplies</span><i class="orn" aria-hidden="true"></i></h2>
      <p class="sub">Armor materials are kept by the type of armor they mend. You also need a blacksmithing kit; heavy and plate armor need a forge, which most smiths will rent you.</p>
      <div class="ptsupplies">${Object.entries(T).map(([k, t]) => html`<div class="mini ptsup"><label for=${"am-" + k + c.id}>${t.label} materials (g)</label>
          <input id=${"am-" + k + c.id} type="number" min="0" step="100" value=${c.craft.supplies[k] ?? 0} onInput=${e => update(x => { x.craft.supplies[k] = Math.max(0, +e.target.value || 0); })} /></div>`)}
        <div class="mini ptsup"><label for=${"am-b" + c.id}>Other bonus (%)</label>
          <input id=${"am-b" + c.id} type="number" step="1" value=${ca.bonus ?? 0} onInput=${e => update(x => { x.craft.armor.bonus = +e.target.value || 0; })} /></div></div>
      <label class="amforge"><input type="checkbox" checked=${!!ca.forge} onChange=${e => update(x => { x.craft.armor.forge = e.target.checked; })} /> At a forge <span class="muted">(needed for heavy and plate)</span></label>
    </section>

    <section class="frame"><h2 class="h"><span>Ledger</span><i class="orn" aria-hidden="true"></i></h2>
      <p class="sub">Repairs and crafted suits, newest first. A crafted suit's flaws are the GM's to decide; note them here.</p>
      ${ca.ledger.length === 0 ? html`<p class="muted">No repairs or crafts yet.</p>` : html`<div class="ptledger">${ca.ledger.map((e, i) => html`<div class=${"pled" + (e.scrap ? " scrap" : "")}>
        <div class="row" style="justify-content:space-between;flex-wrap:nowrap"><b>${e.name}</b>
          <button class="iconbtn" aria-label="Remove this entry" onClick=${() => update(x => { x.craft.armor.ledger.splice(i, 1); })}>×</button></div>
        <span class="muted">${new Date(e.t).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}${e.rolls && e.rolls.length ? " · " + e.rolls.join(" · ") : ""}</span>
        ${e.det > 0 && html`<input class="inp" aria-label="Flaws" placeholder="What the flaw does (the GM decides)" value=${e.note} onInput=${ev => update(x => { x.craft.armor.ledger[i].note = ev.target.value; })} />`}</div>`)}</div>`}
    </section>`;
}
const HAMMER = html`<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 6.5l5-3 2.5 4-5 3z M8.8 8.3l7.7 8.2" /></svg>`;

function AmReadout({ run, onClose, job, left, onAgain, onSendBack }) {
  const [spin, setSpin] = useState(0);
  useEffect(() => {
    if (run.phase !== "rolling" || reduceMotion()) return;
    const t = setInterval(() => setSpin(1 + Math.floor(Math.random() * 100)), 55);
    return () => clearInterval(t);
  }, [run.phase, (run.rolls || []).length]);
  if (run.kind === "repair") {
    const p = run.plan;
    if (run.done) return html`<div class=${"ptread end " + (run.gainedFinal ? "done" : "nothing")} role="status">
      <p class="ptbig">${run.gainedFinal ? `+${run.gainedFinal} Soak` : "No soak recovered"}</p>
      <p>${run.count ? `${run.count} × ${p.die}: ${run.dice.length > 1 ? run.dice.join(" + ") + " = " : ""}${run.total}${run.total > run.gainedFinal ? ` (the suit was full at ${p.max})` : ""}` : "The check was too high for even one Repair Die."}</p>
      <p class="muted">${run.gone ? "Nothing was spent." : `${p.cost} g of ${p.mat} materials used · an hour's work.`}${job ? ` ${num((job.result || {}).times) > 1 ? `Repaired ${num(job.result.times)} times: +${num(job.result.gained)} ${"Soak"} in all. ` : ""}${left > 0 ? `${left} still to go. Repair again, or send it back to ${job.from.name} when you're done.` : `It's fully repaired. Send it back to ${job.from.name}.`}` : ""}</p>
      ${job ? html`<div class="row shopnext">${left > 0 && html`<button class="btn primary" onClick=${onAgain}>Repair again</button>`}
          <button class=${"btn" + (left > 0 ? "" : " primary")} onClick=${onSendBack}>Send it back to ${job.from.name}</button>
          <button class="btn" onClick=${onClose}>Back to the bench</button></div>`
        : html`<button class="btn primary" onClick=${onClose}>Back to the bench</button>`}</div>`;
    return html`<div class="ptread" role="status" aria-live="polite">
      <div class="ptstep"><span class="lbl">${run.phase === "rolling" ? "Armor Maintenance check" : "Repair Dice"}</span>
        <b>${run.phase === "rolling" ? "Inspecting the damage…" : `${run.count} × ${p.die}`}</b></div>
      ${run.phase === "rolling" ? html`<div class="ptdice rolling"><span class="d100">${spin || "··"}</span><span class="ptmath">d100 − ${run.mod} · lower is better</span></div>`
        : html`<div class="ptdice ok"><span class="d100">${run.r}</span><span class="ptmath">${run.r} − ${run.mod} = <b>${run.check}</b> · Repair Count 10 − ${run.check} ÷ 10 → <b>${run.count}</b></span></div>`}
      ${run.count > 0 && run.phase !== "rolling" && html`<div class="amdice">${run.dice.map((v, i) => html`<span class=${"amdie" + (i < run.shown ? " on" : "")}>${i < run.shown ? v : ""}</span>`)}
        <b class="amsum">+${run.gained}</b></div>`}
    </div>`;
  }
  const p = run.plan, r = run.roll;
  if (run.done) return html`<div class=${"ptread end " + (run.phase === "made" ? "done" : "scrap")} role="status">
    <p class="ptbig">${run.phase === "made" ? "Forged" : "Lost in the forge"}</p>
    <p>${run.phase === "made" ? `${run.name}: ${p.t.label}, AV ${p.finalAV}, Soak ${p.finalSoak}${run.flaws ? ", with a flaw for the GM to decide" : ""}.` : "Two failures: the suit and every material in it are gone."}</p>
    ${run.phase === "made" && html`<p class="muted">${run.forName ? `Sent to ${run.forName}'s Gear` : "Added to Armor on the Gear tab"}. Eight hours at the anvil.</p>`}
    <button class="btn primary" onClick=${onClose}>Back to the bench</button></div>`;
  return html`<div class="ptread" role="status" aria-live="polite">
    <div class="ptstep"><span class="lbl">Roll ${Math.min(2, (run.rolls || []).length + ((run.phase === "rolling" && !r) || run.phase === "flaw" ? 1 : 0)) || 1} of 2 at most</span>
      <b>${run.phase === "heat" ? "Heating the forge…" : run.phase === "flaw" ? "A flaw. One more try…" : `Under ${p.dc}%`}</b>
      <span class="ptdet">${[0, 1].map(i => html`<i class=${(i < run.flaws ? "on" : "") + (i === 1 ? " last" : "")}></i>`)}</span></div>
    ${run.phase !== "heat" && html`<div class=${"ptdice" + (run.phase === "rolling" && !r ? " rolling" : r ? (r.ok ? " ok" : " fail") : "")}>
      <span class="d100">${run.phase === "rolling" && !r ? spin || "··" : r ? r.r : "··"}</span>
      <span class="ptmath">${run.phase === "rolling" && !r ? html`d100 − ${run.mod} · under ${p.dc}` : r && html`${r.r} − ${run.mod} = <b>${r.total}</b> ${r.ok ? "<" : "≥"} ${p.dc}`}</span></div>`}
  </div>`;
}

function RepairSide({ c, update, suits, suit, job, selId, rp, st, busy, pick }) {
  return html`<div class="ptpick">
    <h3 class="ptpickh"><span>Suits</span></h3>
    <${ShopJobs} c=${c} kind="armor" selId=${selId} pick=${pick} busy=${busy} update=${update} />
    ${suits.length === 0 ? html`<p class="muted ptrule">Nothing to repair yet.</p>` : html`<div class="ptopts amsuits">${suits.map(a => { const p = R.repairPlan(c, a);
      return html`<button type="button" class="ptopt amsuit" aria-pressed=${!job && suit && suit.id === a.id} disabled=${busy} onClick=${() => pick(a.id)}>
        <b>${a.name || "Unnamed armor"}${a.worn ? html` <span class="flag brass">Worn</span>` : ""}${p.broken ? html` <span class="flag bad">Broken</span>` : ""}${Shop.outgoing(c, "armor", a.id) ? html` <span class="flag brass">At ${Shop.outgoing(c, "armor", a.id).to.name}'s</span>` : ""}</b>
        <span>${R.ARMOR[a.type].label} · AV ${num(a.av)} · Soak ${p.soak}/${p.max}</span>
        <i class="amtrack"><i style=${`width:${p.max ? (p.soak / p.max) * 100 : 0}%`}></i></i></button>`; })}</div>`}
    ${suit && html`<div class="ptplan"><h3 class="lbl">The repair</h3><ol>
      <li><span>Materials: ${rp.cost} g of ${R.ARMOR[suit.type].label.toLowerCase()} materials</span><span class="muted">${R.ARMOR[suit.type].repairPerAV} g × AV ${num(suit.av)}${rp.broken ? " × 2 to rebuild a broken suit (draft rule)" : ""}</span></li>
      <li><span>Check: d100 − ${st.mod}</span><span class="muted">Repair Count = 10 − check ÷ 10, rounded down, at most 10</span></li>
      <li><span>Roll ${rp.die} that many times</span><span class="muted">The total goes back into the Soak Pool (up to ${rp.max}). An hour per attempt.</span></li></ol>
      <p class="ptdc">Check 0 or less: 10 × ${rp.die} · check 40: 6 × ${rp.die} · check 90: 1 × ${rp.die}</p></div>`}
  </div>`;
}

function CraftSide({ c, rc, cp, st, focus, setFocus, setRc, busy }) {
  const T = R.ARMOR, t = cp.t;
  const Step = ({ label, value, min, max, onSet }) => html`<span class="ptstepper"><button class="iconbtn" aria-label=${`Lower ${label}`} disabled=${busy || value <= min} onClick=${() => onSet(value - 1)}>−</button>
    <button class="iconbtn" aria-label=${`Raise ${label}`} disabled=${busy || value >= max} onClick=${() => onSet(value + 1)}>+</button></span>`;
  let body;
  if (focus === "type") body = html`<p class="muted ptrule">The GM tells you what kind of suit can be made here.</p><div class="ptopts">${Object.entries(T).map(([k, x]) => html`<button type="button" class="ptopt" aria-pressed=${cp.type === k} disabled=${busy}
      onClick=${() => setRc(r => { r.type = k; r.av = x.av[0]; r.soak = 10 * x.av[0]; r.plusAV = 0; })}><b>${x.label} · AV ${x.av[0]}–${x.av[1]}</b>
      <span>${5 * x.repairPerAV} g × AV of ${x.label.toLowerCase()} materials${R.AM_FORGE.includes(k) ? " · needs a forge" : ""}</span></button>`)}</div>`;
  else if (focus === "av" || focus === "soak") body = !isGM() ? html`<p class="muted ptrule">The suit's base numbers come from the GM, so only a GM can set them here (they can open your sheet). To raise them yourself, use Extras: each step makes the roll harder.</p>
    <div class="facts wpbase">${[["Armor Value", cp.av], ["Soak Pool", cp.soak], ["Range for " + t.label.toLowerCase(), `${t.av[0]}–${t.av[1]}`]].map(([k, v]) => html`<div class="fact"><span>${k}</span><b>${v}</b></div>`)}</div>`
  : html`<p class="muted ptrule">The suit's base numbers, from the GM. Only a GM can change these; players raise them through Extras.</p>
    <div class="row ptrate"><span><b>Armor Value ${cp.av}</b> · ${t.label} runs ${t.av[0]}–${t.av[1]}</span>
      <${Step} label="Armor Value" value=${cp.av} min=${t.av[0]} max=${t.av[1]} onSet=${v => setRc(r => { r.av = v; r.plusAV = Math.min(num(r.plusAV), t.av[1] - v); })} /></div>
    <div class="row ptrate"><span><b>Soak Pool ${cp.soak}</b> · usually 10 × AV</span>
      <span class="ptstepper"><button class="iconbtn" aria-label="Lower Soak Pool" disabled=${busy || cp.soak <= 5} onClick=${() => setRc(r => { r.soak = Math.max(5, cp.soak - 5); })}>−</button>
        <button class="iconbtn" aria-label="Raise Soak Pool" disabled=${busy} onClick=${() => setRc(r => { r.soak = cp.soak + 5; })}>+</button></span></div>
    <button type="button" class="btn small" style="margin-top:8px" disabled=${busy || cp.soak === 10 * cp.av} onClick=${() => setRc(r => { r.soak = 10 * cp.av; })}>Soak = 10 × AV</button>`;
  else body = html`<p class="muted ptrule">Optional. Each extra makes the roll harder, like the book's weapon table. Our reading.</p>
    <div class="ptopts">
      <div class=${"ptopt row-opt" + (cp.plusAV ? " on" : "")}><span class="ptcheck"><b>Armor Value +1 · −10% each</b><span>${cp.plusAV ? `+${cp.plusAV}: AV ${cp.finalAV}` : `Up to ${t.av[1]} for ${t.label.toLowerCase()} armor`}</span></span>
        <div class="ptrate"><${Step} label="extra Armor Value" value=${cp.plusAV} min=${0} max=${t.av[1] - cp.av} onSet=${v => setRc(r => { r.plusAV = v; })} /></div></div>
      <div class=${"ptopt row-opt" + (cp.plusSoak ? " on" : "")}><span class="ptcheck"><b>Soak Pool +5 · −5% each</b><span>${cp.plusSoak ? `+${5 * cp.plusSoak}: Soak ${cp.finalSoak}` : "Up to +50"}</span></span>
        <div class="ptrate"><${Step} label="extra Soak Pool" value=${cp.plusSoak} min=${0} max=${10} onSet=${v => setRc(r => { r.plusSoak = v; })} /></div></div></div>
    ${st.artisan ? html`<p class="ptlocked">Artisan properties (Armor Maintenance 8) aren't written in the book yet.</p>` : ""}`;
  return html`<div class="ptpick">
    <h3 class="ptpickh"><span>${AM_NAME[focus] || "Type"}</span><small>${focus === "type" ? t.label : focus === "extra" ? `${cp.dc}%` : focus === "av" ? `AV ${cp.finalAV}` : `Soak ${cp.finalSoak}`}</small></h3>
    ${body}
    <div class="ptplan"><${PlanHead} title="The craft" busy=${busy} onReset=${() => setRc(r => refill(r, R.blankCharacter().craft.armor.recipe))} /><ol>
      <li><span>Materials: ${cp.cost} g of ${t.label.toLowerCase()} materials</span><span class="muted">5 × repair cost (${t.repairPerAV} g × AV ${cp.finalAV})</span></li>
      <li><span>Roll under ${cp.dc}%</span><span class="muted">${cp.chance}% to land · a failure leaves a flaw and you roll again; two failures lose it all</span></li>
      <li><span>Eight hours${R.AM_FORGE.includes(cp.type) ? " at a forge" : ""}</span><span class="muted">The suit joins your Armor on the Gear tab.</span></li></ol>
      <div class="row ptbatch"><label for=${"amn-" + c.id}>Name</label>
        <input id=${"amn-" + c.id} class="inp" placeholder=${`${t.label} armor`} value=${rc.name || ""} disabled=${busy} onInput=${e => setRc(r => { r.name = e.target.value; })} /></div>
      <${MadeFor} c=${c} value=${rc.for} busy=${busy} onSet=${v => setRc(r => { r.for = v; })} /></div>
  </div>`;
}
