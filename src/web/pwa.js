/* Clockwork Companion: installable app. Registers the offline worker (sw.js) and, when a newer version has been
   published, offers a one-line "reload" notice instead of switching the page under someone mid-session. */
(() => {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || document.getElementById("cw-update")) return;
    const bar = document.createElement("div"); bar.id = "cw-update"; bar.setAttribute("role", "status");
    bar.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9000;display:flex;gap:10px;align-items:center;" +
      "padding:8px 12px;max-width:calc(100vw - 32px);background:#1b130b;color:#ffe2a8;border:1px solid #b88a3c;border-radius:6px;font:14px system-ui,sans-serif;box-shadow:0 6px 24px rgb(0 0 0 / .4)";
    bar.innerHTML = '<span>A new version of the app is ready.</span><button type="button" style="font:inherit;font-weight:600;padding:4px 10px;border:1px solid #e0b462;background:#8a2e1c;color:#ffe2a8;border-radius:4px;cursor:pointer">Reload</button><button type="button" aria-label="Not now" style="font:inherit;background:none;border:0;color:#c9a56a;cursor:pointer">×</button>';
    const [reload, later] = bar.querySelectorAll("button");
    reload.onclick = () => location.reload(); later.onclick = () => bar.remove();
    document.body.appendChild(bar);
  });
  addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });

  // ---- the install-app button (data-install-btn, in the header and on the sign-in screen) ----
  // It shows only when installing is possible: Chrome/Edge/Android offer an install prompt; iPhone and iPad have no
  // prompt, so there the button explains Share → Add to Home Screen. Already installed: no button.
  const root = document.documentElement;
  const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const apple = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let offer = null;
  const mark = v => { if (v && !standalone()) root.dataset.install = v; else delete root.dataset.install; };
  if (apple) mark("ios");
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); offer = e; mark("prompt"); });
  addEventListener("appinstalled", () => { offer = null; mark(""); });
  const help = btn => {
    const old = document.querySelector(".installhelp"); if (old) { old.remove(); return; }
    const tip = document.createElement("div"); tip.className = "installhelp"; tip.setAttribute("role", "status");
    tip.innerHTML = apple ? "To install: tap <b>Share</b> <span aria-hidden=\"true\">⬆︎</span>, then <b>Add to Home Screen</b>."
                          : "To install: open your browser's menu and choose <b>Install app</b> (or <b>Add to Home screen</b>).";
    document.body.appendChild(tip);
    const r = btn.getBoundingClientRect(), w = tip.offsetWidth;
    tip.style.top = Math.min(innerHeight - tip.offsetHeight - 8, r.bottom + 8) + "px";
    tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + "px";
    setTimeout(() => document.addEventListener("pointerdown", function off(ev) { if (!tip.contains(ev.target)) { tip.remove(); document.removeEventListener("pointerdown", off); } }), 0);
  };
  document.addEventListener("click", async e => {
    const btn = e.target.closest && e.target.closest("[data-install-btn]"); if (!btn) return;
    e.preventDefault();
    if (!offer) { help(btn); return; }
    const o = offer; offer = null;
    try { await o.prompt(); const r = await o.userChoice; mark(r && r.outcome === "accepted" ? "" : apple ? "ios" : ""); } catch { mark(""); }
  });
})();
