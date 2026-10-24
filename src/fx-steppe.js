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
  function applyReal(shot) {                                  // the realistic render: no painted stones or clouds needed
    {
      bg = document.createElement("canvas"); bg.width = W; bg.height = H;
      const g = bg.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(shot.scene, 0, 0, W, H);
      fg = document.createElement("canvas"); fg.width = W; fg.height = H;
      const f = fg.getContext("2d"); f.imageSmoothingQuality = "high"; f.drawImage(shot.stones, 0, 0, W, H);
      realScene = true;
      gerCamp = CAMP.map(([x, y, z], i) => { const [px, py] = project(x, 2.4 * [1, 1.15, 0.95, 0.85][i], z, W, H); return { x: px, y: py, s: 30 }; });
    }
  }
  // The painted scene, used where WebGL isn't available.
  function paintStill() {
    realScene = false;
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

  /* ---------- the realistic render: a GPU terrain renderer, run once per window size ----------
     A ray is cast from a camera standing on the steppe for every pixel. It finds the ground (gentle rolling grass
     close by, snow-capped ranges far off), shades it in sunlight with soft shadows and blue aerial haze, and paints a
     sky with sun glow and clouds. A ger camp sits on the plain to the right; an ovoo cairn, a stele and a deer stone
     stand nearby on the left. The finished picture is copied onto the 2D canvas, and the animals move over it. */
  const CAM = [0, 2.6, 0], FOV = 1.55, PITCH = 0.1;
  const CAMP = [[34, 0, 120], [42, 0, 128], [50, 0, 118], [27, 0, 131]];         // ger positions (on flattened ground)
  const REAL_FRAG = `
precision highp float;
uniform vec2 res; uniform float mode;   // mode 1: draw only the near stones (a layer that goes in front of the herd)
const vec3 CAM = vec3(0.0, 2.6, 0.0);
const float FOV = 1.55, PITCH = 0.1;
const vec3 SUN = vec3(0.8, 0.48, -0.12);                // late-morning sun over the viewer's right shoulder
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { v += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; } return v; }
float ridged(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { float n = 1.0 - abs(noise(p) * 2.0 - 1.0); v += a * n * n; p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; } return v; }
float flatAt(vec2 xz) {                                  // 0 where the camp and the stones stand, 1 elsewhere
  float c = smoothstep(14.0, 40.0, length(xz - vec2(38.0, 124.0)));
  float s = smoothstep(4.0, 14.0, length(xz - vec2(-7.0, 19.0)));
  return min(c, s);
}
float terrain(vec2 xz) {
  float h = (fbm(xz * 0.011) - 0.5) * 5.0 * flatAt(xz);                      // the rolling steppe
  float m = smoothstep(300.0, 1100.0, xz.y);                                  // the ranges rise in the distance
  h += m * (ridged(xz * 0.0013 + 3.1) * 430.0 + fbm(xz * 0.004) * 60.0 - 40.0);
  h += smoothstep(120.0, 500.0, xz.y) * fbm(xz * 0.006 + 7.0) * 34.0;          // foothills
  return h;
}
float sdCyl(vec3 p, float r, float h) { vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)); }
float sdCone(vec3 p, float r, float h) { float q = length(p.xz); return max(-p.y, (q * h + p.y * r - r * h) / sqrt(h * h + r * r)); }
float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
// the objects: id 1 ger felt, 2 ger door, 3 stone (stele / deer stone), 4 cairn
vec2 objects(vec3 p) {
  vec2 r = vec2(1e5, 0.0);
  ` + CAMP.map(([x, y, z], i) => `{ vec3 q = p - vec3(${x.toFixed(1)}, 0.0, ${z.toFixed(1)}); float s = ${[1.0, 1.15, 0.95, 0.85][i].toFixed(2)};
    float d = min(sdCyl(q - vec3(0.0, 1.05 * s, 0.0), 3.0 * s, 1.05 * s), sdCone(q - vec3(0.0, 2.1 * s, 0.0), 3.2 * s, 1.35 * s));
    if (d < r.x) { r = vec2(d, (q.z < -2.6 * s && abs(q.x) < 0.45 * s && q.y < 1.8 * s) ? 2.0 : 1.0); } }`).join("\n  ") + `
  { vec3 q = p - vec3(-6.0, 0.0, 18.0);                     // the stele: a slab with a rounded top
    float d = min(sdBox(q - vec3(0.0, 1.0, 0.0), vec3(0.42, 1.0, 0.13)), length((q - vec3(0.0, 2.0, 0.0)) * vec3(1.0, 1.8, 2.9)) - 0.42);
    if (d < r.x) r = vec2(d, 3.0); }
  { vec3 q = p - vec3(-8.3, 0.0, 19.5);                     // the deer stone: tall, narrow, slightly leaning
    q.x += q.y * 0.04; float d = sdBox(q - vec3(0.0, 1.3, 0.0), vec3(0.22, 1.3, 0.16)) - 0.03;
    if (d < r.x) r = vec2(d, 3.0); }
  { vec3 q = p - vec3(-10.2, 0.0, 21.0);                    // the ovoo cairn
    float d = sdCone(q, 2.1, 1.5) - 0.06 * noise(q.xz * 6.0 + q.y * 4.0);
    if (d < r.x) r = vec2(d, 4.0); }
  return r;
}
vec2 map(vec3 p) {
  vec2 o = objects(p);
  float g = (p.y - terrain(p.xz)) * 0.45;
  return g < o.x ? vec2(g, 0.0) : o;
}
vec3 normalAt(vec3 p, float t) {
  float e = 0.002 * t + 0.01;
  vec2 o = objects(p);
  if (o.x < e * 4.0) {
    return normalize(vec3(objects(p + vec3(e, 0, 0)).x - objects(p - vec3(e, 0, 0)).x, objects(p + vec3(0, e, 0)).x - objects(p - vec3(0, e, 0)).x, objects(p + vec3(0, 0, e)).x - objects(p - vec3(0, 0, e)).x));
  }
  return normalize(vec3(terrain(p.xz - vec2(e, 0)) - terrain(p.xz + vec2(e, 0)), 2.0 * e, terrain(p.xz - vec2(0, e)) - terrain(p.xz + vec2(0, e))));
}
float shadow(vec3 p) {
  float s = 1.0, t = 0.5;
  for (int i = 0; i < 40; i++) { vec3 q = p + SUN * t; float d = map(q).x; s = min(s, 10.0 * d / t); if (s < 0.02 || t > 900.0) break; t += clamp(d, 0.4, 60.0); }
  return clamp(s, 0.0, 1.0);
}
vec3 sky(vec3 rd) {
  vec3 sun = normalize(SUN);
  float h = max(rd.y, 0.0);
  vec3 c = mix(vec3(0.72, 0.83, 0.93), vec3(0.16, 0.38, 0.78), pow(h, 0.55));
  float sd = max(dot(rd, sun), 0.0);
  c += vec3(1.0, 0.92, 0.75) * (pow(sd, 400.0) * 3.0 + pow(sd, 18.0) * 0.18);
  if (rd.y > 0.0) {                                        // clouds on a plane high above
    vec2 uv = rd.xz / rd.y * 0.0009 * 900.0;
    float d = fbm(uv * 0.9 + vec2(2.0, 5.0)); d = smoothstep(0.52, 0.78, d);
    float shade = 0.75 + 0.25 * fbm(uv * 2.0 + 9.0);
    vec3 cc = mix(vec3(0.72, 0.76, 0.84), vec3(1.0), shade) + vec3(1.0, 0.95, 0.85) * pow(sd, 6.0) * 0.3;
    c = mix(c, cc, d * smoothstep(0.0, 0.12, rd.y) * 0.9);
  }
  return c;
}
void main() {
  if (mode > 0.5 && (gl_FragCoord.x > 0.32 * res.x || gl_FragCoord.y > 0.55 * res.y)) { gl_FragColor = vec4(0.0); return; }   // the stones are only bottom-left
  vec2 p = (gl_FragCoord.xy - 0.5 * res) / res.y;
  vec3 ro = CAM, rd = normalize(vec3(p.x, p.y + PITCH, FOV));
  vec3 sun = normalize(SUN);
  float t = 0.6; vec2 hit = vec2(-1.0);
  for (int i = 0; i < 300; i++) {
    vec3 q = ro + rd * t; vec2 m = map(q);
    if (m.x < 0.0015 * t) {
      for (int k = 0; k < 6; k++) { t -= 0.5 * abs(m.x) + 0.0005 * t; m = map(ro + rd * t); if (m.x > 0.0) t += m.x * 0.5; }   // settle onto the surface
      hit = vec2(t, map(ro + rd * t).y); break;
    }
    t += max(m.x * 0.8, 0.003 * t);
    if (t > 7000.0) break;
  }
  vec3 col;
  if (hit.x < 0.0) col = sky(rd);
  else {
    vec3 q = ro + rd * t, n = normalAt(q, t);
    vec3 alb;
    if (hit.y == 0.0) {
      float slope = 1.0 - n.y, hgt = q.y;
      float v = fbm(q.xz * 0.08), fine = (noise(q.xz * 3.5) * 0.6 + noise(vec2(q.x * 40.0, q.z * 6.0)) * 0.4) * smoothstep(80.0, 4.0, t);
      vec3 grass = mix(vec3(0.21, 0.38, 0.09), vec3(0.40, 0.52, 0.16), v) * (0.82 + 0.36 * fine);
      grass = mix(grass, vec3(0.52, 0.53, 0.26), smoothstep(0.55, 0.85, fbm(q.xz * 0.02 + 4.0)) * 0.6);   // drier, yellower patches
      vec3 rock = mix(vec3(0.33, 0.30, 0.27), vec3(0.47, 0.43, 0.38), fbm(q.xz * 0.03));
      alb = mix(grass, rock, smoothstep(0.22, 0.5, slope + smoothstep(120.0, 260.0, hgt) * 0.35));
      float snow = smoothstep(250.0, 320.0, hgt + 40.0 * fbm(q.xz * 0.01)) * smoothstep(0.75, 0.45, slope);
      alb = mix(alb, vec3(0.93, 0.95, 0.98), snow);
    } else if (hit.y == 1.0) alb = vec3(0.9, 0.88, 0.83) * (0.92 + 0.08 * noise(q.xy * 6.0));
    else if (hit.y == 2.0) alb = vec3(0.75, 0.32, 0.12);
    else if (hit.y == 3.0) alb = vec3(0.6, 0.58, 0.53) * (0.78 + 0.3 * fbm(q.xy * 9.0 + q.z)) * (1.0 - 0.14 * step(0.86, fract(q.x * 11.0)) * step(0.5, noise(vec2(q.x * 11.0, q.y * 7.0))));
    else alb = vec3(0.5, 0.45, 0.4) * (0.7 + 0.5 * noise(q.xz * 9.0 + q.y * 7.0));
    float dif = max(dot(n, sun), 0.0) * shadow(q + n * (0.05 + 0.004 * t));
    float amb = 0.38 + 0.25 * n.y;
    dif *= 0.55 + 0.45 * smoothstep(0.35, 0.6, fbm(q.xz * 0.0018 + vec2(4.0, 9.0)));   // shadows of passing clouds
    col = alb * (vec3(1.0, 0.95, 0.85) * dif * 1.25 + vec3(0.55, 0.68, 0.9) * amb * 0.55);
    // aerial perspective: distance turns things blue and pale
    float fog = 1.0 - exp(-t * 0.00036);
    vec3 fc = mix(vec3(0.66, 0.77, 0.89), vec3(0.95, 0.9, 0.8), pow(max(dot(rd, sun), 0.0), 8.0) * 0.4);
    col = mix(col, fc, fog);
  }
  if (mode > 0.5) { if (hit.x < 0.0 || hit.x > 60.0 || hit.y < 3.0) { gl_FragColor = vec4(0.0); return; } }
  col = pow(col, vec3(0.92));                               // a touch of contrast
  col *= 1.0 - 0.18 * dot(p, p);                           // gentle vignette
  gl_FragColor = vec4(col, 1.0);
}`;
  // Project a point on the ground into canvas pixels, matching the shader's camera.
  function project(x, y, z, w, h) {
    const dx = x - CAM[0], dy = y - CAM[1], dz = z - CAM[2];
    const px = dx / dz * FOV, py = dy / dz * FOV - PITCH;
    return [px * h + 0.5 * w, h - (py * h + 0.5 * h)];
  }
  let realOK = null;                                         // null: untried; false: WebGL failed, use the painted scene
  // Render the scene, then the stones-only layer, a strip per animation frame so the browser never stalls.
  function renderReal(w, h) {
    if (realOK === false) return Promise.resolve(null);
    const scale = Math.min(1, (w < 900 ? 700 : 1100) / Math.max(w, h));   // at most ~1100 px wide (700 on phones), scaled up
    const c = document.createElement("canvas"); c.width = Math.round(w * scale); c.height = Math.round(h * scale);
    const gl = c.getContext("webgl", { preserveDrawingBuffer: true, antialias: false });
    if (!gl) { realOK = false; return Promise.resolve(null); }
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const v = sh(gl.VERTEX_SHADER, "attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }"), f = sh(gl.FRAGMENT_SHADER, REAL_FRAG);
    if (!v || !f) { realOK = false; return Promise.resolve(null); }
    const prog = gl.createProgram(); gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { realOK = false; return Promise.resolve(null); }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(gl.getUniformLocation(prog, "res"), c.width, c.height);
    gl.viewport(0, 0, c.width, c.height); gl.enable(gl.SCISSOR_TEST);
    const uMode = gl.getUniformLocation(prog, "mode"), STRIPS = 14, copy = () => { const k = document.createElement("canvas"); k.width = c.width; k.height = c.height; k.getContext("2d").drawImage(c, 0, 0); return k; };
    return new Promise(done => {
      let i = 0, pass = 0, scene = null;
      gl.uniform1f(uMode, 0); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      const step = () => {
        if (gl.isContextLost()) { realOK = false; done(null); return; }
        const y0 = Math.floor(c.height * i / STRIPS), y1 = Math.floor(c.height * (i + 1) / STRIPS);
        gl.scissor(0, y0, c.width, y1 - y0); gl.drawArrays(gl.TRIANGLES, 0, 3); i++;
        if (i < STRIPS) { requestAnimationFrame(step); return; }
        if (pass === 0) { scene = copy(); pass = 1; i = 0; gl.scissor(0, 0, c.width, c.height); gl.clear(gl.COLOR_BUFFER_BIT); gl.uniform1f(uMode, 1); requestAnimationFrame(step); return; }
        realOK = true; done({ scene, stones: copy() });
      };
      requestAnimationFrame(step);
    });
  }
  let gerCamp = [], realScene = false;
  function makeClouds() {
    clouds = [];
    if (realScene) return;
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
    const baseY = hz + H * rnd(0.05, 0.13), s = (14 + (baseY - hz) / H * 120) * Math.min(W, H) / 900 * (realScene ? 0.95 : 1.25);
    const coats = realScene ? ["#4a2e1c", "#2a1d14", "#5c3820", "#7a705f", "#3b2a1d", "#614026", "#9a9180"] : ["#6b3f22", "#2a1d14", "#8a4a22", "#b9b2a6", "#5a3a20", "#3b2a1d", "#d8d0c0"];
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
    if (!cv || document.hidden || !bg) return;                // still rendering: frame() is kicked again when it's ready
    const busy = herd || eagle, gap = busy ? 33 : 100;
    if (now - last < gap && !still()) { raf = requestAnimationFrame(frame); return; }
    const dt = last && !still() ? Math.min(0.2, (now - last) / 1000) : 0; last = now;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bg, 0, 0);
    for (const c of clouds) { c.x += c.v * dt * dpr; if (c.x > W + 20) c.x = -c.img.width - rnd(0, 200); ctx.globalAlpha = c.a; ctx.drawImage(c.img, c.x, c.y); }
    ctx.globalAlpha = 1;
    // smoke from the largest ger's crown
    const gc = gerCamp[1];
    if (gc) {
      if (!still() && Math.random() < 0.12) smoke.push(realScene ? { x: gc.x, y: gc.y, r: 2 * dpr, a: 0.22 } : { x: gc.x, y: gc.y - gc.s * 0.8, r: gc.s * 0.06, a: 0.18 });
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
        if (realScene) ctx.filter = "blur(0.6px)";
        horse(ctx, x, y, h.s, h.ph, h.coat, herd.dir);
        ctx.filter = "none";
      }
      for (const d of herd.dust) { d.r += h0(d) * dt; d.a -= 0.22 * dt; d.y -= 3 * dt; }
      herd.dust = herd.dust.filter(d => d.a > 0).slice(-160);
      ctx.save(); for (const d of herd.dust) { ctx.fillStyle = `rgba(196,170,120,${d.a})`; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
      const lastX = herd.x + Math.min(...herd.horses.map(h => herd.dir * h.dx)) * herd.dir;
      if ((herd.dir > 0 && lastX > W + 80) || (herd.dir < 0 && lastX < -80)) { herd = null; nextHerd = now + rnd(18000, 50000); }
    }
    if (fg) ctx.drawImage(fg, 0, 0);
    if (eagle) {
      eagle.x += eagle.v * dt; eagle.f += dt * (Math.sin(now / 1700) > 0.6 ? 7 : 0.6);
      bird(ctx, eagle.x, eagle.y + Math.sin(now / 1300) * 12, eagle.s, eagle.f);
      if (eagle.x < -120 || eagle.x > W + 120) { eagle = null; nextEagle = now + rnd(30000, 75000); }
    }
    if (!still()) raf = requestAnimationFrame(frame);
  }
  const h0 = d => d.r * 0.9 + 4;
  let job = 0;
  function size() {
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
    if (w === W && h === H && (bg || job)) return;
    W = w; H = h; bg = fg = null; herd = null; cv.style.opacity = "0";
    const mine = ++job;
    renderReal(W, H).then(shot => {
      if (mine !== job || !cv) return;
      cv.width = W; cv.height = H;
      if (shot) applyReal(shot); else paintStill();
      makeClouds(); cv.style.opacity = "1"; last = 0;
      if (!raf && cv.isConnected) raf = requestAnimationFrame(frame);
    });
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
  let resizeT = 0;
  addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (cv && cv.isConnected) size(); }, 350); });
  if (document.body) sync(); else document.addEventListener("DOMContentLoaded", sync);
})();
