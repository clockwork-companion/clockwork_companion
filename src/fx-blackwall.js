/* ================= the Blackwall (Cyberpunk theme only) =================
   A living firewall of red and violet data, drawn with a WebGL fragment shader on a canvas behind the page.
   It only exists while the Cyberpunk theme is on. The pieces:
   - a curtain of vertical data streaks in three depths (a far, faintly pixelated violet layer behind red and magenta
     ones), each swaying and flickering at its own pace;
   - an upper edge that heaves in slow swells;
   - soft waves that ripple out from three points wandering slowly along the whole wall, bending the streaks;
   - now and then, for a fraction of a second, a few thin bands tear sideways, some briefly blocky.
   It is cheap by design: drawn at half resolution, capped at 30 frames a second, paused when the tab is hidden,
   and frozen into a single still frame for anyone who asks their device for reduced motion. Without WebGL, the
   theme's CSS stand-in (in app.css) is used instead. */
(function () {
  const FRAG = `
precision mediump float;
uniform vec2 res; uniform float t;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.07 + 13.1; a *= 0.5; } return v; }
// One layer of the curtain at depth z (0 = near, 1 = far). Far layers are denser, slower and dimmer.
float curtain(vec2 uv, float z, float rip) {
  float sc = mix(1.0, 2.4, z), sp = mix(1.0, 0.4, z);
  float warp = fbm(vec2(uv.x * 3.0 * sc, uv.y * 2.0 - t * 0.06 * sp + z * 7.0)) - 0.5;
  float x = uv.x + warp * 0.04 * (1.0 - 0.5 * z) + rip * 0.012 * (1.0 - z);
  float s1 = pow(abs(sin(x * 240.0 * sc + z * 5.0)), 22.0) * (0.45 + 0.55 * noise(vec2(x * 50.0 * sc, t * 0.7 * sp + z * 3.0)));
  float s2 = pow(abs(sin(x * 90.0 * sc + 1.3 + z * 2.0)), 34.0) * noise(vec2(x * 20.0 * sc + 5.0, t * 0.35 * sp + uv.y * 1.5));
  float s = s1 * 0.6 + s2 * 1.1;
  return s * (0.55 + 0.45 * noise(vec2(x * 80.0 * sc, uv.y * 14.0 + t * 1.2 * sp)));   // data packets running down
}
void main() {
  vec2 uv = gl_FragCoord.xy / res;
  float asp = res.x / res.y;
  // tearing: now and then, for a fraction of a second, a few thin horizontal bands slip sideways
  float ev = floor(t * 4.0);                                 // quarter-second slots
  float on = step(0.95, hash(vec2(ev, 3.1)));               // about one slot in twenty
  float band = floor(gl_FragCoord.y / (4.0 + 9.0 * hash(vec2(ev, 1.7))));
  float torn = on * step(0.72, hash(vec2(band, ev)));
  vec2 p = uv; p.x += torn * (hash(vec2(band + 3.0, ev)) - 0.5) * 0.035;
  // a little pixelation inside some torn bands
  float blocky = torn * step(0.75, hash(vec2(band + 9.0, ev)));
  vec2 cell = vec2(3.0) / res;
  p = mix(p, (floor(p / cell) + 0.5) * cell, blocky);
  // ripples from three sources that wander slowly along the whole wall; soft, no bright spot
  float rip = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 src = vec2(0.5 + 0.45 * sin(t * (0.021 + 0.009 * fi) + fi * 2.1), 0.10 + 0.06 * sin(t * 0.047 + fi * 1.3));
    float r = length((p - src) * vec2(asp, 1.0));
    rip += sin(r * 24.0 - t * (1.1 + 0.25 * fi) - fi * 2.0) * exp(-r * 2.6);
  }
  rip /= 3.0;
  // the heaving top edge
  float edge = 0.30 + 0.08 * fbm(vec2(p.x * 2.0 + t * 0.035, t * 0.05)) + 0.03 * sin(p.x * 7.0 - t * 0.45) + rip * 0.03;
  float body = smoothstep(edge + 0.18, edge - 0.08, p.y);
  // depth: a far, faintly pixelated violet layer, a middle layer, and a near layer that the ripples light up
  vec2 pf = (floor(p * res / 3.0) + 0.5) * 3.0 / res;
  float far = curtain(pf, 0.9, rip), mid = curtain(p + vec2(0.13, 0.0), 0.45, rip), near = curtain(p + vec2(0.37, 0.0), 0.0, rip);
  near *= 0.85 + 0.3 * rip;
  vec3 cFar = vec3(0.42, 0.22, 0.92), cMid = mix(vec3(0.85, 0.08, 0.3), vec3(0.9, 0.2, 0.65), p.x), cNear = mix(vec3(1.0, 0.1, 0.24), vec3(1.0, 0.28, 0.66), smoothstep(0.2, 1.0, p.x));
  float wF = far * 0.32, wM = mid * 0.55, wN = near * 0.85;
  float a = wF + wM + wN;
  vec3 col = (cFar * wF + cMid * wM + cNear * wN) / max(a, 0.001);
  // the wall's own dim glow, swelling where waves pass
  a += 0.07 * (0.7 + 0.3 * rip) * smoothstep(0.0, 0.5, 1.0 - p.y);
  col = mix(col, vec3(0.3, 0.85, 1.0), torn * 0.35);      // torn bands flash faintly cyan
  float breathe = 0.85 + 0.15 * sin(t * 0.5) * sin(t * 0.19 + 1.0);
  a = clamp(a * body * breathe, 0.0, 1.0) * 0.6;         // kept in the background
  gl_FragColor = vec4(col * a, a);
}`;
  const VERT = "attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }";
  let cv = null, gl = null, prog = null, raf = 0, last = 0, t0 = 0, uRes, uT;
  const still = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setup() {
    cv = document.createElement("canvas"); cv.className = "blackwall"; cv.setAttribute("aria-hidden", "true");
    gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: "low-power" });
    if (!gl) { cv = null; return false; }
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const v = sh(gl.VERTEX_SHADER, VERT), f = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!v || !f) { cv = null; return false; }
    prog = gl.createProgram(); gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { cv = null; return false; }
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    uRes = gl.getUniformLocation(prog, "res"); uT = gl.getUniformLocation(prog, "t");
    return true;
  }
  function size() {
    if (!cv) return;
    const w = Math.max(1, Math.round(innerWidth * 0.5)), h = Math.max(1, Math.round(innerHeight * 0.5));   // half resolution: soft and cheap
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
  }
  function draw(now) {
    raf = 0;
    if (!cv || document.hidden) return;
    if (now - last >= 33) {                                  // about 30 frames a second
      last = now; size();
      gl.uniform2f(uRes, cv.width, cv.height); gl.uniform1f(uT, still() ? 12.0 : (now - t0) / 1000);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    if (!still()) raf = requestAnimationFrame(draw);
  }
  function start() {
    if (!cv && !setup()) return;                             // no WebGL: the CSS stand-in stays
    if (!cv.isConnected) document.body.prepend(cv);
    document.documentElement.classList.add("has-blackwall");
    t0 = t0 || performance.now(); last = 0;
    if (!raf) raf = requestAnimationFrame(draw);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (cv && cv.isConnected) cv.remove();
    document.documentElement.classList.remove("has-blackwall");
  }
  const sync = () => (document.documentElement.dataset.skin === "cyber" && document.body ? start() : stop());
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ["data-skin"] });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && cv && cv.isConnected && !raf) raf = requestAnimationFrame(draw); });
  addEventListener("resize", () => { if (cv && cv.isConnected && !raf) raf = requestAnimationFrame(draw); });
  if (document.body) sync(); else document.addEventListener("DOMContentLoaded", sync);
})();
