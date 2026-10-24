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
    update(x => { this.restore(x, job, 0); this.give(x, job.pay);
      addLog(x, `Took ${job.item.name || "it"} back from ${job.to.name}${this.hasPay(job.pay) ? `; got ${this.payText(Object.assign({}, job.pay, { note: "" }))} back` : ""}`); });
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
  // The smith reports back (done or declined).
  answer(job, status, result) {
    if (!this.jobs.some(j => j.id === job.id)) return false;
    this.put(Object.assign({}, job, { status, result: result || null, at: Date.now() }));
    return true;
  },
  find(pred) { return this.jobs.find(pred) || null; },
  // Open jobs waiting on this character's bench.
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
  const what = kind === "weapon" ? "weaponsmith" : "armorsmith";
  const out = Shop.outgoing(c, kind, item.id);
  if (out) return html`<div class="shopgear away"><span><span class="flag brass">At ${out.to.name}'s bench</span> Can't be used until it's back.${Shop.hasPay(out.pay) || (out.pay && out.pay.note) ? ` Paid: ${Shop.payText(out.pay)}.` : ""}</span>
    <button class="btn small" onClick=${() => { Shop.recall(out, update); toast(`${item.name || "It"} is back in your hands.`); }}>Take it back</button></div>`;
  if (!open) return html`<button class="btn small shopbtn" onClick=${() => setOpen(true)}>Send to a ${what}</button>`;
  const smiths = Shop.smiths(kind, c), skill = SHOP_SKILL[kind], camp = String(c.campaign || "").trim(), id = k => `sg-${k}-${item.id}`;
  const smith = smiths.find(s => s.id === to) || (smiths.length === 1 ? smiths[0] : null);
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
    Shop.send(kind, c, item, smith, pay); toast(`Sent to ${smith.name}.`); setOpen(false); setCoins(""); setPick(""); setQty(1); setNote("");
  };
  return html`<div class="shopgear" role="group" aria-label=${`Send ${item.name || "it"} to a ${what}`}>
    <div class="row shophead"><b>Send to a ${what}</b><button class="iconbtn" aria-label="Close" onClick=${() => setOpen(false)}>×</button></div>
    ${Shop.err ? html`<p class="muted">${Shop.err}</p>`
      : !camp ? html`<p class="muted">Set this character's campaign on the Sheet first: you can only send things to smiths in the same campaign.</p>`
      : !smiths.length ? html`<p class="muted">Nobody else in ${camp} has ${skill} ${SHOP_MIN} or more.</p>`
      : html`<p class="muted">It stays in your Gear but can't be used${kind === "armor" ? " or worn" : ""} while ${smith ? smith.name : "the smith"} works on it. They see only this ${kind === "weapon" ? "weapon" : "suit"} and use their own roll and materials.</p>
      <div class="mini"><label for=${id("to")}>Smith</label><select id=${id("to")} value=${smith ? smith.id : ""} onChange=${e => setTo(e.target.value)}>
        ${!smith && html`<option value="">Pick a smith</option>`}${smiths.map(s => html`<option value=${s.id}>${s.name} · ${skill} ${s[kind]}</option>`)}</select></div>
      <div class="shoppay"><span class="lbl">Payment (optional)</span>
        <div class="grid2"><div class="mini"><label for=${id("coins")}>Coins (you have ${num(c.coins)})</label><input id=${id("coins")} type="number" min="0" max=${num(c.coins)} placeholder="0" value=${coins} onInput=${e => setCoins(e.target.value)} /></div>
          <div class="mini"><label for=${id("item")}>An item</label><select id=${id("item")} value=${pick} onChange=${e => { setPick(e.target.value); setQty(1); }}>
            <option value="">None</option>${inv.map(i => html`<option value=${i.id}>${i.name} (${num(i.qty)})</option>`)}</select></div>
          ${chosen && num(chosen.qty) > 1 && html`<div class="mini"><label for=${id("qty")}>How many</label><input id=${id("qty")} type="number" min="1" max=${num(chosen.qty)} value=${qty} onInput=${e => setQty(e.target.value)} /></div>`}
          <div class="mini wide"><label for=${id("note")}>Anything else</label><input id=${id("note")} maxlength="140" placeholder="A favour, a round of ale…" value=${note} onInput=${e => setNote(e.target.value)} /></div></div>
        <span class="muted">Coins and items leave your sheet now. ${smith ? smith.name : "The smith"} gets them when the repair is done; if it comes back unrepaired, so does the payment.</span></div>
      ${short && html`<p class="flag bad">${short}</p>`}
      <div class="row"><button class="btn primary" disabled=${!smith || !!short} onClick=${send}>${smith ? `Send to ${smith.name}` : "Send"}</button></div>`}
  </div>`;
}

// Pops up when a smith this app looks after gets a new job (once per job, in this browser).
function ShopNotice({ go }) {
  useShop();
  const [seen, setSeen] = useState(() => lsGet("cw-jobs-seen", []));
  const job = Shop.jobs.find(j => j.mode === "repair" && j.status === "open" && !seen.includes(j.id) && Shop.owns(j.to.char, j.to.uids));
  if (!job) return null;
  const done = () => { const next = [job.id, ...seen].slice(0, 100); lsSet("cw-jobs-seen", next); setSeen(next); };
  const wpn = job.kind === "weapon", it = job.item;
  const what = it.name || (wpn ? "a weapon" : `${(R.ARMOR[it.type] || R.ARMOR.light).label.toLowerCase()} armor`);
  return html`<div class="gx-veil shop-veil" onClick=${e => { if (e.target === e.currentTarget) done(); }} onKeyDown=${e => { if (e.key === "Escape") done(); }}>
    <div class="gx-choose shopnote" role="dialog" aria-modal="true" aria-labelledby="shopnote-h">
      <h2 class="ornate" id="shopnote-h">${wpn ? "A weapon" : "Armor"} for your bench</h2>
      <p><b>${job.from.name}</b> sent ${job.to.name} their <b>${what}</b> to repair.</p>
      <div class="shopnotefacts"><div class="fact"><span>${wpn ? "Durability" : "Soak"}</span><b>${wpn ? `${num(it.dur)} / ${num(it.durMax)}` : `${num(it.soak)} / ${num(it.jobMax) || num(it.soakMax)}`}</b></div>
        <div class="fact"><span>Payment</span><p>${job.pay ? Shop.payText(job.pay) : "None offered"}</p></div></div>
      <div class="row dice-btns"><button class="btn primary" onClick=${() => { done(); Shop.open(job); go(job.to.char); }}>Open the Repair bench</button>
        <button class="btn" onClick=${done}>Later</button></div>
    </div></div>`;
}

// On the smith's Repair bench: other players' items waiting for them.
function ShopJobs({ c, kind, selId, pick, busy }) {
  useShop();
  const jobs = Shop.incoming(c, kind);
  if (!jobs.length) return null;
  return html`<h3 class="lbl shoph">Jobs from other players</h3>
    <div class="ptopts amsuits">${jobs.map(j => { const it = j.item, wpn = kind === "weapon";
      const now = wpn ? num(it.dur) : num(it.soak), max = wpn ? num(it.durMax) : num(it.jobMax) || num(it.soakMax);
      return html`<div class=${"ptopt row-opt" + (selId === "job:" + j.id ? " on" : "")}>
        <button type="button" class="ptcheck" aria-pressed=${selId === "job:" + j.id} disabled=${busy} onClick=${() => pick("job:" + j.id)}>
          <b>${j.from.name}'s ${it.name || (wpn ? "weapon" : "armor")}</b>${j.pay ? html`<span class="shoppaid">Pays ${Shop.payText(j.pay)}</span>` : ""}<span>${wpn ? `${it.shield ? "Shield" : it.skill} · Durability` : `${(R.ARMOR[it.type] || R.ARMOR.light).label} · AV ${num(it.av)} · Soak`} ${now}/${max}</span>
          <i class="amtrack"><i style=${`width:${max ? (now / max) * 100 : 0}%`}></i></i></button>
        <button class="btn small shopback" disabled=${busy} title="Send it back without repairing it" onClick=${() => Shop.answer(j, "declined")}>Send back</button></div>`; })}</div>
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
