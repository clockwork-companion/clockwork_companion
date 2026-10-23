# Clockwork Companion — website

Character sheets, Karma, vitals, gear and the GM initiative deck for *Clockwork: Tales of Steam and Magick*.
Players open the site, type the table password once, and everyone shares the same characters live.

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
4. Click the gear icon → **Project settings** → **General**. Under **Your apps** click the web icon **</>**,
   give it a nickname, leave Hosting unticked, and click **Register app**. Copy the values it shows
   (`apiKey`, `authDomain`, `projectId`, …) into `firebase-config.js`.

### 2. GitHub Pages (the link), about 5 minutes
1. On GitHub create a new **public** repository, for example `clockwork`.
2. **Add file → Upload files**, drag in `index.html`, `firebase-config.js`, `firestore.rules` and this README, and commit.
3. **Settings → Pages**. Under *Build and deployment* choose **Deploy from a branch**, branch **main**, folder **/ (root)**, and save.
4. After a minute the site is live at `https://<your-username>.github.io/clockwork/`.

### 3. Open your table
1. Visit the link, type the password you want for your table, and click **Open table**. As the first person in,
   you'll be offered **Create a new table with this password**. Click it.
2. Share the link and the password with your players. Each device asks for the password once.
3. To bring over characters from the claude.ai version: there, open **GM table → Table backup → Download backup**.
   On the new site, **GM table → Table backup → Restore from backup** and pick that file.

## Good to know
- Anyone with the link **and** the password can view and edit every character at the table, like a shared document.
  To lock someone out later, start a new table with a new password and restore a backup into it.
- Passwords are not case-sensitive. "Leave" next to *Shared table* at the top signs a device out of the table.
- Portraits are shrunk to small images and stored in the database, so no file storage (or billing) is needed.
- To update the app later, replace `index.html` in the repository with the new version. Keep your `firebase-config.js`.
