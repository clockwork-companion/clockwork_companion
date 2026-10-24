/* Clockwork Companion: offline support (service worker).
   - The page itself: try the network first (so you always get the newest version), fall back to the saved copy offline.
   - Icons, the hidden games' art, the Firebase code and fonts: kept after the first load and served from the saved copy.
   - Never touches Firebase's database or sign-in traffic; Firestore keeps its own offline copy of characters.
   build.py replaces the version string on every build, so a new release replaces the old saved files. */
const VERSION = "72330f16dee6";
const CACHE = "clockwork-" + VERSION;
const SCOPE = new URL(self.registration.scope).pathname;
const SHELL = ["./", "index.html", "firebase-config.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/favicon-48.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("clockwork-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const NEVER = /firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|firebaseinstallations|google-analytics/;
const KEEP = /^https:\/\/(www\.gstatic\.com\/firebasejs\/|fonts\.googleapis\.com\/|fonts\.gstatic\.com\/)/;

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || NEVER.test(req.url)) return;
  const same = url.origin === location.origin;
  // The Dev page lives under this one (…/dev/) and has its own worker; leave it alone.
  if (same && url.pathname.startsWith(SCOPE + "dev/")) return;
  if (same && !url.pathname.startsWith(SCOPE)) return;

  if (req.mode === "navigate" || (same && /(\/|index\.html|firebase-config\.js)$/.test(url.pathname))) {
    e.respondWith(networkFirst(req, req.mode === "navigate" ? "index.html" : null));
  } else if (same || KEEP.test(req.url)) {
    e.respondWith(cacheFirst(req));
  }
});

async function networkFirst(req, fallback) {
  const cache = await caches.open(CACHE);
  try {
    const res = await Promise.race([fetch(req), new Promise((_, no) => setTimeout(() => no(new Error("slow")), 6000))]);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    return (await cache.match(req, { ignoreSearch: true })) || (fallback && await cache.match(fallback)) || Response.error();
  }
}
async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
  return res;
}