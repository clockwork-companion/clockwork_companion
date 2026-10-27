/* ================= Magic → Occult: Harmony =================
   A figure seated in meditation, its chakras running up the body from the Opening chakra at the base to the Death chakra
   above the crown. Each wakes as Harmony reaches its level. The elements the practitioner knows float beside it: drag
   one (or tap it, then tap a chakra) to reinforce that chakra. Changes wait until you say how they were made (a rest,
   the level 5 Active, the level 10 meditation). From Harmony 7, chakras can be Released: the body flares, Aether raises
   every Affinity, and closing them costs Stamina. The rules are harmonyState and harmonyLine in rules.js; data in c.harmony. */
const HARM_COLOR = { fire: "#e8662a", earth: "#b8913f", wind: "#6fcdb3", water: "#3f8fd8", spirit: "#c3a3f0" };
const HARM_NAME = Object.fromEntries(R.HARMONY_ELEMENTS);
// The old alchemical signs: Fire and Air point up, Water and Earth down; Spirit is a star.
const HARM_GLYPH = {
  fire: "M0 -7L7 6H-7Z", wind: "M0 -7L7 6H-7Z M-4.6 1.2H4.6", water: "M0 7L7 -6H-7Z", earth: "M0 7L7 -6H-7Z M-4.6 -1.2H4.6",
  spirit: "M0 -7L1.9 -2.2L7 -2.2L2.9 1L4.4 6L0 3L-4.4 6L-2.9 1L-7 -2.2L-1.9 -2.2Z",
};
const HarmGlyph = ({ el, cls = "" }) => html`<svg class=${"harmglyph " + cls} viewBox="-9 -9 18 18" aria-hidden="true"><path d=${HARM_GLYPH[el]} /></svg>`;
// Where each chakra sits on the figure (viewBox 0 0 300 400): root, sacrum, navel, solar plexus, heart, throat, brow, crown.
// All inside the body; the figure is drawn 1.25× from the bottom of the frame (HARM_FIT) so they fit.
const CHAKRA_Y = { opening: 326, life: 289, pain: 250, healing: 207, limit: 162, wonder: 108, view: 66, death: 45 };
const HARM_FIT = "translate(150 390) scale(1.25) translate(-150 -340)";
// The figure, seated in the lotus position: legs crossed with the feet up, hands resting on the knees in a mudra,
// shoulders soft, eyes closed. The upper body breathes (a slow rise and fall, with a glow at the heart in time); the head
// drifts very slightly; motes of energy rise around it in the colour of the strongest element.
function HarmFigure({ mote }) {
  const arm = "M101 144C90 150 84 172 82 196C80 214 80 228 78 240C76 256 70 274 65 290L80 297C84 281 90 265 94 249C97 236 100 220 103 200C105 184 108 162 112 152Z";
  const mirror = "matrix(-1 0 0 1 300 0)";
  return html`<g transform=${HARM_FIT}><g class="harmfig">
    <g class="hlegs">
      <path class="harmsil" d="M106 286C84 288 58 295 44 307C33 317 39 332 60 334C96 340 204 340 240 334C261 332 267 317 256 307C242 295 216 288 194 286Z" />
      <path class="harmsil shin" d="M242 321C208 309 150 308 102 313C92 315 90 323 100 326C150 323 200 325 236 333Z" />
      <path class="harmsil shin" d="M58 321C92 307 150 305 198 311C208 313 210 321 200 324C150 321 100 323 64 333Z" />
      <path class="harmsil foot" d="M84 315C88 306 103 305 110 311C113 318 106 324 96 324C89 324 84 320 84 315Z" />
      <path class="harmsil foot" d="M216 313C212 304 197 303 190 309C187 316 194 322 204 322C211 322 216 318 216 313Z" />
      <path class="hfold" d="M70 316C100 304 140 300 176 302 M232 316C214 308 196 304 176 303 M120 330C140 333 160 333 180 330" />
    </g>
    <g class="hupper">
      <circle class="hheart" cx="150" cy="184" r="34" />
      <path class="harmsil" d=${arm} /><path class="harmsil" d=${arm} transform=${mirror} />
      <path class="harmsil torso" d="M134 126C120 130 106 134 100 146C95 158 97 178 101 198C105 220 112 240 114 260C115 274 111 286 106 296L194 296C189 286 185 274 186 260C188 240 195 220 199 198C203 178 205 158 200 146C194 134 180 130 166 126Z" />
      <path class="hfold" d="M136 128L150 156L164 128 M114 262C130 268 170 268 186 262 M118 272C134 277 166 277 182 272 M104 160C110 176 112 196 112 214 M196 160C190 176 188 196 188 214" />
      <path class="harmsil" d="M141 100C142 112 140 120 134 128H166C160 120 158 112 159 100Z" />
      <g class="hhead">
        <ellipse class="harmsil" cx="129.5" cy="87" rx="3.6" ry="6.5" /><ellipse class="harmsil" cx="170.5" cy="87" rx="3.6" ry="6.5" />
        <ellipse class="harmsil head" cx="150" cy="81" rx="20.5" ry="25.5" />
        <path class="hhair" d="M129.5 84C127 63 138 54 150 54C162 54 173 63 170.5 84C168 72 160 65.5 150 66.5C140 65.5 132 72 129.5 84Z" />
        <path class="hface" d="M137 80.5Q141 78.5 145 80 M155 80Q159 78.5 163 80.5 M138 88.5Q141.5 91 145 88.5 M155 88.5Q158.5 91 162 88.5 M150 89L148.4 96.5H151.6 M145.5 100.5Q150 102.6 154.5 100.5" />
      </g>
    </g>
    <g class="hhands">
      <ellipse class="harmsil" cx="70" cy="298" rx="10" ry="6.5" transform="rotate(-18 70 298)" /><circle class="hmudra" cx="63" cy="296" r="2.6" />
      <ellipse class="harmsil" cx="230" cy="298" rx="10" ry="6.5" transform="rotate(18 230 298)" /><circle class="hmudra" cx="237" cy="296" r="2.6" />
    </g>
    <g class="hmotes" style=${`--mote:${mote || "var(--brass)"}`}>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => html`<circle style=${`--i:${i}`} cx=${(70 + (i * 37) % 160).toFixed(0)} cy=${(300 - (i % 3) * 12).toFixed(0)} r=${(1.2 + (i % 3) * .5).toFixed(1)} />`)}</g>
  </g></g>`;
}

function Harmony({ c, update }) {
  const st = R.harmonyState(c), h = c.harmony;
  const canFree = typeof isGM === "function" && (isGM() || !!c.freeEdit);
  const [pending, setPending] = useState({});            // chakra → element (or "" to empty it), waiting to be made
  const [armed, setArmed] = useState("");                 // an element picked up by tapping, ready to drop on a chakra
  const [sel, setSel] = useState(() => st.open[0] || "opening");
  const [learning, setLearning] = useState(false), [learnPick, setLearnPick] = useState("");
  const [releasing, setReleasing] = useState(false), [flare, setFlare] = useState(0), [lit, setLit] = useState({});
  const bodyRef = useRef(null);
  const stamina = num(c.vitals && c.vitals.exhaustion);
  const changes = Object.keys(pending).filter(k => (pending[k] || "") !== (st.held[k] || ""));

  // Chakras that opened since this browser last looked wake up with a flash.
  useEffect(() => {
    const key = "cw-harm-seen-" + c.id, seen = num(lsGet(key, 0));
    if (st.lvl > seen) {
      if (seen && !reduceMotion()) { const woke = {}; R.CHAKRAS.forEach(x => { if (x.lvl > seen && x.lvl <= st.lvl) woke[x.k] = "wake"; }); setLit(woke); setTimeout(() => setLit({}), 2200); }
      lsSet(key, st.lvl);
    }
  }, [st.lvl, c.id]);

  const place = (k, el) => {
    if (!st.open.includes(k)) { toast(`The ${R.CHAKRA_BY[k].n} chakra opens at Harmony ${R.CHAKRA_BY[k].lvl}.`); return; }
    if (h.rel.length) { toast("Close your released chakras before changing them."); return; }
    setSel(k); setArmed("");
    setPending(p => { const n = Object.assign({}, p); if ((el || "") === (st.held[k] || "")) delete n[k]; else n[k] = el; return n; });
  };
  // Make the waiting changes, the way the practitioner says they were made.
  const commit = how => {
    const list = changes.map(k => `${R.CHAKRA_BY[k].n}: ${pending[k] ? HARM_NAME[pending[k]] : "empty"}`).join(", ");
    update(x => {
      changes.forEach(k => { if (pending[k]) x.harmony.ch[k] = pending[k]; else delete x.harmony.ch[k]; });
      let what = how === "short" ? "over a short rest" : how === "long" ? "over a long rest" : how === "shift" ? "with the Active (2 AP)" : "in a minute's meditation (2 Stamina)";
      if (how === "shift") { x.uses = x.uses || {}; x.uses["p:Occult: Harmony:5"] = num(x.uses["p:Occult: Harmony:5"]) + 1; }
      if (how === "all") R.setStamina(x, num(x.vitals.exhaustion) + 2);
      x.harmony.ledger = [{ id: rid(), t: Date.now(), what: `Reinforced ${what}: ${list}` }, ...x.harmony.ledger].slice(0, 20);
      addLog(x, `Harmony: reinforced ${what} (${list})`);
    });
    const ig = {}; changes.forEach(k => { ig[k] = "ignite"; }); setLit(ig); setTimeout(() => setLit({}), 1300);
    setPending({});
  };
  const learn = el => {
    update(x => { if (!x.harmony.els.includes(el)) x.harmony.els.push(el); addLog(x, `Harmony: learned the ${HARM_NAME[el]} element`); });
    setLearning(false); setLearnPick(""); toast(`You know ${HARM_NAME[el]} now.`);
  };
  const forget = el => update(x => {
    x.harmony.els = x.harmony.els.filter(e => e !== el);
    Object.keys(x.harmony.ch).forEach(k => { if (x.harmony.ch[k] === el) delete x.harmony.ch[k]; });
    addLog(x, `Harmony: ${HARM_NAME[el]} removed (Free edit)`);
  });
  const release = k => {
    if (!st.open.includes(k) || h.rel.includes(k)) return;
    update(x => {
      if (!x.harmony.rel.length) { x.harmony.turns = st.releaseTurns; x.harmony.kept = 0; }
      x.harmony.rel.push(k); addLog(x, `Harmony: released the ${R.CHAKRA_BY[k].n} chakra (Aether ${x.harmony.rel.length})`);
    });
    setFlare(f => f + 1);
  };
  const closeAll = () => {
    const n = h.rel.length;
    update(x => {
      R.setStamina(x, num(x.vitals.exhaustion) + n);
      x.harmony.ledger = [{ id: rid(), t: Date.now(), what: `Closed ${n} released chakra${n === 1 ? "" : "s"}: −${n} Stamina` }, ...x.harmony.ledger].slice(0, 20);
      addLog(x, `Harmony: closed ${n} released chakra${n === 1 ? "" : "s"}, lost ${n} Stamina`);
      x.harmony.rel = []; x.harmony.turns = 0; x.harmony.kept = 0;
    });
    setReleasing(false);
  };

  // Drag an element orb onto a chakra (mouse or finger); a tap without moving picks it up instead.
  const grab = (e, el) => {
    if (e.button > 0) return;
    const x0 = e.clientX, y0 = e.clientY; let ghost = null;
    const move = ev => {
      if (!ghost && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 6) {
        ghost = document.createElement("div"); ghost.className = "harmghost"; ghost.style.setProperty("--ec", HARM_COLOR[el]);
        ghost.innerHTML = `<svg viewBox="-9 -9 18 18"><path d="${HARM_GLYPH[el]}" /></svg>`; document.body.appendChild(ghost);
      }
      if (ghost) { ghost.style.left = ev.clientX + "px"; ghost.style.top = ev.clientY + "px"; }
    };
    const up = ev => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      if (!ghost) { setArmed(a => a === el ? "" : el); return; }
      ghost.remove();
      const at = document.elementFromPoint(ev.clientX, ev.clientY), t = at && at.closest("[data-chakra]");
      if (t) place(t.dataset.chakra, el);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  const chakraClick = k => {
    if (releasing && st.canRelease) { release(k); return; }
    if (armed) { place(k, armed); return; }
    setSel(k);
  };
  const shown = k => (k in pending ? pending[k] : st.held[k]) || "";

  const selC = R.CHAKRA_BY[sel] || R.CHAKRAS[0];
  return html`<div class="harmony">
    <section class="frame harmhead"><${Head} title="Occult: Harmony" topic="harmony" />
      <p class="sub">Your body's spiritual energy, guided through its chakras. Reinforce each chakra with an element you know: the more chakras an element holds, the stronger its Affinity.</p>
      <div class="facts ptfacts">${[
        ["Harmony", `${st.lvl}`],
        ["Modifier", `${st.mod}%`],
        ["Chakras open", `${st.open.length} of 8`],
        ["Next", st.next ? `${st.next.n} at ${st.next.lvl}` : "All open"],
      ].map(([k, v]) => html`<div class="fact"><span>${k}</span><b>${v}</b></div>`)}</div>
    </section>

    <section class=${"frame harmf" + (h.rel.length ? " released" : "") + (releasing ? " releasing" : "")}>
      <h2 class="h"><span>Chakras</span><i class="orn" aria-hidden="true"></i></h2>
      <p class="sub">${releasing ? "Tap a chakra to release it (0 AP each)." : armed ? `Tap a chakra to reinforce it with ${HARM_NAME[armed]}.` : "Drag an element onto a chakra, or tap the element and then the chakra. Tap a chakra to read its powers."}</p>
      <div class="harmstage">
        <div class="harmels" role="list" aria-label="Your elements">
          ${st.known.map(el => html`<div class="harmel" role="listitem" style=${`--ec:${HARM_COLOR[el]}`}>
            <button type="button" class=${"harmorb" + (armed === el ? " armed" : "")} aria-pressed=${armed === el} aria-label=${`${HARM_NAME[el]}, Affinity ${st.aff[el]}`}
              title=${`${HARM_NAME[el]}: drag onto a chakra, or tap and then tap a chakra`} onPointerDown=${e => grab(e, el)}
              onKeyDown=${e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setArmed(a => a === el ? "" : el); } }}>
              <${HarmGlyph} el=${el} /></button>
            <span class="harmeln">${HARM_NAME[el]}</span>
            <span class="harmaff" title="Affinity: chakras it holds, plus Aether">${st.aff[el]}</span>
            ${canFree && html`<button class="iconbtn harmforget" aria-label=${`Remove ${HARM_NAME[el]} (Free edit)`} title="Remove (Free edit)" onClick=${() => forget(el)}>×</button>`}
          </div>`)}
          ${st.canLearn > 0 && !learning && html`<button type="button" class="harmlearn" onClick=${() => setLearning(true)}>+ Learn an element<small>${st.canLearn} to choose</small></button>`}
          ${learning && html`<div class="harmpick">
            <span class="lbl">Learn which element? It's permanent.</span>
            <div class="harmpickrow">${R.HARMONY_ELEMENTS.filter(([e]) => !st.known.includes(e)).map(([e, n]) => html`<button type="button"
              class=${"harmorb small" + (learnPick === e ? " armed" : "")} style=${`--ec:${HARM_COLOR[e]}`} aria-pressed=${learnPick === e} aria-label=${n} title=${n} onClick=${() => setLearnPick(e)}><${HarmGlyph} el=${e} /></button>`)}</div>
            ${learnPick && html`<button class="btn small primary" onClick=${() => learn(learnPick)}>Learn ${HARM_NAME[learnPick]}</button>`}
            <button class="btn small" onClick=${() => { setLearning(false); setLearnPick(""); }}>Cancel</button></div>`}
          ${!st.known.length && !st.canLearn && html`<p class="muted">You learn your first element at Harmony 3.</p>`}
          ${st.aether > 0 && html`<div class="harmaether"><span>Aether</span><b>+${st.aether}</b><small>to every Affinity</small></div>`}
        </div>

        <svg ref=${bodyRef} class=${"harmbody" + (h.rel.length ? " released" : "")} viewBox="0 0 300 400" role="group" aria-label="Your chakras">
          <defs>
            <linearGradient id="harm-skin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--card)" /><stop offset=".55" stop-color="var(--hs1)" /><stop offset="1" stop-color="var(--hs2)" /></linearGradient>
            <radialGradient id="harm-aura"><stop offset="0" stop-color="var(--aura)" stop-opacity=".55" /><stop offset=".6" stop-color="var(--aura)" stop-opacity=".12" /><stop offset="1" stop-color="var(--aura)" stop-opacity="0" /></radialGradient>
            <linearGradient id="harm-spine" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="var(--brass)" stop-opacity="0" /><stop offset=".5" stop-color="var(--brass)" stop-opacity=".8" /><stop offset="1" stop-color="var(--brass)" stop-opacity="0" /></linearGradient>
          </defs>
          <ellipse class="harmaura" cx="150" cy="190" rx="138" ry="190" fill="url(#harm-aura)" />
          ${flare > 0 && html`<circle class="harmflare" cx="150" cy="190" r="40" key=${"fl" + flare} />`}
          <${HarmFigure} mote=${(() => { const best = st.known.slice().sort((x, y) => st.aff[y] - st.aff[x])[0]; return best && st.aff[best] ? HARM_COLOR[best] : ""; })()} />
          <line class="harmspine" x1="150" y1=${CHAKRA_Y.opening} x2="150" y2=${CHAKRA_Y[st.open[st.open.length - 1]] || CHAKRA_Y.opening} />
          ${R.CHAKRAS.map(x => {
            const open = st.open.includes(x.k), el = shown(x.k), wait = x.k in pending && (pending[x.k] || "") !== (st.held[x.k] || "");
            const rel = h.rel.includes(x.k), y = CHAKRA_Y[x.k];
            return html`<g class=${"chakra" + (open ? " open" : " shut") + (el ? " held" : "") + (wait ? " wait" : "") + (rel ? " rel" : "") + (sel === x.k ? " sel" : "") + (lit[x.k] ? " " + lit[x.k] : "")}
              data-chakra=${x.k} transform=${`translate(150 ${y}) scale(.85)`} style=${el ? `--ec:${HARM_COLOR[el]}` : ""}
              role="button" tabindex=${open ? 0 : -1} aria-label=${`${x.n} chakra${open ? (el ? `, ${HARM_NAME[el]}` : ", empty") : `, opens at Harmony ${x.lvl}`}${rel ? ", released" : ""}`}
              onClick=${() => chakraClick(x.k)} onContextMenu=${e => { e.preventDefault(); if (open && el && !releasing) place(x.k, ""); }}
              onKeyDown=${e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); chakraClick(x.k); } }}>
              <circle class="chalo" r="22" />
              <circle class="cring" r="12" />
              <circle class="ccore" r="8.5" />
              ${el && html`<path class="cglyph" d=${HARM_GLYPH[el]} transform="scale(.62)" />`}
              ${!open && html`<text class="clock" y="3.5">${x.lvl}</text>`}
              <text class="cname" x=${x.k === "death" || x.k === "view" ? 40 : x.k === "wonder" ? 30 : 84} y="4">${x.n}</text>
            </g>`;
          })}
        </svg>

        <aside class="harmread" aria-live="polite">
          <h3 class="harmreadh"><span>${selC.n} chakra</span><small>${st.open.includes(selC.k) ? (st.held[selC.k] ? HARM_NAME[st.held[selC.k]] : "Empty") : `Opens at Harmony ${selC.lvl}`}</small></h3>
          ${selC.release != null && html`<p class="harmrel"><b>Released:</b> ${selC.release || "Not written in the book yet."}</p>`}
          ${R.HARMONY_ELEMENTS.map(([e, n]) => {
            const lines = selC.fx[e], on = st.held[selC.k] === e, known = st.known.includes(e);
            return html`<div class=${"harmfx" + (on ? " on" : "") + (known ? "" : " unknown")} style=${`--ec:${HARM_COLOR[e]}`}>
              <span class="harmfxh"><${HarmGlyph} el=${e} /> ${n}${known ? html` <small>Affinity ${st.aff[e]}</small>` : html` <small>not known</small>`}</span>
              ${lines.length ? lines.map(t => { const L = R.harmonyLine(t, known ? st.aff : {}); return html`<p class=${L.need && (!known || st.aff[e] < L.need) ? "below" : ""}>${L.parts.map(p => typeof p === "string" ? p : known ? html`<b class="harmv">${p.v}</b>` : "")}</p>`; })
                : html`<p class="muted">Not written in the book yet.</p>`}
            </div>`;
          })}
        </aside>
      </div>

      ${changes.length > 0 && html`<div class="harmwait" role="region" aria-label="Changes to make">
        <p><span class="lbl">Changing</span> ${changes.map(k => html`<span class="harmchip" style=${pending[k] ? `--ec:${HARM_COLOR[pending[k]]}` : ""}>${R.CHAKRA_BY[k].n}: ${st.held[k] ? HARM_NAME[st.held[k]] : "empty"} → <b>${pending[k] ? HARM_NAME[pending[k]] : "empty"}</b></span>`)}</p>
        <div class="row harmhow">
          ${changes.length === 1 && html`<button class="btn small" onClick=${() => commit("short")} title="One chakra can be changed over a short rest">Over a short rest</button>`}
          ${changes.length === 1 && st.lvl >= 5 && html`<button class="btn small primary" disabled=${!st.shift} onClick=${() => commit("shift")} title="Harmony 5, Active: change one chakra">Now: 2 AP (${st.shift} left)</button>`}
          <button class="btn small" onClick=${() => commit("long")} title="Any number of chakras can be changed over a long rest; the changes count as made before it">Over a long rest</button>
          ${st.canAll && html`<button class="btn small" disabled=${stamina + 2 >= 10} onClick=${() => commit("all")} title="Harmony 10, Empowered: change them all in a minute's meditation">Meditate 1 minute: 2 Stamina</button>`}
          <button class="btn small" onClick=${() => setPending({})}>Undo</button>
        </div></div>`}

      ${st.canRelease && html`<div class=${"harmrelbox" + (h.rel.length ? " on" : "")}>
        ${!h.rel.length ? html`<div class="row"><button class=${"btn small" + (releasing ? " primary" : "")} aria-pressed=${releasing} onClick=${() => { setReleasing(r => !r); setArmed(""); }}>${releasing ? "Done choosing" : "Release chakras…"}</button>
            <span class="muted">0 AP each. Each one adds 1 Aether to every Affinity, for ${st.releaseTurns} turns. Closing costs 1 Stamina per chakra.</span></div>`
        : html`<p class="harmrelnow"><b>${h.rel.map(k => R.CHAKRA_BY[k].n).join(", ")}</b> released · Aether +${st.aether} · ${st.turnsLeft ? `${st.turnsLeft} turn${st.turnsLeft === 1 ? "" : "s"} left` : "time is up"}${st.kept ? ` · kept open ${st.kept} time${st.kept === 1 ? "" : "s"}` : ""}</p>
          <div class="row harmhow">
            ${releasing ? html`<button class="btn small primary" onClick=${() => setReleasing(false)}>Done choosing</button>`
              : st.open.length > h.rel.length && html`<button class="btn small" onClick=${() => setReleasing(true)}>Release another…</button>`}
            ${st.turnsLeft > 0 ? html`<button class="btn small" onClick=${() => update(x => { x.harmony.turns = Math.max(0, num(x.harmony.turns) - 1); })}>End of turn</button>`
              : html`<${HarmKeep} c=${c} st=${st} update=${update} />`}
            <button class="btn small danger" onClick=${closeAll}>Close them: −${h.rel.length} Stamina</button>
          </div>
          ${stamina + h.rel.length >= 10 && html`<p class="ptlocked">Closing them now would take your Stamina to ${stamina + h.rel.length}. At 10 you die.</p>`}`}
      </div>`}
    </section>

    <section class="frame harmnow">
      <h2 class="h"><span>What your chakras give you</span><i class="orn" aria-hidden="true"></i></h2>
      ${!Object.keys(st.held).length ? html`<p class="muted">No chakra is reinforced yet.</p>`
        : R.CHAKRAS.filter(x => st.held[x.k]).map(x => {
          const e = st.held[x.k];
          return html`<div class="harmnowrow" style=${`--ec:${HARM_COLOR[e]}`}>
            <span class="harmnowh"><${HarmGlyph} el=${e} /> <b>${x.n}</b> · ${HARM_NAME[e]} <small>Affinity ${st.aff[e]}</small></span>
            ${x.fx[e].length ? x.fx[e].map(t => { const L = R.harmonyLine(t, st.aff); return (!L.need || st.aff[e] >= L.need) && html`<p>${L.parts.map(p => typeof p === "string" ? p : html`<b class="harmv">${p.v}</b>`)}</p>`; })
              : html`<p class="muted">Not written in the book yet.</p>`}
            ${h.rel.includes(x.k) && x.release && html`<p class="harmrel"><b>Released:</b> ${x.release}</p>`}
          </div>`;
        })}
      ${(h.ledger || []).length > 0 && html`<h3 class="lbl wardsubh">Ledger</h3><div class="ptledger">${h.ledger.map(e => html`<div class="pled"><small class="muted">${new Date(e.t).toLocaleString()}</small> ${e.what}</div>`)}</div>`}
    </section>
  </div>`;
}
// Keeping released chakras open past their time: a Harmony check against a DC the GM raises each time.
function HarmKeep({ c, st, update }) {
  const [dc, setDc] = useState(""), [roll, setRoll] = useState(null);
  const go = async () => {
    const r = await askRoll({ title: "Keep the chakras open", dice: [{ n: 1, sides: 100 }], cancel: true, note: `d100 − ${st.mod}${dc !== "" ? `, under ${dc} to hold them open` : ". The GM sets a harder DC each time"}.` });
    if (!r) return;
    const total = r[0] - st.mod, held = dc === "" ? null : total < num(dc);
    setRoll({ r: r[0], total, held });
    update(x => {
      if (held !== false) { x.harmony.turns = 1; x.harmony.kept = num(x.harmony.kept) + 1; }
      addLog(x, `Harmony: kept chakras open? ${r[0]} − ${st.mod} = ${total}${dc !== "" ? ` vs ${dc}: ${held ? "held" : "failed"}` : ""}`);
    });
  };
  return html`<span class="row harmkeep">
    <span class="mini warddc"><label for="harm-dc">DC</label><input id="harm-dc" type="number" min="1" placeholder="GM's" value=${dc} onInput=${e => setDc(e.target.value)} /></span>
    <button class="btn small primary" onClick=${go}>Keep them open: roll</button>
    ${roll && html`<span class=${"harmkeepr " + (roll.held === false ? "bad" : "ok")}>${roll.r} − ${st.mod} = <b>${roll.total}</b>${roll.held == null ? "" : roll.held ? " · held" : " · they close"}</span>`}
  </span>`;
}
