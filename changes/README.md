# What's new notes

One small file per change that players will notice, added in the same pull request as the change, by whoever made it.
The app's **Settings → What's new** pop-up lists them: on the Dev page, every note not on the live site yet; on the live
site, what the latest release brought. `tools/whatsnew.py` gathers them when the site is published.

- **Name:** `YYYY-MM-DD-short-name.md` (the day you write it), e.g. `2026-10-27-perk-unfold.md`.
- **Text:** one or two plain sentences for players: what they'll notice and where, not how it was built.
  Start with the place in the app ("Skills & Talents: …", "Settings: …").
- Fixing your own change before release? Edit its note rather than adding a second one.
- Don't delete old notes: they're how the list knows what each release brought.
