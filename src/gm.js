/* ================= GM table ================= */
// Initiative is a deck: one card per combatant, a second card for anyone with Dexterity above 15.
// The deck is shuffled at the start of each round and drawn from the top. A combatant acts the first
// time one of their cards comes up; their extra card is skipped when it appears later that round.
const CAMPAIGNS = ["Tears of Eithos", "Talon Saga", "One-shot"];
const KIND_LABEL = { pc: "Character", enemy: "Enemy", effect: "Effect" };
const PLACEMENTS = [["shuffle", "Shuffle into the deck"], ["next", "Next card"], ["bottom", "Bottom of the deck"], ["later", "From next round"]];

function shuffled(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const blankEncounter = () => ({ v: 1, round: 0, combatants: [], deck: [], drawn: [], current: null, acted: [], hist: [] });
const cardOwner = card => String(card).split(":")[0];

function combatantDex(comb, charMap) {
  if (comb.kind === "pc") { const ch = charMap[comb.charId]; return ch ? R.attr(norm(ch), "DEX") : 10; }
  return num(comb.dex);
}
function cardCount(comb, charMap) { return comb.kind === "effect" ? 1 : combatantDex(comb, charMap) > 15 ? 2 : 1; }
function cardsOf(comb, charMap) { return Array.from({ length: cardCount(comb, charMap) }, (_, k) => `${comb.id}:${k}`); }

// ---- deck operations: each takes a copy of the encounter and changes it in place
function newRound(e, charMap) {
  e.round = num(e.round) + 1; e.acted = []; e.drawn = []; e.current = null;
  e.deck = shuffled(e.combatants.filter(c => !c.out).flatMap(c => cardsOf(c, charMap)));
}
function drawNext(e, charMap) {
  // Draw until someone who hasn't acted comes up. If the deck runs out (or only extra cards are left),
  // shuffle a new round and keep drawing.
  e.current = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!e.deck.length) newRound(e, charMap);
    while (e.deck.length) {
      const card = e.deck.shift(); const cid = cardOwner(card);
      const comb = e.combatants.find(c => c.id === cid);
      if (!comb || comb.out) continue;
      if (e.acted.includes(cid)) { e.drawn.push({ card, skip: true }); continue; }
      e.acted.push(cid); e.drawn.push({ card }); e.current = card;
      if (comb.kind === "effect" && !comb.recurring) comb.out = true;   // a one-off effect is spent once it fires
      return;
    }
  }
}
// Put a party member into the encounter (once) and deal their cards.
function addCharacter(e, ch, charMap, placement) {
  if (!ch || e.combatants.some(c => c.charId === ch.id)) return;
  const comb = { id: rid(), kind: "pc", charId: ch.id, name: ch.name };
  e.combatants.push(comb); placeCards(e, cardsOf(comb, charMap), placement);
}
function placeCards(e, cards, placement) {
  if (placement === "later" || !num(e.round)) return;   // before the first round, everyone joins the first shuffle anyway
  cards.forEach(card => {
    if (placement === "next") e.deck.unshift(card);
    else if (placement === "bottom") e.deck.push(card);
    else e.deck.splice(Math.floor(Math.random() * (e.deck.length + 1)), 0, card);
  });
}

/* ---------- lite character readout, shared by party cards and the initiative card ---------- */
function MiniBar({ label, cur, max, color, soft }) {
  const w = max ? R.clamp((cur / max) * 100, 0, 100) : 0;
  return html`<div class="mbar"><span class="lbl">${label}</span><span class="mtrack" style=${`background:${soft}`}><i style=${`width:${w}%;background:${color}`}></i></span><b>${cur}<small>/${max}</small></b></div>`;
}
function LiteStats({ c, updateChar, compact }) {
  const n = norm(c), d = derive(c), v = n.vitals, arm = R.wornArmor(n);
  const [amt, setAmt] = useState("");
  const hp = sign => { const k = Math.max(1, Math.floor(+amt || 1)); updateChar(c.id, x => { x.vitals.hp = R.clamp(d.cur.hp + sign * k, 0, d.max.hp); }); setAmt(""); };
  const wounds = Object.entries(v.wounds).filter(([, k]) => num(k) > 0).map(([k, cnt]) => `${cnt} ${k}`);
  const armCheck = arm ? R.armorCheck(n, arm) : null;
  return html`<div class="lite">
    <${MiniBar} label="HP" cur=${d.cur.hp} max=${d.max.hp} color="var(--blood)" soft="var(--blood-soft)" />
    ${!compact && html`<${MiniBar} label="Blood" cur=${d.cur.bp} max=${d.max.bp} color="var(--life)" soft="var(--life-soft)" />
    <${MiniBar} label="Tox" cur=${d.cur.tox} max=${d.max.tox} color="var(--tox)" soft="var(--tox-soft)" />`}
    <div class="hpctl row">
      <input class="inp" type="number" min="1" placeholder="1" aria-label=${`Amount for ${c.name}`} value=${amt} onInput=${e => setAmt(e.target.value)} />
      <button class="btn small" onClick=${() => hp(-1)}>Damage</button><button class="btn small" onClick=${() => hp(1)}>Heal</button>
      <span class="wbtns" role="group" aria-label="Wounds: left-click adds, right-click removes">${["light", "moderate", "mortal"].map(k => html`<button class="btn small" title=${`Left-click adds a ${k} wound, right-click removes one`} onClick=${() => updateChar(c.id, x => { x.vitals.wounds[k] = num(x.vitals.wounds[k]) + 1; })}
        onContextMenu=${e => { e.preventDefault(); if (num(c.vitals.wounds[k])) updateChar(c.id, x => { x.vitals.wounds[k] = Math.max(0, num(x.vitals.wounds[k]) - 1); addLog(x, `Treated a ${k} wound`); }); }}>± ${k === "moderate" ? "Mod." : k[0].toUpperCase() + k.slice(1)}</button>`)}</span>
    </div>
    <div class="litefacts">
      <span><span class="lbl">Wounds</span> ${wounds.length ? html`<b class="badtext">${wounds.join(" · ")} · bleeding ${d.bleedPerTurn}/turn</b>` : "None"}</span>
      <span><span class="lbl">Exhaustion</span> <b class=${num(v.exhaustion) >= 5 ? "badtext" : ""}>${num(v.exhaustion)}</b>${num(v.exhaustion) ? html` <small class="muted">${R.EXHAUSTION[num(v.exhaustion)]}</small>` : ""}</span>
      <span><span class="lbl">Armor</span> ${arm ? html`<b>${arm.name || R.ARMOR[arm.type].label}</b> <small class="muted">${R.ARMOR[arm.type].label} · AV ${num(arm.av)} · soak ${num(arm.soak)}/${armCheck.soakMax}</small>` : "None worn"}</span>
      <span><span class="lbl">Move</span> <b>${d.move} m</b>${d.enc.effective.defend ? html` <small class="muted">defend ${d.enc.effective.defend}%</small>` : ""}</span>
    </div>
    ${v.conditions.length > 0 && html`<div class="chips">${v.conditions.map((t, i) => html`<span class="cond">${t}<button aria-label=${`Remove ${t}`} onClick=${() => updateChar(c.id, x => { x.vitals.conditions.splice(i, 1); })}>×</button></span>`)}</div>`}
  </div>`;
}

const playedBy = c => { const names = playersOf(c).map(u => (Store.members.find(m => m.uid === u) || {}).name).filter(Boolean); return names.length ? ` · played by ${names.join(", ")}` : ""; };
function PartyCard({ c, inDeck, onAdd, updateChar, openChar }) {
  return html`<article class="pcard">
    <header class="row">
      <${Thumb} c=${c} lg />
      <span class="who" style="flex:1;min-width:0"><b>${c.name || "Unnamed"}</b><span class="muted">${subtitle(c)}${playedBy(c)}</span></span>
      <button class="btn small" onClick=${() => openChar(c.id)}>Sheet</button>
      <button class=${"btn small" + (inDeck ? "" : " primary")} disabled=${inDeck} onClick=${onAdd}>${inDeck ? "In deck" : "Add to deck"}</button>
    </header>
    <${LiteStats} c=${c} updateChar=${updateChar} />
  </article>`;
}

/* ---------- the initiative card that's up now ---------- */
function CurrentCard({ e, comb, charMap, updateChar, act, openChar }) {
  if (!comb) return html`<div class="icard empty"><div class="ornate">${num(e.round) ? `Round ${e.round} is over` : "The deck is waiting"}</div>
    <p class="muted">${num(e.round) ? "Shuffle the deck to start the next round." : e.combatants.length ? "Shuffle the deck to draw the first card." : "Add characters, enemies or effects below, then shuffle."}</p></div>`;
  const ch = comb.kind === "pc" ? charMap[comb.charId] : null;
  const twoCards = cardCount(comb, charMap) === 2;
  return html`<div class=${"icard kind-" + comb.kind}>
    <header class="row">
      ${comb.kind === "pc" ? html`<${Thumb} c=${ch} name=${comb.name} lg />` : html`<span class=${"kindmark " + comb.kind}>${comb.kind === "enemy" ? "E" : "✦"}</span>`}
      <span class="who" style="flex:1;min-width:0"><span class="lbl">${KIND_LABEL[comb.kind]}${twoCards ? " · 2 cards" : ""}</span><b class="iname">${ch ? ch.name : comb.name}${comb.kind === "enemy" && num(comb.count) > 1 ? ` ×${comb.count}` : ""}</b></span>
      ${ch && html`<button class="btn small" onClick=${() => openChar(ch.id)}>Sheet</button>`}
    </header>
    ${comb.kind === "pc" && (ch ? html`<${LiteStats} c=${ch} updateChar=${updateChar} />` : html`<p class="muted">This character was deleted.</p>`)}
    ${comb.kind === "enemy" && html`<${EnemyStats} comb=${comb} act=${act} />`}
    ${comb.kind === "effect" && html`<p class="effnote">${comb.note || "No description."}</p><p class="muted">${comb.recurring ? "Fires every round." : "Fires once, then leaves the deck."}</p>`}
  </div>`;
}
function EnemyStats({ comb, act, small }) {
  const [amt, setAmt] = useState("");
  const change = sign => { const k = Math.max(1, Math.floor(+amt || 1)); act(e => { const c = e.combatants.find(x => x.id === comb.id); c.hp = Math.max(0, num(c.hp) + sign * k); }); setAmt(""); };
  return html`<div class="lite">
    ${num(comb.hpMax) > 0 && html`<${MiniBar} label="HP" cur=${num(comb.hp)} max=${num(comb.hpMax)} color="var(--blood)" soft="var(--blood-soft)" />
    <div class="hpctl row"><input class="inp" type="number" min="1" placeholder="1" aria-label=${`Amount for ${comb.name}`} value=${amt} onInput=${ev => setAmt(ev.target.value)} />
      <button class="btn small" onClick=${() => change(-1)}>Damage</button><button class="btn small" onClick=${() => change(1)}>Heal</button></div>`}
    ${!small && comb.note && html`<p class="effnote">${comb.note}</p>`}
  </div>`;
}

/* ---------- add combatants ---------- */
function AddPanel({ e, party, charMap, act }) {
  const [kind, setKind] = useState("pc");
  const [f, setF] = useState({ name: "", count: 1, dex: 10, hp: "", note: "", recurring: false, placement: "shuffle" });
  const set = k => ev => setF(Object.assign({}, f, { [k]: ev.target.type === "checkbox" ? ev.target.checked : ev.target.value }));
  const inDeck = new Set(e.combatants.filter(c => c.kind === "pc").map(c => c.charId));
  const addPcs = ids => act(x => ids.forEach(id => addCharacter(x, charMap[id], charMap, f.placement)));
  const submit = ev => {
    ev.preventDefault();
    const name = f.name.trim(); if (!name) { toast(kind === "enemy" ? "Give the enemy a name first." : "Give the effect a name first."); return; }
    const comb = kind === "enemy"
      ? { id: rid(), kind: "enemy", name, count: Math.max(1, Math.floor(+f.count || 1)), dex: Math.floor(+f.dex || 10), hp: Math.floor(+f.hp || 0), hpMax: Math.floor(+f.hp || 0), note: f.note.trim() }
      : { id: rid(), kind: "effect", name, note: f.note.trim(), recurring: !!f.recurring };
    act(x => { x.combatants.push(comb); placeCards(x, cardsOf(comb, charMap), f.placement); });
    setF(Object.assign({}, f, { name: "", note: "", hp: "", count: 1 }));
    toast(`${name} added${num(e.round) && f.placement !== "later" ? ` (${PLACEMENTS.find(p => p[0] === f.placement)[1].toLowerCase()})` : ""}.`);
  };
  const free = party.filter(c => !inDeck.has(c.id));
  return html`<div class="addpanel">
    <div class="seg three" role="group" aria-label="What to add">
      ${[["pc", "Characters"], ["enemy", "Enemy"], ["effect", "Effect"]].map(([k, n]) => html`<button aria-pressed=${kind === k} onClick=${() => setKind(k)}>${n}</button>`)}</div>
    <div class="field"><label for="gm-place">Where the new cards go${num(e.round) ? "" : " (the first shuffle includes everyone)"}</label>
      <select id="gm-place" value=${f.placement} onChange=${set("placement")} disabled=${!num(e.round)}>${PLACEMENTS.map(([k, n]) => html`<option value=${k}>${n}</option>`)}</select></div>
    ${kind === "pc" ? html`<div class="chips">${free.map(c => html`<button class="btn small" onClick=${() => addPcs([c.id])}>+ ${c.name || "Unnamed"}</button>`)}
        ${free.length > 1 && html`<button class="btn small primary" onClick=${() => addPcs(free.map(c => c.id))}>+ Everyone shown</button>`}
        ${!free.length && html`<span class="muted">Everyone in this campaign is in the deck.</span>`}</div>`
      : html`<form class="addform" onSubmit=${submit}>
        <div class="field grow"><label for="gm-name">${kind === "enemy" ? "Enemy or group" : "Effect"}</label><input id="gm-name" value=${f.name} placeholder=${kind === "enemy" ? "Ash wolves" : "The bridge collapses"} onInput=${set("name")} /></div>
        ${kind === "enemy" ? html`
          <div class="field n"><label for="gm-count">How many</label><input id="gm-count" type="number" min="1" value=${f.count} onInput=${set("count")} /></div>
          <div class="field n"><label for="gm-dex">Dexterity</label><input id="gm-dex" type="number" min="0" max="20" value=${f.dex} onInput=${set("dex")} /></div>
          <div class="field n"><label for="gm-hp">HP</label><input id="gm-hp" type="number" min="0" placeholder="—" value=${f.hp} onInput=${set("hp")} /></div>`
        : html`<label class="row check"><input type="checkbox" checked=${f.recurring} onChange=${set("recurring")} />Every round</label>`}
        <div class="field grow full"><label for="gm-note">Notes</label><input id="gm-note" value=${f.note} placeholder=${kind === "enemy" ? "Weak to fire; flee at half HP" : "Everyone on the bridge rolls a Reflex save"} onInput=${set("note")} /></div>
        <button class="btn primary" type="submit">Add ${kind === "enemy" ? "enemy" : "effect"}${kind === "enemy" && +f.dex > 15 ? " · 2 cards" : ""}</button>
      </form>`}
  </div>`;
}

/* ---------- who is at the table (website only): roles and which characters each player sees ---------- */
function MembersPanel({ chars, updateChar }) {
  const [confirm, setConfirm] = useState(null);
  const me = Store.table.uid;
  const members = Store.members.slice().sort((a, b) => (a.role === b.role ? (a.name || "").localeCompare(b.name || "") : a.role === "gm" ? -1 : 1));
  const give = (cid, uid) => updateChar(cid, x => { x.players = [...new Set([...playersOf(x), uid])]; });
  const take = (cid, uid) => updateChar(cid, x => { x.players = playersOf(x).filter(u => u !== uid); });
  const act = p => p.catch(() => toast("Couldn't change that just now. Try again."));
  const nobody = chars.filter(c => !playersOf(c).length);
  return html`<section class="frame"><${Sigils} seed="players" n=${1} lead="note" side="r" />
    <h2 class="h"><span>Players at the table</span><i class="orn" aria-hidden="true"></i></h2>
    <p class="sub">Players see only the characters you give them. GMs see everyone and run the deck.</p>
    <div class="members">${members.map(m => { const mine = chars.filter(c => playersOf(c).includes(m.uid));
      return html`<div class="member">
        <div class="mhead"><b>${m.name}</b><span class=${"flag" + (m.role === "gm" ? " brass" : "")}>${m.role === "gm" ? "GM" : "Player"}</span>${m.uid === me && html`<span class="muted">you</span>`}
          ${m.uid !== me && html`<span class="mact">${confirm === m.uid
            ? html`<span class="muted">Remove ${m.name}?</span><button class="btn small danger" onClick=${() => { act(Store.table.remove(m.uid)); setConfirm(null); }}>Remove</button><button class="btn small" onClick=${() => setConfirm(null)}>Keep</button>`
            : html`<button class="btn small" onClick=${() => act(Store.table.setRole(m.uid, m.role === "gm" ? "player" : "gm"))}>${m.role === "gm" ? "Make player" : "Make GM"}</button>
              <button class="btn small danger" onClick=${() => setConfirm(m.uid)}>Remove</button>`}</span>`}</div>
        <div class="chips">${mine.map(c => html`<span class="cond">${c.name || "Unnamed"}<button aria-label=${`Take ${c.name || "this character"} from ${m.name}`} onClick=${() => take(c.id, m.uid)}>×</button></span>`)}
          <select class="inp give" aria-label=${`Give ${m.name} a character`} value="" onChange=${e => { const v = e.target.value; e.target.value = ""; if (v) give(v, m.uid); }}>
            <option value="">+ Give a character…</option>${chars.filter(c => !playersOf(c).includes(m.uid)).map(c => html`<option value=${c.id}>${c.name || "Unnamed"}${c.companionOf ? " (companion)" : ""}</option>`)}</select></div>
      </div>`; })}</div>
    ${nobody.length > 0 && html`<p class="muted">Not given to anyone yet: ${nobody.map(c => c.name || "Unnamed").join(", ")}.</p>`}
  </section>`;
}

/* ---------- backup and restore: every character (with portraits) in one file ---------- */
async function makeBackup(chars) {
  const portraits = {};
  for (const c of chars) {
    const src = portraitSrc(c); if (!src) continue;
    try { portraits[c.portraitAsset] = src.startsWith("data:") ? src : await shrinkImage(await (await fetch(src)).blob()); } catch {}
  }
  return JSON.stringify({ cw: "backup", v: 1, at: Date.now(), characters: Object.fromEntries(chars.map(c => [c.id, c])), portraits });
}
async function restoreBackup(b) {
  const moved = {};
  for (const [id, url] of Object.entries(b.portraits || {})) {
    if (!Store.assets) break;
    try { const blob = await (await fetch(url)).blob(); moved[id] = (await Store.assets.upload(new File([blob], id + ".jpg", { type: "image/jpeg" }))).id; } catch {}
  }
  for (const c of Object.values(b.characters)) {
    const x = clean(c); x.portraitAsset = moved[x.portraitAsset] || ""; x._rev = rid();
    await Store.flush(x);
  }
}
function BackupPanel({ chars }) {
  const fileRef = useRef(); const [busy, setBusy] = useState(""); const [pending, setPending] = useState(null);
  const download = async () => {
    setBusy("Packing…");
    try { await saveFile(`clockwork-backup-${new Date().toISOString().slice(0, 10)}.json`, await makeBackup(chars)); toast(`Saved ${chars.length} character${chars.length === 1 ? "" : "s"}.`); }
    catch { toast("Couldn't make the backup just now."); }
    setBusy("");
  };
  const pick = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return;
    try { const b = JSON.parse(await f.text()); if (b.cw !== "backup" || !b.characters) throw 0; setPending(b); }
    catch { toast("That isn't a Clockwork backup file."); }
  };
  const restore = async () => {
    if (Store.readOnly) { toast("You can view these characters but not change them."); return; }
    const b = pending; setPending(null); setBusy("Restoring…");
    try { await restoreBackup(b); toast(`Restored ${Object.keys(b.characters).length} characters.`); }
    catch { toast("Couldn't finish restoring. Try again."); }
    setBusy("");
  };
  return html`<section class="frame"><h2 class="h"><span>Table backup</span><i class="orn" aria-hidden="true"></i></h2>
    <p class="sub">Every character and portrait in one file. Use it to keep a copy, or to move your table to another site.</p>
    ${pending ? html`<div class="confirm"><span>Restore ${Object.keys(pending.characters).length} characters? Any already here with the same ID are replaced.</span>
        <button class="btn small primary" onClick=${restore}>Restore</button><button class="btn small" onClick=${() => setPending(null)}>Cancel</button></div>`
      : html`<div class="row"><button class="btn" disabled=${!!busy || !chars.length} onClick=${download}>Download backup</button>
        <button class="btn" disabled=${!!busy} onClick=${() => fileRef.current.click()}>Restore from backup</button>
        <input ref=${fileRef} type="file" accept="application/json,.json" hidden onChange=${pick} />${busy && html`<span class="muted">${busy}</span>`}</div>`}
  </section>`;
}

/* ---------- the whole GM screen ---------- */
function GMView({ chars, updateChar, openChar }) {
  const [camp, setCamp] = useState(() => lsGet("cw-gm-camp", "all"));
  const [reveal, setReveal] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  useEffect(() => lsSet("cw-gm-camp", camp), [camp]);
  const charMap = Object.fromEntries(chars.map(c => [c.id, c]));
  const party = chars.filter(c => camp === "all" || (camp === "none" ? !c.campaign : c.campaign === camp));
  const e = Object.assign(blankEncounter(), Store.encounter || {});
  const act = fn => {
    if (Store.readOnly) { toast("You can watch the initiative deck but not change it."); return; }
    const x = clean(e); const snap = clean(e); delete snap.hist; delete snap.t;
    fn(x); x.hist = [snap, ...(e.hist || [])].slice(0, 10);
    Store.saveEncounter(x);
  };
  const undo = () => { if (!e.hist || !e.hist.length) return; const [prev, ...rest] = e.hist; Store.saveEncounter(Object.assign({}, prev, { hist: rest })); };
  const comb = cid => e.combatants.find(c => c.id === cid);
  const nameOf = c => (c ? (c.kind === "pc" ? (charMap[c.charId] ? charMap[c.charId].name : c.name) : c.name + (c.kind === "enemy" && num(c.count) > 1 ? ` ×${c.count}` : "")) : "Removed");
  const current = e.current ? comb(cardOwner(e.current)) : null;
  const roundDone = num(e.round) > 0 && e.deck.every(card => { const o = cardOwner(card), cb = comb(o); return e.acted.includes(o) || !cb || cb.out; });
  const drawLabel = !num(e.round) ? "Shuffle and draw" : roundDone ? `Shuffle for round ${num(e.round) + 1}` : "Draw next card";
  const activeCount = e.combatants.filter(c => !c.out).length;

  return html`<div class="tabpane gm">
    <div class="row campbar" role="group" aria-label="Campaign">
      <span class="lbl">Campaign</span>
      ${[["all", "All"], ...CAMPAIGNS.map(x => [x, x]), ["none", "No campaign"]].map(([k, n]) => html`<button class=${"btn small" + (camp === k ? " primary" : "")} aria-pressed=${camp === k} onClick=${() => setCamp(k)}>${n}</button>`)}
    </div>
    ${Store.table && html`<${MembersPanel} chars=${chars} updateChar=${updateChar} />`}
    <div class="gmgrid">
      <section class="frame"><${Sigils} seed="initiative deck" n=${1} lead="skill" side="r" />
        <h2 class="h"><span>Initiative deck</span><i class="orn" aria-hidden="true"></i></h2>
        <p class="sub">One card each, two for Dexterity above 15. Shuffled every round.</p>
        <div class="deckbar">
          <div class="stat"><b>${num(e.round) || "—"}</b><span>Round</span></div>
          <div class="stat"><b>${num(e.round) ? e.combatants.filter(c => !c.out && !e.acted.includes(c.id)).length : activeCount}</b><span>Still to act</span></div>
          <div class="stat"><b>${e.deck.length}</b><span>Cards left</span></div>
          <div class="deckbtns"><button class="btn primary big" disabled=${!activeCount} onClick=${() => act(x => drawNext(x, charMap))}>${drawLabel}</button>
            <button class="btn" disabled=${!(e.hist && e.hist.length)} onClick=${undo}>Undo</button></div>
        </div>
        <${CurrentCard} e=${e} comb=${current} charMap=${charMap} updateChar=${updateChar} act=${act} openChar=${openChar} />

        ${e.drawn.length > 0 && html`<div class="drawn"><span class="lbl">This round</span><ol>
          ${e.drawn.map(dd => { const c = comb(cardOwner(dd.card)); return html`<li class=${(dd.skip ? "skip " : "") + (dd.card === e.current ? "now " : "") + (c ? "k-" + c.kind : "")} title=${dd.skip ? "Extra card. They already acted this round." : ""}>${nameOf(c)}${dd.skip ? " · extra" : ""}</li>`; })}</ol></div>`}

        <div class="row" style="margin-top:14px;justify-content:space-between">
          <span class="lbl">The deck</span>
          <button class="btn small" disabled=${!e.deck.length} onClick=${() => setReveal(!reveal)}>${reveal ? "Hide upcoming cards" : "Peek at upcoming cards"}</button></div>
        ${reveal && e.deck.length > 0 && html`<ol class="upcoming">${e.deck.map((card, i) => { const c = comb(cardOwner(card)); const extra = e.acted.includes(cardOwner(card));
          return html`<li class=${(extra ? "skip " : "") + (c ? "k-" + c.kind : "")}><span>${nameOf(c)}${extra ? " · extra, will be skipped" : ""}</span>
            <span class="row"><button class="iconbtn" aria-label="Move up" disabled=${i === 0} onClick=${() => act(x => { [x.deck[i - 1], x.deck[i]] = [x.deck[i], x.deck[i - 1]]; })}>↑</button>
            <button class="iconbtn" aria-label="Move down" disabled=${i === e.deck.length - 1} onClick=${() => act(x => { [x.deck[i + 1], x.deck[i]] = [x.deck[i], x.deck[i + 1]]; })}>↓</button>
            <button class="iconbtn" aria-label="Remove this card" onClick=${() => act(x => { x.deck.splice(i, 1); })}>×</button></span></li>`; })}</ol>`}

        <div class="lbl" style="margin-top:18px">In this encounter</div>
        <div class="roster-list">${e.combatants.length ? e.combatants.map(c => html`<div class=${"crow k-" + c.kind + (c.out ? " out" : "")}>
            <span class=${"kindmark sm " + c.kind}>${c.kind === "pc" ? "C" : c.kind === "enemy" ? "E" : "✦"}</span>
            <span class="cname">${nameOf(c)}<small class="muted"> · ${c.kind === "effect" ? (c.recurring ? "every round" : c.out ? "spent" : "once") : `${cardCount(c, charMap) > 1 ? "2 cards" : "1 card"}, Dex ${combatantDex(c, charMap)}`}</small></span>
            ${c.kind === "enemy" && num(c.hpMax) > 0 && html`<span class="calc">${num(c.hp)}/${num(c.hpMax)} HP</span>`}
            <button class="btn small" onClick=${() => act(x => { const y = x.combatants.find(z => z.id === c.id); y.out = !y.out; if (y.out) x.deck = x.deck.filter(card => cardOwner(card) !== c.id); })}>${c.out ? "Return" : c.kind === "effect" ? "Disable" : "Out"}</button>
            <button class="iconbtn" aria-label=${`Remove ${nameOf(c)}`} onClick=${() => act(x => { x.combatants = x.combatants.filter(z => z.id !== c.id); x.deck = x.deck.filter(card => cardOwner(card) !== c.id); if (x.current && cardOwner(x.current) === c.id) x.current = null; })}>×</button>
          </div>`) : html`<p class="muted">No one yet.</p>`}</div>

        <div class="lbl" style="margin-top:18px">Add to the deck</div>
        <${AddPanel} e=${e} party=${party} charMap=${charMap} act=${act} />

        <div class="row" style="margin-top:18px">
          ${confirmEnd ? html`<span class="confirm">End the encounter and clear the deck for everyone?
              <button class="btn small danger" onClick=${() => { Store.saveEncounter(blankEncounter()); setConfirmEnd(false); setReveal(false); }}>End encounter</button>
              <button class="btn small" onClick=${() => setConfirmEnd(false)}>Keep</button></span>`
            : html`<button class="btn danger" disabled=${!e.combatants.length} onClick=${() => setConfirmEnd(true)}>End encounter</button>
              <button class="btn" disabled=${!e.combatants.length} onClick=${() => act(x => { x.round = 0; x.deck = []; x.drawn = []; x.current = null; x.acted = []; x.combatants.forEach(c => { if (c.kind === "effect" && !c.recurring) c.out = false; }); })}>Restart from round 1</button>`}
        </div>
      </section>

      <section class="frame"><${Sigils} seed="party" n=${1} lead="attr" side="l" />
        <h2 class="h"><span>Party</span><i class="orn" aria-hidden="true"></i></h2>
        <p class="sub">${party.length} character${party.length === 1 ? "" : "s"}${camp !== "all" ? ` in ${camp === "none" ? "no campaign" : camp}` : ""}. Damage, heal and add wounds right here.</p>
        <div class="partylist">${party.map(c => html`<${PartyCard} key=${c.id} c=${c} inDeck=${e.combatants.some(x => x.charId === c.id)} updateChar=${updateChar} openChar=${openChar}
            onAdd=${() => act(x => addCharacter(x, c, charMap, "shuffle"))} />`)}
          ${!party.length && html`<p class="muted">No characters here yet. Set a character's campaign on their sheet.</p>`}</div>
      </section>
    </div>
    <${BackupPanel} chars=${chars} />
  </div>`;
}

render(html`<${App} />`, document.getElementById("app"));
