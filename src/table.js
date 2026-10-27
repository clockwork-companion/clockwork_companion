/* ================= the Table page: the campaign as the players see it ================= */
// A page for everyone at the table, beside Characters and the GM table. For the campaign picked at the top:
//   - a banner with the campaign's name, a line of flavour and the next session (GM),
//   - the setting and "Last time…" (a recap), written by the GM,
//   - handouts: letters, maps, faces; the GM writes them hidden and shows them when the moment comes,
//   - the party: every character in the campaign with who plays them; click one for their attributes and short bio,
//   - the party stash: coins and items the whole party shares, which anyone can change.
// Where it lives: tables/<t>/board/<campaign> (GM writes, everyone reads), tables/<t>/stash/<campaign> (everyone),
// tables/<t>/handouts/<id> (GM writes; players read only the ones shown). In "this browser only" mode, localStorage.
// The party comes from the workshop's roster (Shop.list()): one public card per character, which players can read.

const boardKey = camp => String(camp || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "table";
const Board = {
  started: false, boards: {}, stashes: {}, handouts: [], err: "", listeners: new Set(),
  emit() { this.listeners.forEach(f => f()); },
  live() { return Store.mode === "live"; },
  start() {
    if (this.started || Store.mode === "loading") return;
    this.started = true;
    if (!this.live()) { const l = lsGet("cw-board", {}); this.boards = l.boards || {}; this.stashes = l.stashes || {}; this.handouts = l.handouts || []; this.emit(); return; }
    const db = Store.db, byId = s => { const o = {}; s.docs.forEach(d => (o[d.id] = d.data())); return o; };
    const fail = () => { this.err = "The table's database rules don't allow the Table page yet. Ask the GM (Sinan) to update them."; this.emit(); };
    db.collection("board").onSnapshot(s => { this.boards = byId(s); this.emit(); }, fail);
    db.collection("stash").onSnapshot(s => { this.stashes = byId(s); this.emit(); }, fail);
    const ho = db.collection("handouts");
    (isGM() ? ho : ho.where("shown", "==", true)).onSnapshot(s => { this.handouts = s.docs.map(d => Object.assign({}, d.data(), { id: d.id })); this.emit(); }, fail);
  },
  saveLocal() { lsSet("cw-board", { boards: this.boards, stashes: this.stashes, handouts: this.handouts }); this.emit(); },
  board(camp) { return Object.assign({ tagline: "", setting: "", recap: "", next: "" }, this.boards[boardKey(camp)]); },
  stash(camp) { const s = this.stashes[boardKey(camp)] || {}; return { coins: num(s.coins), items: Array.isArray(s.items) ? s.items : [] }; },
  setBoard(camp, patch) {
    const k = boardKey(camp), next = Object.assign(this.board(camp), patch, { camp: String(camp || ""), at: Date.now() });
    this.boards[k] = next;
    if (!this.live()) return this.saveLocal();
    this.emit(); Store.db.doc("board/" + k).set(clean(next)).catch(() => toast("Couldn't save that. Only a GM can write the Table page."));
  },
  setStash(camp, fn) {
    const k = boardKey(camp), s = this.stash(camp); fn(s); s.at = Date.now();
    this.stashes[k] = s;
    if (!this.live()) return this.saveLocal();
    this.emit(); Store.db.doc("stash/" + k).set(clean(s)).catch(() => toast("Couldn't save the stash just now."));
  },
  putHandout(h) {
    const body = clean(Object.assign({}, h, { at: Date.now() })); const id = h.id || rid(); delete body.id;
    this.handouts = [...this.handouts.filter(x => x.id !== id), Object.assign({}, body, { id })];
    if (!this.live()) return this.saveLocal();
    this.emit(); Store.db.doc("handouts/" + id).set(body).catch(() => toast("Couldn't save that handout. Only a GM can."));
  },
  dropHandout(id) {
    this.handouts = this.handouts.filter(x => x.id !== id);
    if (!this.live()) return this.saveLocal();
    this.emit(); Store.db.doc("handouts/" + id).delete().catch(() => {});
  },
};
function useBoard() { const [, f] = useState(0); useEffect(() => { const g = () => f(x => x + 1); Board.listeners.add(g); Board.start(); return () => Board.listeners.delete(g); }, []); }

// Light markdown for the GM's text: blank lines make paragraphs, **bold** and *italics*.
function Prose({ text, empty }) {
  const paras = String(text || "").split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  if (!paras.length) return html`<p class="muted">${empty}</p>`;
  const inline = p => p.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map(x => x.startsWith("**") ? html`<b>${x.slice(2, -2)}</b>` : x.startsWith("*") && x.length > 2 ? html`<i>${x.slice(1, -1)}</i>` : x.split("\n").map((l, i) => (i ? [html`<br />`, l] : l)));
  return html`<div class="tprose">${paras.map(p => html`<p>${inline(p)}</p>`)}</div>`;
}
// A section of GM-written text: read for everyone, an Edit button for GMs.
function GmText({ title, icon, camp, field, empty, rows = 6, hint }) {
  const b = Board.board(camp); const [edit, setEdit] = useState(null);
  return html`<section class="tsec"><div class="tsech"><${Banner} title=${title} i=${icon} tag="h3" />
      ${isGM() && !edit && html`<button type="button" class="btn small" onClick=${() => setEdit(b[field] || "")}>Edit</button>`}</div>
    ${edit !== null ? html`<div class="tedit"><textarea class="inp" rows=${rows} aria-label=${title} placeholder=${hint} value=${edit} onInput=${e => setEdit(e.target.value)}></textarea>
        <div class="row"><button class="btn small primary" onClick=${() => { Board.setBoard(camp, { [field]: edit }); setEdit(null); }}>Save</button><button class="btn small" onClick=${() => setEdit(null)}>Cancel</button>
          <span class="muted">Leave a blank line between paragraphs. **bold**, *italics*.</span></div></div>`
      : html`<${Prose} text=${b[field]} empty=${empty} />`}
  </section>`;
}

const when = iso => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); };
const until = iso => {
  const ms = new Date(iso) - Date.now(); if (isNaN(ms)) return "";
  if (ms < 0) return ms > -6 * 3600e3 ? "now" : "past";
  const h = ms / 3600e3; return h < 1 ? "within the hour" : h < 24 ? `in ${Math.round(h)} hour${Math.round(h) === 1 ? "" : "s"}` : `in ${Math.round(h / 24)} day${Math.round(h / 24) === 1 ? "" : "s"}`;
};

function TableView({ chars, current }) {
  useBoard(); useShop();
  const known = [...new Set([...CAMPAIGNS, ...Shop.list().map(r => r.campaign).filter(Boolean)])];
  const [camp, setCamp] = useState(() => { const v = lsGet("cw-table-camp", ""); return v || (current && current.campaign) || CAMPAIGNS[0]; });
  useEffect(() => lsSet("cw-table-camp", camp), [camp]);
  const gm = isGM(), b = Board.board(camp);
  const [head, setHead] = useState(null);   // the GM editing the banner: { tagline, next }
  const [who, setWho] = useState(null);     // a party member opened in the side panel
  const party = Shop.list().filter(r => (r.campaign || "") === camp);
  return html`<div class="tabpane tablepage">
    ${Board.err && html`<div class="banner">${Board.err}</div>`}
    <div class="row campbar" role="group" aria-label="Campaign"><span class="lbl">Campaign</span>${known.map(k => html`<button type="button" class=${"btn small" + (k === camp ? " primary" : "")} aria-pressed=${k === camp} onClick=${() => setCamp(k)}>${k}</button>`)}</div>

    <header class="thero">
      <div class="thtext"><span class="lbl">${Store.table ? Store.table.name : "This table"}</span><h1 class="ornate">${camp}</h1>
        ${head ? html`<input class="inp" aria-label="A line about the campaign" placeholder="An alien world, and the tears that fell on it…" value=${head.tagline} onInput=${e => setHead(Object.assign({}, head, { tagline: e.target.value }))} />`
          : b.tagline ? html`<p class="tline">${b.tagline}</p>` : gm ? html`<p class="tline muted">Add a line about the campaign.</p>` : ""}</div>
      <div class="tnext"><span class="lbl">Next session</span>
        ${head ? html`<input class="inp" type="datetime-local" aria-label="Next session" value=${head.next} onInput=${e => setHead(Object.assign({}, head, { next: e.target.value }))} />`
          : b.next ? html`<b>${when(b.next)}</b><small>${until(b.next)}</small>` : html`<b class="muted">Not set yet</b>`}
        ${gm && (head ? html`<div class="row"><button class="btn small primary" onClick=${() => { Board.setBoard(camp, head); setHead(null); }}>Save</button><button class="btn small" onClick=${() => setHead(null)}>Cancel</button></div>`
          : html`<button type="button" class="btn small" onClick=${() => setHead({ tagline: b.tagline, next: b.next })}>Edit</button>`)}</div>
    </header>

    <div class="tgrid">
      <div class="tcol frame">
        <${GmText} title="The setting" icon="book" camp=${camp} field="setting" rows=${10} empty=${gm ? "Write what the players should know about the world: places, powers, the mood of the age." : "The GM hasn't written about the setting yet."} hint="The world, its powers and its mood…" />
        <${GmText} title="Last time…" icon="info" camp=${camp} field="recap" empty=${gm ? "After each session, a few lines on what happened." : "No recap yet."} hint="What happened last session…" />
      </div>
      <div class="tcol frame">
        <section class="tsec"><${Banner} title="The party" i="star" tag="h3" />
          ${party.length ? html`<div class="tparty">${party.map(r => html`<button type="button" class="tmember" onClick=${() => setWho(r)}>
              <${Thumb} c=${r} lg /><span class="who"><b>${r.name}</b><span>${[r.profession, r.player].filter(Boolean).join(" · ") || "—"}</span></span></button>`)}</div>`
            : html`<p class="muted">Nobody is playing in ${camp} yet. A character joins the party when its campaign is set to ${camp}.</p>`}</section>
        <${Stash} camp=${camp} />
      </div>
    </div>
    <${Handouts} camp=${camp} />
    ${who && html`<${MemberPanel} r=${who} onClose=${() => setWho(null)} />`}
  </div>`;
}

// One party member, opened from the party list: their face, who plays them, their attributes and short bio.
function MemberPanel({ r, onClose }) {
  const ref = useRef();
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); ref.current && ref.current.focus(); return () => window.removeEventListener("keydown", k); }, [r.id]);
  const at = r.attrs || {};
  return html`<aside class="spanel" role="dialog" aria-label=${r.name} tabindex="-1" ref=${ref}>
    <header class="sphead"><span class="sp-medal"><${PanelIcon} i="star" /></span><div class="sptt"><span class="lbl">${[r.profession, r.campaign].filter(Boolean).join(" · ") || "Character"}</span><h2>${r.name}</h2>
      ${r.player && html`<p class="spflavor">Played by ${r.player}</p>`}</div>
      <button class="iconbtn" aria-label="Close" onClick=${onClose}>×</button></header>
    <div class="spbody">
      ${portraitSrc(r) && html`<div class="tface"><${Face} c=${r} /></div>`}
      <${Banner} title="Attributes" i="shield" />
      ${Object.keys(at).length ? html`<div class="tattrs">${R.ATTRS.map(a => { const v = num(at[a.k]); return html`<div class="tattr" style=${attStyle(a.k)} title=${a.n}>
          <span class="tabadge"><${AttrGlyph} a=${a.k} /></span><span class="tan">${a.n}</span><b class=${v < 10 ? "bad" : ""}>${v}</b></div>`; })}</div>`
        : html`<p class="muted">Their attributes show once their player opens the Companion again.</p>`}
      <${Banner} title="In short" i="book" />
      <${Prose} text=${r.bio} empty="No short bio yet. Each player writes their own at the foot of the Sheet." />
    </div></aside>`;
}

// The party stash: coins and items everyone shares. Anyone at the table can change it.
function Stash({ camp }) {
  const s = Board.stash(camp); const [name, setName] = useState("");
  const add = e => { e.preventDefault(); const n = name.trim(); if (!n) return; Board.setStash(camp, x => { x.items.push({ id: rid(), name: n, qty: 1, note: "" }); }); setName(""); };
  const setItem = (i, k, v) => Board.setStash(camp, x => { x.items[i][k] = v; });
  return html`<section class="tsec"><${Banner} title="Party stash" i="table" tag="h3" />
    <div class="tcoins"><span class="lbl">Coins</span>
      <button type="button" class="iconbtn" aria-label="One coin less" onClick=${() => Board.setStash(camp, x => { x.coins = Math.max(0, x.coins - 1); })}>−</button>
      <input class="inp durin" type="number" min="0" aria-label="Coins in the stash" value=${s.coins} onChange=${e => Board.setStash(camp, x => { x.coins = Math.max(0, Math.floor(+e.target.value || 0)); })} />
      <button type="button" class="iconbtn" aria-label="One coin more" onClick=${() => Board.setStash(camp, x => { x.coins += 1; })}>+</button></div>
    ${s.items.length ? html`<div class="titems">${s.items.map((it, i) => html`<div class="titem" key=${it.id}>
        <input class="inp" aria-label="Item" value=${it.name} onChange=${e => setItem(i, "name", e.target.value)} />
        <input class="inp tqty" type="number" min="0" aria-label="How many" value=${it.qty} onChange=${e => setItem(i, "qty", Math.max(0, Math.floor(+e.target.value || 0)))} />
        <input class="inp" aria-label="Note" placeholder="Note" value=${it.note || ""} onChange=${e => setItem(i, "note", e.target.value)} />
        <button type="button" class="iconbtn" aria-label=${`Remove ${it.name}`} onClick=${() => Board.setStash(camp, x => { x.items.splice(i, 1); })}>×</button></div>`)}</div>`
      : html`<p class="muted">Nothing in the stash yet.</p>`}
    <form class="row tadd" onSubmit=${add}><input class="inp" aria-label="New item" placeholder="Add an item: a rope, a map, a strange key…" value=${name} onInput=${e => setName(e.target.value)} /><button class="btn small" type="submit">Add</button></form>
  </section>`;
}

// Handouts: the GM writes them (title, text, a picture), hidden until shown. Players see the shown ones.
function Handouts({ camp }) {
  const gm = isGM(); const k = boardKey(camp);
  const list = Board.handouts.filter(h => (h.camp || "table") === k && (gm || h.shown)).sort((a, b) => num(b.at) - num(a.at));
  const [edit, setEdit] = useState(null), [view, setView] = useState(null), [busy, setBusy] = useState(false); const file = useRef();
  const img = h => (h.img && Store.assets && Store.assets.urlFor(h.img)) || h.imgUrl || "";
  const upload = async e => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f || !Store.assets) return; setBusy(true);
    try { const r = await Store.assets.upload(f, null); setEdit(x => Object.assign({}, x, { img: r.id })); } catch { toast("Couldn't upload that picture. Use a PNG, JPG or WebP."); } setBusy(false); };
  return html`<section class="tsec thandouts frame"><div class="tsech"><${Banner} title="Handouts" i="info" tag="h3" />
      ${gm && !edit && html`<button type="button" class="btn small" onClick=${() => setEdit({ camp: k, title: "", text: "", img: "", imgUrl: "", shown: false })}>+ New handout</button>`}</div>
    ${edit && html`<div class="tedit hedit">
      <input class="inp" aria-label="Handout title" placeholder="A letter sealed in black wax" value=${edit.title} onInput=${e => setEdit(Object.assign({}, edit, { title: e.target.value }))} />
      <textarea class="inp" rows="5" aria-label="Handout text" placeholder="What the players read…" value=${edit.text} onInput=${e => setEdit(Object.assign({}, edit, { text: e.target.value }))}></textarea>
      <div class="row">${Store.assets && html`<button type="button" class="btn small" disabled=${busy} onClick=${() => file.current.click()}>${busy ? "Uploading…" : img(edit) ? "Replace picture" : "Add a picture"}</button>
          <input ref=${file} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange=${upload} />`}
        <input class="inp" style="flex:1;min-width:160px" aria-label="Or a picture link" placeholder="…or a picture link (https://…)" value=${edit.imgUrl || ""} onInput=${e => setEdit(Object.assign({}, edit, { imgUrl: e.target.value.trim() }))} /></div>
      ${img(edit) && html`<img class="hprev" src=${img(edit)} alt="" />`}
      <div class="row"><button class="btn small primary" disabled=${!edit.title.trim()} onClick=${() => { Board.putHandout(edit); setEdit(null); }}>Save${edit.shown ? "" : " (hidden)"}</button>
        <button class="btn small" onClick=${() => setEdit(null)}>Cancel</button></div></div>`}
    ${list.length ? html`<div class="hgrid">${list.map(h => html`<div class=${"hcard" + (h.shown ? "" : " hidden")} key=${h.id}>
        <button type="button" class="hopen" onClick=${() => setView(h)}>${img(h) ? html`<img src=${img(h)} alt="" />` : html`<span class="hnoimg"><${PanelIcon} i="book" /></span>`}
          <b>${h.title}</b>${h.text && html`<small>${h.text.slice(0, 90)}${h.text.length > 90 ? "…" : ""}</small>`}</button>
        ${gm && html`<div class="row hgm"><button class=${"btn small" + (h.shown ? " primary" : "")} onClick=${() => Board.putHandout(Object.assign({}, h, { shown: !h.shown }))}>${h.shown ? "Shown" : "Show the party"}</button>
          <button class="btn small" onClick=${() => setEdit(Object.assign({ imgUrl: "", img: "" }, h))}>Edit</button>
          <button class="iconbtn" aria-label=${`Delete ${h.title}`} onClick=${() => Board.dropHandout(h.id)}>×</button></div>`}</div>`)}</div>`
      : html`<p class="muted">${gm ? "Nothing yet. Write a handout; it stays hidden until you show the party." : "The GM hasn't shared any handouts yet."}</p>`}
    ${view && html`<div class="gx-veil" onClick=${e => { if (e.target === e.currentTarget) setView(null); }} onKeyDown=${e => e.key === "Escape" && setView(null)}>
      <div class="gx-choose hview" role="dialog" aria-modal="true" aria-label=${view.title}>
        <h2 class="ornate">${view.title}</h2>${img(view) && html`<img src=${img(view)} alt="" />`}<${Prose} text=${view.text} empty="" />
        <div class="row"><button class="btn" onClick=${() => setView(null)} autofocus>Close</button></div></div></div>`}
  </section>`;
}
