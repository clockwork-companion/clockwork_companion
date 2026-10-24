# Clockwork Companion — website

**Live site: [vansinan101.github.io/clockwork_companion](https://vansinan101.github.io/clockwork_companion/)**  
**Dev page: [vansinan101.github.io/clockwork_companion/dev](https://vansinan101.github.io/clockwork_companion/dev/)** (test build from the Dev branch)

Character sheets, Karma, vitals, gear and the GM initiative deck for *Clockwork: Tales of Steam and Magick*.
Players sign in with a username and password. The GM sees every character and runs the initiative deck;
players see only the characters (and companions) the GM gives them, plus any they create themselves.

## Install it as an app
The site can be installed like an app, and it opens even with a weak or no connection (sheets you've opened
before are kept on the device, and changes made offline are sent when you're back online).
- **Easiest:** the install icon (an arrow into a tray) at the top right of the sign-in screen, or next to **Sign out**.
  It only shows when your browser can install the site.
- **Android (Chrome):** menu ⋮ → **Install app** (or **Add to Home screen**).
- **iPhone / iPad (Safari):** Share → **Add to Home Screen**.
- **Computer (Chrome or Edge):** the install icon at the right end of the address bar.

When a new version is published, the app shows "A new version of the app is ready" with a **Reload** button.

## Files
- `index.html` — the whole app.
- `firebase-config.js` — your Firebase settings (fill this in once).
- `firestore.rules` — the database rules to paste into Firebase.
- `manifest.webmanifest`, `sw.js`, `icons/` — what makes it installable and work offline.
- `egg/` — art and sound for a hidden game (free CC0 assets; sources in `egg/furnace/CREDITS.md`).

## One-time setup

### 1. Firebase (the shared save), about 10 minutes
1. Go to https://console.firebase.google.com and sign in with a Google account. Click **Create a project**, give it a name
   (for example `clockwork-companion`), and turn Google Analytics off. No credit card is needed.
2. In the left menu open **Build → Firestore Database → Create database**. Pick a location near your players
   (for example `eur3 (europe-west)`), then **Start in production mode**.
3. Open the **Rules** tab, replace everything there with the contents of `firestore.rules`, and click **Publish**.
4. Turn on usernames: **Security → Authentication → Get started → Sign-in method → Email/Password → Enable → Save**.
   (Players never type an email; the app makes one up from their username.)
5. Click the gear icon → **Project settings** → **General**. Under **Your apps** click the web icon **</>**,
   give it a nickname, leave Hosting unticked, and click **Register app**. Copy the values it shows
   (`apiKey`, `authDomain`, `projectId`, …) into `firebase-config.js`.

### 2. GitHub Pages (the link), about 5 minutes
1. On GitHub create a new **public** repository, for example `clockwork`.
2. **Add file → Upload files**, drag in `index.html`, `firebase-config.js`, `firestore.rules` and this README, and commit.
3. **Settings → Pages**. Under *Build and deployment* choose **Deploy from a branch**, branch **main**, folder **/ (root)**, and save.
4. After a minute the site is live at `https://<your-username>.github.io/clockwork/`.

### 3. Open your table
1. Visit the link, click **New player**, choose a username and password, and type the table password you want.
   As the first person in, you'll be offered **Create a new table with this password**. Click it: you're the GM.
   (A table made with an earlier version asks you to **claim** it instead. Do that before your players sign up.)
2. Share the link and the table password. Each player clicks **New player** once; after that they just sign in,
   on any device, with their username and password.
3. On the **GM table**, *Players at the table* lists everyone. Give each player their characters, make someone else
   a GM, or remove a player.
4. To bring over characters from the claude.ai version: there, open **GM table → Table backup → Download backup**.
   On the new site, **GM table → Table backup → Restore from backup** and pick that file.

## Good to know
- Usernames and the table password are not case-sensitive; account passwords are.
- There's no password reset (no real email). A player who forgets theirs makes a new account, and the GM gives
  their characters to it.
- **Sign out** is at the top right.
- Portraits are shrunk to small images and stored in the database, so no file storage (or billing) is needed.
- To update the app later, replace `index.html` in the repository with the new version. Keep your `firebase-config.js`.

## Branches and the Dev page
- **main** is the live site. Change it only when a release is ready.
- **Dev** is the shared test branch. Merge work into Dev to try it on the Dev page before it goes to main.
- **SinanDev**, **BedoDev**, … are personal branches. Start them from main, and pull main into them regularly.

**Pages:**
- Live site: `https://vansinan101.github.io/clockwork_companion/`
- Dev page: `https://vansinan101.github.io/clockwork_companion/dev/` (red **DEV** ribbon in the corner).

The Dev page uses the same database as the live site. Join it with a **test table password**, so real characters are never touched while testing.

**How it's published:** `.github/workflows/pages.yml` runs on every push to main or Dev.
1. It copies main to the site root.
2. It builds Dev from `src/` into `/dev/`.
3. It pushes the result to the `gh-pages` branch.

One-time switch: **Settings → Pages → Deploy from a branch → `gh-pages` / (root)**. Until that switch, the live site keeps serving main directly, exactly as before. Once switched, the workflow file must also be on main, so the live site updates when main does.

## Source
The app is built from `src/` with `python3 src/build.py --web .` (add `--dev` for a Dev build). Edit the files in `src/`, never `index.html` by hand.
- **Code:** `app.js`, `genesis.js`, `gm.js`.
- **Data:** `rules.js`, `rules-info.js`, `skills-data.js`, `skill-tables.js`.
- **Styles and themes:** `app.css`.
- **Website-only parts:** `web-backend.js`, `web/`.
