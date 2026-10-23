/* ================= character creation ================= */
// "New character" offers two roads: a guided genesis, step by step, or an instant auto-generated sheet.

function NewChoice({ onClose, onGuide, onBlank }) {
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  const draft = lsGet(GENESIS_KEY, null);
  return html`<div class="gx-veil" onClick=${e => { if (e.target === e.currentTarget) onClose(); }}>
    <div class="gx-choose" role="dialog" aria-label="Create a character">
      <button class="iconbtn gx-x" aria-label="Close" onClick=${onClose}>×</button>
      <h2 class="ornate">A new soul for the table</h2>
      <div class="gx-roads">
        <button class="gx-road main" onClick=${onGuide}>
          <i class="emblem sg-astro" aria-hidden="true"></i>
          <b>${draft ? "Continue character creation" : "Character creation"}</b>
          <span>${draft ? `Pick up ${draft.name ? draft.name + "'s" : "your"} creation where you left it.` : "Name them, give them a face, watch the dice decide their nature, then shape it yourself."}</span></button>
        <button class="gx-road" onClick=${onBlank}>
          <i class="emblem sg-note" aria-hidden="true"></i>
          <b>Blank character sheet</b>
          <span>Every attribute set to 10, nothing else filled in. For copying over an existing character or building one by hand.</span></button>
      </div>
    </div>
  </div>`;
}

const GENESIS_KEY = "cw-genesis";
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
const EMBLEM_SHAPES = ["astro", "gears", "attr", "skill", "weap", "sec", "note", "glyphs", "elements", "broken"];
const HUES = ["#d39d48", "#c9483c", "#6fb6d2", "#8cc06a", "#b48ade", "#e8e2d4", "#e07a3c", "#4fb3a2"];
const STEPS = ["Name", "Likeness", "Fate", "Choose", "Shape", "Awaken"];
const freshDraft = () => ({ step: 0, name: "", campaign: "", karma: 0, face: { mode: "sigil", shape: "astro", hue: HUES[0], url: "", asset: "" }, sets: [], chosen: 0, assign: {} });

function Genesis({ onClose, onDone }) {
  // The draft is kept in this browser, so closing the guide never loses (or re-rolls) your dice.
  const [g, setG] = useState(() => Object.assign(freshDraft(), lsGet(GENESIS_KEY, null) || {}));
  useEffect(() => lsSet(GENESIS_KEY, g), [g]);
  const up = patch => setG(x => Object.assign({}, x, typeof patch === "function" ? patch(x) : patch));
  const go = step => { up({ step }); const el = document.querySelector(".gx-body"); if (el) el.scrollTop = 0; };
  const twoSets = g.sets.length > 1;
  const stepOrder = twoSets ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 4, 5];
  const next = () => go(stepOrder[stepOrder.indexOf(g.step) + 1]);
  const back = () => go(stepOrder[Math.max(0, stepOrder.indexOf(g.step) - 1)]);
  const abandon = () => { lsSet(GENESIS_KEY, null); try { localStorage.removeItem(GENESIS_KEY); } catch {} onClose(); };
  const finish = () => {
    const set = g.sets[g.chosen] || [];
    const extra = twoSets ? 10 : 0, karma = Math.max(0, num(g.karma) - extra);
    onDone(c => {
      c.name = g.name.trim() || "Unnamed";
      c.campaign = g.campaign;
      R.ATTRS.forEach(a => { const v = set[g.assign[a.k]].total; c.attrs[a.k] = { base: v, value: v }; });
      c.karma = karma; c.pool = karma;   // nothing spent yet, so the pool is what's left to spend
      if (g.face.mode === "link" && g.face.url) c.portraitUrl = g.face.url.trim();
      else if (g.face.mode === "upload" && g.face.asset) c.portraitAsset = g.face.asset;
      else c.emblem = { shape: g.face.shape, hue: g.face.hue };
      const rolls = s => s.map(r => r.total).join(", ");
      c.log = [
        { t: Date.now(), m: `Created through character creation · starting Karma ${num(g.karma)}${extra ? `, −10 for a second set` : ""}` },
        ...g.sets.map((s, i) => ({ t: Date.now(), m: `${i ? "Second" : "First"} set rolled: ${rolls(s)}${twoSets && g.chosen === i ? " (kept)" : ""}` })),
      ];
    });
    try { localStorage.removeItem(GENESIS_KEY); } catch {}
  };
  const pos = stepOrder.indexOf(g.step);
  return html`<div class="genesis" role="dialog" aria-label="Character creation">
    <div class="gx-top">
      <ol class="gx-steps">${stepOrder.map((s, i) => html`<li class=${(i < pos ? "done " : "") + (i === pos ? "now" : "")}><span>${i + 1}</span>${STEPS[s]}</li>`)}</ol>
      <button class="iconbtn" aria-label="Close (your progress is kept)" title="Close. Your progress is kept." onClick=${onClose}>×</button>
    </div>
    <div class="gx-body">
      ${g.step === 0 && html`<${StepName} g=${g} up=${up} next=${next} abandon=${abandon} />`}
      ${g.step === 1 && html`<${StepFace} g=${g} up=${up} next=${next} back=${back} />`}
      ${g.step === 2 && html`<${StepRoll} g=${g} up=${up} next=${next} back=${back} />`}
      ${g.step === 3 && html`<${StepChoose} g=${g} up=${up} next=${next} back=${back} />`}
      ${g.step === 4 && html`<${StepShape} g=${g} up=${up} next=${next} back=${back} />`}
      ${g.step === 5 && html`<${StepAwaken} g=${g} back=${back} finish=${finish} />`}
    </div>
  </div>`;
}

const GxNav = ({ back, next, nextLabel = "Continue", disabled, hint }) => html`<div class="gx-nav">
  ${back ? html`<button class="btn" onClick=${back}>Back</button>` : html`<span></span>`}
  ${hint && html`<span class="muted">${hint}</span>`}
  ${next && html`<button class="btn primary big" disabled=${disabled} onClick=${next}>${nextLabel}</button>`}</div>`;

// A face for the preview: the chosen picture, or the sigil in its hue.
const GxFace = ({ face, name, big }) => html`<div class=${"gx-face" + (big ? " big" : "")}>
  ${face.mode === "link" && /^https?:\/\//.test(face.url) ? html`<img src=${face.url} alt="" onError=${e => { e.target.style.display = "none"; }} />`
    : face.mode === "upload" && face.asset && Store.assets && Store.assets.urlFor ? html`<img src=${Store.assets.urlFor(face.asset)} alt="" />`
    : face.mode === "upload" && face.asset ? html`<img src=${"/_blob/" + face.asset} alt="" />`
    : html`<i class=${"emblem sg-" + face.shape} style=${`--em:${face.hue}`}></i>`}
  ${name !== undefined && html`<b>${name || "Unnamed"}</b>`}</div>`;

function StepName({ g, up, next, abandon }) {
  const begun = g.sets.length > 0 || g.name;
  return html`<section class="gx-step">
    <p class="gx-kicker">Every tale begins with a name</p>
    <h2 class="gx-title">Who steps out of the smoke?</h2>
    <div class="gx-form">
      <div class="field"><label for="gx-name">Name</label><input id="gx-name" class="gx-big" value=${g.name} placeholder="Anne Domaltici of Tanisburg" onInput=${e => up({ name: e.target.value })} autofocus /></div>
      <div class="gx-two">
        <div class="field"><label for="gx-camp">Campaign</label><select id="gx-camp" value=${g.campaign} onChange=${e => up({ campaign: e.target.value })}>
          <option value="">—</option>${CAMPAIGNS.map(x => html`<option>${x}</option>`)}</select></div>
        <div class="field"><label for="gx-karma">Starting Karma</label><input id="gx-karma" type="number" min="0" value=${g.karma} onInput=${e => up({ karma: Math.max(0, Math.floor(+e.target.value || 0)) })} />
          <small class="muted">Your GM sets this for the campaign.</small></div>
      </div>
    </div>
    <${GxNav} next=${next} disabled=${!g.name.trim()} hint=${!g.name.trim() ? "Give them a name to continue." : ""} />
    ${begun && html`<button class="linkbtn gx-abandon" onClick=${abandon}>Abandon this character and start over</button>`}
  </section>`;
}

function StepFace({ g, up, next, back }) {
  const f = g.face, setF = patch => up(x => ({ face: Object.assign({}, x.face, patch) }));
  const fileRef = useRef(); const [busy, setBusy] = useState(false);
  const upload = async e => {
    const file = e.target.files && e.target.files[0]; e.target.value = ""; if (!file || !Store.assets) return;
    setBusy(true);
    try { const r = await Store.assets.upload(file, f.asset); setF({ mode: "upload", asset: r.id }); } catch { toast("Couldn't upload that image. Try a PNG, JPG or WebP."); }
    setBusy(false);
  };
  return html`<section class="gx-step">
    <p class="gx-kicker">A face for the tale</p>
    <h2 class="gx-title">How will the table know ${g.name.trim() || "them"}?</h2>
    <div class="gx-facegrid">
      <${GxFace} face=${f} name=${g.name} big />
      <div>
        <div class="seg three gx-modes" role="group" aria-label="Likeness">
          <button aria-pressed=${f.mode === "sigil"} onClick=${() => setF({ mode: "sigil" })}>Sigil</button>
          <button aria-pressed=${f.mode === "link"} onClick=${() => setF({ mode: "link" })}>Image link</button>
          <button aria-pressed=${f.mode === "upload"} disabled=${!Store.assets} onClick=${() => setF({ mode: "upload" })}>Upload</button></div>
        ${f.mode === "sigil" && html`<p class="muted">Not ready for a portrait? Bear a sigil. You can add a picture any time from the sheet.</p>
          <div class="gx-sigils">${EMBLEM_SHAPES.map(s => html`<button class=${"gx-sigil" + (f.shape === s ? " on" : "")} aria-label=${`Sigil ${s}`} onClick=${() => setF({ shape: s })}><i class=${"emblem sg-" + s} style=${`--em:${f.hue}`}></i></button>`)}</div>
          <div class="gx-hues"><span class="lbl">Hue</span>${HUES.map(h => html`<button class=${"gx-hue" + (f.hue === h ? " on" : "")} style=${`background:${h}`} aria-label=${`Hue ${h}`} onClick=${() => setF({ hue: h })}></button>`)}
            <label class="gx-custom">Any colour<input type="color" value=${f.hue} onInput=${e => setF({ hue: e.target.value })} /></label></div>`}
        ${f.mode === "link" && html`<div class="field"><label for="gx-url">Image link</label><input id="gx-url" placeholder="https://…" value=${f.url} onInput=${e => setF({ url: e.target.value.trim() })} />
          <small class="muted">A public picture link. It also shows on your Tabletop Simulator sheet.</small></div>`}
        ${f.mode === "upload" && html`<div class="row"><button class="btn" disabled=${busy} onClick=${() => fileRef.current.click()}>${busy ? "Uploading…" : f.asset ? "Choose another picture" : "Choose a picture"}</button>
          <input ref=${fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange=${upload} /></div>`}
      </div>
    </div>
    <${GxNav} back=${back} next=${next} disabled=${(f.mode === "link" && !/^https?:\/\//.test(f.url)) || (f.mode === "upload" && !f.asset)} />
  </section>`;
}

// Three tumbling d8s for the roll in progress (or the last one rolled).
function DiceTray({ roll, rolling }) {
  const [flick, setFlick] = useState([1, 1, 1]);
  useEffect(() => {
    if (!rolling) return;
    const t = setInterval(() => setFlick([0, 0, 0].map(() => 1 + Math.floor(Math.random() * 8))), 70);
    return () => clearInterval(t);
  }, [rolling]);
  const faces = rolling ? flick : roll ? roll.dice : [8, 8, 8];
  return html`<div class=${"gx-tray" + (rolling ? " rolling" : "")}>
    <div class="gx-dice">${faces.map((d, i) => html`<div class=${"d8" + (!rolling && roll && roll.low === i ? " low" : "") + (!roll && !rolling ? " idle" : "")} style=${`--i:${i}`}><span>${d}</span></div>`)}</div>
    <div class=${"gx-sum" + (roll && !rolling ? " show" : "")}>${roll && !rolling ? html`<b class=${roll.total >= 15 ? "hi" : roll.total < 10 ? "lo" : ""}>${roll.total}</b>${roll.sum < 6 ? html`<small>${roll.sum}, raised to 6</small>` : html`<small>${roll.dice.filter((_, i) => i !== roll.low).join(" + ")}</small>`}` : ""}</div>
  </div>`;
}
const toneOf = t => (t >= 15 ? "hi" : t < 10 ? "lo" : "");

function StepRoll({ g, up, next, back }) {
  const [rolling, setRolling] = useState(false);
  const [last, setLast] = useState(null);
  const cur = g.sets.length ? g.sets[g.sets.length - 1] : [];
  const full = cur.length === 7;
  const canSecond = g.sets.length === 1 && full && num(g.karma) >= 10;
  const rollOne = () => new Promise(res => {
    setRolling(true);
    setTimeout(() => {
      const r = R.rollAttributeDetail();
      up(x => { const sets = x.sets.length ? x.sets.map(s => s.slice()) : [[]]; sets[sets.length - 1].push(r); return { sets }; });
      setLast(r); setRolling(false); res();
    }, 950);
  });
  const rollRest = async () => { const left = 7 - cur.length; for (let i = 0; i < left; i++) { await rollOne(); await new Promise(r => setTimeout(r, 450)); } };
  const second = () => { up(x => ({ sets: [...x.sets, []] })); setLast(null); };
  const setRow = (s, idx) => html`<div class="gx-set"><span class="lbl">${g.sets.length > 1 ? (idx ? "Second set" : "First set") : "Your rolls"}</span>
    <div class="gx-slots">${ROMAN.map((n, i) => html`<div class=${"gx-slot " + (s[i] ? "got " + toneOf(s[i].total) : "") + (i === s.length && !rolling && s === cur && !full ? " next" : "")}>
      <small>${n}</small><b>${s[i] ? s[i].total : "·"}</b></div>`)}</div>
    ${s.length === 7 && html`<span class="muted">Total ${s.reduce((a, r) => a + r.total, 0)}</span>`}</div>`;
  return html`<section class="gx-step">
    <p class="gx-kicker">Fate is cast in brass and bone</p>
    <h2 class="gx-title">Roll for ${g.name.trim() || "your character"}</h2>
    <p class="gx-lede">Seven rolls, one for each attribute. Each is three eight-sided dice: the lowest is set aside and the other two are added, never less than 6. Ten is the measure of common folk; you'll decide which roll goes where.</p>
    <${DiceTray} roll=${rolling ? null : last} rolling=${rolling} />
    <div class="gx-rollbtns">
      ${!full && html`<button class="btn primary big" disabled=${rolling} onClick=${rollOne}>${rolling ? "Rolling…" : `Roll ${ROMAN[cur.length] || "I"}`}</button>
        ${cur.length > 0 && html`<button class="btn" disabled=${rolling} onClick=${rollRest}>Roll the rest</button>`}`}
      ${canSecond && html`<button class="btn" onClick=${second}>Roll a second set (−10 Karma)</button>`}
    </div>
    ${g.sets.length === 1 && full && num(g.karma) < 10 && html`<p class="muted center">A second set costs 10 Karma; this character starts with ${num(g.karma)}.</p>`}
    ${g.sets.map((s, i) => setRow(s, i))}
    <${GxNav} back=${back} next=${full ? next : null} nextLabel=${g.sets.length > 1 ? "Choose a set" : "Keep these rolls"} hint=${full ? "" : "Roll all seven to continue."} />
  </section>`;
}

function StepChoose({ g, up, next, back }) {
  return html`<section class="gx-step">
    <p class="gx-kicker">Two fates, one life</p>
    <h2 class="gx-title">Which set will ${g.name.trim() || "they"} carry?</h2>
    <p class="gx-lede">The second set cost 10 Karma, whichever you keep.</p>
    <div class="gx-sets">${g.sets.map((s, i) => html`<button class=${"gx-pick" + (g.chosen === i ? " on" : "")} aria-pressed=${g.chosen === i} onClick=${() => up({ chosen: i, assign: {} })}>
      <span class="lbl">${i ? "Second set" : "First set"}</span>
      <div class="gx-vals">${s.map(r => r.total).sort((a, b) => b - a).map(t => html`<b class=${toneOf(t)}>${t}</b>`)}</div>
      <span class="muted">Total ${s.reduce((a, r) => a + r.total, 0)} · ${s.filter(r => r.total < 10).length} broken</span></button>`)}</div>
    <${GxNav} back=${back} next=${next} nextLabel="Shape this fate" />
  </section>`;
}

function StepShape({ g, up, next, back }) {
  const set = g.sets[g.chosen] || [];
  const [held, setHeld] = useState(null);   // index into the set of the roll in hand
  const placed = new Set(Object.values(g.assign));
  const order = set.map((r, i) => i).sort((a, b) => set[b].total - set[a].total);
  const place = k => {
    const at = g.assign[k];
    if (held === null) { if (at !== undefined) up(x => { const a = Object.assign({}, x.assign); delete a[k]; return { assign: a }; }); return; }
    up(x => { const a = Object.assign({}, x.assign); Object.keys(a).forEach(q => { if (a[q] === held) delete a[q]; }); a[k] = held; return { assign: a }; });
    setHeld(null);
  };
  const autoFill = () => { const free = order.filter(i => !placed.has(i)); const a = Object.assign({}, g.assign); R.ATTRS.forEach(at => { if (a[at.k] === undefined) a[at.k] = free.shift(); }); up({ assign: a }); };
  const done = R.ATTRS.every(a => g.assign[a.k] !== undefined);
  return html`<section class="gx-step">
    <p class="gx-kicker">The dice decide the clay; you decide the shape</p>
    <h2 class="gx-title">Shape ${g.name.trim() || "your character"}</h2>
    <p class="gx-lede">Tap a roll, then tap the attribute it belongs to. Tap a placed roll to take it back.</p>
    <div class="gx-hand" role="group" aria-label="Your rolls">${order.map(i => html`<button class=${"gx-chip " + toneOf(set[i].total) + (held === i ? " held" : "") + (placed.has(i) ? " used" : "")}
        aria-pressed=${held === i} disabled=${placed.has(i)} onClick=${() => setHeld(held === i ? null : i)}>${set[i].total}</button>`)}</div>
    <div class="gx-attrs">${R.ATTRS.map(a => { const at = g.assign[a.k], v = at !== undefined ? set[at].total : null;
      return html`<button class=${"gx-attr" + (v !== null ? " filled " + toneOf(v) : "") + (held !== null ? " target" : "")} onClick=${() => place(a.k)}>
        <span class="gx-an"><b>${a.n}</b><small>${R.ATTR_BLURB[a.k]}</small></span>
        <span class="gx-av">${v !== null ? html`<b>${v}</b><small>${v < 10 ? `broken · can rise to ${v + 10}` : v === 10 ? "median" : `+${v - 10}`}</small>` : html`<i>—</i>`}</span></button>`; })}</div>
    <div class="row gx-shapebtns">${!done && placed.size > 0 && html`<button class="btn small" onClick=${autoFill}>Fill the rest, highest first</button>`}
      ${placed.size > 0 && html`<button class="btn small" onClick=${() => { up({ assign: {} }); setHeld(null); }}>Clear all</button>`}</div>
    <${GxNav} back=${back} next=${next} disabled=${!done} nextLabel="Awaken" hint=${done ? "" : `${7 - placed.size} left to place`} />
  </section>`;
}

function StepAwaken({ g, back, finish }) {
  const set = g.sets[g.chosen] || [];
  const extra = g.sets.length > 1 ? 10 : 0;
  return html`<section class="gx-step gx-awaken">
    <p class="gx-kicker">The gears catch. A heart begins to tick.</p>
    <${GxFace} face=${g.face} big />
    <h2 class="gx-title gx-name">${g.name.trim()}</h2>
    <p class="muted">${[g.campaign, `${Math.max(0, num(g.karma) - extra)} Karma to spend`].filter(Boolean).join(" · ")}</p>
    <div class="gx-final">${R.ATTRS.map(a => { const v = set[g.assign[a.k]].total; return html`<div class=${"gx-fa " + toneOf(v)}><small>${a.n}</small><b>${v}</b></div>`; })}</div>
    <${GxNav} back=${back} next=${finish} nextLabel="Begin the tale" />
  </section>`;
}
