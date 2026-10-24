/* ================= the steppe (Talon Saga theme only) =================
   A living landscape of central Mongolia behind the sheet, drawn on a 2D canvas:
   - a wide sky with drifting clouds, and three ranges of mountains fading into haze;
   - vivid green steppe, a camp of gers (yurts) on the right with smoke rising;
   - on the left, an ovoo cairn hung with a blue khadag, a carved stele and a deer stone;
   - at random intervals a herd of horses gallops across the plain, kicking up dust,
     and now and then an eagle (the saga's talon) glides across the sky.
   The still scene is painted once per window size; only the clouds, smoke and animals are redrawn.
   It runs only while the Talon Saga theme is on, at up to 30 frames a second while animals are out
   and about 10 otherwise, pauses when the tab is hidden, and shows one still frame for reduced motion.
   Before it starts (or if canvas fails), the CSS gradient in app.css stands in. */
(function () {
  let cv = null, ctx = null, bg = null, fg = null, raf = 0, last = 0, W = 0, H = 0, dpr = 1;
  let clouds = [], herd = null, eagle = null, nextHerd = 0, nextEagle = 0, smoke = [];
  const still = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  // A seeded random generator, so the mountains and grass look the same on every visit.
  const seeded = s => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const HORIZON = 0.6;                                        // where the steppe meets the mountains (share of height)

  function ridge(g, seed, base, amp, color, haze, snow) {
    const r = seeded(seed), ph = [r() * 6, r() * 6, r() * 6, r() * 6];
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) {
      const u = x / W;
      const y = base - amp * (0.55 * Math.sin(u * 5.1 + ph[0]) + 0.3 * Math.sin(u * 11.7 + ph[1]) + 0.12 * Math.sin(u * 27 + ph[2]) + 0.06 * Math.sin(u * 61 + ph[3]) + 0.5);
      g.lineTo(x, y);
    }
    g.lineTo(W, H); g.closePath();
    const gr = g.createLinearGradient(0, base - amp * 1.4, 0, base + amp * 0.2);
    if (snow) { gr.addColorStop(0, color); gr.addColorStop(snow, color); gr.addColorStop(snow + 0.12, "#8ea6c2"); gr.addColorStop(1, haze); }
    else { gr.addColorStop(0, color); gr.addColorStop(1, haze); }
    g.fillStyle = gr; g.fill();
  }
  function ger(g, x, y, s) {                                  // a ger: white felt walls, a domed roof, an orange door
    g.save(); g.translate(x, y);
    g.fillStyle = "rgba(40,50,30,.18)"; g.beginPath(); g.ellipse(0, 0, s * 0.75, s * 0.12, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#f3efe4"; g.fillRect(-s * 0.6, -s * 0.42, s * 1.2, s * 0.42);
    g.beginPath(); g.moveTo(-s * 0.66, -s * 0.4); g.quadraticCurveTo(0, -s * 0.95, s * 0.66, -s * 0.4); g.closePath(); g.fill();
    g.strokeStyle = "rgba(90,70,50,.35)"; g.lineWidth = Math.max(1, s * 0.03);
    g.beginPath(); g.moveTo(-s * 0.6, -s * 0.3); g.lineTo(s * 0.6, -s * 0.3); g.stroke();       // the rope band
    g.fillStyle = "#c8662a"; g.fillRect(-s * 0.1, -s * 0.3, s * 0.2, s * 0.3);                    // the door
    g.fillStyle = "#b9b3a3"; g.beginPath(); g.ellipse(0, -s * 0.78, s * 0.12, s * 0.05, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  function ovoo(g, x, y, s) {                                 // a cairn of stones with a pole and a blue khadag scarf
    const r = seeded(71);
    g.fillStyle = "rgba(40,50,30,.22)"; g.beginPath(); g.ellipse(x, y + s * 0.04, s * 1.05, s * 0.16, 0, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 170; i++) {                          // stones piled into a dome, the back ones first
      const u = r() * 2 - 1, hgt = Math.sqrt(Math.max(0, 1 - u * u)) * s * 0.62;
      const px = x + u * s, py = y - r() * hgt;
      g.fillStyle = `hsl(${30 + r() * 15},${8 + r() * 12}%,${38 + r() * 25}%)`;
      g.beginPath(); g.ellipse(px, py, s * (0.07 + r() * 0.06), s * (0.05 + r() * 0.04), r() * 3, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = "#5a4630"; g.lineWidth = Math.max(1.5, s * 0.035); g.beginPath(); g.moveTo(x, y - s * 0.5); g.lineTo(x, y - s * 1.5); g.stroke();
    g.fillStyle = "#4a8fd8"; g.beginPath(); g.moveTo(x, y - s * 1.45); g.quadraticCurveTo(x + s * 0.35, y - s * 1.35, x + s * 0.5, y - s * 1.15);
    g.lineTo(x + s * 0.42, y - s * 1.1); g.quadraticCurveTo(x + s * 0.25, y - s * 1.28, x, y - s * 1.32); g.fill();
  }
  function stele(g, x, y, w, h) {                             // a carved stone stele: rounded top, a sun disc, vertical script, a scroll band
    const gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    gr.addColorStop(0, "#9a958a"); gr.addColorStop(0.5, "#bdb8ab"); gr.addColorStop(1, "#8a857a");
    g.fillStyle = "rgba(40,50,30,.22)"; g.beginPath(); g.ellipse(x + w * 0.2, y, w * 0.8, w * 0.12, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = gr; g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x - w / 2, y - h + w * 0.25);
    g.quadraticCurveTo(x - w / 2, y - h, x, y - h); g.quadraticCurveTo(x + w / 2, y - h, x + w / 2, y - h + w * 0.25); g.lineTo(x + w / 2, y); g.fill();
    g.strokeStyle = "rgba(60,55,45,.55)"; g.lineWidth = Math.max(1, w * 0.02);
    g.beginPath(); g.arc(x, y - h + w * 0.25, w * 0.1, 0, Math.PI * 2); g.stroke();
    const r = seeded(19);
    for (let c = 0; c < 6; c++) {                              // columns of script, read top to bottom
      const cx = x - w * 0.32 + c * w * 0.13; let cy = y - h + w * 0.45;
      while (cy < y - h * 0.18) { const l = w * (0.04 + r() * 0.08); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + (r() - 0.5) * w * 0.03, cy + l); g.stroke(); cy += l + w * 0.03; }
    }
    g.beginPath(); for (let i = 0; i < 4; i++) { const bx = x - w * 0.36 + i * w * 0.24; g.arc(bx + w * 0.06, y - h * 0.09, w * 0.05, Math.PI, Math.PI * 2.6); } g.stroke();
  }
  function deerStone(g, x, y, w, h) {                         // a deer stone: a tall slab carved with leaping stags
    const gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    gr.addColorStop(0, "#7f7b70"); gr.addColorStop(0.5, "#a7a296"); gr.addColorStop(1, "#77736a");
    g.fillStyle = "rgba(40,50,30,.22)"; g.beginPath(); g.ellipse(x + w * 0.3, y, w * 0.9, w * 0.14, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = gr; g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x - w * 0.45, y - h); g.lineTo(x + w * 0.42, y - h * 0.97); g.lineTo(x + w / 2, y); g.fill();
    g.strokeStyle = "rgba(55,50,42,.6)"; g.lineWidth = Math.max(1, w * 0.035);
    g.beginPath(); g.arc(x, y - h * 0.9, w * 0.12, 0, Math.PI * 2); g.stroke();                  // the sun disc at the top
    for (let i = 0; i < 3; i++) {                              // stylised stags: a long body, a beak-like head, antlers sweeping back
      const sy = y - h * (0.68 - i * 0.2), sx = x - w * 0.05;
      g.beginPath(); g.moveTo(sx + w * 0.3, sy - w * 0.05); g.quadraticCurveTo(sx, sy - w * 0.12, sx - w * 0.3, sy + w * 0.06); g.stroke();
      g.beginPath(); g.moveTo(sx + w * 0.3, sy - w * 0.05); g.lineTo(sx + w * 0.38, sy + w * 0.02); g.stroke();
      for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(sx + w * (0.22 - k * 0.12), sy - w * 0.1); g.quadraticCurveTo(sx + w * (0.1 - k * 0.12), sy - w * 0.3, sx - w * (0.05 + k * 0.12), sy - w * 0.2); g.stroke(); }
    }
    g.beginPath(); g.moveTo(x - w * 0.42, y - h * 0.12); g.lineTo(x + w * 0.42, y - h * 0.12); g.stroke();   // the belt
  }
  function paintStill() {
    bg = document.createElement("canvas"); bg.width = W; bg.height = H;
    const g = bg.getContext("2d"), hz = H * HORIZON;
    let gr = g.createLinearGradient(0, 0, 0, hz);                                   // sky
    gr.addColorStop(0, "#2f6bbd"); gr.addColorStop(0.55, "#6fa3dc"); gr.addColorStop(1, "#d7e8f2");
    g.fillStyle = gr; g.fillRect(0, 0, W, hz + 2);
    gr = g.createRadialGradient(W * 0.72, H * 0.12, 0, W * 0.72, H * 0.12, H * 0.5);   // sunlight
    gr.addColorStop(0, "rgba(255,248,220,.55)"); gr.addColorStop(1, "rgba(255,248,220,0)");
    g.fillStyle = gr; g.fillRect(0, 0, W, hz);
    ridge(g, 11, hz - H * 0.06, H * 0.22, "#eef3f8", "#c9d8e4", 0.18);              // far ranges: snow on the peaks, blue in the haze
    ridge(g, 23, hz - H * 0.015, H * 0.13, "#8c8a78", "#b8bba6");                    // nearer brown ranges
    ridge(g, 37, hz + H * 0.01, H * 0.06, "#6f8f4a", "#7fa24c");                     // green foothills
    gr = g.createLinearGradient(0, hz, 0, H);                                        // the steppe
    gr.addColorStop(0, "#86b84a"); gr.addColorStop(0.4, "#6aa83a"); gr.addColorStop(1, "#4b8a2a");
    g.fillStyle = gr; g.fillRect(0, hz, W, H - hz);
    const r = seeded(5);                                                             // grass texture, denser and larger toward us
    for (let i = 0; i < W * H / 900; i++) {
      const y = hz + Math.pow(r(), 0.8) * (H - hz), d = (y - hz) / (H - hz), x = r() * W;
      g.strokeStyle = r() > 0.5 ? `rgba(40,90,20,${0.12 + d * 0.15})` : `rgba(190,220,120,${0.08 + d * 0.12})`;
      g.lineWidth = 0.6 + d * 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - (2 + d * 9) * (0.5 + r())); g.stroke();
    }
    for (let i = 0; i < 40; i++) {                                                   // a few patches of flowers
      const y = hz + H * 0.05 + r() * (H - hz) * 0.9, x = r() * W;
      g.fillStyle = r() > 0.5 ? "rgba(240,230,120,.5)" : "rgba(230,240,255,.45)";
      for (let k = 0; k < 6; k++) g.fillRect(x + (r() - 0.5) * 30, y + (r() - 0.5) * 8, 1.5 + r() * 1.5, 1.5 + r() * 1.5);
    }
    const s = Math.min(W, H) / 900;                                                  // the gers, right
    gerCamp = [[0.86, 0.035, 34], [0.905, 0.045, 40], [0.94, 0.03, 30], [0.8, 0.028, 26]].map(([u, v, sz]) => ({ x: W * u, y: hz + H * v, s: sz * s * 1.2 }));
    gerCamp.slice().sort((a, b) => a.y - b.y).forEach(c => ger(g, c.x, c.y, c.s));
    fg = document.createElement("canvas"); fg.width = W; fg.height = H;              // the stones stand in front of the herd
    const f = fg.getContext("2d"), gy = hz + H * 0.24;                               // the ancestral stones, left
    deerStone(f, W * 0.085, gy, 40 * s * 1.3, 190 * s * 1.3);
    stele(f, W * 0.13, gy + H * 0.02, 70 * s * 1.3, 150 * s * 1.3);
    ovoo(f, W * 0.04, gy + H * 0.045, 80 * s * 1.3);
  }
  let gerCamp = [];
  function makeClouds() {
    clouds = [];
    const n = Math.round(W / (420 * dpr)) + 3;
    for (let i = 0; i < n; i++) {
      const c = document.createElement("canvas"), w = rnd(220, 420) * dpr, h = w * 0.45; c.width = w; c.height = h;
      const g = c.getContext("2d");
      for (let k = 0; k < 26; k++) {                           // overlapping puffs, rising toward the middle, with a flatter base
        const u = rnd(0.12, 0.88), x = u * w, top = Math.sin(u * Math.PI);
        const r = h * (0.16 + 0.22 * top * rnd(0.7, 1)), y = h * 0.72 - r * rnd(0.3, 0.8);
        const gr = g.createRadialGradient(x, y - r * 0.2, 0, x, y, r);
        gr.addColorStop(0, "rgba(255,255,255,.9)"); gr.addColorStop(0.65, "rgba(250,252,255,.55)"); gr.addColorStop(1, "rgba(235,242,250,0)");
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
      const sh = g.createLinearGradient(0, h * 0.45, 0, h * 0.8);          // a soft grey underside
      sh.addColorStop(0, "rgba(160,175,195,0)"); sh.addColorStop(1, "rgba(160,175,195,.35)");
      g.globalCompositeOperation = "source-atop"; g.fillStyle = sh; g.fillRect(0, 0, w, h);
      clouds.push({ img: c, x: rnd(-w, W), y: rnd(H * 0.02, H * 0.26), v: rnd(4, 9), a: rnd(0.7, 0.95) });
    }
  }
  function spawnHerd(now) {
    const dir = Math.random() < 0.5 ? 1 : -1, n = Math.round(rnd(6, 11)), hz = H * HORIZON;
    const baseY = hz + H * rnd(0.05, 0.13), s = (14 + (baseY - hz) / H * 120) * Math.min(W, H) / 900 * 1.25;
    const coats = ["#6b3f22", "#2a1d14", "#8a4a22", "#b9b2a6", "#5a3a20", "#3b2a1d", "#d8d0c0"];
    herd = { dir, v: W * rnd(0.05, 0.075) * dir, x: dir > 0 ? -s * 6 : W + s * 6, t0: now, horses: Array.from({ length: n }, (_, i) => ({
      dx: -dir * (i * s * rnd(1.1, 1.8) + rnd(0, s)), dy: rnd(-s * 0.9, s * 0.9), ph: rnd(0, 6.28), sp: rnd(0.95, 1.08), coat: coats[Math.floor(Math.random() * coats.length)], s: s * rnd(0.9, 1.1) })), y: baseY, dust: [] };
  }
  function horse(g, x, y, s, ph, coat, dir) {                  // a galloping horse, side on; legs swing with the gait phase
    g.save(); g.translate(x, y - Math.abs(Math.sin(ph)) * s * 0.06); g.scale(dir, 1);
    g.fillStyle = coat; g.strokeStyle = coat; g.lineCap = "round";
    const leg = (hx, hy, a, b) => { g.lineWidth = s * 0.075; g.beginPath(); g.moveTo(hx, hy); const kx = hx + Math.sin(a) * s * 0.22, ky = hy + Math.cos(a) * s * 0.22; g.lineTo(kx, ky); g.lineTo(kx + Math.sin(a + b) * s * 0.22, ky + Math.cos(a + b) * s * 0.22); g.stroke(); };
    leg(s * 0.32, -s * 0.38, Math.sin(ph) * 0.8 - 0.1, -Math.max(0, Math.sin(ph + 1)) * 1.2);          // far front leg
    leg(-s * 0.3, -s * 0.38, Math.sin(ph + 2.4) * 0.7, Math.max(0, Math.sin(ph + 3)) * 1.1);           // far hind leg
    g.beginPath(); g.ellipse(0, -s * 0.48, s * 0.46, s * 0.17, -0.04, 0, Math.PI * 2); g.fill();      // body
    g.beginPath(); g.moveTo(s * 0.3, -s * 0.58); g.quadraticCurveTo(s * 0.5, -s * 0.85, s * 0.62, -s * 0.9);  // neck
    g.lineTo(s * 0.82, -s * 0.74); g.lineTo(s * 0.74, -s * 0.68); g.quadraticCurveTo(s * 0.55, -s * 0.66, s * 0.42, -s * 0.42); g.fill();
    g.lineWidth = s * 0.06; g.beginPath(); g.moveTo(-s * 0.44, -s * 0.55);                           // the tail streams back
    g.quadraticCurveTo(-s * 0.68, -s * 0.6 + Math.sin(ph * 2) * s * 0.04, -s * 0.8, -s * 0.45 + Math.sin(ph) * s * 0.05); g.stroke();
    g.globalAlpha = 0.85; leg(s * 0.25, -s * 0.38, Math.sin(ph + 0.6) * 0.8 - 0.1, -Math.max(0, Math.sin(ph + 1.6)) * 1.2);   // near legs
    leg(-s * 0.36, -s * 0.38, Math.sin(ph + 3.1) * 0.7, Math.max(0, Math.sin(ph + 3.6)) * 1.1);
    g.restore();
  }
  function bird(g, x, y, s, flap) {                           // the eagle: broad wings with fingered tips
    const k = Math.sin(flap) * 0.35;
    g.save(); g.translate(x, y); g.fillStyle = "rgba(45,38,32,.85)";
    g.beginPath(); g.moveTo(0, 0);
    g.quadraticCurveTo(-s * 0.5, -s * (0.25 + k), -s * 1.1, -s * (0.05 + k)); g.lineTo(-s * 0.95, s * 0.03); g.lineTo(-s * 1.0, s * 0.08);
    g.quadraticCurveTo(-s * 0.5, s * 0.02, -s * 0.12, s * 0.12); g.lineTo(0, s * 0.3); g.lineTo(s * 0.12, s * 0.12);
    g.quadraticCurveTo(s * 0.5, s * 0.02, s * 1.0, s * 0.08); g.lineTo(s * 0.95, s * 0.03); g.lineTo(s * 1.1, -s * (0.05 + k));
    g.quadraticCurveTo(s * 0.5, -s * (0.25 + k), 0, 0); g.fill(); g.restore();
  }
  function frame(now) {
    raf = 0;
    if (!cv || document.hidden) return;
    const busy = herd || eagle, gap = busy ? 33 : 100;
    if (now - last < gap && !still()) { raf = requestAnimationFrame(frame); return; }
    const dt = last && !still() ? Math.min(0.2, (now - last) / 1000) : 0; last = now;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bg, 0, 0);
    for (const c of clouds) { c.x += c.v * dt * dpr; if (c.x > W + 20) c.x = -c.img.width - rnd(0, 200); ctx.globalAlpha = c.a; ctx.drawImage(c.img, c.x, c.y); }
    ctx.globalAlpha = 1;
    // smoke from the largest ger's crown
    const gc = gerCamp[1];
    if (gc) {
      if (!still() && Math.random() < 0.12) smoke.push({ x: gc.x, y: gc.y - gc.s * 0.8, r: gc.s * 0.06, a: 0.18 });
      for (const p of smoke) { p.y -= 9 * dt * dpr; p.x += (4 + Math.sin(p.y * 0.05) * 3) * dt * dpr; p.r += 2.5 * dt * dpr; p.a -= 0.035 * dt; }
      smoke = smoke.filter(p => p.a > 0).slice(-40);
      for (const p of smoke) { ctx.fillStyle = `rgba(235,235,230,${p.a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
    }
    if (!still()) {
      if (!herd && now > nextHerd) spawnHerd(now);
      if (!eagle && now > nextEagle) { const dir = Math.random() < 0.5 ? 1 : -1; eagle = { dir, x: dir > 0 ? -60 : W + 60, y: H * rnd(0.1, 0.28), v: W * rnd(0.03, 0.045) * dir, f: 0, s: rnd(14, 20) * Math.min(W, H) / 900 * 1.2 }; }
    }
    if (herd) {
      herd.x += herd.v * dt;
      const order = herd.horses.slice().sort((a, b) => a.dy - b.dy);
      for (const h of order) {
        h.ph += dt * 13 * h.sp;
        const x = herd.x + h.dx, y = herd.y + h.dy;
        if (Math.random() < 0.5) herd.dust.push({ x: x - herd.dir * h.s * 0.4, y: y - h.s * 0.05, r: h.s * 0.12, a: 0.28 });
        horse(ctx, x, y, h.s, h.ph, h.coat, herd.dir);
      }
      for (const d of herd.dust) { d.r += h0(d) * dt; d.a -= 0.22 * dt; d.y -= 3 * dt; }
      herd.dust = herd.dust.filter(d => d.a > 0).slice(-160);
      ctx.save(); for (const d of herd.dust) { ctx.fillStyle = `rgba(196,170,120,${d.a})`; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
      const lastX = herd.x + Math.min(...herd.horses.map(h => herd.dir * h.dx)) * herd.dir;
      if ((herd.dir > 0 && lastX > W + 80) || (herd.dir < 0 && lastX < -80)) { herd = null; nextHerd = now + rnd(18000, 50000); }
    }
    ctx.drawImage(fg, 0, 0);
    if (eagle) {
      eagle.x += eagle.v * dt; eagle.f += dt * (Math.sin(now / 1700) > 0.6 ? 7 : 0.6);
      bird(ctx, eagle.x, eagle.y + Math.sin(now / 1300) * 12, eagle.s, eagle.f);
      if (eagle.x < -120 || eagle.x > W + 120) { eagle = null; nextEagle = now + rnd(30000, 75000); }
    }
    if (!still()) raf = requestAnimationFrame(frame);
  }
  const h0 = d => d.r * 0.9 + 4;
  function size() {
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
    if (w === W && h === H && bg) return;
    W = w; H = h; cv.width = W; cv.height = H; paintStill(); makeClouds(); herd = null;
  }
  function start() {
    if (!cv) { cv = document.createElement("canvas"); cv.className = "steppe"; cv.setAttribute("aria-hidden", "true"); ctx = cv.getContext("2d"); if (!ctx) { cv = null; return; } }
    if (!cv.isConnected) document.body.prepend(cv);
    document.documentElement.classList.add("has-steppe");
    size(); const now = performance.now(); nextHerd = now + 3500; nextEagle = now + rnd(9000, 20000); last = 0;
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf); raf = 0; herd = eagle = null;
    if (cv && cv.isConnected) cv.remove();
    document.documentElement.classList.remove("has-steppe");
  }
  const sync = () => (document.documentElement.dataset.skin === "talon" && document.body ? start() : stop());
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ["data-skin"] });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && cv && cv.isConnected && !raf) { last = 0; raf = requestAnimationFrame(frame); } });
  addEventListener("resize", () => { if (cv && cv.isConnected) { size(); if (!raf) raf = requestAnimationFrame(frame); } });
  if (document.body) sync(); else document.addEventListener("DOMContentLoaded", sync);
})();
