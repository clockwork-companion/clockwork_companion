/* ================= Magic → Dreamwalking =================
   A moonlit dreamscape that answers the Toll: the moon is eclipsed and the mist rises as the Toll grows, and past 30 the
   mist turns violet (damage then brings a Calamity). Items sent to the dream realm float in it as glowing bubbles; a
   dreamsphere shows as a sphere of light. Beside it the Toll meter lists everything the dreamwalker sustains, each part
   releasable. The rules are dreamState in rules.js; data in c.dream. */
const DREAM_STARS = Array.from({ length: 46 }, (_, i) => [wardSeed("sx" + i) * 600, wardSeed("sy" + i) * 190, .6 + wardSeed("sr" + i) * 1.2, wardSeed("sd" + i) * 4]);

function Dreamwalking({ c, update }) {
  const st = R.dreamState(c), D = c.dream;
  const [act, setAct] = useState("");          // which action's form is open
  const [grow, setGrow] = useState(0);         // a new dreamsphere's extra radius, in steps of 2 m
  const log = (x, what) => { x.dream.ledger = [{ id: rid(), t: Date.now(), what }, ...x.dream.ledger].slice(0, 30); addLog(x, "Dreamwalking: " + what); };
  const release = id => update(x => {
    const t = x.dream.tolls.find(y => y.id === id); if (!t) return;
    x.dream.tolls = x.dream.tolls.filter(y => y.id !== id); log(x, `released ${t.n} (−${num(t.pct)}% Toll)`);
  });
  const addToll = (x, n, pct, kind) => { x.dream.tolls.push({ id: rid(), n, pct: Math.max(0, Math.round(num(pct))), kind }); };
  const wake = () => update(x => { x.dream.inRealm = false; x.dream.mundane = false; x.dream.travelers = 0; log(x, "woke from the dream realm"); });
  const sphere = D.sphere;
  const pctMist = Math.min(1, st.toll / 100);

  return html`<div class="dreamwalking">
    <section class="frame dreamhead"><${Head} title="Dreamwalking" topic="dreamwalking" />
      <p class="sub">Every manipulation you sustain adds to your Toll. The higher it climbs, the harder the dream realm is to bend, and the closer a Calamity comes.</p>
      <div class="facts ptfacts">${[
        ["Dreamwalking", `${st.lvl}`], ["Modifier", `${st.mod}%`], ["Toll", `${st.toll}%`],
        ["Your bonus", `${st.bonus}%`], ["Calamity chance", `${st.calamity}%`],
      ].map(([k, v]) => html`<div class=${"fact" + (k === "Toll" && st.toll > 30 ? " warn" : "")}><span>${k}</span><b>${v}</b></div>`)}</div>
    </section>

    <section class=${"frame dreamf" + (D.inRealm ? " asleep" : "") + (st.toll > 30 ? " nightmare" : "")}>
      <h2 class="h"><span>The dreamscape</span><i class="orn" aria-hidden="true"></i></h2>
      <div class="dreamstage">
        <div class="dreamscene">
          <svg viewBox="0 0 600 300" role="img" aria-label=${`The dreamscape. Toll ${st.toll}%.${D.inRealm ? " You are in the dream realm." : ""}`}>
            <defs>
              <linearGradient id="dr-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070b24" /><stop offset=".65" stop-color="#1d1a45" /><stop offset="1" stop-color="#352a5c" /></linearGradient>
              <radialGradient id="dr-moon"><stop offset=".55" stop-color="#fff6dc" stop-opacity=".9" /><stop offset="1" stop-color="#fff6dc" stop-opacity="0" /></radialGradient>
              <linearGradient id="dr-mist" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="var(--mist)" stop-opacity=".85" /><stop offset="1" stop-color="var(--mist)" stop-opacity="0" /></linearGradient>
              <clipPath id="dr-moonclip"><circle cx="478" cy="72" r="32" /></clipPath>
            </defs>
            <rect width="600" height="300" fill="url(#dr-sky)" />
            <g class="drstars">${DREAM_STARS.map(([x, y, r, d]) => html`<circle cx=${x.toFixed(0)} cy=${y.toFixed(0)} r=${r.toFixed(1)} style=${`--d:${d.toFixed(1)}s`} />`)}</g>
            ${D.inRealm && html`<g class="draurora"><path d="M-20 120 C 120 60, 240 160, 380 90 S 560 70, 640 120" /><path d="M-20 150 C 140 100, 260 190, 400 120 S 560 110, 640 150" /></g>`}
            <circle class="drhalo" cx="478" cy="72" r="70" fill="url(#dr-moon)" />
            <circle class="drmoon" cx="478" cy="72" r="32" />
            <circle class="drshadow" cx=${(478 - 66 + 66 * pctMist).toFixed(1)} cy="70" r="33" clip-path="url(#dr-moonclip)" />
            <path class="drhills" d="M0 250 C 70 220, 130 236, 190 222 S 300 196, 370 214 S 500 236, 600 210 V300 H0Z" />
            ${sphere && html`<g class="drsphere"><circle cx="300" cy="210" r=${62 + 6 * num(sphere.grow)} /><text x="300" y="214">${num(sphere.turns) ? `${sphere.turns} turn${sphere.turns === 1 ? "" : "s"}` : "held open"}</text></g>`}
            ${D.vault.map((v, i) => { const x = 60 + wardSeed("vx" + v.id) * 400, y = 70 + wardSeed("vy" + v.id) * 90;
              return html`<g class=${"drbubble" + (v.lost ? " lost" : "")} style=${`--d:${(i * .7).toFixed(1)}s`} transform=${`translate(${x.toFixed(0)} ${y.toFixed(0)})`}>
                <circle r="20" /><text y="4">${(v.name || "?").slice(0, 10)}</text></g>`; })}
            <rect class="drmist" x="-40" y=${(300 - 50 - 170 * pctMist).toFixed(0)} width="680" height=${(60 + 170 * pctMist).toFixed(0)} fill="url(#dr-mist)" />
          </svg>
          <p class="dreamstate">${D.inRealm ? html`<b>In the dream realm</b>${D.mundane ? " · dreaming while awake" : ""}${num(D.travelers) ? ` · ${D.travelers} traveller${D.travelers === 1 ? "" : "s"}` : ""}` : "Awake"}</p>
        </div>

        <div class="dreamtoll" aria-label="Your Toll">
          <div class="dtmeter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${st.toll} aria-label=${`Toll ${st.toll}%`}>
            <i style=${`height:${Math.min(100, st.toll)}%`}></i><b class="dt30" title="Past 30, being damaged brings a Calamity"></b></div>
          <div class="dtlist">
            <p class="dttotal"><b>${st.toll}%</b> Toll</p>
            ${!st.parts.length ? html`<p class="muted">Nothing is pressing on your mind.</p>` : st.parts.map(([n, pct, id]) => html`<div class="dtpart">
              <span>${n}</span><b>${pct}%</b>
              ${D.tolls.some(t => t.id === id) && html`<button class="iconbtn" aria-label=${`Release ${n}`} title="Release it" onClick=${() => release(id)}>×</button>`}</div>`)}
          </div>
        </div>
      </div>

      <div class="dreamacts">
        ${!st.enter ? html`<p class="ptlocked">You can enter the dream realm from Dreamwalking 3.</p>`
          : D.inRealm ? html`<button class="btn small" onClick=${wake}>Wake up</button>
            ${st.travellers && html`<span class="ptstepper dtrav"><span class="lbl">Travellers</span><button class="iconbtn" aria-label="One traveller fewer" disabled=${!num(D.travelers)} onClick=${() => update(x => { x.dream.travelers = Math.max(0, num(x.dream.travelers) - 1); })}>−</button><b>${num(D.travelers)}</b>
              <button class="iconbtn" aria-label="One more traveller" onClick=${() => update(x => { x.dream.travelers = num(x.dream.travelers) + 1; })}>+</button></span>`}`
          : html`<button class=${"btn small" + (act === "enter" ? " primary" : "")} onClick=${() => setAct(act === "enter" ? "" : "enter")}>Enter the dream realm…</button>`}
        ${st.transpose && html`<button class=${"btn small" + (act === "pose" ? " primary" : "")} onClick=${() => setAct(act === "pose" ? "" : "pose")}>Transpose…</button>`}
        ${st.translocate && html`<button class=${"btn small" + (act === "loc" ? " primary" : "")} onClick=${() => setAct(act === "loc" ? "" : "loc")}>Translocate…</button>`}
        ${st.transfigure && html`<button class=${"btn small" + (act === "fig" ? " primary" : "")} onClick=${() => setAct(act === "fig" ? "" : "fig")}>Transfigure…</button>`}
        ${st.observe && html`<button class="btn small" disabled=${!st.observeLeft} title="Dreamwalking 6, Active: 1 AP; your next Perception, Insight or Investigation roll has advantage; +5% Toll until a long rest"
          onClick=${() => update(x => { x.uses = x.uses || {}; x.uses["p:Dreamwalking:6"] = num(x.uses["p:Dreamwalking:6"]) + 1; addToll(x, "Dream-sharpened eyes", 5, "observe"); log(x, "observation with advantage (+5% Toll)"); })}>Observe: 1 AP (${st.observeLeft} left)</button>`}
        ${st.spheres && !sphere && html`<button class=${"btn small" + (act === "sphere" ? " primary" : "")} onClick=${() => setAct(act === "sphere" ? "" : "sphere")}>Dreamsphere…</button>`}
      </div>

      ${act === "enter" && html`<${DreamEnter} st=${st} update=${update} log=${log} onClose=${() => setAct("")} />`}
      ${act === "pose" && html`<${DreamRoll} st=${st} title="Transpose" note="Travel to a place you can see or have seen, with what you carry. The roll decides how near the spot you land."
        onDone=${(ok, line) => update(x => log(x, `transposed: ${line}`))} onClose=${() => setAct("")} />`}
      ${(act === "loc" || act === "fig") && html`<${DreamManip} st=${st} kind=${act} update=${update} addToll=${addToll} log=${log} onClose=${() => setAct("")} />`}
      ${act === "sphere" && !sphere && html`<div class="dreamform">
        <p class="muted">A 20 m sphere of the dream realm, here, for 3 turns. You must be inside it. ${st.sphereAP} AP, ${st.sphereLeft} use${st.sphereLeft === 1 ? "" : "s"} left before a long rest.${st.delay ? " You can delay it by up to a minute after declaring it." : ""}</p>
        <div class="row harmhow"><span class="ptstepper"><span class="lbl">Radius</span><button class="iconbtn" aria-label="Smaller" disabled=${!grow} onClick=${() => setGrow(grow - 1)}>−</button>
          <b>${20 + 2 * grow} m</b><button class="iconbtn" aria-label="Larger (+4% Toll)" onClick=${() => setGrow(grow + 1)}>+</button></span>
          ${grow > 0 && html`<span class="muted">+${4 * grow}% Toll</span>`}
          <button class="btn small primary" disabled=${!st.sphereLeft} onClick=${() => { update(x => { x.uses = x.uses || {}; x.uses["p:Dreamwalking:7"] = num(x.uses["p:Dreamwalking:7"]) + 1; x.dream.sphere = { turns: 3, grow, extra: 0 }; log(x, `opened a dreamsphere of ${20 + 2 * grow} m (${st.sphereAP} AP${grow ? `, +${4 * grow}% Toll` : ""})`); }); setGrow(0); setAct(""); }}>Open it: ${st.sphereAP} AP</button>
          <button class="btn small" onClick=${() => setAct("")}>Cancel</button></div></div>`}
      ${sphere && html`<div class="dreamform sphereon">
        <p><b>Dreamsphere</b> · ${20 + 2 * num(sphere.grow)} m · ${num(sphere.turns) ? `${sphere.turns} turn${sphere.turns === 1 ? "" : "s"} left` : "its time is up"}${num(sphere.extra) ? ` · held ${sphere.extra} extra turn${sphere.extra === 1 ? "" : "s"}` : ""}</p>
        <div class="row harmhow">
          ${num(sphere.turns) ? html`<button class="btn small" onClick=${() => update(x => { x.dream.sphere.turns = Math.max(0, num(x.dream.sphere.turns) - 1); })}>End of turn</button>`
            : html`<${DreamRoll} st=${st} inline=${true} title="Hold it open" note="A successful check at the end of each round keeps it open: +5% Toll per extra turn."
                onDone=${ok => update(x => { if (ok !== false && x.dream.sphere) { x.dream.sphere.extra = num(x.dream.sphere.extra) + 1; x.dream.sphere.turns = 1; log(x, "held the dreamsphere open (+5% Toll)"); } })} />`}
          <button class="btn small" onClick=${() => update(x => { x.dream.sphere = null; log(x, "closed the dreamsphere"); })}>Close the sphere</button></div></div>`}
    </section>

    ${st.vault && html`<${DreamVault} c=${c} st=${st} update=${update} log=${log} />`}
    ${st.seeds && html`<${DreamSeeds} c=${c} update=${update} log=${log} />`}
    ${D.ledger.length > 0 && html`<section class="frame"><h2 class="h"><span>Ledger</span><i class="orn" aria-hidden="true"></i></h2>
      <div class="ptledger">${D.ledger.map(e => html`<div class="pled"><small class="muted">${new Date(e.t).toLocaleString()}</small> ${e.what}</div>`)}</div></section>`}
  </div>`;
}

// A Dreamwalking check: the GM's difficulty (optional), a d100 roll minus your bonus (modifier − Toll).
function DreamRoll({ st, title, note, onDone, onClose, inline, extra = 0 }) {
  const [dc, setDc] = useState(""), [roll, setRoll] = useState(null);
  const bonus = st.bonus - extra;   // extra: Toll the check carries (travellers joining you)
  const go = async () => {
    const r = await askRoll({ title: `Dreamwalking: ${title}`, dice: [{ n: 1, sides: 100 }], cancel: true, note: `d100 − ${bonus} (your modifier less your Toll${extra ? ` and the travellers' ${extra}%` : ""})${dc !== "" ? `, under ${dc} to succeed` : ""}.` });
    if (!r) return;
    const total = r[0] - bonus, ok = dc === "" ? null : total < num(dc);
    const line = `${r[0]} − ${bonus} = ${total}${dc !== "" ? ` vs ${dc}, ${ok ? "success" : "failure"}` : ""}`;
    setRoll({ r: r[0], total, ok }); onDone && onDone(ok, line, total);
  };
  return html`<div class=${inline ? "dreamroll inline" : "dreamform dreamroll"}>
    ${note && !inline && html`<p class="muted">${note}</p>`}
    ${!roll ? html`<div class="row harmhow"><span class="mini warddc"><label for=${"dr-dc-" + title}>DC</label><input id=${"dr-dc-" + title} type="number" min="1" placeholder="GM's" value=${dc} onInput=${e => setDc(e.target.value)} /></span>
        <button class="btn small primary" onClick=${go}>${title}: roll</button>${onClose && html`<button class="btn small" onClick=${onClose}>Cancel</button>`}</div>`
      : html`<div class="row harmhow"><span class=${"harmkeepr " + (roll.ok === false ? "bad" : "ok")}>${roll.r} − ${bonus} = <b>${roll.total}</b>${roll.ok == null ? " · the GM decides" : roll.ok ? " · success" : ` · failure. Calamity chance ${st.calamity}%: the GM rolls`}</span>
        ${onClose && html`<button class="btn small" onClick=${onClose}>Done</button>`}</div>`}
  </div>`;
}

// Entering the dream realm: asleep (a check until Dreamwalking 6), or from 6 during a mundane task; travellers from 8.
function DreamEnter({ st, update, log, onClose }) {
  const [mundane, setMundane] = useState(false), [trav, setTrav] = useState(0);
  const enter = line => { update(x => { x.dream.inRealm = true; x.dream.mundane = mundane; x.dream.travelers = trav; log(x, `entered the dream realm${mundane ? " while awake (+15% Toll)" : ""}${trav ? ` with ${trav} traveller${trav === 1 ? "" : "s"} (+${8 * trav}% Toll)` : ""}${line ? ` (${line})` : ""}`); }); onClose(); };
  return html`<div class="dreamform">
    <div class="row harmhow">
      ${st.easyEnter && html`<label class="demonguard"><input type="checkbox" checked=${mundane} onChange=${e => setMundane(e.target.checked)} /> While awake, at a mundane task (+15% Toll)</label>`}
      ${st.travellers && html`<span class="ptstepper"><span class="lbl">Travellers</span><button class="iconbtn" aria-label="One traveller fewer" disabled=${!trav} onClick=${() => setTrav(trav - 1)}>−</button><b>${trav}</b>
        <button class="iconbtn" aria-label="One more traveller" onClick=${() => setTrav(trav + 1)}>+</button></span>`}
    </div>
    ${st.easyEnter && !trav ? html`<div class="row harmhow"><button class="btn small primary" onClick=${() => enter("")}>Enter</button><button class="btn small" onClick=${onClose}>Cancel</button></div>`
      : html`<${DreamRoll} st=${st} inline=${true} title="Enter" note="" extra=${8 * trav + (mundane ? 15 : 0)}
          onDone=${(ok, line) => { if (ok !== false) enter(line); else update(x => log(x, `tried to enter the dream realm and slept instead (${line})`)); }} />
        <p class="muted">${trav ? `The check carries your travellers' Toll (+${8 * trav}%). ` : ""}The GM sets the difficulty from your condition. On a failure you just sleep; on a very bad one you arrive with a Calamity.</p>`}
  </div>`;
}

// Translocating or transfiguring something: what it is, the GM's Toll and difficulty, the check; a success holds the Toll.
function DreamManip({ st, kind, update, addToll, log, onClose }) {
  const [what, setWhat] = useState(""), [pct, setPct] = useState("");
  const loc = kind === "loc", verb = loc ? "Translocating" : "Transfiguring";
  return html`<div class="dreamform">
    <p class="muted">${loc ? "Touch the thing and move it by will: 1 AP to start (2 if you can't lift it), 2 AP to move it up to your movement or throw it if under 1 kg. It must weigh under 3 times what you can lift."
      : "Change a whole object into something you know the make-up of: 1 AP to minutes. It reverts when you let go, so think about what that means."} The GM sets the difficulty and the Toll it holds.</p>
    <div class="row harmhow">
      <span class="mini grow"><label for=${"dm-what-" + kind}>${loc ? "What" : "What into what"}</label><input id=${"dm-what-" + kind} value=${what} onInput=${e => setWhat(e.target.value)} placeholder=${loc ? "The iron gate" : "A plank into a ladder"} /></span>
      <span class="mini warddc"><label for=${"dm-pct-" + kind}>Toll %</label><input id=${"dm-pct-" + kind} type="number" min="0" value=${pct} onInput=${e => setPct(e.target.value)} placeholder="GM's" /></span>
    </div>
    <${DreamRoll} st=${st} inline=${true} title=${loc ? "Translocate" : "Transfigure"}
      onDone=${(ok, line) => update(x => { if (ok !== false) { addToll(x, `${verb} ${what || "something"}`, pct, kind); log(x, `${verb.toLowerCase()} ${what || "something"} (+${num(pct)}% Toll; ${line})`); }
        else log(x, `${verb.toLowerCase()} ${what || "something"} failed (${line}); Calamity chance ${st.calamity}%`); })} />
    <div class="row"><button class="btn small" onClick=${onClose}>Done</button></div>
  </div>`;
}

// The dream realm's vault: items from the inventory sent across (a check), floating in the dreamscape; renewed daily.
function DreamVault({ c, st, update, log }) {
  const D = c.dream, [pick, setPick] = useState(""), [pct, setPct] = useState(""), [sending, setSending] = useState(false), [renewing, setRenewing] = useState(false);
  const item = (c.items || []).find(i => i.id === pick);
  const send = ok => update(x => {
    const i = x.items.findIndex(y => y.id === pick); if (i < 0) return;
    const it = x.items[i]; x.items.splice(i, 1);
    x.dream.vault.push({ id: it.id, name: it.name, qty: num(it.qty), size: it.size || "small", pct: ok === false ? 0 : Math.max(0, Math.round(num(pct))), lost: ok === false });
    log(x, ok === false ? `${it.name} slipped away into the dream realm: lost until the next long rest` : `sent ${it.name} into the dream realm (+${num(pct)}% Toll)`);
  });
  const back = v => update(x => {
    x.dream.vault = x.dream.vault.filter(y => y.id !== v.id);
    const have = x.items.find(i => i.name === v.name);
    if (have) have.qty = num(have.qty) + num(v.qty); else x.items.push({ id: v.id, name: v.name, qty: num(v.qty), size: v.size || "small" });
    log(x, `brought ${v.name} back from the dream realm`);
  });
  const allBack = () => update(x => {
    x.dream.vault.filter(v => !v.lost).forEach(v => { const have = x.items.find(i => i.name === v.name); if (have) have.qty = num(have.qty) + num(v.qty); else x.items.push({ id: v.id, name: v.name, qty: num(v.qty), size: v.size || "small" }); });
    x.dream.vault = x.dream.vault.filter(v => v.lost); log(x, "the binding failed: everything came back from the dream realm");
  });
  return html`<section class="frame dreamvault">
    <h2 class="h"><span>The dream realm's vault</span><i class="orn" aria-hidden="true"></i></h2>
    <p class="sub">Send things you're touching and can lift into the dream realm (1 AP, 3 minutes' concentration and a check). Renew the binding each day, or everything comes back.</p>
    ${D.vault.length ? html`<div class="dvitems">${D.vault.map(v => html`<div class=${"dvitem" + (v.lost ? " lost" : "")}>
        <span class="dvorb" aria-hidden="true"></span><span class="dvn"><b>${v.name}</b>${num(v.qty) > 1 ? ` ×${v.qty}` : ""}<small>${v.lost ? "Lost until the next long rest" : num(v.pct) ? `${v.pct}% Toll` : "No Toll"}</small></span>
        ${!v.lost && html`<button class="btn small" onClick=${() => back(v)}>Bring it back</button>`}</div>`)}</div>`
      : html`<p class="muted">The vault is empty.</p>`}
    <div class="row harmhow">
      <button class=${"btn small" + (sending ? " primary" : "")} disabled=${!(c.items || []).length} onClick=${() => { setSending(!sending); setRenewing(false); }}>Send an item…</button>
      ${D.vault.some(v => !v.lost) && html`<button class=${"btn small" + (renewing ? " primary" : "")} onClick=${() => { setRenewing(!renewing); setSending(false); }}>Renew the binding…</button>`}
    </div>
    ${sending && html`<div class="dreamform">
      <div class="dvpick" role="list" aria-label="Your items">${(c.items || []).map(i => html`<button type="button" role="listitem" class=${"dvchip" + (pick === i.id ? " on" : "")} aria-pressed=${pick === i.id} onClick=${() => setPick(i.id)}>${i.name || "Item"}${num(i.qty) > 1 ? ` ×${i.qty}` : ""}</button>`)}</div>
      ${item && html`<div class="row harmhow"><span class="mini warddc"><label for="dv-pct">Toll %</label><input id="dv-pct" type="number" min="0" value=${pct} onInput=${e => setPct(e.target.value)} placeholder="By size" /></span></div>
        <${DreamRoll} st=${st} inline=${true} title="Send it" onDone=${ok => { send(ok); setPick(""); setPct(""); }} />`}
    </div>`}
    ${renewing && html`<div class="dreamform"><${DreamRoll} st=${st} inline=${true} title="Renew" note=""
      onDone=${(ok, line) => { if (ok === false) allBack(); else update(x => log(x, `renewed the binding (${line})`)); setRenewing(false); }} /></div>`}
  </section>`;
}

// Dreamseeds: palm-sized objects holding a piece of the dream realm. Two are free; each one past that adds 15% Toll.
function DreamSeeds({ c, update, log }) {
  const [n, setN] = useState(""), seeds = c.dream.seeds;
  return html`<section class="frame dreamseeds">
    <h2 class="h"><span>Dreamseeds</span><i class="orn" aria-hidden="true"></i></h2>
    <p class="sub">Things that fit in your palm, holding a piece of the dream realm: you can manipulate them, and what they touch, in the waking world, and seed dreamspheres on them. Two are free; each one past that adds 15% Toll until it's destroyed.</p>
    <div class="dvitems">${seeds.map((s, i) => html`<div class="dvitem seed"><span class="dvorb" aria-hidden="true"></span><span class="dvn"><b>${s.n}</b><small>${i < 2 ? "Free" : "+15% Toll"}</small></span>
      <button class="btn small" onClick=${() => update(x => { x.dream.seeds = x.dream.seeds.filter(y => y.id !== s.id); log(x, `${s.n} (a dreamseed) was destroyed; remaking it is a 4-hour ritual in the dream realm with 10000 rubles of materials`); })}>Destroyed</button></div>`)}</div>
    <form class="row harmhow" onSubmit=${e => { e.preventDefault(); const t = n.trim(); if (!t) return; update(x => { x.dream.seeds.push({ id: rid(), n: t }); log(x, `made ${t} a dreamseed${x.dream.seeds.length > 2 ? " (+15% Toll)" : ""}`); }); setN(""); }}>
      <span class="mini grow"><label for="ds-n">A new dreamseed</label><input id="ds-n" value=${n} onInput=${e => setN(e.target.value)} placeholder="A brass button" /></span>
      <button class="btn small" type="submit" disabled=${!n.trim()}>Make it a dreamseed</button></form>
  </section>`;
}
