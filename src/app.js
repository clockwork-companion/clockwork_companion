const { h, render } = preact;
const { useState, useEffect, useMemo, useRef } = preactHooks;
const html = htm.bind(h);
const R = CW;
const num = R.num;
// Characters arrive as plain stored objects. Normalising and deriving them is cached per object,
// so a character is only re-computed when it actually changes (every edit produces a new object).
const normCache = new WeakMap(), derivedCache = new WeakMap();
const norm = c => { let n = normCache.get(c); if (!n) { n = R.normalize(c); normCache.set(c, n); normCache.set(n, n); } return n; };
const derive = c => { const n = norm(c); let d = derivedCache.get(n); if (!d) { d = R.derived(n); derivedCache.set(n, d); } return d; };
// Prepend a line to a character's log (newest first, 40 kept).
const addLog = (x, m) => { x.log = [{ t: Date.now(), m }, ...(x.log || [])].slice(0, 40); };

/* ================= storage ================= */
// Shared characters live in the artifact's database ("characters" collection).
// Without it (signed out, preview) the page falls back to this browser only.
const use = name => (window.claude && window.claude.use ? window.claude.use(name) : Promise.resolve(null));
const LS_KEY = "cw-companion-chars";
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const rid = () => "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clean = o => JSON.parse(JSON.stringify(o));

const Store = {
  mode: "loading", db: null, table: null, members: [], uid: null, assets: null, downloads: null, readOnly: false,
  listeners: new Set(), chars: {}, encounter: null,
  emit() { this.listeners.forEach(f => f(this)); },
  async init() {
    // On claude.ai the runtime answers within seconds; on the website it waits for the table password, so no timeout.
    const fallback = window.CW_WEB ? null : setTimeout(() => { if (this.mode === "loading") this.goLocal(); }, 11000);
    window.addEventListener("cw-portraits", () => this.emit());
    const [db, user] = await Promise.all([use("db"), use("user")]);
    clearTimeout(fallback);
    if (!db) { this.goLocal(); return; }
    this.db = db; this.mode = "live";
    try { this.uid = user ? await user.id() : null; } catch {}
    try { const can = user ? await user.can("data.write") : null; if (can === false) this.readOnly = true; } catch {}
    db.collection("characters").onSnapshot(snap => {
      const next = {}; snap.docs.forEach(d => { next[d.id] = Object.assign({}, d.data(), { id: d.id }); });
      this.chars = next; this.emit();
    }, err => { this.error = err && err.code; this.emit(); });
    db.doc("encounters/current").onSnapshot(snap => {
      // ignore echoes older than what this page already shows
      const e = snap.exists ? snap.data() : null;
      if (!this.encounter || !e || (e.t || 0) >= (this.encounter.t || 0)) { this.encounter = e; this.emit(); }
    }, () => {});
    this.emit();
    use("assets").then(a => { this.assets = a; this.emit(); });
    // On the website: who is signed in and their role. GMs also get the list of everyone at the table.
    use("table").then(t => { if (!t) return; this.table = t; if (t.role === "gm") t.members(ms => { this.members = ms; this.emit(); }); this.emit(); });
    use("downloads").then(d => { this.downloads = d; this.emit(); });
  },
  goLocal() { this.mode = "local"; this.chars = lsGet(LS_KEY, {}); this.encounter = lsGet("cw-encounter", null); this.emit(); },
  encQueue: Promise.resolve(),
  saveEncounter(e) {
    e = clean(e); e.t = Date.now(); this.encounter = e; this.emit();
    if (this.mode !== "live") { lsSet("cw-encounter", e); return; }
    this.encQueue = this.encQueue.then(() => this.db.doc("encounters/current").set(e)).catch(err => {
      toast(err && err.code === "invalid_argument" ? "You can watch the initiative deck but not change it." : "Couldn't save the initiative deck just now. Try that again.");
    });
  },
  queues: {}, timers: {},
  save(c, delay = 650) {
    clearTimeout(this.timers[c.id]);
    this.timers[c.id] = setTimeout(() => this.flush(c), delay);
  },
  flush(c) {
    const body = clean(c); delete body.id;
    if (this.mode !== "live") { this.chars = Object.assign({}, this.chars, { [c.id]: Object.assign(body, { id: c.id }) }); lsSet(LS_KEY, this.chars); this.emit(); return Promise.resolve(); }
    const prev = this.queues[c.id] || Promise.resolve();
    const p = prev.then(() => this.db.doc("characters/" + c.id).set(body)).catch(e => {
      if (e && e.code === "invalid_argument") { this.readOnly = true; toast("You can view these characters but not change them. Ask the owner to invite you as an Editor."); }
      else if (e && e.code === "quota_exceeded") toast("The character store is full. Delete an old character to make room.");
      else toast("Couldn't save just now. Your change will retry on the next edit.");
      this.emit();
    });
    this.queues[c.id] = p; return p;
  },
  async remove(id) {
    if (this.mode !== "live") { const n = Object.assign({}, this.chars); delete n[id]; this.chars = n; lsSet(LS_KEY, n); this.emit(); return; }
    await this.db.doc("characters/" + id).delete();
  },
};

// GMs (and everyone on claude.ai, where there are no roles) see every character and the GM table.
const isGM = () => !Store.table || Store.table.role === "gm";
const playersOf = c => (Array.isArray(c.players) ? c.players : []);
// Characters in roster order: alphabetical, each followed by its companions.
function rosterOrder(chars) {
  const byName = (a, b) => (a.name || "").localeCompare(b.name || "");
  const ids = new Set(chars.map(c => c.id));
  const tops = chars.filter(c => !c.companionOf || !ids.has(c.companionOf)).sort(byName);
  return tops.flatMap(t => [t, ...chars.filter(c => c.companionOf === t.id).sort(byName)]);
}

/* ================= toast ================= */
let toastFn = () => {};
const toast = msg => toastFn(msg);
function Toaster() {
  const [msg, setMsg] = useState(""); const t = useRef();
  toastFn = m => { setMsg(m); clearTimeout(t.current); t.current = setTimeout(() => setMsg(""), 3400); };
  return msg ? html`<div class="toast" role="status">${msg}</div>` : null;
}

/* ================= rules side panel ================= */
// Section headings with a rules write-up (RULES_INFO) open it in the side panel, the same way skill names open their levels.
let openRuleFn = () => {};
const BOOK = html`<svg class="hbook" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3.2C4 2.4 6 2.5 8 3.6c2-1.1 4-1.2 6-.4v9.6c-2-.8-4-.7-6 .4-2-1.1-4-1.2-6-.4z M8 3.6v9.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
// A section heading. With a topic, its title is a button that opens the rules; tail replaces the plain ornament (e.g. a diamond toggle).
function Head({ title, topic, tail }) {
  return html`<h2 class="h"><span>${topic ? html`<button type="button" class="hlink" onClick=${() => openRuleFn(topic)} aria-label=${`${title}: show the rules`}
    onMouseEnter=${e => tip.show(e.currentTarget, { title: "Rules", lines: [`Click for how ${title.toLowerCase()} work${/s$/.test(title) ? "" : "s"}`] })} onMouseLeave=${() => tip.hide()}>${title}${BOOK}</button>` : title}</span>
    ${tail || html`<i class="orn" aria-hidden="true"></i>`}</h2>`;
}
// The rulebook's perk icons: recharge (a tent: L long rest, S short rest), AP (a dagger), uses (tally marks), Stamina (sleep), duration (an hourglass).
const UICON = {
  recharge: html`<path d="M8 2.5L2 13.5h12z M8 2.5v11 M6 13.5L8 9l2 4.5" />`,
  ap: html`<path d="M13.5 2.5L6 10l-1.5-.2.2 1.5L3 13l.8.8L5.5 12l1.5.2-.2-1.5 7.5-7.5z" />`,
  uses: html`<path d="M3.5 3v10 M6.5 3v10 M9.5 3v10 M12.5 3v10 M2 11.5L14 5" />`,
  stamina: html`<path d="M3 4h4L3 9h4 M9 8h3l-3 4h3" />`,
  turns: html`<path d="M4 2.5h8 M4 13.5h8 M5 2.5c0 3.5 6 3.5 6 5.5s-6 2-6 5.5 M11 2.5c0 3.5-6 3.5-6 5.5s6 2 6 5.5" />`,
};
const UNAME = { recharge: "Recharges on", ap: "AP cost", uses: "Uses", stamina: "Stamina cost", turns: "Lasts (turns)" };
const Uicon = ({ k }) => html`<svg class="uicon" viewBox="0 0 16 16" aria-hidden="true">${UICON[k]}</svg>`;
// The usage line on a perk, as in the book: icon then value. Recharge shows L or S.
function UsageLine({ u }) {
  if (!u) return null;
  const val = { recharge: u.recharge ? (u.recharge[0] === "S" ? "S" : "L") : "", ap: u.ap ? u.ap.replace("*", "") + (u.ap.includes("*") ? " ⟲" : "") : "", uses: u.uses || "", stamina: u.stamina === "*" ? "var." : u.stamina || "", turns: u.turns || "" };
  const keys = Object.keys(UICON).filter(k => val[k] !== "");
  if (!keys.length) return null;
  return html`<span class="uline">${keys.map(k => html`<span title=${`${UNAME[k]}: ${k === "recharge" ? u.recharge : k === "ap" && u.ap.includes("*") ? val.ap.replace(" ⟲", "") + " (can be a reaction)" : val[k]}`}><${Uicon} k=${k} />${val[k]}</span>`)}</span>`;
}
function RuleBlock({ b }) {
  if (typeof b === "string") return html`<p>${b}</p>`;
  if (b.h) return html`<h3>${b.h}</h3>`;
  if (b.ul) return html`<ul class="sprules">${b.ul.map(x => html`<li>${x}</li>`)}</ul>`;
  if (b.note) return html`<p class="muted rnote">${b.note}</p>`;
  if (b.icons) return html`<div class="ulegend">${Object.keys(UICON).map(k => html`<span><${Uicon} k=${k} /><b>${UNAME[k]}</b>${k === "recharge" ? " · L long rest, S short rest" : k === "ap" ? " · ⟲ can be a reaction" : ""}</span>`)}</div>`;
  if (b.t) return html`<div class="tbl-wrap"><table><thead><tr>${b.t.cols.map(x => html`<th>${x}</th>`)}</tr></thead>
    <tbody>${b.t.rows.map(r => html`<tr>${r.map((x, i) => html`<td class=${i === 0 ? "k" : ""}>${x}</td>`)}</tr>`)}</tbody></table></div>`;
  return null;
}
function RulePanel({ topic, onClose }) {
  const ref = useRef(); const r = RULES_INFO[topic];
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); ref.current && ref.current.focus(); return () => window.removeEventListener("keydown", k); }, [topic]);
  if (!r) return null;
  return html`<aside class="spanel rpanel-rules" role="dialog" aria-label=${`${r.title} rules`} tabindex="-1" ref=${ref}>
    <header class="sphead"><div><span class="lbl">Rules · ${r.kicker}</span><h2>${r.title}</h2></div>
      <button class="iconbtn" aria-label="Close" onClick=${onClose}>×</button></header>
    <div class="spbody rulebody">${r.body.map(b => html`<${RuleBlock} b=${b} />`)}</div></aside>`;
}

/* ================= hover card ================= */
// A small floating card that explains what clicking a pip or cell would do, and what it costs.
let tipSet = () => {};
const tip = {
  show(el, content) { if (!content) return; tipSet({ r: el.getBoundingClientRect(), content }); },
  hide() { tipSet(null); },
};
function HoverCard() {
  const [t, setT] = useState(null);
  tipSet = setT;
  useEffect(() => { const h = () => setT(null); window.addEventListener("scroll", h, true); return () => window.removeEventListener("scroll", h, true); }, []);
  if (!t) return null;
  const { r, content } = t;
  const below = r.top < 110;
  const left = Math.max(130, Math.min(window.innerWidth - 130, r.left + r.width / 2));
  return html`<div class=${"hovercard " + (content.tone || "")} role="tooltip"
    style=${`left:${left}px;top:${below ? r.bottom + 10 : r.top - 10}px;transform:translate(-50%, ${below ? "0" : "-100%"})`}>
    <b>${content.title}</b>${(content.lines || []).filter(Boolean).map(l => html`<span>${l}</span>`)}</div>`;
}
// A tiny mouse with the left or right button lit, used in the hover card.
const Mouse = ({ side }) => html`<svg class="mouse" viewBox="0 0 14 20" aria-hidden="true">
  <rect x="1" y="1" width="12" height="18" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <line x1="7" y1="1.5" x2="7" y2="8" stroke="currentColor" stroke-width="1.2"/><line x1="1.5" y1="8" x2="12.5" y2="8" stroke="currentColor" stroke-width="1.2"/>
  <path d=${side === "R" ? "M7.6 2 a5.4 5.4 0 0 1 4.8 5.4 v0.6 h-4.8 z" : "M6.4 2 a5.4 5.4 0 0 0 -4.8 5.4 v0.6 h4.8 z"} fill="var(--brass)"/></svg>`;
// What changing a level would mean: cost or refund, and whether it is allowed.
// raiseBtn / lowerBtn: which mouse button does it (left raises, right lowers).
// The current level and ceiling of anything with pips. Free edit lifts an attribute's ceiling to 20.
const levelState = (c, mode, kind, name) => {
  const L = R.LEVELS[kind];
  return { L, from: L.get(c, name), cap: kind === "attr" && mode === "build" ? 20 : L.cap(c, name), label: kind === "attr" ? R.ATTR_NAME[name] : name };
};
// Free edit changes levels without spending Karma, so the pool (Karma earned) moves by however much the
// Karma spent changes. That keeps "pool = unspent + spent" true, so a later refund can never exceed what was earned.
// (An attribute's starting value moves with it in Free edit, so any points that were bought become natural.)
function freePoolDelta(c, kind, name, to) {
  const x = clean(c); R.LEVELS[kind].put(x, name, to); if (kind === "attr") x.attrs[name].base = to;
  return R.karmaSpent(x).total - R.karmaSpent(c).total;
}
const signed = n => (n > 0 ? "+" : "−") + Math.abs(n);
function levelTip(c, mode, kind, name, to, raiseBtn = "L", lowerBtn = "R") {
  const { L, from, cap, label } = levelState(c, mode, kind, name);
  const have = num(c.karma);
  if (to === from) return { title: `${label} ${to}`, lines: ["Current level"] };
  if (to > from && to > cap) {
    if (kind === "attr") return { tone: "sealed", title: "Sealed", lines: [`Started broken at ${c.attrs[name].base}. Karma stops at ${cap}.`] };
    const at = L.attrOf(name);
    return { tone: "blocked", title: "Out of reach", lines: [`${R.ATTR_NAME[at]} ${R.attr(c, at)} allows ${kind === "sec" ? "level " : ""}${cap}`] };
  }
  if (to < from && kind === "attr" && mode === "karma" && to < R.attrBase(c, name))
    return { tone: "blocked", title: "Starting value", lines: [`${label} started at ${R.attrBase(c, name)}. Free edit can lower it further.`] };
  const raise = to > from, delta = R.levelDelta(c, kind, name, from, to);
  const head = html`<${Mouse} side=${raise ? raiseBtn : lowerBtn} /> to ${raise ? "raise" : "lower"} to ${to}`;
  if (mode === "build") { const dp = freePoolDelta(c, kind, name, to); return { tone: raise ? "" : "refund", title: head, lines: [dp ? html`Free edit · <em>pool ${signed(dp)}</em>` : "Free edit · pool unchanged"] }; }
  return { tone: !raise ? "refund" : delta > have ? "short" : "ok", title: head,
    lines: [html`<em>${raise ? delta : "+" + -delta} Karma</em> · ${have} → ${have - delta}`] };
}

/* ================= small parts ================= */
function Pips({ value, max = 10, cap = max, onSet, label, big, tipFor }) {
  const out = [];
  for (let i = 1; i <= max; i++) {
    const on = i <= value, capped = i > cap && !on, over = on && i > cap;
    // Left-click an empty pip to raise to it; right-click (long-press on a phone) a filled pip to lower below it.
    const target = on ? i - 1 : i;
    const go = () => { onSet(target); if (tipFor) setTimeout(() => tip.hide(), 0); };
    out.push(html`<button type="button" class=${"pip" + (on ? " on" : "") + (capped ? " capped" : "") + (over ? " over" : "")}
      aria-label=${on ? `${label}: lower to ${i - 1}` : `${label}: raise to ${i}`} aria-pressed=${on}
      onMouseEnter=${e => tipFor && tip.show(e.currentTarget, tipFor(target))} onMouseLeave=${() => tip.hide()}
      onFocus=${e => tipFor && tip.show(e.currentTarget, tipFor(target))} onBlur=${() => tip.hide()}
      onClick=${e => { if (!on) go(); else if (e.detail) toast("Right-click (long-press on a phone) to lower."); else go(); }}
      onContextMenu=${e => { e.preventDefault(); if (on) go(); }}></button>`);
  }
  return html`<span class=${"pips" + (big ? " big" : "")} role="group" aria-label=${label}>${out}</span>`;
}
// A text box that grows with what's typed, instead of a single line that scrolls sideways.
function AutoText({ id, value, onInput, placeholder, label, cls = "" }) {
  const ref = useRef();
  const fit = () => { const el = ref.current; if (!el) return; el.style.height = "auto"; el.style.height = el.scrollHeight + 2 + "px"; };
  useEffect(fit, [value]);
  useEffect(() => { window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit); }, []);
  return html`<textarea ref=${ref} id=${id} rows="1" class=${"autotext " + cls} aria-label=${label} placeholder=${placeholder} value=${value ?? ""} onInput=${e => { onInput(e.target.value); fit(); }}></textarea>`;
}
function Field({ id, label, value, onInput, type = "text", list, placeholder }) {
  return html`<div class="field"><label for=${id}>${label}</label>
    <input id=${id} type=${type} value=${value ?? ""} list=${list} placeholder=${placeholder} onInput=${e => onInput(e.target.value)} /></div>`;
}
function Mini({ id, label, value, onInput, type = "number", step, min }) {
  return html`<div class="mini"><label for=${id}>${label}</label>
    <input id=${id} type=${type} step=${step} min=${min} value=${value ?? ""} onInput=${e => onInput(type === "number" ? (e.target.value === "" ? "" : +e.target.value) : e.target.value)} /></div>`;
}
const pct = n => `${n}%`;
const initials = n => (n || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";
// An uploaded portrait first, then a portrait link; otherwise the character's sigil emblem or initials.
const portraitSrc = c => (!c ? "" : c.portraitAsset ? (Store.assets && Store.assets.urlFor ? Store.assets.urlFor(c.portraitAsset) : "/_blob/" + c.portraitAsset) : /^https?:\/\//.test(c.portraitUrl || "") ? c.portraitUrl : "");
const Face = ({ c, name }) => portraitSrc(c) ? html`<img src=${portraitSrc(c)} alt="" />`
  : c && c.emblem && c.emblem.shape ? html`<i class=${"emblem sg-" + c.emblem.shape} style=${`--em:${c.emblem.hue || "var(--brass)"}`} aria-hidden="true"></i>` : initials(c ? c.name : name);
// Shrink an image to a small JPEG data URL (portraits in backups, and on the website's database).
async function shrinkImage(blob, max = 360) {
  const img = await createImageBitmap(blob);
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const cv = document.createElement("canvas");
  cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
  cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
  return cv.toDataURL("image/jpeg", 0.82);
}
// Save a text file: the runtime's downloads where offered, otherwise an ordinary browser download.
async function saveFile(filename, data) {
  if (Store.downloads) return Store.downloads.save({ filename, data });
  const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// A character's small square portrait, or their initials.
const Thumb = ({ c, name, lg }) => html`<span class=${"thumb" + (lg ? " lg" : "")}><${Face} c=${c} name=${name} /></span>`;
const subtitle = c => [c.profession, c.campaign].filter(Boolean).join(" · ") || "No profession yet";

/* ================= themes ================= */
// Each theme is a set of colour, type and shape overrides keyed on <html data-skin>. Fonts load only when picked.
const GF = "https://fonts.googleapis.com/css2?display=swap&family=";
const SKINS = [
  ["ledger", "Ledger", null],
  ["steam", "Steampunk", GF + "Rye&family=Alegreya+Sans+SC:wght@500;700;800&family=Alegreya:ital,wght@0,400;0,600;0,700;1,400&family=Special+Elite"],
  ["light", "Light", GF + "Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600"],
  ["retro", "Retro terminal", GF + "VT323"],
  ["glass", "Glass", GF + "Inter:wght@400;500;600;700"],
  ["fantasy", "Fantasy (parchment)", GF + "IM+Fell+English+SC&family=Cinzel:wght@500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400"],
  ["fantasy-dark", "Fantasy (candlelit)", GF + "IM+Fell+English+SC&family=Cinzel:wght@500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400"],
  ["armour", "Power armour", GF + "Orbitron:wght@600;700;800&family=Chakra+Petch:wght@500;600;700&family=Exo+2:wght@400;500;600&family=Nixie+One"],
  // Extended themes: heavier artwork and their own furniture.
  ["cairn", "Cairn-style gothic", GF + "UnifrakturCook:wght@700&family=UnifrakturMaguntia&family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&family=Grenze:wght@500;600;700", "extended"],
  ["cyber", "Cyberpunk", GF + "Tomorrow:wght@500;600;700&family=Oxanium:wght@400;500;600;700;800", "extended"],
];
function applySkin(key) {
  const skin = SKINS.find(x => x[0] === key) || SKINS[0], root = document.documentElement;
  if (skin[0] === "ledger") delete root.dataset.skin; else root.dataset.skin = skin[0];
  if (skin[2] && !document.querySelector(`link[data-skin-font="${skin[0]}"]`)) {
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = skin[2]; l.dataset.skinFont = skin[0]; document.head.appendChild(l);
  }
}
applySkin(lsGet("cw-skin", "ledger"));   // before the first paint, so the page never flashes the default theme
function SkinPicker() {
  const [skin, setSkin] = useState(() => lsGet("cw-skin", "ledger"));
  useEffect(() => { applySkin(skin); lsSet("cw-skin", skin); }, [skin]);
  return html`<label class="skinpick"><span class="lbl">Theme</span>
    <select value=${skin} onChange=${e => setSkin(e.target.value)}>
      <optgroup label="Themes">${SKINS.filter(x => !x[3]).map(([k, n]) => html`<option value=${k}>${n}</option>`)}</optgroup>
      <optgroup label="Extended">${SKINS.filter(x => x[3] === "extended").map(([k, n]) => html`<option value=${k}>${n}</option>`)}</optgroup>
    </select></label>`;
}

/* ================= app ================= */
function App() {
  const [, force] = useState(0);
  const [drafts, setDrafts] = useState({});
  const [sel, setSel] = useState(() => lsGet("cw-sel", null));
  const [tab, setTab] = useState(() => (["sheet", "vitals", "gear", "table"].includes(location.hash.slice(1)) ? location.hash.slice(1) : lsGet("cw-tab", "sheet")));
  const lastEdit = useRef({});
  const [view, setView] = useState(() => (location.hash === "#gm" ? "gm" : lsGet("cw-view", "chars")));
  useEffect(() => lsSet("cw-view", view), [view]);

  useEffect(() => { const f = () => force(x => x + 1); Store.listeners.add(f); Store.init(); return () => Store.listeners.delete(f); }, []);

  // Drop a draft once the store has caught up, or when someone else edited it and we've been idle.
  useEffect(() => {
    let changed = false; const next = Object.assign({}, drafts);
    Object.keys(next).forEach(id => {
      const s = Store.chars[id];
      if (!s) return;
      if (s._rev === next[id]._rev || Date.now() - (lastEdit.current[id] || 0) > 4000) { delete next[id]; changed = true; }
    });
    if (changed) setDrafts(next);
  });

  const all = Object.assign({}, Store.chars, drafts);
  const list = rosterOrder(Object.values(all));
  const gm = isGM();
  if (!gm && view === "gm") setView("chars");
  const current = sel && all[sel] ? norm(all[sel]) : null;
  useEffect(() => { if (!current && list.length) setSel(list[0].id); }, [list.length, !!current]);
  useEffect(() => lsSet("cw-sel", sel), [sel]);
  useEffect(() => lsSet("cw-tab", tab), [tab]);

  const updateChar = (id, fn) => {
    const src = all[id]; if (!src) return;
    if (Store.readOnly) { toast("You can view this character but not change it."); return; }
    const next = clean(norm(src)); next.id = id; fn(next); next._rev = rid(); next.updatedAt = Date.now();
    lastEdit.current[id] = Date.now();
    setDrafts(d => Object.assign({}, d, { [id]: next }));
    Store.save(next);
  };
  const update = fn => { if (current) updateChar(current.id, fn); };
  const openChar = id => { setSel(id); setView("chars"); setTab("sheet"); window.scrollTo(0, 0); };

  // A new character belongs to the player who made it. A companion belongs to whoever plays its master.
  // fill(c): the creation guide's choices, applied to the new character before it's saved.
  const create = (rolled, master, fill) => {
    if (Store.readOnly) { toast("You can view these characters but not add new ones."); return; }
    const c = R.blankCharacter(); c.id = rid(); c.name = master ? "New companion" : "New character"; c.ownerId = Store.uid || ""; c.createdAt = Date.now();
    if (Store.table) c.players = gm ? (master ? playersOf(master).slice() : []) : [Store.table.uid];
    if (master) { c.companionOf = master.id; c.campaign = master.campaign || ""; }
    if (rolled) R.ATTRS.forEach(a => { const v = R.rollAttribute(); c.attrs[a.k] = { base: v, value: v }; });
    if (fill) fill(c);
    c._rev = rid();
    lastEdit.current[c.id] = Date.now();
    setDrafts(d => Object.assign({}, d, { [c.id]: c })); setSel(c.id); setTab("sheet");
    Store.flush(c);
    toast(fill ? `Welcome to the table, ${c.name}.` : master ? `Companion added for ${master.name || "this character"}.` : rolled ? "Rolled 3d8, kept the best two, minimum 6." : "Character created.");
  };
  const [making, setMaking] = useState(null);   // null | "choose" | "guide"
  const startNew = () => setMaking("choose");
  const remove = async id => { const gone = all[id]; await Store.remove(id);
    if (gone && gone.portraitAsset && Store.assets && Store.assets.remove) Store.assets.remove(gone.portraitAsset); setDrafts(d => { const n = Object.assign({}, d); delete n[id]; return n; }); setSel(null); toast("Character deleted."); };

  return html`<div class="wrap">
    <header class="top">
      <div class="brand">Clockwork<small>Companion</small></div>
      ${gm && html`<div class="seg viewseg" role="group" aria-label="View">
        <button aria-pressed=${view === "chars"} onClick=${() => setView("chars")}>Characters</button>
        <button aria-pressed=${view === "gm"} onClick=${() => setView("gm")}>GM table</button></div>`}
      <${SkinPicker} />
      <div class="status">${Store.mode === "live" && Store.table ? html`<i class="dot live"></i>${Store.table.name}${gm ? " · GM" : ""} <button class="linkbtn" onClick=${() => window.CW_WEB.leave()}>Sign out</button>`
        : Store.mode === "live" ? html`<i class="dot live"></i>Shared · saves for everyone` : Store.mode === "local" ? html`<i class="dot local"></i>This browser only` : html`<i class="dot"></i>Connecting…`}</div>
    </header>
    ${Store.mode === "local" && html`<div class="banner">${window.CW_WEB
      ? (window.CW_WEB.reason === "offline" ? "Couldn't reach the shared save, so for now characters are kept in this browser only. Check your connection and reload."
        : "Shared saving isn't set up yet, so characters are kept in this browser only. Add your Firebase settings to firebase-config.js to share them with your table.")
      : "Shared saving isn't available in this view, so characters are kept in this browser only. Open the published page while signed in to share them with your table."}</div>`}
    ${Store.readOnly && html`<div class="banner">You're viewing these characters read-only. To edit, ask the owner to invite you as an Editor.</div>`}
    ${Store.error && html`<div class="banner">Couldn't load the shared characters just now. Reload the page to try again.</div>`}
    ${view === "gm" && gm ? html`<${GMView} chars=${list} updateChar=${updateChar} openChar=${openChar} />` : html`
    <${Roster} list=${list} all=${all} sel=${sel} setSel=${setSel} current=${current} create=${create} startNew=${startNew} />
    ${current ? html`<${Character} c=${current} update=${update} tab=${tab} setTab=${setTab} onDelete=${remove} />`
      : Store.mode === "loading" ? html`<div class="empty"><p class="muted">Opening the character ledger…</p></div>`
      : html`<div class="empty">
          <div class="ornate">${gm ? "No characters yet" : "Welcome to the table"}</div>
          <p>${gm ? "Each player's sheet lives here: attributes, skills, Karma, vitals and gear, with the rulebook math done for you. Send any character onto your Tabletop Simulator sheet with one code."
            : "You don't have a character here yet. Roll one up below, or ask your GM to hand you an existing one."}</p>
          <div class="row"><button class="btn primary" onClick=${startNew}>Create a character</button></div>
          <p class="muted">Walk through creation step by step, or start from a blank sheet.</p></div>`}`}
    ${making === "choose" && html`<${NewChoice} onClose=${() => setMaking(null)} onGuide=${() => setMaking("guide")} onBlank=${() => { setMaking(null); create(false); }} />`}
    ${making === "guide" && html`<${Genesis} onClose=${() => setMaking(null)} onDone=${fill => { setMaking(null); create(false, null, fill); window.scrollTo(0, 0); }} />`}
    <${Toaster} /><${HoverCard} />
  </div>`;
}

/* ================= character switcher ================= */
// The current character up front; everyone else in a panel that opens below it, grouped by campaign,
// with each character's companions tucked under them and a search box when the list grows long.
function Roster({ list, all, sel, setSel, current, create, startNew }) {
  const [open, setOpen] = useState(false); const [q, setQ] = useState("");
  const ref = useRef(), searchRef = useRef();
  useEffect(() => {
    if (!open) return;
    const key = e => { if (e.key === "Escape") setOpen(false); };
    const out = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener("keydown", key); document.addEventListener("pointerdown", out);
    if (searchRef.current) searchRef.current.focus();
    return () => { window.removeEventListener("keydown", key); document.removeEventListener("pointerdown", out); };
  }, [open]);
  const pick = id => { setSel(id); setOpen(false); setQ(""); };
  const master = c => (c && c.companionOf && all[c.companionOf]) || null;
  const comps = id => list.filter(c => c.companionOf === id);
  const needle = q.trim().toLowerCase();
  const hit = c => !needle || [c.name, c.profession, c.player, c.campaign].some(v => (v || "").toLowerCase().includes(needle));
  const tops = list.filter(c => !master(c) && (hit(c) || comps(c.id).some(hit)));
  const order = [...CAMPAIGNS, ...new Set(tops.map(c => c.campaign || "").filter(x => x && !CAMPAIGNS.includes(x))), ""];
  const groups = order.map(k => ({ k, rows: tops.filter(c => (c.campaign || "") === k) })).filter(g => g.rows.length);
  const hp = c => { const d = derive(c); return d.max.hp ? R.clamp((d.cur.hp / d.max.hp) * 100, 0, 100) : 0; };
  const cur = current, m = master(cur);
  return html`<div class="roster" ref=${ref}>
    <div class="rbar">
      ${cur ? html`<button type="button" class="rnow" aria-expanded=${open} aria-haspopup="true" onClick=${() => setOpen(!open)}>
          <${Thumb} c=${cur} lg />
          <span class="who"><b>${cur.name || "Unnamed"}</b><span>${m ? `Companion of ${m.name || "Unnamed"}` : subtitle(cur)}</span></span>
          <span class="rswitch">${list.length > 1 ? `Switch · ${list.length}` : "Characters"}<svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></span></button>`
        : html`<span class="muted">No character selected</span>`}
      <span class="radd">
        <button class="btn small" onClick=${startNew}>+ New character</button>
        ${cur && !m && html`<button class="btn small" onClick=${() => create(false, cur)}>+ Companion</button>`}
      </span>
    </div>
    ${open && html`<div class="rpanel" role="dialog" aria-label="Choose a character">
      <div class="rhead"><b>Characters</b><button type="button" class="iconbtn" aria-label="Close" onClick=${() => setOpen(false)}>×</button></div>
      ${list.length > 6 && html`<input ref=${searchRef} class="rsearch" type="search" placeholder="Find a character, profession or player…" value=${q} onInput=${e => setQ(e.target.value)} />`}
      ${groups.map(g => html`<div class="rgroup"><h4>${g.k || "No campaign"}</h4><div class="rgrid">
        ${g.rows.map(c => html`<div class=${"rcard" + (c.id === sel ? " on" : "")}>
          <button type="button" class="rmain" onClick=${() => pick(c.id)}>
            <${Thumb} c=${c} />
            <span class="who"><b>${c.name || "Unnamed"}</b><span>${[c.profession, c.player].filter(Boolean).join(" · ") || "No profession yet"}</span>
              <span class="bar"><i style=${`width:${hp(c)}%`}></i></span></span></button>
          ${comps(c.id).length > 0 && html`<div class="rcomps">${comps(c.id).map(k => html`<button type="button" class=${"rcomp" + (k.id === sel ? " on" : "")} onClick=${() => pick(k.id)}><${Thumb} c=${k} />${k.name || "Unnamed"}</button>`)}</div>`}
        </div>`)}</div></div>`)}
      ${!groups.length && html`<p class="muted">Nobody matches “${q}”.</p>`}
    </div>`}
  </div>`;
}

/* ================= character ================= */
function Character({ c, update, tab, setTab, onDelete }) {
  const d = derive(c);
  const [chosenMode, setMode] = useState(() => lsGet("cw-mode", "karma"));
  useEffect(() => lsSet("cw-mode", chosenMode), [chosenMode]);
  // Free edit is always there for a GM; a player gets it only when the GM switches it on for this sheet.
  const canFree = isGM() || !!c.freeEdit;
  const mode = canFree ? chosenMode : "karma";
  const tabs = [["sheet", "Sheet"], ["vitals", "Vitals"], ["talents", "Skills & Talents"], ["gear", "Gear"], ["craft", "Crafting"], ["table", "Tabletop"]];
  const [panel, setPanel] = useState(null);
  const [invested, setInvested] = useState(() => { const v = lsGet("cw-invested2", null); return v && typeof v === "object" ? v : { skills: false, weapons: false, sec: false }; });
  useEffect(() => lsSet("cw-invested2", invested), [invested]);
  const toggleInv = k => setInvested(x => Object.assign({}, x, { [k]: !x[k] }));
  useEffect(() => setPanel(null), [c.id, tab]);
  // One side panel at a time: a skill's levels, or the rules behind a section heading. Clicking the same thing again closes it.
  const openPanel = (kind, name) => setPanel(p => (p && p.kind === kind && p.name === name ? null : { kind, name }));
  openRuleFn = name => openPanel("rule", name);
  const skillTabs = tab === "sheet" || tab === "talents";
  // Which way the page slides when the tab changes: in from the right when moving to a tab further along, from the
  // left when going back. Worked out once per change (not on every redraw), so the slide never replays mid-edit.
  const nav = useRef({ tab, dir: "" });
  if (nav.current.tab !== tab) {
    const order = tabs.map(t => t[0]);
    nav.current = { tab, dir: order.indexOf(tab) > order.indexOf(nav.current.tab) ? "r" : "l" };
  }
  return html`
    <${Header} c=${c} d=${d} update=${update} mode=${mode} setMode=${setMode} canFree=${canFree} />
    <div class="tabs" role="tablist">${tabs.map(([k, n]) => html`<button role="tab" class=${"tab-" + k} aria-selected=${tab === k} onClick=${() => setTab(k)}>
      <svg class="tabicon" viewBox="0 0 20 20" aria-hidden="true">${TAB_ICONS[k]}</svg>${n}</button>`)}</div>
    ${panel && panel.kind === "rule" && html`<${RulePanel} topic=${panel.name} onClose=${() => setPanel(null)} />`}
    ${panel && panel.kind !== "rule" && skillTabs && html`<${SkillPanel} c=${c} kind=${panel.kind} name=${panel.name} mode=${mode} update=${update} onClose=${() => setPanel(null)} />`}
    <div class="tabswap" key=${tab} data-dir=${nav.current.dir}>
      ${tab === "sheet" && html`<${SheetTab} c=${c} d=${d} update=${update} mode=${mode} invested=${invested} toggleInv=${toggleInv} openSkill=${openPanel} />`}
      ${tab === "vitals" && html`<${VitalsTab} c=${c} d=${d} update=${update} />`}
      ${tab === "talents" && html`<${TalentsTab} c=${c} update=${update} openSkill=${openPanel} />`}
      ${tab === "gear" && html`<${GearTab} c=${c} d=${d} update=${update} />`}
      ${tab === "craft" && html`<${CraftTab} c=${c} update=${update} />`}
      ${tab === "table" && html`<${TableTab} c=${c} update=${update} onDelete=${onDelete} />`}
    </div>`;
}

// Small line icons that tell the tabs apart at a glance.
const TAB_ICONS = {
  sheet: html`<path d="M5 2.5h7l3.5 3.5v11.5H5z M12 2.5V6h3.5 M7.5 9.5h5 M7.5 12.5h5 M7.5 15h3" />`,
  vitals: html`<path d="M10 16.5s-6.5-4-6.5-8.5A3.5 3.5 0 0 1 10 6a3.5 3.5 0 0 1 6.5 2c0 4.5-6.5 8.5-6.5 8.5z" />`,
  talents: html`<path d="M10 2.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 7.8l5-.7z" />`,
  gear: html`<path d="M4 7.5h12v9.5H4z M7 7.5V5a3 3 0 0 1 6 0v2.5 M4 11h12" />`,
  craft: html`<path d="M3 11.5h10.5l3-3H5.5z M5.5 11.5v2.5h8v-2.5 M7.5 14v3 M11.5 14v3 M9 6.5l1-4 1.2 3.2" />`,
  table: html`<path d="M10 2.5l6.5 3.75v7.5L10 17.5l-6.5-3.75v-7.5z M10 10l6.5-3.75 M10 10L3.5 6.25 M10 10v7.5" />`,
};
// A number that can be typed over in Free edit. It saves when you leave the box or press Enter, not on every keystroke.
function StatEdit({ id, value, label, onCommit }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  const commit = () => { const n = Math.max(0, Math.floor(+v || 0)); if (n !== value) onCommit(n); else setV(String(value)); };
  return html`<input id=${id} class="statin" type="number" min="0" inputmode="numeric" aria-label=${label} value=${v}
    onInput=${e => setV(e.target.value)} onBlur=${commit} onKeyDown=${e => { if (e.key === "Enter") e.target.blur(); }} />`;
}
function Header({ c, d, update, mode, setMode, canFree }) {
  const fileRef = useRef(); const [busy, setBusy] = useState(false); const [award, setAward] = useState("");
  const upload = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = "";
    if (!f || !Store.assets) return;
    setBusy(true);
    try { const r = await Store.assets.upload(f, c.portraitAsset); update(x => { x.portraitAsset = r.id; }); toast("Portrait saved."); }
    catch (err) { toast(err && err.code === "too_large" ? "That image is over 20 MB. Try a smaller one." : "Couldn't upload that image. Use a PNG, JPG or WebP file."); }
    setBusy(false);
  };
  const id = s => `${s}-${c.id}`;
  const off = num(c.pool) - num(c.karma) - d.karma.total;   // pool should equal unspent + spent
  const masters = Object.values(Store.chars).filter(x => x.id !== c.id && !x.companionOf).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  return html`<section class="head" style="position:relative;isolation:isolate"><${Sigils} seed="header" n=${1} lead="gears" side="l" />
    <div class="portrait"><${Face} c=${c} />
      ${Store.assets && html`<button class="over" onClick=${() => fileRef.current.click()} disabled=${busy}>${busy ? "Uploading…" : portraitSrc(c) ? "Replace portrait" : "Add portrait"}</button>
      <input ref=${fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange=${upload} />`}</div>
    <div style="min-width:0">
      <input id=${id("name")} class="namefield" aria-label="Character name" value=${c.name} onInput=${e => update(x => { x.name = e.target.value; })} />
      <div class="fields">
        <${Field} id=${id("player")} label="Player" value=${c.player} onInput=${v => update(x => { x.player = v; })} />
        ${(c.companionOf || masters.length > 0) && html`<div class="field"><label for=${id("comp")}>Companion of</label>
          <select id=${id("comp")} value=${c.companionOf || ""} onChange=${e => update(x => { x.companionOf = e.target.value; })}>
            <option value="">— Not a companion</option>${masters.map(m => html`<option value=${m.id}>${m.name || "Unnamed"}</option>`)}</select></div>`}
        <div class="field"><label for=${id("camp")}>Campaign</label>
          <select id=${id("camp")} value=${c.campaign} onChange=${e => update(x => { x.campaign = e.target.value; })}>
            <option value="">—</option><option>Tears of Eithos</option><option>Talon Saga</option><option>One-shot</option></select></div>
        <${Field} id=${id("prof")} label="Profession" value=${c.profession} onInput=${v => update(x => { x.profession = v; })} />
        <${Field} id=${id("fac")} label="Faction" value=${c.faction} onInput=${v => update(x => { x.faction = v; })} />
        <${Field} id=${id("age")} label="Age" value=${c.age} onInput=${v => update(x => { x.age = v; })} />
        <${Field} id=${id("ht")} label="Height" value=${c.height} onInput=${v => update(x => { x.height = v; })} />
        <${Field} id=${id("wt")} label="Weight" value=${c.weight} onInput=${v => update(x => { x.weight = v; })} />
        <${Field} id=${id("url")} label="Portrait link for Tabletop" value=${c.portraitUrl} placeholder="https://…" onInput=${v => update(x => { x.portraitUrl = v.trim(); })} />
      </div>
    </div>
    <div class="karmawrap"><div class="panel karma">
      <div class="h" style="margin:0">Karma</div>
      <div class="big">${[["karma", "Unspent"], ["pool", "Pool · earned"]].map(([k, label]) => html`<div class=${"stat" + (mode === "build" ? " editing" : "")}>
        ${mode === "build" ? html`<${StatEdit} id=${id(k)} value=${num(c[k])} label=${label} onCommit=${v => update(x => { addLog(x, `Free edit: ${label.split(" ")[0]} ${num(x[k])} → ${v}`); x[k] = v; })} />` : html`<b>${num(c[k])}</b>`}
        <span>${label}</span></div>`)}</div>
      <div class="row"><input class="inp" style="width:70px" type="number" min="1" aria-label="Karma to award" placeholder="+0" value=${award} onInput=${e => setAward(e.target.value)} />
        <button class="btn small" disabled=${!(+award > 0)} onClick=${() => { const n = Math.floor(+award); update(x => { x.karma = num(x.karma) + n; x.pool = num(x.pool) + n; addLog(x, `Awarded ${n} Karma`); }); setAward(""); }}>Award</button>
        <span class="muted">Spent ${d.karma.total}</span></div>
      ${off !== 0 && html`<div class="poolwarn"><span>The pool is ${Math.abs(off)} ${off > 0 ? "more" : "less"} than unspent + spent (${num(c.karma)} + ${d.karma.total}).</span>
        ${isGM() && html`<button class="btn small" onClick=${() => update(x => { x.pool = num(x.karma) + R.karmaSpent(x).total; addLog(x, `Pool set to ${num(x.pool)} (unspent + spent)`); })}>Match pool</button>`}</div>`}
      ${canFree && html`<div class="seg" role="group" aria-label="Editing mode">
        <button aria-pressed=${mode === "karma"} onClick=${() => setMode("karma")}>Spend Karma</button>
        <button aria-pressed=${mode === "build"} onClick=${() => setMode("build")}>Free edit</button></div>`}
      <div class="muted">${mode === "karma" ? html`<${Mouse} side="L" /> Left-click raises and spends Karma. <${Mouse} side="R" /> Right-click lowers and refunds it.` : "Changes cost no Karma. The pool grows or shrinks to match, so it always equals unspent + spent. You can also type over Unspent and the pool."}</div>
      ${Store.table && isGM() && html`<label class="row freeallow"><input type="checkbox" checked=${!!c.freeEdit} onChange=${e => update(x => { x.freeEdit = e.target.checked; addLog(x, e.target.checked ? "GM allowed Free edit" : "GM turned off Free edit"); })} />Player may use Free edit</label>`}
    </div></div>
  </section>`;
}

/* ---------- level changes with karma ---------- */
function setLevel(c, update, mode, kind, name, to) {
  const { L, from, cap, label } = levelState(c, mode, kind, name);
  to = R.clamp(to, 0, L.max);
  if (to === from) return;
  if (kind === "attr" && mode === "karma" && to < R.attrBase(c, name)) { toast(`${label} can't go below its starting ${R.attrBase(c, name)} while spending Karma. Switch to Free edit to change it.`); return; }
  if (to > from && to > cap) {
    toast(kind === "sec" ? `${name} is capped at level ${cap} by its attribute.`
      : kind === "attr" ? (R.attrBase(c, name) < 10 ? `${label} started broken at ${R.attrBase(c, name)}, so its ceiling is ${cap}.` : `${label} is already at the maximum of 20.`)
      : cap === 0 ? `${name} needs its attribute above 10 before it can take any points.` : `${name} can hold ${cap} point${cap > 1 ? "s" : ""}, one for each point its attribute has above 10.`);
    return;
  }
  const cost = R.levelDelta(c, kind, name, from, to);
  if (mode === "karma" && cost > num(c.karma)) { toast(`That costs ${cost} Karma. ${c.name || "This character"} has ${num(c.karma)}.`); return; }
  update(x => {
    const dp = mode === "build" ? freePoolDelta(x, kind, name, to) : 0;
    L.put(x, name, to);
    if (kind === "attr" && mode === "build") x.attrs[name].base = to;
    if (mode === "karma") { x.karma = num(x.karma) - cost; addLog(x, `${label} ${from} → ${to} (${cost > 0 ? "−" + cost : "+" + -cost} Karma)`); }
    else { x.pool = num(x.pool) + dp; addLog(x, `Free edit: ${label} ${from} → ${to}${dp ? ` (pool ${signed(dp)})` : ""}`); }
  });
}

/* ================= sigils ================= */
// A seeded scatter of faint sigils for a section: same seed, same layout on every visit.
const SIGIL_SHAPES = ["attr", "skill", "weap", "sec", "note", "gears", "astro", "glyphs", "elements", "broken"];
const WEARS = ["", "wr-1", "wr-2", "wr-3", "fade-a", "fade-b", "wr-1", "wr-2"];
function seeded(seed) {
  let h = 2166136261; for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function Sigils({ seed, n = 1, lead, side = "r" }) {
  // One main sigil hugging the chosen side, plus (if n > 1) one small faint one on the other side.
  // Sections alternate sides down the page so neighbouring sigils never pile up.
  const r = seeded(seed); const pool = SIGIL_SHAPES.filter(x => x !== lead); const out = [];
  for (let i = 0; i < Math.min(n, 2); i++) {
    const main = i === 0;
    const shape = main && lead ? lead : pool.splice(Math.floor(r() * pool.length), 1)[0];
    const right = main ? side === "r" : side !== "r";
    const size = Math.round(main ? 240 + r() * 140 : 110 + r() * 60);
    const x = Math.round(main ? (right ? 76 + r() * 16 : 8 + r() * 16) : (right ? 88 + r() * 8 : 4 + r() * 10));
    const y = Math.round(main ? 28 + r() * 30 : 72 + r() * 18);
    const rot = Math.round(r() * 70 - 35);
    const op = (main ? 0.05 + r() * 0.035 : 0.03 + r() * 0.015).toFixed(3);
    const wear = WEARS[Math.floor(r() * WEARS.length)];
    out.push(html`<i class=${`sigil sg-${shape} ${wear}`} aria-hidden="true" style=${`--x:${x}%;--y:${y}%;--s:${size}px;--r:${rot}deg;--o:${op}`}></i>`);
  }
  return out;
}

/* ================= attributes ================= */
function AttrRow({ c, a, mode, set }) {
  // One bar of ten cells with a moving 10 marker.
  // Broken (below 10): the 10 sits at the right end and red cells show how far short the attribute is.
  // At 10 or above: the 10 jumps to the left end and the cells fill toward 20.
  // Left-click a cell to raise the attribute to it; right-click a filled cell to lower it.
  const v = R.attr(c, a.k), base = R.attrBase(c, a.k), ceiling = R.attrCap(c, a.k), cap = mode === "build" ? 20 : ceiling;
  const diff = v - 10, broken = v < 10;
  const showTip = (e, to) => tip.show(e.currentTarget, to === null ? { title: `${a.n} ${v}`, lines: [html`<${Mouse} side="L" /> raise · <${Mouse} side="R" /> lower`] } : levelTip(c, mode, "attr", a.k, to, "L", "R"));
  const cellFor = (val, cls, extra) => {
    const filled = val <= v;
    const raiseTo = val, lowerTo = val - 1;
    return html`<button type="button" class=${"cell " + cls} aria-label=${filled ? `Lower ${a.n} to ${lowerTo}` : `Raise ${a.n} to ${raiseTo}`}
      onMouseEnter=${e => showTip(e, cls.includes("sealed") ? raiseTo : filled ? lowerTo : raiseTo)} onMouseLeave=${() => tip.hide()}
      onClick=${() => { if (!filled) { set(raiseTo); tip.hide(); } else toast("Right-click (long-press on a phone) to lower."); }}
      onContextMenu=${e => { e.preventDefault(); if (filled) { set(lowerTo); tip.hide(); } }}
      onKeyDown=${e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); set(filled ? lowerTo : raiseTo); } }}>${extra || ""}</button>`;
  };
  const cells = [];
  if (broken) {
    for (let x = 0; x <= 9; x++) {        // cell x stands for the attribute's (x+1)th point
      const val = x + 1, missing = val > v, bought = !missing && val > base;
      cells.push(cellFor(val, missing ? "miss" : bought ? "bought" : "have"));
    }
  } else {
    let walled = false;
    for (let x = 11; x <= 20; x++) {
      const on = v >= x, bought = on && x > Math.max(base, 10), sealed = !on && x > cap;
      const wall = sealed && !walled; if (sealed) walled = true;
      cells.push(cellFor(x, (on ? (bought ? "bought" : "up") : "") + (sealed ? " sealed" : "") + (wall ? " wall" : ""), wall ? html`<svg class="lock" viewBox="0 0 12 14" aria-hidden="true"><rect x="1.5" y="6" width="9" height="7" rx="1" fill="currentColor"/><path d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>` : ""));
    }
  }
  const mid = html`<button type="button" class=${"mid" + (v === 10 ? " at" : "") + (broken ? " from-l" : " from-r")} aria-label=${`Set ${a.n} to 10`}
    onMouseEnter=${e => showTip(e, v === 10 ? null : 10)} onMouseLeave=${() => tip.hide()}
    onClick=${() => { if (v < 10) { set(10); tip.hide(); } }} onContextMenu=${e => { e.preventDefault(); if (v > 10) { set(10); tip.hide(); } }}>10</button>`;
  const state = diff < 0 ? html`<span class="flag bad">Broken ${diff}</span>` : diff > 0 ? html`<span class="flag">+${diff}</span>` : html`<span class="flag">Median</span>`;
  return html`<div class=${"attr" + (broken ? " is-broken" : "")}>
    <span class="nm">${a.n}</span>
    <span class="valblock"><span class="val">${v}</span>${state}</span>
    <span class=${"scale " + (broken ? "low" : "high")} role="group" aria-label=${`${a.n} scale`}>
      ${broken ? html`<span class="end">0</span><span class="half">${cells}</span>${mid}` : html`${mid}<span class="half">${cells}</span><span class="end">20</span>`}
    </span>
    <span class="base">${base < 10 ? html`<span>started ${base}</span>` : ""}<span>${ceiling < 20 ? html`<b class="sealtext">sealed at ${ceiling}</b>` : "limit 20"}</span>
      ${mode === "build" && !broken && html`<button type="button" class="btn small breakbtn" title=${`Make ${a.n} a broken attribute (drops it to 9). Left-click the bar to go lower.`} onClick=${() => set(9)}>Break</button>`}</span>
  </div>`;
}

/* ================= sheet tab ================= */
function SheetTab({ c, d, update, mode, invested, toggleInv, openSkill }) {
  // The brass diamond on a section heading: filled shows only invested skills, hollow shows them all.
  const diamond = (k, what) => html`<span class="orn has-btn"><button type="button" class=${"diamond" + (invested[k] ? " on" : "")} aria-pressed=${invested[k]}
    aria-label=${invested[k] ? `Show all ${what}` : `Show only invested ${what}`} onClick=${() => toggleInv(k)}
    onMouseEnter=${e => tip.show(e.currentTarget, { title: invested[k] ? "Invested only" : "All " + what, lines: [invested[k] ? `Click to show all ${what}` : `Click to show only ${what} with points`] })} onMouseLeave=${() => tip.hide()}></button></span>`;
  const set = (kind, name) => to => setLevel(c, update, mode, kind, name, to);
  const tipFn = (kind, name) => to => levelTip(c, mode, kind, name, to, "L", "R");
  const p = d.armor;
  const nameBtn = (kind, n, extra) => html`<button type="button" class="n sname" onClick=${() => openSkill(kind, n)} title=${`What ${n} grants at each level`}>${n}${extra || ""}</button>`;
  const groups = R.SKILL_GROUPS.map(g => ({ g, rows: g.skills.filter(([n]) => !invested.skills || num(c.skills[n]) > 0) })).filter(x => x.rows.length);
  const weap = ["STR", "DEX"].map(at => ({ at, rows: R.WEAPON_TYPES.filter(w => w[1] === at && (!invested.weapons || num(c.weaponSkills[w[0]]) > 0)) })).filter(x => x.rows.length);
  const secs = R.SECONDARY.map(sk => ({ sk, b: R.secondaryBonus(c, sk.name, p) })).filter(x => !invested.sec || x.b.trained);
  const none = what => html`<p class="muted emptyline">No ${what} invested yet. Click the diamond to show them all.</p>`;
  // How many points an attribute allows in its skills, shown beside each group's heading.
  const allowance = at => { const av = R.attr(c, at); return html`<small>${av < 10 ? "broken · no points" : `up to ${R.pointsAbove10(av)}`}</small>`; };
  return html`<div class="tabpane">
    <section class="frame"><${Sigils} seed="attributes" n=${2} lead="attr" side="r" /><${Head} title="Attributes" topic="attributes" /><p class="sub">Ten is the measure of common folk. Fall below it and the attribute is broken.</p>
      <div class="legend">
        <span class="item"><i class="cell miss"></i><b>Broken</b><small>Points below 10 the character is missing</small></span>
        <span class="item"><i class="cell up"></i><b>Natural</b><small>Points above 10 from character creation</small></span>
        <span class="item"><i class="cell bought"></i><b>Bought</b><small>Points raised with Karma</small></span>
        <span class="item"><i class="cell sealed"></i><b>Sealed</b><small>Karma can never raise a broken attribute past here</small></span>
      </div>
      <p class="hint"><${Mouse} side="L" /> Left-click to raise · <${Mouse} side="R" /> right-click to lower (long-press on a phone) · hover for the Karma cost. Skill pips work the same way.${mode === "build" ? " In Free edit, Break turns an attribute into a broken one." : ""}</p>
      <div class="attrs">${R.ATTRS.map(a => html`<${AttrRow} key=${a.k} c=${c} a=${a} mode=${mode} set=${set("attr", a.k)} />`)}</div>
    </section>

    <section class="frame"><${Sigils} seed="skills" n=${1} lead="skill" side="l" /><${Head} title="Skills" topic="skills" tail=${diamond("skills", "skills")} /><p class="sub">Modifier shown after armor penalties. Click a skill's name to see what each level grants. ${p.armor ? `Wearing ${p.armor.name || "armor"}: casting −${p.casting}%${p.dexSkills ? `, Dexterity skills −${p.dexSkills}%` : ""}.` : ""}</p>
      ${groups.length ? html`<div class="skillcols">${groups.map(({ g, rows }) => html`<div class="sgroup"><h3>${R.ATTR_NAME[g.attr]}${allowance(g.attr)}</h3>
          ${rows.map(([n]) => { const lv = num(c.skills[n]); const cap = R.skillCap(c, n); const mod = R.skillModifier(c, n, p);
            return html`<div class=${"srow" + (lv ? "" : " dim")}>${nameBtn("skill", n, html`${lv > cap ? html` <span class="flag bad">over cap</span>` : ""}${R.CASTING.includes(n) && lv && p.casting ? html` <span class="flag warn">armor</span>` : ""}`)}
              <${Pips} value=${lv} cap=${cap} label=${n} onSet=${set("skill", n)} tipFor=${tipFn("skill", n)} /><span class="m">${lv ? pct(mod) : "—"}</span></div>`; })}</div>`)}</div>` : none("skills")}
    </section>

    <section class="frame"><${Sigils} seed="weaponry" n=${1} lead="weap" side="r" /><${Head} title="Weaponry" topic="weaponry" tail=${diamond("weapons", "weapon skills")} /><p class="sub">Proficiency at 3, 5, 7 and 10. Accuracy needs Competent (3) and adds Precision.</p>
      ${weap.length ? html`<div class="skillcols">${weap.map(({ at, rows }) => html`<div class="sgroup"><h3>${R.ATTR_NAME[at]} weapons${allowance(at)}</h3>
        ${rows.map(([w]) => { const lv = num(c.weaponSkills[w]);
          return html`<div class=${"srow" + (lv ? "" : " dim")}>${nameBtn("weapon", w, lv ? html`<em>${R.proficiency(lv)}</em>` : "")}
            <${Pips} value=${lv} cap=${R.weaponCap(c, w)} label=${w} onSet=${set("weapon", w)} tipFor=${tipFn("weapon", w)} /><span class="m">${lv >= 3 ? "+" + pct(lv + num(c.skills.Precision)) : "—"}</span></div>`; })}</div>`)}</div>` : none("weapon skills")}
    </section>

    <section class="frame"><${Sigils} seed="secondary" n=${1} lead="sec" side="l" /><${Head} title="Secondary skills" topic="secondary" tail=${diamond("sec", "secondary skills")} /><p class="sub">7% per level. Some come free with a primary skill, and then stack with it.</p>
      ${secs.length ? html`<div class="sec">${secs.map(({ sk, b }) => { const lv = num(c.secondary[sk.name]); const cap = R.secondaryCap(c, sk.name);
        return html`<div class=${"srow" + (b.trained ? "" : " dim")}>${nameBtn("sec", sk.name, html`<em>${b.source}</em>${b.disadv ? html` <span class="flag warn">disadv.</span>` : ""}`)}
          <${Pips} value=${lv} max=${3} cap=${cap} label=${sk.name} onSet=${set("sec", sk.name)} tipFor=${tipFn("sec", sk.name)} /><span class="m">${b.trained ? pct(b.bonus) : "—"}</span></div>`; })}</div>` : none("secondary skills")}
    </section>

    <section class="frame"><${Sigils} seed="notes" n=${1} lead="note" side="r" /><h2 class="h"><span>Notes</span><i class="orn" aria-hidden="true"></i></h2>
      <div class="field"><label for=${"notes-" + c.id}>Backstory, anything else</label>
      <textarea id=${"notes-" + c.id} rows="5" value=${c.notes} onInput=${e => update(x => { x.notes = e.target.value; })}></textarea></div></section>
  </div>`;
}

/* ================= skill side panel ================= */
const TYPE_NAME = { P: "Passive", A: "Active", E: "Empowerment", M: "Active + passive" };
const PROFICIENCY_ROWS = [[3, "Competent", "Weapon skill is added to accuracy."], [5, "Proficient", "Durability damage to the weapon is reduced."], [7, "Adept", "The weapon's Adept property unlocks."], [10, "Master", "The weapon's Mastery property unlocks."]];
function SkillPanel({ c, kind, name, mode, update, onClose }) {
  const ref = useRef();
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); ref.current && ref.current.focus(); return () => window.removeEventListener("keydown", k); }, [name]);
  const data = kind === "sec" ? null : SKILL_DATA.skills[name];
  const { L, from: lv, cap } = levelState(c, mode, kind, name);
  const at = L.attrOf(name), an = R.ATTR_NAME[at], max = L.max;
  const set = to => setLevel(c, update, mode, kind, name, to);
  const sec = kind === "sec" ? R.SECONDARY_BY_NAME[name] : null;
  const secB = sec ? R.secondaryBonus(c, name) : null;
  return html`<aside class="spanel" role="dialog" aria-label=${`${name} levels`} tabindex="-1" ref=${ref}>
    <header class="sphead">
      <div><span class="lbl">${kind === "weapon" ? "Weapon skill" : kind === "sec" ? "Secondary skill" : "Skill"} · ${an}</span><h2>${name}</h2></div>
      <button class="iconbtn" aria-label="Close" onClick=${onClose}>×</button>
    </header>
    <div class="spnow">
      <${Pips} value=${lv} max=${max} cap=${cap} label=${name} onSet=${set} tipFor=${to => levelTip(c, mode, kind, name, to, "L", "R")} />
      <span class="muted">Level ${lv} of ${max}${cap < max ? ` · ${an} ${R.attr(c, at)} allows ${cap}` : ""}</span>
    </div>
    <div class="spbody">
      ${(SKILL_TABLES[name] || []).map(t => html`<div class="sptable"><h4>${t.title}</h4>${t.note && html`<p class="muted">${t.note}</p>`}
        <div class="tbl-wrap"><table><thead><tr>${t.cols.map(x => html`<th>${x}</th>`)}</tr></thead>
          <tbody>${t.rows.map(r => html`<tr>${r.map((x, i) => html`<td class=${i === 0 ? "k" : ""}>${x}</td>`)}</tr>`)}</tbody></table></div></div>`)}
      ${data && data.d && html`<p class="spdesc">${data.d}</p>`}
      ${data && data.r && html`<ul class="sprules">${data.r.map(x => html`<li>${x}</li>`)}</ul>`}
      ${data && data.b && data.b.map(b => html`<details class="spbox"><summary>${b.title}</summary><ul>${b.lines.map(x => html`<li>${x}</li>`)}</ul></details>`)}

      ${kind === "weapon" && html`<div class="spgroup"><h3>Proficiency</h3>
        ${PROFICIENCY_ROWS.map(([l, n, t]) => html`<div class=${"perk" + (lv >= l ? " got" : l > cap ? " locked" : "")}><span class="plv">${l}</span><div><b class="pname">${n}</b><p>${t}</p></div></div>`)}</div>`}

      ${data && data.gs.map(g => html`<div class="spgroup">
        ${g.n && g.n !== "Perks" && html`<h3>${g.n}</h3>`}${g.f && html`<p class="flavor">${g.f}</p>`}
        ${g.p.map(pk => html`<div class=${"perk" + (lv >= pk.l ? " got" : pk.l > cap ? " locked" : "")}>
          <span class="plv" title=${lv >= pk.l ? "Unlocked" : pk.l > cap ? `Needs ${an} ${10 + pk.l}` : `Unlocks at level ${pk.l}`}>${pk.l}</span>
          <div><span class=${"ptype t-" + pk.t}>${TYPE_NAME[pk.t]}</span><${UsageLine} u=${pk.u} />
            <p>${pk.x || "Not written yet."}</p></div></div>`)}</div>`)}

      ${sec && html`<div class="spgroup">
        ${SKILL_DATA.secondary[name] && html`<p class="spdesc">${SKILL_DATA.secondary[name]}</p>`}
        <div class="perk got"><span class="plv">%</span><div><b class="pname">Right now: ${secB.trained ? pct(secB.bonus) : "untrained"}</b><p>${secB.source}${secB.disadv ? " · rolls with disadvantage" : ""}</p></div></div>
        ${[1, 2, 3].map(l => html`<div class=${"perk" + (lv >= l ? " got" : l > cap ? " locked" : "")}><span class="plv">${l}</span><div><b class="pname">Level ${l}: ${7 * l}%</b>
          <p>Costs ${sec.cost[l - 1]} Karma.${l > 1 ? ` Needs ${an} ${l === 2 ? 10 : 14} or more.` : ""}</p></div></div>`)}
        ${sec.primary && html`<p class="muted">Also granted by ${sec.primary} ${sec.at}. With both, the bonus is 7% per level plus 2 × ${sec.primary} level.</p>`}</div>`}

      ${data && data.tips && html`<details class="spbox"><summary>Tips</summary><ul>${data.tips.map(x => html`<li>${x}</li>`)}</ul></details>`}
      ${kind === "weapon" && !data && html`<p class="muted">No perks have been written for ${name} yet.</p>`}
    </div>
  </aside>`;
}

/* ================= vitals tab ================= */
function Meter({ id, label, cur, max, color, soft, onSet, note, marks = [], invert, topic }) {
  const [amt, setAmt] = useState("");
  const pctW = max ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
  // The bar itself is the control: left-click adds the amount (1 if blank), right-click removes it.
  const step = () => Math.max(1, Math.floor(+amt || 1));
  const apply = sign => { onSet(cur + sign * step()); setAmt(""); tip.hide(); };
  const stepTip = () => ({ title: `${label} ${cur} / ${max}`, lines: [html`<${Mouse} side="L" /> add ${step()} · <${Mouse} side="R" /> remove ${step()}`] });
  return html`<div class="meter">
    <div class="top2">${topic ? html`<button type="button" class="t hlink" style=${`color:${color}`} onClick=${() => openRuleFn(topic)} aria-label=${`${label}: show the rules`}>${label}${BOOK}</button>` : html`<span class="t" style=${`color:${color}`}>${label}</span>`}<span class="v">${cur}<small> / ${max}</small></span></div>
    <button type="button" class="track step" style=${`background:${soft}`} aria-label=${`${label}: left-click adds, right-click removes`}
      onMouseEnter=${e => tip.show(e.currentTarget, stepTip())} onMouseLeave=${() => tip.hide()}
      onClick=${() => apply(1)} onContextMenu=${e => { e.preventDefault(); apply(-1); }}
      onKeyDown=${e => { if (["ArrowRight", "ArrowUp", "+", "="].includes(e.key)) { e.preventDefault(); apply(1); } else if (["ArrowLeft", "ArrowDown", "-", "Delete", "Backspace"].includes(e.key)) { e.preventDefault(); apply(-1); } }}>
      <i style=${`width:${pctW}%;background:${color}`}></i>${marks.map(m => html`<b style=${`left:${(m / max) * 100}%`} title=${`${m}`}></b>`)}</button>
    <div class="ctl">
      <input id=${id} type="number" min="1" placeholder="1" aria-label=${`${label} amount`} value=${amt} onInput=${e => setAmt(e.target.value)} onKeyDown=${e => { if (e.key === "Enter") apply(e.shiftKey ? 1 : -1); }} />
      <span class="muted steptip"><${Mouse} side="L" /> add · <${Mouse} side="R" /> remove</span>
      <button class="btn small" onClick=${() => onSet(invert ? 0 : max)}>${invert ? "Clear" : "Full"}</button></div>
    ${note && html`<div class="note">${note}</div>`}</div>`;
}

// Stamina lost: one bar of ten, read like an attribute bar. Each stack lost is a level of Exhaustion; the tenth is death.
const SKULL = html`<svg class="skull" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.6c-3.4 0-5.6 2.3-5.6 5.3 0 1.8.8 3 2 3.7v2.3c0 .6.4 1 1 1h5.2c.6 0 1-.4 1-1v-2.3c1.2-.7 2-1.9 2-3.7 0-3-2.2-5.3-5.6-5.3z" fill="currentColor"/><circle cx="5.7" cy="7.4" r="1.5" fill="var(--sk-eye, var(--card))"/><circle cx="10.3" cy="7.4" r="1.5" fill="var(--sk-eye, var(--card))"/><path d="M8 9.4l-.9 1.5h1.8z M6.4 12.2v1.8 M8 12.2v1.8 M9.6 12.2v1.8" fill="var(--sk-eye, var(--card))" stroke="var(--sk-eye, var(--card))" stroke-width=".8"/></svg>`;
const conditioningIgnores = c => (num(c.skills.Conditioning) >= 5 ? 2 : 0);
function StaminaBar({ c, update }) {
  const n = num(c.vitals.exhaustion), ign = conditioningIgnores(c), immortal = num(c.skills.Conditioning) >= 9;
  const set = to => { to = R.clamp(to, 0, 10); if (to === n) return; update(x => { R.setStamina(x, to); addLog(x, `Stamina lost ${n} → ${to}`); }); tip.hide(); };
  const tipFor = (i, filled) => ({ tone: filled ? "refund" : "short", title: html`<${Mouse} side=${filled ? "R" : "L"} /> ${filled ? `recover to ${i - 1}` : `lose ${i === n + 1 ? "a stack" : "stacks"} to ${i}`}`,
    lines: [i === 10 && immortal ? "Conditioning 9: no death; each stack past 10 costs 5 HP" : `Exhaustion ${i}: ${R.EXHAUSTION[i]}`, i <= ign ? "Conditioning 5: no effect" : ""] });
  const cells = [];
  for (let i = 1; i <= 10; i++) {
    const filled = i <= n;
    cells.push(html`<button type="button" class=${"cell" + (filled ? " miss" : "") + (i === 10 ? " skullcell" : "") + (i <= ign ? " ignored" : "")}
      aria-label=${filled ? `Recover Stamina to ${i - 1} lost` : `Lose Stamina: ${i} lost`}
      onMouseEnter=${e => tip.show(e.currentTarget, tipFor(i, filled))} onMouseLeave=${() => tip.hide()}
      onClick=${() => { if (!filled) set(i); else toast("Right-click (long-press on a phone) to recover."); }}
      onContextMenu=${e => { e.preventDefault(); if (filled) set(i - 1); }}
      onKeyDown=${e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); set(filled ? i - 1 : i); } }}>${i === 10 ? SKULL : ""}</button>`);
  }
  return html`<section class=${"meter stambar" + (n ? " lost" : "") + (n >= 10 ? " dead" : "")}>
    <div class="top2"><button type="button" class="t hlink" onClick=${() => openRuleFn("stamina")} aria-label="Stamina: show the rules">Stamina lost${BOOK}</button>
      <span class="v">${n}<small> / 10</small></span></div>
    <span class="scale stam" role="group" aria-label="Stamina lost"><span class="end">0</span><span class="half">${cells}</span></span>
    <div class="ctl"><span class="note"><${Mouse} side="L" /> lose a stack · <${Mouse} side="R" /> recover one. Each stack lost is a level of Exhaustion.</span></div>
  </section>`;
}
// The Exhaustion window: just "0, no effect" while rested; each stack lost adds its effect, and they all stay in force together.
function ExhaustionList({ c, d, update }) {
  const n = num(c.vitals.exhaustion), ign = conditioningIgnores(c), immortal = num(c.skills.Conditioning) >= 9;
  const suggested = Math.max(d.exhaustionFromBlood, d.exhaustionFromHunger);
  const rows = n === 0 ? [0] : Array.from({ length: n }, (_, i) => i + 1);
  return html`<p class="sub">${n === 0 ? "Rested. Effects are added here as Stamina is lost, and every one stays in force until it's recovered." : `${n} stack${n > 1 ? "s" : ""} lost: ${n - Math.min(n, ign)} effect${n - Math.min(n, ign) === 1 ? "" : "s"} in force.`}</p>
    ${suggested > n && html`<div class="poolwarn"><span>${d.exhaustionFromBlood >= d.exhaustionFromHunger ? "Blood loss" : "Hunger"} calls for at least ${suggested} stack${suggested > 1 ? "s" : ""} lost.</span>
      <button class="btn small" onClick=${() => update(x => { R.setStamina(x, suggested); addLog(x, `Stamina lost ${n} → ${suggested} (vitals)`); })}>Set to ${suggested}</button></div>`}
    <ol class="exlist" aria-live="polite">${rows.map(i => html`<li class=${"exrow" + (i ? " active" : " rested") + (i === n ? " now" : "") + (i === 10 ? " death" : "") + (i && i <= ign ? " ignored" : "")}>
      <span class="exn">${i === 10 ? SKULL : i}</span>
      <span class="ext">${i === 10 && immortal ? "Would be death; Conditioning 9 holds it off. Each further stack costs 5 HP." : i === 0 ? "Exhaustion 0 · no effect" : R.EXHAUSTION[i]}${i && i <= ign ? html` <small class="flag">Conditioning 5 ignores this</small>` : ""}</span></li>`)}</ol>`;
}

function VitalsTab({ c, d, update }) {
  const v = c.vitals; const [cond, setCond] = useState(""); const [confirmLong, setConfirmLong] = useState(false);
  const setV = (k, val, lo, hi) => update(x => { x.vitals[k] = R.clamp(Math.round(val), lo, hi); });
  return html`<div class="tabpane">
    <section class="meters">
      <${Meter} id=${"hp-" + c.id} label="Hit points" topic="hp" cur=${d.cur.hp} max=${d.max.hp} color="var(--blood)" soft="var(--blood-soft)"
        onSet=${n => setV("hp", n, 0, d.max.hp)} note=${d.cur.hp === 0 ? "Unconscious: roll death saves (d100, 50 or lower succeeds)." : `${num(v.exhaustion) >= 7 ? "Maximum halved by Exhaustion. " : ""}Long rest restores ${d.hpRegen}.`} />
      <${Meter} id=${"bp-" + c.id} label="Blood points" topic="bp" cur=${d.cur.bp} max=${d.max.bp} color="var(--life)" soft="var(--life-soft)" marks=${[100, 80, 60, 40, 20].filter(m => m < d.max.bp)}
        onSet=${n => setV("bp", n, 0, d.max.bp)} note=${d.exhaustionFromBlood ? `Blood loss: ${d.exhaustionFromBlood} Exhaustion at this level.` : `Exhaustion starts at 100. Long rest restores ${d.bpRegen}.`} />
      <${Meter} id=${"dp-" + c.id} label="Deprivation" topic="dp" cur=${d.cur.dp} max=${d.max.dp} color="var(--hunger)" soft="var(--hunger-soft)" marks=${[25, 20, 15, 10, 5].filter(m => m < d.max.dp)}
        onSet=${n => setV("dp", n, 0, d.max.dp)} note=${d.exhaustionFromHunger ? `Hunger: ${d.exhaustionFromHunger} Exhaustion at this level.` : `${d.mealsPerDay} meals and ${d.rationsPerDay} rations a day keep this full.`} />
      <${Meter} id=${"tox-" + c.id} label="Toxicity" topic="tox" cur=${d.cur.tox} max=${d.max.tox} color="var(--tox)" soft="var(--tox-soft)" invert
        onSet=${n => setV("tox", n, 0, d.max.tox * 3)} note=${d.overToxic ? html`<b style="color:var(--bad)">Over the threshold: puking, potion effects lost, no AP.</b>` : `Threshold ${d.max.tox}. Cleanses ${d.cleanse} per long rest.`} />
    </section>

    <${StaminaBar} c=${c} update=${update} />

    <section class="frame"><${Sigils} seed="exhaustion" n=${1} side="r" /><${Head} title="Exhaustion" topic="stamina" />
      <${ExhaustionList} c=${c} d=${d} update=${update} />
    </section>

    <section class="frame"><${Head} title="Wounds" topic="wounds" /><p class="sub">Bleeding ${d.bleedPerTurn} Blood per turn in combat, per minute outside it.</p>
      <div class="wounds">${Object.entries(R.WOUNDS).map(([k, w]) => html`<div class="wound">
        <div class="row" style="justify-content:space-between"><span class="lbl">${k} · ${d.woundAt[k]}+ dmg</span><span class="cnt">${num(v.wounds[k])}</span></div>
        <div class="muted">Bleeds ${w.bleed}. ${w.fix}.</div>
        <div class="row"><button class="btn small" aria-label=${`${k} wounds: left-click adds one, right-click marks one treated`}
            onMouseEnter=${e => tip.show(e.currentTarget, { title: `${k[0].toUpperCase() + k.slice(1)} wounds`, lines: [html`<${Mouse} side="L" /> add a wound · <${Mouse} side="R" /> treated`] })} onMouseLeave=${() => tip.hide()}
            onClick=${() => update(x => { x.vitals.wounds[k] = num(x.vitals.wounds[k]) + 1; })}
            onContextMenu=${e => { e.preventDefault(); if (num(v.wounds[k])) update(x => { x.vitals.wounds[k] = Math.max(0, num(x.vitals.wounds[k]) - 1); addLog(x, `Treated a ${k} wound`); }); }}
            onKeyDown=${e => { if (["Delete", "Backspace", "-"].includes(e.key) && num(v.wounds[k])) { e.preventDefault(); update(x => { x.vitals.wounds[k] = Math.max(0, num(x.vitals.wounds[k]) - 1); addLog(x, `Treated a ${k} wound`); }); } }}>± Wound</button>
          <span class="muted steptip"><${Mouse} side="L" /> add · <${Mouse} side="R" /> treated</span></div></div>`)}</div>
      <div class="row" style="margin-top:10px"><button class="btn small" disabled=${!d.bleedPerTurn} onClick=${() => update(x => { x.vitals.bp = Math.max(0, d.cur.bp - d.bleedPerTurn); addLog(x, `Bled ${d.bleedPerTurn}`); })}>Bleed one turn (−${d.bleedPerTurn})</button>
        <span class="muted">Damage is counted after armor. ${num(c.skills.Durability) >= 7 ? "Durability 7 adds 2 to every wound threshold." : ""}</span></div>
    </section>

    <section class="two">
      <div class="frame"><h2 class="h"><span>Conditions</span><i class="orn" aria-hidden="true"></i></h2>
        <div class="chips">${v.conditions.map((t, i) => html`<span class="cond">${t}<button aria-label=${`Remove ${t}`} onClick=${() => update(x => { x.vitals.conditions.splice(i, 1); })}>×</button></span>`)}
          ${!v.conditions.length && html`<span class="muted">None</span>`}</div>
        <form class="row" style="margin-top:10px" onSubmit=${e => { e.preventDefault(); const t = cond.trim(); if (t) { update(x => { x.vitals.conditions.push(t); }); setCond(""); } }}>
          <input class="inp" style="flex:1;min-width:140px" list="cw-conds" placeholder="Stunned, Entangled, Frightened…" aria-label="New condition" value=${cond} onInput=${e => setCond(e.target.value)} />
          <datalist id="cw-conds">${["Stunned", "Entangled", "Frightened", "Blinded", "Prone", "Poisoned", "Charmed", "Paralyzed", "Deafened", "Unconscious", "On Death's Door"].map(o => html`<option value=${o}></option>`)}</datalist>
          <button class="btn small" type="submit">Add</button></form></div>
      <div class="frame"><${Sigils} seed="rest" n=${1} side="l" /><${Head} title="Rest" topic="rest" />
        <div class="row"><button class="btn" onClick=${() => update(x => addLog(x, R.shortRest(x)))}>Short rest</button>
          ${confirmLong ? html`<span class="confirm" style="padding:6px 10px">Roll ${d.cleanse} and apply? <button class="btn small primary" onClick=${() => { update(x => { const m = R.longRest(x); addLog(x, m); toast(m); }); setConfirmLong(false); }}>Long rest</button><button class="btn small" onClick=${() => setConfirmLong(false)}>Cancel</button></span>`
            : html`<button class="btn primary" onClick=${() => setConfirmLong(true)}>Long rest</button>`}</div>
        <p class="muted">Long rest: +${d.hpRegen} HP, +${d.bpRegen} Blood, cleanse ${d.cleanse} Toxicity, recover ${num(c.skills.Conditioning) >= 7 ? 4 : 2} Stamina, recharge every ability. Short rest: recover ${num(c.skills.Conditioning) >= 6 ? 2 : 1} Stamina, recharge short-rest abilities.</p>
        <div class="log">${(c.log || []).slice(0, 12).map(l => html`<div><time>${new Date(l.t).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>${l.m}</div>`)}</div></div>
    </section>

    <section class="frame"><h2 class="h"><span>At a glance</span><i class="orn" aria-hidden="true"></i></h2>
      <div class="facts">
        ${[["Movement", `${d.move} m`], ["Climb · swim", `${d.climb} m`], ["Wound at", `${d.woundAt.light} / ${d.woundAt.moderate} / ${d.woundAt.mortal}`], ["Blood potency", d.potency],
           ["Rations per meal", d.rationsPerMeal], ["Rations per day", d.rationsPerDay], ["Cleanse die", d.cleanse], ["HP per long rest", d.hpRegen]].map(([k, val]) => html`<div class="fact"><span>${k}</span><b>${val}</b></div>`)}</div>
    </section>
  </div>`;
}

/* ================= skills & talents tab ================= */
// Every perk the character's skills have unlocked, as cards modelled on the rulebook's perk boxes (level and kind on the left,
// the usage icons above the text), plus talents of the player's own for whatever the rules don't cover.
const TYPE_SHORT = { P: "Passive", A: "Active", E: "Empow.", M: "Active" };
function unlockedPerks(c) {
  const out = [];
  const add = (name, lv, kind) => {
    const sd = SKILL_DATA.skills[name]; if (!sd || !lv) return;
    const got = [];
    sd.gs.forEach(g => g.p.forEach(p => { if (lv >= p.l) got.push(Object.assign({ key: `p:${name}:${p.l}`, group: g.n && g.n !== "Perks" ? g.n : "", flavor: g.f || "" }, p)); }));
    if (got.length) out.push({ name, lv, kind, attr: R.LEVELS[kind].attrOf(name), perks: got });
  };
  R.SKILL_GROUPS.forEach(g => g.skills.forEach(([n]) => add(n, num(c.skills[n]), "skill")));
  R.WEAPON_TYPES.forEach(([w]) => add(w, num(c.weaponSkills[w]), "weapon"));
  return out.sort((a, b) => b.lv - a.lv || a.name.localeCompare(b.name));
}
// Tick boxes for an ability's uses. Ticking box i marks i + 1 spent; unticking the last ticked box gives one back.
function UseBoxes({ c, ukey, uses, recharge, update, label }) {
  const max = Math.max(0, Math.floor(num(uses))); if (!max) return null;
  const spent = Math.min(max, num((c.uses || {})[ukey]));
  const set = n => update(x => { x.uses = x.uses || {}; if (n) x.uses[ukey] = n; else delete x.uses[ukey]; if (n > spent) addLog(x, `Used ${label}`); });
  return html`<div class="usebox"><span class="lbl">Uses</span>
    ${Array.from({ length: max }, (_, i) => html`<button type="button" class=${"usetick" + (i < spent ? " spent" : "")} aria-pressed=${i < spent}
      aria-label=${i < spent ? `Give back use ${i + 1} of ${label}` : `Spend use ${i + 1} of ${label}`} onClick=${() => set(i < spent ? i : i + 1)}></button>`)}
    <small class="muted">${spent >= max ? "All used · " : `${max - spent} left · `}${recharge ? `back on a ${recharge.toLowerCase()}` : "recharge not set"}</small></div>`;
}
function PerkCard({ c, p, update, skill }) {
  const t = p.t || "P";
  return html`<article class=${"perkcard t-" + t}>
    <div class="pbox"><b>${p.l}</b><small>${TYPE_SHORT[t]}</small></div>
    <div class="pmain"><div class="phead"><b class="pname">${p.group || skill}</b><${UsageLine} u=${p.u} /></div>
      <p>${p.x || "Not written yet."}</p>
      ${p.u && p.u.uses && html`<${UseBoxes} c=${c} ukey=${p.key} uses=${p.u.uses} recharge=${p.u.recharge} update=${update} label=${`${skill} ${p.l}`} />`}</div>
  </article>`;
}
const TALENT_TYPES = [["P", "Passive"], ["A", "Active"], ["E", "Empowerment"]];
function TalentCard({ c, t, i, update }) {
  const set = k => v => update(x => { x.talents[i][k] = v; });
  const u = { recharge: t.recharge || "", ap: t.ap === "" || t.ap == null ? "" : String(t.ap), uses: t.uses ? String(t.uses) : "", stamina: t.stamina ? String(t.stamina) : "", turns: t.turns ? String(t.turns) : "" };
  if (t.final) return html`<article class=${"perkcard talent t-" + (t.type || "P")}>
    <div class="pbox"><svg class="tstar" viewBox="0 0 20 20" aria-hidden="true">${TAB_ICONS.talents}</svg><small>${TYPE_SHORT[t.type || "P"]}</small></div>
    <div class="pmain"><div class="phead"><b class="pname">${t.name || "Unnamed talent"}</b><${UsageLine} u=${u} />
        <button type="button" class="iconbtn editbtn" aria-label=${`Edit ${t.name || "talent"}`} onClick=${() => update(x => { x.talents[i].final = false; })}>${PENCIL}</button></div>
      ${t.source && html`<i class="psource">${t.source}</i>`}
      <p>${t.text || "No description yet."}</p>
      ${t.uses > 0 && html`<${UseBoxes} c=${c} ukey=${"t:" + t.id} uses=${t.uses} recharge=${t.recharge} update=${update} label=${t.name || "talent"} />`}</div>
  </article>`;
  const id = k => `tl-${k}-${t.id}`;
  return html`<div class="wcard editing talentedit">
    <div class="title"><input aria-label="Talent name" placeholder="Talent name" value=${t.name} onInput=${e => set("name")(e.target.value)} /><span class="flag">Editing</span></div>
    <div class="grid2">
      <div class="mini"><label for=${id("type")}>Kind</label><select id=${id("type")} value=${t.type || "P"} onChange=${e => set("type")(e.target.value)}>${TALENT_TYPES.map(([k, n]) => html`<option value=${k}>${n}</option>`)}</select></div>
      <div class="mini"><label for=${id("src")}>Comes from</label><input id=${id("src")} placeholder="Runic tattoo" value=${t.source || ""} onInput=${e => set("source")(e.target.value)} /></div>
      ${t.type !== "P" && html`<${Mini} id=${id("uses")} label="Uses" min="0" value=${t.uses} onInput=${set("uses")} />
        <div class="mini"><label for=${id("rc")}>Recharges on</label><select id=${id("rc")} value=${t.recharge || ""} onChange=${e => set("recharge")(e.target.value)}>
          <option value="">—</option><option>Long rest</option><option>Short rest</option></select></div>
        <${Mini} id=${id("ap")} label="AP cost" min="0" value=${t.ap} onInput=${set("ap")} />
        <${Mini} id=${id("st")} label="Stamina cost" min="0" value=${t.stamina} onInput=${set("stamina")} />
        ${t.type === "E" && html`<${Mini} id=${id("tn")} label="Lasts (turns)" min="0" value=${t.turns} onInput=${set("turns")} />`}`}
    </div>
    <${AutoText} id=${id("text")} cls="inp" label="What it does" placeholder="What it does, when it works, and any catch." value=${t.text} onInput=${set("text")} />
    <div class="row" style="justify-content:space-between"><button class="btn small danger" onClick=${() => update(x => { x.talents.splice(i, 1); if (x.uses) delete x.uses["t:" + t.id]; })}>Remove</button>
      <button class="btn small primary" onClick=${() => update(x => { x.talents[i].final = true; })}>Done</button></div>
  </div>`;
}
function TalentsTab({ c, update, openSkill }) {
  const [filter, setFilter] = useState(() => lsGet("cw-perkfilter", "all"));
  useEffect(() => lsSet("cw-perkfilter", filter), [filter]);
  const all = unlockedPerks(c);
  const match = p => filter === "all" || (filter === "A" ? p.t === "A" || p.t === "M" : p.t === filter);
  const count = f => all.reduce((s, g) => s + g.perks.filter(p => f === "all" || (f === "A" ? p.t === "A" || p.t === "M" : p.t === f)).length, 0);
  const shown = all.map(g => Object.assign({}, g, { perks: g.perks.filter(match) })).filter(g => g.perks.length);
  const spentAny = Object.values(c.uses || {}).some(v => num(v));
  const addTalent = () => update(x => { x.talents.push({ id: rid(), name: "", source: "", type: "A", uses: 1, recharge: "Long rest", ap: "", stamina: "", turns: "", text: "", final: false }); });
  return html`<div class="tabpane">
    <section class="frame"><${Sigils} seed="perks" n=${1} lead="skill" side="r" /><${Head} title="Skills" topic="talents" />
      <p class="sub">Every perk unlocked so far. Tick a use when you spend one; rests recharge them. Click a skill's name for everything it grants.</p>
      <div class="row perkbar"><div class="seg" role="group" aria-label="Show perks">${[["all", "All"], ["A", "Active"], ["E", "Empowerment"], ["P", "Passive"]].map(([k, n]) => html`<button aria-pressed=${filter === k} onClick=${() => setFilter(k)}>${n} <small>${count(k)}</small></button>`)}</div>
        ${spentAny && html`<button class="btn small" onClick=${() => update(x => { x.uses = {}; addLog(x, "Recharged every ability by hand"); })}>Recharge all</button>`}</div>
      ${shown.length ? shown.map(g => html`<div class="perkgroup">
        <h3><button type="button" class="sname" onClick=${() => openSkill(g.kind, g.name)}>${g.name}</button> <small>${g.kind === "weapon" ? R.proficiency(g.lv) : R.ATTR_NAME[g.attr]} · level ${g.lv}</small></h3>
        <div class="perkcards">${g.perks.map(p => html`<${PerkCard} key=${p.key} c=${c} p=${p} update=${update} skill=${g.name} />`)}</div></div>`)
      : html`<p class="muted emptyline">${all.length ? "No perks of that kind yet." : "No perks unlocked yet. A skill's first perk comes at level 3."}</p>`}
    </section>

    <section class="frame"><${Sigils} seed="talents" n=${1} lead="glyphs" side="l" /><${Head} title="Talents" />
      <p class="sub">Abilities the rules don't cover: a runic tattoo, a blessing, an heirloom's trick. Set one up, then press Done to turn it into a card.</p>
      <div class="perkcards">${c.talents.map((t, i) => html`<${TalentCard} key=${t.id} c=${c} t=${t} i=${i} update=${update} />`)}</div>
      <div class="row" style="margin-top:12px"><button class="btn" onClick=${addTalent}>+ Add talent</button></div>
    </section>
  </div>`;
}

/* ================= gear tab ================= */
function GearTab({ c, d, update }) {
  const e = d.enc;
  // needle position: 3 fifths of the bar cover 0→3×unit, then one fifth per tier
  const pos = (() => { const L = e.load, u = e.unit || 1; if (L <= 3 * u) return (L / (3 * u)) * 60; const extra = Math.min(4, (L - 3 * u) / u); return 60 + extra * 10; })();
  const addItem = () => update(x => { x.items.push({ id: rid(), name: "", qty: 1, size: "small" }); });
  const addWeapon = () => update(x => { x.weapons.push({ id: rid(), name: "", skill: "Slashing", hands: 1, size: "medium", damage: 6, crit: 5, accuracy: 0, dur: 100, durMax: 100, durDie: "d10", clip: 0, clipMax: 0, rangeOpt: 0, rangeMax: 0, reload: 0, props: "", where: "set", final: false }); });
  const addArmor = () => update(x => { x.armor.push({ id: rid(), name: "", type: "light", av: 2, soak: 30, soakMax: 30, worn: !x.armor.some(a => a.worn), where: "set" }); });
  const addProsthetic = () => update(x => { x.prosthetics.push({ id: rid(), name: "", type: R.PROSTHETIC_TYPES[0], props: "" }); });
  const it = (i, k) => v => update(x => { x.items[i][k] = v; });
  const ar = (i, k) => v => update(x => { x.armor[i][k] = v; });
  const pr = (i, k) => v => update(x => { x.prosthetics[i][k] = v; });
  const ef = e.effective;
  return html`<div class="tabpane">
    <section class="frame load"><${Sigils} seed="load" n=${1} side="r" /><${Head} title="Load" topic="load" />
      <p class="sub">Everything carried, counted in small-item slots. You slow down past ${e.capacity}.</p>
      <div class="row" style="justify-content:space-between"><span class="loadnum"><b>${e.load}</b> / ${e.capacity}</span>
        <span><b>${e.tier.name}</b>${e.ignored ? html` <span class="flag good">Strong Back ignores this</span>` : ""}</span></div>
      <div class="loadbar" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><i class="needle" style=${`left:calc(${Math.min(99, pos)}% - 1px)`}></i></div>
      <div class="loadscale"><span>0</span><span>${e.limits[0]}</span><span>${e.limits[1]}</span><span>${e.limits[2]}</span><span>${e.limits[3]}</span></div>
      <div class="facts">${[["Travel", ef.explore === ef.day ? ef.explore : `${ef.explore} · ${ef.day} a day`], ["Defending", ef.defend == null ? "Can't defend" : ef.defend ? ef.defend + "%" : "No penalty"],
        ["Combat move", d.move + " m"], ["Weapon sets", `${e.setsUsed} of ${e.freeSets} free`]].map(([k, val]) => html`<div class="fact"><span>${k}</span><b>${val}</b></div>`)}</div>
    </section>

    <section class="frame"><${Head} title="Armor" topic="armor" /><p class="sub">Only one suit is worn at a time. Heavy armor counts as a large item, plate as huge.</p>
      <div class="cards">${c.armor.map((a, i) => { const chk = R.armorCheck(c, a); const t = R.ARMOR[a.type] || R.ARMOR.light;
        return html`<div class=${"wcard" + (a.worn ? " worn" : "")}>
          <div class="title"><input aria-label="Armor name" placeholder="Armor name" value=${a.name} onInput=${ev => ar(i, "name")(ev.target.value)} />
            <button class=${"btn small" + (a.worn ? " primary" : "")} onClick=${() => update(x => { x.armor.forEach((y, j) => (y.worn = j === i ? !y.worn : false)); })}>${a.worn ? "Worn" : "Wear"}</button></div>
          <div class="grid2">
            <div class="mini"><label for=${"at-" + a.id}>Type</label><select id=${"at-" + a.id} value=${a.type} onChange=${ev => ar(i, "type")(ev.target.value)}>${Object.entries(R.ARMOR).map(([k, x]) => html`<option value=${k}>${x.label}</option>`)}</select></div>
            <${Mini} id=${"av-" + a.id} label=${`AV ${t.av[0]}–${t.av[1]}`} value=${a.av} onInput=${ar(i, "av")} />
            <${Mini} id=${"sk-" + a.id} label="Soak" value=${a.soak} onInput=${ar(i, "soak")} />
            <${Mini} id=${"sm-" + a.id} label="Soak max" value=${a.soakMax} onInput=${ar(i, "soakMax")} />
          </div>
          <div class="track" style="background:var(--sunk)"><i style=${`width:${chk.soakMax ? Math.min(100, (num(a.soak) / chk.soakMax) * 100) : 0}%;background:var(--ink-2)`}></i></div>
          <div class="calc">Soak ${num(a.soak)}/${chk.soakMax}${chk.soakBonus ? ` (incl. +${chk.soakBonus} Armor Mastery)` : ""} · repair ${chk.repairCost} g, ${chk.repairDie}</div>
          ${!chk.ok && html`<div class="chips">${chk.problems.map(p => html`<span class="flag bad">${p}</span>`)}</div>`}
          <div class="row" style="justify-content:space-between"><span class="muted">${a.type === "light" ? "Casting −2×AV" : a.type === "medium" ? "Stealth −AV, casting −2×AV" : a.type === "heavy" ? "Dex skills −AV, Stealth disadv., Entrada −2×AV" : "Dex skills and saves −AV, Stealth disadv."}</span>
            <button class="btn small danger" onClick=${() => update(x => { x.armor.splice(i, 1); })}>Remove</button></div></div>`; })}
        <div class="wcard" style="place-content:center;border-style:dashed"><button class="btn" onClick=${addArmor}>+ Add armor</button></div></div>
    </section>

    <section class="frame"><${Head} title="Prosthetics" topic="prosthetics" />
      <p class="sub">Each prosthetic costs 7% Entrada and 4% Stealth, and needs one more ration a day.</p>
      ${c.prosthetics.length > 0 && html`<div class="tbl-wrap"><table class="ptable">
        <thead><tr><th>Name</th><th>Type</th><th>Unique properties</th><th></th></tr></thead>
        <tbody>${c.prosthetics.map((x, i) => html`<tr>
          <td><input class="inp" aria-label="Prosthetic name" placeholder="Brass forearm" value=${x.name} onInput=${ev => pr(i, "name")(ev.target.value)} /></td>
          <td><select class="inp" aria-label="Type" value=${x.type} onChange=${ev => pr(i, "type")(ev.target.value)}>${R.PROSTHETIC_TYPES.map(t => html`<option>${t}</option>`)}</select></td>
          <td class="wide"><${AutoText} cls="inp" label="Unique properties" placeholder="Hidden blade; grip strength +2" value=${x.props} onInput=${pr(i, "props")} /></td>
          <td><button class="iconbtn" aria-label=${`Remove ${x.name || "prosthetic"}`} onClick=${() => update(y => { y.prosthetics.splice(i, 1); })}>×</button></td></tr>`)}</tbody></table></div>`}
      <div class="row" style="margin-top:10px"><button class="btn" onClick=${addProsthetic}>+ Add prosthetic</button></div>
    </section>

    <section class="frame"><${Sigils} seed="weapons" n=${1} side="l" /><${Head} title="Weapons" topic="weapons" /><p class="sub">Two one-handed or one two-handed set ride free${e.freeSets > 2 ? ", plus a third from Strong Back" : ""}. Shields always count as large.</p>
      <div class="cards">${c.weapons.map((w, i) => html`<${WeaponCard} key=${w.id} c=${c} w=${w} i=${i} update=${update} />`)}
        <div class="wcard" style="place-content:center;border-style:dashed"><button class="btn" onClick=${addWeapon}>+ Add weapon</button></div></div>
    </section>

    <section class="frame"><${Head} title="Inventory" topic="load" />
      <p class="sub">Medium items take 2 slots, large 4, huge 8. Bundles (bandages, rope) fit 10 to a slot, ammo 50.</p>
      <div class="tbl-wrap"><table class="itable">
        <thead><tr><th>Item</th><th class="num">Qty</th><th>Size</th><th></th></tr></thead>
        <tbody>${c.items.map((x, i) => html`<tr>
          <td class="wide"><input class="inp" aria-label="Item name" placeholder="Item" value=${x.name} onInput=${ev => it(i, "name")(ev.target.value)} /></td>
          <td class="num"><input class="inp" style="width:60px;text-align:right" type="number" min="0" aria-label="Quantity" value=${x.qty} onInput=${ev => it(i, "qty")(+ev.target.value || 0)} /></td>
          <td><select class="inp" aria-label="Size" value=${R.ITEM_SIZE[x.size] ? x.size : "small"} onChange=${ev => update(y => { y.items[i].size = ev.target.value; delete y.items[i].per; })}>${R.ITEM_SIZES.map(([k, label]) => html`<option value=${k}>${label}</option>`)}</select></td>
          <td><button class="iconbtn" aria-label=${`Remove ${x.name || "item"}`} onClick=${() => update(y => { y.items.splice(i, 1); })}>×</button></td></tr>`)}
          ${!c.items.length && html`<tr><td colspan="4" class="muted">Nothing packed yet. Rations, rope, bandages and kits go here.</td></tr>`}</tbody></table></div>
      <div class="row" style="margin-top:10px"><button class="btn" onClick=${addItem}>+ Add item</button>
        <button class="btn" onClick=${() => update(x => { [["Rations", 6, "small"], ["Bandages", 10, "bundle"], ["Rope (m)", 20, "bundle"], ["Camping kit", 1, "large"]].forEach(([n, q, sz]) => x.items.push({ id: rid(), name: n, qty: q, size: sz })); })}>+ Adventuring basics</button>
        <span class="coins"><label for=${"coins-" + c.id}>Coins</label><input id=${"coins-" + c.id} class="inp" type="number" min="0" value=${c.coins} onInput=${ev => update(x => { x.coins = +ev.target.value || 0; })} /><small class="muted">100 weigh one slot</small></span></div>
    </section>
  </div>`;
}

/* ================= weapon cards ================= */
// A weapon is set up in edit mode, then finalised into a compact card for play where only durability changes.
// The fields follow the weapon: melee weapons reach 2 m and have no clip; ranged weapons have a clip, ranges and
// a reload cost (rulebook, Weapon Combat); a shield blocks with Shield Mastery and always counts as large.
const PENCIL = html`<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M11.5 2.5l2 2L6 12l-3 1 1-3z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
function WeaponCard({ c, w, i, update }) {
  const kind = R.weaponKind(w), wl = R.weaponLine(c, w);
  const set = (k, v) => update(x => { x.weapons[i][k] = v; });
  // Picking a skill keeps the card consistent: only ranged weapons keep a clip and ranges; a shield is always large.
  const setSkill = v => update(x => {
    const y = x.weapons[i]; y.skill = v; y.shield = v === "Shield";
    if (!R.RANGED_WEAPONS.includes(v)) Object.assign(y, { clip: 0, clipMax: 0, rangeOpt: 0, rangeMax: 0, reload: 0 });
    if (y.shield) Object.assign(y, { size: "large", accuracy: 0 });
  });
  const clipSize = num(w.clipMax), inClip = num(w.clip);
  const id = k => `w${k}-${w.id}`;
  const dur = num(w.dur), durMax = num(w.durMax);
  const reach = kind === "ranged" ? (num(w.rangeOpt) || num(w.rangeMax) ? `${num(w.rangeOpt)} / ${num(w.rangeMax)} m` : w.range || "—") : kind === "melee" ? "2 m" : "—";
  // Weapons saved before this existed count as finished once they have a name.
  if (w.final === true || (w.final === undefined && w.name)) return html`<div class=${"wcard final kind-" + kind}>
    <div class="title"><b class="wname">${w.name || "Unnamed weapon"}</b>
      <span class="flag brass">${kind === "shield" ? "Shield" : wl.proficiency}</span>
      <button class="iconbtn" aria-label=${`Edit ${w.name || "weapon"}`} title="Edit" onClick=${() => set("final", false)}>${PENCIL}</button></div>
    <div class="wsub">${kind === "shield" ? "Shield · blocks with Shield Mastery" : `${w.skill} · ${kind === "ranged" ? "ranged" : "melee"}`} · ${num(w.hands) === 2 ? "two-handed" : "one-handed"} · ${w.where === "pack" ? "in the pack" : w.where === "stash" ? "stashed" : "in a set"}</div>
    <div class="wstats">
      <div><span>Damage</span><b>${num(w.damage)}</b></div>
      ${kind !== "shield" && html`<div><span>Crit</span><b>${wl.crit}%</b></div><div><span>Accuracy</span><b>${wl.accuracy >= 0 ? "+" : ""}${wl.accuracy}%</b></div>`}
      <div><span>${kind === "ranged" ? "Range" : "Reach"}</span><b>${reach}</b></div>
      ${kind === "ranged" && num(w.reload) ? html`<div><span>Reload</span><b>${num(w.reload)} AP</b></div>` : ""}
    </div>
    ${kind === "ranged" && html`<div class="wdur"><span class="lbl">Clip</span>
      <div class="row"><button class="iconbtn" aria-label="Fire one" onClick=${() => set("clip", Math.max(0, inClip - 1))}>−</button>
        <input class="inp durin" type="number" min="0" max=${clipSize || undefined} aria-label="Rounds in the clip" value=${w.clip} onInput=${ev => set("clip", ev.target.value === "" ? "" : R.clamp(+ev.target.value, 0, clipSize || 999))} />
        <span class="muted">/ ${clipSize}</span>
        <button class="iconbtn" aria-label="Add one" onClick=${() => set("clip", Math.min(clipSize || 999, inClip + 1))}>+</button>
        <button class="btn small" disabled=${!clipSize || inClip >= clipSize} onClick=${() => set("clip", clipSize)}>Reload</button></div></div>`}
    <div class="wdur">
      <span class="lbl">Durability</span>
      <div class="track"><i style=${`width:${durMax ? R.clamp((dur / durMax) * 100, 0, 100) : 0}%;background:${dur <= 0 ? "var(--bad)" : "var(--ink-2)"}`}></i></div>
      <div class="row"><button class="iconbtn" aria-label="Lose 1 durability" onClick=${() => set("dur", Math.max(0, dur - 1))}>−</button>
        <input class="inp durin" type="number" min="0" aria-label="Durability" value=${w.dur} onInput=${ev => set("dur", ev.target.value === "" ? "" : Math.max(0, +ev.target.value))} />
        <span class="muted">/ ${durMax} · die ${w.durDie || "—"}</span>
        <button class="iconbtn" aria-label="Restore 1 durability" onClick=${() => set("dur", Math.min(durMax || Infinity, dur + 1))}>+</button></div>
      ${durMax > 0 && dur <= 0 && html`<span class="flag bad">Broken: gains a flaw</span>`}
    </div>
    ${w.props && html`<p class="wprops">${w.props}</p>`}
  </div>`;
  return html`<div class="wcard editing">
    <div class="title"><input aria-label="Weapon name" placeholder=${kind === "shield" ? "Shield name" : "Weapon name"} value=${w.name} onInput=${ev => set("name", ev.target.value)} />
      <span class="flag">Editing</span></div>
    <div class="grid2">
      <div class="mini"><label for=${id("s")}>Weapon skill</label><select id=${id("s")} value=${kind === "shield" ? "Shield" : w.skill} onChange=${ev => setSkill(ev.target.value)}>
        <optgroup label="Melee">${R.WEAPON_TYPES.filter(([t]) => !R.RANGED_WEAPONS.includes(t)).map(([t]) => html`<option>${t}</option>`)}</optgroup>
        <optgroup label="Ranged">${R.RANGED_WEAPONS.map(t => html`<option>${t}</option>`)}</optgroup>
        <optgroup label="Other"><option>Shield</option></optgroup></select></div>
      <div class="mini"><label for=${id("h")}>Hands</label><select id=${id("h")} value=${w.hands} onChange=${ev => set("hands", +ev.target.value)}><option value="1">One</option><option value="2">Two</option></select></div>
      ${kind !== "shield" && html`<div class="mini"><label for=${id("z")}>Size</label><select id=${id("z")} value=${w.size} onChange=${ev => set("size", ev.target.value)}>${Object.keys(R.SIZES).map(z => html`<option value=${z}>${z[0].toUpperCase() + z.slice(1)}</option>`)}</select></div>`}
      <div class="mini"><label for=${id("w")}>Carried</label><select id=${id("w")} value=${w.where || "set"} onChange=${ev => set("where", ev.target.value)}><option value="set">In a set</option><option value="pack">In the pack</option><option value="stash">Stashed</option></select></div>
    </div>
    <div class="wgroup"><span class="lbl">Combat</span><div class="grid2">
      <${Mini} id=${id("d")} label="Damage" value=${w.damage} onInput=${v => set("damage", v)} />
      ${kind !== "shield" && html`<${Mini} id=${id("c")} label="Crit %" value=${w.crit} onInput=${v => set("crit", v)} />
        <${Mini} id=${id("a")} label="Accuracy ±" value=${w.accuracy} onInput=${v => set("accuracy", v)} />`}
    </div></div>
    ${kind === "ranged" && html`<div class="wgroup"><span class="lbl">Ranged</span><div class="grid2">
      <${Mini} id=${id("cm")} label="Clip size" value=${w.clipMax} min="1" onInput=${v => update(x => { const y = x.weapons[i]; y.clipMax = v; if (num(y.clip) > num(v) || !num(y.clip)) y.clip = v; })} />
      <${Mini} id=${id("ro")} label="Optimal m" value=${w.rangeOpt} onInput=${v => set("rangeOpt", v)} />
      <${Mini} id=${id("rm")} label="Max range m" value=${w.rangeMax} onInput=${v => set("rangeMax", v)} />
      <${Mini} id=${id("rl")} label="Reload AP" value=${w.reload} onInput=${v => set("reload", v)} />
    </div></div>`}
    <p class="muted wnote">${kind === "melee" ? "Melee: reaches 2 m and has no clip." : kind === "ranged" ? "Ranged: attacks between the optimal and maximum range roll with disadvantage; beyond the maximum they miss." : "Shield: blocks with Shield Mastery and always counts as a large item."}</p>
    <div class="wgroup"><span class="lbl">Durability</span><div class="grid2">
      <${Mini} id=${id("du")} label="Current" value=${w.dur} onInput=${v => set("dur", v)} />
      <${Mini} id=${id("dm")} label="Maximum" value=${w.durMax} onInput=${v => set("durMax", v)} />
      <${Mini} id=${id("dd")} label="Die" type="text" value=${w.durDie} onInput=${v => set("durDie", v)} />
    </div></div>
    <div class="mini"><label for=${id("p")}>Properties and flaws</label>
      <${AutoText} id=${id("p")} value=${w.props} placeholder="Fast, Penetrating (2), Brittle (3)…" onInput=${v => set("props", v)} /></div>
    <div class="row" style="justify-content:space-between">
      <button class="btn small danger" onClick=${() => update(x => { x.weapons.splice(i, 1); })}>Remove</button>
      <button class="btn small primary" onClick=${() => set("final", true)}>Done</button></div>
  </div>`;
}

/* ================= tabletop tab ================= */
function TableTab({ c, update, onDelete }) {
  const data = useMemo(() => R.toTabletop(c), [c]);
  const code = useMemo(() => JSON.stringify(data), [data]);
  const ta = useRef(); const [paste, setPaste] = useState(""); const [preview, setPreview] = useState(null); const [err, setErr] = useState(""); const [del, setDel] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); toast("Code copied. Paste it into the sheet's code box in Tabletop Simulator."); }
    catch { ta.current.focus(); ta.current.select(); toast("Selected the code. Press Ctrl+C (or Cmd+C) to copy it."); }
  };
  const save = async () => {
    try { await saveFile(`${(c.name || "character").replace(/[^\w-]+/g, "_")}.clockwork.json`, JSON.stringify(data, null, 2)); } catch {}
  };
  const check = () => {
    setErr(""); setPreview(null);
    try { const t = JSON.parse(paste.trim()); const n = R.fromTabletop(c, t);
      const dv = R.derived(n), dc = derive(c); const changes = [];
      const diff = (kind, names) => names.forEach(k => { const L = R.LEVELS[kind], was = L.get(c, k), now = L.get(n, k); if (was !== now) changes.push(`${kind === "attr" ? R.ATTR_NAME[k] : k} ${was} → ${now}`); });
      diff("attr", R.ATTRS.map(a => a.k)); diff("skill", Object.keys(R.SKILLS)); diff("weapon", R.WEAPON_TYPES.map(w => w[0])); diff("sec", R.SECONDARY.map(x => x.name));
      ["hp", "bp", "dp", "tox"].forEach(k => { if (dv.cur[k] !== dc.cur[k]) changes.push(`${k.toUpperCase()} ${dc.cur[k]} → ${dv.cur[k]}`); });
      if (num(n.vitals.exhaustion) !== num(c.vitals.exhaustion)) changes.push(`Exhaustion ${num(c.vitals.exhaustion)} → ${num(n.vitals.exhaustion)}`);
      if (num(n.karma) !== num(c.karma)) changes.push(`Karma ${num(c.karma)} → ${num(n.karma)}`);
      ["light", "moderate", "mortal"].forEach(k => { if (num(n.vitals.wounds[k]) !== num(c.vitals.wounds[k])) changes.push(`${k} wounds ${num(c.vitals.wounds[k])} → ${num(n.vitals.wounds[k])}`); });
      if (t.id && t.id !== c.id) changes.unshift(`Note: this code came from a different character (${t.name || "unnamed"}).`);
      setPreview({ n, changes });
    } catch (e) { setErr(e instanceof SyntaxError ? "That doesn't look like a complete code. Copy the whole text from the sheet's Export box." : e.message); }
  };
  return html`<div class="tabpane">
    <section class="two">
      <div class="frame"><${Sigils} seed="send to the table" n=${1} side="r" /><h2 class="h"><span>Send to the table</span><i class="orn" aria-hidden="true"></i></h2>
        <ol class="steps"><li>Copy this character's code.</li><li>In Tabletop Simulator, click <b>Load code</b> under your Clockwork sheet and paste it into the box.</li><li>Click <b>Apply</b>. Pips, vitals and your portrait fill in.</li></ol>
        <textarea ref=${ta} class="codebox" readonly aria-label="Tabletop code" value=${code} onFocus=${e => e.target.select()}></textarea>
        <div class="row"><button class="btn primary" onClick=${copy}>Copy code</button><button class="btn" onClick=${save}>Save as file</button>
          <span class="muted">${code.length.toLocaleString()} characters</span></div>
        ${!c.portraitUrl && html`<p class="muted">Tip: add a public image link under "Portrait link for Tabletop" so the sheet in TTS shows your art.</p>`}</div>
      <div class="frame"><h2 class="h"><span>Bring changes back</span><i class="orn" aria-hidden="true"></i></h2>
        <p class="muted" style="margin-top:0">After a session, click <b>Export</b> on the TTS sheet, copy its code and paste it here to update vitals, pips and Karma.</p>
        <textarea class="codebox" aria-label="Code from Tabletop Simulator" placeholder='{"cw":1, …}' value=${paste} onInput=${e => { setPaste(e.target.value); setPreview(null); setErr(""); }}></textarea>
        <div class="row"><button class="btn" disabled=${!paste.trim()} onClick=${check}>Check changes</button></div>
        ${err && html`<p style="color:var(--bad)">${err}</p>`}
        ${preview && html`<div class="panel" style="margin-top:10px">${preview.changes.length ? html`<div class="lbl">${preview.changes.length} change${preview.changes.length > 1 ? "s" : ""}</div>
          <ul style="margin:6px 0 10px;padding-left:18px">${preview.changes.slice(0, 30).map(x => html`<li>${x}</li>`)}</ul>
          <div class="row"><button class="btn primary" onClick=${() => { update(x => { Object.assign(x, preview.n, { id: x.id }); addLog(x, "Updated from Tabletop Simulator"); }); setPaste(""); setPreview(null); toast("Updated from the table."); }}>Apply changes</button>
            <button class="btn" onClick=${() => setPreview(null)}>Cancel</button></div>` : html`<p style="margin:0">Nothing differs from this character.</p>`}</div>`}
      </div>
    </section>
    <section class="frame"><h2 class="h"><span>Character</span><i class="orn" aria-hidden="true"></i></h2>
      ${del ? html`<div class="confirm"><span>Delete <b>${c.name || "this character"}</b> for everyone? This can't be undone.</span>
          <button class="btn small danger" onClick=${() => onDelete(c.id)}>Delete</button><button class="btn small" onClick=${() => setDel(false)}>Keep</button></div>`
        : html`<button class="btn danger" onClick=${() => setDel(true)}>Delete character</button>`}</section>
  </div>`;
}
