# Clockwork Companion — website

Character sheets, Karma, vitals, gear and the GM initiative deck for *Clockwork: Tales of Steam and Magick*.
Players sign in with a username and password. The GM sees every character and runs the initiative deck;
players see only the characters (and companions) the GM gives them, plus any they create themselves.

## Files
- `index.html` — the whole app.
- `firebase-config.js` — your Firebase settings (fill this in once).
- `firestore.rules` — the database rules to paste into Firebase.

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
