/* ================= Crafting → Hunting: the trophies drawn =================
   Every part you can carve is drawn as the real thing (a ridged horn, a slit-pupilled eye, a bloodied fang, a pelt…),
   in a box from −40 to 40 that hangs from its top (0, −38). A merged trophy is its own part with the parts it took in
   attached at its sockets: an eye is set into it in a brass bezel, hide wraps round it as a stitched band, a heart hangs
   in a little brass cage, and anything else is lashed on with cord and a rivet. Up to three attachments.
   The gradients live once in HuntArtDefs (rendered by the Hunting bench), so every drawing on the page can use them. */

const HUNT_ATTACH_MAX = 3;
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

// One entry per part: how it's drawn, and its three sockets for merged parts.
// A socket: x, y on the edge (where a lashed part comes out), a (its angle: 0 hangs down, negative points right),
// c (the spot on the part's middle where an eye is set or hide wraps) and w (how wide the part is there).
const HUNT_ART = {
  horn: { sockets: [{ x: 11, y: -20, a: -70, c: [0, -20], w: 26 }, { x: -11, y: 2, a: 65, c: [-2, 2], w: 22 }, { x: -2, y: 22, a: -50, c: [-9, 21], w: 13 }],
    draw: () => { const d = "M-13 -32 C-15 -8 -8 16 -20 38 C0 24 14 0 13 -32 Z";
      return html`${htFill(d, "url(#hta-horn)")}${htRound(d)}
        ${htLine("M-13.5 -20 C-4 -16 6 -16 13 -20 M-13.4 -8 C-5 -4 5 -4 12.4 -8 M-12.6 4 C-5 7 3 7 10.6 3 M-11.6 15 C-6 17 -1 16 5 12 M-12.6 25 C-9 26 -5 25 -2 23", "#4a3826", 1.3, .55)}
        ${htShine("M7 -29 C8 -8 2 12 -12 31")}
        <ellipse cy="-32" rx="13" ry="4" fill="#5e4a33" /><ellipse cy="-32.4" rx="9" ry="2.5" fill="#c9b48a" />
        ${htLine("M-14 -31 l2 3 l2 -2.4 l2 3 l2 -2.4 l2 3 l2 -2.4 l2 3 l2 -2.4 l2 3 l2 -2.4 l2 3 l2 -2.6", "#2e1f15", 2.2, .9)}`; } },
  fang: { sockets: [{ x: 9.5, y: -16, a: -75, c: [0, -14], w: 19 }, { x: -7, y: 4, a: 75, c: [0, 4], w: 14 }, { x: 3, y: 20, a: -55, c: [1, 18], w: 9 }],
    draw: () => { const d = "M-10 -34 C-11 -16 -7 8 0 36 C6 8 10 -16 10 -34 Z";
      return html`${htFill(d, "url(#hta-ivory)")}${htRound(d)}
        ${htFill("M-10 -34 C-10 -28 -10 -24 -9.6 -20 C-3 -23 3 -23 9.6 -20 C10 -24 10 -28 10 -34 Z", "#8a5236", { opacity: .8 })}
        ${htLine("M-9.6 -20 C-3 -23 3 -23 9.6 -20", "#4a1c10", 1.4, .7)}${htFill("M-6 -20 C-6 -16 -4 -13 -5 -10 C-3 -12 -3 -16 -2 -19 Z", "#7a2416", { opacity: .55 })}
        ${htLine("M3 -12 l-1.6 7 l1.8 6 l-1 5", "#6a5a40", .9, .7)}${htShine("M-5 -16 C-5 2 -2 18 0 30")}
        <ellipse cy="-34" rx="10" ry="3" fill="#6a3a24" />`; } },
  claw: { sockets: [{ x: 6.5, y: -20, a: -80, c: [-3, -18], w: 18 }, { x: -9, y: 2, a: 70, c: [-2, 2], w: 14 }, { x: 8, y: 20, a: -45, c: [6, 22], w: 8 }],
    draw: () => { const d = "M-12 -32 C-15 -12 -8 12 12 36 C10 30 4 14 2 0 C1 -14 6 -26 8 -32 Z";
      return html`${htFill(d, "url(#hta-claw)")}
        ${htLine("M-6 -26 C-7 -6 -2 12 8 30 M-1 -28 C-2 -10 1 6 6 20", "#9a8a78", .9, .4)}${htShine("M-9 -24 C-10 -6 -4 12 8 30")}
        ${htFill("M-15 -32 C-15 -40 11 -40 11 -32 C11 -27 -15 -27 -15 -32 Z", "url(#hta-pelt)")}${htFur("M-15 -32 C-15 -40 11 -40 11 -32 C11 -27 -15 -27 -15 -32 Z")}
        ${htLine("M-14 -29 l1.5 4 l1.4 -3 l1.6 4 l1.4 -3.4 l1.6 4 l1.4 -3 l1.6 4 l1.4 -3.4 l1.6 4 l1.4 -3 l1.6 4 l1.4 -3.6 l1.6 3", "#2a1d14", 1.6, .9)}`; } },
  eye: { sockets: [{ x: -19, y: -6, a: 70, c: [-12, 16], w: 12 }, { x: 19, y: -6, a: -70, c: [12, 16], w: 12 }, { x: 0, y: 25, a: 0, c: [0, -9], w: 10 }],
    draw: (bare) => html`${!bare && html`<g key="stalk">${htFill("M-5 -38 C-6 -28 -9 -22 -7 -14 L7 -14 C9 -22 6 -28 5 -38 Z", "url(#hta-nerve)")}
        ${htLine("M-1 -36 C-2 -28 -2 -22 -1 -16", "#f0b0a0", .8, .5)}<ellipse cy="-38" rx="5" ry="1.8" fill="#4a0e12" /></g>`}
      <circle cy="4" r="22" fill="url(#hta-sclera)" />
      ${htLine("M-20 -2 C-14 0 -12 4 -8 4 M-18 14 C-13 12 -10 10 -7 9 M18 -6 C13 -3 11 0 8 1 M15 18 C11 14 9 12 7 10 M-5 -16 C-4 -10 -3 -8 -2 -6 M-14 -12 C-11 -9 -10 -7 -9 -4", "#a8242a", .9, .65)}
      <circle cy="4" r="12" fill="url(#hta-iris)" />${htLine("M0 -8 V-2 M-8 -4 L-4 0 M8 -4 L4 0 M-11 6 H-6 M11 6 H6 M-7 13 L-4 9 M7 13 L4 9", "#7a3a0a", .7, .5)}
      <circle cy="4" r="12" fill="none" stroke="#2a0e02" stroke-width="1.5" /><ellipse cy="4" rx="2.6" ry="10" fill="#0a0503" />
      <circle cy="4" r="22" fill="url(#hta-ballshade)" />
      <ellipse cx="-8" cy="-6" rx="6" ry="3.4" fill="#fff" opacity=".6" transform="rotate(-30 -8 -6)" /><circle cx="7" cy="14" r="1.6" fill="#fff" opacity=".35" />` },
  hide: { sockets: [{ x: -30, y: -6, a: 70, c: [0, -10], w: 52 }, { x: 31, y: 4, a: -70, c: [0, 8], w: 56 }, { x: -4, y: 31, a: 0, c: [0, 22], w: 46 }],
    draw: () => { const d = "M-30 -30 C-18 -35 -4 -32 8 -35 C18 -36 28 -32 32 -28 C27 -14 34 -2 30 10 C33 20 28 30 24 34 C10 30 -6 36 -18 32 C-26 34 -33 28 -30 20 C-35 8 -28 -6 -32 -18 C-34 -24 -32 -28 -30 -30 Z";
      return html`${htFill(d, "url(#hta-pelt)")}${htFur(d)}
        ${htFill("M24 34 C25 25 29 18 31 12 C25 19 18 25 12 32 Z", "url(#hta-skin)")}${htLine("M24 34 C25 25 29 18 31 12", "#5a3a24", 1, .6)}
        <path d="M-26 -25 C-15 -30 -2 -27 8 -30 C17 -31 25 -28 27 -25 C24 -12 29 -2 26 9 C28 18 24 26 21 29 M8 29 C-6 33 -16 29 -24 27 C-28 18 -30 6 -28 -6 C-30 -14 -29 -20 -26 -25" fill="none" stroke="#e2c393" stroke-opacity=".5" stroke-width="1" stroke-dasharray="3 3" />
        <circle cx="-13" cy="-25" r="2" fill="#140c07" /><circle cx="13" cy="-26" r="2" fill="#140c07" />
        ${htLine("M-13 -25 L0 -38 L13 -26", "#2a1a0c", 1.8, .95)}${htLine("M-13 -25 L0 -38 L13 -26", "#b98c56", .7, .7)}`; } },
  heart: { sockets: [{ x: -24, y: -4, a: 70, c: [-10, 2], w: 20 }, { x: 22, y: -2, a: -70, c: [8, 4], w: 22 }, { x: 4, y: 30, a: -20, c: [2, 18], w: 14 }],
    draw: () => html`${htFill("M-10 -26 C-11 -32 -10 -37 -7 -38 L-2 -38 C-3 -34 -3 -30 -2 -24 Z", "url(#hta-vessel)")}
      ${htFill("M2 -24 C2 -30 4 -34 9 -36 C12 -35 12 -32 9 -30 C7 -28 7 -26 7 -22 Z", "url(#hta-vessel)")}
      ${htFill("M-15 -18 C-20 -22 -22 -26 -20 -29 L-16 -28 C-16 -25 -14 -22 -11 -20 Z", "#7a2a40")}
      <ellipse cx="-4.5" cy="-38" rx="2.6" ry="1.2" fill="#3a0608" />
      ${htFill("M-2 -26 C-14 -28 -26 -20 -26 -6 C-26 10 -14 24 2 36 C10 26 24 12 24 -4 C24 -18 12 -26 4 -24 C2 -25 0 -26 -2 -26 Z", "url(#hta-heart)")}
      ${htFill("M-22 -14 C-14 -20 6 -22 20 -14 C14 -10 -10 -8 -22 -14 Z", "#ecd9ab", { opacity: .5 })}
      ${htLine("M2 -16 C0 -4 -2 10 2 30 M2 -6 C-8 -2 -14 4 -18 8 M4 6 C10 8 14 12 16 18 M-6 -12 C-10 -8 -12 -4 -12 0", "#4a0a0e", 1.6, .75)}
      ${htShine("M-19 -8 C-17 -16 -9 -20 -3 -19")}<circle cx="12" cy="-10" r="1.4" fill="#fff" opacity=".4" />` },
  tail: { sockets: [{ x: -10, y: -16, a: 70, c: [-4, -18], w: 13 }, { x: -12, y: 6, a: 65, c: [-6, 6], w: 14 }, { x: 22, y: 20, a: -40, c: [6, 22], w: 12 }],
    draw: () => { const d = "M-7 -34 C-8 -18 -14 -4 -12 10 C-10 24 4 32 16 28 C24 25 26 16 20 12 C14 18 4 18 0 8 C-4 -2 4 -18 7 -34 Z";
      return html`${htFill(d, "url(#hta-pelt)")}${htFur(d)}${htRound(d)}
        ${htFill("M16 28 C22 34 30 37 35 32 C31 31 31 27 27 23 C31 22 33 18 31 13 C27 16 23 14 20 12 C22 18 20 24 16 28 Z", "#2a1d14")}${htFur("M16 28 C22 34 30 37 35 32 C31 31 31 27 27 23 C31 22 33 18 31 13 C27 16 23 14 20 12 C22 18 20 24 16 28 Z", .7)}
        <ellipse cy="-34" rx="7" ry="2.6" fill="#8a2a26" /><ellipse cy="-34" rx="4.6" ry="1.6" fill="#b44a40" /><circle cy="-34" r="1.5" fill="#efe4c8" />`; } },
  bone: { sockets: [{ x: 5, y: -14, a: -80, c: [0, -14], w: 10 }, { x: -5, y: 2, a: 80, c: [0, 2], w: 10 }, { x: 5, y: 16, a: -80, c: [0, 16], w: 10 }],
    draw: () => { const d = "M-12 -34 C-16 -38 -10 -43 -6 -38 C-4 -41 2 -42 4 -38 C8 -41 15 -37 10 -31 C8 -28 5 -26 5 -22 L4 20 C4 24 8 26 10 29 C14 34 8 41 4 36 C2 40 -4 41 -6 36 C-10 40 -17 34 -12 30 C-9 27 -6 25 -5 20 L-4 -22 C-4 -26 -9 -29 -12 -34 Z";
      return html`${htFill(d, "url(#hta-ivory)")}${htRound(d)}
        ${htLine("M-1 -14 l1 5 l-1.4 4 M2 8 l-1 4", "#7a6a50", .8, .6)}<ellipse cx="1" cy="-4" rx=".9" ry="1.6" fill="#6a5a40" opacity=".6" />
        ${htShine("M-2 -30 C-2 -10 -2 10 -1 30")}${htFill("M-8 30 C-4 28 2 28 6 31 C2 33 -4 33 -8 30 Z", "#a0303a", { opacity: .35 })}`; } },
  head: { sockets: [{ x: 0, y: -31, a: 180, c: [0, -22], w: 22 }, { x: -18, y: 2, a: 70, c: [-9, -11], w: 14 }, { x: 18, y: 2, a: -70, c: [9, -11], w: 14 }],
    draw: () => html`${htFill("M-12 -22 C-24 -27 -35 -21 -39 -6 C-33 -14 -25 -18 -14 -14 Z", "url(#hta-horn)")}${htFill("M12 -22 C24 -27 35 -21 39 -6 C33 -14 25 -18 14 -14 Z", "url(#hta-horn)")}
      ${htLine("M-18 -22 C-19 -20 -19 -17 -18 -16 M-26 -21 C-27 -18 -26 -15 -25 -14 M18 -22 C19 -20 19 -17 18 -16 M26 -21 C27 -18 26 -15 25 -14", "#4a3826", 1, .5)}
      ${htFill("M-16 -30 C-6 -38 6 -38 16 -30 C22 -22 22 -10 18 -2 C16 4 14 8 12 12 C10 22 6 32 0 36 C-6 32 -10 22 -12 12 C-14 8 -16 4 -18 -2 C-22 -10 -22 -22 -16 -30 Z", "url(#hta-skull)")}
      ${htFill("M-15 -14 C-12 -20 -6 -18 -5 -12 C-5 -6 -11 -4 -14 -8 Z", "#1a110a")}${htFill("M15 -14 C12 -20 6 -18 5 -12 C5 -6 11 -4 14 -8 Z", "#1a110a")}
      <circle cx="-9.5" cy="-11" r="1.6" fill="#e8b04a" opacity=".7" /><circle cx="9.5" cy="-11" r="1.6" fill="#e8b04a" opacity=".7" />
      ${htFill("M-3 6 C-2 2 2 2 3 6 L1 15 H-1 Z", "#1a110a")}
      ${htFill("M-8 21 L-7 27 L-5 22 L-3 28 L-1 22 L1 28 L3 22 L5 27 L7 21 C3 22 -3 22 -8 21 Z", "#efe4c8", { stroke: "#6a5a40", "stroke-width": .6 })}
      ${htLine("M0 -36 C-2 -30 2 -26 0 -20 M-12 -28 C-8 -26 -6 -24 -6 -21", "#7a6646", .8, .6)}${htShine("M-12 -30 C-6 -35 4 -35 10 -32")}` },
  spike: { sockets: [{ x: 9, y: -18, a: -75, c: [0, -16], w: 17 }, { x: -7, y: 2, a: 75, c: [0, 2], w: 12 }, { x: 4, y: 18, a: -60, c: [1, 18], w: 7 }],
    draw: () => { const d = "M-11 -31 C-9 -10 -4 14 2 38 C6 12 10 -10 11 -31 C4 -28 -4 -28 -11 -31 Z";
      return html`${htFill(d, "url(#hta-spike)")}${htRound(d)}
        ${htLine("M-2 -27 C-1 -6 0 16 2 34 M-6 -26 C-5 -12 -3 4 -1 18 M4 -27 C4 -12 3 4 2 18", "#2a2018", .9, .45)}${htShine("M-6 -24 C-5 -4 -2 14 1 30")}
        ${htFill("M-16 -32 C-10 -39 10 -39 16 -32 C10 -27 -10 -27 -16 -32 Z", "url(#hta-pelt)")}${htFur("M-16 -32 C-10 -39 10 -39 16 -32 C10 -27 -10 -27 -16 -32 Z")}
        ${htFill("M-10 -30 C-4 -32 4 -32 10 -30 C6 -28 -6 -28 -10 -30 Z", "#8a2a26", { opacity: .7 })}`; } },
  tongue: { sockets: [{ x: -10, y: -16, a: 75, c: [0, -16], w: 17 }, { x: 12, y: 2, a: -75, c: [0, 2], w: 22 }, { x: 0, y: 37, a: 0, c: [0, 20], w: 22 }],
    draw: () => { const d = "M-8 -34 C-10 -20 -13 -2 -13 16 C-13 30 -7 38 0 38 C7 38 13 30 13 16 C13 -2 10 -20 8 -34 Z";
      return html`${htFill(d, "url(#hta-tongue)")}${htFill("M-12 18 C-12 30 -6 37 0 37 C6 37 12 30 12 18 C6 24 -6 24 -12 18 Z", "#e8a0a6", { opacity: .35 })}
        ${htLine("M0 -30 C-1 -10 -1 10 0 30", "#5a1418", 1.3, .6)}
        ${[[-5, -24], [4, -20], [-6, -10], [5, -6], [-5, 4], [5, 10], [-3, 18]].map(([x, y], i) => html`<circle key=${i} cx=${x} cy=${y} r=".9" fill="#f4b4b8" opacity=".55" />`)}
        ${htShine("M-6 -28 C-8 -10 -8 8 -5 22")}<ellipse cy="-34" rx="9" ry="2.6" fill="#5a1418" />`; } },
  ear: { sockets: [{ x: -24, y: -12, a: 70, c: [-4, -16], w: 30 }, { x: 22, y: -2, a: -70, c: [0, -2], w: 30 }, { x: 10, y: 20, a: -55, c: [3, 18], w: 16 }],
    draw: () => { const d = "M-10 -34 C-22 -30 -30 -16 -26 0 C-22 14 -8 28 4 38 C10 24 24 8 24 -8 C24 -24 14 -32 6 -34 C0 -36 -6 -36 -10 -34 Z";
      return html`${htFill(d, "url(#hta-leather)")}${htFur(d, .6)}
        ${htFill("M-7 -28 C-17 -24 -22 -12 -19 0 C-16 11 -6 21 3 29 C8 18 18 6 18 -7 C18 -20 10 -27 4 -28 C0 -29 -4 -29 -7 -28 Z", "url(#hta-earin)")}
        ${htLine("M0 -24 C-2 -10 0 6 3 22 M-9 -18 C-12 -8 -10 2 -5 10 M9 -18 C12 -8 10 2 7 10", "#5a2a20", .8, .5)}
        ${htLine("M-8 -26 C-16 -20 -18 -8 -14 2", "#f0c0b0", .8, .35)}
        ${htFill("M17 4 L24 -1 L21 9 Z", "#1a0e08")}${htFill("M-23 6 L-28 4 L-24 11 Z", "#1a0e08")}
        <ellipse cx="-2" cy="-34" rx="9" ry="2.8" fill="#3a1e14" /><ellipse cx="-2" cy="-34.4" rx="6" ry="1.5" fill="#8a3a30" />`; } },
  other: { sockets: [{ x: -24, y: 0, a: 70, c: [-10, -4], w: 18 }, { x: 24, y: 2, a: -70, c: [10, 4], w: 18 }, { x: 4, y: 32, a: 0, c: [0, 16], w: 22 }],
    draw: () => { const d = "M-18 -26 C-6 -32 12 -30 20 -22 C28 -8 24 18 12 30 C2 36 -14 32 -22 20 C-30 6 -28 -16 -18 -26 Z";
      return html`${htFill(d, "url(#hta-stone)")}
        ${htLine("M-7 -12 L7 12 M7 -12 L-7 12 M0 -17 V17", "#2a2622", 3, .6)}${htLine("M-7 -12 L7 12 M7 -12 L-7 12 M0 -17 V17", "#f0b850", 1.6, .85)}
        ${htLine("M-17 -24 C-6 -20 8 -20 19 -21 M-15 -28 C-4 -24 8 -24 17 -26", "#2a1a0c", 2, .9)}${htLine("M0 -38 L-2 -26 M0 -38 L3 -26", "#2a1a0c", 1.8, .9)}
        ${htShine("M-16 -16 C-20 -6 -20 6 -15 14")}`; } },
};
const huntArt = k => HUNT_ART[k] || HUNT_ART.other;

// The way a merged part is fixed to the trophy, by the part it is.
function huntAttach(k, s, i) {
  if (k === "eye") return html`<g key=${"a" + i} transform=${`translate(${s.c[0]} ${s.c[1]})`}>
      <circle r="9.6" fill="#140b06" /><g transform="scale(.36) translate(0 -4)">${HUNT_ART.eye.draw(true)}</g>
      <circle r="9" fill="none" stroke="url(#hta-brass)" stroke-width="2.4" /><circle r="10.2" fill="none" stroke="#2a1608" stroke-width=".6" opacity=".7" />
      ${[0, 90, 180, 270].map(a => html`<path key=${a} d="M0 -11.6 l-1.6 -2.4 h3.2 Z" fill="url(#hta-brass)" transform=${`rotate(${a + 45})`} />`)}</g>`;
  if (k === "hide") { const w = s.w + 6;
    return html`<g key=${"a" + i} transform=${`translate(${s.c[0]} ${s.c[1]})`}>
      <rect x=${-w / 2} y="-5.5" width=${w} height="11" rx="3.5" fill="url(#hta-pelt)" /><rect x=${-w / 2} y="-5.5" width=${w} height="11" rx="3.5" fill="url(#hta-fur)" />
      <rect x=${-w / 2} y="-5.5" width=${w} height="11" rx="3.5" fill="url(#hta-round)" opacity=".7" />
      <path d=${`M${-w / 2 + 2} -3 H${w / 2 - 2} M${-w / 2 + 2} 3 H${w / 2 - 2}`} stroke="#e2c393" stroke-opacity=".6" stroke-width=".8" stroke-dasharray="2 2" />
      ${htLine(`M${w / 2 - 3} 0 C${w / 2 + 2} 4 ${w / 2 + 1} 9 ${w / 2 + 4} 13 M${w / 2 - 3} 0 C${w / 2 + 4} 2 ${w / 2 + 6} 6 ${w / 2 + 8} 9`, "#2a1a0c", 1.2, .9)}</g>`; }
  return null;   // lashed parts are drawn in two goes: behind the trophy, then the cord over the join (huntLashed)
}
const huntLashed = k => k !== "eye" && k !== "hide";
const HuntLashedPart = ({ k, s }) => html`<g transform=${`translate(${s.x} ${s.y}) rotate(${s.a})`}><g transform="scale(.46) translate(0 36)">${huntArt(k).draw()}
  ${k === "heart" && html`<path d="M-26 -6 C-10 -1 10 -1 24 -4 M-20 14 C-6 19 8 19 19 10 M0 -26 C-5 0 -5 20 2 36 M-14 -24 C-22 -2 -14 18 0 32 M14 -22 C22 -2 16 16 4 32" fill="none" stroke="url(#hta-brass)" stroke-width="2.4" />`}</g></g>`;
const HuntLashing = ({ s }) => html`<g transform=${`translate(${s.x} ${s.y}) rotate(${s.a})`}>
  <path d="M-5 -1 C-2 1 2 1 5 -1 M-5 2.2 C-2 4.2 2 4.2 5 2.2 M-5 5.4 C-2 7.4 2 7.4 5 5.4" fill="none" stroke="#2a1a0c" stroke-width="1.8" stroke-linecap="round" />
  <path d="M-5 -1 C-2 1 2 1 5 -1 M-5 2.2 C-2 4.2 2 4.2 5 2.2 M-5 5.4 C-2 7.4 2 7.4 5 5.4" fill="none" stroke="#b98c56" stroke-width=".6" stroke-linecap="round" opacity=".8" />
  <circle cy="-3.4" r="2" fill="url(#hta-brass)" /><circle cy="-3.4" r=".7" fill="#3a2408" /></g>`;

// A trophy, drawn: its own part, and the parts merged into it.
const HuntTrophyArt = ({ part, attached }) => {
  const A = huntArt(part), list = (attached || []).slice(0, HUNT_ATTACH_MAX), sk = i => A.sockets[i];
  return html`<g filter="url(#hta-drop)">
    ${list.map((k, i) => huntLashed(k) && html`<${HuntLashedPart} key=${"l" + i} k=${k} s=${sk(i)} />`)}
    <g>${A.draw()}</g>
    ${list.map((k, i) => huntLashed(k) ? html`<${HuntLashing} key=${"c" + i} s=${sk(i)} />` : huntAttach(k, sk(i), i))}
  </g>`;
};
// The trophy on a card, a chip or the form: its uploaded picture, or the drawing on a dark plaque.
const huntBox = t => ((t && t.attached) || []).length ? "-60 -60 120 120" : "-46 -46 92 92";
const HuntTrophy = ({ t, size = 48, cls = "" }) => { const src = huntSrc(t);
  return html`<span class=${"hart " + cls} style=${`--s:${size}px`}>${src ? html`<img src=${src} alt="" />`
    : html`<svg viewBox=${huntBox(t)} aria-hidden="true"><${HuntTrophyArt} part=${t.part} attached=${t.attached} /></svg>`}</span>`; };
