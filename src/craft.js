/* ================= crafting tab ================= */
// One tab for the rulebook's Crafting chapter (16). Each craft gets its own bench; Powdertinkering is built,
// the others are marked as under construction until their turn comes.
const CRAFTS = [
  ["powder", "Powdertinkering", "Powdertinker", "Custom ammunition, explosives and weapon oils."],
  ["brew", "Brewing", "Brewing", "Potions, catalysts, increments and potent brews."],
  ["rune", "Runecrafting", "Runecrafting", "Runestones bound to a vessel through ritual."],
  ["weapon", "Weapon upkeep", "Weapon Maintenance", "Repairing and crafting weapons."],
  ["armor", "Armor upkeep", "Armor Maintenance", "Repairing and crafting suits of armor."],
];
const CRAFT_ICONS = {
  powder: html`<path d="M10 2.5c1.6 1.4 2.4 3.4 2.4 5.6V15H7.6V8.1c0-2.2.8-4.2 2.4-5.6z M7.6 15h4.8v2.5H7.6z M7.6 10.5h4.8" />`,
  brew: html`<path d="M8 2.5h4 M8.6 2.5v4.2L4.5 15a1.6 1.6 0 0 0 1.4 2.5h8.2a1.6 1.6 0 0 0 1.4-2.5l-4.1-8.3V2.5 M6.4 11.5h7.2" />`,
  rune: html`<path d="M10 2.5l6 4v7l-6 4-6-4v-7z M10 6v8 M7.5 8.5l5 3" />`,
  weapon: html`<path d="M14.5 2.5l3 3-8.5 8.5-3-3z M6 11l3 3 M4.5 12.5l3 3-2 2-3-3z" />`,
  armor: html`<path d="M10 2.5l6 2.2v4.8c0 4-2.6 6.6-6 8-3.4-1.4-6-4-6-8V4.7z M10 2.5v15" />`,
};

// The crafts this character has put points into. The Crafting tab, and each bench in it, only appear once they have.
const craftsOpen = c => CRAFTS.filter(([, , skill]) => num((c.skills || {})[skill]) > 0);
// Benches that unlocked on the open character (set by the Character view) and haven't been shown yet: their buttons
// are forged in the next time the Crafting tab is open. The tab itself forges in when it first appears.
const CraftFresh = { char: "", keys: [], take(id, k) { if (this.char !== id || !this.keys.includes(k)) return false; this.keys = this.keys.filter(x => x !== k); return true; } };

// The Crafting tab arriving, or a new bench in it: the button rises out of the rule glowing like hot metal,
// with a burst of sparks. Nothing moves for reduced motion; the toast says what unlocked either way.
// If the button is off screen (a skill is usually raised further down the sheet), it waits until it scrolls into view.
function forgeIn(el) {
  if (!el || reduceMotion()) return;
  const r0 = el.getBoundingClientRect();
  if (r0.bottom < 0 || r0.top > innerHeight) {
    el.classList.add("forge-wait");   // hidden until it rises
    const io = new IntersectionObserver(es => { if (es.some(e => e.intersectionRatio > .6)) { io.disconnect(); el.classList.remove("forge-wait"); forgeIn(el); } }, { threshold: [.6] });
    io.observe(el);
    return;
  }
  el.classList.remove("forging"); void el.offsetWidth; el.classList.add("forging");
  setTimeout(() => el.classList.remove("forging"), 2300);
  // Sparks live in a page-sized layer that clips them, so they never make the page scroll sideways.
  const r = el.getBoundingClientRect(), burst = document.createElement("div"), at = document.createElement("div");
  burst.className = "forgeburst"; burst.setAttribute("aria-hidden", "true"); burst.style.height = document.documentElement.scrollHeight + "px";
  at.className = "forgeat"; at.style.left = r.left + scrollX + r.width / 2 + "px"; at.style.top = r.top + scrollY + r.height * .6 + "px"; burst.appendChild(at);
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI * (.05 + Math.random() * .9), v = 40 + Math.random() * 110, sp = document.createElement("i");
    sp.style.setProperty("--dx", (Math.cos(a) * v * (Math.random() < .5 ? 1 : -1) * 1.4).toFixed(0) + "px");
    sp.style.setProperty("--dy", (Math.sin(a) * v).toFixed(0) + "px");
    sp.style.setProperty("--fall", (30 + Math.random() * 60).toFixed(0) + "px");
    sp.style.animationDelay = (380 + Math.random() * 160).toFixed(0) + "ms";
    sp.style.animationDuration = (650 + Math.random() * 600).toFixed(0) + "ms";
    at.appendChild(sp);
  }
  document.body.appendChild(burst);
  setTimeout(() => burst.remove(), 2200);
}

function CraftTab({ c, update }) {
  const open = craftsOpen(c);
  const [chosen, setSub] = useState(() => lsGet("cw-craft-sub", "powder"));
  const sub = open.some(x => x[0] === chosen) ? chosen : (open[0] || CRAFTS[0])[0];   // a hidden bench falls back to the first open one
  useEffect(() => lsSet("cw-craft-sub", sub), [sub]);
  // A bench that just unlocked while this tab is open: forge its button in.
  const nav = useRef(null);
  useEffect(() => { if (!nav.current) return; open.forEach(([k]) => { if (CraftFresh.take(c.id, k)) forgeIn(nav.current.querySelector(".cn-" + k)); }); }, [c.id, open.map(x => x[0]).join()]);
  const shop = useShop();   // the "new job" notice can send the smith to the Weapon or Armor upkeep bench
  useEffect(() => { const f = shop.focus; if (f && f.char === c.id) setSub(f.kind); }, [shop.focusSeq, c.id]);
  const cur = CRAFTS.find(x => x[0] === sub) || CRAFTS[0];
  return html`<div class="tabpane">
    <nav class="craftnav" aria-label="Crafts" ref=${nav}>${open.map(([k, n, skill]) => html`<button type="button" aria-pressed=${sub === k} class=${"cn-" + k} onClick=${() => setSub(k)}>
      <svg class="tabicon" viewBox="0 0 20 20" aria-hidden="true">${CRAFT_ICONS[k]}</svg><span>${n}</span>
      <small>${num(c.skills[skill]) ? `${skill} ${num(c.skills[skill])}` : ""}</small></button>`)}</nav>
    ${sub === "powder" ? html`<${Powdertinkering} c=${c} update=${update} />` : sub === "brew" ? html`<${Brewing} c=${c} update=${update} />` : sub === "rune" ? html`<${Runecrafting} c=${c} update=${update} />` : sub === "armor" ? html`<${ArmorUpkeep} c=${c} update=${update} />` : sub === "weapon" ? html`<${WeaponUpkeep} c=${c} update=${update} />` : html`<${UnderConstruction} c=${c} craft=${cur} />`}
  </div>`;
}

// The heading over a bench's plan, with a Reset that clears the set-up (supplies and the ledger stay).
function PlanHead({ title, busy, onReset }) {
  return html`<div class="ptplanh"><h3 class="lbl">${title}</h3>
    <button type="button" class="btn small ptreset" disabled=${busy} title="Clear the set-up. Supplies and the ledger stay." onClick=${onReset}>Reset</button></div>`;
}
// Put a recipe back to the blank character's default, in place.
const refill = (r, d) => { Object.keys(r).forEach(k => delete r[k]); Object.assign(r, JSON.parse(JSON.stringify(d))); };

function UnderConstruction({ c, craft }) {
  const [k, n, skill, blurb] = craft;
  return html`<section class="frame"><h2 class="h"><span>${n}</span><i class="orn" aria-hidden="true"></i></h2>
    <div class="construct">
      <svg class="construct-gears" viewBox="0 0 120 80" aria-hidden="true">
        <g class="g1"><path d=${gearPath(40, 42, 24, 17, 10)} /><circle cx="40" cy="42" r="6" /></g>
        <g class="g2"><path d=${gearPath(82, 30, 16, 11, 8)} /><circle cx="82" cy="30" r="4" /></g>
      </svg>
      <div><p class="construct-t">Under construction</p>
        <p class="muted">${blurb} This bench is next in line. Until then, ${skill}'s perks and tables are on the Sheet tab: click the skill's name.</p>
        ${num(c.skills[skill]) > 0 && html`<p class="muted">${c.name || "This character"} has ${skill} ${num(c.skills[skill])}.</p>`}</div>
    </div></section>`;
}
// A toothed wheel as one path: n teeth between radius r (tips) and r2 (roots), centred on cx, cy.
function gearPath(cx, cy, r, r2, n) {
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, s = (Math.PI * 2) / n;
    const pts = [[r2, a], [r, a + s * 0.15], [r, a + s * 0.45], [r2, a + s * 0.6]];
    pts.forEach(([rr, aa], j) => (d += `${i === 0 && j === 0 ? "M" : "L"}${(cx + rr * Math.cos(aa)).toFixed(1)} ${(cy + rr * Math.sin(aa)).toFixed(1)} `));
  }
  return d + "Z";
}

/* ================= powdertinkering ================= */
const PT_LABEL = { coat: "Coat", tip: "Tips", area: "Area", core: "Core", status: "Status" };
const PT_ONE = { coat: "coat", tip: "tip", area: "area", core: "core", status: "status" };
const PT_RULE = {
  coat: "Every munition starts with its Coat, made from container materials. A batch has one Coat.",
  tip: "A batch can carry several Tips, made from container materials. Raising a Rating above your base makes it harder: −5% difficulty per step.",
  area: "Turns the munition into a blast. A batch has one Area, made from container materials. Rating = your Powdertinker.",
  core: "An elemental Core adds Rating extra damage of its element, made from element solution. Each step above your base: −10% difficulty.",
  status: "Status properties need a Core and must match its element. A batch can carry several, made from element solution.",
};
const ELEMENT_HUE = { Fire: "#ff7a2a", Cold: "#86d6ff", Electric: "#c9a6ff", Poison: "#7bd451", Acid: "#d4ec3c", Radiant: "#ffe28a", Necrotic: "#9b6ad6" };
// A custom core's element gets a steady colour of its own, picked from its name.
const OWN_HUES = ["#e0a35c", "#5cc8b8", "#d77fb0", "#a3b85c", "#7f9be0", "#c8705c", "#b59be0", "#5ca8e0"];
const elHue = el => ELEMENT_HUE[el] || OWN_HUES[[...String(el)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % OWN_HUES.length];
const COAT_FILL = { Piercing: "url(#pt-copper)", Bludgeoning: "url(#pt-lead)", Slashing: "url(#pt-steel)" };
const reduceMotion = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };

// What a recipe currently puts on each part, for the callout labels and the drawing.
function ptSummary(c, rc, st) {
  const m = R.MUNITION[rc.type] || R.MUNITIONS[0], L = R.ptLists(c);
  const out = {};
  R.PT_PARTS.forEach(p => {
    const access = R.ptAccess(rc.type, p), open = st.unlock[p];
    let value = "", on = false;
    if (p === "coat") { value = m.shape === "grenade" ? "Casing" : m.shape === "flask" ? "Base oil" : (open && access ? rc.coat : "") || "Piercing"; on = true; }
    // Every munition has a base layer (coat, casing or base oil); only custom coats depend on the access table.
    if (p === "coat") { out[p] = { access: true, open, value, on: true, custom: access }; return; }
    if (p === "tip") { const t = L.tips.filter(([k]) => rc.tips && rc.tips[k] != null && rc.tips[k] !== false).map(([k, rated]) => rated ? `${k} ${st.base.tip + num(rc.tips[k])}` : k); value = t.join(", "); on = t.length > 0; }
    if (p === "area") { const a = rc.area && rc.area.k; if (a) { value = `${a === "Cone" ? `Cone ${rc.area.cone || 60}°` : a} ${st.base.area}`; on = true; } else if (m.shape === "grenade") { value = `Sphere ${st.base.area}`; on = true; } }
    if (p === "core") { const e = rc.core && rc.core.el; if (e) { value = `${e} ${st.base.core + num(rc.core.inc)}`; on = true; } }
    if (p === "status") { const e = rc.core && rc.core.el; const s = (rc.status || []).filter(n => { const S = L.statuses.find(x => x[0] === n); return S && S[1] === e; }); value = s.join(", "); on = s.length > 0; }
    out[p] = { access, open, value, on: on && access && (open || p === "coat" || (p === "area" && m.shape === "grenade" && !rc.area?.k)) };
  });
  return out;
}

function Powdertinkering({ c, update }) {
  const st = R.ptState(c);
  const cr = c.craft, rc = cr.recipe, type = R.MUNITION[rc.type] ? rc.type : "rifle", m = R.MUNITION[type];
  const [focus, setFocus] = useState("coat");
  const [forge, setForge] = useState(null);
  // The forge's state lives in a ref (read synchronously by the timed steps) and is mirrored into state for drawing.
  const fRef = useRef(null);
  const setF = f => { fRef.current = f; setForge(f); };
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { if (fRef.current && fRef.current.charId !== c.id) { timers.current.forEach(clearTimeout); setF(null); } }, [c.id]);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, reduceMotion() ? Math.min(ms, 120) : ms));
  // Changing any part makes it a different recipe, so a loaded recipe's name comes off.
  const setRc = fn => update(x => { fn(x.craft.recipe); delete x.craft.recipe.name; });
  const steps = useMemo(() => R.ptSteps(c, rc), [c]);
  /* ---------- saved recipes: name a craft, then load every part back with one click ---------- */
  const saved = cr.saved || [];
  const saveRecipe = (n, recipe) => {
    const name = String(n || "").trim().slice(0, 60); if (!name) return;
    const r = clean(recipe); delete r.name;
    update(x => {
      const i = x.craft.saved.findIndex(y => y.n.toLowerCase() === name.toLowerCase());
      const it = { k: i >= 0 ? x.craft.saved[i].k : "r" + rid(), n: name, recipe: r };
      if (i >= 0) x.craft.saved[i] = it; else x.craft.saved.push(it);
      x.craft.recipe = Object.assign(clean(r), { name });
    });
    toast(`Saved "${name}". Pick it under Saved recipes to make it again.`);
  };
  const loadRecipe = it => { update(x => { x.craft.recipe = Object.assign({ type: "rifle" }, clean(it.recipe), { name: it.n }); }); setFocus("coat"); };
  const sum = ptSummary(c, rc, st);
  const yieldNow = R.ptYield(c, type, st.maxFails);
  // Materials the whole craft needs if nothing fails.
  const need = {}; steps.forEach(s => (need[s.mat] = (need[s.mat] || 0) + R.PT_GRAMS));
  const short = Object.entries(need).filter(([k, g]) => num(cr.supplies[k]) < g);
  const matName = k => (k === "container" ? "container materials" : `${k.toLowerCase()} solution`);

  /* ---------- the forge: one roll per step, with a pause after every failure ---------- */
  const patch = p => { const f = fRef.current; if (f) setF(Object.assign({}, f, typeof p === "function" ? p(f) : p)); };
  const start = () => {
    const f = { charId: c.id, steps, idx: 0, res: {}, det: 0, ignored: 0, spent: {}, rolls: [], phase: "intro", roll: null, keepUsed: false, ignoreUsed: false, recipe: clean(rc), type, mod: st.mod, maxFails: st.maxFails };
    setF(f);
    later(() => attempt(0), 900);
  };
  const attempt = idx => {
    const f = fRef.current; if (!f) return;
    const s = f.steps[idx];
    // A Status needs the Core: if the Core never went in, its Status steps are skipped without a roll.
    if (s.part === "status" && !f.steps.some(x => x.part === "core" && (f.res[x.key] === "ok" || f.res[x.key] === "kept"))) {
      patch(g => ({ res: Object.assign({}, g.res, { [s.key]: "skip" }) })); next(idx); return;
    }
    const have = num(cr.supplies[s.mat]) - num(f.spent[s.mat]);
    if (have < R.PT_GRAMS) { patch({ idx, phase: "short", roll: null }); return; }
    patch({ idx, phase: "asking", roll: null });
    askRoll({ title: s.label, dice: [{ n: 1, sides: 100 }], note: `Powdertinkering: d100 − ${f.mod}, under ${s.dc} and it holds.` }).then(([r]) => {
    if (!fRef.current) return;
    patch(g => ({ phase: "rolling", spent: Object.assign({}, g.spent, { [s.mat]: num(g.spent[s.mat]) + R.PT_GRAMS }) }));
    later(() => {
      const total = r - f.mod, ok = total < s.dc;
      patch(g => {
        const det = g.det + (ok ? 0 : 1);
        const roll = { key: s.key, label: s.label, r, total, dc: s.dc, ok };
        const res = Object.assign({}, g.res, { [s.key]: ok ? "ok" : "fail" });
        return { roll, rolls: [...g.rolls, roll], det, res, phase: ok ? "hit" : det - g.ignored > g.maxFails ? "scrapping" : "choice" };
      });
      const g = fRef.current;
      if (ok) later(() => next(idx), 750);
      else if (g.phase === "scrapping") later(() => finish(true), 1100);
    }, Dice.mode === "own" ? 600 : 1050);
    });
  };
  const next = idx => { const f = fRef.current; if (!f) return; if (idx + 1 >= f.steps.length) finish(false); else { patch({ idx: idx + 1, phase: "next" }); later(() => attempt(idx + 1), 350); } };
  const skip = () => { const f = fRef.current; patch(g => ({ res: Object.assign({}, g.res, { [f.steps[f.idx].key]: g.res[f.steps[f.idx].key] === "fail" ? "fail" : "skip" }) })); next(f.idx); };
  const keepIt = () => { const f = fRef.current; patch(g => ({ keepUsed: true, res: Object.assign({}, g.res, { [f.steps[f.idx].key]: "kept" }) })); next(f.idx); };
  const ignoreIt = () => patch(g => ({ ignoreUsed: true, ignored: g.ignored + 1 }));
  // Ends the craft: pays the materials, adds the batch to the inventory and writes the ledger and log.
  const finish = scrap => {
    const f = fRef.current; if (!f) return;
    const done = f.steps.filter(s => f.res[s.key] === "ok" || f.res[s.key] === "kept");
    const made = !scrap && done.some(s => s.part === "coat");
    const det = Math.max(0, f.det - f.ignored);
    const y = made ? R.ptYield(c, f.type, Math.max(0, f.maxFails - det)) : { n: 0 };
    // Made from a saved recipe with every part in place: the recipe's name. Otherwise the parts that held.
    const whole = f.recipe.name && done.length === f.steps.length;
    const name = (whole ? f.recipe.name : R.ptName(f.type, done, f.recipe)) + (det ? ` · ${det} Detriment${det > 1 ? "s" : ""}` : "");
    const spentTxt = Object.entries(f.spent).map(([k, g]) => `${g} g ${matName(k)}`).join(", ");
    update(x => {
      Object.entries(f.spent).forEach(([k, g]) => (x.craft.supplies[k] = Math.max(0, num(x.craft.supplies[k]) - g)));
      x.uses = x.uses || {};
      if (f.keepUsed) x.uses["p:Powdertinker:5"] = 1;
      if (f.ignoreUsed) x.uses["p:Powdertinker:10"] = 1;
      if (made) {
        const it = x.items.find(i => i.name === name);
        if (it) it.qty = num(it.qty) + y.n; else x.items.push({ id: rid(), name, qty: y.n, size: (R.MUNITION[f.type] || {}).size || "small" });
      }
      x.craft.ledger = [{ id: rid(), t: Date.now(), name, qty: y.n, det, scrap, rolls: f.rolls.map(r => `${r.label} ${r.r}−${f.mod}=${r.total} vs ${r.dc} ${r.ok ? "✓" : "✗"}`), note: "" }, ...x.craft.ledger].slice(0, 20);
      addLog(x, scrap ? `Powdertinkering: the batch was scrapped (${spentTxt} lost)` : made ? `Powdertinkering: forged ${y.n} × ${name} (${spentTxt})` : `Powdertinkering: stopped before the coat held (${spentTxt} lost)`);
    });
    patch({ phase: scrap ? "scrap" : made ? "done" : "nothing", result: { name, n: y.n, det, made, plain: f.recipe.name || R.ptName(f.type, f.steps, f.recipe) } });
  };
  const close = () => { timers.current.forEach(clearTimeout); timers.current = []; setF(null); };
  const busy = !!forge;
  const fStep = forge && forge.steps[forge.idx];
  // Part states for the drawing while forging: ghost (to come), active, ok, fail, kept.
  const partState = p => {
    if (!forge) return sum[p].on ? "on" : "off";
    const mine = forge.steps.filter(s => s.part === p);
    if (!mine.length) return p === "area" && m.shape === "grenade" ? (forge.phase === "done" ? "ok" : "ghost") : "off";
    if (fStep && fStep.part === p && ["rolling", "choice", "short", "hit"].includes(forge.phase)) return forge.phase === "choice" ? "fail" : forge.phase === "hit" ? "ok" : "active";
    const r = mine.map(s => forge.res[s.key]);
    if (r.some(x => x === "ok" || x === "kept")) return r.some(x => x === "fail" || x === "kept") ? "kept" : "ok";
    if (r.some(x => x === "fail")) return "miss";
    return "ghost";
  };
  const canForge = st.proficient && !busy && short.length === 0;
  const why = !st.proficient ? `Powdertinker 3 makes you proficient. ${c.name || "This character"} has ${st.lvl}.` : short.length ? `Needs ${short.map(([k, g]) => `${g} g ${matName(k)} (have ${num(cr.supplies[k])})`).join(" and ")}. Add supplies below.` : "";

  return html`
    <section class="frame ptbench">
      <${Head} title="Powdertinkering" topic="powdertinkering" />
      <p class="sub">Pick a munition, click a part of it to choose what goes there, then forge. Each part is one roll: d100 minus your modifier, under the difficulty.</p>
      <div class="facts ptfacts">${[
        ["Powdertinker", `${st.lvl}${st.lvl < 3 ? " · not proficient" : ""}`],
        ["Modifier", `${st.mod}%${st.bonus ? ` (incl. ${st.bonus >= 0 ? "+" : ""}${st.bonus})` : ""}`],
        ["Failures allowed", st.proficient ? `${st.maxFails}, the next one scraps it` : "—"],
        ["Yield", `${yieldNow.batch} a batch${yieldNow.n > yieldNow.batch ? `, up to ${yieldNow.n}` : ""}`],
      ].map(([k, v]) => html`<div class="fact"><span>${k}</span><b>${v}</b></div>`)}</div>
      ${(st.keepFailed || st.ignoreOne) && html`<div class="chips" style="margin-top:10px">
        ${st.keepFailed && html`<span class=${"flag " + (st.used.keep ? "" : "brass")} title="Novice Tinker (Powdertinker 5): keep a property you failed, as well as its Detriment. Recharges on a long rest.">Novice Tinker · ${st.used.keep ? "used" : "ready"}</span>`}
        ${st.ignoreOne && html`<span class=${"flag " + (st.used.ignore ? "" : "brass")} title="Master o' Munitions (Powdertinker 10): ignore 1 Detriment. Recharges on a long rest.">Ignore a Detriment · ${st.used.ignore ? "used" : "ready"}</span>`}</div>`}

      ${saved.length > 0 && html`<div class="ptsaved" role="group" aria-label="Saved recipes"><span class="lbl">Saved recipes</span>
        ${saved.map(it => html`<span class=${"ptsavedchip" + (rc.name === it.n ? " on" : "")}>
          <button type="button" class="btn small" aria-pressed=${rc.name === it.n} disabled=${busy} title=${`Load every part of ${it.n}`} onClick=${() => loadRecipe(it)}>${it.n}</button>
          <button type="button" class="iconbtn" aria-label=${`Delete the recipe ${it.n}`} disabled=${busy} onClick=${() => update(x => { x.craft.saved = x.craft.saved.filter(y => y.k !== it.k); if (x.craft.recipe.name === it.n) delete x.craft.recipe.name; })}>×</button></span>`)}</div>`}
      <div class="pttypes" role="radiogroup" aria-label="Munition">${R.MUNITIONS.map(x => html`<button type="button" role="radio" aria-checked=${x.k === type} disabled=${busy}
        onClick=${() => setRc(r => { r.type = x.k; })}><svg viewBox="0 0 24 24" aria-hidden="true">${TYPE_ICON[x.shape]}</svg><span>${x.n}</span></button>`)}</div>

      <div class="ptgrid">
        <div class="ptstage">
          <${Munition} m=${m} rc=${forge ? forge.recipe : rc} sum=${sum} st=${st} focus=${busy ? fStep && fStep.part : focus}
            partState=${partState} forging=${busy} phase=${forge && forge.phase} onPick=${p => { if (busy) return; setFocus(p);
              // On narrow screens the picker sits below the drawing, so bring it into view.
              if (window.innerWidth <= 900) setTimeout(() => { const el = document.querySelector(".ptpick"); if (el) el.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" }); }, 30); }} />
          <div class="ptforge">
            ${!busy && html`<button class="btn primary big forgebtn" disabled=${!canForge} onClick=${start}>
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 12h11l3-3H6z M6 12v3h8v-3 M8 15v2.5 M12 15v2.5 M9 5.5l1-3 1 3" /></svg>Forge ${steps.length === 1 ? "a plain batch" : `· ${steps.length} rolls`}</button>
              ${why && html`<p class="muted ptwhy">${why}</p>`}`}
            ${busy && html`<${ForgeReadout} f=${forge} st=${st} matName=${matName} supplies=${cr.supplies} saved=${saved}
              onSave=${n => saveRecipe(n, forge.recipe)} onRetry=${() => attempt(forge.idx)} onSkip=${skip} onKeep=${keepIt} onIgnore=${ignoreIt} onFinish=${() => finish(false)} onClose=${close} />`}
          </div>
        </div>
        <div class="ptside">
          <${PartPicker} part=${focus} c=${c} rc=${rc} st=${st} m=${m} sum=${sum} setRc=${setRc} update=${update} disabled=${busy} />
          <div class="ptplan">
            <${PlanHead} title="The craft" busy=${busy} onReset=${() => update(x => { x.craft.recipe = { type }; })} />
            <ol>${steps.map(s => html`<li><span>${s.label}</span><span class="muted">${s.dc}% · ${s.chance}% to land · 200 g ${s.mat === "container" ? "container" : s.mat.toLowerCase()}</span></li>`)}</ol>
            <div class="row ptbatch"><label for=${"ptb-" + c.id}>Batch size for ${m.n.toLowerCase()}</label>
              <input id=${"ptb-" + c.id} class="inp durin" type="number" min="1" value=${num(cr.batch[type]) || m.batch} disabled=${busy}
                onInput=${e => update(x => { x.craft.batch[type] = Math.max(1, +e.target.value || 1); })} />
              <span class="muted">One clip for this weapon, decided once. The materials stay 200 g a step whatever the size.</span></div>
          </div>
        </div>
      </div>
    </section>

    <section class="frame"><h2 class="h"><span>Supplies</span><i class="orn" aria-hidden="true"></i></h2>
      <p class="sub">Every attempt uses 200 g, and a failed attempt loses it. Coats, Tips and Areas use container materials (brass and the like); Cores and Status use a solution of their element. Foraging can find more.</p>
      <div class="ptsupplies">
        <div class="mini ptsup big"><label for=${"sup-c-" + c.id}>Container materials (g)</label>
          <input id=${"sup-c-" + c.id} type="number" min="0" step="100" value=${cr.supplies.container ?? 0} onInput=${e => update(x => { x.craft.supplies.container = Math.max(0, +e.target.value || 0); })} /></div>
        ${R.ptLists(c).elements.map(el => html`<div class="mini ptsup"><label for=${"sup-" + el + c.id}><i class="dot" style=${`background:${elHue(el)}`}></i>${el} (g)</label>
          <input id=${"sup-" + el + c.id} type="number" min="0" step="100" value=${cr.supplies[el] ?? 0} onInput=${e => update(x => { x.craft.supplies[el] = Math.max(0, +e.target.value || 0); })} /></div>`)}
        <div class="mini ptsup"><label for=${"sup-b-" + c.id}>Other bonus (%)</label>
          <input id=${"sup-b-" + c.id} type="number" step="1" value=${cr.bonus ?? 0} onInput=${e => update(x => { x.craft.bonus = +e.target.value || 0; })} /></div>
      </div>
      <p class="muted" style="margin:8px 0 0">You also need a Powdertinker kit: scale, trimmer, studs, screwdrivers and a funnel.</p>
    </section>

    <section class="frame"><h2 class="h"><span>Ledger</span><i class="orn" aria-hidden="true"></i></h2>
      <p class="sub">Finished batches go straight into the inventory on the Gear tab. Each Detriment is the GM's to decide; note it here.</p>
      ${cr.ledger.length === 0 ? html`<p class="muted">Nothing forged yet.</p>` : html`<div class="ptledger">${cr.ledger.map((e, i) => html`<div class=${"pled" + (e.scrap ? " scrap" : "")}>
        <div class="row" style="justify-content:space-between;flex-wrap:nowrap"><b>${e.scrap ? "Scrapped" : e.qty ? `${e.qty} ×` : "Nothing made"} ${e.name}</b>
          <button class="iconbtn" aria-label="Remove this entry" onClick=${() => update(x => { x.craft.ledger.splice(i, 1); })}>×</button></div>
        <span class="muted">${new Date(e.t).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}${e.rolls && e.rolls.length ? " · " + e.rolls.join(" · ") : ""}</span>
        ${e.det > 0 && !e.scrap && html`<input class="inp" aria-label="Detriments" placeholder=${`What the ${e.det > 1 ? `${e.det} Detriments do` : "Detriment does"} (the GM decides)`} value=${e.note}
          onInput=${ev => update(x => { x.craft.ledger[i].note = ev.target.value; })} />`}</div>`)}</div>`}
    </section>`;
}

/* ---------- the readout under the munition while forging ---------- */
function ForgeReadout({ f, st, matName, supplies, saved, onSave, onRetry, onSkip, onKeep, onIgnore, onFinish, onClose }) {
  const s = f.steps[f.idx];
  const [spin, setSpin] = useState(0);
  const [saveName, setSaveName] = useState(null), [didSave, setDidSave] = useState(false);
  useEffect(() => {
    if (f.phase !== "rolling" || reduceMotion()) return;
    const t = setInterval(() => setSpin(1 + Math.floor(Math.random() * 100)), 55);
    return () => clearInterval(t);
  }, [f.phase, f.idx, f.rolls.length]);
  const det = Math.max(0, f.det - f.ignored);
  const pips = html`<span class="ptdet" aria-label=${`${det} Detriment${det === 1 ? "" : "s"}, ${f.maxFails} allowed`}>${Array.from({ length: f.maxFails + 1 }, (_, i) =>
    html`<i class=${(i < det ? "on" : "") + (i === f.maxFails ? " last" : "")}></i>`)}</span>`;
  const done = ["done", "scrap", "nothing"].includes(f.phase);
  if (done) {
    const r = f.result || {};
    return html`<div class=${"ptread end " + f.phase} role="status">
      <p class="ptbig">${f.phase === "scrap" ? "Scrapped" : f.phase === "nothing" ? "Nothing made" : `${r.n} forged`}</p>
      <p>${f.phase === "scrap" ? "One Detriment too many: the batch and every material in it are lost." : f.phase === "nothing" ? "The coat never held, so there's no munition. The materials used are gone." : r.name}</p>
      ${f.phase === "done" && html`<p class="muted">Added to the inventory${r.det ? `. ${r.det} Detriment${r.det > 1 ? "s" : ""} for the GM to decide (note them in the Ledger)` : ""}.</p>`}
      ${f.phase !== "nothing" && (didSave ? html`<p class="ptsavedok">Saved as a recipe. It's under Saved recipes on the bench.</p>`
        : html`<form class="ptsave" onSubmit=${e => { e.preventDefault(); const n = (saveName == null ? r.plain : saveName).trim(); if (n) { onSave(n); setDidSave(true); } }}>
          <label class="lbl" for="pt-save-n">Save this recipe${f.recipe.name ? "" : " to make it again"}</label>
          <div class="row"><input id="pt-save-n" class="inp" maxlength="60" placeholder="Name the ammo" value=${saveName == null ? r.plain : saveName} onInput=${e => setSaveName(e.target.value)} />
            <button class="btn" type="submit" disabled=${!(saveName == null ? r.plain : saveName).trim()}>${(saved || []).some(x => x.n.toLowerCase() === (saveName == null ? r.plain : saveName).trim().toLowerCase()) ? "Update recipe" : "Save recipe"}</button></div></form>`)}
      <button class="btn primary" onClick=${onClose}>${f.phase === "done" ? "Back to the bench" : "Clear the bench"}</button></div>`;
  }
  const r = f.roll;
  const shown = f.phase === "rolling" ? (spin || "··") : r ? r.r : "··";
  return html`<div class="ptread" role="status" aria-live="polite">
    <div class="ptstep"><span class="lbl">Step ${f.idx + 1} of ${f.steps.length}</span><b>${f.phase === "intro" ? "Firing up the bench…" : s.label}</b>${pips}</div>
    ${f.phase !== "intro" && f.phase !== "short" && html`<div class=${"ptdice" + (f.phase === "rolling" ? " rolling" : r ? (r.ok ? " ok" : " fail") : "")}>
      <span class="d100">${shown}</span>
      <span class="ptmath">${f.phase === "rolling" || f.phase === "asking" ? html`d100 − ${f.mod} · under ${s.dc}` : r && html`${r.r} − ${f.mod} = <b>${r.total}</b> ${r.ok ? "<" : "≥"} ${s.dc} · ${r.ok ? "it holds" : "a Detriment"}`}</span></div>`}
    ${f.phase === "short" && html`<p class="flag bad">Out of ${matName(s.mat)}: ${Math.max(0, num(supplies[s.mat]) - num(f.spent[s.mat]))} g left, 200 g needed.</p>`}
    ${(f.phase === "choice" || f.phase === "short") && html`<div class="row ptchoices">
      ${f.phase === "choice" && html`<button class="btn primary" onClick=${onRetry}>Try again · 200 g</button>`}
      ${s.part !== "coat" && html`<button class="btn" onClick=${onSkip}>Go without it</button>`}
      ${f.phase === "choice" && st.keepFailed && !st.used.keep && !f.keepUsed && html`<button class="btn" title="Novice Tinker: keep the property as well as the Detriment. Once per long rest." onClick=${onKeep}>Keep it anyway</button>`}
      ${f.phase === "choice" && st.ignoreOne && !st.used.ignore && !f.ignoreUsed && html`<button class="btn" title="Master o' Munitions: ignore 1 Detriment. Once per long rest." onClick=${onIgnore}>Ignore the Detriment</button>`}
      <button class="btn" onClick=${onFinish}>${s.part === "coat" ? "Give up" : "Finish here"}</button></div>`}
    ${f.phase === "scrapping" && html`<p class="flag bad">Too many Detriments…</p>`}
  </div>`;
}

/* ---------- the picker beside the munition ---------- */
function PartPicker({ part, c, rc, st, m, sum, setRc, update, disabled }) {
  const s = sum[part], L = R.ptLists(c);
  const [adding, setAdding] = useState(false);
  useEffect(() => setAdding(false), [part]);
  const own = (k) => L.own.find(x => x.part === part && x.n === k);
  const dcOf = k => (own(k) ? num(own(k).dc) || R.PT_BASE_DC[part] : R.PT_BASE_DC[part]);
  // A custom part: tagged, with its own difficulty, and a × to remove it (and take it off the recipe).
  const tag = k => own(k) ? html` <span class="flag brass">custom</span>` : "";
  const del = k => own(k) && html`<button class="iconbtn ptdel" aria-label=${`Remove ${k}`} title="Remove this custom part" disabled=${disabled} onClick=${() => update(x => {
    const it = x.craft.parts.find(y => y.part === part && y.n === k);
    x.craft.parts = x.craft.parts.filter(y => y !== it && !(part === "core" && y.part === "status" && y.el === k));
    const r = x.craft.recipe;
    if (part === "coat" && r.coat === k) r.coat = "Piercing";
    if (part === "tip" && r.tips) delete r.tips[k];
    if (part === "area" && r.area && r.area.k === k) r.area = null;
    if (part === "core" && r.core && r.core.el === k) { r.core = null; r.status = []; }
    if (part === "status") r.status = (r.status || []).filter(n => n !== k);
  })}>×</button>`;
  // Always the same wrapper, so the page redraws the button and the form in place.
  const addBtn = html`<div class="ptaddbox">${!adding ? html`<button class="btn small ptaddown" disabled=${disabled} onClick=${() => setAdding(true)}>+ A custom ${PT_ONE[part]}</button>`
    : html`<${PartForm} part=${part} L=${L} el=${rc.core && rc.core.el} onCancel=${() => setAdding(false)}
        onSave=${it => { update(x => { x.craft.parts.push(it); }); setAdding(false); toast(`${it.n} added to ${PT_LABEL[part]}.`); }} />`}</div>`;
  const lockedMsg = !s.access ? `${m.n} can't carry a ${PT_LABEL[part].replace(/s$/, "").toLowerCase()} (Component Access table).`
    : !s.open ? `Unlocks at Powdertinker ${st.unlockAt[part]}${part === "area" || part === "status" ? " (Expert Tinker)" : part === "coat" ? " (Tinkerling)" : " (Tinkerling)"}. ${c.name || "This character"} has ${st.lvl}.` : "";
  const chance = dc => R.ptChance(dc, st.mod);
  const Stepper = ({ value, max, onSet, label }) => html`<span class="ptstepper"><button class="iconbtn" aria-label=${`Lower ${label}`} disabled=${disabled || value <= 0} onClick=${() => onSet(value - 1)}>−</button>
    <button class="iconbtn" aria-label=${`Raise ${label}`} disabled=${disabled || value >= max} onClick=${() => onSet(value + 1)}>+</button></span>`;
  let body = null;
  if (lockedMsg && !(part === "coat")) body = html`<p class="ptlocked"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 7V5a4 4 0 0 1 8 0v2 M3 7h10v7H3z" /></svg>${lockedMsg}</p>`;
  else if (part === "coat") {
    const free = s.custom && s.open;
    body = html`${m.shape === "grenade" || m.shape === "flask" ? html`<p class="muted">${m.n} start with a plain ${m.shape === "grenade" ? "casing" : "base oil"} instead of a custom coat: one roll at 60%.</p>` : html`<div class="ptopts">${L.coats.map(([k, t]) => html`<div class=${"ptopt row-opt" + ((rc.coat || "Piercing") === k ? " on" : "")}><button type="button" class="ptcheck" aria-pressed=${(rc.coat || "Piercing") === k}
        disabled=${disabled || (!free && k !== "Piercing")} onClick=${() => setRc(r => { r.coat = k; })}><b>${k}${tag(k)}</b><span>${t}${own(k) ? ` · ${dcOf(k)}%` : ""}</span></button>${del(k)}</div>`)}</div>
      ${!free ? html`<p class="muted">Custom coats unlock at Powdertinker 3 (Tinkerling). Until then munitions are piercing.</p>` : addBtn}`}
      <p class="ptdc">${(() => { const dc = m.shape === "grenade" || m.shape === "flask" ? 60 : dcOf(rc.coat || "Piercing"); return `Difficulty ${dc}% · ${chance(dc)}% to land`; })()}</p>`;
  } else if (part === "tip") {
    body = html`<div class="ptopts">${L.tips.map(([k, rated, t]) => { const on = rc.tips && rc.tips[k] != null && rc.tips[k] !== false; const inc = num(rc.tips && rc.tips[k]); const dc = R.ptDifficulty("tip", rated ? inc : 0, dcOf(k));
      return html`<div class=${"ptopt row-opt" + (on ? " on" : "")}>
        <button type="button" class="ptcheck" aria-pressed=${on} disabled=${disabled} onClick=${() => setRc(r => { r.tips = Object.assign({}, r.tips); if (on) delete r.tips[k]; else r.tips[k] = rated ? 0 : true; })}>
          <b>${k}${rated ? ` (${st.base.tip + (on ? inc : 0)})` : ""}${tag(k)}</b><span>${t}</span></button>${del(k)}
        ${on && html`<div class="ptrate">${rated && html`<${Stepper} label=${k + " rating"} value=${inc} max=${7} onSet=${v => setRc(r => { r.tips = Object.assign({}, r.tips, { [k]: v }); })} />`}
          <span class="ptdc">${dc}% · ${chance(dc)}%</span></div>`}</div>`; })}</div>
      ${addBtn}<p class="muted">Base Rating = your Powdertinker (${st.base.tip}).</p>`;
  } else if (part === "area") {
    const cur = rc.area && rc.area.k;
    const bomb = m.shape === "grenade";
    body = html`<div class="ptopts">
      ${!bomb && html`<button type="button" class="ptopt" aria-pressed=${!cur} disabled=${disabled} onClick=${() => setRc(r => { r.area = null; })}><b>None</b><span>A single target.</span></button>`}
      ${L.areas.map(([k, t]) => html`<div class=${"ptopt row-opt" + (cur === k ? " on" : "")}><button type="button" class="ptcheck" aria-pressed=${cur === k || (bomb && !cur && k === "Sphere")} disabled=${disabled}
        onClick=${() => setRc(r => { r.area = bomb && k === "Sphere" ? null : { k, cone: (r.area && r.area.cone) || 60 }; })}><b>${k} (${st.base.area})${bomb && k === "Sphere" ? " · built in" : ""}${tag(k)}</b><span>${t}${own(k) ? ` · ${dcOf(k)}%` : ""}</span></button>${del(k)}</div>`)}</div>
      ${addBtn}
      ${cur === "Cone" && html`<div class="seg three ptcone" role="group" aria-label="Cone angle">${[30, 60, 90].map(a => html`<button aria-pressed=${(rc.area.cone || 60) === a} disabled=${disabled} onClick=${() => setRc(r => { r.area = Object.assign({}, r.area, { cone: a }); })}>${a}°</button>`)}</div>`}
      <p class="ptdc">Difficulty ${dcOf(cur || "Sphere")}% · ${chance(dcOf(cur || "Sphere"))}% to land${bomb ? " · the sphere every bomb has needs no roll" : ""}</p>`;
  } else if (part === "core") {
    const el = rc.core && rc.core.el, inc = num(rc.core && rc.core.inc), dc = R.ptDifficulty("core", inc, dcOf(el));
    body = html`<div class="ptels">
      <button type="button" class="ptel" aria-pressed=${!el} disabled=${disabled} onClick=${() => setRc(r => { r.core = null; })}><i style="background:var(--sunk)"></i>None</button>
      ${L.elements.map(e => html`<button type="button" class="ptel" aria-pressed=${el === e} disabled=${disabled} onClick=${() => setRc(r => { r.core = { el: e, inc: r.core ? num(r.core.inc) : 0 }; })}><i style=${`background:${elHue(e)}`}></i>${e}</button>`)}</div>
      <div class="ptratebox">${el && html`<div class="row ptrate"><span><b>${el} (${st.base.core + inc})</b>${tag(el)} · ${L.cores[el] || `+${st.base.core + inc} ${el.toLowerCase()} damage`}</span>
        <${Stepper} label="core rating" value=${inc} max=${3} onSet=${v => setRc(r => { r.core = Object.assign({}, r.core, { inc: v }); })} />${del(el)}</div>`}</div>
      ${addBtn}
      <p class="ptdc">${el ? `Difficulty ${dc}% · ${chance(dc)}% to land` : "Pick an element"} · base Rating ${st.base.core} (half your Powdertinker)</p>`;
  } else if (part === "status") {
    const el = rc.core && rc.core.el;
    body = !el ? html`<p class="ptlocked">Status properties need a Core first. Pick an element on the Core.</p>` : html`<div class="ptopts">${L.statuses.filter(x => x[1] === el).map(([k, , t]) => { const on = (rc.status || []).includes(k);
      return html`<div class=${"ptopt row-opt" + (on ? " on" : "")}><button type="button" class="ptcheck" aria-pressed=${on} disabled=${disabled} onClick=${() => setRc(r => { const s = (r.status || []).filter(n => { const S = L.statuses.find(x => x[0] === n); return S && S[1] === el; }); r.status = on ? s.filter(n => n !== k) : [...s, k]; })}>
        <b>${k} (${st.base.status})${tag(k)}</b><span>${t}${own(k) ? ` · ${dcOf(k)}%` : ""}</span></button>${del(k)}</div>`; })}</div>
      ${!L.statuses.some(x => x[1] === el) && html`<p class="muted">The book has no status for ${el}. Add your own below.</p>`}
      ${addBtn}<p class="ptdc">Difficulty 40% each (custom ones: their own) · ${chance(40)}% to land · Rating ${st.base.status}</p>`;
  }
  return html`<div class=${"ptpick part-" + part}>
    <h3 class="ptpickh"><span>${PT_LABEL[part]}</span>${s.access && s.open && s.value ? html`<small>${s.value}</small>` : ""}</h3>
    <p class="muted ptrule">${PT_RULE[part]}</p>
    ${body}</div>`;
}

// A custom part: a name, what it does, its difficulty, and for a tip whether it has a Rating, for a status its element.
// The examples in the boxes are only hints. Saved on this character (c.craft.parts).
const PT_HINT = {
  coat: ["Silvered", "Silver-plated: hurts creatures weak to silver."],
  tip: ["Hollow point", "Opens wide on impact: +Rating damage against unarmored targets."],
  area: ["Line", "Explodes in a line 2 m wide, length Rating."],
  core: ["Steam", "+Rating scalding damage; the target is wreathed in steam."],
  status: ["Scalded", "Rating/2 damage each turn until resisted."],
};
function PartForm({ part, L, el, onSave, onCancel }) {
  const [f, setF] = useState({ n: "", what: "", dc: R.PT_BASE_DC[part], rated: true, el: el || L.elements[0] });
  const set = (k, v) => setF(Object.assign({}, f, { [k]: v }));
  const id = k => "pf-" + part + "-" + k, name = f.n.trim();
  const taken = name && [...L.coats, ...L.tips, ...L.areas, ...L.statuses].some(x => x[0].toLowerCase() === name.toLowerCase()) || L.elements.some(x => x.toLowerCase() === name.toLowerCase());
  const ok = name && !taken;
  return html`<div class="brform ptform">
    <div class="grid2"><div class="mini"><label for=${id("n")}>Name</label><input id=${id("n")} type="text" maxlength="40" value=${f.n} placeholder=${PT_HINT[part][0]} onInput=${e => set("n", e.target.value)} /></div>
      <div class="mini"><label for=${id("dc")}>Difficulty (%)</label><input id=${id("dc")} type="number" min="1" max="100" value=${f.dc} onInput=${e => set("dc", R.clamp(+e.target.value || 0, 1, 100))} /></div>
      ${part === "status" && html`<div class="mini"><label for=${id("el")}>Element</label><select id=${id("el")} value=${f.el} onChange=${e => set("el", e.target.value)}>${L.elements.map(x => html`<option>${x}</option>`)}</select></div>`}</div>
    <div class="mini"><label for=${id("w")}>What it does</label><input id=${id("w")} type="text" maxlength="200" value=${f.what} placeholder=${PT_HINT[part][1]} onInput=${e => set("what", e.target.value)} /></div>
    ${part === "tip" && html`<label class="amforge"><input type="checkbox" checked=${f.rated} onChange=${e => set("rated", e.target.checked)} /> Has a Rating <span class="muted">(starts at your Powdertinker; each +1 makes it 5% harder)</span></label>`}
    ${part === "core" && html`<p class="muted">A new element, with its own solution under Supplies. Each +1 Rating makes it 10% harder, as in the book.</p>`}
    ${taken && html`<p class="flag bad">There's already a part called ${name}.</p>`}
    <div class="row" style="margin-top:8px"><button class="btn small primary" disabled=${!ok} onClick=${() => onSave(Object.assign({ k: "p" + rid(), part, n: name, what: f.what.trim(), dc: f.dc },
        part === "tip" ? { rated: !!f.rated } : {}, part === "status" ? { el: f.el } : {}))}>Save ${PT_ONE[part]}</button>
      <button class="btn small" onClick=${onCancel}>Cancel</button></div></div>`;
}

/* ---------- the drawing ---------- */
// Small type icons for the munition picker.
const TYPE_ICON = {
  rifle: html`<path d="M12 2.5c1.2 1.3 1.8 3 1.8 4.8V9h-3.6V7.3c0-1.8.6-3.5 1.8-4.8z M10 9h4v1.2l.6.8v9.5h-5.2V11l.6-.8z" />`,
  pistol: html`<path d="M12 6c1.3.9 2 2.3 2 3.8V11h-4V9.8c0-1.5.7-2.9 2-3.8z M9.8 11h4.4v8.5H9.8z" />`,
  sniper: html`<path d="M12 1.5c1 1.6 1.4 3.4 1.4 5.3V8.5h-2.8V6.8c0-1.9.4-3.7 1.4-5.3z M10.6 8.5h2.8v1.5l.8 1v10.5h-4.4V11l.8-1z" />`,
  heavy: html`<path d="M12 3c2 1.4 3 3.6 3 6v1.5H9V9c0-2.4 1-4.6 3-6z M8.5 10.5h7v11h-7z" />`,
  shell: html`<path d="M8.5 3.5h7v13h-7z M8 16.5h8v4H8z M10 6.5h4 M10 9.5h4" />`,
  arrow: html`<path d="M12 2l3 5h-2.2v12.5L15 22h-2l-1-1.4-1 1.4H9l2.2-2.5V7H9z" />`,
  grenade: html`<path d="M12 9a6 6 0 1 0 .01 0z M10.5 5.5h3V9h-3z M13.5 6.5l3 2.5 M10 5.5a2 2 0 1 1 0-.1" />`,
  knife: html`<path d="M12 2c2 3 2.6 6.5 2 10.5h-4C9.4 8.5 10 5 12 2z M9 12.5h6 M11 12.5h2v6h-2z M12 18.5a1.6 1.6 0 1 1-.01 0z" />`,
  flask: html`<path d="M10.2 3h3.6v5.2a6.5 6.5 0 1 1-3.6 0z M9.6 3h4.8 M7.5 14.5h9" />`,
};

// Each shape: the parts drawn as SVG, and where each callout line lands (in a 360 × 460 drawing).
// side: which side its label sits on; y: the label's height.
const CALLOUTS = { tip: ["l", 62], coat: ["l", 188], area: ["l", 318], core: ["r", 126], status: ["r", 256] };

function cartridge(p) {
  const C = 180, { tip, R: r, neck, nhw, sh, hw, bot } = p;
  const og = tip + p.og;                         // where the ogive meets the straight body
  const bullet = `M${C} ${tip} C${C + r * 0.45} ${tip + p.og * 0.18} ${C + r} ${tip + p.og * 0.55} ${C + r} ${og} L${C + r} ${neck + 26} L${C - r} ${neck + 26} L${C - r} ${og} C${C - r} ${tip + p.og * 0.55} ${C - r * 0.45} ${tip + p.og * 0.18} ${C} ${tip} Z`;
  const capY = tip + p.og * 0.32;                // the tip cap covers the nose down to here
  const capW = r * 0.62;
  const cap = `M${C} ${tip} C${C + r * 0.32} ${tip + p.og * 0.12} ${C + capW} ${tip + p.og * 0.24} ${C + capW + 1} ${capY} L${C - capW - 1} ${capY} C${C - capW} ${tip + p.og * 0.24} ${C - r * 0.32} ${tip + p.og * 0.12} ${C} ${tip} Z`;
  const shTop = p.straight ? neck : sh, shBot = p.straight ? neck : sh + 22;
  const casePath = `M${C - nhw} ${neck} L${C + nhw} ${neck} L${C + nhw} ${shTop} L${C + hw} ${shBot} L${C + hw - 1.5} ${bot} L${C - hw + 1.5} ${bot} L${C - hw} ${shBot} L${C - nhw} ${shTop} Z`;
  const grooveY = bot, rimY = bot + 9;
  const win = { x: C - r * 0.42, y: Math.max(og - 10, capY + 14), w: r * 0.84, h: neck - Math.max(og - 10, capY + 14) - 6 };
  const band = shBot + 14;
  const glyph = { x: C, y: Math.round((band + 18 + bot) / 2) + 6 };
  return {
    outline: [bullet, casePath, `M${C - hw + 6} ${grooveY} h${2 * hw - 12} v9 h-${2 * hw - 12} z`, `M${C - hw} ${rimY} h${2 * hw} v11 h-${2 * hw} z`],
    anchors: { tip: [C - 3, tip + 10], coat: [C - r + 4, Math.min(og + 12, neck - 4)], core: [C + r * 0.2, win.y + win.h / 2], status: [C + hw - 2, band + 4], area: [C - 16, glyph.y] },
    draw: (S, coatFill, tipFill, core, status, area) => html`
      <g class=${"ptg ptg-coat " + S.coat}><path d=${bullet} fill=${coatFill} stroke="#3a2410" stroke-width="1.2" />
        ${coatFill === COAT_FILL.Slashing && html`<path d=${Array.from({ length: 5 }, (_, i) => `M${C - r + 2} ${og + 6 + i * 9} l${2 * r - 4} -7`).join(" ")} stroke="#5d656c" stroke-width="1.1" opacity=".7" clip-path="url(#pt-clip-bullet)" />`}
        <path d=${`M${C - r * 0.55} ${tip + p.og * 0.5} C${C - r * 0.6} ${og} ${C - r * 0.55} ${neck} ${C - r * 0.5} ${neck + 10}`} stroke="#fff" stroke-opacity=".38" stroke-width="3" fill="none" /></g>
      <g class=${"ptg ptg-core " + S.core}><rect x=${win.x} y=${win.y} width=${win.w} height=${win.h} rx=${win.w / 2} fill="#1b130c" stroke="#3a2410" />
        ${core && html`<rect class="ptglow" x=${win.x + 3} y=${win.y + 3} width=${win.w - 6} height=${win.h - 6} rx=${(win.w - 6) / 2} fill=${core} />`}</g>
      <g class=${"ptg ptg-tip " + S.tip}>${tipFill && html`<path d=${cap} fill=${tipFill === "impale" ? "#2d2f33" : tipFill} stroke="#1c1c1c" stroke-width="1" />`}
        ${tipFill === "impale" && html`<rect x=${C - capW - 1} y=${capY - 4} width=${2 * capW + 2} height="4" fill="#b8322a" />`}</g>
      <g class="ptg-case"><path d=${casePath} fill="url(#pt-brass)" stroke="#5a3a0e" stroke-width="1.3" />
        <path d=${`M${C - hw + 7} ${shBot + 4} L${C - hw + 7} ${bot - 4}`} stroke="#fff6d6" stroke-opacity=".5" stroke-width="4" />
        <rect x=${C - hw + 6} y=${grooveY} width=${2 * hw - 12} height="9" fill="#8a611f" stroke="#5a3a0e" />
        <rect x=${C - hw} y=${rimY} width=${2 * hw} height="11" rx="2" fill="url(#pt-brass)" stroke="#5a3a0e" /></g>
      <g class=${"ptg ptg-status " + S.status}><rect x=${C - hw + 0.5} y=${band - 3} width=${2 * hw - 1} height="14" fill=${status || "#9c7128"} stroke="#5a3a0e" />
        ${status && html`<path class="ptglow" d=${Array.from({ length: 5 }, (_, i) => `M${C - hw + 8 + i * (2 * hw - 16) / 4} ${band + 1} v6`).join(" ")} stroke="#fff" stroke-width="1.6" />`}</g>
      <g class=${"ptg ptg-area " + S.area}><circle cx=${glyph.x} cy=${glyph.y} r="17" fill="none" stroke="#5a3a0e" stroke-width="1.6" />${area && areaGlyph(area, glyph.x, glyph.y, 12, "#5a3a0e")}</g>`,
  };
}
// The etched mark for an Area shape.
function areaGlyph(a, x, y, s, col) {
  const k = a.k || a;
  if (k === "Sphere") return html`<circle cx=${x} cy=${y} r=${s * 0.75} fill=${col} opacity=".75" />`;
  if (k === "Plus") return html`<path d=${`M${x - s} ${y}h${2 * s} M${x} ${y - s}v${2 * s}`} stroke=${col} stroke-width="4" />`;
  if (k === "Cross") return html`<path d=${`M${x - s * 0.72} ${y - s * 0.72}l${1.44 * s} ${1.44 * s} M${x + s * 0.72} ${y - s * 0.72}l${-1.44 * s} ${1.44 * s}`} stroke=${col} stroke-width="4" />`;
  const ang = ((a.cone || 60) / 2) * Math.PI / 180;
  return html`<path d=${`M${x} ${y + s * 0.8} L${x - Math.sin(ang) * s * 1.6} ${y + s * 0.8 - Math.cos(ang) * s * 1.6} A${s * 1.6} ${s * 1.6} 0 0 1 ${x + Math.sin(ang) * s * 1.6} ${y + s * 0.8 - Math.cos(ang) * s * 1.6} Z`} fill=${col} opacity=".75" />`;
}

const SHAPES = {
  rifle: () => cartridge({ tip: 34, og: 112, R: 23, neck: 186, nhw: 26, sh: 222, hw: 38, bot: 396 }),
  sniper: () => cartridge({ tip: 18, og: 132, R: 20, neck: 184, nhw: 23, sh: 226, hw: 36, bot: 404 }),
  pistol: () => cartridge({ tip: 112, og: 62, R: 29, neck: 210, nhw: 32, sh: 210, hw: 32, bot: 386, straight: true }),
  heavy: () => cartridge({ tip: 40, og: 92, R: 33, neck: 188, nhw: 37, sh: 226, hw: 50, bot: 400 }),
  shell: () => {
    const C = 180, hw = 38, top = 58, base = 318, bot = 392;
    const hull = `M${C - hw} ${top + 10} Q${C} ${top - 6} ${C + hw} ${top + 10} L${C + hw} ${base} L${C - hw} ${base} Z`;
    return {
      outline: [hull, `M${C - hw - 2} ${base} h${2 * hw + 4} v${bot - base} h-${2 * hw + 4} z`, `M${C - hw - 5} ${bot} h${2 * hw + 10} v11 h-${2 * hw + 10} z`],
      anchors: { tip: [C - 6, top + 4], coat: [C - hw + 3, 172], core: [C + 14, 142], status: [C + hw + 2, base + 18], area: [C - 16, 262] },
      draw: (S, coatFill, tipFill, core, status, area) => html`
        <g class=${"ptg ptg-coat " + S.coat}><path d=${hull} fill="url(#pt-hull)" stroke="#4a1410" stroke-width="1.3" />
          ${Array.from({ length: 9 }, (_, i) => html`<path d=${`M${C - hw + 4 + i * 8.5} ${top + 12} V${base - 4}`} stroke="#000" stroke-opacity=".12" stroke-width="1.4" />`)}
          <path d=${`M${C - hw + 6} ${top + 6} L${C} ${top + 22} L${C + hw - 6} ${top + 6} M${C} ${top - 1} V${top + 22} M${C - hw * 0.62} ${top + 1} L${C} ${top + 22} L${C + hw * 0.62} ${top + 1}`} stroke="#3b0f0c" stroke-width="1.4" fill="none" />
          <rect x=${C - 22} y=${top + 40} width="44" height="150" rx="10" fill=${coatFill} opacity=".22" /></g>
        <g class=${"ptg ptg-core " + S.core}><rect x=${C - 20} y=${top + 42} width="40" height="96" rx="8" fill="#1b130c" stroke="#3b0f0c" />
          ${Array.from({ length: 12 }, (_, i) => html`<circle class=${core ? "ptglow" : ""} cx=${C - 11 + (i % 3) * 11} cy=${top + 54 + Math.floor(i / 3) * 22} r="5" fill=${core || "#6d6f73"} stroke="#000" stroke-opacity=".4" />`)}</g>
        <g class="ptg-case"><rect x=${C - hw - 2} y=${base} width=${2 * hw + 4} height=${bot - base} fill="url(#pt-brass)" stroke="#5a3a0e" stroke-width="1.3" />
          <rect x=${C - hw - 5} y=${bot} width=${2 * hw + 10} height="11" rx="2" fill="url(#pt-brass)" stroke="#5a3a0e" /></g>
        <g class=${"ptg ptg-status " + S.status}><rect x=${C - hw - 2} y=${base + 12} width=${2 * hw + 4} height="12" fill=${status || "#9c7128"} stroke="#5a3a0e" />
          ${status && html`<path class="ptglow" d=${Array.from({ length: 6 }, (_, i) => `M${C - hw + 6 + i * 14} ${base + 15} v6`).join(" ")} stroke="#fff" stroke-width="1.6" />`}</g>
        <g class=${"ptg ptg-area " + S.area}><circle cx=${C} cy="262" r="17" fill="#f6e6c8" fill-opacity=".25" stroke="#3b0f0c" stroke-width="1.6" />${area && areaGlyph(area, C, 262, 12, "#3b0f0c")}</g>
        <g class=${"ptg ptg-tip " + S.tip}></g>`,
    };
  },
  arrow: () => {
    const C = 180;
    const head = `M${C} 22 L${C + 24} 92 L${C + 6} 84 L${C + 3} 100 L${C - 3} 100 L${C - 6} 84 L${C - 24} 92 Z`;
    const point = `M${C} 22 L${C + 10} 50 L${C - 10} 50 Z`;
    const shaft = `M${C - 3.5} 100 h7 v300 h-7 z`;
    const fl = s => `M${C + s * 3} 330 C${C + s * 30} 340 ${C + s * 34} 380 ${C + s * 30} 404 L${C + s * 3} 392 Z`;
    return {
      outline: [head, shaft, fl(1), fl(-1), `M${C - 5} 400 h10 v16 h-10 z`],
      anchors: { tip: [C - 4, 34], coat: [C - 18, 82], core: [C + 9, 146], status: [C + 6, 226], area: [C - 4, 300] },
      draw: (S, coatFill, tipFill, core, status, area) => html`
        <path d=${shaft} fill="url(#pt-wood)" stroke="#4a2c12" stroke-width="1.1" />
        <path d=${fl(1)} fill="#c9b9a0" stroke="#6b5a40" /><path d=${fl(-1)} fill="#e7dcc8" stroke="#6b5a40" />
        <path d=${`M${C - 5} 400 h10 v16 h-10 z M${C - 2} 404 v12 h4 v-12`} fill="#2b2420" />
        <g class=${"ptg ptg-coat " + S.coat}><path d=${head} fill=${coatFill} stroke="#2a2a2a" stroke-width="1.2" /><path d=${`M${C} 30 V92`} stroke="#fff" stroke-opacity=".45" stroke-width="1.5" /></g>
        <g class=${"ptg ptg-tip " + S.tip}>${tipFill && html`<path d=${point} fill=${tipFill === "impale" ? "#2d2f33" : tipFill} stroke="#111" />`}${tipFill === "impale" && html`<path d=${`M${C - 10} 50 h20`} stroke="#b8322a" stroke-width="3" />`}</g>
        <g class=${"ptg ptg-core " + S.core}><rect x=${C - 9} y="118" width="18" height="56" rx="9" fill="#1b130c" fill-opacity=".85" stroke="#6b4a2a" />
          ${core && html`<rect class="ptglow" x=${C - 6} y="121" width="12" height="50" rx="6" fill=${core} />`}
          <path d=${`M${C - 10} 124 h20 M${C - 10} 168 h20`} stroke="#6b4a2a" stroke-width="2" /></g>
        <g class=${"ptg ptg-status " + S.status}>${Array.from({ length: 5 }, (_, i) => html`<rect x=${C - 6} y=${210 + i * 7} width="12" height="5" rx="1.5" fill=${status || "#8b6a45"} stroke="#3c2a18" stroke-width=".8" />`)}</g>
        <g class=${"ptg ptg-area " + S.area}>${area && areaGlyph(area, C, 300, 10, "#4a2c12")}</g>`,
    };
  },
  grenade: () => {
    const C = 180, cy = 288, r = 74;
    return {
      outline: [`M${C - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`, `M${C - 22} 178 h44 v34 h-44 z`, `M${C - 16} 152 h32 v28 h-32 z`],
      anchors: { tip: [C - 8, 156], coat: [C - 58, cy - 40], core: [C + 22, 268], status: [C + 22, 204], area: [C - 22, 336] },
      draw: (S, coatFill, tipFill, core, status, area) => html`
        <path d=${`M${C + 18} 168 C${C + 64} 168 ${C + 70} 212 ${C + 60} 258`} stroke="#4d5056" stroke-width="7" fill="none" stroke-linecap="round" />
        <circle cx=${C - 34} cy="160" r="13" fill="none" stroke="#9aa0a6" stroke-width="3.5" />
        <g class=${"ptg ptg-coat " + S.coat}><circle cx=${C} cy=${cy} r=${r} fill="url(#pt-iron)" stroke="#1c1d20" stroke-width="1.5" />
          ${[-50, -18, 18, 50].map(dx => html`<path d=${`M${C + dx} ${cy - Math.sqrt(r * r - dx * dx) + 4} V${cy + Math.sqrt(r * r - dx * dx) - 4}`} stroke="#000" stroke-opacity=".35" stroke-width="3" />`)}
          ${[-44, -10, 24, 56].map(dy => html`<path d=${`M${C - Math.sqrt(r * r - dy * dy) + 4} ${cy + dy} H${C + Math.sqrt(r * r - dy * dy) - 4}`} stroke="#000" stroke-opacity=".3" stroke-width="3" />`)}
          <ellipse cx=${C - 34} cy=${cy - 38} rx="20" ry="12" fill="#fff" opacity=".18" transform=${`rotate(-35 ${C - 34} ${cy - 38})`} /></g>
        <g class=${"ptg ptg-core " + S.core}><circle cx=${C} cy="262" r="26" fill="#1b130c" stroke="#1c1d20" stroke-width="2" />
          ${core && html`<circle class="ptglow" cx=${C} cy="262" r="21" fill=${core} />`}</g>
        <g class="ptg-case"><rect x=${C - 22} y="178" width="44" height="34" rx="3" fill="url(#pt-brass)" stroke="#5a3a0e" /><rect x=${C - 16} y="152" width="32" height="28" rx="4" fill="#6e7176" stroke="#2a2b2e" /></g>
        <g class=${"ptg ptg-status " + S.status}><rect x=${C - 22} y="198" width="44" height="10" fill=${status || "#9c7128"} stroke="#5a3a0e" /></g>
        <g class=${"ptg ptg-area " + S.area}><circle cx=${C} cy="334" r="20" fill="none" stroke="#c9ccd1" stroke-opacity=".7" stroke-width="1.6" />${area && areaGlyph(area, C, 334, 14, "#d9dce0")}</g>
        <g class=${"ptg ptg-tip " + S.tip}></g>`,
    };
  },
  knife: () => {
    const C = 180;
    const blade = `M${C} 26 C${C + 28} 92 ${C + 30} 190 ${C + 18} 262 L${C - 18} 262 C${C - 30} 190 ${C - 28} 92 ${C} 26 Z`;
    const point = `M${C} 26 C${C + 9} 44 ${C + 13} 56 ${C + 15} 70 L${C - 15} 70 C${C - 13} 56 ${C - 9} 44 ${C} 26 Z`;
    return {
      outline: [blade, `M${C - 34} 262 h68 v12 h-68 z`, `M${C - 10} 274 h20 v118 h-20 z`, `M${C - 16} 404 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0`],
      anchors: { tip: [C - 6, 40], coat: [C - 22, 150], core: [C + 4, 176], status: [C + 9, 330], area: [C - 26, 268] },
      draw: (S, coatFill, tipFill, core, status, area) => html`
        <g class=${"ptg ptg-coat " + S.coat}><path d=${blade} fill=${coatFill} stroke="#26292d" stroke-width="1.3" /><path d=${`M${C - 2} 34 C${C - 14} 110 ${C - 14} 200 ${C - 10} 258`} stroke="#fff" stroke-opacity=".4" stroke-width="2.5" fill="none" /></g>
        <g class=${"ptg ptg-core " + S.core}><path d=${`M${C - 5} 100 Q${C} 92 ${C + 5} 100 V246 H${C - 5} Z`} fill="#1b130c" stroke="#26292d" />
          ${core && html`<path class="ptglow" d=${`M${C - 3} 104 Q${C} 98 ${C + 3} 104 V243 H${C - 3} Z`} fill=${core} />`}</g>
        <g class=${"ptg ptg-tip " + S.tip}>${tipFill && html`<path d=${point} fill=${tipFill === "impale" ? "#2d2f33" : tipFill} stroke="#111" />`}${tipFill === "impale" && html`<path d=${`M${C - 15} 70 h30`} stroke="#b8322a" stroke-width="3" />`}</g>
        <rect x=${C - 34} y="262" width="68" height="12" rx="3" fill="url(#pt-brass)" stroke="#5a3a0e" />
        <g class=${"ptg ptg-area " + S.area}>${area && areaGlyph(area, C, 268, 5, "#5a3a0e")}</g>
        <g class=${"ptg ptg-status " + S.status}><rect x=${C - 10} y="274" width="20" height="118" rx="3" fill="#3a2a1e" />
          ${Array.from({ length: 12 }, (_, i) => html`<path d=${`M${C - 10} ${280 + i * 9.5} l20 5`} stroke=${status || "#8b6a45"} stroke-width="4" stroke-linecap="round" />`)}</g>
        <circle cx=${C} cy="404" r="14" fill="none" stroke="url(#pt-brass)" stroke-width="5" />`,
    };
  },
  flask: () => {
    const C = 180, cy = 310, r = 76;
    const body = `M${C - 16} 104 L${C - 16} ${cy - r + 14} A${r} ${r} 0 1 0 ${C + 16} ${cy - r + 14} L${C + 16} 104 Z`;
    return {
      outline: [body, `M${C - 14} 70 h28 v36 h-28 z`],
      anchors: { tip: [C - 6, 78], coat: [C - 62, 296], core: [C + 50, 340], status: [C + 34, 162], area: [C - 30, 236] },
      draw: (S, coatFill, tipFill, core, status, area) => html`
        <g class=${"ptg ptg-coat " + S.coat}><path d=${body} fill="#cfe3e6" fill-opacity=".28" stroke="#5f7a80" stroke-width="2" /></g>
        <g class=${"ptg ptg-core " + S.core}><path d=${`M${C - r + 8} ${cy + 6} A${r - 8} ${r - 8} 0 0 0 ${C + r - 8} ${cy + 6} Q${C} ${cy - 6} ${C - r + 8} ${cy + 6} Z`} class=${core ? "ptglow" : ""} fill=${core || "#c9962e"} fill-opacity=".85" />
          ${[[-30, 40, 6], [12, 60, 4], [36, 24, 5], [-6, 20, 3]].map(([dx, dy, rr]) => html`<circle cx=${C + dx} cy=${cy + dy} r=${rr} fill="#fff" opacity=".35" />`)}</g>
        <path d=${`M${C - 46} ${cy - 40} C${C - 62} ${cy - 8} ${C - 58} ${cy + 26} ${C - 42} ${cy + 48}`} stroke="#fff" stroke-opacity=".55" stroke-width="5" fill="none" stroke-linecap="round" />
        <g class="ptg-case"><rect x=${C - 14} y="70" width="28" height="36" rx="4" fill="url(#pt-wood)" stroke="#4a2c12" /></g>
        <g class=${"ptg ptg-status " + S.status} transform="translate(-14 0)"><path d=${`M${C + 16} 132 C${C + 34} 136 ${C + 42} 144 ${C + 46} 152`} stroke="#6b5a40" stroke-width="1.6" fill="none" />
          <path d=${`M${C + 40} 150 l26 6 l-6 28 l-26 -6 z`} fill=${status || "#e7dcc8"} stroke="#6b5a40" /><circle cx=${C + 46} cy="156" r="2.4" fill="#6b5a40" /></g>
        <g class=${"ptg ptg-area " + S.area}></g><g class=${"ptg ptg-tip " + S.tip}></g>`,
    };
  },
};

function Munition({ m, rc, sum, st, focus, partState, forging, phase, onPick }) {
  const shape = useMemo(() => SHAPES[m.shape](), [m.shape]);
  const S = {}; R.PT_PARTS.forEach(p => (S[p] = sum[p].access ? partState(p) : "na"));
  const show = p => !["off", "ghost", "miss", "na"].includes(S[p]);
  // What the drawing shows on each part, following the recipe.
  const coat = m.shape === "flask" || m.shape === "grenade" ? "Piercing" : (sum.coat.custom && sum.coat.open ? rc.coat : "") || "Piercing";
  const coatFill = m.shape === "grenade" ? "url(#pt-iron)" : COAT_FILL[coat];
  const tips = rc.tips || {}; const has = k => tips[k] != null && tips[k] !== false;
  const tipFill = show("tip") && sum.tip.access && sum.tip.open ? (has("Penetrating") ? "#34383d" : has("Precise") ? "url(#pt-silver)" : has("Impale") ? "impale" : null) : null;
  const el = rc.core && rc.core.el;
  const core = show("core") && el ? elHue(el) : null;
  const status = show("status") && el ? elHue(el) : null;
  const area = show("area") ? (rc.area && rc.area.k ? rc.area : m.shape === "grenade" ? { k: "Sphere" } : null) : null;
  const anchorFor = p => shape.anchors[p];
  const final = phase === "done", scrap = phase === "scrap" || phase === "scrapping";
  return html`<div class=${"ptmun" + (forging ? " forging" : "") + (final ? " final" : "") + (scrap ? " scrap" : "") + " shape-" + m.shape}>
    <svg class="ptsvg" viewBox="0 0 360 460" role="img" aria-label=${`${m.n}: ${R.PT_PARTS.filter(p => sum[p].access && sum[p].value).map(p => `${PT_LABEL[p]} ${sum[p].value}`).join(", ") || "plain"}`}>
      <defs>
        <linearGradient id="pt-brass" x1="0" x2="1"><stop offset="0" stop-color="#7a5418" /><stop offset=".28" stop-color="#f1cd77" /><stop offset=".55" stop-color="#c8963d" /><stop offset="1" stop-color="#6b4512" /></linearGradient>
        <linearGradient id="pt-copper" x1="0" x2="1"><stop offset="0" stop-color="#7a3a1a" /><stop offset=".3" stop-color="#e59a62" /><stop offset=".6" stop-color="#b8673a" /><stop offset="1" stop-color="#5e2a12" /></linearGradient>
        <linearGradient id="pt-lead" x1="0" x2="1"><stop offset="0" stop-color="#4a4e54" /><stop offset=".3" stop-color="#b7bcc2" /><stop offset=".6" stop-color="#858a91" /><stop offset="1" stop-color="#3c4045" /></linearGradient>
        <linearGradient id="pt-steel" x1="0" x2="1"><stop offset="0" stop-color="#5b636b" /><stop offset=".3" stop-color="#eef2f5" /><stop offset=".6" stop-color="#a8b1b9" /><stop offset="1" stop-color="#4d555c" /></linearGradient>
        <linearGradient id="pt-silver" x1="0" x2="1"><stop offset="0" stop-color="#8d949b" /><stop offset=".4" stop-color="#ffffff" /><stop offset="1" stop-color="#9aa1a8" /></linearGradient>
        <linearGradient id="pt-iron" x1="0" x2="1"><stop offset="0" stop-color="#2c2f33" /><stop offset=".35" stop-color="#6c7178" /><stop offset="1" stop-color="#25272a" /></linearGradient>
        <linearGradient id="pt-hull" x1="0" x2="1"><stop offset="0" stop-color="#5a1712" /><stop offset=".35" stop-color="#c2463a" /><stop offset="1" stop-color="#4b120e" /></linearGradient>
        <linearGradient id="pt-wood" x1="0" x2="1"><stop offset="0" stop-color="#5a3518" /><stop offset=".45" stop-color="#b07b45" /><stop offset="1" stop-color="#4f2e14" /></linearGradient>
        <linearGradient id="pt-glint" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0" /><stop offset=".5" stop-color="#fff" stop-opacity=".85" /><stop offset="1" stop-color="#fff" stop-opacity="0" /></linearGradient>
        <clipPath id="pt-clip-bullet"><path d=${shape.outline[0]} /></clipPath>
        <clipPath id="pt-clip-all">${shape.outline.map(d => html`<path d=${d} />`)}</clipPath>
      </defs>
      <g class="ptlines">${R.PT_PARTS.map(p => { const [side, ly] = CALLOUTS[p]; const [ax, ay] = anchorFor(p); const lx = side === "l" ? 112 : 248;
        return html`<g class=${"ptline" + (focus === p ? " on" : "") + (sum[p].access ? "" : " na") + (sum[p].access && !sum[p].open && p !== "coat" ? " locked" : "")}>
          <path d=${`M${lx} ${ly} H${side === "l" ? lx + 12 : lx - 12} L${ax} ${ay}`} /><circle cx=${ax} cy=${ay} r="3.6" /></g>`; })}</g>
      <g class="ptbody">${shape.draw(S, coatFill, tipFill, core, status, area)}</g>
      <g clip-path="url(#pt-clip-all)"><rect class="ptglint" x="-60" y="-40" width="80" height="540" fill="url(#pt-glint)" /></g>
      ${forging && focus && !["done", "scrap", "nothing", "scrapping"].includes(phase) && html`<g class=${"ptsparks" + (phase === "hit" ? " burst" : "")} transform=${`translate(${anchorFor(focus)[0]} ${anchorFor(focus)[1]})`}>
        ${Array.from({ length: 10 }, (_, i) => html`<line x1="0" y1="0" x2="0" y2="-9" style=${`--a:${i * 36 + 8}deg;--d:${(i % 3) * 60}ms`} />`)}</g>`}
      ${scrap && html`<path class="ptcrack" d="M150 120 l18 34 -12 22 26 40 -8 30 22 46 M210 230 l-14 26 16 30" />`}
      ${final && html`<g class="ptsteam">${[0, 1, 2, 3].map(i => html`<circle cx=${150 + i * 20} cy="420" r=${10 + (i % 2) * 4} style=${`--d:${i * 140}ms`} />`)}</g>`}
    </svg>
    ${R.PT_PARTS.map(p => { const [side, ly] = CALLOUTS[p]; const s = sum[p]; const locked = s.access && !s.open && p !== "coat";
      return html`<button type="button" class=${"ptlabel " + side + (focus === p ? " on" : "") + (s.access ? "" : " na") + (locked ? " locked" : "") + (forging ? " st-" + S[p] : "")}
        style=${`top:${(ly / 460) * 100}%`} disabled=${forging} aria-pressed=${focus === p} onClick=${() => onPick(p)}>
        <span class="k">${PT_LABEL[p]}${locked ? html` <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 7V5a4 4 0 0 1 8 0v2 M3 7h10v7H3z" /></svg>` : ""}</span>
        <span class="v">${!s.access ? "Not on this munition" : locked ? `Powdertinker ${st.unlockAt[p]}` : s.value || (p === "status" && !(rc.core && rc.core.el) ? "Needs a core" : "None")}</span></button>`; })}
  </div>`;
}
