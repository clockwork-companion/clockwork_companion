/* ================= Magic → Dreamwalking =================
   The sleeper (DreamSleeper, below): a figure asleep on a bedroll with the dream realm above them as a bubble. The Toll
   shows on the sleeper and in the dream (the moon is eclipsed and the mist rises; past 30 it turns violet, a nightmare).
   Items sent to the dream realm float in the bubble; a dreamsphere shows as a sphere of light round the sleeper. Beside it the Toll meter lists everything the dreamwalker sustains, each part
   releasable. The rules are dreamState in rules.js; data in c.dream. */
// The dream's stars, inside the bubble (centre 372,122, radius 104), and the waking sky's few faint ones.
const DREAM_STARS = Array.from({ length: 40 }, (_, i) => { const a = wardSeed("sa" + i) * 6.283, r = Math.sqrt(wardSeed("sr" + i)) * 98;
  return [372 + Math.cos(a) * r, 122 + Math.sin(a) * r * .8 - 12, .5 + wardSeed("sz" + i) * 1.1, wardSeed("sd" + i) * 4]; });
const NIGHT_STARS = Array.from({ length: 22 }, (_, i) => [wardSeed("nx" + i) * 600, wardSeed("ny" + i) * 150, .4 + wardSeed("nr" + i) * .6]);

/* The sleeper: a figure asleep on a bedroll, lying on their back, with the dream realm opening above them as a bubble
   on a thread of light from the brow. The Toll shows on the sleeper: calm and slow breathing at first, uneasy (a
   frown, quicker breath, a twitch) from 10%, and past 30% a nightmare (tossing, sweat, a clenched hand) while shadow
   hands creep in from the dark. Awake, the eyes open and the dream shrinks to a dim orb; waking pops the bubble and
   the sleeper starts. Only transforms and opacity are animated, so it stays smooth. */
function DreamSleeper({ D, st, sphere }) {
  const awake = !D.inRealm, eyesOpen = awake || D.mundane;
  const mood = awake ? "awake" : st.toll > 30 ? "night" : st.toll >= 10 ? "uneasy" : "calm";
  const reach = Math.max(0, Math.min(1, (st.toll - 15) / 45));     // how far the shadow hands have crept in
  const pctMist = Math.min(1, st.toll / 100);
  const prev = useRef(D.inRealm), [pop, setPop] = useState(0), [jolt, setJolt] = useState(false);
  useEffect(() => {
    if (prev.current && !D.inRealm) { setPop(Date.now()); setJolt(true); const t = setTimeout(() => setJolt(false), 1300); prev.current = D.inRealm; return () => clearTimeout(t); }
    prev.current = D.inRealm;
  }, [D.inRealm]);
  const sr = 62 + 6 * num(sphere && sphere.grow);
  const face = eyesOpen
    ? html`<path class="drlid" d="M147.3 250.2 Q151 248.6 154.7 250.4" /><circle class="dreye" cx="151.2" cy="251.6" r="1.35" />`
    : mood === "night" ? html`<path class="drlash" d="M147.3 252.2 Q151 250 154.9 252.2 M146.6 249.6 L149.5 251 M156 249.4 L153.4 251" />`
    : html`<path class="drlash" d="M147.3 251.2 Q151 253.6 154.7 251.2" />`;
  const brow = mood === "night" ? "M146 247.6 Q150.5 246.6 155.4 249" : mood === "uneasy" ? "M146 247.4 Q150.5 246.6 155.2 248.2" : "M146 247.6 Q150.5 246.2 155.2 247.4";
  const mouth = mood === "night" ? html`<ellipse class="drmouth open" cx="166.4" cy="248.3" rx="1.2" ry="1.7" transform="rotate(-30 166.4 248.3)" />`
    : html`<path class="drmouth" d=${mood === "uneasy" ? "M164.6 247.2 L167.6 249.4" : "M164.4 246.9 Q166.6 249.4 168 249.2"} />`;
  const hand = (cls, x, y, rot) => html`<g class=${"drhand " + cls} style=${`transform: translate(${x}px, ${y}px) rotate(${rot}deg); opacity: ${Math.min(1, reach * 1.4).toFixed(2)}`}>
    <g class="drgrasp"><path d="M-170 -9 C-110 -12 -40 -10 0 -5 L0 8 C-40 10 -110 13 -170 12Z" />
    <path d="M-2 -6 C8 -11 20 -12 28 -9 L50 -17 C54 -18 55 -14 52 -12 L33 -4 L58 -6 C62 -6 62 -1 58 -1 L34 2 L55 9 C59 10 57 14 54 13 L31 7 L44 18 C46 20 44 23 41 21 L25 11 C14 13 4 12 -2 8Z" /></g></g>`;

  return html`<div class=${"dreamscene mood-" + mood + (D.inRealm ? " open" : "") + (jolt ? " jolt" : "")} style=${`--reach:${reach.toFixed(2)}`}>
    <svg viewBox="0 0 600 340" role="img" aria-label=${`The sleeper. Toll ${st.toll}%.${D.inRealm ? " You are in the dream realm." : " You are awake."}`}>
      <defs>
        <linearGradient id="dr-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#090d22" /><stop offset=".7" stop-color="#151a3a" /><stop offset="1" stop-color="#1c1d3d" /></linearGradient>
        <radialGradient id="dr-moonlight" cx=".85" cy="0" r="1"><stop offset="0" stop-color="#c9d4ff" stop-opacity=".16" /><stop offset="1" stop-color="#c9d4ff" stop-opacity="0" /></radialGradient>
        <linearGradient id="dr-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17162e" /><stop offset="1" stop-color="#0a0915" /></linearGradient>
        <linearGradient id="dr-roll" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a4636" /><stop offset=".5" stop-color="#3f3027" /><stop offset="1" stop-color="#241b16" /></linearGradient>
        <linearGradient id="dr-pillow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfd3e6" /><stop offset="1" stop-color="#7d8199" /></linearGradient>
        <linearGradient id="dr-blanket" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d7fb3" /><stop offset=".35" stop-color="#4a5888" /><stop offset="1" stop-color="#262d4f" /></linearGradient>
        <linearGradient id="dr-sheet" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d8dcef" /><stop offset="1" stop-color="#9ea4c2" /></linearGradient>
        <linearGradient id="dr-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2c3a6" /><stop offset="1" stop-color="#a98468" /></linearGradient>
        <linearGradient id="dr-sleeve" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4cfe2" /><stop offset="1" stop-color="#8d88a8" /></linearGradient>
        <linearGradient id="dr-neck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8937a" /><stop offset="1" stop-color="#7d5f4d" /></linearGradient>
        <radialGradient id="dr-shadowfall" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".55" /><stop offset="1" stop-color="#000" stop-opacity="0" /></radialGradient>
        <linearGradient id="dr-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1236" /><stop offset=".6" stop-color="#2a2466" /><stop offset="1" stop-color="#4a3a7c" /></linearGradient>
        <radialGradient id="dr-moon"><stop offset=".5" stop-color="#fff6dc" stop-opacity=".85" /><stop offset="1" stop-color="#fff6dc" stop-opacity="0" /></radialGradient>
        <linearGradient id="dr-mist" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="var(--mist)" stop-opacity=".85" /><stop offset="1" stop-color="var(--mist)" stop-opacity="0" /></linearGradient>
        <radialGradient id="dr-glow" cx=".5" cy=".5" r=".5"><stop offset=".86" stop-color="var(--dglow)" stop-opacity="0" /><stop offset=".93" stop-color="var(--dglow)" stop-opacity=".35" /><stop offset="1" stop-color="var(--dglow)" stop-opacity="0" /></radialGradient>
        <linearGradient id="dr-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3e9ff" /><stop offset=".35" stop-color="#9fe6ff" /><stop offset=".7" stop-color="#c7a8ff" /><stop offset="1" stop-color="#ffd1f0" /></linearGradient>
        <radialGradient id="dr-sph" cx=".5" cy=".5" r=".5"><stop offset=".6" stop-color="#9fe6ff" stop-opacity=".04" /><stop offset=".97" stop-color="#9fe6ff" stop-opacity=".28" /><stop offset="1" stop-color="#d9f6ff" stop-opacity=".7" /></radialGradient>
        <radialGradient id="dr-dread" cx=".3" cy=".75" r=".9"><stop offset=".35" stop-color="#2a0b4a" stop-opacity="0" /><stop offset="1" stop-color="#2a0b4a" stop-opacity=".85" /></radialGradient>
        <linearGradient id="dr-hand" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#14051f" stop-opacity="0" /><stop offset=".45" stop-color="#1c0830" stop-opacity=".9" /><stop offset="1" stop-color="#2b0e46" /></linearGradient>
        <clipPath id="dr-bubbleclip"><circle cx="372" cy="122" r="104" /></clipPath>
        <clipPath id="dr-moonclip"><circle cx="420" cy="66" r="19" /></clipPath>
      </defs>
      <rect width="600" height="340" fill="url(#dr-night)" />
      <g class="drnight">${NIGHT_STARS.map(([x, y, r]) => html`<circle cx=${x.toFixed(0)} cy=${y.toFixed(0)} r=${r.toFixed(1)} />`)}</g>
      <rect width="600" height="340" fill="url(#dr-moonlight)" />
      <path d="M0 292 C120 286 220 290 320 288 S 520 284 600 290 V340 H0Z" fill="url(#dr-ground)" />
      <ellipse cx="300" cy="306" rx="250" ry="16" fill="url(#dr-shadowfall)" />
      <rect class="drdread" width="600" height="340" fill="url(#dr-dread)" />
      <g class="drhands" aria-hidden="true">
        ${hand("h1", -150 + 230 * reach, 304, -4)}
        ${hand("h2", 750 - 230 * reach, 300, 184)}
        ${hand("h3", -70 + 150 * reach, -60 + 170 * reach, 38)}
      </g>

      ${sphere && html`<g class="drsphere"><circle cx="236" cy="262" r=${sr} fill="url(#dr-sph)" /><text x="236" y=${262 - sr + 18}>${num(sphere.turns) ? `${sphere.turns} turn${sphere.turns === 1 ? "" : "s"}` : "held open"}</text></g>`}
      <rect x="78" y="284" width="446" height="20" rx="10" fill="url(#dr-roll)" />
      <path class="drrollseam" d="M90 292 H512" />
      <path d="M96 293 C92 277 104 265 128 264 C150 263 176 267 183 277 C187 287 179 295 160 296 L112 297 C102 297 97 296 96 293Z" fill="url(#dr-pillow)" />
      <g class="drsleeper">
        <g class="drlegs">
          <path d="M300 298 L302 262 C318 260 334 258 350 256.5 C374 254 396 253.5 414 250.5 C426 248.5 436 248.5 446 251.5 C458 255 470 256.5 482 251.5 C493 247.5 505 250 509 258 C513 267 512 282 515 298Z" fill="url(#dr-blanket)" />
          <path class="drfold" d="M330 266 C360 270 392 266 420 262 M430 258 C448 266 470 266 486 260 M360 282 C390 286 430 284 470 286" />
        </g>
        <g class="drhead">
          <path d="M170 257 C177 256.4 185 259.6 191 265 L190.4 279.6 C184 281 177.6 280.4 173.4 278.4Z" fill="url(#dr-neck)" />
          <path class="drface" d="M131 277 C122 269 124 255 136 250.5 C141 248.6 147 247.6 152 247.4 C154.2 246.3 156.3 243.2 158.8 240 C160.4 238.6 162 239 162.1 240.7 C162.2 243.2 162.7 245.2 164.6 246.1 C166.1 246.7 167.1 247.6 167.6 248.6 C169.2 248.9 171.2 249.2 172.6 250.7 C175.2 253.3 176.6 257.6 178.2 262.4 L183 277Z" fill="url(#dr-skin)" />
          <path class="drjaw" d="M172.6 251.8 C171.4 256 168.8 259.6 165 262.2" />
          <ellipse class="drear" cx="141.4" cy="263" rx="4.2" ry="5.6" fill="url(#dr-skin)" /><path class="drearin" d="M142.6 260 C140.4 260.4 139.8 263.6 141.6 265.8" />
          <path class="drhair" d="M129 279 C113 271 115 249 133 246 C140 244.6 146 245.6 149 248.2 C143 249.2 139.4 253 138.4 257.6 C143.4 257.4 146.2 260 146.4 263.6 C144 262.4 141.2 262.6 139 264.6 C138.2 270 141 275 147 279Z" />
          <path class="drhairline" d="M122 262 C124 254 130 249 138 247.6 M120 270 C121 262 126 256 134 252" />
          <path class="drbrow" d=${brow} />
          ${face}${mouth}
          <path class="drnostril" d="M160.4 244.3 Q161.6 245.4 162.8 244.9" />
          <g class="drsweat"><path d="M148.6 246.4 C148.6 247.8 147.8 248.6 147.1 248.6 C146.4 248.6 145.9 247.8 146.1 246.9 L147.3 244.6Z" /><path d="M143.4 247.6 C143.4 249 142.6 249.8 141.9 249.8 C141.2 249.8 140.7 249 140.9 248.1 L142.1 245.8Z" /></g>
        </g>
        <g class="drchest">
          <path d="M184 298 L185 268 C186.4 261 192 256.4 199 255 C210 250 220 245.6 232 245 C252 245 270 250 286 254.6 C298 257.6 308 259.8 319 261.6 L320 298Z" fill="url(#dr-blanket)" />
          <path d="M185 268 C190 260.6 200 259.6 208 264.6 C212 268 213.4 274 213 280 C209 276 202 274.6 196 276 C192 277 188 279.6 185.6 283Z" fill="url(#dr-sheet)" />
          <path class="drsheetedge" d="M185.6 283 C188 279.6 192 277 196 276 C202 274.6 209 276 213 280" />
          <path class="drfold" d="M222 262 C240 266 262 266 282 262 M214 280 C240 284 270 284 300 280" />
          <path class="drarm" d="M214 262.6 C226 256.4 242 252.2 258.6 249.6 C261.4 249.4 263.6 251.4 263.6 254.4 C263.6 257 261.8 258.6 259.4 259 C244 261.4 229.6 265.4 218.6 270.4 C214.4 272 211 269.8 211.2 266.6 C211.4 264.8 212.4 263.4 214 262.6Z" fill="url(#dr-sleeve)" />
          <path class="drcuff" d="M257.4 249.8 C259.6 252 260 255.8 258.4 259" />
          <g class="drgrip"><ellipse cx="268.6" cy="253.4" rx="9.2" ry="5.6" transform="rotate(-12 268.6 253.4)" fill="url(#dr-skin)" />
            <path class="drfinger" d="M265 250 C269 248.6 273.6 248.6 276.6 250.6 M264.4 253 C268.6 251.8 273.4 252 277 253.6" /></g>
        </g>
      </g>
      <path class="drthread" d="M153 244 C160 212 198 196 230 206 C258 215 272 213 292 196" />
      <g class="drdream">
        <circle cx="372" cy="122" r="118" fill="url(#dr-glow)" />
        <g clip-path="url(#dr-bubbleclip)">
          <rect x="262" y="14" width="220" height="216" fill="url(#dr-sky)" />
          <g class="drstars">${DREAM_STARS.map(([x, y, r, d]) => html`<circle cx=${x.toFixed(0)} cy=${y.toFixed(0)} r=${r.toFixed(1)} style=${`--d:${d.toFixed(1)}s`} />`)}</g>
          <g class="draurora"><path d="M250 100 C300 60 350 130 400 80 S 470 70 500 96" /><path d="M250 126 C305 92 355 150 410 104 S 470 100 500 120" /></g>
          <circle class="drhalo" cx="420" cy="66" r="44" fill="url(#dr-moon)" />
          <circle class="drmoon" cx="420" cy="66" r="19" />
          <circle class="drshadow" cx=${(420 - 40 + 40 * pctMist).toFixed(1)} cy="65" r="20" clip-path="url(#dr-moonclip)" />
          <path class="drhills" d="M262 196 C300 182 330 190 360 182 S 420 172 482 188 V232 H262Z" />
          ${D.vault.map((v, i) => { const x = 300 + wardSeed("vx" + v.id) * 140, y = 80 + wardSeed("vy" + v.id) * 80;
            return html`<g transform=${`translate(${x.toFixed(0)} ${y.toFixed(0)})`}><g class=${"drbubble" + (v.lost ? " lost" : "")} style=${`--d:${(i * .7).toFixed(1)}s`}>
              <circle r="15" /><text y="3.5">${(v.name || "?").slice(0, 9)}</text></g></g>`; })}
          <rect class="drmist" x="240" y=${(226 - 30 - 150 * pctMist).toFixed(0)} width="280" height=${(40 + 150 * pctMist).toFixed(0)} fill="url(#dr-mist)" />
        </g>
        <circle class="drrim" cx="372" cy="122" r="104" />
        <path class="drshine" d="M296 70 C314 44 340 30 368 26" />
      </g>
      ${pop > 0 && html`<g class="drpop" key=${pop} aria-hidden="true"><circle class="drpopring" cx="372" cy="122" r="104" />
        ${Array.from({ length: 14 }, (_, i) => html`<circle class="drmote" cx="372" cy="122" r=${(1.6 + (i % 3) * .8).toFixed(1)} style=${`--a:${(i * 25.7).toFixed(0)}deg`} />`)}</g>`}
    </svg>
    <p class="dreamstate">${D.inRealm ? html`<b>In the dream realm</b>${D.mundane ? " · dreaming while awake" : ""}${num(D.travelers) ? ` · ${D.travelers} traveller${D.travelers === 1 ? "" : "s"}` : ""}` : "Awake"}</p>
  </div>`;
}

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
        <${DreamSleeper} D=${D} st=${st} sphere=${sphere} />

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
