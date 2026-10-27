/* ================= Combat mode ================= */
// While a fight is on at the table (in Tabletop Simulator), the GM switches on combat mode for everyone: a red band
// under the top bar shows the round, who's up and the turn order, and each character in the fight swaps its tabs for one
// battle view. The AP dock sits at the centre of it (sticky under the band): the AP left, Start and End turn, Brace, and
// Take damage, which walks through defending, armor and any cards that help. Anything with an AP cost spends it when
// used, and lights the AP it would spend when hovered. Below: vitals, gear, abilities, cards, and magic in place
// (daemon cards with the summoning circle, the Toll and the dreamsphere; Warding and Harmony open their pages in a pop-up).
// The fight is one document per table, `combat/now`, written by the GM and read by everyone; this browser only in local
// mode, or until the database rule for it has been added (then it says so).

const blankFight = () => ({ on: false, round: 0, chars: [], up: "", upId: "", next: "", order: [], t: 0 });
const Fight = {
  started: false, state: blankFight(), local: false, listeners: new Set(),
  emit() { this.listeners.forEach(f => f()); },
  live() { return Store.mode === "live" && !this.local; },
  goLocal() { this.local = true; this.state = Object.assign(blankFight(), lsGet("cw-fight", {})); this.emit(); },
  start() {
    if (this.started || Store.mode === "loading") return;
    this.started = true;
    if (Store.mode !== "live") { this.state = Object.assign(blankFight(), lsGet("cw-fight", {})); this.emit(); return; }
    Store.db.doc("combat/now").onSnapshot(s => {
      const d = s.exists ? s.data() : null;
      if (!d || num(d.t) >= num(this.state.t)) { this.state = Object.assign(blankFight(), d || {}); this.emit(); }
    }, () => this.goLocal());   // the database rule for combat mode isn't there yet: keep the fight in this browser
  },
  set(patch) {
    const next = clean(Object.assign({}, this.state, patch, { t: Date.now() }));
    this.state = next; this.emit();
    if (!this.live()) { lsSet("cw-fight", next); return; }
    Store.db.doc("combat/now").set(next).catch(() => { lsSet("cw-fight", next); this.goLocal(); toast("Combat mode is on in this browser only: the table's database rules need the combat rule."); });
  },
  // Is this character in the fight? An empty list means everyone at the table.
  has(id) { const s = this.state; return !!(s.on && id && (!s.chars || !s.chars.length || s.chars.includes(id))); },
};
function useFight() {
  const [, f] = useState(0);
  useEffect(() => { const g = () => f(x => x + 1); Fight.listeners.add(g); return () => Fight.listeners.delete(g); }, []);
  Fight.start();   // waits until the store knows whether it's live or local
  return Fight.state;
}
// What the band shows, read from the GM's initiative deck: the round, who's up, who's next, and the turn order so far.
// Players never see the deck itself; enemies show only as "An enemy", and who's still to act is listed without order.
function fightFromDeck(e, all) {
  if (!e || !num(e.round)) return null;
  const combs = e.combatants || [], comb = cid => combs.find(x => x.id === cid);
  const name = cb => !cb ? "" : cb.kind === "pc" ? ((all[cb.charId] && all[cb.charId].name) || cb.name || "A character") : cb.kind === "effect" ? "An effect" : "An enemy";
  const row = (cb, st) => ({ n: name(cb), pc: cb.kind === "pc" ? cb.charId : "", st });
  const cur = e.current ? comb(cardOwner(e.current)) : null;
  const acted = e.acted || [];
  const nextId = (e.deck || []).map(cardOwner).find(o => { const cb = comb(o); return cb && !cb.out && !acted.includes(o); });
  const done = (e.drawn || []).filter(x => !x.skip).map(x => comb(cardOwner(x.card))).filter(Boolean).map(cb => row(cb, e.current && cb.id === cardOwner(e.current) ? "up" : "done"));
  const left = combs.filter(cb => !cb.out && !acted.includes(cb.id)).map(cb => row(cb, "left"))
    .sort((a, b) => (b.pc ? 1 : 0) - (a.pc ? 1 : 0) || a.n.localeCompare(b.n));
  return { round: num(e.round), up: name(cur), upId: cur && cur.kind === "pc" ? cur.charId : "", next: nextId ? name(comb(nextId)) : "", order: [...done, ...left] };
}
// A character's combat state, fresh: what the GM's Start and End combat give every character in the fight.
// Death saves stay while the character is still at 0 HP.
const freshCombat = x => {
  const keep = derive(x).cur.hp <= 0 && x.combat && x.combat.saves ? x.combat.saves : { ok: 0, fail: 0 };
  return { turn: false, ended: false, ap: 5, carry: 0, reacted: false, running: [], saves: keep, round: 0, bledRound: 0, braced: false, defRound: 0, braceMit: num(x.combat && x.combat.braceMit) };
};

const SWORDS = html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3.5l9.5 9.5 M3.5 4V3.5H4 M20 3.5L10.5 13 M20.5 4V3.5H20 M7.5 14.5l2 2 M16.5 14.5l-2 2 M5.5 16.5l2 2 M18.5 16.5l-2 2 M4.5 20.5l2-2 M19.5 20.5l-2-2" /></svg>`;

// The top bar's Start combat button: for the GM (and anyone keeping characters in this browser only).
function FightStart({ start }) {
  return html`<button type="button" class="fightbtn" onClick=${start} data-tip="Start combat for everyone at the table" aria-label="Start combat">${SWORDS}<span>Combat</span></button>`;
}

// The band under the top bar while combat is on: the round, the turn order, and the GM's controls.
function FightBand({ fight, gm, mine, away, setAway, chars, end, setChars }) {
  const [who, setWho] = useState(false), [sure, setSure] = useState(false);
  const el = useRef();
  useEffect(() => { if (!sure) return; const t = setTimeout(() => setSure(false), 4000); return () => clearTimeout(t); }, [sure]);
  // The AP dock sticks just under the band, so the band's height is shared as --fbh.
  useEffect(() => {
    const root = document.documentElement, put = () => el.current && root.style.setProperty("--fbh", el.current.offsetHeight + "px");
    put(); const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(put) : null; if (ro && el.current) ro.observe(el.current);
    return () => { ro && ro.disconnect(); root.style.removeProperty("--fbh"); };
  }, []);
  const deck = !!(Store.encounter && num(Store.encounter.round));
  const myTurn = mine && fight.upId === mine.id;
  const inList = id => !fight.chars.length || fight.chars.includes(id);
  const flip = id => setChars(fight.chars.length ? (fight.chars.includes(id) ? fight.chars.filter(x => x !== id) : [...fight.chars, id]) : chars.map(c => c.id).filter(x => x !== id));
  const order = fight.order || [], played = order.filter(o => o.st !== "left"), left = order.filter(o => o.st === "left");
  const leftEnemies = left.filter(o => !o.pc).length;
  return html`<div class=${"fightband" + (myTurn ? " myturn" : "")} ref=${el} role="status" aria-live="polite">
    <div class="fbrow">
      <span class="fbmark">${SWORDS}<b>Combat</b></span>
      <span class="fbround">Round <b>${num(fight.round) || 1}</b></span>
      ${fight.up && html`<span class="fbup">${myTurn ? html`<b>Your turn</b>` : html`Up: <b>${fight.up}</b>`}</span>`}
      ${fight.next && html`<span class="fbnext">Next: <b>${fight.next}</b></span>`}
      ${Fight.local && Store.mode === "live" && html`<span class="fbnote" title="Paste the combat rule from firestore.rules into the Firebase console to share it">This browser only</span>`}
      <span class="fbgap"></span>
      ${mine && html`<button type="button" class="fbbtn" onClick=${() => setAway(!away)}>${away ? "Back to combat" : "Sheet"}</button>`}
      ${gm && !deck && html`<button type="button" class="fbbtn" onClick=${() => Fight.set({ round: Math.max(1, num(fight.round)) + 1 })} title="The initiative deck on the GM table counts rounds for you">Next round</button>`}
      ${gm && html`<span class="fbwho"><button type="button" class="fbbtn" aria-expanded=${who} onClick=${() => setWho(!who)}>Who's in</button>
        ${who && html`<div class="fbwholist" role="dialog" aria-label="Who's in the fight">
          <p class="muted">${fight.chars.length ? "These characters switch to the battle view." : "Everyone at the table is in."}</p>
          ${chars.map(c => html`<label class="fbwhorow"><input type="checkbox" checked=${inList(c.id)} onChange=${() => flip(c.id)} /><${Thumb} c=${c} /><span>${c.name || "Unnamed"}</span></label>`)}
          <div class="row"><button class="btn small" onClick=${() => setChars([])}>Everyone</button><button class="btn small" onClick=${() => setWho(false)}>Done</button></div>
        </div>`}</span>`}
      ${gm && (sure ? html`<span class="fbsure">End for everyone? <button type="button" class="fbbtn fbend" onClick=${() => { setSure(false); end(); }}>End combat</button><button type="button" class="fbbtn" onClick=${() => setSure(false)}>Keep going</button></span>`
        : html`<button type="button" class="fbbtn fbend" onClick=${() => setSure(true)}>End combat</button>`)}
    </div>
    ${order.length > 0 && html`<ol class="fborder" aria-label="Turn order this round">
      ${played.map(o => html`<li class=${"fbo " + o.st + (mine && o.pc === mine.id ? " me" : "") + (o.pc ? "" : " foe")}>${o.st === "up" ? "▶ " : "✓ "}${o.n}</li>`)}
      ${left.length > 0 && html`<li class="fbo left">Still to act: ${[...left.filter(o => o.pc).map(o => o.n), ...(leftEnemies ? [`${leftEnemies} ${leftEnemies === 1 ? "enemy" : "enemies"}`] : [])].join(", ")}</li>`}
    </ol>`}
  </div>`;
}

/* ---------- AP: what things cost, the hover preview, and spending ---------- */
// Hovering anything with an AP cost lights that many AP on the dock. Buttons say their cost with data-ap (or "N AP"
// in their text, which is how the Magic tab's own buttons show it), so one listener on the battle view covers them all.
const ApHint = { n: 0, ls: new Set(), set(n) { n = Math.max(0, num(n)); if (n !== this.n) { this.n = n; this.ls.forEach(f => f()); } } };
function useApHint() { const [, f] = useState(0); useEffect(() => { const g = () => f(x => x + 1); ApHint.ls.add(g); return () => { ApHint.ls.delete(g); }; }, []); return ApHint.n; }
const apOfButton = b => { if (!b || b.disabled) return 0; if (b.dataset && b.dataset.ap != null) return num(b.dataset.ap); const m = /(\d+)\s*AP\b/.exec(b.textContent || ""); return m ? +m[1] : 0; };
const apScan = { onMouseOver: e => ApHint.set(apOfButton(e.target.closest && e.target.closest("button"))), onMouseLeave: () => ApHint.set(0),
  onfocusin: e => ApHint.set(apOfButton(e.target.closest && e.target.closest("button"))), onfocusout: () => ApHint.set(0) };

const isRunning = (c, key) => ((c.combat || {}).running || []).some(r => r.key === key);
// What an action really costs after the perks that change costs: Versatility 4 (Actives and Empowerments 1 less, not below 1),
// Versatility 10 (Actives free), True Haste (Alacrity 10: anything up to 5 AP costs 2).
function apCost(c, base, kind) {
  let n = Math.max(0, num(base));
  if (kind === "perk" && isRunning(c, "p:Versatility:10")) n = 0;
  if (kind === "perk" && n > 1 && num(c.skills.Versatility) >= 4) n -= 1;
  if (isRunning(c, "p:Alacrity:10") && n > 2 && n <= 5) n = 2;
  return n;
}
const apOf = p => (p.u && p.u.ap != null ? parseInt(p.u.ap, 10) || 0 : 0);
const reactOk = p => !!(p.u && String(p.u.ap || "").includes("*"));
// The Active or Empowerment behind a uses key ("p:Parry:4"), from the book's data.
function perkByKey(key) {
  const m = /^p:(.+):(\d+)$/.exec(key || ""); if (!m) return null;
  const sd = SKILL_DATA.skills[m[1]]; if (!sd) return null;
  const all = sd.gs.flatMap(g => g.p.map(p => Object.assign({ group: g.n && g.n !== "Perks" ? g.n : "" }, p))).filter(p => num(p.l) === +m[2]);
  return all.find(p => p.t === "A" || p.t === "E" || p.t === "M") || all[0] || null;
}
const AP_OVERRIDE = { "p:Dreamwalking:7": c => R.dreamState(c).sphereAP };   // Morpheus beckons (9): a dreamsphere costs 1 less
// The Magic tab's own pages (Warding, Harmony, a daemon's partial summon or boost) don't know about AP. In combat they get
// an update that compares the character before and after and spends what was used: an Active's uses ticked, a Ward
// inscribed with AP, a daemon summoned or dismissed.
function apSpent(c, b, x) {
  let n = 0;
  const u1 = x.uses || {};
  Object.keys(u1).forEach(k => { const dn = num(u1[k]) - num(b.uses[k]); if (dn <= 0) return;
    const p = perkByKey(k); n += dn * apCost(c, AP_OVERRIDE[k] ? AP_OVERRIDE[k](c) : p ? apOf(p) : 0, "perk"); });
  const w1 = x.ward && x.ward.ledger && x.ward.ledger[0];
  if (w1 && w1.id !== b.ward) { const m = /^(\d+) AP$/.exec(w1.how || ""); if (m) n += apCost(c, +m[1], "action"); }
  if (x.demon) {
    const st = R.demonState(c), o1 = x.demon.out || [];
    if (x.demon.army && !b.army) n += apCost(c, 5, "perk");   // Solomon Unchained
    n += o1.filter(id => !b.out.includes(id)).length * apCost(c, st.summonAP, "action") + b.out.filter(id => !o1.includes(id)).length * apCost(c, st.dismissAP, "action");
  }
  return n;
}
const withAP = (c, update) => fn => update(x => {
  const b = { uses: Object.assign({}, x.uses), ward: x.ward && x.ward.ledger && x.ward.ledger[0] && x.ward.ledger[0].id, out: ((x.demon || {}).out || []).slice(), army: !!(x.demon || {}).army };
  fn(x);
  const n = apSpent(c, b, x);
  if (n) { x.combat = Object.assign({}, x.combat); x.combat.ap = R.clamp(num(x.combat.ap) - n, 0, 12); if (!x.combat.turn) x.combat.reacted = true; addLog(x, `Combat: −${n} AP`); }
});
// AP for a new turn: 5, less 2 in Leaf in the Wind's stance (Parry 10), none while over the Toxicity threshold.
const turnAP = (c, d) => (d.overToxic ? 0 : Math.max(0, 5 - (isRunning(c, "p:Parry:10") ? 2 : 0)));
// Alacrity 8 and 9 each carry 1 unspent AP into the next turn, in Medium armor or lighter.
const carryMax = c => { const a = R.wornArmor(c); if (a && (a.type === "heavy" || a.type === "plate")) return 0; return num(c.skills.Alacrity) >= 9 ? 2 : num(c.skills.Alacrity) >= 8 ? 1 : 0; };
const braceAP = c => apCost(c, isRunning(c, "p:Durability:8") ? 0 : 1, "action");

// A short line for an ability: its first sentence (cut at a word if that's long), with "More" for the rest.
function brief(t) {
  t = String(t || "").trim(); const first = (t.match(/^.*?[.!?](\s|$)/) || [t])[0].trim();
  if (first.length <= 130) return [first, first.length < t.length];
  return [first.slice(0, 120).replace(/\s+\S*$/, "") + "…", true];
}
function Brief({ text }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const [short, more] = brief(text);
  return html`<p class="cbbrief">${open ? text : short}${more && html` <button type="button" class="linkbtn" aria-expanded=${open} onClick=${() => setOpen(!open)}>${open ? "Less" : "More"}</button>`}</p>`;
}

/* ---------- the battle view ---------- */
// Crafting and the schools of magic stay out of the Abilities list (magic has its own section).
const CB_SKIP = () => [...CRAFTS.map(x => x[2]), ...MAGIC.map(x => x[2])];
const CB_GROUPS = [
  ["crit", "Critical strikes", ["Maim", "Bash", "Cleave", "Pierce", "Precision"]],
  ["def", "Defence", ["Evasion", "Parry", "Shield Mastery", "Tumble", "Armor Mastery", "Durability"]],
];
// AP a perk gives back when used (the book: Minute Movement and Riposte each grant 2 AP).
const CB_GAIN = { "Alacrity:5": 2, "Parry:5": 2 };
const CARD_KINDS = [["condition", "Condition"], ["feature", "Feature"], ["ability", "Ability"], ["counter", "Counter"], ["perk", "Pinned perk"]];
const CARD_USES = k => k === "feature" || k === "ability";   // conditions and counters have no uses

// Use a perk (from Abilities or a pinned perk card): spend its AP, tick a use, take its Stamina, start its countdown.
function usePerk(c, update, s, p) {
  update(x => {
    const cost = apCost(c, apOf(p), "perk"), gain = CB_GAIN[`${s.name}:${p.l}`] || 0;
    x.combat = Object.assign({}, x.combat); x.combat.ap = R.clamp(num(x.combat.ap) - cost + gain, 0, 12);
    if (!x.combat.turn) x.combat.reacted = true;
    const uses = p.u && num(p.u.uses); if (uses) { x.uses = x.uses || {}; x.uses[p.key] = Math.min(uses, num(x.uses[p.key]) + 1); }
    let st = p.u && /^\d+$/.test(String(p.u.stamina || "")) ? +p.u.stamina : 0;
    if (st && p.t === "E" && num(x.skills.Versatility) >= 7) st -= 1;   // Versatility 7: Empowerments cost 1 Stamina less
    if (st) R.setStamina(x, num(x.vitals.exhaustion) + st);
    const turns = p.u && num(p.u.turns); if (turns) x.combat.running = [...(x.combat.running || []).filter(r => r.key !== p.key), { id: rid(), key: p.key, n: p.group || s.name, turns }];
    addLog(x, `Used ${p.group || s.name} (${s.name} ${p.l})${cost ? `, ${cost} AP` : ""}${gain ? `, +${gain} AP` : ""}`);
  });
}

function CombatView({ c, update, fight }) {
  animScope = c.id;
  const d = derive(c), cb = c.combat || {};
  const [pop, setPop] = useState(null);   // "ward" | "harm" | "tts" | "damage" | null
  const [panel, setPanel] = useState(null);
  openRuleFn = name => setPanel(p => (p === name ? null : name));
  useEffect(() => setPanel(null), [c.id]);
  useEffect(() => () => ApHint.set(0), []);
  // Wounds bleed at the start of each round. The player's own app does it (the GM's only for characters nobody plays),
  // once per round; a round missed while the sheet was closed bleeds when it opens.
  useEffect(() => {
    const r = num(fight.round), last = num(cb.bledRound);
    if (!fight.on || !r || last >= r) return;
    if (Store.table && isGM() && playersOf(c).length) return;
    const per = d.bleedPerTurn, times = last ? r - last : 1, lost = Math.min(d.cur.bp, per * times);
    update(x => { x.combat = Object.assign({}, x.combat, { bledRound: r }); if (lost) { x.vitals.bp = Math.max(0, d.cur.bp - lost); addLog(x, `Bled ${lost} at the start of round ${r}`); } });
    if (lost) toast(`Round ${r}: your wounds bleed ${lost} Blood.`);
  }, [fight.on, fight.round, c.id]);
  return html`<div class="combatview" ...${apScan}>
    <section class="cbhead">
      <${Thumb} c=${c} lg />
      <div class="cbwho"><b class="cbname">${c.name || "Unnamed"}</b><span class="muted">${[c.profession, c.player].filter(Boolean).join(" · ")}</span></div>
      <button type="button" class="btn small" onClick=${() => setPop("tts")}>Tabletop code</button>
    </section>
    <${ApDock} c=${c} d=${d} update=${update} fight=${fight} onDamage=${() => setPop("damage")} />
    <div class="cbgrid">
      <${CbVitals} c=${c} d=${d} update=${update} />
      <${CbGear} c=${c} update=${update} />
      <${CbActives} c=${c} update=${update} />
      <${CbTable} c=${c} update=${update} />
      <${CbMagic} c=${c} update=${update} open=${setPop} />
    </div>
    ${panel && html`<${RulePanel} topic=${panel} onClose=${() => setPanel(null)} />`}
    ${pop === "damage" ? html`<${DamageFlow} c=${c} d=${d} update=${update} fight=${fight} onClose=${() => setPop(null)} />`
      : pop && html`<${CbPop} c=${c} update=${update} what=${pop} onClose=${() => setPop(null)} />`}
  </div>`;
}

// The AP dock: the centre of the battle view. Big AP tokens (a dashed ring for AP carried over), the count, the turn
// button, Brace and Take damage. Hovering anything with a cost lights the tokens it would spend.
// (Ledger theme only for now: each theme is to get its own AP dock when combat mode goes to a release.)
function ApDock({ c, d, update, fight, onDamage, mini }) {
  const hint = useApHint(), cb = c.combat || {}, ap = num(cb.ap), cm = carryMax(c);
  const total = Math.max(5 + num(cb.carry), ap, 5);
  const short = hint > ap;
  const set = fn => update(x => { x.combat = Object.assign({}, x.combat); fn(x.combat, x); });
  const spend = n => set(k => { k.ap = R.clamp(num(k.ap) - n, 0, 12); if (!k.turn && n > 0) k.reacted = true; });
  // Start gives this turn's AP plus what Alacrity 8–9 carried over; End keeps what's left for reactions and counts down
  // everything that lasts a number of turns (abilities, cards, a dreamsphere).
  const startTurn = () => set((k, x) => {
    const carry = k.ended ? Math.min(cm, num(k.ap)) : 0, base = turnAP(x, derive(x));
    Object.assign(k, { turn: true, ap: base + carry, carry, reacted: false, braced: false, round: num(fight.round) });
    addLog(x, `Turn started: ${base + carry} AP${carry ? ` (${carry} carried over)` : ""}`);
  });
  const endTurn = () => set((k, x) => {
    k.turn = false; k.ended = true;
    k.running = (k.running || []).map(r => Object.assign({}, r, { turns: num(r.turns) - 1 })).filter(r => r.turns > 0);
    x.cards = (x.cards || []).map(t => (num(t.left) > 0 ? Object.assign({}, t, { left: num(t.left) - 1 }) : t));
    if (x.dream && x.dream.sphere && num(x.dream.sphere.turns) > 0) x.dream.sphere = Object.assign({}, x.dream.sphere, { turns: num(x.dream.sphere.turns) - 1 });
    addLog(x, `Turn ended with ${num(k.ap)} AP left`);
  });
  const canBrace = num(c.skills.Durability) >= 3 && (cb.turn || num(c.skills.Durability) >= 5) && !cb.braced;
  const bAP = braceAP(c);
  const tokens = Array.from({ length: total }, (_, i) => {
    const on = i < ap, will = on && hint && i >= ap - Math.min(hint, ap);
    return html`<button type="button" class=${"aptok" + (on ? " on" : "") + (i >= 5 ? " extra" : "") + (will ? " will" : "")} data-ap="0"
      aria-label=${on ? "Spend an AP" : "Get an AP back"} onClick=${() => spend(on ? 1 : -1)} onContextMenu=${e => { e.preventDefault(); spend(-1); }}><i></i></button>`;
  });
  if (mini) return html`<div class=${"apmini" + (short ? " short" : "")} aria-label=${`${ap} AP left`}><span>AP</span><b>${ap}</b><span class="aptoks">${tokens}</span></div>`;
  return html`<section class=${"apdock" + (cb.turn ? " turn" : "") + (short ? " short" : "")} aria-label="Action points">
    <div class="apcount"><b class="apnum">${ap}</b><span class="aplbl">AP</span></div>
    <div class="apmid">
      <div class="aptoks" role="group" aria-label=${`${ap} AP left: click spends one, right-click gives one back`}>${tokens}</div>
      <p class="apstate">${hint ? (short ? html`<b>Needs ${hint} AP</b> · you have ${ap}` : html`<b>−${hint} AP</b> · ${ap - hint} left after`)
        : cb.turn ? html`<b>Your turn</b> · what's left at the end stays ready for reactions` : html`<b>Between turns</b> · ${ap ? `${ap} AP held for reactions` : "no AP left for reactions"}`}
        ${!hint && cm ? ` · Alacrity carries up to ${cm}` : ""}${!hint && d.overToxic ? " · over the Toxicity threshold: no AP" : ""}</p>
    </div>
    <div class="apacts">
      ${cb.turn ? html`<button class="btn primary" data-ap="0" onClick=${endTurn}>End turn</button>` : html`<button class="btn primary" data-ap="0" onClick=${startTurn}>Start my turn</button>`}
      ${num(c.skills.Durability) >= 3 && (cb.braced ? html`<span class="flag good" title="Until your next turn">Braced</span>`
        : html`<button class="btn" data-ap=${bAP} disabled=${!canBrace || bAP > ap} title=${!cb.turn && num(c.skills.Durability) < 5 ? "On your turn (as a reaction from Durability 5)" : "Until your next turn"}
            onClick=${() => set((k, x) => { k.ap = num(k.ap) - bAP; k.braced = true; if (!k.turn) k.reacted = true; addLog(x, `Braced (${bAP} AP)`); })}>Brace · ${bAP} AP</button>`)}
      <button class="btn danger" data-ap="0" onClick=${onDamage}>Take damage</button>
    </div>
  </section>`;
}

// HP and Blood up top; wounds as small buttons; Toxicity, Deprivation and Stamina as a slim row. Death saves at 0 HP.
function CbVitals({ c, d, update }) {
  const v = c.vitals, setV = (k, val, lo, hi) => update(x => { x.vitals[k] = R.clamp(Math.round(val), lo, hi); });
  const saves = (c.combat && c.combat.saves) || { ok: 0, fail: 0 };
  const setSave = (k, n) => update(x => { x.combat = Object.assign({}, x.combat); x.combat.saves = Object.assign({ ok: 0, fail: 0 }, x.combat.saves, { [k]: R.clamp(n, 0, 5) }); });
  // The book: d100, 50 or lower succeeds; a failure costs 2 Stamina (Exhaustion); over 95 is two failures; under 5 stabilises.
  const rollSave = () => askRoll({ title: "Death save", dice: [{ n: 1, sides: 100 }], note: "50 or lower succeeds. Over 95: two failures. Under 5: stable.", cancel: true }).then(r => {
    if (!r) return; const t = r.reduce((a, b) => a + b, 0), ok = t <= 50, fails = t > 95 ? 2 : ok ? 0 : 1;
    update(x => {
      x.combat = Object.assign({}, x.combat); const s = Object.assign({ ok: 0, fail: 0 }, x.combat.saves);
      if (t < 5) s.ok = 5; else if (ok) s.ok = Math.min(5, s.ok + 1); else { s.fail = Math.min(5, s.fail + fails); R.setStamina(x, num(x.vitals.exhaustion) + 2 * fails); }
      x.combat.saves = s; addLog(x, `Death save: ${t}, ${t < 5 ? "stable" : ok ? "success" : fails === 2 ? "two failures" : "failure"}`);
    });
    toast(`Death save: ${t}. ${t < 5 ? "Stable." : ok ? "Success." : fails === 2 ? "Two failures, and 4 Stamina." : "Failure, and 2 Stamina."}`);
  });
  const slim = (label, val, maxv, color, set, tipTxt) => html`<button type="button" class="cbslim" style=${`--c:${color}`}
    onMouseEnter=${e => tip.show(e.currentTarget, { title: `${label} ${val} / ${maxv}`, lines: [tipTxt] })} onMouseLeave=${() => tip.hide()}
    onClick=${() => set(1)} onContextMenu=${e => { e.preventDefault(); set(-1); }} aria-label=${`${label} ${val} of ${maxv}: left-click adds one, right-click removes one`}>
    <span>${label}</span><b>${val}<small>/${maxv}</small></b><i style=${`width:${maxv ? R.clamp((val / maxv) * 100, 0, 100) : 0}%`}></i></button>`;
  const lr = html`<${Mouse} side="L" /> add one · <${Mouse} side="R" /> remove one`;
  const stam = num(v.exhaustion), ok = num(saves.ok), fail = num(saves.fail);
  return html`<section class="frame cbvitals"><${Head} title="Vitals" topic="hp" />
    <${Meter} id=${"cbhp-" + c.id} label="Hit points" cur=${d.cur.hp} max=${d.max.hp} color="var(--blood)" soft="var(--blood-soft)" onSet=${n => setV("hp", n, 0, d.max.hp)} />
    <${Meter} id=${"cbbp-" + c.id} label="Blood points" order=${1} cur=${d.cur.bp} max=${d.max.bp} color="var(--life)" soft="var(--life-soft)" marks=${[100, 80, 60, 40, 20].filter(m => m < d.max.bp)}
      onSet=${n => setV("bp", n, 0, d.max.bp)} note=${d.bleedPerTurn ? `Bleeding ${d.bleedPerTurn} at the start of each round.` : ""} />
    ${d.cur.hp <= 0 && html`<div class="cbsaves" role="group" aria-label="Death saves">
      <b>${ok >= 5 ? "Stable" : fail >= 5 ? "Dead" : "On Death's Door: death saves"}</b><span class="muted">Roll at the start of each turn. Five successes: stable. Five failures: death.</span>
      <div class="row"><span class="cbtally ok">Successes <button class="iconbtn" aria-label="One fewer success" onClick=${() => setSave("ok", ok - 1)}>−</button><b>${ok}<small>/5</small></b><button class="iconbtn" aria-label="One more success" onClick=${() => setSave("ok", ok + 1)}>+</button></span>
        <span class="cbtally bad">Failures <button class="iconbtn" aria-label="One fewer failure" onClick=${() => setSave("fail", fail - 1)}>−</button><b>${fail}<small>/5</small></b><button class="iconbtn" aria-label="One more failure" onClick=${() => setSave("fail", fail + 1)}>+</button></span>
        <button class="btn small primary" disabled=${ok >= 5 || fail >= 5} onClick=${rollSave}>Roll a death save</button></div></div>`}
    <div class="cbwounds">${Object.keys(R.WOUNDS).map(k => html`<button type="button" class=${"cbwound" + (num(v.wounds[k]) ? " has" : "")}
      onMouseEnter=${e => tip.show(e.currentTarget, { title: `${k[0].toUpperCase() + k.slice(1)} wounds · ${d.woundAt[k]}+ damage`, lines: [`Bleeds ${R.WOUNDS[k].bleed}.`, html`<${Mouse} side="L" /> add a wound · <${Mouse} side="R" /> treated`] })} onMouseLeave=${() => tip.hide()}
      onClick=${() => update(x => { x.vitals.wounds[k] = num(x.vitals.wounds[k]) + 1; addLog(x, `${k} wound`); })}
      onContextMenu=${e => { e.preventDefault(); if (num(v.wounds[k])) update(x => { x.vitals.wounds[k] = Math.max(0, num(x.vitals.wounds[k]) - 1); addLog(x, `Treated a ${k} wound`); }); }}
      aria-label=${`${k} wounds ${num(v.wounds[k])}: left-click adds one, right-click marks one treated`}><span>${k}</span><b>${num(v.wounds[k])}</b></button>`)}
      <button class="btn small" disabled=${!d.bleedPerTurn} title="Wounds bleed by themselves at the start of each round; this is for anything else"
        onClick=${() => update(x => { x.vitals.bp = Math.max(0, d.cur.bp - d.bleedPerTurn); addLog(x, `Bled ${d.bleedPerTurn}`); })}>Bleed now (−${d.bleedPerTurn})</button></div>
    <div class="cbslims">
      ${slim("Toxicity", d.cur.tox, d.max.tox, "var(--tox)", s => setV("tox", d.cur.tox + s, 0, d.max.tox * 3), lr)}
      ${slim("Deprivation", d.cur.dp, d.max.dp, "var(--hunger)", s => setV("dp", d.cur.dp + s, 0, d.max.dp), lr)}
      ${slim("Stamina lost", stam, 10, "var(--ink-2)", s => update(x => { const to = R.clamp(stam + s, 0, 10); R.setStamina(x, to); addLog(x, `Stamina lost ${stam} → ${to}`); }),
        html`<${Mouse} side="L" /> lose a stack · <${Mouse} side="R" /> recover one${stam ? html`<br />${R.EXHAUSTION[stam]}` : ""}`)}
    </div>
    ${d.overToxic && html`<p class="flag bad">Over the Toxicity threshold: no AP.</p>`}
  </section>`;
}

// The worn suit and the weapons at hand (not the ones in the pack or the stash).
const atHand = c => c.weapons.map((w, i) => [w, i]).filter(([w]) => w.where !== "pack" && w.where !== "stash");
function CbGear({ c, update }) {
  const a = R.wornArmor(c), chk = a ? R.armorCheck(c, a) : null, ap = num((c.combat || {}).ap);
  const weapons = atHand(c);
  const setA = (k, val) => update(x => { const y = x.armor.find(z => z.id === a.id); if (y) y[k] = val; });
  const setW = (i, k, val) => update(x => { x.weapons[i][k] = val; });
  return html`<section class="frame cbgear"><${Head} title="Armor & weapons" topic="armor" />
    ${a ? html`<div class="cbarmor">
      <div class="cbrowhead"><b>${a.name || "Armor"}</b><span class="muted">${(R.ARMOR[a.type] || R.ARMOR.light).label} · AV ${num(a.av)}</span></div>
      <div class="cbtrack"><span class="lbl">Soak</span><button class="iconbtn" aria-label="Lose 1 soak" onClick=${() => setA("soak", Math.max(0, num(a.soak) - 1))}>−</button>
        <span class="track"><i style=${`width:${chk.soakMax ? R.clamp((num(a.soak) / chk.soakMax) * 100, 0, 100) : 0}%`}></i></span>
        <b>${num(a.soak)}<small> / ${chk.soakMax}</small></b><button class="iconbtn" aria-label="Restore 1 soak" onClick=${() => setA("soak", Math.min(chk.soakMax || 999, num(a.soak) + 1))}>+</button></div>
      ${chk.soakMax > 0 && num(a.soak) <= 0 && html`<span class="flag bad">Broken</span>`}</div>`
      : html`<p class="muted">No armor worn.</p>`}
    ${weapons.map(([w, i]) => { const kind = R.weaponKind(w), wl = R.weaponLine(c, w), dur = num(w.dur), clip = num(w.clip), clipMax = num(w.clipMax), rAP = apCost(c, num(w.reload), "action");
      return html`<div class=${"cbweap kind-" + kind}>
        <div class="cbrowhead"><b>${w.name || "Unnamed weapon"}</b><span class="muted">${kind === "shield" ? "Shield" : w.skill}${wl.proficiency ? ` · ${wl.proficiency}` : ""}</span></div>
        <div class="cbstats"><span>Damage <b>${num(w.damage)}</b></span>${kind !== "shield" && html`<span>Crit <b>${wl.crit}%</b></span><span>Accuracy <b>${wl.accuracy >= 0 ? "+" : ""}${wl.accuracy}%</b></span>`}</div>
        ${kind === "ranged" && html`<div class="cbtrack"><span class="lbl">Clip</span><button class="btn small" data-ap="0" disabled=${!clip} onClick=${() => setW(i, "clip", Math.max(0, clip - 1))}>Fire</button>
          <b>${clip}<small> / ${clipMax}</small></b><button class="btn small" data-ap=${rAP} disabled=${!clipMax || clip >= clipMax || rAP > ap}
            onClick=${() => update(x => { x.weapons[i].clip = clipMax; if (rAP) { x.combat = Object.assign({}, x.combat); x.combat.ap = Math.max(0, num(x.combat.ap) - rAP); } addLog(x, `Reloaded ${w.name || "a weapon"}${rAP ? ` (${rAP} AP)` : ""}`); })}>Reload${rAP ? ` · ${rAP} AP` : ""}</button></div>`}
        <div class="cbtrack"><span class="lbl">${kind === "shield" ? "Shield" : "Durability"}</span><button class="iconbtn" aria-label="Lose 1" onClick=${() => setW(i, "dur", Math.max(0, dur - 1))}>−</button>
          <span class="track"><i style=${`width:${num(w.durMax) ? R.clamp((dur / num(w.durMax)) * 100, 0, 100) : 0}%`}></i></span>
          <b>${dur}<small> / ${num(w.durMax)}${w.durDie ? ` · ${w.durDie}` : ""}</small></b><button class="iconbtn" aria-label="Restore 1" onClick=${() => setW(i, "dur", Math.min(num(w.durMax) || 999, dur + 1))}>+</button></div>
        ${w.props && html`<${Brief} text=${w.props} />`}
      </div>`; })}
    ${!weapons.length && html`<p class="muted">No weapons at hand. Weapons in the pack or the stash stay in Gear.</p>`}
  </section>`;
}

// One ability row: name, its skill and level, the book's icons, a short line (More for the rest), and Use.
function PerkRow({ c, update, s, p, pinned, unpin }) {
  const ap = num((c.combat || {}).ap), turn = !!(c.combat || {}).turn;
  const cost = apCost(c, apOf(p), "perk"), uses = p.u && num(p.u.uses), spent = Math.min(uses || 0, num((c.uses || {})[p.key]));
  const out = uses && spent >= uses, short = cost > ap, active = ["A", "E", "M"].includes(p.t);
  return html`<div class=${"cbperk k-" + typeKey(p.t) + (pinned ? " pinned" : "")} style=${attStyle(s.attr)}>
    <div class="cbperkhead"><b>${p.group || s.name}</b><small class="muted">${s.name} ${p.l}</small><${UsageLine} u=${p.u} />
      ${unpin && html`<button class="iconbtn cbunpin" aria-label=${`Unpin ${p.group || s.name}`} onClick=${unpin}>×</button>`}</div>
    <${Brief} text=${p.x} />
    ${active && html`<div class="row"><button class="btn small primary" data-ap=${cost} disabled=${out || short}
        title=${out ? "No uses left until it recharges" : short ? `Needs ${cost} AP` : !turn && !reactOk(p) && cost ? "Usually on your turn" : ""} onClick=${() => usePerk(c, update, s, p)}>Use${cost ? ` · ${cost} AP` : ""}</button>
      ${reactOk(p) && html`<span class="flag">Reaction</span>`}
      ${uses ? html`<${UseBoxes} c=${c} ukey=${p.key} uses=${uses} recharge=${p.u.recharge} update=${update} label=${`${s.name} ${p.l}`} />` : ""}</div>`}
  </div>`;
}
// Active abilities and Empowerments that matter in a fight, grouped: critical strikes, defence, weapon skills, the rest.
function CbActives({ c, update }) {
  const skip = CB_SKIP();
  const rows = unlockedPerks(c).filter(s => !skip.includes(s.name)).flatMap(s => s.perks.filter(p => ["A", "E", "M"].includes(p.t)).map(p => ({ s, p })));
  const group = r => r.s.kind === "weapon" ? "weap" : (CB_GROUPS.find(g => g[2].includes(r.s.name)) || ["other"])[0];
  const groups = [...CB_GROUPS.map(g => [g[0], g[1]]), ["weap", "Weapon skills"], ["other", "Other abilities"]].map(([k, n]) => [k, n, rows.filter(r => group(r) === k)]).filter(g => g[2].length);
  const running = (c.combat || {}).running || [];
  return html`<section class="frame cbactives"><${Head} title="Abilities" topic="skills" />
    ${running.length > 0 && html`<div class="cbrunning">${running.map(r => html`<span class="cbrun"><b>${r.n}</b> ${r.turns} turn${r.turns === 1 ? "" : "s"} left
      <button aria-label=${`Stop ${r.n}`} onClick=${() => update(x => { x.combat = Object.assign({}, x.combat); x.combat.running = (x.combat.running || []).filter(y => y.id !== r.id); })}>×</button></span>`)}</div>`}
    ${!groups.length && html`<p class="muted">No Active abilities yet. They appear here as your skills unlock them.</p>`}
    ${groups.map(([k, n, list]) => html`<div class="cbgroup"><h4 class="cbgh">${n}</h4>
      ${list.map(({ s, p }) => html`<${PerkRow} key=${p.key + p.t} c=${c} update=${update} s=${s} p=${p} />`)}</div>`)}
  </section>`;
}

// A pinned perk is a reference to the book's perk ("p:Skill:level|type"), shown with its real uses.
const perkRef = (c, ref) => {
  for (const s of unlockedPerks(c)) for (const p of s.perks) if (p.key + "|" + p.t === ref || p.key + p.t === ref) return { s, p };
  return null;
};

// Conditions, cards of the player's own (or from the GM), and pinned perks: anything the sheet doesn't hold.
function CbTable({ c, update }) {
  const v = c.vitals, cards = c.cards || [];
  const [cond, setCond] = useState(""), [adding, setAdding] = useState(false);
  const setCard = (id, fn) => update(x => { x.cards = (x.cards || []).map(k => { if (k.id !== id) return k; const y = Object.assign({}, k); fn(y); return y; }); });
  const drop = id => update(x => { x.cards = (x.cards || []).filter(y => y.id !== id); });
  return html`<section class="frame cbtable"><${Head} title="Conditions & cards" />
    <div class="chips">${v.conditions.map((t, i) => html`<span class="cond">${t}<button aria-label=${`Remove ${t}`} onClick=${() => update(x => { x.vitals.conditions.splice(i, 1); })}>×</button></span>`)}
      ${!v.conditions.length && html`<span class="muted">No conditions.</span>`}</div>
    <form class="row cbcondform" onSubmit=${e => { e.preventDefault(); const t = cond.trim(); if (t) { update(x => { x.vitals.conditions.push(t); }); setCond(""); } }}>
      <input class="inp" list="cw-conds" placeholder="Stunned, Prone, Frightened…" aria-label="New condition" value=${cond} onInput=${e => setCond(e.target.value)} />
      <datalist id="cw-conds">${["Stunned", "Entangled", "Frightened", "Blinded", "Prone", "Poisoned", "Charmed", "Paralyzed", "Deafened", "Unconscious", "On Death's Door"].map(o => html`<option value=${o}></option>`)}</datalist>
      <button class="btn small" type="submit">Add</button></form>
    <div class="cbcards">${cards.map(k => k.kind === "perk"
      ? (r => r ? html`<${PerkRow} key=${k.id} c=${c} update=${update} s=${r.s} p=${r.p} pinned=${true} unpin=${() => drop(k.id)} />`
        : html`<div class="cbcard ck-perk over" key=${k.id}><div class="cbcardhead"><span class="flag">Pinned perk</span><b>No longer unlocked</b><button class="iconbtn" aria-label="Remove" onClick=${() => drop(k.id)}>×</button></div></div>`)(perkRef(c, k.perk))
      : html`<${CbCard} key=${k.id} c=${c} k=${k} update=${update} set=${fn => setCard(k.id, fn)} drop=${() => drop(k.id)} />`)}</div>
    ${adding ? html`<${CbCardForm} c=${c} onDone=${card => { if (card) update(x => { x.cards = [...(x.cards || []), card]; addLog(x, `Card added: ${card.name || "a pinned perk"}`); }); setAdding(false); }} />`
      : html`<button class="btn small" onClick=${() => setAdding(true)}>+ A card</button>`}
  </section>`;
}
function CbCard({ c, k, update, set, drop }) {
  const kind = (CARD_KINDS.find(x => x[0] === k.kind) || CARD_KINDS[1])[1];
  const uses = CARD_USES(k.kind) ? num(k.uses) : 0, used = Math.min(uses, num(k.used));
  const cost = apCost(c, num(k.ap), "action"), ap = num((c.combat || {}).ap);
  const use = () => update(x => {
    x.cards = (x.cards || []).map(y => (y.id === k.id ? Object.assign({}, y, { used: uses ? Math.min(uses, num(y.used) + 1) : 0 }) : y));
    if (cost) { x.combat = Object.assign({}, x.combat); x.combat.ap = Math.max(0, num(x.combat.ap) - cost); }
    addLog(x, `Used ${k.name}${cost ? ` (${cost} AP)` : ""}`);
  });
  return html`<article class=${"cbcard ck-" + (k.kind || "feature") + (k.by === "gm" ? " bygm" : "") + (num(k.turns) && num(k.left) <= 0 ? " over" : "")}>
    <div class="cbcardhead"><span class="flag">${kind}</span><b>${k.name}</b>${k.by === "gm" && html`<small class="muted">from the GM</small>`}${k.onHit && html`<small class="muted" title="Offered when you take damage">on damage</small>`}
      <button class="iconbtn" aria-label=${`Remove ${k.name}`} onClick=${drop}>×</button></div>
    ${k.text && html`<${Brief} text=${k.text} />`}
    <div class="row cbcardctl">
      ${CARD_USES(k.kind) && (uses > 0 || cost > 0) && html`<button class="btn small primary" data-ap=${cost} disabled=${(uses && used >= uses) || cost > ap} onClick=${use}>Use${cost ? ` · ${cost} AP` : ""}</button>`}
      ${uses > 0 && html`<span class="usebox"><span class="lbl">Uses</span>${Array.from({ length: uses }, (_, i) => html`<button type="button" class=${"usetick" + (i < used ? " spent" : "")} aria-pressed=${i < used}
        aria-label=${i < used ? `Give back use ${i + 1}` : `Spend use ${i + 1}`} onClick=${() => set(x => { x.used = i < used ? i : i + 1; })}></button>`)}</span>`}
      ${k.kind !== "counter" && num(k.turns) > 0 && html`<span class="cbcount"><span class="lbl">Turns left</span><button class="iconbtn" aria-label="One turn less" onClick=${() => set(x => { x.left = Math.max(0, num(x.left) - 1); })}>−</button>
        <b>${num(k.left)}</b><button class="iconbtn" aria-label="One turn more" onClick=${() => set(x => { x.left = num(x.left) + 1; })}>+</button>${num(k.left) <= 0 ? html`<small class="muted">over</small>` : ""}</span>`}
      ${k.kind === "counter" && html`<span class="cbcount"><span class="lbl">Count</span><button class="iconbtn" aria-label="One fewer" onClick=${() => set(x => { x.count = Math.max(0, num(x.count) - 1); })}>−</button>
        <b>${num(k.count)}${num(k.max) ? html`<small> / ${num(k.max)}</small>` : ""}</b><button class="iconbtn" aria-label="One more" onClick=${() => set(x => { x.count = num(k.max) ? Math.min(num(k.max), num(x.count) + 1) : num(x.count) + 1; })}>+</button></span>`}
      <label class="cbkeep muted"><input type="checkbox" checked=${k.keep} onChange=${e => set(x => { x.keep = e.target.checked; })} /> Keep after combat</label>
    </div></article>`;
}
// The form for a new card. A pinned perk only needs the perk; conditions and counters have no uses.
function CbCardForm({ c, onDone }) {
  const [f, setF] = useState({ kind: "condition", name: "", text: "", uses: "", turns: "", ap: "", count: "", max: "", perk: "", keep: false, onHit: false });
  const put = k => e => setF(Object.assign({}, f, { [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const perks = unlockedPerks(c).flatMap(s => s.perks.map(p => ({ s, p })));
  const isPerk = f.kind === "perk", ok = isPerk ? !!f.perk : !!f.name.trim();
  const n = v => Math.max(0, Math.floor(+v || 0));
  const save = e => { e.preventDefault(); if (!ok) return;
    onDone(isPerk ? { id: rid(), kind: "perk", perk: f.perk, keep: !!f.keep, by: isGM() && Store.table ? "gm" : "", at: Date.now() }
      : { id: rid(), kind: f.kind, name: f.name.trim(), text: f.text.trim(), uses: CARD_USES(f.kind) ? n(f.uses) : 0, used: 0, ap: CARD_USES(f.kind) ? n(f.ap) : 0,
          turns: f.kind === "counter" ? 0 : n(f.turns), left: f.kind === "counter" ? 0 : n(f.turns), count: f.kind === "counter" ? n(f.count) : 0, max: f.kind === "counter" ? n(f.max) : 0,
          onHit: !!f.onHit, keep: !!f.keep, by: isGM() && Store.table ? "gm" : "", at: Date.now() }); };
  return html`<form class="cbcardform" onSubmit=${save}>
    <div class="seg" role="group" aria-label="Kind of card">${CARD_KINDS.map(([k, nm]) => html`<button type="button" aria-pressed=${f.kind === k} onClick=${() => setF(Object.assign({}, f, { kind: k }))}>${nm}</button>`)}</div>
    ${isPerk ? html`<select class="inp" aria-label="Perk" value=${f.perk} onChange=${put("perk")}><option value="">Pick a perk…</option>
        ${perks.map(({ s, p }) => html`<option value=${p.key + "|" + p.t}>${s.name} ${p.l}: ${p.group || s.name} (${TYPE_SHORT[p.t] || "Passive"})</option>`)}</select>
        <p class="muted">The perk shows as the book has it, with its own uses.</p>`
      : html`<input class="inp" placeholder=${f.kind === "condition" ? "Name, e.g. Cursed by the Zhoung" : "Name"} aria-label="Card name" value=${f.name} onInput=${put("name")} />
        <textarea class="inp" rows="2" placeholder="What it does" aria-label="What it does" value=${f.text} onInput=${put("text")}></textarea>
        <div class="cbformnums">
          ${CARD_USES(f.kind) && html`<label>Uses<input class="inp" type="number" min="0" placeholder="—" value=${f.uses} onInput=${put("uses")} /></label>
            <label>AP to use<input class="inp" type="number" min="0" placeholder="—" value=${f.ap} onInput=${put("ap")} /></label>`}
          ${f.kind !== "counter" && html`<label>Lasts (turns)<input class="inp" type="number" min="0" placeholder="—" value=${f.turns} onInput=${put("turns")} /></label>`}
          ${f.kind === "counter" && html`<label>Starts at<input class="inp" type="number" min="0" placeholder="0" value=${f.count} onInput=${put("count")} /></label>
            <label>Up to<input class="inp" type="number" min="0" placeholder="—" value=${f.max} onInput=${put("max")} /></label>`}
        </div>
        ${f.kind !== "counter" && html`<label class="cbkeep"><input type="checkbox" checked=${f.onHit} onChange=${put("onHit")} /> Offer it when I take damage</label>`}`}
    <label class="cbkeep"><input type="checkbox" checked=${f.keep} onChange=${put("keep")} /> Keep it after this combat</label>
    <div class="row"><button class="btn small primary" type="submit" disabled=${!ok}>Add card</button><button class="btn small" type="button" onClick=${() => onDone(null)}>Cancel</button></div>
  </form>`;
}

/* ---------- magic in combat ---------- */
// The schools this character has (with the Magic module on): daemon cards with the summoning circle, the Toll and the
// dreamsphere in place; Warding (on Inscribe) and Harmony open their Magic tab pages in a pop-up.
function CbMagic({ c, update, open }) {
  const schools = (c.modules || {}).magic === true ? magicOpen(c) : [];
  if (!schools.length) return null;
  const has = k => schools.some(x => x[0] === k);
  const hm = has("harm") ? R.harmonyState(c) : null, wd = has("ward") ? R.wardState(c) : null;
  return html`<section class="frame cbmagic"><${Head} title="Magic" />
    ${has("dream") && html`<${CbDream} c=${c} update=${update} />`}
    ${has("demon") && html`<${CbDaemons} c=${c} update=${update} />`}
    ${(wd || hm) && html`<div class="cbschools">
      ${wd && html`<button type="button" class="btn" onClick=${() => { lsSet("cw-ward-page", "inscribe"); open("ward"); }}>Inscribe a Ward${wd.fatigue ? ` · Fatigue ${wd.fatigue}` : ""}</button>`}
      ${hm && html`<button type="button" class="btn" onClick=${() => open("harm")}>Harmony${hm.released.length ? ` · ${hm.released.length} released${hm.turnsLeft ? `, ${hm.turnsLeft} turns` : ""}` : ""}</button>`}
    </div>`}
  </section>`;
}
// Dreamwalking: the Toll (every part, each releasable) and the dreamsphere: open it (radius and AP), its turns, hold it open, close it.
function CbDream({ c, update }) {
  const st = R.dreamState(c), D = c.dream || {}, sp = D.sphere, ap = num((c.combat || {}).ap);
  const [grow, setGrow] = useState(0);
  const log = (x, what) => { x.dream.ledger = [{ id: rid(), t: Date.now(), what }, ...(x.dream.ledger || [])].slice(0, 30); addLog(x, "Dreamwalking: " + what); };
  const release = id => update(x => {
    if (String(id).startsWith("v:")) return;   // items in the vault come back from the Magic tab
    if (id === "sphere") { x.dream.sphere = null; log(x, "closed the dreamsphere"); return; }
    if (id === "mundane" || id === "travel") { x.dream.inRealm = false; x.dream.mundane = false; x.dream.travelers = 0; log(x, "woke from the dream realm"); return; }
    x.dream.tolls = (x.dream.tolls || []).filter(t => t.id !== id);
  });
  const sAP = apCost(c, st.sphereAP, "perk");
  const openSphere = () => update(x => {
    x.uses = x.uses || {}; x.uses["p:Dreamwalking:7"] = num(x.uses["p:Dreamwalking:7"]) + 1;
    x.dream.sphere = { turns: 3, grow, extra: 0 };
    x.combat = Object.assign({}, x.combat); x.combat.ap = Math.max(0, num(x.combat.ap) - sAP);
    log(x, `opened a dreamsphere of ${20 + 2 * grow} m (${sAP} AP${grow ? `, +${4 * grow}% Toll` : ""})`);
  });
  return html`<div class=${"cbtoll" + (st.toll >= 30 ? " night" : st.toll >= 10 ? " uneasy" : "")}>
    <div class="cbrowhead"><b>Dreamwalking Toll</b><span><b>${st.toll}%</b> · checks at ${st.bonus >= 0 ? "+" : ""}${st.bonus}</span></div>
    <span class="track"><i style=${`width:${R.clamp(st.toll, 0, 100)}%`}></i></span>
    ${st.parts.length ? html`<div class="cbtollparts">${st.parts.map(p => html`<span class="cbrun">${p[0]} <b>${p[1]}%</b>${!String(p[2]).startsWith("v:") && html`<button aria-label=${`Release ${p[0]}`} title="Release it" onClick=${() => release(p[2])}>×</button>`}</span>`)}</div>`
      : html`<span class="muted">Nothing sustained.</span>`}
    ${st.toll > 30 && html`<p class="flag bad">Over 30%: taking damage now calls for a Calamity roll.</p>`}
    ${st.spheres && (sp ? html`<div class="cbsphere"><b>Dreamsphere · ${20 + 2 * num(sp.grow)} m</b>
        <span class="muted">${num(sp.turns) ? `${sp.turns} turn${sp.turns === 1 ? "" : "s"} left (counts down at End turn)` : "Its time is up: hold it open with a check, or close it."}</span>
        <div class="row">${!num(sp.turns) && html`<${DreamRoll} st=${st} inline=${true} title="Hold it open" note="A successful check at the end of each round keeps it open: +5% Toll per extra turn."
            onDone=${ok => update(x => { if (ok !== false && x.dream.sphere) { x.dream.sphere.extra = num(x.dream.sphere.extra) + 1; x.dream.sphere.turns = 1; log(x, "held the dreamsphere open (+5% Toll)"); } })} />`}
          <button class="btn small" onClick=${() => release("sphere")}>Close it</button></div></div>`
      : html`<div class="cbsphere"><span class="ptstepper"><span class="lbl">Dreamsphere</span><button class="iconbtn" aria-label="Smaller" disabled=${!grow} onClick=${() => setGrow(grow - 1)}>−</button>
          <b>${20 + 2 * grow} m</b><button class="iconbtn" aria-label="Larger (+4% Toll)" onClick=${() => setGrow(grow + 1)}>+</button></span>
          ${grow > 0 && html`<span class="muted">+${4 * grow}% Toll</span>`}
          <button class="btn small primary" data-ap=${sAP} disabled=${!st.sphereLeft || sAP > ap} onClick=${() => { openSphere(); setGrow(0); }}>Open it · ${sAP} AP</button>
          <span class="muted">${st.sphereLeft} of 3 left</span></div>`)}
  </div>`;
}
// Daemonology: the contracts as cards (Utku's), summoned and dismissed for their AP, with the summoning circle shown while
// one is called or here. Partial summons and boosts go through the same AP counting as the Magic tab pages.
function CbDaemons({ c, update }) {
  const st = R.demonState(c), D = c.demon, ap = num((c.combat || {}).ap);
  const [calling, setCalling] = useState(""), [editing, setEditing] = useState("");
  const busy = useRef(false), timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const byId = id => D.daemons.find(x => x.id === id);
  const guardian = st.guardian ? D.guardian : "";
  const crowd = D.out.filter(id => id !== guardian);
  const sAP = apCost(c, st.summonAP, "action"), dAP = apCost(c, st.dismissAP, "action");
  const why = d => !st.contracts ? "From Demonology 3." : sAP > ap ? `Needs ${sAP} AP.` : D.army ? (crowd.length >= 5 ? "Five are already here." : "")
    : d.id === guardian ? "" : crowd.length ? `Dismiss ${(byId(crowd[0]) || {}).n || "the other daemon"} first: one at a time.` : !st.left ? "No summons left today." : "";
  const summon = d => {
    if (busy.current || why(d)) return;
    const done = () => {
      update(x => {
        x.demon.out.push(d.id); if (!x.demon.army) x.demon.today = num(x.demon.today) + 1;
        x.combat = Object.assign({}, x.combat); x.combat.ap = Math.max(0, num(x.combat.ap) - sAP);
        x.demon.ledger = [{ id: rid(), t: Date.now(), what: `Summoned ${d.n || "a daemon"} (${sAP} AP)` }, ...x.demon.ledger].slice(0, 30);
        addLog(x, `Demonology: summoned ${d.n || "a daemon"} (${sAP} AP)`);
      });
      busy.current = false; setCalling("");
    };
    busy.current = true;
    if (reduceMotion() || document.documentElement.dataset.anim === "off") { done(); return; }
    setCalling(d.id); timer.current = setTimeout(done, DEMON_CALL_MS);
  };
  const dismiss = d => update(x => {
    x.demon.out = x.demon.out.filter(id => id !== d.id); if (!x.demon.out.length) x.demon.army = false;
    x.combat = Object.assign({}, x.combat); x.combat.ap = Math.max(0, num(x.combat.ap) - dAP);
    x.demon.ledger = [{ id: rid(), t: Date.now(), what: `Dismissed ${d.n || "a daemon"} (${dAP} AP)` }, ...x.demon.ledger].slice(0, 30);
    addLog(x, `Demonology: dismissed ${d.n || "a daemon"} (${dAP} AP)`);
  });
  const here = D.out.map(byId).filter(Boolean), call = calling ? byId(calling) : null, shown = call || here[here.length - 1] || null;
  const apUpdate = withAP(c, update);
  if (!D.daemons.length) return html`<p class="muted">No daemons in your grimoire yet. Write their contracts in Magic → Daemonology.</p>`;
  return html`<div class="cbdaemons">
    <div class="cbrowhead"><b>Daemons</b><span class="muted">${st.left} of ${st.perDay} summons left today · ${here.length} here</span></div>
    ${(call || here.length > 0) && html`<div class=${"demoncircf cbcircle" + (call ? " calling" : " present")}><${DemonCircle} shown=${shown} call=${call} here=${here} guardian=${guardian} /></div>`}
    <div class="demoncards cbdemoncards">${D.daemons.map(d => editing === d.id
      ? html`<${DaemonForm} key=${d.id} init=${d} onCancel=${() => setEditing("")} onSave=${v => { update(x => { const i = x.demon.daemons.findIndex(y => y.id === d.id); if (i >= 0) x.demon.daemons[i] = Object.assign({}, x.demon.daemons[i], v); }); setEditing(""); }} />`
      : html`<${DaemonCard} key=${d.id} c=${c} d=${d} st=${Object.assign({}, st, { summonAP: sAP, dismissAP: dAP })} update=${apUpdate} out=${D.out.includes(d.id)} guardian=${guardian} calling=${calling}
          why=${why(d)} onSummon=${() => summon(d)} onDismiss=${() => dismiss(d)} onEdit=${() => setEditing(d.id)} />`)}</div>
  </div>`;
}

// A pop-up over the battle view: Warding or Harmony (their Magic tab pages, spending AP as they're used), or the Tabletop code.
function CbPop({ c, update, what, onClose }) {
  const ref = useRef();
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); ref.current && ref.current.focus(); return () => window.removeEventListener("keydown", k); }, []);
  const title = what === "tts" ? "Tabletop Simulator" : what === "ward" ? "Warding" : "Occult: Harmony";
  const apUpdate = withAP(c, update);
  const body = what === "tts" ? html`<p class="sub">Send your numbers to the Tabletop sheet, or bring the changes made there back here.</p><${TabletopPanel} c=${c} update=${update} />`
    : what === "ward" ? html`<${Warding} c=${c} update=${apUpdate} />` : html`<${Harmony} c=${c} update=${apUpdate} />`;
  return html`<div class="cbveil" onClick=${e => { if (e.target === e.currentTarget) onClose(); }}>
    <div class=${"cbpop cbpop-" + what} role="dialog" aria-modal="true" aria-label=${title} tabindex="-1" ref=${ref} ...${apScan}>
      <header class="cbpophead"><h2>${title}</h2>${what !== "tts" && html`<${ApDock} c=${c} update=${update} fight=${Fight.state} mini=${true} />`}<button class="iconbtn" aria-label="Close" onClick=${onClose}>×</button></header>
      <div class="cbpopbody">${body}</div>
    </div></div>`;
}

/* ---------- taking damage ---------- */
// A pop-up that walks through a hit: how much and what kind, how you defend (block, parry, evade or brace, 1 AP, with the
// Actives that succeed without rolling), what your armor takes, and the cards that work when you're hit. The damage is
// worked out as you go; Take the damage applies it all at once (HP, armor's Soak, the shield, a wound, AP, uses).
function DamageFlow({ c, d, update, fight, onClose }) {
  const cb = c.combat || {}, ap = num(cb.ap), sk = n => num(c.skills[n]), mod = n => R.skillModifier(c, n);
  const ref = useRef();
  const [step, setStep] = useState(0);
  const [dmg, setDmg] = useState(""), [kind, setKind] = useState("melee"), [atk, setAtk] = useState(""), [crit, setCrit] = useState(false);
  const [def, setDef] = useState("none"), [res, setRes] = useState(null);   // res: { raw, total, ok, crit, auto }
  const [mit, setMit] = useState(String(num(cb.braceMit) || "")), [extra, setExtra] = useState(""), [used, setUsed] = useState([]), [wound, setWound] = useState(null);
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); ref.current && ref.current.focus(); return () => window.removeEventListener("keydown", k); }, []);

  const enc = R.encumbrance(c).effective.defend;   // null: over-encumbered, can't defend
  const melee = atHand(c).find(([w]) => R.weaponKind(w) === "melee"), shield = atHand(c).find(([w]) => R.weaponKind(w) === "shield");
  const usesLeft = key => { const p = perkByKey(key); return p && p.u ? Math.max(0, num(p.u.uses) - num((c.uses || {})[key])) : 0; };
  const defAgain = num(cb.defRound) && num(cb.defRound) === num(fight.round);
  // Each way to defend: whether it's open to you now, what it costs (Defend is 1 AP; Parry 8 and Shield Mastery 9 make it free), the bonus, and the Active that skips the roll.
  const OPTS = [
    ["block", "Block", sk("Shield Mastery") >= 3 && !!shield, !shield ? "Needs a shield at hand." : "Shield Mastery 3.", sk("Shield Mastery") >= 9 ? 0 : 1, "Shield Mastery", "p:Shield Mastery:4",
      "Your shield takes the hit, up to its durability."],
    ["parry", "Parry", sk("Parry") >= 3 && !!melee && kind !== "area" && (kind === "melee" || sk("Parry") >= 7), !melee ? "Needs a melee weapon at hand." : kind === "area" ? "Area attacks can't be parried." : kind === "ranged" ? "Projectiles from Parry 7." : "Parry 3.",
      sk("Parry") >= 8 ? 0 : 1, "Parry", "p:Parry:4", "Halves the damage."],
    ["evade", "Evade", sk("Evasion") >= 3 && (kind === "melee" || sk("Evasion") >= 7), kind !== "melee" ? "Projectiles and areas from Evasion 7." : "Evasion 3.", 1, "Evasion", "p:Evasion:4",
      `Halves the damage; a critical evade (${5 + sk("Evasion")}% or lower on the die) takes none.`],
    ["brace", "Brace", sk("Durability") >= 5 && !cb.braced, cb.braced ? "Already braced." : "As a reaction from Durability 5.", isRunning(c, "p:Durability:8") ? 0 : 1, "", "", "Takes off your Brace mitigation."],
  ].map(([k, n, open, why, base, skill, auto, what]) => ({ k, n, open: open && enc !== null, why: enc === null ? "Over-encumbered: you can't defend." : why, cost: apCost(c, base, "action"),
    bonus: skill ? mod(skill) + (enc || 0) : 0, skill, auto, autoLeft: auto ? usesLeft(auto) : 0, autoAP: auto ? apCost(c, apOf(perkByKey(auto) || {}), "perk") : 0, what }));
  const opt = OPTS.find(o => o.k === def);
  const braced = !!cb.braced || def === "brace";

  // The sum, step by step.
  const lines = [], N = Math.max(0, Math.floor(+dmg || 0));
  let x = N; lines.push([`Incoming (${kind})`, N]);
  const a = R.wornArmor(c), av = a ? num(a.av) : 0, soak = a ? num(a.soak) : 0;
  let shieldTakes = 0, soakTakes = 0;
  const held = opt && opt.k !== "brace" && def !== "none" && res && (res.ok || res.auto);
  if (held && def === "parry") { x = Math.floor(x / 2); lines.push(["Parried: halved", x]); }
  if (held && def === "evade") { x = res.crit ? 0 : Math.floor(x / 2); lines.push([res.crit ? "Critical evade: none" : "Evaded: halved", x]); }
  if (held && def === "block") { const sw = shield[0]; shieldTakes = Math.min(x, num(sw.dur)); x -= shieldTakes; lines.push([`Blocked: ${sw.name || "the shield"} takes ${shieldTakes}`, x]); }
  if (braced) {
    if (isRunning(c, "p:Durability:8")) { x = Math.floor(x / 2); lines.push(["Braced (Iron-Man): halved", x]); }
    const m = Math.max(0, Math.floor(+mit || 0)) * (sk("Durability") >= 9 ? 2 : 1);
    if (m) { x = Math.max(0, x - m); lines.push([`Braced: −${m}`, x]); }
  }
  const usedCards = used.map(id => (c.cards || []).find(k => k.id === id)).filter(Boolean);
  const ext = Math.max(0, Math.floor(+extra || 0));
  if (ext) { x = Math.max(0, x - ext); lines.push([`Your cards and abilities: −${ext}`, x]); }
  if (a && soak > 0 && x > 0) { soakTakes = Math.min(x, av, soak); x -= soakTakes; lines.push([`${a.name || "Armor"} (AV ${av}) takes ${soakTakes}`, x]); }
  const hp = d.cur.hp, after = Math.max(0, hp - x), over = x - hp;
  const woundAt = k => d.woundAt[k] + (braced && sk("Durability") >= 4 ? 2 : 0);
  const autoWound = ["mortal", "moderate", "light"].find(k => x >= woundAt(k)) || "";
  const wnd = wound == null ? autoWound : wound;
  const deathFails = hp <= 0 && x > 0 ? (crit ? 2 : 1) : 0;
  const defCost = opt && def !== "none" ? opt.cost : 0, autoCost = res && res.auto ? opt.autoAP : 0;
  const cardCost = usedCards.reduce((s, k) => s + apCost(c, num(k.ap), "action"), 0);
  const apNeed = defCost + autoCost + cardCost;
  const dream = (c.modules || {}).magic === true && magicOpen(c).some(m => m[0] === "dream") ? R.dreamState(c) : null;

  const rollDef = () => askRoll({ title: `${opt.n}: defend roll`, dice: [{ n: 1, sides: 100 }], cancel: true,
    note: `d100 − ${opt.bonus}${atk !== "" ? `; under the attacker's ${atk} holds` : ""}.` }).then(r => {
    if (!r) return; const raw = r[0], total = raw - opt.bonus;
    setRes({ raw, total, ok: atk !== "" ? total < num(atk) : null, crit: def === "evade" && raw <= 5 + sk("Evasion") });
  });
  const cards = (c.cards || []).filter(k => k.onHit && k.kind !== "perk" && k.kind !== "counter");
  const apply = () => {
    update(y => {
      y.vitals.hp = after;
      const k = y.combat = Object.assign({}, y.combat);
      k.ap = Math.max(0, num(k.ap) - apNeed); if (!k.turn && apNeed) k.reacted = true;
      if (def !== "none") k.defRound = num(fight.round) || 1;
      if (def === "brace") k.braced = true;
      if (+mit !== num(k.braceMit)) k.braceMit = Math.max(0, Math.floor(+mit || 0));
      if (res && res.auto) { y.uses = y.uses || {}; y.uses[opt.auto] = num(y.uses[opt.auto]) + 1; }
      if (shieldTakes) { const w = y.weapons[shield[1]]; w.dur = Math.max(0, num(w.dur) - shieldTakes); }
      if (soakTakes) { const ar = y.armor.find(z => z.id === a.id); if (ar) ar.soak = Math.max(0, num(ar.soak) - soakTakes); }
      if (wnd) y.vitals.wounds[wnd] = num(y.vitals.wounds[wnd]) + 1;
      if (deathFails) { k.saves = Object.assign({ ok: 0, fail: 0 }, k.saves); k.saves.fail = Math.min(5, num(k.saves.fail) + deathFails); }
      if (usedCards.length) y.cards = (y.cards || []).map(t => (used.includes(t.id) && CARD_USES(t.kind) && num(t.uses) ? Object.assign({}, t, { used: Math.min(num(t.uses), num(t.used) + 1) }) : t));
      addLog(y, `Took ${x} damage (${N} incoming${def !== "none" ? `, ${opt.n.toLowerCase()} ${held || def === "brace" ? "held" : "failed"}` : ""}${soakTakes ? `, armor took ${soakTakes}` : ""}${shieldTakes ? `, shield took ${shieldTakes}` : ""})${wnd ? `: a ${wnd} wound` : ""}`);
    });
    toast(x ? `You take ${x} damage${wnd ? ` and a ${wnd} wound` : ""}.` : "No damage gets through.");
    onClose();
  };
  const STEPS = ["Incoming", "Defend", "Armor", "Cards & result"];
  const canNext = step === 0 ? N > 0 : step === 1 ? (def === "none" || def === "brace" || !!res) && apNeed - cardCost <= ap : true;
  return html`<div class="cbveil" onClick=${e => { if (e.target === e.currentTarget) onClose(); }}>
    <div class="cbpop cbpop-damage" role="dialog" aria-modal="true" aria-label="Take damage" tabindex="-1" ref=${ref} ...${apScan}>
      <header class="cbpophead"><h2>Take damage</h2><${ApDock} c=${c} update=${update} fight=${fight} mini=${true} /><button class="iconbtn" aria-label="Close" onClick=${onClose}>×</button></header>
      <ol class="dmgsteps">${STEPS.map((s, i) => html`<li class=${i === step ? "on" : i < step ? "done" : ""}><button type="button" disabled=${i > step} onClick=${() => setStep(i)}>${i + 1}. ${s}</button></li>`)}</ol>
      <div class="cbpopbody dmgbody">
        ${step === 0 && html`<div class="dmgstep">
          <label class="dmgbig"><span class="lbl">Damage</span><input class="inp" type="number" min="0" inputmode="numeric" autofocus value=${dmg} onInput=${e => setDmg(e.target.value)} placeholder="0" /></label>
          <div class="seg seg3" role="group" aria-label="Kind of attack">${[["melee", "Melee"], ["ranged", "Projectile"], ["area", "Area"]].map(([k, n]) => html`<button type="button" aria-pressed=${kind === k} onClick=${() => { setKind(k); setRes(null); }}>${n}</button>`)}</div>
          <label class="dmgfield"><span class="lbl">Attacker's roll</span><input class="inp" type="number" value=${atk} placeholder="If you know it" onInput=${e => { setAtk(e.target.value); setRes(null); }} /></label>
          ${hp <= 0 && html`<label class="cbkeep"><input type="checkbox" checked=${crit} onChange=${e => setCrit(e.target.checked)} /> It's a critical hit (two death-save failures)</label>`}
        </div>`}
        ${step === 1 && html`<div class="dmgstep">
          ${defAgain && html`<p class="muted">You've already defended this round. The book allows one Defend a round unless a perk says otherwise.</p>`}
          <div class="dmgopts" role="radiogroup" aria-label="How you defend">
            ${OPTS.map(o => html`<button type="button" role="radio" aria-checked=${def === o.k} class=${"dmgopt" + (def === o.k ? " on" : "")} data-ap=${o.cost} disabled=${!o.open || o.cost > ap}
                onClick=${() => { setDef(o.k); setRes(null); }}><b>${o.n}</b><small>${o.open ? `${o.cost} AP${o.skill ? ` · bonus ${o.bonus}%` : ""}` : o.why}</small><span>${o.what}</span></button>`)}
            <button type="button" role="radio" aria-checked=${def === "none"} class=${"dmgopt" + (def === "none" ? " on" : "")} data-ap="0" onClick=${() => { setDef("none"); setRes(null); }}><b>Take it</b><small>0 AP</small><span>No defence.</span></button>
          </div>
          ${opt && def !== "brace" && def !== "none" && html`<div class="dmgroll">
            ${!res ? html`<div class="row"><button class="btn primary" data-ap=${opt.cost} onClick=${rollDef}>Roll to ${opt.n.toLowerCase()} (d100 − ${opt.bonus})</button>
                ${opt.autoLeft > 0 && html`<button class="btn" data-ap=${opt.cost + opt.autoAP} onClick=${() => setRes({ auto: true, ok: true })}>Succeed without rolling · ${perkByKey(opt.auto).group || opt.n} (${opt.autoLeft} left)</button>`}</div>`
              : res.auto ? html`<p class="dmgok">It holds: ${perkByKey(opt.auto).group || "the Active"} succeeds without a roll.</p>`
              : html`<p>Rolled ${res.raw} − ${opt.bonus} = <b>${res.total}</b>${atk !== "" ? html` against the attacker's ${atk}: ${res.ok ? html`<b class="dmgok">it holds</b>` : html`<b class="dmgbad">it fails</b>`}` : ""}${res.crit ? html` · <b class="dmgok">critical evade</b>` : ""}</p>
                ${res.ok == null && !res.crit && html`<div class="row"><button class="btn small primary" onClick=${() => setRes(Object.assign({}, res, { ok: true }))}>It held</button><button class="btn small" onClick=${() => setRes(Object.assign({}, res, { ok: false }))}>It didn't</button></div>`}
                <button type="button" class="linkbtn" onClick=${() => setRes(null)}>Roll again</button>`}</div>`}
          ${(def === "brace" || cb.braced) && html`<label class="dmgfield"><span class="lbl">Brace takes off</span><input class="inp" type="number" min="0" value=${mit} onInput=${e => setMit(e.target.value)} placeholder="Your GM's number" />
            <small class="muted">${cb.braced ? "You're braced from your turn. " : ""}The book's Brace action isn't written yet: set what your GM rules${sk("Durability") >= 9 ? " (Durability 9 doubles it)" : ""}.</small></label>`}
        </div>`}
        ${step === 2 && html`<div class="dmgstep">
          ${a ? html`<p><b>${a.name || "Your armor"}</b>: AV ${av}, Soak ${soak}${soak <= 0 ? html` · <b class="dmgbad">broken, it stops nothing</b>` : ` · takes ${soakTakes}, Soak left ${soak - soakTakes}`}.</p>` : html`<p class="muted">No armor worn.</p>`}
          ${shieldTakes > 0 && html`<p><b>${shield[0].name || "Your shield"}</b> takes ${shieldTakes}: durability ${num(shield[0].dur)} → ${num(shield[0].dur) - shieldTakes}.</p>`}
          <p class="muted">Armor takes the damage first, up to its Armor Value, from its Soak Pool; the rest goes to your Hit Points.</p>
        </div>`}
        ${step === 3 && html`<div class="dmgstep">
          ${cards.length > 0 ? html`<div class="dmgcards"><span class="lbl">Cards that work when you're hit</span>${cards.map(k => { const on = used.includes(k.id), kc = apCost(c, num(k.ap), "action"), left = CARD_USES(k.kind) && num(k.uses) ? num(k.uses) - num(k.used) : null;
              return html`<label class=${"dmgcard" + (on ? " on" : "")}><input type="checkbox" checked=${on} disabled=${!on && left === 0} onChange=${() => setUsed(on ? used.filter(i => i !== k.id) : [...used, k.id])} />
                <span><b>${k.name}</b>${kc ? ` · ${kc} AP` : ""}${left != null ? ` · ${left} left` : ""}<${Brief} text=${k.text} /></span></label>`; })}</div>`
            : html`<p class="muted">No cards marked "Offer it when I take damage".</p>`}
          <label class="dmgfield"><span class="lbl">They take off</span><input class="inp" type="number" min="0" value=${extra} onInput=${e => setExtra(e.target.value)} placeholder="0" /></label>
          <div class="dmgresult">
            <p class="dmgfinal">${x ? html`You lose <b>${x} HP</b> (${hp} → ${after})` : html`<b>No damage gets through.</b>`}</p>
            ${x > 0 && html`<label class="dmgfield"><span class="lbl">Wound</span><select class="inp" value=${wnd} onChange=${e => setWound(e.target.value)}>
              <option value="">None</option>${["light", "moderate", "mortal"].map(k => html`<option value=${k}>${k[0].toUpperCase() + k.slice(1)} (${woundAt(k)}+)</option>`)}</select></label>`}
            ${deathFails > 0 && html`<p class="dmgbad">Hit at 0 HP: ${deathFails} death-save failure${deathFails > 1 ? "s" : ""}.</p>`}
            ${hp > 0 && after === 0 && over >= d.max.hp && html`<p class="dmgbad"><b>Instant death:</b> ${over} damage past 0 is at least your maximum HP.</p>`}
            ${hp > 0 && after === 0 && over < d.max.hp && html`<p class="dmgbad">You drop to 0 HP: On Death's Door.</p>`}
            ${dream && dream.toll > 30 && x > 0 && html`<p class="dmgbad">Your Toll is over 30%: taking damage calls for a Calamity roll.</p>`}
            ${apNeed > 0 && html`<p class="muted">Spends ${apNeed} AP${apNeed > ap ? html` · <b class="dmgbad">you have ${ap}</b>` : ""}.</p>`}
          </div>
        </div>`}
        <div class="dmgsum" aria-live="polite">${lines.map(([t, v], i) => html`<span class=${i === lines.length - 1 ? "last" : ""}>${t} <b>${v}</b></span>`)}${hp !== undefined && html`<span class="hp">→ HP ${after}</span>`}</div>
      </div>
      <footer class="dmgfoot">
        ${step > 0 ? html`<button class="btn" onClick=${() => setStep(step - 1)}>Back</button>` : html`<button class="btn" onClick=${onClose}>Cancel</button>`}
        ${step < 3 ? html`<button class="btn primary" disabled=${!canNext} data-ap=${step === 1 ? defCost + autoCost : 0} onClick=${() => setStep(step + 1)}>Next</button>`
          : html`<button class="btn danger" data-ap=${apNeed} disabled=${apNeed > ap} onClick=${apply}>Take the damage</button>`}
      </footer>
    </div></div>`;
}
