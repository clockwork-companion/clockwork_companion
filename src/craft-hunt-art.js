/* ================= Crafting → Hunting: the trophies drawn =================
   Every part you can carve is drawn as the real thing (a ridged horn, a slit-pupilled eye, a bloodied fang, a pelt…),
   in a box from −40 to 40 that hangs from its top (0, −38). A merged trophy is its own part with the parts it took in
   sewn on: HUNT_SLOTS gives each part four places, filled in order (on top, the left side, the right side, across the
   front), and HUNT_SPOTS puts some parts where they belong (a skull's eyes, mouth, jaw, crown; an eye's hood). How a
   part is sewn on depends on both (huntStyle): eyes are set in, hide wraps a slender part or is patched on a broad one,
   things laid on a hide are sewn flat, sharp things pierce a heart, the rest are sewn on at the edge with a sinew seam.
   Up to four are drawn; more are kept but the picture stays. The gradients live once in HuntArtDefs. */

const HUNT_ATTACH_MAX = 12;   // merged parts kept on a trophy
const HUNT_SHOW = 4;          // merged parts drawn: past four the picture stays as it is
const HuntArtDefs = () => html`<svg class="htdefs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
  <linearGradient id="hta-horn" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#efe4c8" /><stop offset=".45" stop-color="#c9b48a" /><stop offset=".8" stop-color="#7d6748" /><stop offset="1" stop-color="#3b2d1f" /></linearGradient>
  <linearGradient id="hta-round" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".42" /><stop offset=".32" stop-color="#fff" stop-opacity=".16" /><stop offset=".62" stop-color="#000" stop-opacity="0" /><stop offset="1" stop-color="#000" stop-opacity=".45" /></linearGradient>
  <linearGradient id="hta-ivory" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9dcbc" /><stop offset=".5" stop-color="#f6efdc" /><stop offset=".85" stop-color="#d9c9a3" /><stop offset="1" stop-color="#b8a47c" /></linearGradient>
  <linearGradient id="hta-claw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a120d" /><stop offset=".4" stop-color="#57463a" /><stop offset=".7" stop-color="#2a1d15" /><stop offset="1" stop-color="#0e0906" /></linearGradient>
  <radialGradient id="hta-sclera" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fbf3d6" /><stop offset=".6" stop-color="#e6d2a0" /><stop offset="1" stop-color="#a8865a" /></radialGradient>
  <radialGradient id="hta-iris" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe08a" /><stop offset=".55" stop-color="#e08a1a" /><stop offset="1" stop-color="#5a2204" /></radialGradient>
  <radialGradient id="hta-ballshade" cx=".45" cy=".4" r=".6"><stop offset=".6" stop-color="#000" stop-opacity="0" /><stop offset="1" stop-color="#2a1404" stop-opacity=".55" /></radialGradient>
  <linearGradient id="hta-nerve" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6e1e22" /><stop offset=".45" stop-color="#c46a62" /><stop offset="1" stop-color="#5a161a" /></linearGradient>
  <radialGradient id="hta-pelt" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#7a6250" /><stop offset=".6" stop-color="#4d3b2c" /><stop offset="1" stop-color="#2a1d14" /></radialGradient>
  <linearGradient id="hta-skin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2bf98" /><stop offset="1" stop-color="#9a6a48" /></linearGradient>
  <radialGradient id="hta-heart" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#d4504f" /><stop offset=".55" stop-color="#8e1c22" /><stop offset="1" stop-color="#3e070b" /></radialGradient>
  <linearGradient id="hta-vessel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6e1a22" /><stop offset=".45" stop-color="#c86a6e" /><stop offset="1" stop-color="#5a1218" /></linearGradient>
  <radialGradient id="hta-skull" cx=".5" cy=".3" r=".75"><stop offset="0" stop-color="#f3ead2" /><stop offset=".6" stop-color="#cdb990" /><stop offset="1" stop-color="#7c6846" /></radialGradient>
  <linearGradient id="hta-spike" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2e24" /><stop offset=".55" stop-color="#8f8068" /><stop offset="1" stop-color="#e2d6b8" /></linearGradient>
  <linearGradient id="hta-tongue" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a2630" /><stop offset=".4" stop-color="#d27880" /><stop offset="1" stop-color="#6a1e26" /></linearGradient>
  <linearGradient id="hta-leather" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2e1e14" /><stop offset=".45" stop-color="#6a4c3a" /><stop offset="1" stop-color="#24170f" /></linearGradient>
  <linearGradient id="hta-earin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3428" /><stop offset=".5" stop-color="#b47e6c" /><stop offset="1" stop-color="#7a4a3a" /></linearGradient>
  <radialGradient id="hta-stone" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#9d978c" /><stop offset=".6" stop-color="#6b665e" /><stop offset="1" stop-color="#34312c" /></radialGradient>
  <linearGradient id="hta-brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe7a6" /><stop offset=".3" stop-color="#d1a24a" /><stop offset=".6" stop-color="#8f6522" /><stop offset=".8" stop-color="#d8ad58" /><stop offset="1" stop-color="#5e4012" /></linearGradient>
  <filter id="hta-drop" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="1.2" dy="2.4" stdDeviation="1.6" flood-color="#0c0603" flood-opacity=".55" /></filter>
  <${HuntPattern} id="hta-fur" k="fur" w=${72} h=${72} />
</defs></svg>`;

// shared strokes
const htShine = d => html`<path d=${d} fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="2" stroke-linecap="round" />`;
const htLine = (d, col = "#3a2a1e", w = 1.2, op = .5) => html`<path d=${d} fill="none" stroke=${col} stroke-width=${w} stroke-opacity=${op} stroke-linecap="round" />`;
const htFill = (d, fill, extra = {}) => html`<path d=${d} fill=${fill} ...${extra} />`;
const htRound = d => htFill(d, "url(#hta-round)");
const htFur = (d, op = .9) => htFill(d, "url(#hta-fur)", { opacity: op });

// One entry per part: how it's drawn.
const HUNT_ART = {
  horn: { draw: () => { const d = "M-13 -32 C-15 -8 -8 16 -20 38 C0 24 14 0 13 -32 Z";
      return html`${htFill(d, "url(#hta-horn)")}${htRound(d)}
        ${htLine("M-13.5 -20 C-4 -16 6 -16 13 -20 M-13.4 -8 C-5 -4 5 -4 12.4 -8 M-12.6 4 C-5 7 3 7 10.6 3 M-11.6 15 C-6 17 -1 16 5 12 M-12.6 25 C-9 26 -5 25 -2 23", "#4a3826", 1.3, .55)}
        ${htShine("M7 -29 C8 -8 2 12 -12 31")}
        <ellipse cy="-32" rx="13" ry="4" fill="#5e4a33" /><ellipse cy="-32.4" rx="9" ry="2.5" fill="#c9b48a" />
        ${htLine("M-14 -31 l2 3 l2 -2.4 l2 3 l2 -2.4 l2 3 l2 -2.4 l2 3 l2 -2.4 l2 3 l2 -2.4 l2 3 l2 -2.6", "#2e1f15", 2.2, .9)}`; } },
  fang: { draw: () => { const d = "M-10 -34 C-11 -16 -7 8 0 36 C6 8 10 -16 10 -34 Z";
      return html`${htFill(d, "url(#hta-ivory)")}${htRound(d)}
        ${htFill("M-10 -34 C-10 -28 -10 -24 -9.6 -20 C-3 -23 3 -23 9.6 -20 C10 -24 10 -28 10 -34 Z", "#8a5236", { opacity: .8 })}
        ${htLine("M-9.6 -20 C-3 -23 3 -23 9.6 -20", "#4a1c10", 1.4, .7)}${htFill("M-6 -20 C-6 -16 -4 -13 -5 -10 C-3 -12 -3 -16 -2 -19 Z", "#7a2416", { opacity: .55 })}
        ${htLine("M3 -12 l-1.6 7 l1.8 6 l-1 5", "#6a5a40", .9, .7)}${htShine("M-5 -16 C-5 2 -2 18 0 30")}
        <ellipse cy="-34" rx="10" ry="3" fill="#6a3a24" />`; } },
  claw: { draw: () => { const d = "M-12 -32 C-15 -12 -8 12 12 36 C10 30 4 14 2 0 C1 -14 6 -26 8 -32 Z";
      return html`${htFill(d, "url(#hta-claw)")}
        ${htLine("M-6 -26 C-7 -6 -2 12 8 30 M-1 -28 C-2 -10 1 6 6 20", "#9a8a78", .9, .4)}${htShine("M-9 -24 C-10 -6 -4 12 8 30")}
        ${htFill("M-15 -32 C-15 -40 11 -40 11 -32 C11 -27 -15 -27 -15 -32 Z", "url(#hta-pelt)")}${htFur("M-15 -32 C-15 -40 11 -40 11 -32 C11 -27 -15 -27 -15 -32 Z")}
        ${htLine("M-14 -29 l1.5 4 l1.4 -3 l1.6 4 l1.4 -3.4 l1.6 4 l1.4 -3 l1.6 4 l1.4 -3.4 l1.6 4 l1.4 -3 l1.6 4 l1.4 -3.6 l1.6 3", "#2a1d14", 1.6, .9)}`; } },
  eye: { draw: (bare) => html`${!bare && html`<g key="stalk">${htFill("M-5 -38 C-6 -28 -9 -22 -7 -14 L7 -14 C9 -22 6 -28 5 -38 Z", "url(#hta-nerve)")}
        ${htLine("M-1 -36 C-2 -28 -2 -22 -1 -16", "#f0b0a0", .8, .5)}<ellipse cy="-38" rx="5" ry="1.8" fill="#4a0e12" /></g>`}
      <circle cy="4" r="22" fill="url(#hta-sclera)" />
      ${htLine("M-20 -2 C-14 0 -12 4 -8 4 M-18 14 C-13 12 -10 10 -7 9 M18 -6 C13 -3 11 0 8 1 M15 18 C11 14 9 12 7 10 M-5 -16 C-4 -10 -3 -8 -2 -6 M-14 -12 C-11 -9 -10 -7 -9 -4", "#a8242a", .9, .65)}
      <circle cy="4" r="12" fill="url(#hta-iris)" />${htLine("M0 -8 V-2 M-8 -4 L-4 0 M8 -4 L4 0 M-11 6 H-6 M11 6 H6 M-7 13 L-4 9 M7 13 L4 9", "#7a3a0a", .7, .5)}
      <circle cy="4" r="12" fill="none" stroke="#2a0e02" stroke-width="1.5" /><ellipse cy="4" rx="2.6" ry="10" fill="#0a0503" />
      <circle cy="4" r="22" fill="url(#hta-ballshade)" />
      <ellipse cx="-8" cy="-6" rx="6" ry="3.4" fill="#fff" opacity=".6" transform="rotate(-30 -8 -6)" /><circle cx="7" cy="14" r="1.6" fill="#fff" opacity=".35" />` },
  hide: { draw: () => { const d = "M-30 -30 C-18 -35 -4 -32 8 -35 C18 -36 28 -32 32 -28 C27 -14 34 -2 30 10 C33 20 28 30 24 34 C10 30 -6 36 -18 32 C-26 34 -33 28 -30 20 C-35 8 -28 -6 -32 -18 C-34 -24 -32 -28 -30 -30 Z";
      return html`${htFill(d, "url(#hta-pelt)")}${htFur(d)}
        ${htFill("M24 34 C25 25 29 18 31 12 C25 19 18 25 12 32 Z", "url(#hta-skin)")}${htLine("M24 34 C25 25 29 18 31 12", "#5a3a24", 1, .6)}
        <path d="M-26 -25 C-15 -30 -2 -27 8 -30 C17 -31 25 -28 27 -25 C24 -12 29 -2 26 9 C28 18 24 26 21 29 M8 29 C-6 33 -16 29 -24 27 C-28 18 -30 6 -28 -6 C-30 -14 -29 -20 -26 -25" fill="none" stroke="#e2c393" stroke-opacity=".5" stroke-width="1" stroke-dasharray="3 3" />
        <circle cx="-13" cy="-25" r="2" fill="#140c07" /><circle cx="13" cy="-26" r="2" fill="#140c07" />
        ${htLine("M-13 -25 L0 -38 L13 -26", "#2a1a0c", 1.8, .95)}${htLine("M-13 -25 L0 -38 L13 -26", "#b98c56", .7, .7)}`; } },
  heart: { draw: () => html`${htFill("M-10 -26 C-11 -32 -10 -37 -7 -38 L-2 -38 C-3 -34 -3 -30 -2 -24 Z", "url(#hta-vessel)")}
      ${htFill("M2 -24 C2 -30 4 -34 9 -36 C12 -35 12 -32 9 -30 C7 -28 7 -26 7 -22 Z", "url(#hta-vessel)")}
      ${htFill("M-15 -18 C-20 -22 -22 -26 -20 -29 L-16 -28 C-16 -25 -14 -22 -11 -20 Z", "#7a2a40")}
      <ellipse cx="-4.5" cy="-38" rx="2.6" ry="1.2" fill="#3a0608" />
      ${htFill("M-2 -26 C-14 -28 -26 -20 -26 -6 C-26 10 -14 24 2 36 C10 26 24 12 24 -4 C24 -18 12 -26 4 -24 C2 -25 0 -26 -2 -26 Z", "url(#hta-heart)")}
      ${htFill("M-22 -14 C-14 -20 6 -22 20 -14 C14 -10 -10 -8 -22 -14 Z", "#ecd9ab", { opacity: .5 })}
      ${htLine("M2 -16 C0 -4 -2 10 2 30 M2 -6 C-8 -2 -14 4 -18 8 M4 6 C10 8 14 12 16 18 M-6 -12 C-10 -8 -12 -4 -12 0", "#4a0a0e", 1.6, .75)}
      ${htShine("M-19 -8 C-17 -16 -9 -20 -3 -19")}<circle cx="12" cy="-10" r="1.4" fill="#fff" opacity=".4" />` },
  tail: { draw: () => { const d = "M-7 -34 C-8 -18 -14 -4 -12 10 C-10 24 4 32 16 28 C24 25 26 16 20 12 C14 18 4 18 0 8 C-4 -2 4 -18 7 -34 Z";
      return html`${htFill(d, "url(#hta-pelt)")}${htFur(d)}${htRound(d)}
        ${htFill("M16 28 C22 34 30 37 35 32 C31 31 31 27 27 23 C31 22 33 18 31 13 C27 16 23 14 20 12 C22 18 20 24 16 28 Z", "#2a1d14")}${htFur("M16 28 C22 34 30 37 35 32 C31 31 31 27 27 23 C31 22 33 18 31 13 C27 16 23 14 20 12 C22 18 20 24 16 28 Z", .7)}
        <ellipse cy="-34" rx="7" ry="2.6" fill="#8a2a26" /><ellipse cy="-34" rx="4.6" ry="1.6" fill="#b44a40" /><circle cy="-34" r="1.5" fill="#efe4c8" />`; } },
  bone: { draw: () => { const d = "M-12 -34 C-16 -38 -10 -43 -6 -38 C-4 -41 2 -42 4 -38 C8 -41 15 -37 10 -31 C8 -28 5 -26 5 -22 L4 20 C4 24 8 26 10 29 C14 34 8 41 4 36 C2 40 -4 41 -6 36 C-10 40 -17 34 -12 30 C-9 27 -6 25 -5 20 L-4 -22 C-4 -26 -9 -29 -12 -34 Z";
      return html`${htFill(d, "url(#hta-ivory)")}${htRound(d)}
        ${htLine("M-1 -14 l1 5 l-1.4 4 M2 8 l-1 4", "#7a6a50", .8, .6)}<ellipse cx="1" cy="-4" rx=".9" ry="1.6" fill="#6a5a40" opacity=".6" />
        ${htShine("M-2 -30 C-2 -10 -2 10 -1 30")}${htFill("M-8 30 C-4 28 2 28 6 31 C2 33 -4 33 -8 30 Z", "#a0303a", { opacity: .35 })}`; } },
  head: { draw: () => html`${htFill("M-12 -22 C-24 -27 -35 -21 -39 -6 C-33 -14 -25 -18 -14 -14 Z", "url(#hta-horn)")}${htFill("M12 -22 C24 -27 35 -21 39 -6 C33 -14 25 -18 14 -14 Z", "url(#hta-horn)")}
      ${htLine("M-18 -22 C-19 -20 -19 -17 -18 -16 M-26 -21 C-27 -18 -26 -15 -25 -14 M18 -22 C19 -20 19 -17 18 -16 M26 -21 C27 -18 26 -15 25 -14", "#4a3826", 1, .5)}
      ${htFill("M-16 -30 C-6 -38 6 -38 16 -30 C22 -22 22 -10 18 -2 C16 4 14 8 12 12 C10 22 6 32 0 36 C-6 32 -10 22 -12 12 C-14 8 -16 4 -18 -2 C-22 -10 -22 -22 -16 -30 Z", "url(#hta-skull)")}
      ${htFill("M-15 -14 C-12 -20 -6 -18 -5 -12 C-5 -6 -11 -4 -14 -8 Z", "#1a110a")}${htFill("M15 -14 C12 -20 6 -18 5 -12 C5 -6 11 -4 14 -8 Z", "#1a110a")}
      <circle cx="-9.5" cy="-11" r="1.6" fill="#e8b04a" opacity=".7" /><circle cx="9.5" cy="-11" r="1.6" fill="#e8b04a" opacity=".7" />
      ${htFill("M-3 6 C-2 2 2 2 3 6 L1 15 H-1 Z", "#1a110a")}
      ${htFill("M-8 21 L-7 27 L-5 22 L-3 28 L-1 22 L1 28 L3 22 L5 27 L7 21 C3 22 -3 22 -8 21 Z", "#efe4c8", { stroke: "#6a5a40", "stroke-width": .6 })}
      ${htLine("M0 -36 C-2 -30 2 -26 0 -20 M-12 -28 C-8 -26 -6 -24 -6 -21", "#7a6646", .8, .6)}${htShine("M-12 -30 C-6 -35 4 -35 10 -32")}` },
  spike: { draw: () => { const d = "M-11 -31 C-9 -10 -4 14 2 38 C6 12 10 -10 11 -31 C4 -28 -4 -28 -11 -31 Z";
      return html`${htFill(d, "url(#hta-spike)")}${htRound(d)}
        ${htLine("M-2 -27 C-1 -6 0 16 2 34 M-6 -26 C-5 -12 -3 4 -1 18 M4 -27 C4 -12 3 4 2 18", "#2a2018", .9, .45)}${htShine("M-6 -24 C-5 -4 -2 14 1 30")}
        ${htFill("M-16 -32 C-10 -39 10 -39 16 -32 C10 -27 -10 -27 -16 -32 Z", "url(#hta-pelt)")}${htFur("M-16 -32 C-10 -39 10 -39 16 -32 C10 -27 -10 -27 -16 -32 Z")}
        ${htFill("M-10 -30 C-4 -32 4 -32 10 -30 C6 -28 -6 -28 -10 -30 Z", "#8a2a26", { opacity: .7 })}`; } },
  tongue: { draw: () => { const d = "M-8 -34 C-10 -20 -13 -2 -13 16 C-13 30 -7 38 0 38 C7 38 13 30 13 16 C13 -2 10 -20 8 -34 Z";
      return html`${htFill(d, "url(#hta-tongue)")}${htFill("M-12 18 C-12 30 -6 37 0 37 C6 37 12 30 12 18 C6 24 -6 24 -12 18 Z", "#e8a0a6", { opacity: .35 })}
        ${htLine("M0 -30 C-1 -10 -1 10 0 30", "#5a1418", 1.3, .6)}
        ${[[-5, -24], [4, -20], [-6, -10], [5, -6], [-5, 4], [5, 10], [-3, 18]].map(([x, y], i) => html`<circle key=${i} cx=${x} cy=${y} r=".9" fill="#f4b4b8" opacity=".55" />`)}
        ${htShine("M-6 -28 C-8 -10 -8 8 -5 22")}<ellipse cy="-34" rx="9" ry="2.6" fill="#5a1418" />`; } },
  ear: { draw: () => { const d = "M-10 -34 C-22 -30 -30 -16 -26 0 C-22 14 -8 28 4 38 C10 24 24 8 24 -8 C24 -24 14 -32 6 -34 C0 -36 -6 -36 -10 -34 Z";
      return html`${htFill(d, "url(#hta-leather)")}${htFur(d, .6)}
        ${htFill("M-7 -28 C-17 -24 -22 -12 -19 0 C-16 11 -6 21 3 29 C8 18 18 6 18 -7 C18 -20 10 -27 4 -28 C0 -29 -4 -29 -7 -28 Z", "url(#hta-earin)")}
        ${htLine("M0 -24 C-2 -10 0 6 3 22 M-9 -18 C-12 -8 -10 2 -5 10 M9 -18 C12 -8 10 2 7 10", "#5a2a20", .8, .5)}
        ${htLine("M-8 -26 C-16 -20 -18 -8 -14 2", "#f0c0b0", .8, .35)}
        ${htFill("M17 4 L24 -1 L21 9 Z", "#1a0e08")}${htFill("M-23 6 L-28 4 L-24 11 Z", "#1a0e08")}
        <ellipse cx="-2" cy="-34" rx="9" ry="2.8" fill="#3a1e14" /><ellipse cx="-2" cy="-34.4" rx="6" ry="1.5" fill="#8a3a30" />`; } },
  other: { draw: () => { const d = "M-18 -26 C-6 -32 12 -30 20 -22 C28 -8 24 18 12 30 C2 36 -14 32 -22 20 C-30 6 -28 -16 -18 -26 Z";
      return html`${htFill(d, "url(#hta-stone)")}
        ${htLine("M-7 -12 L7 12 M7 -12 L-7 12 M0 -17 V17", "#2a2622", 3, .6)}${htLine("M-7 -12 L7 12 M7 -12 L-7 12 M0 -17 V17", "#f0b850", 1.6, .85)}
        ${htLine("M-17 -24 C-6 -20 8 -20 19 -21 M-15 -28 C-4 -24 8 -24 17 -26", "#2a1a0c", 2, .9)}${htLine("M0 -38 L-2 -26 M0 -38 L3 -26", "#2a1a0c", 1.8, .9)}
        ${htShine("M-16 -16 C-20 -6 -20 6 -15 14")}`; } },
};
const huntArt = k => HUNT_ART[k] || HUNT_ART.other;

/* ---------- merged parts: where they go and how they're sewn on ----------
   In order: on top, the left side, the right side, then across the front. Each slot is
   [x, y, a, cx, cy, w, t]: the edge point a part is sewn on at and the way it points (0 hangs down, 90 points left,
   −90 right, 180 up); the spot on the middle (cx, cy) where something is set in, wrapped round or laid across; the
   part's width there and its tilt. */
const HUNT_SLOTS = {
  horn:   [[2, -30, -160, 0, -24, 26, 0], [-13, -8, 72, -2, -8, 23, 3], [11, 4, -72, -3, 4, 21, 6], [-6, 10, 25, -6, 12, 18, 12]],
  fang:   [[3, -32, -160, 0, -27, 21, 0], [-9, -8, 72, 0, -9, 17, 0], [8, 6, -72, 0, 4, 14, 0], [0, 8, 20, 0, 10, 12, 0]],
  claw:   [[2, -36, -160, -3, -24, 19, -4], [-12, -6, 72, -6, -8, 15, -8], [2, 4, -72, -3, 8, 12, -14], [2, 14, 30, 3, 20, 9, -30]],
  eye:    [[10, -14, -150, 9, -9, 12, 0], [-21, 4, 80, -12, 9, 12, 0], [21, 4, -80, 12, 9, 12, 0], [0, 25, 0, 0, 17, 14, 0]],
  hide:   [[0, -30, 180, 0, -16, 40, 0], [-30, 0, 80, -14, 4, 30, 0], [30, 2, -80, 14, 6, 30, 0], [0, 32, 0, 0, 20, 40, 0]],
  heart:  [[10, -28, -150, 0, -17, 30, 0], [-25, -2, 75, -12, -2, 24, 0], [23, -2, -75, 10, 0, 24, 0], [0, 20, -30, 0, 8, 30, 0]],
  tail:   [[6, -32, -160, 0, -28, 14, 0], [-13, -8, 75, -7, -10, 14, -8], [1, -2, -75, -6, 0, 13, -6], [18, 22, -40, 6, 22, 12, -60]],
  bone:   [[6, -38, -160, 0, -30, 20, 0], [-4, -8, 78, 0, -8, 11, 0], [5, 6, -78, 0, 8, 11, 0], [0, 0, 40, 0, 0, 11, 0]],
  head:   [[0, -34, 180, 0, -26, 24, 0], [-19, -8, 80, -11, 4, 14, 0], [19, -8, -80, 11, 4, 14, 0], [0, 34, 0, 0, 0, 24, 0]],
  spike:  [[4, -36, -160, 0, -27, 22, 0], [-9, -8, 72, -1, -8, 16, 0], [7, 6, -72, 0, 6, 12, 0], [1, 14, 25, 1, 14, 8, 0]],
  tongue: [[3, -34, -160, 0, -26, 18, 0], [-13, 4, 78, 0, 0, 25, 0], [13, 8, -78, 0, 10, 26, 0], [0, 18, 30, 0, 20, 24, 0]],
  ear:    [[6, -35, -160, -2, -24, 26, 0], [-26, -4, 78, -6, -6, 36, 0], [24, -6, -78, 6, -4, 36, 0], [4, 30, -20, 0, 12, 26, 0]],
  other:  [[6, -30, -160, 0, -20, 36, 0], [-26, 0, 78, -12, 0, 30, 0], [24, 2, -78, 12, 2, 30, 0], [2, 32, 0, 0, 14, 40, 0]],
};
// Where a part goes because that's where it belongs: a skull takes eyes in its sockets, a tongue in its mouth, fangs in
// its jaw, horns and ears on its crown, a spike as a crest, bones crossed behind it and a hide as a cowl; an eye takes a
// hide as a hood. These don't use up a slot.
const HUNT_SPOTS = {
  head: {
    eye: [{ x: -9.5, y: -11, st: "socket" }, { x: 9.5, y: -11, st: "socket" }, { cx: 0, cy: -24, st: "set" }],
    tongue: [{ x: 0, y: 23, st: "mouth" }],
    fang: [{ x: -5, y: 21, a: 10, st: "tusk" }, { x: 5, y: 21, a: -10, st: "tusk" }],
    horn: [{ x: -10, y: -29, a: 145, st: "pin", s: .52 }, { x: 10, y: -29, a: -145, st: "pin", s: .52 }],
    ear: [{ x: -17, y: -22, a: 120, st: "pin", s: .42 }, { x: 17, y: -22, a: -120, st: "pin", s: .42 }],
    spike: [{ x: 0, y: -33, a: 180, st: "pin", s: .5 }],
    bone: [{ a: 45, st: "crossbones" }, { a: -45, st: "crossbones" }],
    hide: [{ st: "cowl" }],
  },
  eye: { hide: [{ st: "hood" }] },
};
const HUNT_SLENDER = new Set(["horn", "fang", "claw", "tail", "bone", "spike", "tongue"]);
const HUNT_SHARP = new Set(["horn", "fang", "claw", "spike", "bone"]);
// How a part is sewn on in a plain slot: an eye is set in; hide wraps round a slender part (claw, horn, bone…) or is
// patched onto a broad one; anything laid on a hide is sewn flat onto it; sharp things pierce a heart; on a slender part
// the fourth goes strapped across the front; everything else is sewn on at the edge, sticking out.
function huntStyle(base, k, si) {
  if (k === "eye") return "set";
  if (k === "hide") return HUNT_SLENDER.has(base) || base === "other" ? "wrap" : "patch";
  if (base === "hide") return "onto";
  if (base === "heart" && HUNT_SHARP.has(k) && si > 0) return "pierce";
  if (si === 3 && HUNT_SLENDER.has(base) && k !== "heart" && k !== "tongue") return "strap";
  return "pin";
}
function huntPlace(base, attached) {
  const slots = HUNT_SLOTS[base] || HUNT_SLOTS.other, spots = HUNT_SPOTS[base] || {}, free = [0, 1, 2, 3], used = {}, out = [];
  (attached || []).slice(0, HUNT_SHOW).forEach((k, i) => {
    const sp = spots[k], n = used[k] || 0;
    if (sp && n < sp.length) { used[k] = n + 1; out.push(Object.assign({ k, i, si: -1 }, sp[n])); return; }
    const si = free.shift(); if (si === undefined) return;
    const [x, y, a, cx, cy, w, t] = slots[si];
    out.push({ k, i, si, x, y, a, cx, cy, w, t, st: huntStyle(base, k, si), small: HUNT_SLENDER.has(base) });
  });
  return out;
}

// sinew stitches: a dark hole-line under a pale thread
const htStitch = d => html`<path d=${d} fill="none" stroke="#140b06" stroke-width="2.3" stroke-linecap="round" opacity=".65" /><path d=${d} fill="none" stroke="#e3cf9f" stroke-width="1" stroke-linecap="round" />`;
const htX = (n, w, y = 0, h = 5) => Array.from({ length: n }, (_, i) => { const x = -w / 2 + (i + .5) * w / n;
  return `M${x - 2} ${y - h / 2}L${x + 2} ${y + h / 2}M${x + 2} ${y - h / 2}L${x - 2} ${y + h / 2}`; }).join("");
const htAt = (key, x, y, r, kids) => html`<g key=${key} transform=${`translate(${x} ${y}) rotate(${r || 0})`}>${kids}</g>`;
const htCage = () => html`<path d="M-26 -6 C-10 -1 10 -1 24 -4 M-20 14 C-6 19 8 19 19 10 M0 -26 C-5 0 -5 20 2 36 M-14 -24 C-22 -2 -14 18 0 32 M14 -22 C22 -2 16 16 4 32" fill="none" stroke="url(#hta-brass)" stroke-width="2.4" />`;
const HT_BLOB = "M-10 -6 C-6 -10 2 -9 7 -8 C11 -6 11 -1 10 3 C11 7 7 10 2 9 C-3 10 -8 9 -10 5 C-12 1 -11 -3 -10 -6 Z";

function htMount(p) {
  const D = () => huntArt(p.k).draw(), key = "m" + p.i;
  switch (p.st) {
    case "pin": return htAt(key, p.x, p.y, p.a, html`<g transform=${`scale(${p.s || .46}) translate(0 36)`}>${D()}${p.k === "heart" && htCage()}</g>`);
    case "strap": return htAt(key, p.cx, p.cy, p.a, html`<g transform="scale(.42)">${D()}</g>${htStitch(htX(2, 10, -9, 4))}${htStitch(htX(2, 10, 9, 4))}`);
    case "pierce": return html`<g key=${key}>${htAt("p", p.cx, p.cy, [0, -40, 40, -15][p.si], html`<g transform="scale(.5)">${D()}</g>`)}
      ${htAt("d", p.cx + 2, p.cy + 3, 0, html`<path d="M-2.4 0 C-3.4 4 -1 9 0 11 C1 9 3.4 4 2.4 0 Z" fill="#5e080c" opacity=".85" /><circle r="3.4" fill="#4a0508" opacity=".55" />`)}</g>`;
    case "onto": return htAt(key, p.cx, p.cy, [-60, 30, -30, 90][p.si], html`<g transform="scale(.5)">${D()}</g>${htStitch(htX(2, 10, -9, 4))}${htStitch(htX(2, 10, 8, 4))}`);
    case "set": return htAt(key, p.cx, p.cy, 0, html`<g transform=${p.small ? "scale(.82)" : ""}><circle r="9.6" fill="#140b06" /><g transform="scale(.36) translate(0 -4)">${HUNT_ART.eye.draw(true)}</g>
      <circle r="9" fill="none" stroke="url(#hta-brass)" stroke-width="2.4" /><circle r="10.2" fill="none" stroke="#2a1608" stroke-width=".6" opacity=".7" />
      ${htStitch(Array.from({ length: 8 }, (_, j) => { const a = j * Math.PI / 4, c = Math.cos(a), s = Math.sin(a); return `M${(c * 10.6).toFixed(1)} ${(s * 10.6).toFixed(1)}L${(c * 13.4).toFixed(1)} ${(s * 13.4).toFixed(1)}`; }).join(""))}</g>`);
    case "socket": return htAt(key, p.x, p.y, 0, html`<circle r="7" fill="#0a0503" /><circle r="9" fill="#e8b04a" opacity=".12" /><g transform="scale(.3) translate(0 -4)">${HUNT_ART.eye.draw(true)}</g>
      <circle r="7" fill="none" stroke="#140b06" stroke-width="1.4" opacity=".8" />`);
    case "mouth": return htAt(key, p.x, p.y, 0, html`<g transform="scale(.48) translate(0 36)">${D()}</g>${htStitch(htX(2, 8, 2, 4))}`);
    case "tusk": return htAt(key, p.x, p.y, p.a, html`<g transform="scale(.36) translate(0 36)">${D()}</g>`);
    case "crossbones": return htAt(key, 0, 4, p.a, html`<g transform="scale(.8)">${D()}</g>`);
    case "wrap": {   // a sleeve of hide wrapped round the part: stitched top edge, ragged fur hem, laced up the front
      const w = p.w + 7, h = p.si === 0 ? 22 : 16, x0 = -w / 2, x1 = w / 2, y0 = -h / 2, y1 = h / 2, n = Math.max(4, Math.round(w / 4));
      const hem = Array.from({ length: n + 1 }, (_, j) => `L${(x1 - j * w / n).toFixed(1)} ${(y1 + (j % 2 ? 3.2 : 0)).toFixed(1)}`).join("");
      const d = `M${x0} ${y0 + 1.5} Q${x0} ${y0} ${x0 + 2} ${y0} L${x1 - 2} ${y0} Q${x1} ${y0} ${x1} ${y0 + 1.5} L${x1} ${y1} ${hem} Z`;
      const lace = Array.from({ length: Math.round(h / 6) }, (_, j) => { const y = y0 + 3 + j * 6; return `M-3 ${y}L3 ${y + 4}M3 ${y}L-3 ${y + 4}`; }).join("");
      return htAt(key, p.cx, p.cy + (p.si === 0 ? 3 : 0), p.t, html`${htFill(d, "url(#hta-pelt)")}${htFur(d)}${htFill(d, "url(#hta-round)", { opacity: .7 })}
        ${htLine(`M${x0 + 1} ${y0 + 2.2}H${x1 - 1}`, "#e3cf9f", .8, .7)}<path d=${`M${x0 + 2} ${y0 + 2.2}H${x1 - 2}`} stroke="#140b06" stroke-width=".9" stroke-dasharray="1.4 2.2" opacity=".6" />
        ${htLine(`M0 ${y0 + 1}V${y1}`, "#140b06", 1.6, .55)}${htStitch(lace)}
        ${htLine(`M2 ${y1 - 1} C4 ${y1 + 4} 1 ${y1 + 8} 4 ${y1 + 12} M-1 ${y1 - 1} C-3 ${y1 + 4} 0 ${y1 + 8} -3 ${y1 + 11}`, "#2a1a0c", 1.3, .95)}`); }
    case "patch": { const z = Math.max(.6, Math.min(1.15, p.w * .032));
      return htAt(key, p.cx, p.cy, p.si === 1 ? -14 : p.si === 2 ? 16 : 6, html`<g transform=${`scale(${z})`}>
        <path d=${HT_BLOB} fill="url(#hta-pelt)" /><path d=${HT_BLOB} fill="url(#hta-fur)" /><path d=${HT_BLOB} fill="none" stroke="#1a0f08" stroke-width=".8" opacity=".7" />
        <path d=${HT_BLOB} transform="scale(.8)" fill="none" stroke="#e3cf9f" stroke-width=".9" stroke-dasharray="1.6 1.8" /></g>`); }
    case "hood": { const d = "M-25 4 C-26 -12 -14 -22 0 -22 C14 -22 26 -12 25 4 C17 -3 8 -5 0 -5 C-8 -5 -17 -3 -25 4 Z";
      return html`<g key=${key}>${htFill(d, "url(#hta-pelt)")}${htFur(d)}${htFill(d, "url(#hta-round)", { opacity: .5 })}
        ${htStitch("M-22 1 C-15 -4 -7 -6 0 -6 C7 -6 15 -4 22 1")}${htLine("M-12 -20 C-6 -24 6 -24 12 -20", "#e8d0b0", 1, .25)}</g>`; }
    case "cowl": { const d = "M-21 -24 C-16 -39 16 -39 21 -24 C24 -16 23 -8 21 -3 C17 -15 10 -22 0 -23 C-10 -22 -17 -15 -21 -3 C-23 -8 -24 -16 -21 -24 Z";
      return html`<g key=${key}>${htFill(d, "url(#hta-pelt)")}${htFur(d)}${htFill(d, "url(#hta-round)", { opacity: .45 })}${htStitch("M-19 -6 C-15 -15 -9 -20 0 -21 C9 -20 15 -15 19 -6")}</g>`; }
  }
  return null;
}
// the stitches over a join: a sewn-on part gets a seam across where it meets the trophy
function htSeam(p) {
  if (p.st === "pin") return htAt("s" + p.i, p.x, p.y, p.a, htStitch(htX(3, 12, 1, 5)));
  return null;
}
const HT_BEHIND = new Set(["pin", "crossbones"]);
const HT_LAYER = { cowl: 0, hood: 0, wrap: 0, patch: 0, onto: 1, strap: 1, pierce: 1, set: 2, socket: 2, mouth: 2, tusk: 2 };   // hide under, eyes and teeth over
// A trophy, drawn: its own part, and the parts merged into it (the first four), sewn on where they belong.
const HuntTrophyArt = ({ part, attached }) => {
  const P = huntPlace(part, attached);
  return html`<g filter="url(#hta-drop)">
    ${P.filter(p => HT_BEHIND.has(p.st)).map(htMount)}
    <g>${huntArt(part).draw()}</g>
    ${P.filter(p => !HT_BEHIND.has(p.st)).sort((a, b) => (HT_LAYER[a.st] || 0) - (HT_LAYER[b.st] || 0)).map(htMount)}
    ${P.map(htSeam)}
  </g>`;
};
// The trophy on a card, a chip or the form: its uploaded picture, or the drawing on a dark plaque.
const huntBox = t => ((t && t.attached) || []).length ? "-64 -64 128 128" : "-46 -46 92 92";
const HuntTrophy = ({ t, size = 48, cls = "" }) => { const src = huntSrc(t);
  return html`<span class=${"hart " + cls} style=${`--s:${size}px`}>${src ? html`<img src=${src} alt="" />`
    : html`<svg viewBox=${huntBox(t)} aria-hidden="true"><${HuntTrophyArt} part=${t.part} attached=${t.attached} /></svg>`}</span>`; };
