/* ================= crafting: weapon upkeep (Weapon Maintenance) ================= */
// Repair and Craft, as in the rulebook's Weapon Maintenance section. The weapon stands in a rack; repair hammers out
// its nicks one d10 at a time; crafting forges it from a ghost outline. Shares its look with Armor upkeep.
const WSHAPE = { Slashing: "sword", Finesse: "sword", Motorized: "sword", Throwing: "dagger", Piercing: "spear", Bludgeoning: "hammer",
  Improvised: "hammer", Unarmed: "hammer", Rifles: "gun", "Sniper Rifles": "gun", Shotguns: "gun", Heavy: "gun", Explosives: "gun", Pistols: "pistol", Stringed: "bow", Shield: "shield" };
// Axes share the Slashing skill with swords; a name with "axe" in it gets the axe drawing.
const wShape = (skill, name) => (skill === "Slashing" && /axe/i.test(name || "") ? "axe" : WSHAPE[skill] || "sword");
// Where each callout lands, and where the nicks sit, for every shape.
const W_ANCHOR = {
  sword:  { type: [166, 150], av: [194, 180], soak: [172, 350], extra: [240, 303], nicks: [[194, 96], [166, 132], [194, 176], [166, 214], [194, 252], [166, 284]] },
  dagger: { type: [170, 205], av: [190, 225], soak: [172, 345], extra: [220, 305], nicks: [[190, 186], [170, 210], [190, 236], [170, 258], [190, 280], [170, 292]] },
  spear:  { type: [176, 250], av: [194, 80], soak: [176, 330], extra: [186, 146], nicks: [[192, 70], [168, 86], [192, 104], [178, 200], [182, 260], [178, 320]] },
  axe:    { type: [176, 250], av: [246, 140], soak: [176, 330], extra: [200, 186], nicks: [[256, 100], [250, 126], [246, 152], [236, 178], [222, 192], [178, 300]] },
  hammer: { type: [176, 250], av: [242, 105], soak: [176, 330], extra: [184, 170], nicks: [[124, 84], [236, 92], [150, 128], [212, 76], [180, 120], [228, 132]] },
  gun:    { type: [175, 150], av: [185, 40], soak: [164, 350], extra: [198, 276], nicks: [[185, 70], [175, 110], [185, 170], [175, 230], [200, 340], [168, 380]] },
  pistol: { type: [174, 200], av: [186, 140], soak: [176, 380], extra: [192, 310], nicks: [[186, 150], [174, 190], [186, 240], [174, 280], [190, 360], [180, 400]] },
  bow:    { type: [137, 240], av: [196, 120], soak: [150, 290], extra: [160, 330], nicks: [[160, 90], [140, 150], [146, 200], [140, 300], [150, 360], [168, 400]] },
  shield: { type: [100, 200], av: [210, 240], soak: [262, 320], extra: [236, 170], nicks: [[120, 180], [230, 200], [150, 300], [210, 320], [180, 160], [250, 260]] },
};
const W_NAMES = { repair: { type: "Weapon", av: "Damage", soak: "Durability", extra: "Repair" }, craft: { type: "Weapon", av: "Damage", soak: "Durability", extra: "Changes" } };
const wNicks = (dur, max) => (max <= 0 || dur >= max ? 0 : Math.max(1, Math.round((6 * (max - dur)) / max)));

function WeaponArt({ shape }) {
  const S = "url(#wp-steel)", W = "url(#wp-wood)", B = "url(#wp-brass)", L = "url(#wp-leather)";
  if (shape === "sword" || shape === "dagger") {
    const d = shape === "dagger", tip = d ? 150 : 34, base = d ? 300 : 296, hw = d ? 10 : 14, gw = d ? 40 : 60, gl = d ? 372 : 392;
    return html`
      <g class="am-layer am-l1"><path d=${`M180 ${tip} L${180 + hw} ${tip + 36} L${180 + hw} ${base} L${180 - hw} ${base} L${180 - hw} ${tip + 36} Z`} fill=${S} stroke="#1f2327" stroke-width="1.4" />
        <path d=${`M180 ${tip + 44} V${base - 10}`} stroke="#2b3036" stroke-width="3" /><path d=${`M${180 - hw + 3} ${tip + 40} V${base - 4}`} stroke="#fff" stroke-opacity=".45" stroke-width="1.6" /></g>
      <g class="am-layer am-l2"><rect x=${180 - gw} y=${base} width=${2 * gw} height="13" rx="5" fill=${B} stroke="#4a3210" />
        <rect x="171" y=${base + 13} width="18" height=${gl - base - 23} rx="3" fill=${L} />
        ${Array.from({ length: Math.floor((gl - base - 23) / 9) }, (_, i) => html`<path d=${`M171 ${base + 18 + i * 9} l18 5`} stroke="#1c120a" stroke-width="2" />`)}</g>
      <g class="am-layer am-l3"><circle cx="180" cy=${gl} r=${d ? 9 : 11} fill=${B} stroke="#4a3210" /></g>`;
  }
  if (shape === "spear") return html`
    <g class="am-layer am-l1"><rect x="176" y="120" width="8" height="310" rx="3" fill=${W} /></g>
    <g class="am-layer am-l2"><path d="M180 30 C197 60 199 92 190 118 L170 118 C161 92 163 60 180 30 Z" fill=${S} stroke="#1f2327" stroke-width="1.4" />
      <path d="M180 40 V112" stroke="#2b3036" stroke-width="2" /><rect x="173" y="112" width="14" height="30" rx="3" fill="#3a3f45" /></g>
    <g class="am-layer am-l3">${[144, 150, 156].map(y => html`<path d=${`M174 ${y} h12`} stroke="#5a3a1c" stroke-width="3" />`)}</g>`;
  if (shape === "axe") return html`
    <g class="am-layer am-l1"><rect x="175" y="96" width="10" height="334" rx="3" fill=${W} /></g>
    <g class="am-layer am-l2"><path d="M185 74 C238 62 264 108 252 170 C248 190 232 202 214 197 L185 168 Z" fill=${S} stroke="#1f2327" stroke-width="1.4" />
      <path d="M175 112 L148 122 L175 134 Z" fill=${S} stroke="#1f2327" /><path d="M240 84 C256 112 254 150 246 180" stroke="#fff" stroke-opacity=".45" stroke-width="2" fill="none" /></g>
    <g class="am-layer am-l3"><rect x="173" y="88" width="14" height="88" rx="2" fill="#3a3f45" />${[100, 140, 164].map(y => html`<circle cx="180" cy=${y} r="2.2" fill="#c9ced3" />`)}
      ${[386, 398, 410].map(y => html`<path d=${`M175 ${y} h10`} stroke="#3a2414" stroke-width="3" />`)}</g>`;
  if (shape === "hammer") return html`
    <g class="am-layer am-l1"><rect x="175" y="120" width="10" height="310" rx="3" fill=${W} /></g>
    <g class="am-layer am-l2"><rect x="118" y="70" width="124" height="70" rx="5" fill=${S} stroke="#1f2327" stroke-width="1.4" />
      <rect x="118" y="74" width="14" height="62" fill="#3a3f45" /><rect x="228" y="74" width="14" height="62" fill="#3a3f45" />
      <path d="M180 70 L171 70 L180 34 L189 70 Z" fill=${S} stroke="#1f2327" /><path d="M140 80 H220" stroke="#fff" stroke-opacity=".35" stroke-width="2" /></g>
    <g class="am-layer am-l3"><rect x="176" y="140" width="8" height="60" fill="#3a3f45" />${[[176, 150], [184, 170], [176, 190]].map(([x, y]) => html`<circle cx=${x} cy=${y} r="2" fill="#c9ced3" />`)}
      ${[380, 392, 404].map(y => html`<path d=${`M175 ${y} h10`} stroke="#3a2414" stroke-width="3" />`)}</g>`;
  if (shape === "gun") return html`
    <g class="am-layer am-l1"><path d="M168 250 L192 250 L197 300 L208 430 L158 438 L163 300 Z" fill=${W} stroke="#2c1a0c" stroke-width="1.2" />
      <path d="M170 262 L175 420" stroke="#fff" stroke-opacity=".2" stroke-width="3" /></g>
    <g class="am-layer am-l2"><rect x="175" y="20" width="10" height="285" rx="2" fill=${S} stroke="#16191c" /><rect x="177" y="16" width="6" height="8" fill="#2b3036" />
      ${[120, 210].map(y => html`<rect x="172" y=${y} width="16" height="7" rx="1" fill=${B} />`)}</g>
    <g class="am-layer am-l3"><rect x="186" y="262" width="13" height="32" rx="2" fill=${B} stroke="#4a3210" /><path d="M192 262 l8 -10" stroke="#2b3036" stroke-width="3" stroke-linecap="round" />
      <path d="M168 300 q-16 11 0 24" fill="none" stroke=${B} stroke-width="2.5" /></g>`;
  if (shape === "pistol") return html`
    <g class="am-layer am-l1"><path d="M170 328 L190 328 L200 420 L172 428 Z" fill=${W} stroke="#2c1a0c" stroke-width="1.2" /></g>
    <g class="am-layer am-l2"><rect x="174" y="120" width="12" height="184" rx="2" fill=${S} stroke="#16191c" /><rect x="168" y="292" width="24" height="40" rx="3" fill=${B} stroke="#4a3210" /></g>
    <g class="am-layer am-l3"><path d="M168 332 q-14 9 0 20" fill="none" stroke=${B} stroke-width="2.5" /><path d="M188 296 l9 -10" stroke="#2b3036" stroke-width="3" stroke-linecap="round" />
      ${[1, 2, 3].map(i => html`<path d=${`M${174 + i} ${360 + i * 14} l20 -3`} stroke="#1c120a" stroke-width="1.5" />`)}</g>`;
  if (shape === "bow") return html`
    <g class="am-layer am-l1"><path d="M196 40 L196 440" stroke="#e8dcc0" stroke-width="1.4" /></g>
    <g class="am-layer am-l2"><path d="M196 40 Q112 120 146 240 Q112 360 196 440" fill="none" stroke="#3a220f" stroke-width="10" stroke-linecap="round" />
      <path d="M196 40 Q112 120 146 240 Q112 360 196 440" fill="none" stroke="#9a6a3a" stroke-width="4" stroke-linecap="round" /></g>
    <g class="am-layer am-l3"><rect x="136" y="220" width="20" height="40" rx="5" fill=${L} />${[226, 234, 242, 250].map(y => html`<path d=${`M136 ${y} h20`} stroke="#1c120a" stroke-width="1.6" />`)}</g>`;
  return html`
    <g class="am-layer am-l1"><circle cx="180" cy="240" r="118" fill=${W} />${[-80, -40, 0, 40, 80].map(dx => html`<path d=${`M${180 + dx} ${240 - Math.sqrt(118 * 118 - dx * dx)} V${240 + Math.sqrt(118 * 118 - dx * dx)}`} stroke="#2c1a0c" stroke-width="2" />`)}</g>
    <g class="am-layer am-l2"><circle cx="180" cy="240" r="118" fill="none" stroke=${S} stroke-width="10" /><circle cx="180" cy="240" r="30" fill=${S} stroke="#1f2327" stroke-width="1.5" />
      <circle cx="172" cy="232" r="8" fill="#fff" fill-opacity=".3" /></g>
    <g class="am-layer am-l3">${Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return html`<circle cx=${180 + 112 * Math.cos(a)} cy=${240 + 112 * Math.sin(a)} r="2.6" fill="#d6dbe0" />`; })}</g>`;
}

function WeaponFigure({ shape, nicks, broken, mode, run, labels, focus, onPick, tags }) {
  const ph = run && run.phase, A = W_ANCHOR[shape];
  const ghost = mode === "craft" && (!run || ["heat", "rolling", "flaw", "lost"].includes(ph));
  const made = mode === "craft" && ph === "made";
  const hammering = run && (ph === "strike" || (mode === "craft" && ph === "rolling"));
  const names = W_NAMES[mode];
  return html`<div class=${"ptmun ammun wpmun" + (ghost ? " ghost" : "") + (made ? " made" : "") + (ph === "lost" ? " lost" : "") + (broken && mode === "repair" ? " broken" : "") + (run && run.done && mode === "repair" ? " mended" : "")}>
    <svg class="ptsvg" viewBox="0 0 360 460" role="img" aria-label=${`A weapon in a rack${nicks ? `, ${nicks} nicks` : ""}`}>
      <defs>
        <linearGradient id="wp-steel" x1="0" x2="1"><stop offset="0" stop-color="#4c535a" /><stop offset=".42" stop-color="#e6eaee" /><stop offset=".6" stop-color="#a3acb4" /><stop offset="1" stop-color="#40464c" /></linearGradient>
        <linearGradient id="wp-wood" x1="0" x2="1"><stop offset="0" stop-color="#4f2e14" /><stop offset=".45" stop-color="#a87442" /><stop offset="1" stop-color="#4a2b12" /></linearGradient>
        <linearGradient id="wp-brass" x1="0" x2="1"><stop offset="0" stop-color="#7a5418" /><stop offset=".35" stop-color="#f1cd77" /><stop offset="1" stop-color="#6b4512" /></linearGradient>
        <linearGradient id="wp-leather" x1="0" x2="1"><stop offset="0" stop-color="#2e1c0e" /><stop offset=".5" stop-color="#6a4426" /><stop offset="1" stop-color="#2a180a" /></linearGradient>
        <radialGradient id="wp-fire" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd27a" stop-opacity=".95" /><stop offset=".45" stop-color="#ff7a2a" stop-opacity=".55" /><stop offset="1" stop-color="#ff4a1a" stop-opacity="0" /></radialGradient>
        <linearGradient id="wp-glint" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0" /><stop offset=".5" stop-color="#fff" stop-opacity=".8" /><stop offset="1" stop-color="#fff" stop-opacity="0" /></linearGradient>
      </defs>
      ${mode === "craft" && html`<ellipse class=${"am-glow" + (run && ["heat", "rolling", "flaw"].includes(ph) ? " on" : "")} cx="180" cy="420" rx="150" ry="46" fill="url(#wp-fire)" />`}
      <g class="am-stand"><rect x="104" y="428" width="152" height="16" rx="3" fill="url(#wp-wood)" /><rect x="118" y="410" width="10" height="20" fill="url(#wp-wood)" /><rect x="232" y="410" width="10" height="20" fill="url(#wp-wood)" /></g>
      <g class="ptlines">${Object.keys(AM_LABELS).map(p => { const [side, ly] = AM_LABELS[p], [ax, ay] = A[p], lx = side === "l" ? 112 : 248;
        return html`<g class=${"ptline" + (focus === p ? " on" : "")}><path d=${`M${lx} ${ly} H${side === "l" ? lx + 12 : lx - 12} L${ax} ${ay}`} /><circle cx=${ax} cy=${ay} r="3.6" /></g>`; })}</g>
      <g class=${"am-suit" + (made ? " assemble" : "")}><${WeaponArt} shape=${shape} /></g>
      ${mode === "craft" && run && run.flaws.length > 0 && html`<g class="am-flaw"><path d=${`M${A.av[0] - 6} ${A.av[1] - 18} l-10 14 7 5 -12 18`} />${run.flaws.length > 1 && html`<path d=${`M${A.soak[0] + 4} ${A.soak[1] - 30} l10 12 -6 5 10 14`} />`}</g>`}
      <g class="am-marks">${A.nicks.slice(0, mode === "repair" ? nicks : 0).map(([x, y], i) => html`<g class="am-dent" key=${i}>
        <path d=${`M${x - 6} ${y - 4} l6 4 -6 4 z`} fill="#141414" fill-opacity=".8" /><path d=${`M${x - 9} ${y + 6} l14 -10`} stroke="#141414" stroke-width="1.2" /></g>`)}</g>
      ${broken && mode === "repair" && html`<path class="am-break" d=${`M${A.av[0] - 4} ${A.av[1] - 20} l-10 22 9 6 -12 26 8 6`} />`}
      ${hammering && html`<g transform="translate(318 250)"><g class="am-swing go" key=${run.strike != null ? "s" + run.strike : "r" + run.flaws.length}>
        <rect x="-104" y="-4" width="104" height="8" rx="3" fill="url(#wp-wood)" /><rect x="-124" y="-17" width="26" height="34" rx="3" fill="url(#wp-steel)" stroke="#1d2024" /><rect x="-102" y="-6" width="7" height="12" fill="#3d4146" /></g></g>
        <g class="ptsparks burst" transform="translate(222 195)" key=${"sp" + (run.strike != null ? run.strike : run.flaws.length)}>${Array.from({ length: 9 }, (_, i) => html`<line x1="0" y1="0" x2="0" y2="-9" style=${`--a:${i * 40 + 10}deg;--d:220ms`} />`)}</g>`}
      ${run && ph === "strike" && run.dice[run.strike] != null && html`<text class="am-plus" key=${"t" + run.strike} x="236" y="182">+${run.dice[run.strike]}</text>`}
      ${(made || (run && run.done && mode === "repair")) && html`<g class="ptsteam">${[0, 1, 2, 3].map(i => html`<circle cx=${140 + i * 26} cy="380" r=${12 + (i % 2) * 5} style=${`--d:${i * 150}ms`} />`)}</g>`}
    </svg>
    ${Object.keys(AM_LABELS).map(p => { const [side, ly] = AM_LABELS[p];
      return html`<button type="button" class=${"ptlabel " + side + (focus === p ? " on" : "")} style=${`top:${(ly / 460) * 100}%`} disabled=${!!run || !onPick} aria-pressed=${focus === p} onClick=${() => onPick && onPick(p)}>
        <span class="k">${names[p]}</span><span class="v">${labels[p]}</span></button>`; })}
    ${tags && tags.length > 0 && html`<div class="wptags">${tags.map(t => html`<span class=${"flag " + (t.bad ? "bad" : "good")} title=${t.tip}>${t.name}</span>`)}</div>`}
  </div>`;
}

function WeaponUpkeep({ c, update }) {
  const st = R.wmState(c), cw = c.craft.weapon;
  const [mode, setMode] = useState(() => lsGet("cw-wm-mode", "repair"));
  useEffect(() => lsSet("cw-wm-mode", mode), [mode]);
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
  useEffect(() => { const f = shop.focus; if (f && f.kind === "weapon" && f.char === c.id && !runRef.current) { shop.focus = null; setMode("repair"); setSel(f.sel); } }, [shop.focusSeq, c.id]);
  const busy = !!run && !run.done;
  useShop();
  const ws = c.weapons.filter(w => num(w.durMax) > 0 || w.name);
  const byNeed = [...ws].sort((a, b) => R.wRepairPlan(c, b).missing - R.wRepairPlan(c, a).missing);
  // Another player's weapon on this bench (a workshop job), else one of this character's own.
  const job = run && run.kind === "repair" ? run.job : selId.startsWith("job:") ? Shop.incoming(c, "weapon").find(j => "job:" + j.id === selId) || null : null;
  const weapon = job ? Shop.view(job) : ws.find(w => w.id === (run && run.kind === "repair" ? run.id : selId)) || byNeed[0] || null;
  const away = !job && weapon ? Shop.outgoing(c, "weapon", weapon.id) : null;   // sent to a smith: they repair it, not us
  const rp = weapon ? Object.assign(R.wRepairPlan(c, weapon), away ? { block: `It's with ${away.to.name}. Take it back on the Gear tab to repair it yourself.` } : {}) : null;
  const rc = cw.recipe, cp = R.wCraftPlan(c, rc);
  const setRc = fn => update(x => fn(x.craft.weapon.recipe));
  const addLedger = (x, e) => { x.craft.weapon.ledger = [Object.assign({ id: rid(), t: Date.now(), note: "" }, e), ...x.craft.weapon.ledger].slice(0, 20); };
  const traitTip = n => { const k = n.replace(/ \(.*$/, ""); const all = [...R.WEAPON_PROPS, ...R.WEAPON_FLAWS]; return all.some(x => x[0] === k) ? "See the Weapons rules on the Gear tab." : ""; };

  /* ---------- repair: one check, then one hammer strike per d10 ---------- */
  const startRepair = async () => {
    if (!weapon || rp.block) return;
    const plan = rp, id = weapon.id, theJob = job;
    const first = await askRoll({ title: theJob ? `Weapon repair check: ${theJob.from.name}'s ${weapon.name || "weapon"}` : "Weapon repair check", dice: [{ n: 1, sides: 100 }], cancel: true,
      note: `d100 − ${st.mod}. Repair Count = 10 − check ÷ 10: that many d10 restore Durability.` });
    if (!first) return;
    setSel(theJob ? "job:" + theJob.id : id);
    setRun({ kind: "repair", phase: "rolling", id, job: theJob, plan, dice: [], strike: null, shown: 0, gained: 0, mod: st.mod, flaws: [] });
    later(() => {
      const r = first[0], check = r - st.mod, count = R.repairCount(check);
      patch({ phase: "counted", r, check, count, dice: [] });
      // Rolled at the table, the d10s come back as one total: one strike for the lot.
      askRoll({ title: `Repair dice: ${count}d10`, dice: [{ n: count, sides: plan.sides }], note: "Durability goes back up by the total." }).then(dice => {
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
      // Another player's weapon: the repair adds to the job (the smith can repair again, then send it back); this smith pays the materials.
      const roll = `check ${f.r}−${f.mod}=${f.check} → ${f.count} × d10${f.count ? ": " + total : ""}`;
      if (!Shop.progress(f.job, gained, roll, c.name || "")) { toast(`${f.job.from.name} took it back before you finished.`); patch({ done: true, phase: "done", total, gainedFinal: 0, gone: true }); return; }
      update(x => {
        x.craft.supplies.weapon = Math.max(0, num(x.craft.supplies.weapon) - f.plan.cost);
        const txt = `${f.job.from.name}'s ${f.job.item.name || "weapon"}: Durability ${f.plan.dur} → ${f.plan.dur + gained}`;
        addLedger(x, { kind: "repair", name: `Repaired ${txt}`, rolls: [roll] });
        addLog(x, `Weapon repair for ${f.job.from.name}: ${txt} (${f.plan.cost} g weapon materials)`);
      });
      patch({ done: true, phase: "done", total, gainedFinal: gained });
      return;
    }
    update(x => {
      const w = x.weapons.find(y => y.id === f.id); if (!w) return;
      w.dur = num(w.dur) + gained;
      x.craft.supplies.weapon = Math.max(0, num(x.craft.supplies.weapon) - f.plan.cost);
      const txt = `${w.name || "Weapon"}: Durability ${f.plan.dur} → ${f.plan.dur + gained}`;
      addLedger(x, { kind: "repair", name: `Repaired ${txt}`, rolls: [`check ${f.r}−${f.mod}=${f.check} → ${f.count} × d10${f.count ? ": " + (f.dice.length > 1 ? f.dice.join(" + ") + " = " : "") + total : ""}`] });
      addLog(x, `Weapon repair: ${txt} (${f.plan.cost} g weapon materials, ${f.count}d10)`);
    });
    patch({ done: true, phase: "done", total, gainedFinal: gained });
  };

  /* ---------- craft: roll; each failure adds a random flaw and rolls again, until the failures run out ---------- */
  const startCraft = async () => {
    if (cp.block) return;
    const plan = cp, recipe = clean(rc), name = (rc.name || "").trim() || `New ${rc.skill === "Shield" ? "shield" : rc.skill.toLowerCase() + " weapon"}`;
    const ask = n => askRoll({ title: n ? `Weapon craft: try ${n + 1}` : "Weapon craft check", dice: [{ n: 1, sides: 100 }], cancel: !n,
      note: `d100 − ${st.mod}, under ${plan.dc}.${n >= plan.st.maxFails ? " One more failure loses the weapon." : " A failure adds a flaw and gives another try."}` });
    const first = await ask(0);
    if (!first) return;
    setRun({ kind: "craft", phase: "heat", plan, recipe, name, rolls: [], flaws: [], mod: st.mod });
    const roll = async n => {
      const r = n ? (await ask(n))[0] : first[0];
      if (!runRef.current) return;
      patch({ phase: "rolling", roll: null });
      later(() => {
        const g = runRef.current, ok = r - st.mod < plan.dc;
        patch(h => ({ roll: { r, total: r - st.mod, ok }, rolls: [...h.rolls, { r, total: r - st.mod, ok }] }));
        if (ok) return later(() => finishCraft(true), 500);
        const flaw = R.randomTraits(R.WEAPON_FLAWS, plan.kind, g.flaws.map(x => x.replace(/ \(.*$/, "")), 1)[0] || "A flaw (GM)";
        if (g.flaws.length + 1 > g.plan.st.maxFails) later(() => { patch(h => ({ flaws: [...h.flaws, flaw] })); later(() => finishCraft(false), 700); }, 600);
        else later(() => { patch(h => ({ phase: "flaw", flaws: [...h.flaws, flaw] })); later(() => roll(n + 1), 1500); }, 600);
      }, 1400);
    };
    later(() => roll(0), 900);
  };
  const finishCraft = ok => {
    const f = runRef.current; if (!f) return;
    const p = f.plan, r = f.recipe;
    const chosen = p.props.map(k => (R.WEAPON_PROPS.find(x => x[0] === k)[1] ? `${k} (Rating: GM)` : k));
    const extra = ok && p.props.length < 2 ? R.randomTraits(R.WEAPON_PROPS, p.kind, p.props, 2) : [];
    const exotic = p.ex ? [`${p.ex.name}${p.ex.note ? ` (${p.ex.note})` : ""}`] : [];
    const props = [...chosen, ...extra, ...exotic, ...(r.unwieldy ? ["Unwieldy"] : []), ...f.flaws];
    const forWho = ok && r.for && r.for !== c.id ? Shop.card(r.for) : null;
    update(x => {
      x.craft.supplies.weapon = Math.max(0, num(x.craft.supplies.weapon) - p.cost);
      const made = ok && { id: rid(), name: f.name, skill: r.skill, shield: r.skill === "Shield", hands: num(r.hands) === 2 ? 2 : 1,
        size: r.skill === "Shield" || num(r.hands) === 2 ? "large" : "medium", damage: p.final.damage, crit: p.final.crit, accuracy: p.final.accuracy,
        dur: p.final.durMax, durMax: p.final.durMax, durDie: p.final.durDie, clip: 0, clipMax: 0, rangeOpt: 0, rangeMax: 0, reload: 0,
        props: props.join(", "), where: "pack", final: true };
      if (made && !forWho) x.weapons.push(made);
      if (made && forWho) Shop.gift("weapon", c, made, forWho);
      addLedger(x, { kind: "craft", name: ok ? `Crafted ${f.name}${forWho ? ` for ${forWho.name}` : ""}${f.flaws.length ? ` · ${f.flaws.length} flaw${f.flaws.length > 1 ? "s" : ""}` : ""}` : `Lost ${f.name} in the forge`,
        scrap: !ok, det: ok && props.some(t => /Rating: GM/.test(t)) ? 1 : 0, rolls: f.rolls.map(q => `${q.r}−${f.mod}=${q.total} vs ${p.dc} ${q.ok ? "✓" : "✗"}`) });
      addLog(x, ok ? `Weapon crafting: made ${f.name} (${p.cost} g weapon materials)` : `Weapon crafting: the weapon was lost (${p.cost} g weapon materials)`);
    });
    patch({ done: true, phase: ok ? "made" : "lost", gotProps: ok ? [...chosen, ...extra, ...exotic] : [], extra, forName: forWho ? forWho.name : "" });
  };
  const close = () => { stop(); setRun(null); };
  // On another player's item: repair it again straight away, or send it back with every repair made.
  const [again, setAgain] = useState(false);
  const liveJob = run && run.job ? Shop.jobs.find(j => j.id === run.job.id && j.status === "open") || null : null;
  const left = liveJob ? (v => num(v.durMax) - num(v.dur))(Shop.view(liveJob)) : 0;   // still to repair
  const repairAgain = () => { const j = run.job; close(); setSel("job:" + j.id); setAgain(true); };
  const sendBack = () => { const j = run.job; if (Shop.finish(j, update, c.name || "")) toast(`Sent back to ${j.from.name}.`); close(); setSel(""); };
  useEffect(() => { if (again && !run && job) { setAgain(false); startRepair(); } }, [again, !!run, job && job.id]);

  const shape = mode === "repair" ? (weapon ? wShape(weapon.shield ? "Shield" : weapon.skill, weapon.name) : "sword") : wShape(rc.skill, rc.name);
  const shownDur = run && run.kind === "repair" ? run.plan.dur + run.gained : rp ? rp.dur : 0;
  const repairLabels = weapon && { type: weapon.name || weapon.skill, av: `${num(weapon.damage)} · crit ${num(weapon.crit)}%`, soak: `${shownDur} / ${rp.max}`, extra: `d10 · ${rp.cost} g` };
  const craftLabels = { type: `${rc.skill}${rc.skill === "Shield" ? "" : num(rc.hands) === 2 ? " · two-handed" : " · one-handed"}`, av: `${cp.final.damage} · crit ${cp.final.crit}%`,
    soak: `${cp.final.durMax} · ${cp.final.durDie}`, extra: `${cp.dc}% to beat` };
  const tags = run && run.kind === "craft" ? [...(run.gotProps || []).map(n => ({ name: n, tip: traitTip(n) })), ...run.flaws.map(n => ({ name: n, bad: true, tip: traitTip(n) }))] : null;

  return html`
    <section class="frame ambench wpbench">
      <${Head} title=${mode === "repair" ? "Repairing weapons" : "Crafting weapons"} topic=${mode === "repair" ? "weaponRepair" : "weaponCraft"} />
      <p class="sub">${mode === "repair" ? "Pick a worn weapon and repair it. One check sets how many d10 you roll; each goes back into its Durability." : "Set the weapon the GM agreed on, add any changes, then forge it. A failure gives it a flaw and you roll again."}</p>
      <div class="seg two ammode" role="group" aria-label="Repair or craft">${[["repair", "Repair"], ["craft", "Craft"]].map(([k, n]) => html`<button aria-pressed=${mode === k} disabled=${busy} onClick=${() => { close(); setMode(k); }}>${n}</button>`)}</div>
      <div class="facts ptfacts">${[["Weapon Maintenance", `${st.lvl}`], ["Modifier", `${st.mod}%`], ["Repair and craft", st.repair ? "Mundane weapons" : "From level 3"],
        ["Failures allowed", st.repair ? `${st.maxFails}, the next one loses it` : "—"]].map(([k, v]) => html`<div class="fact"><span>${k}</span><b>${v}</b></div>`)}</div>
      <div class="ptgrid">
        <div class="ptstage amstage">
          ${mode === "repair" && !weapon ? html`<p class="muted amempty">No weapons yet. Add one on the Gear tab, or craft one.</p>` : html`
          <${WeaponFigure} shape=${shape} mode=${mode} run=${run} focus=${mode === "craft" ? focus : null} onPick=${mode === "craft" ? p => setFocus(p === "soak" ? "av" : p) : null}
            labels=${mode === "repair" ? repairLabels : craftLabels} broken=${rp && (run && run.kind === "repair" ? run.plan.broken && !run.gained : rp.broken)}
            nicks=${mode === "repair" && rp ? wNicks(shownDur, rp.max) : 0} tags=${tags} />`}
          ${mode === "repair" && rp && html`<div class="amsoak" aria-hidden="true"><i style=${`width:${rp.max ? Math.min(100, (shownDur / rp.max) * 100) : 0}%`}></i></div>`}
          <div class="ptforge">
            ${!run && mode === "repair" && weapon && html`<button class="btn primary big forgebtn" disabled=${!!rp.block} onClick=${startRepair}>${HAMMER}Repair · ${rp.cost} g</button>
              ${rp.block && html`<p class="muted ptwhy">${rp.block}</p>`}`}
            ${!run && mode === "craft" && html`<button class="btn primary big forgebtn" disabled=${!!cp.block} onClick=${startCraft}>${HAMMER}Forge it · ${cp.cost} g</button>
              ${cp.block && html`<p class="muted ptwhy">${cp.block}</p>`}`}
            ${run && html`<${WmReadout} run=${run} onClose=${close} job=${liveJob} left=${left} onAgain=${repairAgain} onSendBack=${sendBack} />`}
          </div>
        </div>
        <div class="ptside">${mode === "repair" ? html`<${WRepairSide} c=${c} update=${update} ws=${ws} weapon=${weapon} job=${job} selId=${selId} rp=${rp} st=${st} busy=${busy} pick=${id => { close(); setSel(id); }} />`
          : html`<${WCraftSide} c=${c} rc=${rc} cp=${cp} st=${st} focus=${focus} setRc=${setRc} busy=${busy} />`}</div>
      </div>
    </section>

    <section class="frame"><h2 class="h"><span>Supplies</span><i class="orn" aria-hidden="true"></i></h2>
      <p class="sub">Weapon materials, in grams. You also need a blacksmithing kit or a forge. Foraging can find repair materials.</p>
      <div class="ptsupplies"><div class="mini ptsup big"><label for=${"wm-m" + c.id}>Weapon materials (g)</label>
          <input id=${"wm-m" + c.id} type="number" min="0" step="100" value=${c.craft.supplies.weapon ?? 0} onInput=${e => update(x => { x.craft.supplies.weapon = Math.max(0, +e.target.value || 0); })} /></div>
        <div class="mini ptsup"><label for=${"wm-b" + c.id}>Other bonus (%)</label>
          <input id=${"wm-b" + c.id} type="number" step="1" value=${cw.bonus ?? 0} onInput=${e => update(x => { x.craft.weapon.bonus = +e.target.value || 0; })} /></div></div>
    </section>

    <section class="frame"><h2 class="h"><span>Ledger</span><i class="orn" aria-hidden="true"></i></h2>
      <p class="sub">Repairs and crafted weapons, newest first. Where a property or flaw needs a Rating, the GM sets it; note it here and on the weapon's card.</p>
      ${cw.ledger.length === 0 ? html`<p class="muted">No repairs or crafts yet.</p>` : html`<div class="ptledger">${cw.ledger.map((e, i) => html`<div class=${"pled" + (e.scrap ? " scrap" : "")}>
        <div class="row" style="justify-content:space-between;flex-wrap:nowrap"><b>${e.name}</b>
          <button class="iconbtn" aria-label="Remove this entry" onClick=${() => update(x => { x.craft.weapon.ledger.splice(i, 1); })}>×</button></div>
        <span class="muted">${new Date(e.t).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}${e.rolls && e.rolls.length ? " · " + e.rolls.join(" · ") : ""}</span>
        ${e.det > 0 && html`<input class="inp" aria-label="Notes" placeholder="Ratings the GM set" value=${e.note} onInput=${ev => update(x => { x.craft.weapon.ledger[i].note = ev.target.value; })} />`}</div>`)}</div>`}
    </section>`;
}

function WmReadout({ run, onClose, job, left, onAgain, onSendBack }) {
  const [spin, setSpin] = useState(0);
  useEffect(() => {
    if (run.phase !== "rolling" || reduceMotion()) return;
    const t = setInterval(() => setSpin(1 + Math.floor(Math.random() * 100)), 55);
    return () => clearInterval(t);
  }, [run.phase, (run.rolls || []).length]);
  if (run.kind === "repair") {
    const p = run.plan;
    if (run.done) return html`<div class=${"ptread end " + (run.gainedFinal ? "done" : "nothing")} role="status">
      <p class="ptbig">${run.gainedFinal ? `+${run.gainedFinal} Durability` : "No durability recovered"}</p>
      <p>${run.count ? `${run.count} × d10: ${run.dice.length > 1 ? run.dice.join(" + ") + " = " : ""}${run.total}${run.total > run.gainedFinal ? ` (it was full at ${p.max})` : ""}` : "The check was too high for even one die."}</p>
      <p class="muted">${run.gone ? "Nothing was spent." : `${p.cost} g of weapon materials used · an hour's work.`}${job ? ` ${num((job.result || {}).times) > 1 ? `Repaired ${num(job.result.times)} times: +${num(job.result.gained)} ${"Durability"} in all. ` : ""}${left > 0 ? `${left} still to go. Repair again, or send it back to ${job.from.name} when you're done.` : `It's fully repaired. Send it back to ${job.from.name}.`}` : ""}${p.broken ? " The flaw it gained for breaking stays until a weaponsmith removes it." : ""}</p>
      ${job ? html`<div class="row shopnext">${left > 0 && html`<button class="btn primary" onClick=${onAgain}>Repair again</button>`}
          <button class=${"btn" + (left > 0 ? "" : " primary")} onClick=${onSendBack}>Send it back to ${job.from.name}</button>
          <button class="btn" onClick=${onClose}>Back to the bench</button></div>`
        : html`<button class="btn primary" onClick=${onClose}>Back to the bench</button>`}</div>`;
    return html`<div class="ptread" role="status" aria-live="polite">
      <div class="ptstep"><span class="lbl">${run.phase === "rolling" ? "Weapon Maintenance check" : "Repair dice"}</span><b>${run.phase === "rolling" ? "Looking it over…" : `${run.count} × d10`}</b></div>
      ${run.phase === "rolling" ? html`<div class="ptdice rolling"><span class="d100">${spin || "··"}</span><span class="ptmath">d100 − ${run.mod} · lower is better</span></div>`
        : html`<div class="ptdice ok"><span class="d100">${run.r}</span><span class="ptmath">${run.r} − ${run.mod} = <b>${run.check}</b> · Repair Count 10 − ${run.check} ÷ 10 → <b>${run.count}</b></span></div>`}
      ${run.count > 0 && run.phase !== "rolling" && html`<div class="amdice">${run.dice.map((v, i) => html`<span class=${"amdie" + (i < run.shown ? " on" : "")}>${i < run.shown ? v : ""}</span>`)}<b class="amsum">+${run.gained}</b></div>`}
    </div>`;
  }
  const p = run.plan, r = run.roll, maxRolls = p.st.maxFails + 1;
  if (run.done) return html`<div class=${"ptread end " + (run.phase === "made" ? "done" : "scrap")} role="status">
    <p class="ptbig">${run.phase === "made" ? "Forged" : "Lost in the forge"}</p>
    <p>${run.phase === "made" ? `${run.name}: damage ${p.final.damage}, crit ${p.final.crit}%, accuracy ${p.final.accuracy >= 0 ? "+" : ""}${p.final.accuracy}%, durability ${p.final.durMax} (${p.final.durDie}).` : "Too many failures: the weapon and every material in it are gone."}</p>
    ${run.phase === "made" && html`<p class="muted">${run.extra && run.extra.length ? "It had fewer than 2 properties, so it gained 2 at random. " : ""}${run.forName ? `Sent to ${run.forName}'s Gear` : "Added to Weapons on the Gear tab"}${R.RANGED_WEAPONS.includes(run.recipe.skill) ? "; set its clip and ranges there" : ""}. Eight hours at the anvil.</p>`}
    <button class="btn primary" onClick=${onClose}>Back to the bench</button></div>`;
  return html`<div class="ptread" role="status" aria-live="polite">
    <div class="ptstep"><span class="lbl">Roll ${Math.min(maxRolls, run.rolls.length + ((run.phase === "rolling" && !r) || run.phase === "flaw" ? 1 : 0)) || 1} of ${maxRolls} at most</span>
      <b>${run.phase === "heat" ? "Heating the forge…" : run.phase === "flaw" ? `A flaw: ${run.flaws[run.flaws.length - 1]}. Again…` : `Under ${p.dc}%`}</b>
      <span class="ptdet">${Array.from({ length: maxRolls }, (_, i) => html`<i class=${(i < run.flaws.length ? "on" : "") + (i === maxRolls - 1 ? " last" : "")}></i>`)}</span></div>
    ${run.phase !== "heat" && html`<div class=${"ptdice" + (run.phase === "rolling" && !r ? " rolling" : r ? (r.ok ? " ok" : " fail") : "")}>
      <span class="d100">${run.phase === "rolling" && !r ? spin || "··" : r ? r.r : "··"}</span>
      <span class="ptmath">${run.phase === "rolling" && !r ? html`d100 − ${run.mod} · under ${p.dc}` : r && html`${r.r} − ${run.mod} = <b>${r.total}</b> ${r.ok ? "<" : "≥"} ${p.dc}`}</span></div>`}
  </div>`;
}

function WRepairSide({ c, update, ws, weapon, job, selId, rp, st, busy, pick }) {
  return html`<div class="ptpick">
    <h3 class="ptpickh"><span>Weapons</span></h3>
    <${ShopJobs} c=${c} kind="weapon" selId=${selId} pick=${pick} busy=${busy} update=${update} />
    ${ws.length === 0 ? html`<p class="muted ptrule">Nothing to repair yet.</p>` : html`<div class="ptopts amsuits">${ws.map(w => { const p = R.wRepairPlan(c, w);
      return html`<button type="button" class="ptopt amsuit" aria-pressed=${!job && weapon && weapon.id === w.id} disabled=${busy} onClick=${() => pick(w.id)}>
        <b>${w.name || "Unnamed weapon"}${p.broken ? html` <span class="flag bad">Broken</span>` : ""}${Shop.outgoing(c, "weapon", w.id) ? html` <span class="flag brass">At ${Shop.outgoing(c, "weapon", w.id).to.name}'s</span>` : ""}</b>
        <span>${[w.shield ? "Shield" : w.skill, num(w.hands) === 2 ? "two-handed" : "one-handed", p.max ? `Durability ${p.dur}/${p.max}` : "No durability yet"].filter(Boolean).join(" · ")}</span>
        <i class="amtrack"><i style=${`width:${p.max ? (p.dur / p.max) * 100 : 0}%`}></i></i></button>`; })}</div>`}
    ${weapon && html`<div class="ptplan"><h3 class="lbl">The repair</h3><ol>
      <li><span>Materials: ${rp.cost} g of weapon materials</span><span class="muted">${num(weapon.hands) === 2 ? "Two-handed 800 g" : "One-handed 400 g"}${rp.cost > (num(weapon.hands) === 2 ? 800 : 400) ? " + 400 g for Unwieldy" : ""}</span></li>
      <li><span>Check: d100 − ${st.mod}</span><span class="muted">Repair Count = 10 − check ÷ 10, rounded down, at most 10</span></li>
      <li><span>Roll d10 that many times</span><span class="muted">The total goes back into Durability (up to ${rp.max}). An hour per attempt.</span></li></ol>
      <p class="ptdc">Check 0 or less: 10 × d10 · check 40: 6 × d10 · check 90: 1 × d10</p></div>`}
  </div>`;
}

function WCraftSide({ c, rc, cp, st, focus, setRc, busy }) {
  const Step = ({ label, value, max, onSet }) => html`<span class="ptstepper"><button class="iconbtn" aria-label=${`Lower ${label}`} disabled=${busy || value <= 0} onClick=${() => onSet(value - 1)}>−</button>
    <button class="iconbtn" aria-label=${`Raise ${label}`} disabled=${busy || value >= max} onClick=${() => onSet(value + 1)}>+</button></span>`;
  const plus = rc.plus || {}, setPlus = (k, v) => setRc(r => { r.plus = Object.assign({}, r.plus, { [k]: v }); });
  const numIn = (k, label, step = 1) => html`<div class="mini"><label for=${"wc-" + k + c.id}>${label}</label>
    <input id=${"wc-" + k + c.id} type="number" step=${step} value=${rc[k]} disabled=${busy} onInput=${e => setRc(r => { r[k] = +e.target.value || 0; })} /></div>`;
  let body;
  if (focus === "type") body = html`<p class="muted ptrule">What kind of weapon, and what it's called.</p>
    <div class="grid2">
      <div class="mini"><label for=${"wc-s" + c.id}>Weapon skill</label><select id=${"wc-s" + c.id} value=${rc.skill} disabled=${busy} onChange=${e => setRc(r => { r.skill = e.target.value; r.props = []; })}>
        <optgroup label="Melee">${R.WEAPON_TYPES.filter(([t]) => !R.RANGED_WEAPONS.includes(t)).map(([t]) => html`<option>${t}</option>`)}</optgroup>
        <optgroup label="Ranged">${R.RANGED_WEAPONS.map(t => html`<option>${t}</option>`)}</optgroup><optgroup label="Other"><option>Shield</option></optgroup></select></div>
      <div class="mini"><label for=${"wc-h" + c.id}>Hands</label><select id=${"wc-h" + c.id} value=${rc.hands} disabled=${busy} onChange=${e => setRc(r => { r.hands = +e.target.value; })}><option value="1">One</option><option value="2">Two</option></select></div></div>
    <label class="amforge"><input type="checkbox" checked=${!!rc.unwieldy} disabled=${busy} onChange=${e => setRc(r => { r.unwieldy = e.target.checked; })} /> Unwieldy <span class="muted">(the GM says; +400 g to repair, so ×5 to craft)</span></label>
    <div class="row ptbatch"><label for=${"wc-n" + c.id}>Name</label><input id=${"wc-n" + c.id} class="inp" placeholder="Name it" value=${rc.name || ""} disabled=${busy} onInput=${e => setRc(r => { r.name = e.target.value; })} /></div>
    <${MadeFor} c=${c} value=${rc.for} busy=${busy} onSet=${v => setRc(r => { r.for = v; })} />`;
  else if (focus === "av") body = !isGM() ? html`<p class="muted ptrule">The base stats come from the GM, so only a GM can set them here (they can open your sheet). To raise them yourself, use Changes: each step makes the roll harder.</p>
    <div class="facts wpbase">${[["Damage", rc.damage], ["Crit", `${num(rc.crit)}%`], ["Accuracy", `${num(rc.accuracy) >= 0 ? "+" : ""}${num(rc.accuracy)}%`], ["Durability", rc.dur], ["Durability die", rc.durDie]].map(([k, v]) => html`<div class="fact"><span>${k}</span><b>${v}</b></div>`)}</div>`
  : html`<p class="muted ptrule">The base stats, from the GM. Only a GM can change these; players raise them through Changes.</p>
    <div class="grid2">${numIn("damage", "Damage")}${numIn("crit", "Crit %")}${numIn("accuracy", "Accuracy ±")}${numIn("dur", "Durability", 5)}
      <div class="mini"><label for=${"wc-d" + c.id}>Durability die</label><select id=${"wc-d" + c.id} value=${rc.durDie} disabled=${busy} onChange=${e => setRc(r => { r.durDie = e.target.value; r.plus = Object.assign({}, r.plus, { die: 0 }); })}>${R.DUR_DICE.map(d => html`<option>${d}</option>`)}</select></div></div>`;
  else {
    const fits = R.WEAPON_PROPS.filter(([, , k]) => k === "both" || k === cp.kind);
    const sel = rc.props || [];
    body = html`<p class="muted ptrule">Optional. Each change makes the roll harder (the book's Weapons Modification Table).</p>
      <div class="ptopts">${R.WEAPON_MODS.map(([k, label, dc]) => { const v = num(plus[k]), max = k === "die" ? R.DUR_DICE.length - 1 - Math.max(0, R.DUR_DICE.indexOf(rc.durDie)) : k === "dur" ? 100 : k === "damage" ? 10 : 30;
        return html`<div class=${"ptopt row-opt" + (v ? " on" : "")}><span class="ptcheck"><b>${label} · −${dc}% each</b><span>${v ? (k === "die" ? `${rc.durDie} → ${cp.final.durDie}` : `+${v}`) : "None"}</span></span>
          <div class="ptrate"><${Step} label=${label} value=${v} max=${max} onSet=${n => setPlus(k, n)} /></div></div>`; })}</div>
      <h3 class="lbl" style="margin-top:14px">Properties · −10% each · up to ${st.props}${st.props < 2 ? " (2 from Weapon Maintenance 7)" : ""}</h3>
      <div class="ptels wpprops">${fits.map(([k, rated]) => { const on = sel.includes(k), full = !on && sel.length >= st.props;
        return html`<button type="button" class="ptel" aria-pressed=${on} disabled=${busy || full} onClick=${() => setRc(r => { r.props = on ? sel.filter(x => x !== k) : [...sel, k]; })}>${k}${rated ? " (R)" : ""}</button>`; })}</div>
      <h3 class="lbl" style="margin-top:14px">Exotic material</h3>
      ${st.exotic ? html`<div class="grid2">
          <div class="mini"><label for=${"wc-en" + c.id}>Material</label><input id=${"wc-en" + c.id} value=${rc.exotic.name} placeholder="Wyvern bone" disabled=${busy} onInput=${e => setRc(r => { r.exotic = Object.assign({}, r.exotic, { name: e.target.value }); })} /></div>
          <div class="mini"><label for=${"wc-ed" + c.id}>Difficulty ± (GM)</label><input id=${"wc-ed" + c.id} type="number" value=${rc.exotic.dc} disabled=${busy} onInput=${e => setRc(r => { r.exotic = Object.assign({}, r.exotic, { dc: +e.target.value || 0 }); })} /></div>
          <div class="mini" style="grid-column:1/-1"><label for=${"wc-eo" + c.id}>What it adds</label><input id=${"wc-eo" + c.id} value=${rc.exotic.note} placeholder="Fire damage +2" disabled=${busy} onInput=${e => setRc(r => { r.exotic = Object.assign({}, r.exotic, { note: e.target.value }); })} /></div></div>`
        : html`<p class="ptlocked">Exotic materials need Weapon Maintenance 5.</p>`}`;
  }
  return html`<div class="ptpick">
    <h3 class="ptpickh"><span>${focus === "type" ? "Weapon" : focus === "av" ? "Base stats" : "Changes"}</span><small>${focus === "extra" ? `${cp.dc}%` : rc.skill}</small></h3>
    ${body}
    <div class="ptplan"><${PlanHead} title="The craft" busy=${busy} onReset=${() => setRc(r => refill(r, R.blankCharacter().craft.weapon.recipe))} /><ol>
      <li><span>Materials: ${cp.cost} g of weapon materials</span><span class="muted">5 × repair (${R.weaponRepairCost(rc)} g)</span></li>
      <li><span>Roll under ${cp.dc}%</span><span class="muted">${cp.chance}% to land · each failure adds a random flaw and rolls again; failure ${st.maxFails + 1} loses it all</span></li>
      <li><span>Eight hours</span><span class="muted">${cp.props.length < 2 ? "Fewer than 2 properties: it gains 2 at random. " : ""}It joins your Weapons on the Gear tab.</span></li></ol></div>
  </div>`;
}
