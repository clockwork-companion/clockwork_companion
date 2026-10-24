# Clockwork Companion: working rules for every Claude on this repo

This repo is the **Clockwork Companion**, a web character sheet and GM tool for *Clockwork: Tales of Steam and Magick*,
a homebrew tabletop RPG. Three people work on it, each with their own Claude. Read this whole file before changing
anything. When this file and an instruction from your own person disagree, ask them before acting.

- **People:** Sinan (owner of the repo, co-GM), Bedo, and one more collaborator. Address them in plain language.
- **Live site:** https://vansinan101.github.io/clockwork_companion/
- **Dev page:** https://vansinan101.github.io/clockwork_companion/dev/ (red DEV ribbon)

## 1. Branches: how work moves

```
your feature branch ──PR──▶ Dev ──(tested on the Dev page)──PR──▶ main ──▶ live site
```

- **main is production.** Players use it during sessions. **Never push to main directly**, never force-push it,
  and never merge into it without your person explicitly saying "release" / "merge to main". Changes reach main
  only by a pull request from Dev.
- **Dev is the shared test branch.** Merge into Dev through a pull request, then check the result on the Dev page.
  Don't force-push Dev.
- **Work on a branch of your own**, made from the latest main: a personal branch (`SinanDev`, `BedoDev`) or,
  better, one branch per feature (`sinan/initiative-dock`, `bedo/crafting`). Small branches are easy to review and to drop.
- **Pull main into your branch before each work session** and before opening a PR. Resolve conflicts on your branch, not on Dev.
- **Never push to someone else's branch** unless they asked you to.
- **One PR per feature.** The PR description says, in plain words, what changed for the user and how to test it.
- When main changes and Dev is behind, bring Dev up to main (a fast-forward or a merge PR) so the Dev page
  isn't testing something older than the live site.

## 2. Publishing (don't break this)

- `.github/workflows/pages.yml` runs on every push to **main** or **Dev**.
  - It builds main from `src/` into the site root (the committed `index.html` is not what gets published).
  - It builds Dev from `src/` with `--dev` into `/dev/`.
  - It force-pushes the result to the **`gh-pages`** branch, which GitHub Pages serves.
- **Never edit `gh-pages` by hand.** It is rebuilt from scratch on every run.
- **Keep `pages.yml` on both main and Dev.** If it's missing from one of them, pushes to that branch stop updating the site.
- `firebase-config.js` at the root holds the real Firebase settings. **Never overwrite it** with the template in `src/web/`.

## 3. Source and build

**Edit only `src/`. Never edit the root `index.html` by hand.** `index.html` is a built file, made by bundling the
files in `src/` together. If two branches both change it, Git can't merge it sensibly.

```
python3 src/build.py --web .          # rebuild the root index.html for the website (do this before committing)
python3 src/build.py --web DIR --dev  # a Dev-marked build into DIR
python3 src/build.py                  # src/clockwork-companion.html, the claude.ai artifact version
```

**If `index.html` conflicts in a merge:** resolve the `src/` files, rebuild, and commit the rebuilt file.

| File in `src/` | What it holds |
| --- | --- |
| `app.css` | All styles and every theme (keyed on `html[data-skin="…"]`). It begins with the page `<title>`. |
| `rules.js` | The rules engine `CW`: attributes, Karma costs, caps, vitals, encumbrance, armor, rests, `normalize`, Tabletop export/import. No UI. |
| `skills-data.js`, `skill-tables.js` | Every skill, perk and table extracted from the rulebook. |
| `rules-info.js` | The plain-language rules shown when a section heading is clicked (`RULES_INFO`). |
| `app.js` | The UI (Preact + htm, no build step): sheet, vitals, Skills & Talents, gear, tabletop, themes. |
| `craft.js` | The Crafting tab: one section per craft, and the Powdertinkering bench (munition drawings with callouts, forge animation, supplies, ledger). |
| `craft-armor.js` | Crafting → Armor upkeep: the Repair and Craft benches (suit drawings on a stand, hammer and forge animations). |
| `genesis.js` | Guided character creation. |
| `gm.js` | GM table: players and roles, backups, the initiative deck. |
| `web-backend.js`, `web/` | Website-only parts: sign-in, Firestore storage, the rules file, the README template. |
| `egg.html`, `egg-furnace.html` | Hidden mini-games (website only). They are self-contained, so don't couple app code to them. |
| `vendor/` | Preact 10.19.3 and htm 3.1.1, inlined into the website build. |
| `clockwork-sheet.lua` | The Tabletop Simulator sheet. It exchanges a JSON code with the app's Tabletop tab. |

## 4. Data: never break a saved character

All builds (live, Dev, the claude.ai artifact) share **one Firestore database**. Characters saved by an older
version must keep working in a newer one, and the live site must survive data written by Dev.

- **New fields:** default them in `blankCharacter()` and repair them in `normalize()` (in `rules.js`). Never assume a field exists.
  - Example: Stamina and Exhaustion were merged by taking the higher value in `normalize()`. `staminaLost` is
    still written as a mirror because the TTS sheet reads it.
- **Renaming or removing a field** needs a migration in `normalize()`, plus a note in the PR.
- **Database rules:** `src/web/firestore.rules` is the source. A change to it only takes effect when someone pastes it
  into the Firebase console. Say so in the PR, and remember that it affects the live site immediately.
- **Testing on the Dev page:** join a **test table** (a table password nobody plays on), never the real campaign table.
- **Karma pool invariant:** pool = unspent + spent. Free edit moves the pool with every change (`freePoolDelta`);
  keep that true in anything that touches Karma.

## 5. Design rules (agreed with Sinan)

- **Less is more.** Add the fewest controls that do the job. Don't add a drop-down where an existing list can carry the option.
- **Plain language** in every label, hint and message: short sentences, no jargon, no internal names.
- **Mouse convention:**
  - Left-click adds or raises; right-click removes or lowers; long-press does the same as right-click on phones.
  - This covers pips, attribute cells, the Stamina bar, vital bars and wound buttons.
  - Hover shows what a click will do, and its Karma cost.
- **Section headings with real rules behind them** open a rules side panel (the `Head` component plus `RULES_INFO`).
  Add new topics to `rules-info.js` rather than writing long help text inline.
- **Cards for things that have a set-up step:** weapons and talents have an edit mode and a compact "finished" card.
- **Themes live only in `app.css`.**
  - Each theme is a block of CSS variables plus overrides, written as `:root[data-skin="name"] …` so it wins on specificity.
  - Fonts load only when the theme is picked (the `SKINS` list in `app.js`).
  - Every theme must keep drop-downs readable and work at 390 px wide with no sideways scrolling.
  - "Extended" themes may restyle more heavily. Don't add decorative margin artwork; it was removed on purpose.
  - **One symbol per heading.** If a theme adds a symbol to headings and another symbol is already there in every
    theme (like the book icon that marks a heading with rules), the theme's symbol **replaces** it rather than sitting beside it.
- **Rulebook first, house rules over the book.**
  - When a rule is unclear, don't invent one: ask your person.
  - Mark the app's own interpretation with a `{ note }` in `rules-info.js`.
  - House rules so far:
    - Attributes run 0–20 with 10 as the median.
    - A broken attribute's ceiling is its starting value + 10.
    - Attribute Karma is counted above 10, or above the starting value if it started broken.
    - A skill holds one point per attribute point above 10.
    - Initiative is a shuffled deck: one card each, plus a second card for Dexterity above 15.
- When two people's designs for the same thing differ, put both on Dev, let the people choose, and record the
  decision here, so later agents don't undo it.

## 6. Before you open a pull request

1. Pull the latest main into your branch.
2. Rebuild: `python3 src/build.py --web .` (and `python3 src/build.py` if the artifact should match).
3. Test in a browser, at both a desktop width and 390 px:
   - the screens you changed, in at least the default theme and one dark theme;
   - the browser console has no errors;
   - the page doesn't scroll sideways.
4. Commit with a message saying what changed for the user. Keep the build output and the `src/` change in the same commit.
5. Open the PR into **Dev**, not main.

## 7. Decisions log

Add one line per settled design decision: date, decision, who decided.

- **2026-10-24:** Stamina lost and Exhaustion are one track (10 = death; the Conditioning 5 reading is still to confirm). Sinan.
- **2026-10-24:** Power armour theme is a high-tech HUD: brushed steel and copper, digital type, nixie numbers. No brass, no margin art. Sinan.
- **2026-10-24:** main changes only through a PR from Dev. Dev is tested on `/dev/`. Sinan.
- **2026-10-24:** Cyberpunk is an Extended theme, futuristic rather than retro: no CRT scanlines. Its design language is Greek mythology (temple-column tabs, Greek-letter tags; Ω replaces the rules book icon). Headings and tabs use Rajdhani, with Oxanium elsewhere. No gold Greek-key dividers. The Blackwall at the bottom is alive: it drifts, breathes and ripples, but subtly. Sinan.
- **2026-10-24:** Crafting is its own tab with one section per craft; each bench is an illustrated item with callout labels and an animated button under it. Utku.
- **2026-10-24:** Armor repair: the Repair Count is capped at 10 dice. Utku.
- **2026-10-24:** Armor crafting (not written in the 2020.1 book) follows the book's weapon crafting, with armor extras (+1 AV −10%, +5 Soak −5%); every change is marked in `rules-info.js`. Utku.
- **2026-10-24:** Mossheart is an Extended theme for Utku's character Batbayar: a mossy, whimsical night forest (vines curling round section corners, leaf sprigs on headings, berry pips, fireflies) over a violet darkness that creeps up from the bottom of the screen and sometimes opens its eyes. Broken attributes take the darkness's violet. Utku.
