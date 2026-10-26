/* ================= Magic → Occult: Daemonology =================
   A summoning circle (a ring of runes, a seven-pointed star, seven candles) and a grimoire of contracts, one card per
   daemon, each with its own picture (uploaded like a portrait), contract terms and abilities. Summoning lights the
   candles one by one, draws the star, and the daemon rises out of smoke into the circle. The counts (summons a day,
   AP, how long a daemon may stay) and the perks' uses are demonState in rules.js; data in c.demon. */
const DAEMON_SIL = "M60 14c-5 0-9 3-10 8L39 8l3 20c-4 4-6 10-6 16 0 9 5 17 12 21-15 4-28 13-32 29h88c-4-16-17-25-32-29 7-4 12-12 12-21 0-6-2-12-6-16l3-20-11 14c-1-5-5-8-10-8z";
const demonSrc = d => !d ? "" : d.img ? (Store.assets && Store.assets.urlFor ? Store.assets.urlFor(d.img) : "") : d.imgData || "";
const demonHue = d => Math.round(wardSeed("seal" + (d.id || d.n)) * 360);
const DaemonFace = ({ d, cls = "" }) => demonSrc(d) ? html`<img class=${"dface " + cls} src=${demonSrc(d)} alt="" />`
  : html`<svg class=${"dface sil " + cls} viewBox="0 0 120 100" aria-hidden="true"><path d=${DAEMON_SIL} /></svg>`;
const DEMON_CANDLES = 7;
const DEMON_CALL_MS = 2600;

function Demonology({ c, update }) {
  const st = R.demonState(c), D = c.demon;
  const [calling, setCalling] = useState(""), [editing, setEditing] = useState(""), [banishing, setBanishing] = useState(false);
  const busy = useRef(false), timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const byId = id => D.daemons.find(x => x.id === id);
  const guardian = st.guardian ? D.guardian : "";
  const crowd = D.out.filter(id => id !== guardian);   // the summoned daemons that count against "one at a time"
  const stamina = num(c.vitals && c.vitals.exhaustion);

  const why = d => !st.contracts ? "From Demonology 3." : D.army ? (crowd.length >= 5 ? "Five are already here." : "")
    : d.id === guardian ? "" : crowd.length ? `Dismiss ${(byId(crowd[0]) || {}).n || "the other daemon"} first: one at a time.` : !st.left ? "No summons left today. A long rest renews them." : "";
  const summon = d => {
    if (busy.current || why(d)) return;
    const done = () => {
      update(x => {
        x.demon.out.push(d.id);
        if (!x.demon.army) x.demon.today = num(x.demon.today) + 1;   // summons under Solomon Unchained don't count
        const what = `Summoned ${d.n || "a daemon"}${x.demon.army ? " (Solomon Unchained)" : ` (${st.summonAP} AP)`}`;
        x.demon.ledger = [{ id: rid(), t: Date.now(), what }, ...x.demon.ledger].slice(0, 30);
        addLog(x, "Demonology: " + what);
      });
      busy.current = false; setCalling("");
    };
    busy.current = true;
    if (reduceMotion()) { done(); return; }
    setCalling(d.id); timer.current = setTimeout(done, DEMON_CALL_MS);
  };
  const dismiss = d => update(x => {
    x.demon.out = x.demon.out.filter(id => id !== d.id);
    if (!x.demon.out.length) x.demon.army = false;
    x.demon.ledger = [{ id: rid(), t: Date.now(), what: `Dismissed ${d.n || "a daemon"} (${st.dismissAP} AP)` }, ...x.demon.ledger].slice(0, 30);
    addLog(x, `Demonology: dismissed ${d.n || "a daemon"}`);
  });
  const unchain = () => update(x => {
    x.demon.army = true; R.setStamina(x, num(x.vitals.exhaustion) + 3);
    x.demon.ledger = [{ id: rid(), t: Date.now(), what: "Solomon Unchained: up to 5 daemons at once for 3 turns (5 AP, 3 Stamina)" }, ...x.demon.ledger].slice(0, 30);
    addLog(x, "Demonology: Solomon Unchained (5 AP, 3 Stamina)");
  });
  const save = (id, v) => update(x => {
    const i = x.demon.daemons.findIndex(y => y.id === id);
    if (i >= 0) x.demon.daemons[i] = Object.assign({}, x.demon.daemons[i], v); else x.demon.daemons.push(Object.assign({ id: id || "d" + rid() }, v));
  });
  const remove = d => {
    if (d.img && Store.assets && Store.assets.remove) Store.assets.remove(d.img);
    update(x => { x.demon.daemons = x.demon.daemons.filter(y => y.id !== d.id); x.demon.out = x.demon.out.filter(id => id !== d.id); if (x.demon.guardian === d.id) x.demon.guardian = ""; });
    setEditing("");
  };
  const here = D.out.map(byId).filter(Boolean), call = calling ? byId(calling) : null;
  const shown = call || here[here.length - 1] || null;

  return html`<div class="demonology">
    <section class="frame demonhead"><${Head} title="Occult: Daemonology" topic="demonology" />
      <p class="sub">Daemons you have a contract with can be summoned to the prime plane. Each one here is a card in your grimoire.</p>
      <div class="facts ptfacts">${[
        ["Demonology", `${st.lvl}`],
        ["Modifier", `${st.mod}%`],
        ["Summons today", st.contracts ? `${st.used} of ${st.perDay}` : "From 3"],
        ["A daemon stays", `up to ${st.hours} h`],
        ["Summon / dismiss", `${st.summonAP} AP / ${st.dismissAP} AP`],
        ...(st.extraAP ? [["Each turn", `+${st.extraAP} AP for daemons' abilities`]] : []),
      ].map(([k, v]) => html`<div class="fact"><span>${k}</span><b>${v}</b></div>`)}</div>
    </section>

    <section class=${"frame demoncircf" + (call ? " calling" : here.length ? " present" : "")}>
      <h2 class="h"><span>The circle</span><i class="orn" aria-hidden="true"></i></h2>
      <div class="demonstage">
        <${DemonCircle} shown=${shown} call=${call} here=${here} guardian=${guardian} />
        <div class="demonnow" aria-live="polite">
          ${call ? html`<p class="demonchant">The candles catch… ${call.n || "the daemon"} answers.</p>`
            : !here.length ? html`<p class="muted">The circle is quiet. Summon a daemon from your grimoire below.</p>`
            : here.map(d => html`<div class="demonhere" style=${`--seal:${demonHue(d)}`}>
                <${DaemonFace} d=${d} cls="small" />
                <span><b>${d.n || "A daemon"}</b><small>${d.id === guardian ? "Guardian: stays with you" : D.army ? "For 3 turns (Solomon Unchained)" : `Can stay up to ${st.hours} h`}</small></span>
                <button class="btn small" onClick=${() => dismiss(d)}>Dismiss: ${st.dismissAP} AP</button></div>`)}
          ${D.army && html`<p class="demonarmy">Solomon Unchained: up to 5 at once; they don't count towards today's summons.</p>`}
          ${st.army && !D.army && html`<button class="btn small" disabled=${stamina + 3 >= 10} title="Demonology 10, Empowered: summon up to 5 contracted daemons at once for 3 turns"
            onClick=${unchain}>Solomon Unchained: 5 AP, 3 Stamina</button>`}
          ${st.banish && html`<div class="demonbanish">${banishing ? html`<${DemonBanish} c=${c} st=${st} update=${update} daemons=${D.daemons} onClose=${() => setBanishing(false)} />`
            : html`<button class="btn small" disabled=${!st.banishLeft} onClick=${() => setBanishing(true)} title="Demonology 7, Active: 3 AP, 1 use a long rest">Banish a daemon… (${st.banishLeft} left)</button>`}</div>`}
        </div>
      </div>
    </section>

    <section class="frame demongrim">
      <h2 class="h"><span>Grimoire</span><i class="orn" aria-hidden="true"></i></h2>
      ${!st.contracts && html`<p class="ptlocked">You can form contracts from Demonology 3. You can write your daemons in now.</p>`}
      <div class="demoncards">
        ${D.daemons.map(d => editing === d.id ? html`<${DaemonForm} key=${d.id} init=${d} onCancel=${() => setEditing("")} onSave=${v => { save(d.id, v); setEditing(""); }} onDelete=${() => remove(d)} />`
          : html`<${DaemonCard} key=${d.id} c=${c} d=${d} st=${st} update=${update} out=${D.out.includes(d.id)} guardian=${guardian} calling=${calling}
              why=${why(d)} onSummon=${() => summon(d)} onDismiss=${() => dismiss(d)} onEdit=${() => setEditing(d.id)} />`)}
        ${editing === "new" ? html`<${DaemonForm} onCancel=${() => setEditing("")} onSave=${v => { save("", v); setEditing(""); toast(`${v.n || "The daemon"} is in your grimoire.`); }} />`
          : html`<button type="button" class="demonnew" onClick=${() => setEditing("new")}><span>+</span>Write a new contract</button>`}
      </div>
      ${D.ledger.length > 0 && html`<h3 class="lbl wardsubh">Ledger</h3><div class="ptledger">${D.ledger.map(e => html`<div class="pled"><small class="muted">${new Date(e.t).toLocaleString()}</small> ${e.what}</div>`)}</div>`}
    </section>
  </div>`;
}

// The summoning circle: a ring of runes, a seven-pointed star and seven candles; the daemon stands in the middle.
function DemonCircle({ shown, call, here, guardian }) {
  const band = useMemo(() => Array.from({ length: 24 }, (_, i) => wardRune("demon" + i)), []);
  const pts = Array.from({ length: DEMON_CANDLES }, (_, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / DEMON_CANDLES; return [Math.cos(a) * 118, Math.sin(a) * 118]; });
  const star = pts.map((_, i) => pts[(i * 3) % DEMON_CANDLES]).map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ") + " Z";
  const src = demonSrc(shown), others = here.filter(d => !shown || d.id !== shown.id);
  return html`<svg class="demoncircle" viewBox="-150 -160 300 310" role="img" aria-label=${shown ? `${shown.n || "A daemon"} in the circle` : "The summoning circle, empty"}>
    <defs><clipPath id="demon-clip"><circle r="54" /></clipPath>
      <radialGradient id="demon-glow"><stop offset="0" stop-color="#ff5a2a" stop-opacity=".55" /><stop offset="1" stop-color="#ff5a2a" stop-opacity="0" /></radialGradient>
      <filter id="demon-smoke" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" /></filter></defs>
    <circle class="dglow" r="140" fill="url(#demon-glow)" />
    <circle class="dring" r="140" /><circle class="dring thin" r="126" />
    <g class="dband">${band.map((d, i) => html`<g transform=${`rotate(${i * 15}) translate(0 -133) scale(.6)`}><path class="drune" d=${d} /></g>`)}</g>
    <path class="dstar" d=${star} key=${call ? "draw" + call.id : "still"} />
    <circle class="dring inner" r="60" />
    <g class="dsmoke" filter="url(#demon-smoke)">${[0, 1, 2, 3, 4].map(i => html`<circle style=${`--i:${i}`} cx=${(i - 2) * 16} cy="30" r=${16 + (i % 2) * 6} />`)}</g>
    ${shown && html`<g class="dwho" key=${"who" + shown.id + (call ? "c" : "")}>
      ${src ? html`<image href=${src} x="-54" y="-54" width="108" height="108" preserveAspectRatio="xMidYMid slice" clip-path="url(#demon-clip)" />`
        : html`<path class="dsil" d=${DAEMON_SIL} transform="translate(-48 -46) scale(.8)" />`}
      <circle class="dframe" r="54" style=${`--seal:${demonHue(shown)}`} /></g>`}
    ${others.slice(0, 4).map((d, i) => { const a = Math.PI * (.25 + i * .5), x = Math.cos(a) * 92, y = Math.sin(a) * 92;
      return html`<g class="dmini" transform=${`translate(${x.toFixed(1)} ${y.toFixed(1)})`}><clipPath id=${"dm" + i}><circle r="18" /></clipPath>
        ${demonSrc(d) ? html`<image href=${demonSrc(d)} x="-18" y="-18" width="36" height="36" preserveAspectRatio="xMidYMid slice" clip-path=${`url(#dm${i})`} />` : html`<path class="dsil" d=${DAEMON_SIL} transform="translate(-16 -15) scale(.27)" />`}
        <circle class="dframe" r="18" style=${`--seal:${demonHue(d)}`} />${d.id === guardian && html`<text class="dguard" y="30">Guardian</text>`}</g>`; })}
    ${pts.map((p, i) => html`<g class="dcandle" style=${`--i:${i}`} transform=${`translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`}>
      <rect x="-4" y="-2" width="8" height="15" rx="1.5" /><path class="dflame" d="M0 -14C3 -9 4 -6 0 -2C-4 -6 -3 -9 0 -14Z" /></g>`)}
  </svg>`;
}

// A card in the grimoire: picture, name, realm, Willpower, the contract's terms, the abilities, and what you can do.
function DaemonCard({ c, d, st, update, out, guardian, calling, why, onSummon, onDismiss, onEdit }) {
  const [check, setCheck] = useState(null);   // { kind: "partial" | "boost", ab }
  const isG = guardian === d.id;
  return html`<article class=${"demoncard" + (out ? " out" : "") + (calling === d.id ? " calling" : "")} style=${`--seal:${demonHue(d)}`}>
    <header class="demoncardh">
      <div class="demonpic"><${DaemonFace} d=${d} /><i class="demonseal" aria-hidden="true">${(d.n || "?").trim().charAt(0).toUpperCase()}</i></div>
      <div class="demonname"><b>${d.n || "Unnamed daemon"}</b>
        <small>${[d.realm, d.wp !== "" && d.wp != null && `Willpower ${d.wp}`].filter(Boolean).join(" · ") || "Realm unknown"}</small>
        ${out && html`<span class="flag good">${isG ? "Guardian" : "Summoned"}</span>`}</div>
      <button class="iconbtn" aria-label=${`Edit ${d.n || "daemon"}`} title="Edit the contract" onClick=${onEdit}>${PENCIL}</button>
    </header>
    ${d.terms && html`<blockquote class="demonterms"><span class="lbl">Contract</span>${d.terms}</blockquote>`}
    ${d.abilities.length > 0 && html`<ul class="demonabs">${d.abilities.map(ab => html`<li key=${ab.id}>
      <div><b>${ab.n || "Ability"}</b>${ab.text && html` ${ab.text}`}</div>
      <span class="demonabacts">
        ${!out && st.partial && html`<button class="btn small" disabled=${!st.partialLeft && !st.partialMat} onClick=${() => setCheck({ kind: "partial", ab })}
          title="Demonology 4: use this ability without summoning the daemon (single-turn abilities only)">Partial summon</button>`}
        ${out && st.boost && html`<button class="btn small" disabled=${!st.boostLeft && !st.boostMat} onClick=${() => setCheck({ kind: "boost", ab })}
          title="Demonology 5: boost this ability">Boost</button>`}</span>
      ${check && check.ab.id === ab.id && html`<${DemonCheck} c=${c} st=${st} update=${update} d=${d} kind=${check.kind} ab=${ab} onClose=${() => setCheck(null)} />`}
    </li>`)}</ul>`}
    ${d.note && html`<p class="muted demonnote">${d.note}</p>`}
    <footer class="row demoncardf">
      ${out ? html`<button class="btn small" onClick=${onDismiss}>Dismiss: ${st.dismissAP} AP</button>`
        : html`<button class="btn small primary" disabled=${!!why || !!calling} title=${why || `Summon ${d.n || "this daemon"}`} onClick=${onSummon}>Summon: ${st.summonAP} AP</button>`}
      ${st.guardian && html`<label class="demonguard"><input type="checkbox" checked=${isG} onChange=${e => update(x => { x.demon.guardian = e.target.checked ? d.id : ""; addLog(x, `Demonology: ${e.target.checked ? `${d.n} is now the Guardian` : "no Guardian"}`); })} /> Guardian</label>`}
      ${!out && why && html`<span class="muted demonwhy">${why}</span>`}
    </footer>
  </article>`;
}

// A Demonology check for a partial summon or a boost: the GM's difficulty, a roll, and a use spent (or materials).
function DemonCheck({ c, st, update, d, kind, ab, onClose }) {
  const [dc, setDc] = useState(""), [roll, setRoll] = useState(null);
  const lv = kind === "partial" ? 4 : 5, usesLeft = kind === "partial" ? st.partialLeft : st.boostLeft;
  const what = kind === "partial" ? "Partial summon" : "Boost";
  const cost = kind === "partial" ? "1 AP and the ability's cost" : "3 AP";
  const go = async () => {
    const r = await askRoll({ title: `${what}: ${ab.n || "ability"}`, dice: [{ n: 1, sides: 100 }], cancel: true, note: `d100 − ${st.mod}${dc !== "" ? `, under ${dc} and it works` : ". The difficulty depends on the ability's strength"}.` });
    if (!r) return;
    const total = r[0] - st.mod, ok = dc === "" ? null : total < num(dc), mats = !usesLeft;
    setRoll({ r: r[0], total, ok, mats });
    update(x => {
      if (!mats) { x.uses = x.uses || {}; x.uses["p:Demonology:" + lv] = num(x.uses["p:Demonology:" + lv]) + 1; }
      const line = `${what} of ${d.n || "a daemon"}'s ${ab.n || "ability"}: ${r[0]} − ${st.mod} = ${total}${dc !== "" ? ` vs ${dc}, ${ok ? "it works" : "it fails"}` : ""}${mats ? " (materials)" : ""}`;
      x.demon.ledger = [{ id: rid(), t: Date.now(), what: line }, ...x.demon.ledger].slice(0, 30);
      addLog(x, "Demonology: " + line);
    });
  };
  return html`<div class="demoncheck" role="region" aria-label=${what}>
    <p class="muted">${what}: ${cost}. ${usesLeft ? `${usesLeft} use${usesLeft === 1 ? "" : "s"} left before a long rest.` : "No uses left: it costs materials instead (the GM sets them)."}</p>
    ${!roll ? html`<div class="row harmhow"><span class="mini warddc"><label for=${"dc-" + ab.id}>DC</label><input id=${"dc-" + ab.id} type="number" min="1" placeholder="GM's" value=${dc} onInput=${e => setDc(e.target.value)} /></span>
        <button class="btn small primary" onClick=${go}>Roll Demonology</button><button class="btn small" onClick=${onClose}>Cancel</button></div>`
      : html`<div class="row harmhow"><span class=${"harmkeepr " + (roll.ok === false ? "bad" : "ok")}>${roll.r} − ${st.mod} = <b>${roll.total}</b>${roll.ok == null ? " · the GM says whether it works" : roll.ok ? " · it works" : " · it fails"}</span>
        <button class="btn small" onClick=${onClose}>Done</button></div>`}
  </div>`;
}

// Banishing a daemon (yours or anyone's): a Demonology roll against its Willpower; on a failure it is immune for 24 hours.
function DemonBanish({ c, st, update, daemons, onClose }) {
  const [name, setName] = useState(""), [wp, setWp] = useState(""), [roll, setRoll] = useState(null);
  const pickWp = n => { setName(n); const d = daemons.find(x => (x.n || "").toLowerCase() === n.trim().toLowerCase()); if (d && d.wp !== "") setWp(String(d.wp)); };
  const go = async () => {
    const r = await askRoll({ title: `Banish ${name || "a daemon"}`, dice: [{ n: 1, sides: 100 }], cancel: true, note: `Demonology (d100 − ${st.mod}) against its Willpower${wp ? ` (${wp})` : ""}.` });
    if (!r) return;
    const total = r[0] - st.mod;
    setRoll({ r: r[0], total });
    update(x => {
      x.uses = x.uses || {}; x.uses["p:Demonology:7"] = num(x.uses["p:Demonology:7"]) + 1;
      const line = `Banish ${name || "a daemon"}: ${r[0]} − ${st.mod} = ${total}${wp ? ` against Willpower ${wp}` : ""}`;
      x.demon.ledger = [{ id: rid(), t: Date.now(), what: line }, ...x.demon.ledger].slice(0, 30);
      addLog(x, "Demonology: " + line);
    });
  };
  return html`<div class="demoncheck">
    <p class="muted">Banish: 3 AP. Roll Demonology against the daemon's Willpower. If it fails, that daemon can't be banished for 24 hours.</p>
    ${!roll ? html`<div class="row harmhow">
        <span class="mini"><label for="ban-n">Daemon</label><input id="ban-n" list="ban-list" value=${name} onInput=${e => pickWp(e.target.value)} placeholder="Name" /></span>
        <datalist id="ban-list">${daemons.map(d => html`<option value=${d.n} />`)}</datalist>
        <span class="mini warddc"><label for="ban-wp">Willpower</label><input id="ban-wp" value=${wp} onInput=${e => setWp(e.target.value)} placeholder="GM's" /></span>
        <button class="btn small primary" onClick=${go}>Roll to banish</button><button class="btn small" onClick=${onClose}>Cancel</button></div>`
      : html`<div class="row harmhow"><span class="harmkeepr">${roll.r} − ${st.mod} = <b>${roll.total}</b>${wp ? ` against Willpower ${wp}` : ""} · the GM says whether it holds</span>
        <button class="btn small" onClick=${onClose}>Done</button></div>`}
  </div>`;
}

// Writing a contract: name, realm, Willpower, picture, terms, abilities, notes.
function DaemonForm({ init, onSave, onCancel, onDelete }) {
  const [f, setF] = useState(() => Object.assign({ n: "", realm: "", wp: "", terms: "", note: "", img: "", imgData: "", abilities: [] }, init || {}, { abilities: ((init && init.abilities) || []).map(a => Object.assign({}, a)) }));
  const [busy, setBusy] = useState(false), [sure, setSure] = useState(false);
  const fileRef = useRef();
  const set = k => e => setF(Object.assign({}, f, { [k]: e.target.value }));
  const setAb = (i, k, v) => setF(Object.assign({}, f, { abilities: f.abilities.map((a, j) => j === i ? Object.assign({}, a, { [k]: v }) : a) }));
  const id = k => "df-" + ((init && init.id) || "new") + "-" + k;
  const pick = async e => {
    const file = e.target.files && e.target.files[0]; e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      if (Store.assets && Store.assets.upload) { const r = await Store.assets.upload(file, f.img); setF(Object.assign({}, f, { img: r.id, imgData: "" })); }
      else setF(Object.assign({}, f, { img: "", imgData: await shrinkImage(file, 240) }));   // this browser only: a small copy kept with the character
    } catch (err) { toast(err && err.code === "too_large" ? "That image is over 20 MB. Try a smaller one." : "Couldn't use that image. Use a PNG, JPG or WebP file."); }
    setBusy(false);
  };
  return html`<form class="brform demonform" style=${`--seal:${demonHue(Object.assign({ id: (init && init.id) || "new" }, f))}`}
    onSubmit=${e => { e.preventDefault(); onSave({ n: f.n.trim(), realm: f.realm.trim(), wp: f.wp === "" ? "" : num(f.wp), terms: f.terms.trim(), note: f.note.trim(), img: f.img, imgData: f.imgData,
      abilities: f.abilities.filter(a => (a.n || "").trim() || (a.text || "").trim()).map(a => ({ id: a.id || rid(), n: (a.n || "").trim(), text: (a.text || "").trim() })) }); }}>
    <div class="demonformtop">
      <div class="demonpic big"><${DaemonFace} d=${f} />
        <button type="button" class="over" disabled=${busy} onClick=${() => fileRef.current.click()}>${busy ? "Saving…" : demonSrc(f) ? "Replace picture" : "Add a picture"}</button>
        <input ref=${fileRef} type="file" accept="image/*" hidden onChange=${pick} /></div>
      <div class="demonformf">
        <div class="mini"><label for=${id("n")}>Name</label><input id=${id("n")} value=${f.n} onInput=${set("n")} placeholder="Vex, the Ash Warden" required /></div>
        <div class="row"><div class="mini"><label for=${id("realm")}>Realm</label><input id=${id("realm")} value=${f.realm} onInput=${set("realm")} placeholder="The Cinder Wastes" /></div>
          <div class="mini demonwp"><label for=${id("wp")}>Willpower</label><input id=${id("wp")} type="number" value=${f.wp} onInput=${set("wp")} /></div></div>
        ${demonSrc(f) && html`<button type="button" class="btn small" onClick=${() => setF(Object.assign({}, f, { img: "", imgData: "" }))}>Remove picture</button>`}
      </div>
    </div>
    <div class="mini"><label for=${id("terms")}>The contract's terms</label><textarea id=${id("terms")} rows="2" value=${f.terms} onInput=${set("terms")} placeholder="What it asks for, and what it gives" /></div>
    <div class="demonformabs"><span class="lbl">Abilities</span>
      ${f.abilities.map((a, i) => html`<div class="row demonformab" key=${a.id || i}>
        <input aria-label="Ability name" value=${a.n} onInput=${e => setAb(i, "n", e.target.value)} placeholder="Ability" />
        <input aria-label="What it does" class="grow" value=${a.text} onInput=${e => setAb(i, "text", e.target.value)} placeholder="What it does, its cost" />
        <button type="button" class="iconbtn" aria-label="Remove ability" onClick=${() => setF(Object.assign({}, f, { abilities: f.abilities.filter((_, j) => j !== i) }))}>×</button></div>`)}
      <button type="button" class="demonaddab" onClick=${() => setF(Object.assign({}, f, { abilities: [...f.abilities, { id: rid(), n: "", text: "" }] }))}>+ An ability</button></div>
    <div class="mini"><label for=${id("note")}>Notes</label><input id=${id("note")} value=${f.note} onInput=${set("note")} placeholder="Anything else" /></div>
    <div class="row demoncardf"><button class="btn small primary" type="submit" disabled=${busy || !f.n.trim()}>Seal the contract</button><button type="button" class="btn small" onClick=${onCancel}>Cancel</button>
      ${onDelete && html`<button type="button" class="btn small danger" onClick=${() => sure ? onDelete() : setSure(true)}>${sure ? "Really tear it up?" : "Tear up the contract"}</button>`}</div>
  </form>`;
}
