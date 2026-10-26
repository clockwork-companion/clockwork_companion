/* ================= crafting: the workshop (jobs between players) ================= */
// A weaponsmith or armorsmith can repair another player's weapon or suit, or craft one for them, without the item
// changing hands in the app. The owner sends a copy of one item (a "job"); it shows on the smith's Repair bench; the
// smith rolls with their own skill and materials; then the owner's app writes the result onto the real item and
// clears the job. The item never enters the smith's Gear. It stays in the owner's Gear, locked (it can't be used or
// worn) until it comes back repaired, or as it was if the smith sends it back or the owner takes it back.
// A weapon or suit "made for" someone becomes a gift job that the recipient's app adds to their Gear.
// The roster (one card per character: name, who plays it, Weapon and Armor Maintenance) says who can take jobs.
// Players can't open each other's characters, so only the owner's (or recipient's) app ever changes their sheet.
const SHOP_MIN = 3;   // Weapon/Armor Maintenance needed to take jobs (the book's repairs start at 3)
const SHOP_SKILL = { weapon: "Weapon Maintenance", armor: "Armor Maintenance" };
// The GM's smith: an NPC in town. Jobs sent here go to the GM table, where the GM says how much is repaired.
// The payment goes to the NPC, so nobody's sheet gets it; it comes back only if the item comes back unrepaired.
const TOWN = { id: "gm", name: "Town smith (GM)", uids: [] };

const Shop = {
  started: false, jobs: [], roster: [], err: "", listeners: new Set(), cards: {}, busy: new Set(), updater: null,
  focus: null, focusSeq: 0,   // a job the smith asked to open (from the "new job" notice)
  emit() { this.listeners.forEach(f => f()); },
  live() { return Store.mode === "live"; },
  start() {
    if (this.started || Store.mode === "loading") return;
    this.started = true;
    if (!this.live()) { this.jobs = lsGet("cw-jobs", []); Store.listeners.add(() => this.sync()); this.sync(); return; }
    const db = Store.db, docs = s => s.docs.map(d => Object.assign({}, d.data(), { id: d.id }));
    db.collection("roster").onSnapshot(s => { this.roster = docs(s); this.err = ""; this.emit(); this.publish(); }, () => this.fail());
    const onJobs = list => { this.jobs = list; this.sync(); };
    if (db.jobs) db.jobs(onJobs, () => this.fail());
    else db.collection("jobs").onSnapshot(s => onJobs(docs(s)), () => this.fail());
    Store.listeners.add(() => { this.publish(); this.sync(); });
    this.publish();
  },
  fail() { this.err = "The table's database rules don't allow the workshop yet. Ask the GM (Sinan) to update them."; this.emit(); },

  /* ---------- who's who ---------- */
  me() { return Store.table ? Store.table.uid : null; },
  // This app may change a character's sheet on its owner's behalf: in this browser, on claude.ai, by its player,
  // or by a GM for a character nobody plays.
  owns(char, uids) {
    if (!Store.chars[char]) return false;
    if (!Store.table) return true;
    const u = uids || [];
    return u.includes(this.me()) || (u.length === 0 && Store.table.role === "gm");
  },
  cardOf(c) { const n = norm(c); return { name: n.name || "Unnamed", uids: playersOf(n), campaign: String(n.campaign || "").trim(), weapon: R.wmState(n).lvl, armor: R.amState(n).lvl }; },
  // Jobs only go between characters of the same campaign; a character with no campaign set has nobody to send to.
  camp(x) { return String((x && x.campaign) || "").trim().toLowerCase(); },
  same(c, r) { const k = this.camp(c); return !!k && k === this.camp(r); },
  // Everyone at the table (characters, not companions).
  list() {
    const local = Object.values(Store.chars).filter(c => !c.companionOf).map(c => Object.assign(this.cardOf(c), { id: c.id }));
    if (!this.live()) return local;
    const byId = {}; this.roster.forEach(r => (byId[r.id] = r));
    local.forEach(r => (byId[r.id] = r));   // what this app can see is fresher than the cards
    return Object.values(byId).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  },
  smiths(kind, c) { return this.list().filter(r => r.id !== c.id && num(r[kind]) >= SHOP_MIN && this.same(c, r)); },
  card(id) { return this.list().find(r => r.id === id) || null; },
  // Keep this app's characters on the roster (only when something changed).
  publish() {
    if (!this.live() || this.err) return;
    Object.values(Store.chars).forEach(c => {
      if (c.companionOf || !(!Store.table || Store.table.role === "gm" || playersOf(c).includes(this.me()))) return;
      const card = this.cardOf(c), key = JSON.stringify(card), have = this.roster.find(r => r.id === c.id);
      if (this.cards[c.id] === key || (have && JSON.stringify({ name: have.name, uids: have.uids, campaign: have.campaign || "", weapon: have.weapon, armor: have.armor }) === key)) { this.cards[c.id] = key; return; }
      this.cards[c.id] = key;
      Store.db.doc("roster/" + c.id).set(card).catch(() => this.fail());
    });
  },
  forget(id) {
    // A smith's character is deleted: items still waiting on their bench go back to their owners, unrepaired.
    this.jobs.filter(j => j.to.char === id && j.mode === "repair" && j.status === "open").forEach(j => this.put(Object.assign({}, j, { status: "declined", result: null, at: Date.now() })));
    this.jobs.filter(j => j.from.char === id || (j.to.char === id && j.mode === "gift")).forEach(j => this.del(j.id));
    if (this.live()) Store.db.doc("roster/" + id).delete().catch(() => {});
  },

  /* ---------- jobs ---------- */
  put(job) {
    const body = clean(job); delete body.id;
    if (!this.live()) { this.jobs = [...this.jobs.filter(j => j.id !== job.id), Object.assign(body, { id: job.id })]; lsSet("cw-jobs", this.jobs); this.emit(); this.sync(); return Promise.resolve(); }
    this.jobs = [...this.jobs.filter(j => j.id !== job.id), Object.assign({}, body, { id: job.id })]; this.emit();   // show it at once; the snapshot confirms it
    return Store.db.doc("jobs/" + job.id).set(body).catch(() => { toast("Couldn't reach the workshop just now. Try again."); this.fail(); });
  },
  del(id) {
    if (!this.live()) { this.jobs = this.jobs.filter(j => j.id !== id); lsSet("cw-jobs", this.jobs); this.emit(); return; }
    Store.db.doc("jobs/" + id).delete().catch(() => {});
  },
  party(c) { const k = this.cardOf(c); return { char: c.id, name: k.name, uids: k.uids }; },
  // The owner sends one item to a smith, with an optional payment (taken from the owner's sheet by the caller).
  send(kind, c, item, smith, pay) {
    const it = clean(item);
    if (kind === "armor") it.jobMax = R.armorCheck(norm(c), item).soakMax;   // the wearer's own Soak maximum
    return this.put({ id: "j" + rid(), kind, mode: "repair", from: this.party(c), to: { char: smith.id, name: smith.name, uids: smith.uids || [] }, item: it,
      pay: this.payClean(pay), status: "open", t: Date.now() });
  },
  // The owner takes an item back before it's repaired; the payment comes back with it.
  recall(job, update) {
    const cur = this.jobs.find(j => j.id === job.id) || job, g = num((cur.result || {}).gained);
    update(x => { this.restore(x, cur, g); this.give(x, cur.pay);
      addLog(x, `Took ${cur.item.name || "it"} back from ${cur.to.name}${g ? ` (+${g} ${cur.kind === "weapon" ? "Durability" : "Soak"} so far)` : ""}${this.hasPay(cur.pay) ? `; got ${this.payText(Object.assign({}, cur.pay, { note: "" }))} back` : ""}`); });
    this.del(job.id);
  },
  // Hand a job's item back to the owner, with any durability or soak the smith restored (if it was removed from
  // their Gear meanwhile, it comes back as it was sent).
  restore(x, job, gained) {
    const it = Object.assign({}, job.item); delete it.jobMax;
    const list = job.kind === "weapon" ? x.weapons : x.armor;
    let mine = list.find(y => y.id === it.id);
    if (!mine) { mine = it; if (job.kind === "armor") mine.worn = false; list.push(mine); }
    if (job.kind === "weapon") mine.dur = Math.min(num(mine.durMax), num(mine.dur) + num(gained));
    else mine.soak = Math.min(num(job.item.jobMax) || Infinity, num(mine.soak) + num(gained));
  },


  /* ---------- payment: coins, things from the inventory, and a note ---------- */
  payClean(pay) {
    const p = pay || {}, coins = Math.max(0, Math.floor(num(p.coins)));
    const items = (p.items || []).filter(i => i && i.name && num(i.qty) > 0).map(i => ({ name: String(i.name), qty: Math.floor(num(i.qty)), size: i.size || "small" }));
    const note = String(p.note || "").trim().slice(0, 140);
    return coins || items.length || note ? { coins, items, note } : null;
  },
  hasPay(p) { return !!p && (num(p.coins) > 0 || (p.items || []).length > 0); },
  payText(p) {
    if (!p) return "nothing";
    const bits = [];
    if (num(p.coins)) bits.push(`${num(p.coins)} coins`);
    (p.items || []).forEach(i => bits.push(`${num(i.qty) > 1 ? num(i.qty) + " × " : ""}${i.name}`));
    if (p.note) bits.push(`"${p.note}"`);
    return bits.length ? bits.join(", ") : "nothing";
  },
  // Put coins and items onto a character (the smith on a finished job, or the owner on a refund).
  give(x, p) {
    if (!p) return;
    x.coins = num(x.coins) + num(p.coins);
    (p.items || []).forEach(i => {
      const have = x.items.find(y => (y.name || "").trim().toLowerCase() === i.name.trim().toLowerCase() && (y.size || "small") === (i.size || "small"));
      if (have) have.qty = num(have.qty) + num(i.qty); else x.items.push({ id: rid(), name: i.name, qty: num(i.qty), size: i.size || "small" });
    });
  },
  // Take the payment off the owner's sheet when they send. Returns false if they no longer have it.
  take(x, p) {
    if (!p) return true;
    if (num(p.coins) > num(x.coins)) return false;
    for (const i of p.items || []) { const have = x.items.find(y => y.name === i.name && (y.size || "small") === (i.size || "small")); if (!have || num(have.qty) < num(i.qty)) return false; }
    x.coins = num(x.coins) - num(p.coins);
    (p.items || []).forEach(i => { const k = x.items.findIndex(y => y.name === i.name && (y.size || "small") === (i.size || "small")); x.items[k].qty = num(x.items[k].qty) - num(i.qty); if (x.items[k].qty <= 0) x.items.splice(k, 1); });
    return true;
  },
  // The notice's "Open the Repair bench": the Crafting tab and the bench look for this.
  open(job) { this.focus = { kind: job.kind, sel: "job:" + job.id, char: job.to.char }; this.focusSeq++; lsSet("cw-craft-sub", job.kind); lsSet(job.kind === "weapon" ? "cw-wm-mode" : "cw-am-mode", "repair"); this.emit(); },
  // The smith hands a finished craft to someone.
  gift(kind, c, item, to) {
    return this.put({ id: "j" + rid(), kind, mode: "gift", from: this.party(c), to: { char: to.id, name: to.name, uids: to.uids || [] }, item: clean(item), status: "open", t: Date.now() });
  },
  // The item as it stands on the smith's bench: the copy that was sent, plus the repairs made so far.
  view(job) {
    const it = Object.assign({}, job.item), g = num((job.result || {}).gained);
    if (job.kind === "weapon") it.dur = Math.min(num(it.durMax), num(it.dur) + g);
    else it.soak = Math.min(num(it.jobMax) || num(it.soakMax), num(it.soak) + g);
    return it;
  },
  // One repair on the smith's bench: added to the job, which stays open so the smith can repair again.
  progress(job, gained, roll, by) {
    const cur = this.jobs.find(j => j.id === job.id);
    if (!cur || cur.status !== "open") return false;
    const r = cur.result || {};
    this.put(Object.assign({}, cur, { result: { gained: num(r.gained) + num(gained), rolls: [...(r.rolls || []), roll].slice(-12), times: num(r.times) + 1, by } }));
    return true;
  },
  // The smith is done: the item goes back with every repair made, and the payment goes to the smith.
  finish(job, update, by) {
    const cur = this.jobs.find(j => j.id === job.id);
    if (!cur || cur.status !== "open") return false;
    const r = cur.result || {}, g = num(r.gained), what = cur.item.name || (cur.kind === "weapon" ? "weapon" : "armor");
    this.answer(cur, "done", { gained: g, roll: (r.rolls || []).join("; "), times: num(r.times), by });
    if (update) update(x => { this.give(x, cur.pay);
      addLog(x, `Sent ${cur.from.name}'s ${what} back: +${g} ${cur.kind === "weapon" ? "Durability" : "Soak"}${this.hasPay(cur.pay) ? `; paid ${this.payText(Object.assign({}, cur.pay, { note: "" }))}` : ""}`); });
    return true;
  },
  // The smith reports back (done or declined).
  answer(job, status, result) {
    if (!this.jobs.some(j => j.id === job.id)) return false;
    this.put(Object.assign({}, job, { status, result: result || null, at: Date.now() }));
    return true;
  },
  find(pred) { return this.jobs.find(pred) || null; },
  // Open jobs waiting on this character's bench.
  townJobs() { return this.jobs.filter(j => j.mode === "repair" && j.status === "open" && j.to.char === TOWN.id); },
  incoming(c, kind) { return this.jobs.filter(j => j.kind === kind && j.mode === "repair" && j.status === "open" && j.to.char === c.id); },
  outgoing(c, kind, itemId) { return this.find(j => j.kind === kind && j.mode === "repair" && j.from.char === c.id && j.item.id === itemId && j.status === "open"); },

  // Write finished jobs onto the sheets this app looks after, then clear them.
  sync() {
    this.emit();
    if (!this.updater) return;
    this.jobs.forEach(j => {
      if (this.busy.has(j.id)) return;
      const repairBack = j.mode === "repair" && j.status !== "open" && this.owns(j.from.char, j.from.uids);
      const giftIn = j.mode === "gift" && this.owns(j.to.char, j.to.uids);
      if (!repairBack && !giftIn) return;
      this.busy.add(j.id);
      const target = repairBack ? j.from.char : j.to.char;
      this.updater(target, x => {
        if (!Array.isArray(x.craft.jobsDone)) x.craft.jobsDone = [];
        if (x.craft.jobsDone.includes(j.id)) return;
        x.craft.jobsDone = [j.id, ...x.craft.jobsDone].slice(0, 40);
        const label = j.item.name || (j.kind === "weapon" ? "Weapon" : `${(R.ARMOR[j.item.type] || R.ARMOR.light).label} armor`);
        if (giftIn) {
          if (j.kind === "weapon") x.weapons.push(Object.assign({}, j.item, { id: rid(), where: "pack" }));
          else x.armor.push(Object.assign({}, j.item, { id: rid(), worn: false }));
          addLog(x, `${j.from.name} made ${label} for you; it's in your Gear now`);
          return;
        }
        if (j.status === "declined") { this.restore(x, j, 0); this.give(x, j.pay); addLog(x, `${j.to.name} sent ${label} back without repairing it${this.hasPay(j.pay) ? `; your ${this.payText(Object.assign({}, j.pay, { note: "" }))} came back too` : ""}`); return; }
        const r = j.result || {}, gained = num(r.gained);
        this.restore(x, j, gained);
        addLog(x, `${j.to.name} repaired ${label}: +${gained} ${j.kind === "weapon" ? "Durability" : "Soak"}${r.roll ? ` (${r.roll})` : ""}`);
      });
      toast(giftIn ? `${j.from.name} sent you ${j.item.name || "a new item"}.` : j.status === "declined" ? `${j.to.name} sent ${j.item.name || "it"} back unrepaired.` : `${j.to.name} repaired ${j.item.name || "your item"}.`);
      Store.flushNow(target).then(() => this.del(j.id));
    });
  },
};

function useShop() {
  const [, tick] = useState(0);
  useEffect(() => { const f = () => tick(n => n + 1); Shop.listeners.add(f); Shop.start(); return () => Shop.listeners.delete(f); }, []);
  return Shop;
}

// On a weapon or armor card in the Gear tab: send it to a smith (with a payment), or see that it's away.
function ShopGear({ c, kind, item, update }) {
  useShop();
  const [open, setOpen] = useState(false), [to, setTo] = useState(""), [coins, setCoins] = useState(""), [pick, setPick] = useState(""), [qty, setQty] = useState(1), [note, setNote] = useState("");
  const out = Shop.outgoing(c, kind, item.id);
  if (out) return html`<div class="shopgear away"><span><span class="flag brass">With ${out.to.name}</span> Can't be used until it's back.${Shop.hasPay(out.pay) || (out.pay && out.pay.note) ? ` Paid: ${Shop.payText(out.pay)}.` : ""}</span>
    <button class="btn small" onClick=${() => { Shop.recall(out, update); toast(`${item.name || "It"} is back in your hands.`); }}>Take it back</button></div>`;
  if (!open) return html`<button class="btn small shopbtn" onClick=${() => setOpen(true)}>Send for repair</button>`;
  // Another player's smith (same campaign, Maintenance 3+), or the GM's smith in town.
  const players = Shop.smiths(kind, c), skill = SHOP_SKILL[kind], camp = String(c.campaign || "").trim(), id = k => `sg-${k}-${item.id}`;
  const smiths = [...players, TOWN];
  const smith = smiths.find(s => s.id === to) || (smiths.length === 1 ? smiths[0] : null);
  const town = smith && smith.id === TOWN.id;
  const inv = c.items.filter(i => i.name && num(i.qty) > 0), chosen = inv.find(i => i.id === pick) || null;
  const pay = { coins: num(coins), items: chosen ? [{ name: chosen.name, qty: R.clamp(num(qty) || 1, 1, num(chosen.qty)), size: chosen.size || "small" }] : [], note };
  const short = num(coins) > num(c.coins) ? `${c.name || "This character"} has only ${num(c.coins)} coins.` : "";
  const send = () => {
    if (!smith || short) return;
    let ok = true;
    // The payment leaves this sheet; the item stays, locked, and a worn suit comes off.
    update(x => { ok = Shop.take(x, Shop.payClean(pay)); if (!ok) return;
      if (kind === "armor") { const a = x.armor.find(y => y.id === item.id); if (a) a.worn = false; }
      addLog(x, `Sent ${item.name || "a " + kind} to ${smith.name} for repair${Shop.payClean(pay) ? `, paying ${Shop.payText(Shop.payClean(pay))}` : ""}`); });
    if (!ok) { toast("That payment isn't on the sheet any more."); return; }
    Shop.send(kind, c, item, smith, pay); toast(town ? "Sent to the town smith. The GM will see it on the GM table." : `Sent to ${smith.name}.`); setOpen(false); setCoins(""); setPick(""); setQty(1); setNote("");
  };
  return html`<div class="shopgear" role="group" aria-label=${`Send ${item.name || "it"} for repair`}>
    <div class="row shophead"><b>Send for repair</b><button class="iconbtn" aria-label="Close" onClick=${() => setOpen(false)}>×</button></div>
    ${Shop.err ? html`<p class="muted">${Shop.err}</p>`
      : html`<div class="mini"><label for=${id("to")}>Who repairs it</label><select id=${id("to")} value=${smith ? smith.id : ""} onChange=${e => setTo(e.target.value)}>
        ${!smith && html`<option value="">Pick a smith</option>`}${players.map(s => html`<option value=${s.id}>${s.name} · ${skill} ${s[kind]}</option>`)}<option value=${TOWN.id}>${TOWN.name}: an NPC smith</option></select></div>
      <p class="muted">${!camp ? "Set a campaign on the Sheet to send it to other players' smiths too. "
        : !players.length ? `Nobody else in ${camp} has ${skill} ${SHOP_MIN} or more. ` : ""}${!smith ? "" : town
        ? `The GM decides how much the town smith repairs. The payment goes to the smith, so nobody's sheet gets it. It stays in your Gear but can't be used${kind === "armor" ? " or worn" : ""} until it's back.`
        : `It stays in your Gear but can't be used${kind === "armor" ? " or worn" : ""} while ${smith.name} works on it. They see only this ${kind === "weapon" ? "weapon" : "suit"} and use their own roll and materials.`}</p>
      <div class="shoppay"><span class="lbl">Payment (optional)</span>
        <div class="grid2"><div class="mini"><label for=${id("coins")}>Coins (you have ${num(c.coins)})</label><input id=${id("coins")} type="number" min="0" max=${num(c.coins)} placeholder="0" value=${coins} onInput=${e => setCoins(e.target.value)} /></div>
          <div class="mini"><label for=${id("item")}>An item</label><select id=${id("item")} value=${pick} onChange=${e => { setPick(e.target.value); setQty(1); }}>
            <option value="">None</option>${inv.map(i => html`<option value=${i.id}>${i.name} (${num(i.qty)})</option>`)}</select></div>
          ${chosen && num(chosen.qty) > 1 && html`<div class="mini"><label for=${id("qty")}>How many</label><input id=${id("qty")} type="number" min="1" max=${num(chosen.qty)} value=${qty} onInput=${e => setQty(e.target.value)} /></div>`}
          <div class="mini wide"><label for=${id("note")}>Anything else</label><input id=${id("note")} maxlength="140" placeholder="A favour, a round of ale…" value=${note} onInput=${e => setNote(e.target.value)} /></div></div>
        <span class="muted">Coins and items leave your sheet now. ${town ? "The town smith keeps them" : `${smith ? smith.name : "The smith"} gets them`} when the repair is done; if it comes back unrepaired, so does the payment.</span></div>
      ${short && html`<p class="flag bad">${short}</p>`}
      <div class="row"><button class="btn primary" disabled=${!smith || !!short} onClick=${send}>${!smith ? "Send" : town ? "Send to the town smith" : `Send to ${smith.name}`}</button></div>`}
  </div>`;
}

// On the GM table: items players sent to the town smith (an NPC). The GM says how much is repaired and sends it back.
function TownSmith() {
  useShop();
  const jobs = Shop.townJobs();
  const [amt, setAmt] = useState({});
  if (!jobs.length) return null;
  return html`<section class="frame townsmith"><h2 class="h"><span>Town smith</span><i class="orn" aria-hidden="true"></i></h2>
    <p class="sub">Players sent these to an NPC smith. Say how much the smith restores (full by default) and send it back. The payment stays with the smith.</p>
    <div class="cards">${jobs.map(j => { const it = j.item, wpn = j.kind === "weapon", unit = wpn ? "Durability" : "Soak";
      const now = wpn ? num(it.dur) : num(it.soak), max = wpn ? num(it.durMax) : num(it.jobMax) || num(it.soakMax), miss = Math.max(0, max - now);
      const v = amt[j.id] == null ? miss : amt[j.id], give = R.clamp(num(v), 0, miss), fid = "ts-" + j.id;
      return html`<div class="wcard townjob">
        <div class="title"><b class="wname">${j.from.name}'s ${it.name || (wpn ? "weapon" : `${(R.ARMOR[it.type] || R.ARMOR.light).label} armor`)}</b></div>
        <div class="wsub">${wpn ? `${it.shield ? "Shield" : it.skill} · ${num(it.hands) === 2 ? "two-handed" : "one-handed"}` : `${(R.ARMOR[it.type] || R.ARMOR.light).label} · AV ${num(it.av)}`}</div>
        <div class="wdur"><span class="lbl">${unit} ${now} / ${max}</span><div class="track"><i style=${`width:${max ? (now / max) * 100 : 0}%;background:var(--ink-2)`}></i></div></div>
        <p class="muted">Paid: ${Shop.payText(j.pay)}</p>
        <div class="mini townamt"><label for=${fid}>${unit} restored (up to ${miss})</label>
          <input id=${fid} type="number" min="0" max=${miss} value=${v} onInput=${e => setAmt(a => Object.assign({}, a, { [j.id]: e.target.value }))} /></div>
        <div class="row townrow"><button class="btn primary" onClick=${() => { Shop.answer(j, "done", { gained: give, roll: "set by the GM", times: 1, by: TOWN.name }); toast(`${j.from.name}'s ${it.name || "item"} goes back with +${give} ${unit}.`); }}>Send it back</button>
          <button class="btn" title="Send it back without repairing it; the payment goes back too" onClick=${() => { Shop.answer(j, "declined"); toast(`${j.from.name}'s ${it.name || "item"} goes back unrepaired.`); }}>Send back unrepaired</button></div>
      </div>`; })}</div></section>`;
}

// Pops up when a smith this app looks after gets a new job (once per job, in this browser).
// Only while that smith's character is the one open, so the player who sent it never sees it (in this browser only,
// or as a GM, one app can hold both characters).
// The town smith's jobs pop up for the GM, anywhere except on the sheet that sent them.
function ShopNotice({ go, goGm, current, onGm }) {
  useShop();
  const [seen, setSeen] = useState(() => lsGet("cw-jobs-seen", []));
  const fresh = j => j.mode === "repair" && j.status === "open" && !seen.includes(j.id) && !num((j.result || {}).times);
  const job = Shop.jobs.find(j => fresh(j) && (j.to.char === TOWN.id ? isGM() && !onGm && j.from.char !== current
    : current && j.to.char === current && j.from.char !== current && Shop.owns(j.to.char, j.to.uids))) || null;
  if (!job) return null;
  const done = () => { const next = [job.id, ...seen].slice(0, 100); lsSet("cw-jobs-seen", next); setSeen(next); };
  const wpn = job.kind === "weapon", it = job.item;
  const what = it.name || (wpn ? "a weapon" : `${(R.ARMOR[it.type] || R.ARMOR.light).label.toLowerCase()} armor`);
  return html`<div class="gx-veil shop-veil" onClick=${e => { if (e.target === e.currentTarget) done(); }} onKeyDown=${e => { if (e.key === "Escape") done(); }}>
    <div class="gx-choose shopnote" role="dialog" aria-modal="true" aria-labelledby="shopnote-h">
      <h2 class="ornate" id="shopnote-h">${job.to.char === TOWN.id ? "A job for the town smith" : `${wpn ? "A weapon" : "Armor"} for your bench`}</h2>
      <p><b>${job.from.name}</b> ${job.to.char === TOWN.id ? html`took their <b>${what}</b> to the town smith. You decide how much is repaired.` : html`sent ${job.to.name} their <b>${what}</b> to repair.`}</p>
      <div class="shopnotefacts"><div class="fact"><span>${wpn ? "Durability" : "Soak"}</span><b>${wpn ? `${num(it.dur)} / ${num(it.durMax)}` : `${num(it.soak)} / ${num(it.jobMax) || num(it.soakMax)}`}</b></div>
        <div class="fact"><span>Payment</span><p>${job.pay ? Shop.payText(job.pay) : "None offered"}</p></div></div>
      <div class="row dice-btns">${job.to.char === TOWN.id ? html`<button class="btn primary" onClick=${() => { done(); goGm(); }}>Open the GM table</button>`
        : html`<button class="btn primary" onClick=${() => { done(); Shop.open(job); go(job.to.char); }}>Open the Repair bench</button>`}
        <button class="btn" onClick=${done}>Later</button></div>
    </div></div>`;
}

// On the smith's Repair bench: other players' items waiting for them.
function ShopJobs({ c, kind, selId, pick, busy, update }) {
  useShop();
  const jobs = Shop.incoming(c, kind);
  if (!jobs.length) return null;
  return html`<h3 class="lbl shoph">Jobs from other players</h3>
    <div class="ptopts amsuits">${jobs.map(j => { const it = Shop.view(j), wpn = kind === "weapon", r = j.result || {};
      const now = wpn ? num(it.dur) : num(it.soak), max = wpn ? num(it.durMax) : num(it.jobMax) || num(it.soakMax);
      return html`<div class=${"ptopt row-opt" + (selId === "job:" + j.id ? " on" : "")}>
        <button type="button" class="ptcheck" aria-pressed=${selId === "job:" + j.id} disabled=${busy} onClick=${() => pick("job:" + j.id)}>
          <b>${j.from.name}'s ${it.name || (wpn ? "weapon" : "armor")}</b>${j.pay ? html`<span class="shoppaid">Pays ${Shop.payText(j.pay)}</span>` : ""}${num(r.times) ? html`<span class="shoppaid">Repaired ${num(r.times) === 1 ? "once" : num(r.times) + " times"}: +${num(r.gained)} so far</span>` : ""}<span>${wpn ? `${it.shield ? "Shield" : it.skill} · Durability` : `${(R.ARMOR[it.type] || R.ARMOR.light).label} · AV ${num(it.av)} · Soak`} ${now}/${max}</span>
          <i class="amtrack"><i style=${`width:${max ? (now / max) * 100 : 0}%`}></i></i></button>
        ${num(r.times) ? html`<button class="btn small primary shopback" disabled=${busy} title="Send it back with the repairs made" onClick=${() => { Shop.finish(j, update, c.name || ""); toast(`Sent back to ${j.from.name}.`); }}>Send it back</button>`
          : html`<button class="btn small shopback" disabled=${busy} title="Send it back without repairing it" onClick=${() => Shop.answer(j, "declined")}>Send back unrepaired</button>`}</div>`; })}</div>
    <h3 class="lbl shoph">Your own</h3>`;
}

// On a craft bench: who the finished piece is for.
function MadeFor({ c, value, onSet, busy }) {
  useShop();
  const others = Shop.list().filter(r => r.id !== c.id && Shop.same(c, r));   // only characters in the same campaign
  if (!others.length) return null;
  return html`<div class="row ptbatch"><label for=${"mf-" + c.id}>Made for</label>
    <select id=${"mf-" + c.id} class="inp" value=${value || ""} disabled=${busy} onChange=${e => onSet(e.target.value)}>
      <option value="">Me (my Gear)</option>${others.map(r => html`<option value=${r.id}>${r.name}</option>`)}</select>
    <span class="muted">It goes straight to their Gear; your materials pay for it.</span></div>`;
}
