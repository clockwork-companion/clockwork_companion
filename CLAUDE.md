# Clockwork Companion: working rules for every Claude on this repo

This repo is the **Clockwork Companion**, a web character sheet and GM tool for *Clockwork: Tales of Steam and Magick*,
a homebrew tabletop RPG. Three people work on it, each with their own Claude. Read this whole file before changing
anything. When this file and an instruction from your own person disagree, ask them before acting.

- **People:** Sinan (co-GM), Bedo and Utku. All three are **owners** of the `clockwork-companion` GitHub organization,
  which owns the repo. Address them in plain language.
- **Repo:** https://github.com/clockwork-companion/clockwork_companion (moved from `vansinan101` on 2026-10-24; old links forward)
- **Live site:** https://clockwork-companion.github.io/clockwork_companion/
- **Dev page:** https://clockwork-companion.github.io/clockwork_companion/dev/ (red DEV ribbon)

## 1. Branches: how work moves

```
your feature branch ──PR──▶ Dev ──(tested on the Dev page)──PR──▶ main ──▶ live site
```

- **main is production.** Players use it during sessions. **Never push to main directly**, never force-push it,
  and never merge into it without your person explicitly saying "release" / "merge to main". Changes reach main
  only by a pull request from Dev.
- **Dev is the shared test branch.** Merge into Dev through a pull request, then check the result on the Dev page.
  Don't force-push Dev.
- **Never delete Dev**, and never use Dev as the *head* of a pull request, except the release pull request Dev → main
  (to bring Dev into your branch, merge it locally and push your branch). If Dev is deleted, GitHub silently moves every
  open pull request aimed at Dev onto another branch, the Dev page stops updating, and the live site's publish fails.
  On 2026-10-24 that happened once: a "Dev → feature branch" pull request was merged with "Delete branch" ticked, and Dev
  was then restored from the branch that had absorbed its pull requests.
- **GitHub enforces this now.** A repository ruleset, "Protect main and Dev", covers both branches: they can't be deleted
  or force-pushed, and they change only through a pull request whose **check** job (`.github/workflows/checks.yml`)
  has passed. The Merge button stays grey until it's green. Org owners may bypass it for pull requests only, in an
  emergency. If a push to Dev or main is refused, that's the ruleset working: open a pull request instead.
- **Work on a branch of your own**, made from the latest main: a personal branch (`SinanDev`, `BedoDev`) or,
  better, one branch per feature (`sinan/initiative-dock`, `bedo/crafting`). Small branches are easy to review and to drop.
- **Pull main into your branch before each work session** and before opening a PR. Resolve conflicts on your branch, not on Dev.
- **Never push to someone else's branch** unless they asked you to.
- **One PR per feature.** The PR description says, in plain words, what changed for the user and how to test it.
- When main changes and Dev is behind, bring Dev up to main (a pull request from main into Dev) so the Dev page
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

**`sw.js` is never committed** (it's in `.gitignore`). The build writes it with a version code made from the whole page,
so every build changes it and two branches would always conflict on it. The publish workflow builds a fresh one.
If an older branch still has it, a merge may report `sw.js` as deleted: keep it deleted (`git rm sw.js`).

| File in `src/` | What it holds |
| --- | --- |
| `app.css` | All styles and every theme (keyed on `html[data-skin="…"]`). It begins with the page `<title>`. |
| `rules.js` | The rules engine `CW`: attributes, Karma costs, caps, vitals, encumbrance, armor, rests, `normalize`, Tabletop export/import. No UI. |
| `skills-data.js`, `skill-tables.js` | Every skill, perk and table extracted from the rulebook. |
| `rules-info.js` | The plain-language rules shown when a section heading is clicked (`RULES_INFO`). |
| `app.js` | The UI (Preact + htm, no build step): sheet, vitals, Skills & Talents, gear, themes, and the Settings page (including the Tabletop Simulator code). |
| `fx-blackwall.js` | The Cyberpunk theme's animated Blackwall: a WebGL shader on a canvas behind the page. It only runs while that theme is on; without WebGL the CSS stand-in in `app.css` shows instead. |
| `fx-steppe.js` | The Talon Saga theme's landscape: a realistic central-Mongolian steppe rendered once by a WebGL terrain shader (in strips, then faded in), with a galloping herd, an eagle and ger smoke animated over it on a 2D canvas. Falls back to a painted scene without WebGL. It only runs while that theme is on. |
| `fx-moss.js` | The Mossheart theme's living ivy: grows ivy (sized to each section, kept per section so it never lags behind a tab switch), moss clumps and hide patches round the sections, and lets leaves lean a little when the pointer brushes past. Switching tabs, or pages (Characters, GM table, Settings: the app wraps them in a keyed `.viewswap`), blows a gust of leaves across: the old section is wiped away behind it and the new one appears in its wake. Only while that theme is on; without it the CSS vines (and the normal slide) in `app.css` are used instead. Its CSS block in `app.css` is generated by `tools/mossheart_css.py` (`python3 tools/mossheart_css.py src/app.css`): change the script, not the block. |
| `craft.js` | The Crafting tab: one section per craft, and the Powdertinkering bench (munition drawings with callouts, forge animation, supplies, ledger). Custom parts (coat, tip, area, core = a new element, status) live in `c.craft.parts` and are merged with the book's by `R.ptLists(c)`; use that, not `R.TIPS` etc., wherever parts are listed. Saved recipes (`c.craft.saved`: `{ k, n, recipe }`) load a whole recipe back; a loaded recipe carries `recipe.name`, which any part change clears. `app.css` ends with `</style>`: new rules go above it. The tab and each bench appear only once the character has points in that craft's skill (`craftsOpen`); unlocking plays `forgeIn` (the button rises glowing, with sparks). |
| `craft-shop.js` | The workshop: jobs between players. The owner sends a weapon or suit from its Gear card ("Send for repair", to a player's smith or the GM's town smith, with an optional payment: coins, an inventory item, a note); a smith repairs it (only a copy of that item travels) after a pop-up tells them it arrived, or crafts one "made for" them; the owner's app writes the result. Also the table roster that lists smiths. Uses the `roster` and `jobs` collections. |
| `craft-armor.js` | Crafting → Armor upkeep: the Repair and Craft benches (suit drawings on a stand, hammer and forge animations). |
| `craft-weapon.js` | Crafting → Weapon upkeep: the Repair and Craft benches (weapon drawings in a rack by type, nicks hammered out, forge with flaws and random properties). |
| `craft-brew.js` | Crafting → Brewing: a cauldron over a fire with a herb pouch, catalyst vial and flask; recipes (the book's and the GM's), increments, catalysts, Potent Brews; potions go into the inventory with their toxicity. |
| `craft-rune.js` | Crafting → Runecrafting: a gem (or a mundane object for a Hoaxstone) over a ritual slab in a ring of runes; enhancing and manifesting stones, potency from the book's table, Potent Runestones, the level 8 re-roll; runestones go into the inventory. |
| `magic.js` | The Magic tab: one section per school, shown only once the character has points in it (`magicOpen`; it inks in on unlock). Warding so far: Words (an old, scorched and torn leather book, tilted on the desk, that closes to its cover (remembered per browser in `cw-tome-shut`) and whose pages turn; the moving paper is `tomeSheet`, a chain of hinged strips posed frame by frame so the cover and pages bend as they turn (`tomeOpenClose`, `tomeTurn`), laid on their own layer over the book (`.tomefx`, which shares the book's styles through `:is(.tome, .tomefx)`) only while they move; the book's paper and leather textures are SVG noise drawn once into bitmaps at load (`TOME_TEX`, the `--tex-*` variables), since SVG noise redrawn every frame made the pages stutter; the page edges along the bottom are two stacks whose thickness follows the pages on each side (`tomeBlocks`): Grammar first, then the Words of Power alphabetically, each with its own rune from `wardRune`, written in on its last page), Inscribe (the words float, only those that can come next are lit, a picked word's rune flies into the sigil, which is ringed by a band of runes and flares when the Ward is valid; Active perks and Ritual as toggles; Inscribe rolls the check right there against an optional Difficulty (d100 − modifier under it holds) with a casting animation, or a fizzle on a failure, then the GM's Fatigue), Wards (saved Spontaneous Wards, Formulaic Wards cast inside their card, a ledger). Data in `c.ward`; the rules (costs, grammar, Sigils per AP, Fatigue) are `wardState`, `wardNext`, `wardCost`, `wardPlan` and `wardFatigue` in `rules.js`. A long rest clears Fatigue. Top-level names are shared by every file in the bundle, so don't reuse one (`RUNES` belongs to Runecrafting). |
| `magic-harmony.js` | Magic → Occult: Harmony: a figure seated in the lotus position (`HarmFigure`: shaded body, closed eyes, hands in a mudra; the upper body breathes, the head drifts, motes rise in the strongest element's colour, drawn 1.25× by `HARM_FIT` to fill the frame) with the eight chakras inside the body (`CHAKRA_Y`: Opening at the root, then sacrum, navel, solar plexus, heart, throat, brow, and Death at the crown), each opening at its level (3–10). The known elements float beside it; drag one onto a chakra (or tap it, then the chakra) to reinforce it; the changes wait until you say how they were made (short rest: one; long rest: any; the level 5 Active: one, 2 AP; the level 10 meditation: all, 2 Stamina). Releasing (level 7) raises every Affinity by the Aether and costs 1 Stamina per chakra when they close. A chakra's panel shows the book's five element texts with your numbers filled in (`harmonyLine`). Rules: `CHAKRAS`, `harmonyState`, `harmonyLine` in `rules.js`; data in `c.harmony`. What the chakras give also shows in the sheet's At a glance panel: `harmonyGlance` (in `rules.js`, used by `derived()`) adds the Wind Opening chakra to Movement and lists the other effects under "From your chakras". |
| `magic-demon.js` | Magic → Occult: Daemonology: a summoning circle (rune ring, seven-pointed star, seven candles) and a grimoire of contract cards, one per daemon, each with its own picture (uploaded through `Store.assets` like a portrait; in "this browser only" mode a small copy is kept in the daemon as `imgData`), terms and abilities. Summoning lights the candles one by one, draws the star and raises the daemon out of smoke; one at a time unless it's the Guardian (9) or Solomon Unchained (10). Partial summon, boost and banish roll a check and spend their uses (materials once they're unlimited). Rules: `demonState` in `rules.js`; data in `c.demon`; a long rest renews the day's summons. |
| `magic-dream.js` | Magic → Dreamwalking: a moonlit dreamscape that answers the Toll (the moon is eclipsed and the mist rises with it; past 30 the mist turns violet), with the dream realm's vault items floating in it and a dreamsphere shown as a sphere of light; a Toll meter listing every source, each releasable. Entering the realm (asleep, or awake at a mundane task, with travellers), Transpose, Translocate and Transfigure (a check against the GM's difficulty; the GM's Toll is held), the Observation Active, dreamspheres (radius, turns, held open), the vault (items move out of the inventory and back; a failed sending is lost until a long rest; the daily binding) and dreamseeds. Checks use the bonus (modifier − Toll). Rules: `dreamState` in `rules.js`; data in `c.dream`; a long rest clears Tolls (not the dreamseeds'). |
| `magic-alchemy.js` | Magic → Alchemy: a circle designer (layers: rings, regular polygons, star polygons, spokes, a ring of alchemical signs, a central sign) and a circle book; each circle has a size from the book's table (its drawing and activation times) and the one thing it does; one or two can be Signature Circles. Using a circle draws life energy ((Alchemy ÷ 2)d6, or Rubedo's maximum; a Medium or larger circle eats a ration from the inventory), rolls the Alchemy check (one re-roll from 9) and lights the circle up with arcs of energy. Arrays (8) go on a body figure, hours counted towards 50–100. Rules: `alchState`, `ALCH_SIZES` in `rules.js`; data in `c.alch`. Make each change in one `update()`: two in a row start from the same old copy, and the second undoes the first. |
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
  - A theme may add a **background effect module** (like `fx-blackwall.js`) when CSS can't do the job. It must switch itself on and off with the theme, stay behind the page, pause when the tab is hidden, hold still for reduced motion, and fall back to CSS.
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
- **2026-10-24:** Cyberpunk is an Extended theme, futuristic rather than retro: no CRT scanlines. Its design language is Greek mythology (temple-column tabs, Greek-letter tags; Ω replaces the rules book icon), blended with the Cyberpunk 2077 menus (coral headings and lines, a cyan active tab, item cards with a coloured left stripe and a cyan corner notch, yellow tags). Headings and tabs use Tomorrow, with Oxanium elsewhere. No gold Greek-key dividers. The Blackwall is a living WebGL shader modelled on stills from the game: straight jail-bar lines crowding into a magenta haze in perspective, a crimson-to-violet colour wave rolling across them, a near layer of tapering spikes rising and falling like an equaliser, soft plasma on the right, and rare, brief tearing. No pixelation and no bright flashing spot; it stays subtle. Sinan.
- **2026-10-24:** Crafting is its own tab with one section per craft; each bench is an illustrated item with callout labels and an animated button under it. Utku.
- **2026-10-25:** The Crafting tab is hidden until the character has at least 1 point in a crafting skill (Powdertinker, Brewing, Runecrafting, Weapon Maintenance, Armor Maintenance), and then shows only those benches. When the tab first appears it forges in: it rises out of the tab rule glowing like hot metal with a burst of sparks (played when it scrolls into view), plus a toast; a later bench's button does the same the next time Crafting opens. Nothing moves for reduced motion. Utku.
- **2026-10-25:** Powdertinkering custom parts: each part (Coat, Tips, Area, Core, Status) has "+ A custom …" below the book's choices, opening a small form (name, what it does, difficulty %; a Tip may have a Rating; a Core is a new element with its own supply; a Status picks its element). Saved per character, marked "custom", removable. Utku.
- **2026-10-25:** Powdertinkering saved recipes: after a craft, "Save this recipe" with a name (the parts' name by default); saved recipes show as chips above the munitions and one click loads every part back. Ammo made from a saved recipe with every part holding takes the recipe's name in the inventory; changing any part drops the name. Utku.
- **2026-10-25:** Magic is its own tab with one section per school (shown only with points in that school, like Crafting); Warding first, from the 2020.1 book (p. 62): Words (a two-page dictionary), Inscribe (floating words picked in grammatical order, linking into a sigil that closes and gains an inner star when the Ward is valid) and Wards (saved and Formulaic). Other schools to be designed later. Utku.
- **2026-10-25:** Warding look: the Words are an ancient book you write in and turn the pages of; every word has its own rune, used on the chips, in the book and on the sigil, which is ringed with runes rather than shapes. Finishing a valid Ward makes the sigil flare; inscribing and rolling happen on the Inscribe page itself, with a casting animation (the band spins up, rays reach every rune, a burst). Utku.
- **2026-10-25:** The Words book is old and used: browned, stained parchment with scorched, torn corners, a thick page block, tilted a little away from you. It closes fully to a tooled leather cover (title, a rune seal, the warder's name, a strap clasp) and opens with the cover swinging over. Inscribing has a Difficulty box (the GM's DC, optional): under it the Ward holds and bursts; otherwise the sigil cracks and fizzles. Utku.
- **2026-10-25:** The Words book moves like paper: opening slides the shut book into place, the stiff cover swings over with a slight bend, then a few pages flutter after it and the left page arrives on the last one (about 2.5 s). A page turn lifts the actual page, curling at its free edge, and lands it with the next page on its back. Closing is the reverse. Utku.
- **2026-10-26:** Occult: Harmony is the Magic tab's second school: a meditating figure with the chakras up its body; drag known elements onto them; changes are made over a rest, by the level 5 Active or the level 10 meditation; Release flares the figure and adds Aether. The book's Harmonic Elements table is TBD, so the five elements its chakra tables use (Fire, Earth, Wind, Water, Spirit) are the list; halved Affinities round down. Utku.
- **2026-10-26:** Daemonology is the Magic tab's third school: a summoning circle and a grimoire of contract cards with a custom picture per daemon. The book's summons "a day" are renewed at each long rest; banishing shows the roll beside the daemon's Willpower and the GM decides. Utku.
- **2026-10-26:** Dreamwalking is the Magic tab's fourth school: a moonlit dreamscape that darkens with the Toll, a Toll meter, the manipulations, the vault (real inventory items) and dreamseeds. Every Toll disperses at a long rest, including that of items left in the dream realm; dreamseeds keep theirs until destroyed. Utku.
- **2026-10-26:** Alchemy is the Magic tab's fifth school (it's a Mind skill in the book, but its circles and life energy are magic in all but name): design your own circles and keep them in a circle book, mark Signature Circles, draw energy, roll the activation, and embed arrays. The book doesn't yet say what a Signature Circle changes. Utku.
- **2026-10-26:** The Harmony figure is a realistic, shaded meditator in the lotus position who breathes (chest rises, heart glows, head drifts) with energy motes rising. The chakras' effects show in the At a glance panel: Movement includes the Wind Opening bonus ("+N Harmony"), and a "From your chakras" list shows the rest, coloured by element. Utku.
- **2026-10-24:** Armor repair: the Repair Count is capped at 10 dice. Utku.
- **2026-10-24:** Armor crafting (not written in the 2020.1 book) follows the book's weapon crafting, with armor extras (+1 AV −10%, +5 Soak −5%); every change is marked in `rules-info.js`. Utku.
- **2026-10-24:** Mossheart is an Extended theme for Utku's character Batbayar, a young warder who fights the Zhoung, a corrupting darkness, inside himself. Dark and grounded rather than whimsical: realistic ivy (woody stems, five-lobed leaves, moss, black berries) creeping round section corners (grown to fit each section by `fx-moss.js`; leaves lean gently, at most 10°, when the pointer brushes past, then settle), a few moss clumps and the odd stitched hide patch on section edges, carved-stone titles (Marcellus SC), drifting spores. Below rises the Zhoung, a violet-black shadow of roots that breathes and sometimes opens its eyes, held back by a faint line of warding runes. Broken attributes take its violet. Utku.
- **2026-10-24:** Mossheart tab switches: the ivy is in place the moment a section appears, and a gust of ivy and dry leaves wipes the old section away in the direction you moved (right-hand tab: the wind blows leftward); the new one appears in its wake. The same goes for the pages (Characters, GM table, Settings), in top-bar order. Nothing blows for reduced motion. Utku.
- **2026-10-24:** Workshop: a weaponsmith or armorsmith (Maintenance 3+) repairs other players' items through jobs (a copy of one item; the owner's app applies the result) and can craft items "made for" another player. The smith's materials are used. Utku.
- **2026-10-24:** Workshop jobs are sent from the Gear tab, not the Crafting bench: a "Send to a weaponsmith/armorsmith" button under each weapon and armor card opens a small panel to pick the smith and add a payment (coins, an inventory item, a note). While it's at the smith's, the item stays in the owner's Gear but is locked (greyed out, can't be used, edited or worn; a worn suit comes off) and never enters the smith's Gear. Payment leaves the owner's sheet when sent, goes to the smith when the repair is done, and returns if the item is sent back or taken back. The smith gets a pop-up when a job arrives (once per job per browser, and only while the smith's character is the one open, never on the sender's), with a button to open the Repair bench on it. Utku.
- **2026-10-25:** Workshop repairs add up: each repair the smith makes is added to the job (which stays open), so the smith can "Repair again" until it's full, then "Send it back" with every repair (the payment goes to the smith then). Before any repair, "Send back unrepaired" refunds the owner. If the owner takes it back mid-way, they keep the repairs made so far and get the payment back. Utku.
- **2026-10-25:** The Gear button is "Send for repair". Besides other players' smiths it offers the "Town smith (GM)", an NPC: the job goes to `to.char "gm"`, the GM gets a pop-up (never on the sending sheet) and a "Town smith" section on the GM table where they set how much is restored (full by default) and send it back, or send it back unrepaired. The payment stays with the NPC (only refunded if unrepaired or taken back). Utku.
- **2026-10-24:** On the craft benches the base stats (weapon damage, crit, accuracy, durability, die; armor AV and Soak) come from the GM: on a table only a GM can set them. Players raise them through the paid changes/extras. Utku.
- **2026-10-24:** Dice: a top-bar switch (per browser, like the theme) between "App rolls" and "My own rolls". With own rolls, every roll the app makes (long rest cleansing, creation 3d8, Powdertinkering, Armor repair and craft, Weapon repair and craft, Brewing, Runecrafting) asks for the number rolled at the table, e.g. in Tabletop Simulator; new rolls go through `askRoll()` in `app.js`. Utku.
- **2026-10-24:** The repo moved to the free `clockwork-companion` organization, with Sinan, Bedo and Utku as owners. The site moved to clockwork-companion.github.io/clockwork_companion/; the old address forwards to it. Sinan.
- **2026-10-24:** Settings is its own page, opened by a button at the right of the top bar whose symbol each theme draws for itself (`--set-icon` in `app.css`). It holds the per-browser choices (theme, text size, dice, reset), the Tabletop Simulator code for the open character (the Tabletop tab is gone; Delete character sits at the foot of the Sheet), the table backup (GMs only), Sign out and About. The table name and Install button stay in the top bar. Bedo.
- **2026-10-24:** The "Protect main and Dev" ruleset is on: no deleting or force-pushing either branch, changes only by a pull request with a green check. Sinan.
