/* ================= the Blackwall (Cyberpunk theme only) =================
   A living firewall of red and violet data, drawn with a WebGL fragment shader on a canvas behind the page.
   It only exists while the Cyberpunk theme is on. The pieces:
   - a curtain of vertical data streaks that sway and flicker;
   - an upper edge that heaves in slow swells;
   - a pink-white heart low on the right that pulses;
   - waves that ripple out from the heart through the curtain, bending the streaks as they pass.
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
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }
void main() {
  vec2 uv = gl_FragCoord.xy / res;                   // 0..1, y up from the bottom of the screen
  float asp = res.x / res.y;
  vec2 heart = vec2(0.84, 0.06);
  vec2 d = (uv - heart) * vec2(asp, 1.0);
  float r = length(d);
  // waves rippling outward from the heart: two trains at different speeds, fading with distance
  float rip = sin(r * 34.0 - t * 1.9) * exp(-r * 2.4) + 0.55 * sin(r * 19.0 - t * 1.15 + 1.7) * exp(-r * 1.6);
  // the living sway: slow warping noise, plus the ripple pushing the streaks sideways
  float warp = fbm(vec2(uv.x * 3.0, uv.y * 2.2 - t * 0.07)) - 0.5;
  float x = uv.x + warp * 0.035 + rip * 0.006;
  // the curtain: vertical streaks at three densities, each flickering at its own pace
  float s1 = pow(abs(sin(x * 420.0)), 26.0) * (0.55 + 0.45 * noise(vec2(x * 60.0, t * 0.9)));
  float s2 = pow(abs(sin(x * 170.0 + 1.3)), 14.0) * (0.5 + 0.5 * noise(vec2(x * 30.0 + 5.0, t * 0.5)));
  float s3 = pow(abs(sin(x * 61.0 + 0.4)), 40.0) * noise(vec2(x * 12.0, t * 0.3 + uv.y * 2.0));
  float streak = s1 * 0.55 + s2 * 0.7 + s3 * 1.3;
  // breaks travelling down the streaks, like data packets
  streak *= 0.65 + 0.35 * noise(vec2(x * 90.0, uv.y * 18.0 + t * 1.4));
  // the heaving upper edge
  float edge = 0.30 + 0.07 * fbm(vec2(uv.x * 2.2 + t * 0.04, t * 0.06)) + 0.025 * sin(uv.x * 8.0 - t * 0.55) + rip * 0.02;
  float body = smoothstep(edge + 0.16, edge - 0.08, uv.y);
  float breathe = 0.82 + 0.18 * sin(t * 0.55) * sin(t * 0.21 + 1.0);
  // colour: deep red on the left warming to magenta and pink toward the heart, with violet threads
  vec3 red = vec3(0.95, 0.08, 0.22), mag = vec3(1.0, 0.22, 0.62), vio = vec3(0.45, 0.25, 1.0);
  vec3 col = mix(red, mag, smoothstep(0.25, 0.95, uv.x));
  col = mix(col, vio, s3 * 0.45);
  float a = streak * body * breathe;
  a += body * 0.10 * (0.6 + 0.4 * rip);                   // the faint glow of the wall itself, lit by each passing wave
  // the heart: a pulsing bloom with tendrils
  float pulse = 0.75 + 0.25 * sin(t * 1.3);
  float tend = fbm(vec2(atan(d.y, d.x) * 3.0, r * 6.0 - t * 0.35));
  float bloom = exp(-r * 7.5) * pulse + exp(-r * 3.2) * 0.35 * tend * pulse;
  col = mix(col, vec3(1.0, 0.72, 0.92), clamp(bloom * 0.9, 0.0, 1.0));
  a += bloom * 0.85;
  a = clamp(a, 0.0, 1.0) * 0.62;                          // keep it in the background
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
