/* A tiny in-memory stand-in for the Firebase compat SDK (app, auth, firestore), for headless tests of the website
   build. Load it instead of the three gstatic scripts. Before the page loads, set:
     window.__MOCK_USER = { uid, email }       // signed-in user (omit for signed out)
     window.__MOCK_SEED = { "path/to/doc": {…} } // starting documents
   window.__mockStore (a Map of path -> data) shows what the page wrote. Only what the app uses is implemented. */
(() => {
  const clone = v => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  const store = (window.__mockStore = new Map(Object.entries(window.__MOCK_SEED || {}).map(([k, v]) => [k, clone(v)])));
  const listeners = new Set();
  const changed = () => setTimeout(() => listeners.forEach(l => l()), 0);
  const docSnap = path => ({ id: path.split("/").pop(), exists: store.has(path), data: () => clone(store.get(path)), ref: docRef(path) });
  function docRef(path) {
    return {
      id: path.split("/").pop(), path,
      get: async () => docSnap(path),
      set: async (d, o) => { store.set(path, o && o.merge ? Object.assign({}, store.get(path), clone(d)) : clone(d)); changed(); },
      update: async d => { if (!store.has(path)) throw { code: "not-found" }; store.set(path, Object.assign({}, store.get(path), clone(d))); changed(); },
      delete: async () => { store.delete(path); changed(); },
      onSnapshot(cb) { const l = () => cb(docSnap(path)); listeners.add(l); setTimeout(l, 0); return () => listeners.delete(l); },
    };
  }
  const field = (data, f) => f.split(".").reduce((x, k) => (x == null ? x : x[k]), data);   // "from.uids" reads a nested field, as Firestore does
  const pass = (data, [f, op, v]) => { const x = field(data, f); return op === "array-contains" ? Array.isArray(x) && x.includes(v) : op === "==" ? x === v : true; };
  function query(path, filters) {
    const snap = () => {
      const docs = [...store.keys()].filter(k => k.startsWith(path + "/") && !k.slice(path.length + 1).includes("/") && filters.every(f => pass(store.get(k), f))).map(docSnap);
      return { docs, size: docs.length, empty: !docs.length, forEach: fn => docs.forEach(fn) };
    };
    return {
      where: (f, op, v) => query(path, [...filters, [f, op, v]]), orderBy: () => query(path, filters), limit: () => query(path, filters),
      doc: id => docRef(`${path}/${id || Math.random().toString(36).slice(2)}`),
      get: async () => snap(),
      onSnapshot(cb) { const l = () => cb(snap()); listeners.add(l); setTimeout(l, 0); return () => listeners.delete(l); },
    };
  }
  const fsApi = { doc: docRef, collection: p => query(p, []), enablePersistence: () => Promise.resolve() };
  const authApi = {
    currentUser: window.__MOCK_USER || null,
    onAuthStateChanged(cb) { setTimeout(() => cb(authApi.currentUser), 0); return () => {}; },
    signInWithEmailAndPassword: async () => ({ user: authApi.currentUser }),
    createUserWithEmailAndPassword: async () => ({ user: authApi.currentUser }),
    signOut: async () => { authApi.currentUser = null; },
  };
  window.firebase = { apps: [], initializeApp() { this.apps.push({}); return {}; },
    firestore: Object.assign(() => fsApi, { FieldValue: { serverTimestamp: () => Date.now() } }), auth: () => authApi };
})();
