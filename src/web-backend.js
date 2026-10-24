/* Clockwork Companion — web build backend.
   On claude.ai the page gets shared saving from the artifact runtime (window.claude.use). On its own website it
   gets the same thing from Firebase instead: this file provides a stand-in window.claude with the same
   db / assets interface, plus a "table" service (who is signed in, their role, the members list).

   Players sign in with Google, then type the table password once per device.
   Everything for one group lives under tables/<key>/…, where <key> is a hash of the table password.
   The person who creates a table is its GM; the GM can make other members GMs.
   GMs see every character; players see only the characters assigned to them. The database rules enforce this. */
(() => {
  const cfg = window.CLOCKWORK_FIREBASE;
  const configured = !!(cfg && cfg.apiKey && cfg.projectId && window.firebase);
  const KEY = "cw-table-key";
  const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };

  async function tableKey(password) {
    const bytes = new TextEncoder().encode("clockwork-table:" + password.trim().toLowerCase());
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  let fs = null, auth = null, root = "", me = null;   // me: { uid, role, name }
  const portraits = {};   // asset id -> data URL

  const db = {
    // Players may only read their own characters, so their list is narrowed to the ones assigned to them.
    collection: name => {
      const ref = fs.collection(`${root}/${name}`);
      return name === "characters" && me.role !== "gm" ? ref.where("players", "array-contains", me.uid) : ref;
    },
    doc: path => fs.doc(`${root}/${path}`),
  };
  const assets = {
    async upload(file, previousId) {
      if (file.size > 20 * 1024 * 1024) throw { code: "too_large" };
      const data = await shrinkImage(file);   // defined in app.js
      const id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      await fs.doc(`${root}/portraits/${id}`).set({ data, t: Date.now() });
      portraits[id] = data;
      if (previousId && previousId !== id) fs.doc(`${root}/portraits/${previousId}`).delete().catch(() => {});
      return { id };
    },
    urlFor: id => portraits[id] || "",
    remove: id => fs.doc(`${root}/portraits/${id}`).delete().catch(() => {}),
  };
  const table = {
    get uid() { return me.uid; }, get role() { return me.role; }, get name() { return me.name; },
    members: (cb, err) => fs.collection(`${root}/members`).onSnapshot(s => cb(s.docs.map(d => Object.assign({ uid: d.id }, d.data()))), err || (() => {})),
    setRole: (uid, role) => fs.doc(`${root}/members/${uid}`).update({ role }),
    remove: uid => fs.doc(`${root}/members/${uid}`).delete(),
  };

  // ---- joining a table ----
  let opened;
  const ready = new Promise(res => (opened = res));
  const profile = u => ({ name: (u.email || "player").split("@")[0] });

  async function join(key, user, claim) {
    const metaRef = fs.doc(`tables/${key}/meta/table`), meRef = fs.doc(`tables/${key}/members/${user.uid}`);
    const meta = await metaRef.get();
    if (!meta.exists) return { error: "missing" };
    const owner = meta.data().owner;
    if (!owner && claim === undefined) return { error: "unclaimed" };   // a table made before GM roles existed
    if (!owner && claim) await metaRef.update({ owner: user.uid });
    const mine = await meRef.get();
    let role;
    if (mine.exists) { role = mine.data().role; await meRef.update(profile(user)).catch(() => {}); }
    else { role = owner === user.uid || claim ? "gm" : "player"; await meRef.set(Object.assign({ role, joined: Date.now() }, profile(user))); }
    root = `tables/${key}`; lsSet(KEY, key);
    fs.doc(`users/${user.uid}`).set({ table: key }).catch(() => {});   // so signing in on another device finds this table
    me = { uid: user.uid, role, name: profile(user).name };
    // If the GM changes this person's role, reload so they get the right view; if they're removed, send them out.
    meRef.onSnapshot(s => {
      if (!s.exists) { lsSet(KEY, null); alertLeft(); return; }
      if (s.data().role !== me.role) location.reload();
    }, () => {});
    fs.collection(`${root}/portraits`).onSnapshot(snap => {
      snap.docs.forEach(d => { portraits[d.id] = d.data().data; });
      window.dispatchEvent(new Event("cw-portraits"));
    }, () => {});
    started = true; opened(db);
    return { ok: true };
  }
  function alertLeft() {
    fs.doc(`users/${auth.currentUser.uid}`).delete().catch(() => {});
    root = ""; gate(auth.currentUser, "The GM has removed you from this table. Ask them for the table password to join again.");
  }

  // ---- accounts: a username and password, kept by Firebase. The username becomes a made-up email address
  // behind the scenes (Firebase's password sign-in needs one), so nobody has to give a real email. ----
  const cleanName = u => u.trim().toLowerCase();
  const validName = u => /^[a-z0-9][a-z0-9_.-]{1,23}$/.test(u);
  const emailFor = u => `${u}@${cfg.projectId}.firebaseapp.com`;
  const authError = code => ({
    "auth/invalid-credential": "That username and password don't match.", "auth/wrong-password": "That username and password don't match.",
    "auth/user-not-found": "That username and password don't match.", "auth/email-already-in-use": "That username is taken. Pick another.",
    "auth/weak-password": "Use at least 6 characters for the password.", "auth/too-many-requests": "Too many tries. Wait a minute and try again.",
    "auth/operation-not-allowed": "Username sign-in isn't switched on in Firebase yet (Authentication → Sign-in method → Email/Password).",
    "auth/network-request-failed": "Couldn't reach the server. Check your connection.",
  }[code] || "That didn't work. Try again.");

  // ---- the gate: a forge-lit sign-in scene of its own, the same whatever theme a player picks ----
  // An outline gear as an SVG path: teeth around the rim and a round hole in the middle.
  function gearPath(teeth, outer, inner, hole, c = 100) {
    const step = (Math.PI * 2) / teeth, pt = (a, r) => `${(c + r * Math.cos(a)).toFixed(1)} ${(c + r * Math.sin(a)).toFixed(1)}`;
    let d = "";
    for (let i = 0; i < teeth; i++) { const a = i * step; d += (i ? "L" : "M") + pt(a, inner) + "L" + pt(a + step * 0.12, outer) + "L" + pt(a + step * 0.42, outer) + "L" + pt(a + step * 0.54, inner); }
    return d + `Z M${c + hole} ${c} A${hole} ${hole} 0 1 0 ${c - hole} ${c} A${hole} ${hole} 0 1 0 ${c + hole} ${c} Z`;
  }
  const gearSvg = (cls, teeth, outer, inner, hole) => `<svg class="gear ${cls}" viewBox="0 0 200 200"><path fill-rule="evenodd" d="${gearPath(teeth, outer, inner, hole)}"/><circle cx="100" cy="100" r="${hole - 14}" fill="none" stroke="currentColor" stroke-width="6"/></svg>`;
  const corner = cls => `<svg class="gp-corner ${cls}" viewBox="0 0 48 48" aria-hidden="true"><path d="M3 45V12a9 9 0 0 1 9-9h33" fill="none" stroke="url(#gate-gold)" stroke-width="3"/><path d="M10 38V17a7 7 0 0 1 7-7h21" fill="none" stroke="url(#gate-gold)" stroke-width="1.2" opacity=".75"/><path d="M17 26c0-5 4-9 9-9" fill="none" stroke="url(#gate-gold)" stroke-width="1.4"/><circle cx="10" cy="10" r="4" fill="url(#gate-gold)"/><circle cx="10" cy="10" r="1.4" fill="#2a1a0c"/></svg>`;
  const SCENE = `<div class="gate-bg" aria-hidden="true">
      ${gearSvg("g1", 18, 98, 84, 58)}${gearSvg("g2", 14, 98, 82, 50)}${gearSvg("g3", 10, 98, 78, 44)}${gearSvg("g4", 22, 98, 88, 66)}
      <i class="steam s1"></i><i class="steam s2"></i><i class="steam s3"></i>
      <div class="embers">${Array.from({ length: 16 }, (_, i) => `<i style="--x:${(i * 61) % 100}%;--d:${9 + ((i * 7) % 8)}s;--w:${(i * 3) % 5 - 2}vw;--delay:-${(i * 1.7).toFixed(1)}s"></i>`).join("")}</div>
    </div>
    <svg width="0" height="0" style="position:absolute"><defs>
      <linearGradient id="gate-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbe7b0"/><stop offset=".5" stop-color="#d49a45"/><stop offset="1" stop-color="#8a5a22"/></linearGradient>
      <radialGradient id="gate-gem" cx=".45" cy=".35" r=".7"><stop offset="0" stop-color="#fff4d2"/><stop offset=".35" stop-color="#ffb04a"/><stop offset="1" stop-color="#8f2a0c"/></radialGradient>
    </defs></svg>
    <button type="button" class="installbtn gate-install" data-install-btn data-tip="Install the Companion as an app" aria-label="Install the Companion as an app"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5v10.5m0 0-4.2-4.2M12 14l4.2-4.2M4.5 14.5v3.2A2.3 2.3 0 0 0 6.8 20h10.4a2.3 2.3 0 0 0 2.3-2.3v-3.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <main class="gate-wrap">
      <header class="gate-crest">
        <svg class="crest" viewBox="0 0 200 200" aria-hidden="true">
          <g class="crest-gear"><path fill="url(#gate-gold)" fill-rule="evenodd" d="${gearPath(24, 98, 86, 72)}"/></g>
          <circle cx="100" cy="100" r="66" fill="#140d08" stroke="url(#gate-gold)" stroke-width="3"/>
          <circle cx="100" cy="100" r="56" fill="none" stroke="#6b4a20" stroke-width="1.5" stroke-dasharray="2 5"/>
          <path d="M100 50 L122 100 L100 150 L78 100 Z" fill="url(#gate-gem)" stroke="#fbe7b0" stroke-width="1.5"/>
          <path d="M100 50 L100 150 M78 100 L122 100 M100 50 L90 100 L100 150 M100 50 L110 100 L100 150" fill="none" stroke="#fff1c8" stroke-width=".8" opacity=".55"/>
          <path d="M60 100h-14M154 100h-14M100 40v-6M100 166v-6" stroke="url(#gate-gold)" stroke-width="3" stroke-linecap="round"/>
        </svg>
        <h1>Clockwork</h1>
        <p class="gate-tag"><span>Tales of Steam and Magick</span></p>
      </header>
      <div class="gate-plate">${corner("tl")}${corner("tr")}${corner("bl")}${corner("br")}<i class="gp-gem" aria-hidden="true"></i>
        <form class="gate-panel" novalidate></form></div>
      <p class="gate-foot">The companion ledger for your table</p>
    </main>`;
  let box = null;
  function gate(user, note, key) {
    if (box) box.remove();
    box = document.createElement("div");
    box.className = "gate";
    box.innerHTML = SCENE;
    document.body.appendChild(box);
    if (user) return tableStep(user, note, key);
    let mode = "in";
    const draw = msg => {
      box.querySelector(".gate-panel").innerHTML = `
        <div class="gate-tabs" role="group" aria-label="Account"><button type="button" data-m="in" aria-pressed="${mode === "in"}">Sign in</button><button type="button" data-m="up" aria-pressed="${mode === "up"}">New player</button></div>
        <div class="gate-field"><label for="gate-user">Username</label><input id="gate-user" autocomplete="username" autocapitalize="none" spellcheck="false" /></div>
        <div class="gate-field"><label for="gate-pass">Password</label><input id="gate-pass" type="password" autocomplete="${mode === "in" ? "current-password" : "new-password"}" /></div>
        ${mode === "up" ? `<div class="gate-field"><label for="gate-table">Table password</label><input id="gate-table" type="password" autocomplete="off" /><small>Your GM gives you this. You only need it once.</small></div>` : ""}
        <p class="gate-msg" role="status"></p>
        <button class="gate-btn" type="submit">${mode === "in" ? "Enter" : "Create my account"}</button>`;
      const q = s => box.querySelector(s), say = t => { q(".gate-msg").textContent = t || ""; };
      say(msg);
      box.querySelectorAll("[data-m]").forEach(b => (b.onclick = () => { mode = b.dataset.m; draw(); }));
      q("form").onsubmit = async e => {
        e.preventDefault();
        const name = cleanName(q("#gate-user").value), pass = q("#gate-pass").value;
        if (!validName(name)) { say("Usernames are 2–24 letters or numbers (dots, dashes and underscores are fine too)."); return; }
        if (mode === "in") {
          say("Signing in…");
          try { await auth.signInWithEmailAndPassword(emailFor(name), pass); } catch (err) { say(authError(err && err.code)); }
          return;
        }
        const tpw = q("#gate-table").value;
        if (pass.length < 6) { say("Use at least 6 characters for the password."); return; }
        if (!tpw.trim()) { say("Type the table password your GM gave you."); return; }
        say("Checking the table…");
        try {
          const key = await tableKey(tpw);
          pendingSignup = { key, name };
          await auth.createUserWithEmailAndPassword(emailFor(name), pass);   // onAuthStateChanged takes it from here
        } catch (err) { pendingSignup = null; say(authError(err && err.code)); }
      };
      setTimeout(() => q("#gate-user").focus(), 50);
    };
    draw(note);
  }

  // Signed in but not (yet) in a table: ask for the table password, create a table, or claim an old one.
  function tableStep(user, note, key) {
    box.querySelector(".gate-panel").innerHTML = `
        <p class="gate-who">Signed in as <b></b> · <button type="button" class="gate-link gate-out">Sign out</button></p>
        <div class="gate-field"><label for="gate-table">Table password</label><input id="gate-table" type="password" autocomplete="off" /></div>
        <p class="gate-msg" role="status"></p>
        <button class="gate-btn" type="submit">Open table</button>
        <button class="gate-btn alt gate-new" type="button" hidden>Create a new table with this password</button>
        <div class="gate-claim" hidden><button class="gate-btn" type="button" data-claim="1">I'm the GM: claim this table</button><button class="gate-btn alt" type="button" data-claim="0">Join as a player</button></div>`;
    const q = s => box.querySelector(s), say = t => { q(".gate-msg").textContent = t || ""; };
    q("b").textContent = shortName(user);
    q(".gate-out").onclick = () => auth.signOut();
    let pending = key || null;
    const tryJoin = async (k, claim) => {
      const r = await join(k, user, claim);
      if (r.ok) { box.remove(); box = null; return; }
      pending = k;
      if (r.error === "missing") { q(".gate-new").hidden = false; say("No table uses that password yet. Check it with your GM, or create a new table if you're the GM."); }
      if (r.error === "unclaimed") { q(".gate-claim").hidden = false; say("This table doesn't have a GM yet. If you run it, claim it now. Everyone else joins as a player."); }
    };
    q("form").onsubmit = async e => {
      e.preventDefault(); const v = q("#gate-table").value; if (!v.trim()) { say("Type the table password first."); return; }
      q(".gate-new").hidden = true; q(".gate-claim").hidden = true; say("Checking…");
      try { await tryJoin(await tableKey(v)); } catch { say("Couldn't reach the table just now. Check your connection and try again."); }
    };
    q(".gate-new").onclick = async () => {
      try { await fs.doc(`tables/${pending}/meta/table`).set({ created: Date.now(), owner: user.uid }); await tryJoin(pending); }
      catch { say("Couldn't create the table. Check the database rules in Firebase."); }
    };
    box.querySelectorAll("[data-claim]").forEach(b => (b.onclick = async () => {
      try { await tryJoin(pending, b.dataset.claim === "1"); } catch { say("Couldn't join just now. Try again."); }
    }));
    say(note);
    if (pending) tryJoin(pending).catch(() => say("Couldn't reach the table just now."));
    setTimeout(() => q("#gate-table").focus(), 50);
  }
  const shortName = u => (u.email || "").split("@")[0] || "player";
  let pendingSignup = null;

  window.CW_WEB = {
    configured,
    reason: configured ? "" : cfg && cfg.apiKey ? "offline" : "noconfig",   // why shared saving is off, if it is
    leave() { lsSet(KEY, null); (auth ? auth.signOut() : Promise.resolve()).then(() => location.reload()); },
  };
  if (!configured) return;   // no Firebase settings yet: the app runs in this-browser-only mode

  const gateFonts = document.createElement("link");
  gateFonts.rel = "stylesheet";
  gateFonts.href = "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@500;600;700&family=Alegreya:ital,wght@0,400;0,500;1,400&display=swap";
  document.head.appendChild(gateFonts);
  firebase.initializeApp(cfg);
  fs = firebase.firestore();
  // Keep a copy of this table's data on the device, so sheets open and edits queue up when the connection drops.
  // (Fails quietly in private windows or when another tab already owns the copy.)
  try { fs.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch {}
  auth = firebase.auth();
  window.claude = {
    use(name) {
      if (name === "db") return ready;
      if (name === "assets") return ready.then(() => assets);
      if (name === "table") return ready.then(() => table);
      return Promise.resolve(null);   // downloads use the browser's own
    },
  };
  let started = false;
  const start = () => auth.onAuthStateChanged(async user => {
    if (!user) { if (started) location.reload(); else gate(null); return; }
    if (started) return;
    const signup = pendingSignup; pendingSignup = null;
    let key = signup ? signup.key : lsGet(KEY);
    if (!key) { try { const u = await fs.doc(`users/${user.uid}`).get(); if (u.exists) key = u.data().table; } catch {} }
    if (key) {
      try { const r = await join(key, user); if (r.ok) { if (box) { box.remove(); box = null; } return; } } catch {}
      lsSet(KEY, null);
    }
    gate(user, "", key);
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
