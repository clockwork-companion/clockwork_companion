/* ================= Combat mode ================= */
// While a fight is on at the table (in Tabletop Simulator), the GM switches on combat mode for everyone: a red band
// under the top bar shows the round and who's up, and each character in the fight swaps its tabs for one battle view.
// Everything a turn needs sits on one screen: AP, HP and Blood, wounds, the worn armor, the weapons in hand, the
// Active abilities that matter in a fight, countdowns, conditions and the player's own cards, and the schools of
// magic (opened as pop-ups that use the Magic tab's own pages). A player can step back to the sheet at any time.
// The fight is one document per table, `combat/now`, written by the GM and read by everyone; this browser only in local mode.

const blankFight = () => ({ on: false, round: 0, chars: [], up: "", upId: "", next: "", t: 0 });
const Fight = {
  started: false, state: blankFight(), err: "", listeners: new Set(),
  emit() { this.listeners.forEach(f => f()); },
  live() { return Store.mode === "live"; },
  start() {
    if (this.started || Store.mode === "loading") return;
    this.started = true;
    if (!this.live()) { this.state = Object.assign(blankFight(), lsGet("cw-fight", {})); this.emit(); return; }
    Store.db.doc("combat/now").onSnapshot(s => {
      const d = s.exists ? s.data() : null;
      if (!d || num(d.t) >= num(this.state.t)) { this.state = Object.assign(blankFight(), d || {}); this.err = ""; this.emit(); }
    }, () => { this.err = "Combat mode needs the table's database rules updated. Ask the GM."; this.emit(); });
  },
  set(patch) {
    const next = clean(Object.assign({}, this.state, patch, { t: Date.now() }));
    this.state = next; this.emit();
    if (!this.live()) { lsSet("cw-fight", next); return; }
    Store.db.doc("combat/now").set(next).catch(() => toast("Couldn't save combat mode. The table's database rules may need updating; ask the GM."));
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
// What the band shows, read from the GM's initiative deck: the round, who's up and who's next. Players never see the
// deck itself, and enemies show only as "An enemy".
function fightFromDeck(e, all) {
  if (!e || !num(e.round)) return null;
  const comb = cid => (e.combatants || []).find(x => x.id === cid);
  const name = cb => !cb ? "" : cb.kind === "pc" ? ((all[cb.charId] && all[cb.charId].name) || cb.name || "A character") : cb.kind === "effect" ? "An effect" : "An enemy";
  const cur = e.current ? comb(cardOwner(e.current)) : null;
  const nextId = (e.deck || []).map(cardOwner).find(o => { const cb = comb(o); return cb && !cb.out && !(e.acted || []).includes(o); });
  return { round: num(e.round), up: name(cur), upId: cur && cur.kind === "pc" ? cur.charId : "", next: nextId ? name(comb(nextId)) : "" };
}
// A character's combat state, fresh: what the GM's Start and End combat give every character in the fight.
// Death saves stay while the character is still at 0 HP.
const freshCombat = x => {
  const keep = derive(x).cur.hp <= 0 && x.combat && x.combat.saves ? x.combat.saves : { ok: 0, fail: 0 };
  return { turn: false, ended: false, ap: 5, carry: 0, reacted: false, running: [], saves: keep };
};

const SWORDS = html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3.5l9.5 9.5 M3.5 4V3.5H4 M20 3.5L10.5 13 M20.5 4V3.5H20 M7.5 14.5l2 2 M16.5 14.5l-2 2 M5.5 16.5l2 2 M18.5 16.5l-2 2 M4.5 20.5l2-2 M19.5 20.5l-2-2" /></svg>`;

// The top bar's Start combat button: for the GM (and anyone keeping characters in this browser only).
function FightStart({ start }) {
  return html`<button type="button" class="fightbtn" onClick=${start} data-tip="Start combat for everyone at the table" aria-label="Start combat">${SWORDS}<span>Combat</span></button>`;
}

// The band under the top bar while combat is on.
function FightBand({ fight, gm, mine, away, setAway, chars, end, setChars }) {
  const [who, setWho] = useState(false), [sure, setSure] = useState(false);
  useEffect(() => { if (!sure) return; const t = setTimeout(() => setSure(false), 4000); return () => clearTimeout(t); }, [sure]);
  const deck = !!(Store.encounter && num(Store.encounter.round));
  const myTurn = mine && fight.upId === mine.id;
  const inList = id => !fight.chars.length || fight.chars.includes(id);
  const flip = id => setChars(fight.chars.length ? (fight.chars.includes(id) ? fight.chars.filter(x => x !== id) : [...fight.chars, id]) : chars.map(c => c.id).filter(x => x !== id));
  return html`<div class=${"fightband" + (myTurn ? " myturn" : "")} role="status" aria-live="polite">
    <span class="fbmark">${SWORDS}<b>Combat</b></span>
    <span class="fbround">Round <b>${num(fight.round) || 1}</b></span>
    ${fight.up && html`<span class="fbup">${myTurn ? html`<b>Your turn</b>` : html`Up: <b>${fight.up}</b>`}</span>`}
    ${fight.next && html`<span class="fbnext">Next: <b>${fight.next}</b></span>`}
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
  </div>`;
}

/* ---------- the battle view ---------- */
// Crafting and the schools of magic stay out of the Actives list (magic has its own section below).
const CB_SKIP = () => [...CRAFTS.map(x => x[2]), ...MAGIC.map(x => x[2])];
const CB_GROUPS = [
  ["crit", "Critical strikes", ["Maim", "Bash", "Cleave", "Pierce", "Precision"]],
  ["def", "Defence", ["Evasion", "Parry", "Shield Mastery", "Tumble", "Armor Mastery", "Durability"]],
];
// AP a perk gives back when used (the book: Minute Movement and Riposte each grant 2 AP).
const CB_GAIN = { "Alacrity:5": 2, "Parry:5": 2 };
const apOf = p => (p.u && p.u.ap != null ? parseInt(p.u.ap, 10) || 0 : 0);
const reactOk = p => !!(p.u && String(p.u.ap || "").includes("*"));
const carryMax = c => (num(c.skills.Alacrity) >= 9 ? 2 : num(c.skills.Alacrity) >= 8 ? 1 : 0);
const CARD_KINDS = [["condition", "Condition"], ["feature", "Feature"], ["ability", "Ability"], ["counter", "Counter"], ["perk", "Pinned perk"]];

function CombatView({ c, update }) {
  animScope = c.id;
  const d = derive(c), cb = c.combat || {};
  const [pop, setPop] = useState(null);   // a magic school, the Tabletop code, or nothing
  const [panel, setPanel] = useState(null);
  openRuleFn = name => setPanel(p => (p === name ? null : name));
  useEffect(() => setPanel(null), [c.id]);
  const max = 5 + num(cb.carry);
  const setCb = fn => update(x => { x.combat = Object.assign({}, x.combat); fn(x.combat, x); });

  // Turns: Start gives 5 AP plus what Alacrity 8–9 carried over; End keeps what's left for reactions and ticks the countdowns.
  const startTurn = () => setCb((k, x) => {
    const carry = k.ended ? Math.min(carryMax(x), num(k.ap)) : 0;
    Object.assign(k, { turn: true, ap: 5 + carry, carry, reacted: false });
    addLog(x, `Turn started: ${5 + carry} AP`);
  });
  const endTurn = () => setCb((k, x) => {
    k.turn = false; k.ended = true;
    k.running = (k.running || []).map(r => Object.assign({}, r, { turns: num(r.turns) - 1 })).filter(r => r.turns > 0);
    x.cards = (x.cards || []).map(t => (num(t.left) > 0 ? Object.assign({}, t, { left: num(t.left) - 1 }) : t));
    addLog(x, `Turn ended with ${num(k.ap)} AP left`);
  });
  const spend = n => setCb(k => { k.ap = R.clamp(num(k.ap) - n, 0, 12); if (!k.turn && n > 0) k.reacted = true; });

  const apDots = Array.from({ length: Math.max(max, num(cb.ap)) }, (_, i) => i < num(cb.ap));
  const apTip = (left) => ({ title: left ? "AP" : "AP spent", lines: [html`<${Mouse} side="L" /> spend one · <${Mouse} side="R" /> get one back`] });
  const cm = carryMax(c);
  return html`<div class="combatview">
    <section class="cbhead">
      <${Thumb} c=${c} lg />
      <div class="cbwho"><b class="cbname">${c.name || "Unnamed"}</b><span class="muted">${[c.profession, c.player].filter(Boolean).join(" · ")}</span></div>
      <button type="button" class="btn small" onClick=${() => setPop("tts")}>Tabletop code</button>
    </section>

    <section class=${"frame cbturn" + (cb.turn ? " on" : "")}>
      <${Head} title=${cb.turn ? "Your turn" : "Between turns"} topic="combat" />
      <div class="cbap">
        <span class="cbaplbl">AP <b>${num(cb.ap)}</b></span>
        <span class="cbdots" role="group" aria-label="Action points">${apDots.map((on, i) => html`<button type="button" class=${"apdot" + (on ? " on" : "") + (i >= 5 ? " extra" : "")}
          aria-label=${on ? "Spend an AP" : "Get an AP back"} onMouseEnter=${e => tip.show(e.currentTarget, apTip(on))} onMouseLeave=${() => tip.hide()}
          onClick=${() => { tip.hide(); spend(1); }} onContextMenu=${e => { e.preventDefault(); tip.hide(); spend(-1); }}></button>`)}</span>
        <span class="cbapbtns"><button class="iconbtn" aria-label="Spend an AP" onClick=${() => spend(1)}>−</button><button class="iconbtn" aria-label="Gain an AP" onClick=${() => spend(-1)}>+</button></span>
      </div>
      <p class="sub">${cb.turn ? `${num(cb.ap)} AP to act with. Whatever's left when you end your turn stays ready for reactions.`
        : num(cb.ap) ? `${num(cb.ap)} AP held for reactions until your next turn.` : "No AP left for reactions."}
        ${cm ? ` Alacrity carries up to ${cm} unspent AP into your next turn.` : ""}</p>
      <div class="row">${cb.turn ? html`<button class="btn primary" onClick=${endTurn}>End turn</button>` : html`<button class="btn primary" onClick=${startTurn}>Start my turn</button>`}
        ${(cb.running || []).length > 0 && html`<span class="muted">Running: ${cb.running.map(r => `${r.n} (${r.turns})`).join(", ")}</span>`}</div>
    </section>

    <div class="cbgrid">
      <${CbVitals} c=${c} d=${d} update=${update} />
      <${CbGear} c=${c} update=${update} />
      <${CbActives} c=${c} update=${update} />
      <${CbTable} c=${c} update=${update} />
      <${CbMagic} c=${c} update=${update} open=${setPop} />
    </div>
    ${panel && html`<${RulePanel} topic=${panel} onClose=${() => setPanel(null)} />`}
    ${pop && html`<${CbPop} c=${c} update=${update} what=${pop} onClose=${() => setPop(null)} />`}
  </div>`;
}

// HP and Blood up top; wounds as small buttons; Toxicity, Deprivation and Stamina as a slim row. Death saves at 0 HP.
function CbVitals({ c, d, update }) {
  const v = c.vitals, setV = (k, val, lo, hi) => update(x => { x.vitals[k] = R.clamp(Math.round(val), lo, hi); });
  const saves = (c.combat && c.combat.saves) || { ok: 0, fail: 0 };
  const setSave = (k, n) => update(x => { x.combat = Object.assign({}, x.combat); x.combat.saves = Object.assign({ ok: 0, fail: 0 }, x.combat.saves, { [k]: Math.max(0, n) }); });
  const rollSave = () => askRoll({ title: "Death save", dice: [{ n: 1, sides: 100 }], note: "50 or lower succeeds.", cancel: true }).then(r => {
    if (!r) return; const t = r.reduce((a, b) => a + b, 0), ok = t <= 50;
    update(x => { x.combat = Object.assign({}, x.combat); const s = Object.assign({ ok: 0, fail: 0 }, x.combat.saves); s[ok ? "ok" : "fail"]++; x.combat.saves = s; addLog(x, `Death save: ${t}, ${ok ? "success" : "failure"}`); });
    toast(`Death save: ${t}. ${ok ? "Success." : "Failure."}`);
  });
  const slim = (label, val, maxv, color, set, tipTxt) => html`<button type="button" class="cbslim" style=${`--c:${color}`}
    onMouseEnter=${e => tip.show(e.currentTarget, { title: `${label} ${val} / ${maxv}`, lines: [tipTxt] })} onMouseLeave=${() => tip.hide()}
    onClick=${() => set(1)} onContextMenu=${e => { e.preventDefault(); set(-1); }} aria-label=${`${label} ${val} of ${maxv}: left-click adds one, right-click removes one`}>
    <span>${label}</span><b>${val}<small>/${maxv}</small></b><i style=${`width:${maxv ? R.clamp((val / maxv) * 100, 0, 100) : 0}%`}></i></button>`;
  const lr = html`<${Mouse} side="L" /> add one · <${Mouse} side="R" /> remove one`;
  const stam = num(v.exhaustion);
  return html`<section class="frame cbvitals"><${Head} title="Vitals" topic="hp" />
    <${Meter} id=${"cbhp-" + c.id} label="Hit points" cur=${d.cur.hp} max=${d.max.hp} color="var(--blood)" soft="var(--blood-soft)" onSet=${n => setV("hp", n, 0, d.max.hp)} />
    <${Meter} id=${"cbbp-" + c.id} label="Blood points" order=${1} cur=${d.cur.bp} max=${d.max.bp} color="var(--life)" soft="var(--life-soft)" marks=${[100, 80, 60, 40, 20].filter(m => m < d.max.bp)}
      onSet=${n => setV("bp", n, 0, d.max.bp)} note=${d.bleedPerTurn ? `Bleeding ${d.bleedPerTurn} a turn.` : ""} />
    ${d.cur.hp <= 0 && html`<div class="cbsaves" role="group" aria-label="Death saves">
      <b>Unconscious: death saves</b><span class="muted">d100, 50 or lower succeeds.</span>
      <div class="row"><span class="cbtally ok">Successes <button class="iconbtn" aria-label="One fewer success" onClick=${() => setSave("ok", num(saves.ok) - 1)}>−</button><b>${num(saves.ok)}</b><button class="iconbtn" aria-label="One more success" onClick=${() => setSave("ok", num(saves.ok) + 1)}>+</button></span>
        <span class="cbtally bad">Failures <button class="iconbtn" aria-label="One fewer failure" onClick=${() => setSave("fail", num(saves.fail) - 1)}>−</button><b>${num(saves.fail)}</b><button class="iconbtn" aria-label="One more failure" onClick=${() => setSave("fail", num(saves.fail) + 1)}>+</button></span>
        <button class="btn small primary" onClick=${rollSave}>Roll a death save</button></div></div>`}
    <div class="cbwounds">${Object.keys(R.WOUNDS).map(k => html`<button type="button" class=${"cbwound" + (num(v.wounds[k]) ? " has" : "")}
      onMouseEnter=${e => tip.show(e.currentTarget, { title: `${k[0].toUpperCase() + k.slice(1)} wounds · ${d.woundAt[k]}+ damage`, lines: [`Bleeds ${R.WOUNDS[k].bleed}.`, html`<${Mouse} side="L" /> add a wound · <${Mouse} side="R" /> treated`] })} onMouseLeave=${() => tip.hide()}
      onClick=${() => update(x => { x.vitals.wounds[k] = num(x.vitals.wounds[k]) + 1; addLog(x, `${k} wound`); })}
      onContextMenu=${e => { e.preventDefault(); if (num(v.wounds[k])) update(x => { x.vitals.wounds[k] = Math.max(0, num(x.vitals.wounds[k]) - 1); addLog(x, `Treated a ${k} wound`); }); }}
      aria-label=${`${k} wounds ${num(v.wounds[k])}: left-click adds one, right-click marks one treated`}><span>${k}</span><b>${num(v.wounds[k])}</b></button>`)}
      <button class="btn small" disabled=${!d.bleedPerTurn} onClick=${() => update(x => { x.vitals.bp = Math.max(0, d.cur.bp - d.bleedPerTurn); addLog(x, `Bled ${d.bleedPerTurn}`); })}>Bleed (−${d.bleedPerTurn})</button></div>
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
function CbGear({ c, update }) {
  const a = R.wornArmor(c), chk = a ? R.armorCheck(c, a) : null;
  const weapons = c.weapons.map((w, i) => [w, i]).filter(([w]) => w.where !== "pack" && w.where !== "stash");
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
    ${weapons.map(([w, i]) => { const kind = R.weaponKind(w), wl = R.weaponLine(c, w), dur = num(w.dur), clip = num(w.clip), clipMax = num(w.clipMax);
      return html`<div class=${"cbweap kind-" + kind}>
        <div class="cbrowhead"><b>${w.name || "Unnamed weapon"}</b><span class="muted">${kind === "shield" ? "Shield" : w.skill}${wl.proficiency ? ` · ${wl.proficiency}` : ""}</span></div>
        <div class="cbstats"><span>Damage <b>${num(w.damage)}</b></span>${kind !== "shield" && html`<span>Crit <b>${wl.crit}%</b></span><span>Accuracy <b>${wl.accuracy >= 0 ? "+" : ""}${wl.accuracy}%</b></span>`}
          ${kind === "ranged" && num(w.reload) ? html`<span>Reload <b>${num(w.reload)} AP</b></span>` : ""}</div>
        ${kind === "ranged" && html`<div class="cbtrack"><span class="lbl">Clip</span><button class="btn small" disabled=${!clip} onClick=${() => setW(i, "clip", Math.max(0, clip - 1))}>Fire</button>
          <b>${clip}<small> / ${clipMax}</small></b><button class="btn small" disabled=${!clipMax || clip >= clipMax} onClick=${() => update(x => { x.weapons[i].clip = clipMax; if (num(w.reload)) { x.combat = Object.assign({}, x.combat); x.combat.ap = Math.max(0, num(x.combat.ap) - num(w.reload)); } })}>Reload</button></div>`}
        <div class="cbtrack"><span class="lbl">Durability</span><button class="iconbtn" aria-label="Lose 1 durability" onClick=${() => setW(i, "dur", Math.max(0, dur - 1))}>−</button>
          <span class="track"><i style=${`width:${num(w.durMax) ? R.clamp((dur / num(w.durMax)) * 100, 0, 100) : 0}%`}></i></span>
          <b>${dur}<small> / ${num(w.durMax)}${w.durDie ? ` · ${w.durDie}` : ""}</small></b><button class="iconbtn" aria-label="Restore 1 durability" onClick=${() => setW(i, "dur", Math.min(num(w.durMax) || 999, dur + 1))}>+</button></div>
        ${w.props && html`<p class="muted cbprops">${w.props}</p>`}
      </div>`; })}
    ${!weapons.length && html`<p class="muted">No weapons at hand. Weapons in the pack or the stash stay in Gear.</p>`}
  </section>`;
}

// Active abilities and Empowerments that matter in a fight, grouped: critical strikes, defence, weapon skills, the rest.
function CbActives({ c, update }) {
  const skip = CB_SKIP();
  const rows = unlockedPerks(c).filter(s => !skip.includes(s.name)).flatMap(s => s.perks.filter(p => ["A", "E", "M"].includes(p.t)).map(p => ({ s, p })));
  const group = r => r.s.kind === "weapon" ? "weap" : (CB_GROUPS.find(g => g[2].includes(r.s.name)) || ["other"])[0];
  const groups = [...CB_GROUPS.map(g => [g[0], g[1]]), ["weap", "Weapon skills"], ["other", "Other abilities"]].map(([k, n]) => [k, n, rows.filter(r => group(r) === k)]).filter(g => g[2].length);
  const ap = num((c.combat || {}).ap), turn = !!(c.combat || {}).turn;
  const use = (s, p) => update(x => {
    const cost = apOf(p), gain = CB_GAIN[`${s.name}:${p.l}`] || 0;
    x.combat = Object.assign({}, x.combat); x.combat.ap = R.clamp(num(x.combat.ap) - cost + gain, 0, 12);
    if (!x.combat.turn) x.combat.reacted = true;
    const uses = p.u && num(p.u.uses); if (uses) { x.uses = x.uses || {}; x.uses[p.key] = Math.min(uses, num(x.uses[p.key]) + 1); }
    const st = p.u && /^\d+$/.test(String(p.u.stamina || "")) ? +p.u.stamina : 0; if (st) R.setStamina(x, num(x.vitals.exhaustion) + st);
    const turns = p.u && num(p.u.turns); if (turns) x.combat.running = [...(x.combat.running || []), { id: rid(), n: p.group || s.name, turns }];
    addLog(x, `Used ${p.group || s.name} (${s.name} ${p.l})${cost ? `, ${cost} AP` : ""}${gain ? `, +${gain} AP` : ""}`);
  });
  return html`<section class="frame cbactives"><${Head} title="Abilities" topic="skills" />
    ${!groups.length && html`<p class="muted">No Active abilities yet. They appear here as your skills unlock them.</p>`}
    ${groups.map(([k, n, list]) => html`<div class="cbgroup"><h4 class="cbgh">${n}</h4>
      ${list.map(({ s, p }) => {
        const cost = apOf(p), uses = p.u && num(p.u.uses), spent = Math.min(uses || 0, num((c.uses || {})[p.key]));
        const out = uses && spent >= uses, short = cost > ap, notNow = !turn && !reactOk(p) && cost > 0;
        return html`<div class=${"cbperk k-" + typeKey(p.t)} style=${attStyle(s.attr)}>
          <div class="cbperkhead"><b>${p.group || s.name}</b><small class="muted">${s.name} ${p.l}</small><${UsageLine} u=${p.u} /></div>
          <p class="cbperktext">${p.x}</p>
          <div class="row"><button class="btn small primary" disabled=${out || short}
              title=${out ? "No uses left until it recharges" : short ? `Needs ${cost} AP` : notNow ? "Usually on your turn" : ""} onClick=${() => use(s, p)}>Use${cost ? ` · ${cost} AP` : ""}</button>
            ${reactOk(p) && html`<span class="flag">Reaction</span>`}
            ${uses ? html`<${UseBoxes} c=${c} ukey=${p.key} uses=${uses} recharge=${p.u.recharge} update=${update} label=${`${s.name} ${p.l}`} />` : ""}</div>
        </div>`; })}</div>`)}
  </section>`;
}

// Conditions, countdowns and the player's own cards: anything that comes up at the table that the sheet doesn't hold.
function CbTable({ c, update }) {
  const v = c.vitals, cards = c.cards || [];
  const [cond, setCond] = useState(""), [adding, setAdding] = useState(false);
  const setCard = (id, fn) => update(x => { x.cards = (x.cards || []).map(k => { if (k.id !== id) return k; const y = Object.assign({}, k); fn(y); return y; }); });
  const running = (c.combat || {}).running || [];
  return html`<section class="frame cbtable"><${Head} title="Conditions & cards" />
    ${running.length > 0 && html`<div class="cbrunning">${running.map(r => html`<span class="cbrun"><b>${r.n}</b> ${r.turns} turn${r.turns === 1 ? "" : "s"} left
      <button aria-label=${`Stop ${r.n}`} onClick=${() => update(x => { x.combat = Object.assign({}, x.combat); x.combat.running = (x.combat.running || []).filter(y => y.id !== r.id); })}>×</button></span>`)}</div>`}
    <div class="chips">${v.conditions.map((t, i) => html`<span class="cond">${t}<button aria-label=${`Remove ${t}`} onClick=${() => update(x => { x.vitals.conditions.splice(i, 1); })}>×</button></span>`)}
      ${!v.conditions.length && html`<span class="muted">No conditions.</span>`}</div>
    <form class="row cbcondform" onSubmit=${e => { e.preventDefault(); const t = cond.trim(); if (t) { update(x => { x.vitals.conditions.push(t); }); setCond(""); } }}>
      <input class="inp" list="cw-conds" placeholder="Stunned, Prone, Frightened…" aria-label="New condition" value=${cond} onInput=${e => setCond(e.target.value)} />
      <datalist id="cw-conds">${["Stunned", "Entangled", "Frightened", "Blinded", "Prone", "Poisoned", "Charmed", "Paralyzed", "Deafened", "Unconscious", "On Death's Door"].map(o => html`<option value=${o}></option>`)}</datalist>
      <button class="btn small" type="submit">Add</button></form>
    <div class="cbcards">${cards.map(k => html`<${CbCard} key=${k.id} c=${c} k=${k} set=${fn => setCard(k.id, fn)} drop=${() => update(x => { x.cards = (x.cards || []).filter(y => y.id !== k.id); })} />`)}</div>
    ${adding ? html`<${CbCardForm} c=${c} onDone=${card => { if (card) update(x => { x.cards = [...(x.cards || []), card]; addLog(x, `Card added: ${card.name}`); }); setAdding(false); }} />`
      : html`<button class="btn small" onClick=${() => setAdding(true)}>+ A card</button>`}
  </section>`;
}
function CbCard({ c, k, set, drop }) {
  const kind = (CARD_KINDS.find(x => x[0] === k.kind) || CARD_KINDS[1])[1];
  const uses = num(k.uses), used = Math.min(uses, num(k.used));
  return html`<article class=${"cbcard ck-" + (k.kind || "feature") + (k.by === "gm" ? " bygm" : "") + (num(k.turns) && num(k.left) <= 0 ? " over" : "")}>
    <div class="cbcardhead"><span class="flag">${kind}</span><b>${k.name}</b>${k.by === "gm" && html`<small class="muted">from the GM</small>`}
      <button class="iconbtn" aria-label=${`Remove ${k.name}`} onClick=${drop}>×</button></div>
    ${k.text && html`<p>${k.text}</p>`}
    <div class="row cbcardctl">
      ${uses > 0 && html`<span class="usebox"><span class="lbl">Uses</span>${Array.from({ length: uses }, (_, i) => html`<button type="button" class=${"usetick" + (i < used ? " spent" : "")} aria-pressed=${i < used}
        aria-label=${i < used ? `Give back use ${i + 1}` : `Spend use ${i + 1}`} onClick=${() => set(x => { x.used = i < used ? i : i + 1; })}></button>`)}</span>`}
      ${num(k.turns) > 0 && html`<span class="cbcount"><span class="lbl">Turns left</span><button class="iconbtn" aria-label="One turn less" onClick=${() => set(x => { x.left = Math.max(0, num(x.left) - 1); })}>−</button>
        <b>${num(k.left)}</b><button class="iconbtn" aria-label="One turn more" onClick=${() => set(x => { x.left = num(x.left) + 1; })}>+</button>${num(k.left) <= 0 ? html`<small class="muted">over</small>` : ""}</span>`}
      ${k.kind === "counter" && html`<span class="cbcount"><span class="lbl">Count</span><button class="iconbtn" aria-label="One fewer" onClick=${() => set(x => { x.count = Math.max(0, num(x.count) - 1); })}>−</button>
        <b>${num(k.count)}${num(k.max) ? html`<small> / ${num(k.max)}</small>` : ""}</b><button class="iconbtn" aria-label="One more" onClick=${() => set(x => { x.count = num(k.max) ? Math.min(num(k.max), num(x.count) + 1) : num(x.count) + 1; })}>+</button></span>`}
      <label class="cbkeep muted"><input type="checkbox" checked=${k.keep} onChange=${e => set(x => { x.keep = e.target.checked; })} /> Keep after combat</label>
    </div></article>`;
}
function CbCardForm({ c, onDone }) {
  const [f, setF] = useState({ kind: "condition", name: "", text: "", uses: "", turns: "", count: "", max: "", perk: "", keep: false });
  const put = k => e => setF(Object.assign({}, f, { [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const perks = unlockedPerks(c).flatMap(s => s.perks.map(p => ({ s, p })));
  const pick = e => { const r = perks.find(x => x.p.key + x.p.t === e.target.value); if (!r) return setF(Object.assign({}, f, { perk: "" }));
    setF(Object.assign({}, f, { perk: e.target.value, name: `${r.p.group || r.s.name} (${r.s.name} ${r.p.l})`, text: r.p.x || "", uses: r.p.u && r.p.u.uses ? String(r.p.u.uses) : "" })); };
  const save = e => { e.preventDefault(); if (!f.name.trim()) return;
    onDone({ id: rid(), kind: f.kind, name: f.name.trim(), text: f.text.trim(), uses: Math.max(0, Math.floor(+f.uses || 0)), used: 0,
      turns: Math.max(0, Math.floor(+f.turns || 0)), left: Math.max(0, Math.floor(+f.turns || 0)), count: Math.max(0, Math.floor(+f.count || 0)), max: Math.max(0, Math.floor(+f.max || 0)),
      perk: f.kind === "perk" ? f.perk : "", keep: !!f.keep, by: isGM() && Store.table ? "gm" : "", at: Date.now() }); };
  return html`<form class="cbcardform" onSubmit=${save}>
    <div class="seg" role="group" aria-label="Kind of card">${CARD_KINDS.map(([k, n]) => html`<button type="button" aria-pressed=${f.kind === k} onClick=${() => setF(Object.assign({}, f, { kind: k }))}>${n}</button>`)}</div>
    ${f.kind === "perk" && html`<select class="inp" aria-label="Perk" value=${f.perk} onChange=${pick}><option value="">Pick a perk…</option>
      ${perks.map(({ s, p }) => html`<option value=${p.key + p.t}>${s.name} ${p.l}: ${p.group || s.name} (${TYPE_SHORT[p.t] || "Passive"})</option>`)}</select>`}
    <input class="inp" placeholder=${f.kind === "condition" ? "Name, e.g. Cursed by the Zhoung" : "Name"} aria-label="Card name" value=${f.name} onInput=${put("name")} />
    <textarea class="inp" rows="2" placeholder="What it does" aria-label="What it does" value=${f.text} onInput=${put("text")}></textarea>
    <div class="cbformnums">
      <label>Uses<input class="inp" type="number" min="0" placeholder="—" value=${f.uses} onInput=${put("uses")} /></label>
      <label>Lasts (turns)<input class="inp" type="number" min="0" placeholder="—" value=${f.turns} onInput=${put("turns")} /></label>
      ${f.kind === "counter" && html`<label>Starts at<input class="inp" type="number" min="0" placeholder="0" value=${f.count} onInput=${put("count")} /></label>
        <label>Up to<input class="inp" type="number" min="0" placeholder="—" value=${f.max} onInput=${put("max")} /></label>`}
    </div>
    <label class="cbkeep"><input type="checkbox" checked=${f.keep} onChange=${put("keep")} /> Keep it after this combat</label>
    <div class="row"><button class="btn small primary" type="submit" disabled=${!f.name.trim()}>Add card</button><button class="btn small" type="button" onClick=${() => onDone(null)}>Cancel</button></div>
  </form>`;
}

// The schools of magic this character has (with the Magic module on): each opens its Magic tab page in a pop-up. Warding opens
// on Inscribe; Daemonology shows who's summoned; Dreamwalking shows the Toll as soon as there is one.
function CbMagic({ c, update, open }) {
  const schools = (c.modules || {}).magic === true ? magicOpen(c) : [];
  if (!schools.length) return null;
  const has = k => schools.some(x => x[0] === k);
  const dm = has("demon") ? R.demonState(c) : null, dr = has("dream") ? R.dreamState(c) : null, hm = has("harm") ? R.harmonyState(c) : null, wd = has("ward") ? R.wardState(c) : null;
  const out = dm ? (c.demon.out || []).map(id => (c.demon.daemons || []).find(x => x.id === id)).filter(Boolean) : [];
  const dream = c.dream || {}, tollShown = dr && (dr.toll > 0 || dream.inRealm || dream.sphere);
  return html`<section class="frame cbmagic"><${Head} title="Magic" />
    ${tollShown && html`<div class=${"cbtoll" + (dr.toll >= 30 ? " night" : dr.toll >= 10 ? " uneasy" : "")}>
      <div class="cbrowhead"><b>Toll</b><span><b>${dr.toll}%</b> · checks at ${dr.bonus >= 0 ? "+" : ""}${dr.bonus}</span></div>
      <span class="track"><i style=${`width:${R.clamp(dr.toll, 0, 100)}%`}></i></span>
      <span class="muted">${dr.parts.map(p => `${p[0]} ${p[1]}%`).join(" · ") || (dream.inRealm ? "In the dream realm." : "A dreamsphere is open.")}</span></div>`}
    ${dm && html`<div class="cbcard ck-counter cbdaemons">
      <div class="cbcardhead"><span class="flag">Counter</span><b>Daemons summoned</b></div>
      <p>${out.length ? out.map(x => x.n || x.name || "A daemon").join(", ") : "None summoned."}</p>
      <div class="row"><span class="cbcount"><b>${out.length}</b><span class="lbl">out</span></span><span class="muted">${dm.left} of ${dm.perDay} summons left today · ${dm.summonAP} AP to summon</span>
        <button class="btn small primary" onClick=${() => open("demon")}>Summon…</button></div></div>`}
    ${hm && hm.released.length > 0 && html`<p class="cbnote">Harmony: ${hm.released.length} chakra${hm.released.length === 1 ? "" : "s"} released${hm.turnsLeft ? `, ${hm.turnsLeft} turns left` : ""}. Aether +${hm.aether}.</p>`}
    ${wd && wd.fatigue > 0 && html`<p class="cbnote">Warding Fatigue: ${wd.fatigue}.</p>`}
    <div class="cbschools">${schools.map(([k, n]) => html`<button type="button" class="btn" onClick=${() => { if (k === "ward") lsSet("cw-ward-page", "inscribe"); open(k); }}>
      ${k === "ward" ? "Inscribe a Ward" : k === "demon" ? "Daemonology" : k === "dream" ? "Dreamwalking" : k === "harm" ? "Harmony" : k === "alch" ? "Use a circle" : n}</button>`)}</div>
  </section>`;
}

// A pop-up over the battle view: a school of magic (the Magic tab's own page) or the Tabletop code.
function CbPop({ c, update, what, onClose }) {
  const ref = useRef();
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); ref.current && ref.current.focus(); return () => window.removeEventListener("keydown", k); }, []);
  const school = MAGIC.find(x => x[0] === what);
  const title = what === "tts" ? "Tabletop Simulator" : school ? school[1] : "";
  const body = what === "tts" ? html`<p class="sub">Send your numbers to the Tabletop sheet, or bring the changes made there back here.</p><${TabletopPanel} c=${c} update=${update} />`
    : what === "ward" ? html`<${Warding} c=${c} update=${update} />` : what === "harm" ? html`<${Harmony} c=${c} update=${update} />`
    : what === "demon" ? html`<${Demonology} c=${c} update=${update} />` : what === "dream" ? html`<${Dreamwalking} c=${c} update=${update} />`
    : what === "alch" ? html`<${Alchemy} c=${c} update=${update} />` : null;
  return html`<div class="cbveil" onClick=${e => { if (e.target === e.currentTarget) onClose(); }}>
    <div class=${"cbpop cbpop-" + what} role="dialog" aria-modal="true" aria-label=${title} tabindex="-1" ref=${ref}>
      <header class="cbpophead"><h2>${title}</h2><button class="iconbtn" aria-label="Close" onClick=${onClose}>×</button></header>
      <div class="cbpopbody">${body}</div>
    </div></div>`;
}
