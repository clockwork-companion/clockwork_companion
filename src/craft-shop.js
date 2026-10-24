/* ================= crafting: the workshop (jobs between players) ================= */
// A weaponsmith or armorsmith can repair another player's weapon or suit, or craft one for them, without the item
// changing hands in the app. The owner sends a copy of one item (a "job"); it shows on the smith's Repair bench; the
// smith rolls with their own skill and materials; then the owner's app writes the result onto the real item and
// clears the job. A weapon or suit "made for" someone becomes a gift job that the recipient's app adds to their Gear.
// The roster (one card per character: name, who plays it, Weapon and Armor Maintenance) says who can take jobs.
// Players can't open each other's characters, so only the owner's (or recipient's) app ever changes their sheet.
const SHOP_MIN = 3;   // Weapon/Armor Maintenance needed to take jobs (the book's repairs start at 3)
const SHOP_SKILL = { weapon: "Weapon Maintenance", armor: "Armor Maintenance" };

const Shop = {
  started: false, jobs: [], roster: [], err: "", listeners: new Set(), cards: {}, busy: new Set(), updater: null,
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
    this.jobs.filter(j => j.from.char === id || j.to.char === id).forEach(j => this.del(j.id));
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
  // The owner sends one item to a smith.
  send(kind, c, item, smith) {
    const it = clean(item);
    if (kind === "armor") it.jobMax = R.armorCheck(norm(c), item).soakMax;   // the wearer's own Soak maximum
    return this.put({ id: "j" + rid(), kind, mode: "repair", from: this.party(c), to: { char: smith.id, name: smith.name, uids: smith.uids || [] }, item: it, status: "open", t: Date.now() });
  },
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
        if (j.status === "declined") { addLog(x, `${j.to.name} sent ${label} back without repairing it`); return; }
        const r = j.result || {}, gained = num(r.gained);
        if (j.kind === "weapon") { const w = x.weapons.find(y => y.id === j.item.id); if (w) w.dur = Math.min(num(w.durMax), num(w.dur) + gained); }
        else { const a = x.armor.find(y => y.id === j.item.id); if (a) a.soak = Math.min(num(j.item.jobMax) || Infinity, num(a.soak) + gained); }
        addLog(x, `${j.to.name} repaired ${label}: +${gained} ${j.kind === "weapon" ? "Durability" : "Soak"}${r.roll ? ` (${r.roll})` : ""}`);
      });
      toast(giftIn ? `${j.from.name} sent you ${j.item.name || "a new item"}.` : j.status === "declined" ? `${j.to.name} sent ${j.item.name || "it"} back.` : `${j.to.name} repaired ${j.item.name || "your item"}.`);
      Store.flushNow(target).then(() => this.del(j.id));
    });
  },
};

function useShop() {
  const [, tick] = useState(0);
  useEffect(() => { const f = () => tick(n => n + 1); Shop.listeners.add(f); Shop.start(); return () => Shop.listeners.delete(f); }, []);
  return Shop;
}

// On the owner's Repair bench, under the picked item: send it to a smith, or see that it's away.
function ShopSend({ c, kind, item, busy }) {
  useShop();
  if (!item) return null;
  const out = Shop.outgoing(c, kind, item.id), smiths = Shop.smiths(kind, c), skill = SHOP_SKILL[kind], camp = String(c.campaign || "").trim();
  return html`<div class="shopsend">
    <h3 class="lbl">Or send it to a ${kind === "weapon" ? "weaponsmith" : "armorsmith"}</h3>
    ${Shop.err ? html`<p class="muted ptrule">${Shop.err}</p>`
      : out ? html`<div class="row shopaway"><span><span class="flag brass">At ${out.to.name}'s bench</span> Waiting for them to repair it. It stays in your Gear meanwhile.</span>
          <button class="btn small" disabled=${busy} onClick=${() => Shop.del(out.id)}>Take it back</button></div>`
      : !camp ? html`<p class="muted ptrule">Set this character's campaign on the Sheet first: you can only send things to smiths in the same campaign.</p>`
      : smiths.length === 0 ? html`<p class="muted ptrule">Nobody else in ${camp} has ${skill} ${SHOP_MIN} or more.</p>`
      : html`<p class="muted ptrule">They see only this ${kind === "weapon" ? "weapon" : "suit"}, repair it with their own roll and materials, and it comes back here.</p>
        <div class="ptopts brchips">${smiths.map(s => html`<button type="button" class="ptopt" disabled=${busy} onClick=${() => { Shop.send(kind, c, item, s); toast(`Sent to ${s.name}.`); }}>
          <b>Send to ${s.name}</b><span>${skill} ${s[kind]}</span></button>`)}</div>`}
  </div>`;
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
          <b>${j.from.name}'s ${it.name || (wpn ? "weapon" : "armor")}</b><span>${wpn ? `${it.shield ? "Shield" : it.skill} · Durability` : `${(R.ARMOR[it.type] || R.ARMOR.light).label} · AV ${num(it.av)} · Soak`} ${now}/${max}</span>
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
