/* ================= the Blackwall (Cyberpunk theme only) =================
   A living firewall of red and violet data, drawn with a WebGL fragment shader on a canvas behind the page.
   It only exists while the Cyberpunk theme is on. Modelled on stills of the Blackwall:
   - straight, solid bars like jail bars, crowding together toward a magenta haze on the right, as if seen in perspective;
   - a colour wave rolling across them, crimson to violet and back, with a dim glow between the bars;
   - a near layer of thicker bars rising to uneven, shifting heights, like an equaliser or a spiked wall, each tipped with light;
   - soft plasma on the right edge, streaked outward and slowly reshaping;
   - a dark, jagged fringe along the bottom, the odd flickering scan row, and rare, brief tearing.
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
// a straight vertical bar centred in each cell; w is the half-width as a share of the cell
float barShape(float f, float w) { return 1.0 - smoothstep(w, w + 0.09, abs(f - 0.5)); }
void main() {
  vec2 uv = gl_FragCoord.xy / res;
  float asp = res.x / res.y;
  // rare tearing: for a quarter of a second, a few thin bands slip sideways
  float ev = floor(t * 4.0);
  float on = step(0.95, hash(vec2(ev, 3.1)));
  float band = floor(gl_FragCoord.y / (4.0 + 9.0 * hash(vec2(ev, 1.7))));
  float torn = on * step(0.72, hash(vec2(band, ev)));
  vec2 p = uv; p.x += torn * (hash(vec2(band + 3.0, ev)) - 0.5) * 0.014;
  float x = p.x, y = p.y;
  // the wall's upper edge, heaving slowly
  float edge = 0.38 + 0.06 * fbm(vec2(x * 2.0 + t * 0.03, t * 0.05));
  float body = smoothstep(edge + 0.2, edge - 0.12, y);
  // 1. the bars: straight and solid like jail bars, crowding together toward the haze on the right (perspective)
  float ph = 34.0 * x + 120.0 * x * x;
  float idx = floor(ph), fr = fract(ph);
  float bar = barShape(fr, 0.16);
  // the colour wave: crimson and violet roll across the bars from left to right
  float cw = 0.5 + 0.5 * sin(idx * 0.42 - t * 1.25 + 2.2 * noise(vec2(idx * 0.08, t * 0.15)));
  vec3 barCol = mix(vec3(0.95, 0.07, 0.22), vec3(0.42, 0.2, 0.95), cw);
  float bb = (0.4 + 0.45 * hash(vec2(idx, 7.0))) * (0.8 + 0.2 * noise(vec2(idx, y * 5.0 - t * 0.3)));
  // the glow between the bars, tinted by the same wave
  vec3 back = mix(vec3(0.32, 0.05, 0.16), vec3(0.16, 0.08, 0.42), cw);
  // a magenta haze where the bars crowd, breathing
  float haze = exp(-pow((x - 0.66) / 0.1, 2.0)) * (0.75 + 0.25 * sin(t * 0.6));
  // scan rows: now and then a thin horizontal row of the bars flickers brighter
  float row = floor(y * 70.0);
  float scan = step(0.975, hash(vec2(row, floor(t * 5.0))));
  // 2. the near layer: thicker bars rising to uneven heights, like an equaliser or a spiked wall, each tipped with light
  float ph2 = 24.0 * x + 46.0 * x * x;
  float i2 = floor(ph2), f2 = fract(ph2);
  float h = 0.08 + 0.17 * pow(noise(vec2(i2 * 0.41, t * 0.45)), 1.6) + 0.06 * noise(vec2(i2 * 2.3, t * 1.1));
  h *= 0.45 + 0.55 * smoothstep(0.95, 0.35, x);
  float nshape = barShape(f2, 0.13 * (1.0 - 0.75 * clamp(y / h, 0.0, 1.0)));      // each spike tapers toward its tip
  float nb = nshape * smoothstep(h + 0.004, h - 0.01, y) * (0.35 + 0.65 * smoothstep(0.0, h, y));
  float cap = barShape(f2, 0.06) * exp(-abs(y - h) * 90.0);
  float cw2 = 0.5 + 0.5 * sin(i2 * 0.6 - t * 1.25);
  vec3 nearCol = mix(vec3(1.0, 0.14, 0.3), vec3(1.0, 0.38, 0.75), cw2);
  // 3. the plasma on the right: soft, streaked outward, slowly reshaping
  vec2 q = (p - vec2(1.0, 0.16)) * vec2(asp * 0.55, 1.0);
  float pr = length(q);
  float streaks = fbm(vec2(x * 3.0 - t * 0.22, y * 22.0 + 4.0 * fbm(vec2(y * 3.0, t * 0.15))));
  float plasma = exp(-pr * 2.8) * (0.35 + 0.65 * streaks) * (0.85 + 0.15 * sin(t * 0.4));
  // compose (premultiplied light)
  vec3 col = back * 0.35 * body; float a = 0.22 * body;
  float B = bar * bb * body * (1.0 - 0.35 * haze);
  col += barCol * B; a += B * 0.85;
  col += barCol * scan * bar * body * 0.35; a += scan * bar * body * 0.25;
  col += vec3(0.85, 0.25, 0.62) * haze * body * 0.55; a += haze * body * 0.35;
  col += nearCol * nb * 0.7 + vec3(1.0, 0.75, 0.9) * cap * 0.6; a += nb * 0.6 + cap * 0.5;
  col += vec3(1.0, 0.32, 0.58) * plasma * 0.85; a += plasma * 0.6;
    // a dark, jagged fringe along the very bottom
  float jag = 0.015 + 0.03 * noise(vec2(x * 90.0, t * 0.3)) * noise(vec2(x * 13.0, 1.0));
  float dark = smoothstep(jag + 0.004, jag - 0.004, y);
  col *= 1.0 - dark; a = mix(a, 0.85, dark);
  float k = 0.48;                                          // kept in the background
  a = clamp(a, 0.0, 1.0) * k; col = min(col * k, vec3(a));
  gl_FragColor = vec4(col, a);
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
