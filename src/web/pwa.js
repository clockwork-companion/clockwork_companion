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
})();
