/* ================= living ivy (Mossheart theme only) =================
   Grows ivy along two corners of every section (alternating, like the CSS stand-in), sized to the section,
   with a few moss clumps and the odd stitched hide patch on the edges. Each leaf hangs on its stalk like a
   small spring: when the cursor (or a finger) passes nearby, leaves lean the way it moved, then settle back.
   It only exists while the Mossheart theme is on. Nothing animates unless the pointer moves; it stops while
   the tab is hidden, and holds still for anyone who asks their device for reduced motion. Without it, the
   theme's CSS vines (in app.css) are used instead. */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const IVY = "M0 0 C-3 -1 -8 0 -11 -4 C-9 -6 -8 -8 -8 -11 C-5 -10 -3 -12 -2 -16 C-1 -18 0 -20 0 -22 C0 -20 1 -18 2 -16 C3 -12 5 -10 8 -11 C8 -8 9 -6 11 -4 C8 0 3 -1 0 0Z";
  const VEINS = "M0 0 L0 -19 M0 -2 L-9 -5 M0 -2 L9 -5 M0 -6 L-5 -12 M0 -6 L5 -12";
  const PAD = 40, REACH = 110, MAX_LEAN = 10;
  let layer = null, leaves = [], active = new Set(), raf = 0, sig = "", timer = 0, mo = null;
  let px = -1e5, py = -1e5, vx = 0, vy = 0, lastT = 0;
  const still = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const on = () => document.documentElement.dataset.skin === "moss";
  // A small seeded random, so each section grows the same ivy every time it is drawn.
  const rng = seed => { let s = (seed * 2654435761) >>> 0 || 7; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  // A smooth path through points (Catmull-Rom turned into cubic Béziers).
  function smooth(p) {
    let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
      d += ` C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)} ${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)} ${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`;
    }
    return d;
  }
  function defs() {
    const s = el("svg", { width: 0, height: 0, "aria-hidden": "true", style: "position:absolute" });
    const d = el("defs", {}, s);
    const g = (id, stops, x2 = 1, y2 = 1) => { const lg = el("linearGradient", { id, x1: 0, y1: 0, x2, y2 }, d); stops.forEach(([o, c]) => el("stop", { offset: o, "stop-color": c }, lg)); };
    g("mh-lg", [[0, "#46683a"], [.55, "#2c4a22"], [1, "#1a2e15"]]);
    g("mh-lg2", [[0, "#3a5a2c"], [1, "#16260f"]]);
    g("mh-hide", [[0, "#6a4a2c"], [.5, "#4f3520"], [1, "#352314"]]);
    return s;
  }
  // Moss: many short strands around a centre, stretched along an edge, with a few stalked spore capsules.
  function moss(g, r, cx, cy, n, rx, ry, caps) {
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()), x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
      const t = a + (r() - .5) * 2, l = 1.5 + r() * 3.5;
      el("path", { d: `M${x.toFixed(1)} ${y.toFixed(1)} l${(Math.cos(t) * l).toFixed(1)} ${(Math.sin(t) * l).toFixed(1)}`,
        stroke: ["#2f4a22", "#3d5c2a", "#4f7034", "#26391c", "#5a7a3a"][Math.floor(r() * 5)], "stroke-width": (.7 + r() * .6).toFixed(1), "stroke-linecap": "round" }, g);
    }
    for (let i = 0; i < caps; i++) {
      const x = cx + (r() - .5) * rx * 1.4, y = cy + (r() - .5) * ry * .8, h = 6 + r() * 6, lean = (r() - .5) * 5;
      el("path", { d: `M${x.toFixed(1)} ${y.toFixed(1)} q${(lean / 2).toFixed(1)} ${(-h / 2).toFixed(1)} ${lean.toFixed(1)} ${(-h).toFixed(1)}`, stroke: "#6a5a32", "stroke-width": ".6", fill: "none" }, g);
      el("ellipse", { cx: (x + lean).toFixed(1), cy: (y - h - 1).toFixed(1), rx: "1", ry: "1.7", fill: "#8a7440", transform: `rotate(${(lean * 6).toFixed(0)} ${(x + lean).toFixed(1)} ${(y - h - 1).toFixed(1)})` }, g);
    }
  }
  // A stitched patch of hide, overlapping the section's edge.
  function hide(g, r, cx, cy, rot) {
    const w = 30 + r() * 12, h = 22 + r() * 8, j = () => (r() - .5) * 5;
    const pts = [[-w / 2 + j(), -h / 2 + j()], [w / 2 + j(), -h / 2 + j()], [w / 2 + j(), h / 2 + j()], [-w / 2 + j(), h / 2 + j()]];
    const pg = el("g", { transform: `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${rot.toFixed(1)})` }, g);
    el("path", { d: "M" + pts.map(p => p.map(v => v.toFixed(1)).join(" ")).join(" L") + "Z", fill: "url(#mh-hide)", stroke: "#24170c", "stroke-width": "1.2", "stroke-linejoin": "round" }, pg);
    el("path", { d: "M" + pts.map(p => p.map(v => (v * .78).toFixed(1)).join(" ")).join(" L") + "Z", fill: "none", stroke: "#cdb88a", "stroke-opacity": ".75", "stroke-width": ".9", "stroke-dasharray": "2.6 2.4" }, pg);
    el("path", { d: `M${(-w * .3).toFixed(1)} ${(-h * .1).toFixed(1)} q${(w * .2).toFixed(1)} -3 ${(w * .45).toFixed(1)} 2`, stroke: "#000", "stroke-opacity": ".25", "stroke-width": "1", fill: "none" }, pg);
  }
  // One corner's ivy, drawn in the corner's own frame of reference: x runs along the horizontal edge, y down the side.
  function corner(svg, r, cx, cy, sx, sy, lenX, lenY) {
    const g = el("g", { transform: `translate(${cx} ${cy}) scale(${sx} ${sy})` }, svg);
    const top = [], side = [];
    for (let x = 0; x <= lenX; x += 16) top.push([x, Math.sin(x / 37 + r() * .6) * 3 + (r() - .5) * 2]);
    for (let y = 0; y <= lenY; y += 16) side.push([Math.sin(y / 31 + r() * .6) * 3 + (r() - .5) * 2, y]);
    const stem = (p, w) => { const d = smooth(p);
      el("path", { d, stroke: "#211c12", "stroke-width": w, fill: "none", "stroke-linecap": "round" }, g);
      el("path", { d, stroke: "#5a5236", "stroke-opacity": ".5", "stroke-width": (w * .35).toFixed(1), fill: "none", "stroke-linecap": "round", transform: "translate(-.4 -.5)" }, g); };
    [top, side].forEach(p => { const a = Math.ceil(p.length * .4), b = Math.ceil(p.length * .75);
      stem(p.slice(0, a + 1), 4); stem(p.slice(a, b + 1), 2.8); stem(p.slice(b), 1.7); });
    // a thinner stem twining round the first part of each
    [[top, 0], [side, 1]].forEach(([p, axis]) => { const q = p.slice(0, Math.ceil(p.length * .6)).map(([x, y], i) => axis ? [x + Math.sin(i * 1.4) * 4, y] : [x, y + Math.sin(i * 1.4) * 4]);
      el("path", { d: smooth(q), stroke: "#2a2617", "stroke-width": "1.2", fill: "none" }, g); });
    // tendril curls at the tips
    const [tx, ty] = top[top.length - 1], [ux, uy] = side[side.length - 1];
    el("path", { d: `M${tx} ${ty} c6 -3 9 4 4 7 c-3 2 -5 -1 -3 -3`, stroke: "#46583a", "stroke-width": ".9", fill: "none" }, g);
    el("path", { d: `M${ux} ${uy} c-3 6 3 9 6 5 c1 -3 -1 -5 -3 -4`, stroke: "#46583a", "stroke-width": ".9", fill: "none" }, g);
    moss(g, r, 0, 0, 70, 13, 12, 3);
    // leaves, alternating sides, larger near the root
    const grow = (p, axis) => {
      for (let i = 1; i < p.length; i++) {
        if (r() < .18) continue;
        const [x, y] = p[i], t = i / p.length, side = i % 2 ? -1 : 1;
        const out = axis ? (side < 0 ? -90 : 90) : (side < 0 ? 0 : 180);           // pointing away from the stem
        const a = out + (axis ? (side < 0 ? 1 : -1) : side) * (15 + r() * 25) * (axis ? -1 : 1) + (r() - .5) * 20;
        const s = (1.15 - t * .5) * (.75 + r() * .4) * (side > 0 ? .82 : 1);
        const base = el("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a.toFixed(1)})` }, g);
        const sw = el("g", {}, base);
        el("path", { d: "M0 0 L0 -6", stroke: "#3a3a22", "stroke-width": "1.3" }, sw);
        const lg = el("g", { transform: `translate(0 -6) scale(${s.toFixed(2)})` }, sw);
        el("path", { d: IVY, fill: `url(#${r() < .5 ? "mh-lg" : "mh-lg2"})`, stroke: "#0f1a0c", "stroke-width": ".7" }, lg);
        el("path", { d: VEINS, stroke: "#7f9a5c", "stroke-opacity": ".55", "stroke-width": ".6", fill: "none" }, lg);
        leaves.push({ el: sw, lx: x, ly: y, a, sx, sy, cx, cy, svg, th: 0, om: 0 });
      }
    };
    grow(top, 0); grow(side, 1);
    // a few black ivy berries
    const [bx, by] = top[Math.floor(top.length * .55)];
    [[0, 6], [3, 9], [-2, 10], [2, 12]].forEach(([dx, dy]) => { el("circle", { cx: bx + dx, cy: by + dy, r: 2.3, fill: "#121218" }, g); el("circle", { cx: bx + dx - .7, cy: by + dy - .7, r: .6, fill: "#9aa0b0", "fill-opacity": ".5" }, g); });
  }
  // Sections in the order CSS counts them (nth-of-type among their siblings), so the corners alternate the same way.
  function nth(f) { let n = 1, s = f; while ((s = s.previousElementSibling)) if (s.tagName === f.tagName) n++; return n; }
  function layout() {
    timer = 0;
    if (!layer) return;
    const frames = [...document.querySelectorAll(".frame")].filter(f => f.offsetParent !== null);
    const rects = frames.map(f => f.getBoundingClientRect());
    const sx0 = scrollX, sy0 = scrollY;
    const key = rects.map(r => [r.left + sx0, r.top + sy0, r.width, r.height].map(Math.round).join(",")).join(";") + "|" + document.documentElement.clientWidth;
    if (key === sig) return;
    sig = key; leaves = []; active.clear();
    [...layer.querySelectorAll("svg.mh-ivy")].forEach(s => s.remove());
    // the layer covers the page (not more), so leaves past a section's edge never cause sideways scrolling
    const app = document.getElementById("app"), bottom = app ? app.getBoundingClientRect().bottom + sy0 + PAD : 0;
    layer.style.width = document.documentElement.clientWidth + "px"; layer.style.height = Math.max(0, bottom) + "px";
    frames.forEach((f, i) => {
      const r0 = rects[i], n = nth(f), r = rng(n * 97 + Math.round(r0.width / 40));
      const W = r0.width, H = r0.height, x0 = r0.left + sx0 - PAD, y0 = r0.top + sy0 - PAD;
      const svg = el("svg", { class: "mh-ivy", width: W + 2 * PAD, height: H + 2 * PAD, viewBox: `0 0 ${W + 2 * PAD} ${H + 2 * PAD}`, "aria-hidden": "true" });
      svg.style.left = x0 + "px"; svg.style.top = y0 + "px";
      svg._x = x0; svg._y = y0;
      const lenX = Math.max(140, Math.min(460, W * .42)), lenY = Math.max(100, Math.min(320, H * .55));
      const C = { tl: [PAD, PAD, 1, 1], tr: [W + PAD, PAD, -1, 1], br: [W + PAD, H + PAD, -1, -1], bl: [PAD, H + PAD, 1, -1] };
      const pair = n % 2 ? ["tl", "br"] : ["tr", "bl"];
      corner(svg, r, ...C[pair[0]], lenX, lenY);
      if (n % 3) corner(svg, r, ...C[pair[1]], lenX * .8, lenY * .8);
      // moss on an edge away from the ivy, and now and then a hide patch
      const g = el("g", {}, svg);
      const edgeY = pair[0] === "tl" ? H + PAD : PAD, mx = PAD + W * (.35 + r() * .3);
      moss(g, r, mx, edgeY, 90, 22 + r() * 14, 5, 4);
      if (H > 240) moss(g, r, pair[0] === "tl" ? W + PAD : PAD, PAD + H * (.3 + r() * .2), 55, 4, 16, 2);
      if (n % 3 === 1 && W > 300) hide(g, r, PAD + W * (.62 + r() * .2), pair[0] === "tl" ? H + PAD - 2 : PAD + 2, (r() - .5) * 16);
      layer.appendChild(svg);
    });
  }
  const queue = () => { if (!timer) timer = setTimeout(layout, 140); };
  // Sections slide in when a tab opens; measure again once anything inside the app finishes animating.
  const settle = e => { if (e.target && e.target.closest && e.target.closest("#app") && !e.target.closest(".mh-ivy-layer")) queue(); };
  // Leaves are springs: a nearby pointer pushes them the way it moved; they sway back and settle.
  function tick() {
    raf = 0;
    if (!layer || document.hidden) return;
    const now = performance.now(), moving = now - lastT < 80;
    if (moving) for (const L of leaves) {
      const x = L.svg._x + L.cx + L.sx * L.lx, y = L.svg._y + L.cy + L.sy * L.ly, d = Math.hypot(px - x, py - y);
      if (d < REACH) active.add(L);
    }
    for (const L of active) {
      const x = L.svg._x + L.cx + L.sx * L.lx, y = L.svg._y + L.cy + L.sy * L.ly, d = Math.hypot(px - x, py - y);
      if (moving && d < REACH) {
        const rad = (L.a * Math.PI) / 180, dx = L.sx * Math.sin(rad), dy = -L.sy * Math.cos(rad);   // the leaf's direction on the page
        const push = (dx * vy - dy * vx) * L.sx * L.sy, fall = (1 - d / REACH) ** 2;
        L.om += Math.max(-3, Math.min(3, push * .22)) * fall;
      }
      L.om += -.07 * L.th; L.om *= .86; L.th = Math.max(-MAX_LEAN, Math.min(MAX_LEAN, L.th + L.om));
      if (Math.abs(L.th) < .03 && Math.abs(L.om) < .03 && !(moving && d < REACH)) { L.th = 0; L.om = 0; active.delete(L); }
      L.el.setAttribute("transform", L.th ? `rotate(${L.th.toFixed(2)})` : "");
    }
    if (active.size || moving) raf = requestAnimationFrame(tick);
  }
  function move(e) {
    const now = performance.now(), dt = Math.max(8, now - lastT);
    const nx = e.pageX, ny = e.pageY;
    if (now - lastT < 200) { vx = ((nx - px) / dt) * 16; vy = ((ny - py) / dt) * 16; } else { vx = vy = 0; }
    px = nx; py = ny; lastT = now;
    if (!raf && !still() && !document.hidden) raf = requestAnimationFrame(tick);
  }
  function start() {
    if (layer) return;
    layer = document.createElement("div"); layer.className = "mh-ivy-layer"; layer.setAttribute("aria-hidden", "true");
    layer.appendChild(defs());
    document.body.appendChild(layer);
    document.documentElement.classList.add("has-ivy");
    sig = ""; layout();
    mo = new MutationObserver(queue); mo.observe(document.getElementById("app") || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "open"] });
    addEventListener("resize", queue); addEventListener("pointermove", move, { passive: true });
    document.addEventListener("animationend", settle, true); document.addEventListener("transitionend", settle, true);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
  }
  function stop() {
    if (!layer) return;
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (mo) mo.disconnect(); mo = null;
    removeEventListener("resize", queue); removeEventListener("pointermove", move);
    document.removeEventListener("animationend", settle, true); document.removeEventListener("transitionend", settle, true);
    layer.remove(); layer = null; leaves = []; active.clear(); sig = "";
    document.documentElement.classList.remove("has-ivy");
  }
  const sync = () => (on() && document.body ? start() : stop());
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ["data-skin"] });
  document.addEventListener("visibilitychange", () => { if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; } });
  if (document.body) sync(); else document.addEventListener("DOMContentLoaded", sync);
})();
