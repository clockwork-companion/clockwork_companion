/* Clockwork rules engine — Clockwork Rulebook 2020.1.
   Pure functions only: given a character, compute everything the sheet derives. */
const CW = (() => {
  const ATTRS = [
    { k: "STR", n: "Strength" }, { k: "DEX", n: "Dexterity" }, { k: "END", n: "Endurance" },
    { k: "MND", n: "Mind" }, { k: "WIL", n: "Willpower" }, { k: "WIS", n: "Wisdom" }, { k: "PRS", n: "Presence" },
  ];

  // Order matches the printed sheet (used by the Tabletop Simulator script too).
  // pct = % added to the skill's modifier per skill point (chance skills are 1%, the rest 3%).
  const SKILL_GROUPS = [
    { attr: "STR", skills: [["Maim", 1], ["Bash", 1], ["Cleave", 1], ["Parry", 1], ["Armor Mastery", 3], ["Strong Back", 3]] },
    { attr: "DEX", skills: [["Tumble", 3], ["Pierce", 1], ["Precision", 1], ["Subtlety", 3], ["Alacrity", 3], ["Martial Arts", 3], ["Evasion", 1]] },
    { attr: "END", skills: [["Belly", 3], ["Deprivation", 3], ["Bleed Resistance", 3], ["Durability", 3], ["Shield Mastery", 1], ["Conditioning", 3], ["Versatility", 3], ["Metabolism", 3]] },
    { attr: "MND", skills: [["Demonology", 3], ["Alchemy", 3], ["Engineering", 3], ["Robotics", 3], ["Lore", 3]] },
    { attr: "WIS", skills: [["Armor Maintenance", 3], ["Weapon Maintenance", 3], ["Brewing", 3], ["Powdertinker", 3], ["Awareness", 3], ["Medicine", 3]] },
    { attr: "WIL", skills: [["Warding", 3], ["Sangromancy", 3], ["Dreamwalking", 3], ["Occult: Harmony", 3]] },
    { attr: "PRS", skills: [["Taming", 3], ["Leadership", 3], ["Runecrafting", 3], ["Hunting", 3], ["Perform", 3]] },
  ];
  const ATTR_NAME = Object.fromEntries(ATTRS.map(a => [a.k, a.n]));
  const SKILLS = {};
  SKILL_GROUPS.forEach(g => g.skills.forEach(([n, pct]) => { SKILLS[n] = { attr: g.attr, pct }; }));

  const CASTING = ["Sangromancy", "Warding", "Demonology", "Alchemy", "Dreamwalking"];

  const WEAPON_TYPES = [
    ["Slashing", "STR"], ["Piercing", "STR"], ["Bludgeoning", "STR"], ["Unarmed", "STR"], ["Motorized", "STR"], ["Improvised", "STR"],
    ["Rifles", "DEX"], ["Pistols", "DEX"], ["Sniper Rifles", "DEX"], ["Shotguns", "DEX"], ["Explosives", "DEX"],
    ["Stringed", "DEX"], ["Throwing", "DEX"], ["Finesse", "DEX"], ["Heavy", "DEX"],
  ];
  const WEAPON_ATTR = Object.fromEntries(WEAPON_TYPES);
  // Rulebook: every ranged weapon has a Clip, an optimal and maximum range and a reload cost; melee weapons reach 2 m.
  const RANGED_WEAPONS = ["Rifles", "Pistols", "Sniper Rifles", "Shotguns", "Explosives", "Stringed", "Throwing", "Heavy"];
  // A shield is picked from the same weapon skill list ("Shield"); older sheets marked it with a checkbox.
  const weaponKind = w => (w.shield || w.skill === "Shield" ? "shield" : RANGED_WEAPONS.includes(w.skill) ? "ranged" : "melee");

  // [name, attribute, connected primary skill, primary level that grants proficiency, karma cost of levels 1/2/3]
  const SECONDARY = [
    ["Athletics", "STR", "Strong Back", 4, [3, 7, 10]],
    ["Acrobatics", "DEX", "Tumble", 3, [3, 7, 10]],
    ["Machine Operation", "DEX", "Engineering", 6, [2, 5, 8]],
    ["First Aid", "DEX", "Medicine", 3, [2, 5, 7]],
    ["Riding", "DEX", "Taming", 5, [2, 4, 7]],
    ["Forgery", "DEX", null, 0, [3, 5, 8]],
    ["Stealth", "DEX", "Subtlety", 3, [3, 5, 9]],
    ["Sleight of Hand", "DEX", "Alacrity", 4, [4, 6, 12]],
    ["Entrada", "END", null, 0, [2, 4, 7]],
    ["Land Navigation", "MND", null, 0, [5, 6, 8]],
    ["Naval Navigation", "MND", null, 0, [5, 6, 8]],
    ["Sky Navigation", "MND", null, 0, [5, 6, 8]],
    ["Appraisal", "MND", "Lore", 3, [4, 5, 6]],
    ["Investigation", "MND", "Awareness", 3, [3, 4, 8]],
    ["Mechanical Insight", "MND", "Engineering", 3, [3, 5, 7]],
    ["Prosthetic Operation", "MND", "Robotics", 3, [5, 7, 8]],
    ["Sailing", "WIS", null, 0, [4, 5, 7]],
    ["Sky-Sailing", "WIS", null, 0, [4, 6, 8]],
    ["Cooking", "WIS", "Brewing", 4, [2, 4, 7]],
    ["Insight", "WIS", "Awareness", 5, [3, 4, 8]],
    ["Perception", "WIS", "Awareness", 4, [2, 4, 6]],
    ["Foraging", "WIS", null, 0, [5, 7, 9]],
    ["Persuasion", "PRS", "Leadership", 3, [3, 7, 10]],
    ["Deception", "PRS", "Perform", 3, [3, 7, 10]],
    ["Intimidate", "PRS", null, 0, [3, 7, 10]],
    ["Animal Handling", "PRS", "Taming", 3, [2, 5, 7]],
  ].map(([name, attr, primary, at, cost]) => ({ name, attr, primary, at, cost }));
  const SECONDARY_BY_NAME = Object.fromEntries(SECONDARY.map(s => [s.name, s]));

  const SIZES = { small: 1, medium: 2, large: 4, huge: 8 };
  // Inventory sizes: [key, label, slots per stack, how many fit in one stack]. Bundles and ammo stack into one small slot.
  const ITEM_SIZES = [["small", "Small", 1, 1], ["medium", "Medium", 2, 1], ["large", "Large", 4, 1], ["huge", "Huge", 8, 1],
    ["bundle", "Bundle · 10 a slot", 1, 10], ["ammo", "Ammo · 50 a slot", 1, 50]];
  const ITEM_SIZE = Object.fromEntries(ITEM_SIZES.map(([k, label, slots, per]) => [k, { label, slots, per }]));
  const PROSTHETIC_TYPES = ["Replacement limb", "Added limb", "Replacement organ", "Implant", "Other"];

  const ARMOR = {
    light:  { label: "Light",  av: [1, 4],   str: 0,  am: 0, repairPerAV: 50,  repairDie: "d6"  },
    medium: { label: "Medium", av: [5, 7],   str: 10, am: 0, repairPerAV: 70,  repairDie: "d8"  },
    heavy:  { label: "Heavy",  av: [8, 11],  str: 13, am: 3, repairPerAV: 100, repairDie: "d10" },
    plate:  { label: "Plate",  av: [12, 15], str: 15, am: 5, repairPerAV: 150, repairDie: "d12" },
  };

  const ENCUMBRANCE = [
    { name: "Unencumbered",        mult: 3, explore: "10 km/h", day: "40 km", defend: 0,   move: 0 },
    { name: "Lightly Encumbered",  mult: 4, explore: "5 km/h",  day: "20 km", defend: -10, move: -2 },
    { name: "Heavily Encumbered",  mult: 5, explore: "2 km/h",  day: "10 km", defend: -20, move: -4 },
    { name: "Severely Encumbered", mult: 6, explore: "1 km/h",  day: "5 km",  defend: -40, move: -8 },
    { name: "Over Encumbered",     mult: 7, explore: "Speed 0", day: "Speed 0", defend: null, move: null },
  ];

  const WOUNDS = { light: { dmg: 6, bleed: 8, fix: "Dressing · 5 AP · bandages" },
                   moderate: { dmg: 8, bleed: 14, fix: "Stitches · 1 minute · medical kit" },
                   mortal: { dmg: 12, bleed: 20, fix: "Surgery · 1 short rest · surgery kit" } };

  const EXHAUSTION = [
    "No effect",
    "The GM can botch your rolls (once a round in combat, or once per 5 checks outside it)",
    "You cannot take reactions",
    "Disadvantage on secondary skill checks and saving throws",
    "Critical fumble chance doubles",
    "Disadvantage on ability checks and attack rolls",
    "You cannot critically succeed",
    "Hit point maximum halved",
    "You cannot use Active Abilities or Empowerments",
    "Any vital loss rolled on dice takes the maximum instead",
    "Death",
  ];

  const PROFICIENCY = [[10, "Master"], [7, "Adept"], [5, "Proficient"], [3, "Competent"], [0, "Inexperienced"]];

  // ---------- helpers ----------
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const num = v => (Number.isFinite(+v) ? +v : 0);
  // Karma: buying level n costs n (level 1 = 1, level 10 = 10), so reaching level n from 0 costs 1 + 2 + … + n (0 → 10 = 55).
  const tri = n => (n * (n + 1)) / 2;
  const karmaBetween = (from, to) => tri(to) - tri(from);

  function blankCharacter() {
    const attrs = {}; ATTRS.forEach(a => (attrs[a.k] = { base: 10, value: 10 }));
    const skills = {}; Object.keys(SKILLS).forEach(s => (skills[s] = 0));
    const weapons = {}; WEAPON_TYPES.forEach(([w]) => (weapons[w] = 0));
    const secondary = {}; SECONDARY.forEach(s => (secondary[s.name] = 0));
    return {
      v: 1, name: "", player: "", campaign: "", profession: "", faction: "", age: "", height: "", weight: "",
      portraitAsset: "", portraitUrl: "", notes: "", bio: "",
      karma: 0, pool: 0,
      attrs, skills, weaponSkills: weapons, secondary,
      vitals: { hp: null, bp: null, dp: null, tox: 0, exhaustion: 0, staminaLost: 0,
                wounds: { light: 0, moderate: 0, mortal: 0 }, conditions: [] },
      prosthetics: [], coins: 0,
      // Warding: the Words of Power the warder knows, extra grammar words, saved and formulaic wards, Fatigue.
      ward: { bonus: 0, fatigue: 0, words: [], extra: { subject: [], adverb: [], conj: [] }, wards: [], board: [], ledger: [] },
      harmony: { els: [], ch: {}, rel: [], turns: 0, kept: 0, ledger: [] },
      demon: { daemons: [], out: [], guardian: "", today: 0, army: false, ledger: [] },
      dream: { inRealm: false, mundane: false, travelers: 0, tolls: [], vault: [], sphere: null, seeds: [], ledger: [] },
      alch: { circles: [], arrays: {}, ledger: [] },   // Alchemy: saved circles (one may be a Signature Circle), arrays on the body   // Dreamwalking: what the dreamwalker sustains   // Demonology: contracts, who is summoned, summons used today   // Occult: Harmony: known elements, chakra → element, released chakras
      items: [], weapons: [], armor: [], log: [],
      craft: { supplies: { container: 0 }, bonus: 0, batch: {}, recipe: { type: "rifle" }, recipes: {}, ledger: [], parts: [], saved: [],
               armor: { forge: false, bonus: 0, recipe: { type: "medium", av: 5, soak: 50, plusAV: 0, plusSoak: 0, name: "", for: "" }, ledger: [] },
               brew: { bonus: 0, known: [], recipes: [], catalysts: [], order: { k: "health", inc: 0, catalyst: "", potent: null }, ledger: [] },
               rune: { bonus: 0, effects: [], order: { gem: "amethyst", gemName: "", precious: false, kind: "enhance", effect: "", dc: 50, cost: 100, extra: 0,
                       second: null, hoax: false, pay: "hp", hours: 1 }, ledger: [] },
               // Hunting: trophies carved from monsters (props: pos / neg / void), the belt they hang on, attunement and the
               // two empowerments (Release, a second attunement) counted in turns.
               hunt: { bonus: 0, slots: 4, myths: [], trophies: [], ledger: [], release: null, second: null },
               weapon: { bonus: 0, recipe: { name: "", skill: "Slashing", hands: 1, unwieldy: false, damage: 6, crit: 5, accuracy: 0, dur: 100, durDie: "d10", plus: {}, props: [], exotic: { name: "", dc: 0, note: "" }, for: "" }, ledger: [] }, jobsDone: [] },
      talents: [], uses: {},
      // Crafting and Magic are modules the player turns on (null: not asked yet; asked once the character has points in one).
      modules: { craft: null, magic: null },
    };
  }

  // Fill in any fields an older or partial character is missing.
  function normalize(c) {
    const b = blankCharacter();
    const out = Object.assign({}, b, c || {});
    out.attrs = Object.assign({}, b.attrs, c && c.attrs);
    ATTRS.forEach(a => { const v = out.attrs[a.k]; out.attrs[a.k] = typeof v === "number" ? { base: v, value: v } : Object.assign({ base: 10, value: 10 }, v); });
    out.skills = Object.assign({}, b.skills, c && c.skills);
    out.weaponSkills = Object.assign({}, b.weaponSkills, c && c.weaponSkills);
    out.secondary = Object.assign({}, b.secondary, c && c.secondary);
    out.vitals = Object.assign({}, b.vitals, c && c.vitals);
    out.vitals.wounds = Object.assign({}, b.vitals.wounds, c && c.vitals && c.vitals.wounds);
    ["items", "weapons", "armor", "log", "talents"].forEach(k => (out[k] = Array.isArray(out[k]) ? out[k] : []));
    out.uses = out.uses && typeof out.uses === "object" ? out.uses : {};
    const mods = out.modules && typeof out.modules === "object" ? out.modules : {};
    out.modules = { craft: typeof mods.craft === "boolean" ? mods.craft : null, magic: typeof mods.magic === "boolean" ? mods.magic : null };
    // Stamina lost and Exhaustion are one track: each Stamina stack lost is a level of Exhaustion.
    // Older sheets kept them apart, so take the higher of the two. staminaLost stays as a mirror for the Tabletop sheet.
    out.vitals.exhaustion = clamp(Math.max(num(out.vitals.exhaustion), num(out.vitals.staminaLost)), 0, 10);
    out.vitals.staminaLost = out.vitals.exhaustion;
    if (!Array.isArray(out.vitals.conditions)) out.vitals.conditions = [];
    out.craft = Object.assign({}, b.craft, out.craft);
    ["supplies", "batch"].forEach(k => (out.craft[k] = Object.assign({}, b.craft[k], out.craft[k])));
    out.craft.recipe = Object.assign({ type: "rifle" }, out.craft.recipe);
    // the other munitions' recipes, parked while another munition is open: { [type]: recipe }
    if (!out.craft.recipes || typeof out.craft.recipes !== "object" || Array.isArray(out.craft.recipes)) out.craft.recipes = {};
    Object.keys(out.craft.recipes).forEach(k => { const r = out.craft.recipes[k]; if (!r || typeof r !== "object" || r.type !== k) delete out.craft.recipes[k]; });
    if (!Array.isArray(out.craft.ledger)) out.craft.ledger = [];
    if (!Array.isArray(out.craft.parts)) out.craft.parts = [];   // custom Powdertinkering parts (coats, tips, areas, cores, statuses)
    if (!Array.isArray(out.craft.saved)) out.craft.saved = [];   // saved Powdertinkering recipes: { k, n, recipe }
    out.ward = Object.assign({}, b.ward, out.ward);
    out.ward.extra = Object.assign({ subject: [], adverb: [], conj: [] }, out.ward.extra);
    ["subject", "adverb", "conj"].forEach(k => { if (!Array.isArray(out.ward.extra[k])) out.ward.extra[k] = []; });
    ["words", "wards", "board", "ledger"].forEach(k => { if (!Array.isArray(out.ward[k])) out.ward[k] = []; });
    out.ward.fatigue = Math.max(0, num(out.ward.fatigue));
    out.harmony = Object.assign({}, b.harmony, out.harmony);
    if (!Array.isArray(out.harmony.els)) out.harmony.els = [];
    if (!out.harmony.ch || typeof out.harmony.ch !== "object" || Array.isArray(out.harmony.ch)) out.harmony.ch = {};
    ["rel", "ledger"].forEach(k => { if (!Array.isArray(out.harmony[k])) out.harmony[k] = []; });
    out.harmony.turns = Math.max(0, num(out.harmony.turns)); out.harmony.kept = Math.max(0, num(out.harmony.kept));
    out.demon = Object.assign({}, b.demon, out.demon);
    ["daemons", "out", "ledger"].forEach(k => { if (!Array.isArray(out.demon[k])) out.demon[k] = []; });
    out.demon.daemons = out.demon.daemons.filter(x => x && typeof x === "object").map(x => Object.assign({ id: "", n: "", realm: "", wp: "", terms: "", note: "", img: "", imgData: "", abilities: [] }, x));
    out.demon.daemons.forEach(x => { if (!Array.isArray(x.abilities)) x.abilities = []; });
    out.demon.out = out.demon.out.filter(id => out.demon.daemons.some(x => x.id === id));
    out.demon.today = Math.max(0, num(out.demon.today)); if (typeof out.demon.guardian !== "string") out.demon.guardian = ""; out.demon.army = !!out.demon.army && out.demon.out.length > 0;
    out.dream = Object.assign({}, b.dream, out.dream);
    ["tolls", "vault", "seeds", "ledger"].forEach(k => { if (!Array.isArray(out.dream[k])) out.dream[k] = []; });
    out.dream.inRealm = !!out.dream.inRealm; out.dream.mundane = !!out.dream.mundane; out.dream.travelers = Math.max(0, num(out.dream.travelers));
    if (out.dream.sphere && typeof out.dream.sphere !== "object") out.dream.sphere = null;
    if (out.dream.sphere) ["x", "y"].forEach(k => { if (out.dream.sphere[k] != null && !Number.isFinite(+out.dream.sphere[k])) delete out.dream.sphere[k]; });
    out.dream.vault.forEach(v => { if ((v.kind === "weapon" || v.kind === "armor") && !(v.obj && typeof v.obj === "object")) delete v.kind; });
    out.alch = Object.assign({}, b.alch, out.alch);
    ["circles", "ledger"].forEach(k => { if (!Array.isArray(out.alch[k])) out.alch[k] = []; });
    out.alch.circles.forEach(x => { if (!Array.isArray(x.layers)) x.layers = []; if (!(x.size in ALCH_SIZE_I)) x.size = "small"; });
    if (!out.alch.arrays || typeof out.alch.arrays !== "object" || Array.isArray(out.alch.arrays)) out.alch.arrays = {};
    out.craft.armor = Object.assign({}, b.craft.armor, out.craft.armor);
    out.craft.armor.recipe = Object.assign({}, b.craft.armor.recipe, out.craft.armor.recipe);
    if (!Array.isArray(out.craft.armor.ledger)) out.craft.armor.ledger = [];
    out.craft.weapon = Object.assign({}, b.craft.weapon, out.craft.weapon);
    out.craft.weapon.recipe = Object.assign({}, b.craft.weapon.recipe, out.craft.weapon.recipe);
    const wr = out.craft.weapon.recipe;
    wr.plus = Object.assign({}, wr.plus); wr.exotic = Object.assign({ name: "", dc: 0, note: "" }, wr.exotic);
    if (!Array.isArray(wr.props)) wr.props = [];
    if (!Array.isArray(out.craft.weapon.ledger)) out.craft.weapon.ledger = [];
    out.craft.brew = Object.assign({}, b.craft.brew, out.craft.brew);
    out.craft.brew.order = Object.assign({}, b.craft.brew.order, out.craft.brew.order);
    ["known", "recipes", "catalysts", "ledger"].forEach(k => { if (!Array.isArray(out.craft.brew[k])) out.craft.brew[k] = []; });
    out.craft.rune = Object.assign({}, b.craft.rune, out.craft.rune);
    out.craft.rune.order = Object.assign({}, b.craft.rune.order, out.craft.rune.order);
    ["effects", "ledger"].forEach(k => { if (!Array.isArray(out.craft.rune[k])) out.craft.rune[k] = []; });
    out.craft.hunt = Object.assign({}, b.craft.hunt, out.craft.hunt);
    ["myths", "trophies", "ledger"].forEach(k => { if (!Array.isArray(out.craft.hunt[k])) out.craft.hunt[k] = []; });
    out.craft.hunt.slots = clamp(Math.round(num(out.craft.hunt.slots) || 4), 1, 12);
    out.craft.hunt.trophies = out.craft.hunt.trophies.filter(t => t && typeof t === "object").map(t => Object.assign({ n: "", monster: "", part: "", lvl: 1, note: "", img: "", imgData: "", belted: false, attuned: false }, t,
      { lvl: clamp(Math.round(num(t.lvl) || 1), 1, 5), attached: (Array.isArray(t.attached) ? t.attached : []).filter(k => typeof k === "string" && k).slice(0, 3), props: (Array.isArray(t.props) ? t.props : []).filter(p => p && ["pos", "neg", "void"].includes(p.kind)).map(p => Object.assign({ t: "" }, p)) }));
    // a belt holds only as many as it has loops, and only belted trophies can be attuned
    let onBelt = 0; out.craft.hunt.trophies.forEach(t => { if (t.belted && ++onBelt > out.craft.hunt.slots) t.belted = false; if (!t.belted) t.attuned = false; });
    ["release", "second"].forEach(k => { const e = out.craft.hunt[k]; if (!e || typeof e !== "object" || !out.craft.hunt.trophies.some(t => t.id === e.id)) out.craft.hunt[k] = null; });
    if (!Array.isArray(out.craft.jobsDone)) out.craft.jobsDone = [];
    // Older sheets: a prosthetic count becomes that many unnamed entries; per-slot items become bundles or ammo.
    if (!Array.isArray(out.prosthetics)) out.prosthetics = Array.from({ length: Math.max(0, num(out.prosthetics)) }, (_, i) => ({ id: "pr" + i, name: "", type: PROSTHETIC_TYPES[0], props: "" }));
    out.items = out.items.map(it => (it.per > 1 && (it.size || "small") === "small" ? Object.assign({}, it, { size: it.per >= 50 ? "ammo" : "bundle", per: undefined }) : it));
    return out;
  }

  const attr = (c, k) => num(c.attrs[k] && c.attrs[k].value);
  const attrBase = (c, k) => num(c.attrs[k] && c.attrs[k].base);
  // Attributes run 0–20 with 10 as the median. Below 10 an attribute is "broken".
  // Karma counts levels above a threshold: 10 for most attributes, so 16 → 17 is level 7 and costs 7.
  // An attribute that STARTED broken uses its starting value as its own "10" instead:
  // a starting 6 pays 1 for 7, 2 for 8, 3 for 9 … and tops out at 16 (threshold + 10).
  const attrThreshold = (c, k) => Math.min(10, attrBase(c, k));
  const attrCap = (c, k) => Math.min(20, attrThreshold(c, k) + 10);
  const attrCost = (c, k, from, to) => { const t = attrThreshold(c, k); return tri(Math.max(0, to - t)) - tri(Math.max(0, from - t)); };
  const sk = (c, n) => num(c.skills[n]);

  // A skill can't be higher than its governing attribute, and tops out at 10.
  // A skill (or weapon skill) can hold as many points as its attribute has above 10:
  // Mind 16 allows 6 in Alchemy; a broken attribute (below 10) allows none.
  const pointsAbove10 = v => clamp(v - 10, 0, 10);
  const skillCap = (c, name) => pointsAbove10(attr(c, SKILLS[name].attr));
  const weaponCap = (c, type) => pointsAbove10(attr(c, WEAPON_ATTR[type]));
  // Secondary skills: attribute below 10 → level 1, below 14 → level 2, 14+ → level 3.
  function secondaryCap(c, name) {
    const a = attr(c, SECONDARY_BY_NAME[name].attr);
    return a < 10 ? 1 : a < 14 ? 2 : 3;
  }
  const secondaryCost = (name, from, to) => SECONDARY_BY_NAME[name].cost.slice(from, to).reduce((s, x) => s + x, 0);

  function proficiency(level) { for (const [at, n] of PROFICIENCY) if (level >= at) return n; return "Inexperienced"; }

  // Everything with pips, in one place: where its level lives, its ceiling, its governing attribute and its Karma price.
  // kind: "attr" | "skill" | "weapon" | "sec". cost(from, to) is the price of raising from → to (to > from).
  const LEVELS = {
    attr:   { max: 20, get: (c, n) => attr(c, n), put: (x, n, v) => { x.attrs[n].value = v; }, cap: (c, n) => attrCap(c, n),
              attrOf: n => n, cost: (c, n, a, b) => attrCost(c, n, a, b) },
    skill:  { max: 10, get: (c, n) => num(c.skills[n]), put: (x, n, v) => { x.skills[n] = v; }, cap: (c, n) => skillCap(c, n),
              attrOf: n => SKILLS[n].attr, cost: (c, n, a, b) => karmaBetween(a, b) },
    weapon: { max: 10, get: (c, n) => num(c.weaponSkills[n]), put: (x, n, v) => { x.weaponSkills[n] = v; }, cap: (c, n) => weaponCap(c, n),
              attrOf: n => WEAPON_ATTR[n], cost: (c, n, a, b) => karmaBetween(a, b) },
    sec:    { max: 3, get: (c, n) => num(c.secondary[n]), put: (x, n, v) => { x.secondary[n] = v; }, cap: (c, n) => secondaryCap(c, n),
              attrOf: n => SECONDARY_BY_NAME[n].attr, cost: (c, n, a, b) => secondaryCost(n, a, b) },
  };
  // Karma change for moving a level from → to: positive to raise, negative (a refund) to lower.
  const levelDelta = (c, kind, n, from, to) => { const L = LEVELS[kind]; return to >= from ? L.cost(c, n, from, to) : -L.cost(c, n, to, from); };

  function karmaSpent(c) {
    let attrs = 0, skills = 0, weapons = 0, secondary = 0;
    ATTRS.forEach(a => { attrs += attrCost(c, a.k, attrBase(c, a.k), attr(c, a.k)); });
    Object.keys(SKILLS).forEach(s => (skills += tri(sk(c, s))));
    WEAPON_TYPES.forEach(([w]) => (weapons += tri(num(c.weaponSkills[w]))));
    SECONDARY.forEach(s => (secondary += secondaryCost(s.name, 0, num(c.secondary[s.name]))));
    return { attrs, skills, weapons, secondary, total: attrs + skills + weapons + secondary };
  }

  // ---------- armor ----------
  function armorCastingRelief(c) {
    const am = sk(c, "Armor Mastery");
    if (am >= 10) return 3 * am;   // reduced by the Armor Mastery modifier
    if (am >= 7) return 2 * am;
    if (am >= 5) return am;
    return 0;
  }
  function armorCheck(c, a) {
    const t = ARMOR[a.type] || ARMOR.light;
    const problems = [];
    if (attr(c, "STR") < t.str) problems.push(`Needs Strength ${t.str}`);
    if (t.am && sk(c, "Armor Mastery") < t.am) problems.push(`Needs Armor Mastery ${t.am} for proficiency`);
    const av = num(a.av);
    if (av < t.av[0] || av > t.av[1]) problems.push(`${t.label} armor has an Armor Value of ${t.av[0]}–${t.av[1]}`);
    const soakBonus = sk(c, "Armor Mastery") >= 4 ? 3 * sk(c, "Armor Mastery") : 0;
    return { ok: problems.length === 0, problems, soakMax: num(a.soakMax) + soakBonus, soakBonus,
             repairCost: t.repairPerAV * av, repairDie: t.repairDie };
  }
  function wornArmor(c) { return c.armor.find(a => a.worn) || null; }

  function armorPenalties(c) {
    const a = wornArmor(c);
    const out = { casting: 0, dexSkills: 0, stealth: 0, stealthDisadv: false, entrada: 0, saves: 0, travel: 0, armor: a };
    if (!a) return out;
    const av = num(a.av);
    out.casting = Math.max(0, 2 * av - armorCastingRelief(c));
    if (a.type === "medium") out.stealth = av;
    if (a.type === "heavy" || a.type === "plate") { out.dexSkills = av; out.stealthDisadv = true; }
    if (a.type === "heavy") out.entrada = 2 * av;
    if (a.type === "plate") { out.saves = av; out.travel = 2 * av; }
    return out;
  }

  // Modifier (in %) for a primary skill, after armor penalties. Never below 0.
  // p: the character's armorPenalties, passed in when rendering many skills at once.
  function skillModifier(c, name, p = armorPenalties(c)) {
    const s = SKILLS[name]; let m = sk(c, name) * s.pct;
    if (CASTING.includes(name)) m -= p.casting;
    if (s.attr === "DEX") m -= p.dexSkills;
    return Math.max(0, m);
  }

  function secondaryBonus(c, name, p = armorPenalties(c)) {
    const s = SECONDARY_BY_NAME[name];
    const lvl = num(c.secondary[name]);
    const primLvl = s.primary ? sk(c, s.primary) : 0;
    const viaPrimary = s.primary && primLvl >= s.at;
    let bonus, source;
    if (lvl > 0 && viaPrimary) { bonus = 7 * lvl + 2 * primLvl; source = `${7 * lvl}% + 2×${s.primary}`; }
    else if (viaPrimary) { bonus = 3 * primLvl; source = `${s.primary} modifier`; }
    else if (lvl > 0) { bonus = 7 * lvl; source = `Level ${lvl}`; }
    else { bonus = 0; source = attr(c, s.attr) < 10 ? "Untrained · disadvantage" : "Untrained · flat d100"; }
    // armor and prosthetic penalties
    if (name === "Stealth") bonus -= p.stealth + 4 * c.prosthetics.length;
    if (name === "Entrada") bonus -= p.entrada + 7 * c.prosthetics.length;
    if (s.attr === "DEX") bonus -= p.dexSkills;
    const disadv = (name === "Stealth" && p.stealthDisadv) || (lvl === 0 && !viaPrimary && attr(c, s.attr) < 10);
    return { bonus: Math.max(0, bonus), source, disadv, trained: !!(lvl > 0 || viaPrimary) };
  }

  // ---------- vitals ----------
  function vitalsMax(c) {
    const end = clamp(attr(c, "END"), 0, 20);
    const br = sk(c, "Bleed Resistance"), belly = sk(c, "Belly");
    const hp = 2 * end + 4 * sk(c, "Durability");
    return {
      // Exhaustion 7 halves the hit point maximum (effects build up, so it stays halved at 8 and 9).
      hp: num(c.vitals && c.vitals.exhaustion) >= 7 ? Math.floor(hp / 2) : hp,
      bp: Math.min(400, 200 + 20 * br),
      dp: 4 * end + 12 * sk(c, "Deprivation"),
      tox: end + 2 * belly,
    };
  }
  function bloodExhaustion(bp) { return bp > 100 ? 0 : 1 + Math.floor((100 - bp) / 20); }
  function hungerExhaustion(dp) { return [25, 20, 15, 10, 5].filter(t => dp <= t).length; }

  function derived(c) {
    const max = vitalsMax(c);
    const v = c.vitals;
    // A stored value can sit above a maximum that has since dropped (lower Endurance, Exhaustion 7), so cap it.
    const fill = (k, m) => (v[k] == null ? m : clamp(num(v[k]), 0, m));
    const cur = { hp: fill("hp", max.hp), bp: fill("bp", max.bp), dp: fill("dp", max.dp), tox: Math.max(0, num(v.tox)) };
    const belly = sk(c, "Belly"), br = sk(c, "Bleed Resistance"), end = attr(c, "END");
    const woundBonus = sk(c, "Durability") >= 7 ? 2 : 0;
    const bleed = Object.entries(WOUNDS).reduce((s, [k, w]) => s + w.bleed * num(v.wounds[k]), 0);
    const enc = encumbrance(c);
    const baseMove = 10 + sk(c, "Tumble");
    const harmony = harmonyGlance(c);   // reinforced chakras: Wind in the Opening chakra adds to Movement, the rest are listed
    const move = enc.tier.move == null ? 0 : Math.max(0, baseMove + enc.effectiveMove + harmony.move);
    let rationsPerMeal = 2;
    if (belly >= 3) rationsPerMeal = end <= 5 ? 5 : end <= 8 ? 6 : 7;
    return {
      max, cur,
      hpRegen: 2 + sk(c, "Metabolism"),
      bpRegen: 10 + 3 * br,
      cleanse: "1d6" + (Math.floor(belly / 2) ? ` + ${Math.floor(belly / 2)}d4` : ""),
      cleanseDice: { d6: 1, d4: Math.floor(belly / 2) },
      potency: Math.floor(br / 2) ? `${Math.floor(br / 2)}d10` : "—",
      woundAt: { light: 6 + woundBonus, moderate: 8 + woundBonus, mortal: 12 + woundBonus },
      bleedPerTurn: bleed,
      exhaustionFromBlood: bloodExhaustion(cur.bp),
      exhaustionFromHunger: hungerExhaustion(cur.dp),
      overToxic: cur.tox > max.tox,
      move, baseMove, climb: Math.floor(move / 2), harmony,
      mealsPerDay: sk(c, "Deprivation") >= 3 ? 2 : 3,
      rationsPerDay: (sk(c, "Deprivation") >= 3 ? 2 : 3) + c.prosthetics.length,
      rationsPerMeal,
      exhaustionEffect: EXHAUSTION[clamp(num(v.exhaustion), 0, 10)],
      enc,
      karma: karmaSpent(c),
      armor: armorPenalties(c),
    };
  }

  // ---------- encumbrance ----------
  function itemUnits(it) {
    const per = Math.max(1, num(it.per) || 1);
    const z = ITEM_SIZE[it.size] || ITEM_SIZE.small;
    return Math.ceil(num(it.qty) / Math.max(z.per, per)) * z.slots;
  }
  function encumbrance(c) {
    const unit = attr(c, "STR") + 2 * sk(c, "Strong Back");
    const freeSets = sk(c, "Strong Back") >= 3 ? 3 : 2;
    let load = 0;
    const lines = [];
    c.items.forEach(it => { const u = itemUnits(it); load += u; if (u) lines.push([it.name || "Item", u]); });   // everything listed is carried
    if (num(c.coins) > 0) { const u = Math.ceil(num(c.coins) / 100); load += u; lines.push(["Coins", u]); }
    // Weapons: the first sets ride free; shields always count as large; spares count by size.
    let setsUsed = 0;
    c.weapons.forEach(w => {
      if (w.where === "stash") return;
      if (w.shield || w.skill === "Shield") { load += 4; lines.push([w.name || "Shield", 4]); return; }
      const slots = num(w.hands) === 2 ? 1 : 0.5;
      if (w.where !== "pack" && setsUsed + slots <= freeSets) { setsUsed += slots; return; }
      const u = SIZES[w.size] || 2; load += u; lines.push([w.name || "Weapon", u]);
    });
    c.armor.forEach(a => {
      if (a.where === "stash") return;
      const u = a.type === "plate" ? 8 : a.type === "heavy" ? 4 : (a.worn ? 0 : 2);
      if (u) { load += u; lines.push([a.name || "Armor", u]); }
    });
    // Unencumbered up to 3 × unit, then one tier per extra unit; past 6 × unit is Over Encumbered.
    let idx = ENCUMBRANCE.findIndex(t => load <= t.mult * unit);
    if (idx === -1) idx = 4;
    const tier = ENCUMBRANCE[idx];
    // Strong Back 5/7/9 ignore the penalties of the light/heavy/severe tiers.
    const sb = sk(c, "Strong Back");
    const ignored = sb >= 9 ? 3 : sb >= 7 ? 2 : sb >= 5 ? 1 : 0;
    const penalised = idx > 0 && idx < 4 && idx <= ignored ? ENCUMBRANCE[0] : tier;
    return { unit, load, capacity: 3 * unit, limits: ENCUMBRANCE.map(t => t.mult * unit), tierIndex: idx, tier,
             effective: penalised, effectiveMove: penalised.move || 0, ignored: penalised !== tier, freeSets, setsUsed, lines };
  }

  // ---------- weapons ----------
  function weaponLine(c, w) {
    const lvl = num(c.weaponSkills[w.skill]);
    const accuracy = lvl >= 3 ? lvl + sk(c, "Precision") + num(w.accuracy) : num(w.accuracy) < 0 ? num(w.accuracy) : 0;
    return { level: lvl, proficiency: proficiency(lvl), accuracy, crit: num(w.crit) };
  }

  // ---------- rests ----------
  function rollDie(sides) { return 1 + Math.floor(Math.random() * sides); }
  // Stamina stacks (Exhaustion levels): set both fields so the Tabletop sheet's two counters stay in step.
  function setStamina(c, n) { c.vitals.exhaustion = c.vitals.staminaLost = clamp(Math.round(num(n)), 0, 10); }
  // Uses spent on Active abilities and talents live in c.uses, keyed "p:<skill>:<level>" or "t:<talent id>".
  function useRecharge(c, key) {
    if (key.startsWith("t:")) { const t = (c.talents || []).find(x => "t:" + x.id === key); return t ? t.recharge || "" : ""; }
    const [, skill, lv] = key.split(":"); const sd = typeof SKILL_DATA !== "undefined" && SKILL_DATA.skills[skill];
    const pk = sd && sd.gs.flatMap(g => g.p).find(p => String(p.l) === lv);
    return pk && pk.u ? pk.u.recharge || "" : "";
  }
  function refreshUses(c, short) {
    const u = c.uses || {}; let n = 0;
    Object.keys(u).forEach(k => { if (num(u[k]) && (!short || useRecharge(c, k) === "Short rest")) { delete u[k]; n++; } });
    c.uses = u; return n;
  }
  function shortRest(c) {
    const v = c.vitals; const lines = [];
    const st = Math.max(0, num(v.exhaustion) - 1 - (sk(c, "Conditioning") >= 6 ? 1 : 0));
    if (st !== num(v.exhaustion)) lines.push(`Stamina recovered (${num(v.exhaustion)} → ${st} lost)`); setStamina(c, st);
    if (refreshUses(c, true)) lines.push("Short-rest abilities recharged");
    return lines.length ? "Short rest: " + lines.join(" · ") : "Short rest";
  }
  // cleanse: the cleansing dice total when it was rolled at the table; rolled here when left out.
  function longRest(c, cleanse) {
    const d = derived(c); const v = c.vitals; const parts = [];
    const hp = Math.min(d.max.hp, d.cur.hp + d.hpRegen); parts.push(`HP +${hp - d.cur.hp}`); v.hp = hp;
    const bp = Math.min(d.max.bp, d.cur.bp + d.bpRegen); parts.push(`Blood +${bp - d.cur.bp}`); v.bp = bp;
    let roll = num(cleanse); if (cleanse == null) { roll = rollDie(6); for (let i = 0; i < d.cleanseDice.d4; i++) roll += rollDie(4); }
    const tox = Math.max(0, d.cur.tox - roll); parts.push(`Toxicity −${d.cur.tox - tox} (rolled ${roll})`); v.tox = tox;
    const st = Math.max(0, num(v.exhaustion) - 2 - (sk(c, "Conditioning") >= 7 ? 2 : 0));
    if (st !== num(v.exhaustion)) parts.push(`Stamina ${num(v.exhaustion)} → ${st} lost`); setStamina(c, st);
    if (refreshUses(c, false)) parts.push("abilities recharged");
    if (c.ward && num(c.ward.fatigue)) { parts.push(`Warding Fatigue ${num(c.ward.fatigue)} → 0`); c.ward.fatigue = 0; }   // all Fatigue clears after a long rest
    if (c.demon && num(c.demon.today)) { parts.push("daemon summons renewed"); c.demon.today = 0; }   // the app counts a day of summons from long rest to long rest
    if (c.dream) {   // Dreamwalking tolls disperse; items lost to a failed sending come back; dreamseeds stay
      const d = c.dream, back = d.vault.filter(v => v.lost);
      if (d.tolls.length || d.vault.some(v => num(v.pct))) parts.push("dreamwalking Toll cleared");
      d.tolls = []; d.vault.forEach(v => { v.pct = 0; });
      back.forEach(v => dreamReturn(c, v));
      if (back.length) parts.push(`${back.length} lost item${back.length === 1 ? "" : "s"} back from the dream realm`);
      d.vault = d.vault.filter(v => !v.lost); d.sphere = null;
    }
    return "Long rest: " + parts.join(" · ");
  }

  // The rulebook roll for one attribute: 3d8, set the lowest die aside, add the other two; never below 6.
  // dice: three d8 results rolled at the table; rolled here when left out.
  function rollAttributeDetail(given) {
    const dice = given && given.length === 3 ? given.slice() : [rollDie(8), rollDie(8), rollDie(8)];
    const low = dice.indexOf(Math.min(...dice));
    const sum = dice.reduce((s, d, i) => (i === low ? s : s + d), 0);
    return { dice, low, sum, total: Math.max(6, sum) };
  }
  function rollAttribute() { return rollAttributeDetail().total; }
  // One line per attribute for the creation guide.
  const ATTR_BLURB = {
    STR: "Brute power. Carrying, lifting and most melee weapons.",
    DEX: "Nimbleness and speed. Stealth, thievery and most ranged weapons.",
    END: "Toughness. Hit points, hunger and how much punishment you can take.",
    MND: "Raw brain power. Learning, invention and critical thinking.",
    WIL: "Mental resolve. Shrugging off the mind's assaults and some schools of magic.",
    WIS: "Knowledge and patience. Fitting into the world and crafts that take learning.",
    PRS: "Force of personality. Leading, persuading and holding a room.",
  };

  // ---------- Powdertinkering (rulebook 2020.1, Crafting chapter 16.2) ----------
  // A munition is built in steps: the Coat first (always), then each Tip, the Area, the Core and each Status.
  // Every step costs 200 g and one roll: d100 − Powdertinker modifier, a success if the result is below the step's difficulty.
  // A failure loses that 200 g and gives the batch a Detriment (the GM decides what it is); the step may be tried again.
  // Too many Detriments scrap the whole batch and every material spent on it.
  const PT_PARTS = ["coat", "tip", "area", "core", "status"];
  // Munition types and which components each may carry (the book's Component Access table).
  // The extracted table is garbled; this is our reading, to confirm against the printed page (see notes).
  // a: [coat, tip, area, core, status]. batch: munitions per successful craft (book: 4 bullets, 1 grenade, 1 oil).
  const MUNITIONS = [
    { k: "rifle",    n: "Rifle ammo",        w: "Rifles",        shape: "rifle",   a: [1, 1, 0, 1, 1], batch: 4, size: "ammo" },
    { k: "pistol",   n: "Pistol ammo",       w: "Pistols",       shape: "pistol",  a: [1, 1, 0, 1, 1], batch: 4, size: "ammo" },
    { k: "sniper",   n: "Sniper ammo",       w: "Sniper Rifles", shape: "sniper",  a: [1, 1, 0, 1, 1], batch: 4, size: "ammo" },
    { k: "shotgun",  n: "Shotgun shells",    w: "Shotguns",      shape: "shell",   a: [1, 0, 0, 1, 1], batch: 4, size: "ammo" },
    { k: "heavy",    n: "Heavy weapon ammo", w: "Heavy",         shape: "heavy",   a: [1, 1, 1, 1, 1], batch: 4, size: "ammo" },
    { k: "stringed", n: "Arrows and bolts",  w: "Stringed",      shape: "arrow",   a: [1, 1, 0, 1, 1], batch: 4, size: "ammo" },
    { k: "bomb",     n: "Explosives",        w: "Explosives",    shape: "grenade", a: [0, 0, 1, 1, 1], batch: 1, size: "small" },
    { k: "throwing", n: "Throwing weapons",  w: "Throwing",      shape: "knife",   a: [1, 1, 0, 1, 1], batch: 1, size: "small" },
    { k: "oil",      n: "Weapon oils",       w: "",              shape: "flask",   a: [0, 0, 0, 1, 1], batch: 1, size: "small" },
  ];
  const MUNITION = Object.fromEntries(MUNITIONS.map(m => [m.k, m]));
  const ptAccess = (type, part) => !!(MUNITION[type] || MUNITIONS[0]).a[PT_PARTS.indexOf(part)];
  const COATS = [["Piercing", "The default coat: the munition deals piercing damage."],
                 ["Bludgeoning", "Changes the munition's damage type to bludgeoning."],
                 ["Slashing", "Changes the munition's damage type to slashing."]];
  const TIPS = [["Precise", true, "Attack rolls that fire it gain the Rating to their accuracy."],
                ["Penetrating", true, "Ignores Rating points of armor."],
                ["Impale", false, "Critically strikes on multiples of 10 (10, 20, 30 …)."]];
  const AREAS = [["Sphere", "Explodes in a sphere with radius Rating. Every bomb has this by default."],
                 ["Plus", "Explodes in a plus shape, radius Rating, each arm 2 m thick. Cheaper than a sphere of the same length."],
                 ["Cross", "Explodes in a cross shape, radius Rating, each arm 2 m thick. Cheaper than a sphere of the same length."],
                 ["Cone", "Explodes in a cone of 30, 60 or 90 degrees with radius Rating."]];
  const ELEMENTS = ["Fire", "Cold", "Electric", "Poison", "Acid", "Radiant", "Necrotic"];
  const STATUSES = [
    ["Scorched", "Fire", "Scarred with burns: Rating/2 fire damage each turn until resisted."],
    ["Blinding Shot", "Radiant", "Blinded for Rating turns."],
    ["Hallowed Scar", "Radiant", "Outlined in a radiant glow, always visible. Attacks against it have advantage until resisted."],
    ["Arc", "Electric", "Creatures starting their turn within 1 m of the target take Rating electric damage."],
    ["Shocked", "Electric", "Recovers 1 less AP each turn until resisted."],
    ["Soul Sear", "Necrotic", "Can't use reactions or legendary actions other than the Resist action."],
    ["Decay", "Necrotic", "Can't regenerate hit points or use Active abilities."],
    ["Corrode", "Acid", "Natural armor unusable up to Rating damage; worn armor takes 2×Rating damage."],
    ["Dissolve", "Acid", "Weapons corroded: their damage drops by Rating/2 until the target spends 3 AP cleaning them."],
    ["Toxin", "Poison", "Rating/2 poison damage each turn until resisted."],
    ["Acrimony", "Poison", "Saving throws of one attribute (shooter's choice) drop by Rating until resisted."],
    ["Slick", "Cold", "Treats all ground as difficult terrain until resisted."],
    ["Hypothermia", "Cold", "Counts as having 1 stack of Exhaustion until resisted."],
  ];
  const PT_GRAMS = 200;
  // The book's difficulty for each part, before Rating increments (custom parts may set their own).
  const PT_BASE_DC = { coat: 60, tip: 40, area: 30, core: 40, status: 40 };
  // The book's parts plus this character's custom ones (c.craft.parts: { k, part, n, what, dc, rated, el }), in the
  // same shapes as COATS, TIPS, AREAS, ELEMENTS and STATUSES. dcs: the custom parts' own base difficulties.
  function ptLists(c) {
    const own = ((c.craft && c.craft.parts) || []).filter(x => x && x.n && PT_PARTS.includes(x.part));
    const by = part => own.filter(x => x.part === part);
    const book = new Set([...COATS.map(x => x[0]), ...TIPS.map(x => x[0]), ...AREAS.map(x => x[0]), ...ELEMENTS, ...STATUSES.map(x => x[0])]);
    const fresh = x => !book.has(x.n);   // a custom part can't shadow one of the book's
    const dcs = {}; own.forEach(x => (dcs[x.part + ":" + x.n] = num(x.dc) || PT_BASE_DC[x.part]));
    const elements = [...ELEMENTS, ...by("core").filter(fresh).map(x => x.n)];
    return {
      coats: [...COATS, ...by("coat").filter(fresh).map(x => [x.n, x.what || "", true])],
      tips: [...TIPS, ...by("tip").filter(fresh).map(x => [x.n, !!x.rated, x.what || "", true])],
      areas: [...AREAS, ...by("area").filter(fresh).map(x => [x.n, x.what || "", true])],
      elements,
      cores: Object.fromEntries(by("core").filter(fresh).map(x => [x.n, x.what || ""])),
      statuses: [...STATUSES, ...by("status").filter(x => fresh(x) && elements.includes(x.el)).map(x => [x.n, x.el, x.what || "", true])],
      dcs, own,
    };
  }
  const ptDc = (L, part, name) => L.dcs[part + ":" + name] || PT_BASE_DC[part];

  // What this character's Powdertinker level allows (perks Tinkerling → Master o' Munitions).
  function ptState(c) {
    const lvl = sk(c, "Powdertinker");
    const cr = c.craft || {};
    const mod = skillModifier(c, "Powdertinker") + num(cr.bonus);
    return {
      lvl, mod, bonus: num(cr.bonus),
      proficient: lvl >= 3,                       // L3: proficient, may craft
      unlock: { coat: lvl >= 3, tip: lvl >= 4, core: lvl >= 4, area: lvl >= 7, status: lvl >= 7 },
      unlockAt: { coat: 3, tip: 4, core: 4, area: 7, status: 7 },
      maxFails: lvl >= 6 ? 2 : 1,                 // L3 "fail once"; L6 "fail twice before the process ends"
      keepFailed: lvl >= 5,                       // L5 Novice Tinker (Active, long rest): keep a failed property as well as its Detriment
      ignoreOne: lvl >= 10,                       // L10 (Active, long rest): ignore 1 Detriment
      halfClipPerUnused: lvl >= 8,                // L8: each unused failure → an extra half batch
      extraClip: lvl >= 9,                        // L9: an extra batch every craft
      base: { tip: lvl, area: lvl, core: Math.floor(lvl / 2), status: Math.floor(lvl / 2) },
      // Novice Tinker (L5) and the L10 ability are tracked with every other Active ability in c.uses, recharged by rests.
      used: { keep: num((c.uses || {})["p:Powdertinker:5"]) > 0, ignore: num((c.uses || {})["p:Powdertinker:10"]) > 0 },
    };
  }
  // Difficulty (in %) of a step. Tips: 40 − 5 per Rating increment above the base; Cores: 40 − 10 per increment.
  // base: a custom part's own difficulty, which the increments then lower the same way.
  function ptDifficulty(part, inc = 0, base) {
    const b = base == null ? PT_BASE_DC[part] || 40 : num(base);
    if (part === "tip") return b - 5 * inc;
    if (part === "core") return b - 10 * inc;
    return b;
  }
  // Chance that d100 (1–100) − mod lands below dc.
  const ptChance = (dc, mod) => clamp(dc + mod - 1, 0, 100);
  // The steps a recipe needs, in crafting order. A recipe: { type, coat, tips: {Precise: inc, …}, area: {k, cone}, core: {el, inc}, status: [names] }.
  function ptSteps(c, rc) {
    const st = ptState(c), type = rc.type, steps = [], L = ptLists(c);
    const can = p => ptAccess(type, p) && st.unlock[p];
    const m = MUNITION[type] || MUNITIONS[0];
    const coat = can("coat") && L.coats.some(x => x[0] === rc.coat) ? rc.coat : "Piercing";
    const plain = m.shape === "grenade" || m.shape === "flask";
    steps.push({ part: "coat", key: "coat", label: m.shape === "grenade" ? "Casing" : m.shape === "flask" ? "Base oil" : `${coat} coat`, dc: plain ? 60 : ptDc(L, "coat", coat), mat: "container" });
    if (can("tip")) L.tips.forEach(([k, rated]) => {
      const inc = rc.tips && rc.tips[k];
      if (inc == null || inc === false) return;
      const i = rated ? num(inc) : 0;
      steps.push({ part: "tip", key: "tip:" + k, label: rated ? `${k} (${st.base.tip + i})` : k, dc: ptDifficulty("tip", i, ptDc(L, "tip", k)), mat: "container", name: k, rating: rated ? st.base.tip + i : null });
    });
    const area = rc.area && rc.area.k;
    if (area && can("area") && L.areas.some(x => x[0] === area) && !(m.shape === "grenade" && area === "Sphere"))
      steps.push({ part: "area", key: "area", label: `${area === "Cone" ? `Cone ${rc.area.cone || 60}°` : area} (${st.base.area})`, dc: ptDc(L, "area", area), mat: "container", name: area, rating: st.base.area });
    const core = rc.core && rc.core.el;
    if (core && can("core") && L.elements.includes(core)) {
      const i = num(rc.core.inc);
      steps.push({ part: "core", key: "core", label: `${core} core (${st.base.core + i})`, dc: ptDifficulty("core", i, ptDc(L, "core", core)), mat: core, name: core, rating: st.base.core + i });
      if (can("status")) (rc.status || []).forEach(s => { const S = L.statuses.find(x => x[0] === s); if (S && S[1] === core)
        steps.push({ part: "status", key: "status:" + s, label: `${s} (${st.base.status})`, dc: ptDc(L, "status", s), mat: core, name: s, rating: st.base.status }); });
    }
    steps.forEach(s => (s.chance = ptChance(s.dc, st.mod)));
    return steps;
  }
  // Munitions out of one finished craft. unused = failures still allowed when the craft ended.
  function ptYield(c, type, unused) {
    const st = ptState(c), m = MUNITION[type] || MUNITIONS[0];
    const batch = Math.max(1, num((c.craft && c.craft.batch && c.craft.batch[type]) || m.batch));
    let n = batch;
    if (st.halfClipPerUnused) n += unused * Math.ceil(batch / 2);
    if (st.extraClip) n += batch;
    return { batch, n };
  }
  // A short name for a finished batch: "Rifle ammo · Slashing · Penetrating 7 · Fire 3 · Scorched".
  function ptName(type, done, rc) {
    const m = MUNITION[type] || MUNITIONS[0];
    const bits = [];
    done.forEach(s => {
      if (s.part === "coat") { if (rc.coat && rc.coat !== "Piercing" && s.label.endsWith("coat")) bits.push(rc.coat); }
      else if (s.part === "area") bits.push(s.label.replace(/ \((\d+)\)$/, " $1"));
      else bits.push(s.label.replace(/ core/, "").replace(/ \((\d+)\)$/, " $1"));
    });
    if (m.shape === "grenade" && !done.some(s => s.part === "area")) bits.unshift("Sphere");
    return [m.n, ...bits].join(" · ");
  }


  // ---------- Warding (rulebook 2020.1, Willpower skills: Warding Magic) ----------
  // A Ward is an English sentence. Subjects cost 5 Sigils, adverbs (a, an, for, the) 1, conjunctions 10 (Warding 7);
  // adjectives, verbs and nouns are Words of Power, each with the cost in the warder's own dictionary.
  // Available Sigils = AP used × Sigils per AP − Fatigue. Sigils per AP: 3 per point of Warding.
  const WORD_KINDS = ["noun", "verb", "adjective"];
  const WARD_GRAMMAR = {
    subject: { n: "Subject", cost: 5, words: ["I", "The Ward", "myself", "there"] },
    adverb: { n: "Adverb", cost: 1, words: ["a", "an", "the", "for"] },
    conj: { n: "Conjunction", cost: 10, words: ["and", "but", "when", "while"] },
  };
  const WARD_KIND_NAME = { subject: "Subject", adverb: "Adverb", conj: "Conjunction", noun: "Noun", verb: "Verb", adjective: "Adjective" };
  function wardState(c) {
    const lvl = sk(c, "Warding"), w = c.ward || {}, u = c.uses || {};
    const left = (lv, n) => Math.max(0, n - num(u["p:Warding:" + lv]));
    return {
      lvl, mod: skillModifier(c, "Warding") + num(w.bonus), bonus: num(w.bonus),
      spa: 3 * lvl,                                   // Sigils per AP
      fatigue: Math.max(0, num(w.fatigue)),
      formulaic: lvl >= 3, ritual: lvl >= 4, spontaneous: lvl >= 5, repeatAdj: lvl >= 6, conj: lvl >= 7, reaction: lvl >= 8,
      subjectCost: WARD_GRAMMAR.subject.cost - (lvl >= 9 ? 3 : 0), adverbCost: Math.max(0, WARD_GRAMMAR.adverb.cost - (lvl >= 9 ? 1 : 0)),
      // The Active perks (uses kept in c.uses with every other Active ability).
      active: { double: lvl >= 5 ? left(5, 3) : 0, calm: lvl >= 6 ? left(6, 2) : 0, epic: lvl >= 7 ? left(7, 3) : 0 },
    };
  }
  // Which kinds of word may come next in a Ward sentence (a light grammar: Subject first; verbs, objects and
  // compound nouns after; adjectives lead into a noun; a conjunction starts a new clause).
  function wardNext(tokens) {
    const last = tokens.length ? tokens[tokens.length - 1].k : null;
    if (!last) return ["subject"];
    return ({
      subject: ["verb", "adverb", "conj"],
      verb: ["adverb", "adjective", "noun", "subject", "conj"],
      adverb: ["adverb", "adjective", "noun", "subject", "verb"],
      adjective: ["adjective", "noun"],
      noun: ["noun", "adverb", "verb", "conj"],
      conj: ["subject", "verb", "adverb"],
    })[last] || [];
  }
  // The cost and the problems of a Ward sentence. tokens: [{ k, text, id }] (id: a Word of Power in c.ward.words).
  // epic: The First Epic (Warding 7) is on: up to 3 Words of Power cost 1 Sigil (the dearest ones, to save the most).
  function wardCost(c, tokens, epic) {
    const st = wardState(c), words = ((c.ward || {}).words || []), problems = [];
    const lines = tokens.map((t, i) => {
      if (t.k === "subject") return { i, t, base: WARD_GRAMMAR.subject.cost, cost: st.subjectCost };
      if (t.k === "adverb") return { i, t, base: WARD_GRAMMAR.adverb.cost, cost: st.adverbCost };
      if (t.k === "conj") return { i, t, base: WARD_GRAMMAR.conj.cost, cost: WARD_GRAMMAR.conj.cost };
      const w = words.find(x => x.id === t.id);
      if (!w) problems.push(`"${t.text}" isn't in the dictionary any more.`);
      const cost = w ? Math.max(0, num(w.cost)) : 0;
      return { i, t, base: cost, cost, wop: true };
    });
    let epicUsed = 0;
    if (epic) lines.filter(l => l.wop).sort((a, b) => b.cost - a.cost).slice(0, 3).forEach(l => { if (l.cost > 1) { l.cost = 1; l.epic = true; epicUsed++; } });
    const total = lines.reduce((s, l) => s + l.cost, 0);
    if (!tokens.length) problems.push("Start with a Subject, such as I or The Ward.");
    else {
      if (tokens[0].k !== "subject") problems.push("A Ward starts with its Subject.");
      tokens.forEach((t, i) => { if (i && !wardNext(tokens.slice(0, i)).includes(t.k)) problems.push(`A ${WARD_KIND_NAME[t.k].toLowerCase()} can't follow a ${WARD_KIND_NAME[tokens[i - 1].k].toLowerCase()} there.`); });
      if (!tokens.some(t => t.k === "verb")) problems.push("A Ward needs a verb: what it does.");
      if (["adverb", "adjective", "conj"].includes(tokens[tokens.length - 1].k)) problems.push("The sentence isn't finished.");
      if (tokens.some(t => WORD_KINDS.includes(t.k)) && !st.spontaneous) problems.push("Words of Power need Warding 5 (Works of a Writer).");
      if (tokens.some(t => t.k === "conj") && !st.conj) problems.push("Conjunctions need Warding 7 (The First Epic).");
      if (!st.repeatAdj) { const seen = {}; tokens.forEach(t => { if (t.k === "adjective") { if (seen[t.id]) problems.push(`Repeating "${t.text}" needs Warding 6.`); seen[t.id] = 1; } }); }
    }
    return { lines, total, epicUsed, problems: [...new Set(problems)], ok: !!tokens.length && !problems.length };
  }
  // What inscribing a Ward of this cost takes. double: Works of a Writer (2× Sigils per AP); ritual: inscribed as a
  // Ritual Ward (5 AP's worth of Sigils an hour). Fatigue comes off the Sigils the AP buy.
  function wardPlan(c, cost, o = {}) {
    const st = wardState(c), spa = st.spa * (o.double && !o.ritual ? 2 : 1);
    const ap = spa > 0 ? Math.max(1, Math.ceil((num(cost) + st.fatigue) / spa)) : Infinity;
    return { spa, ap, fatigue: st.fatigue, hours: Math.ceil(ap / 5), available: a => Math.max(0, num(a) * spa - st.fatigue) };
  }
  // Fatigue gained from one inscription (the GM decides the amount). calm: no Fatigue (Warding 6 Active);
  // double: 2× Fatigue (Warding 5 Active); ritual: under 10 becomes 1, 10 or more is halved (rounded up).
  function wardFatigue(gained, o = {}) {
    let f = Math.max(0, Math.round(num(gained)));
    if (o.calm && !o.ritual) return 0;
    if (o.double && !o.ritual) f *= 2;
    if (o.ritual && f > 0) f = f < 10 ? 1 : Math.ceil(f / 2);
    return f;
  }

  // ---------- Occult: Harmony (rulebook 2020.1, 12.4) ----------
  // Chakras unlock one per level from 3 to 10. Each holds one harmonic element the practitioner knows; known elements
  // come at levels 3, 5, 7 and 10 and are permanent. Affinity for an element = chakras holding it + Aether Affinity,
  // and Aether is 1 per Released chakra while they are released (from level 7). The book leaves the Harmonic Elements
  // table blank ("TBD"); the five elements are the ones its chakra tables use. Effect texts are the book's own.
  const HARMONY_ELEMENTS = [["fire", "Fire"], ["earth", "Earth"], ["wind", "Wind"], ["water", "Water"], ["spirit", "Spirit"]];
  const HARMONY_LEARN = [3, 5, 7, 10];
  const CHAKRAS = [
    { k: "opening", n: "Opening", lvl: 3, fx: {
      fire: ["Whenever you roll a Reflex saving throw, you can add your Fire Affinity as a bonus to the roll."],
      earth: ["Whenever you roll a Fortitude saving throw, you can add your Earth Affinity as a bonus to the roll."],
      wind: ["Your movement score increases by 1 meters per Wind Affinity you have, up to a maximum of 5."],
      water: ["Whenever you take a Defend action, you can add your Water Affinity as a bonus to the roll."],
      spirit: ["Whenever you roll a Willpower saving throw, you can add your Spirit Affinity as a bonus to the roll."] } },
    { k: "life", n: "Life", lvl: 4, fx: {
      fire: ["Any secondary skill check you roll that is governed by Presence, you can add your Fire Affinity as a bonus to the roll.",
        "With a Fire Affinity of 6 or higher, any primary skill check you roll that is governed by Presence, you can add your Fire Affinity as a bonus to the roll."],
      earth: ["Any secondary skill check you roll that is governed by Strength or Endurance, you can add your Earth Affinity as a bonus to the roll.",
        "With a Earth Affinity of 6 or higher, any primary skill check you roll that is governed by Strength or Endurance, you can add your Earth Affinity as a bonus to the roll.",
        "Melee Attacks are considered Strength checks."],
      wind: ["Any secondary skill check you roll that is governed by Dexterity, you can add your Wind Affinity as a bonus to the roll.",
        "With a Wind Affinity of 6 or higher, any primary skill check you roll that is governed by Dexterity, you can add your Wind Affinity as a bonus to the roll.",
        "Ranged Attacks are considered Dexterity checks."],
      water: ["Any secondary skill check you roll that is governed by Mind, you can add your Water Affinity as a bonus to the roll.",
        "With a Water Affinity of 6 or higher, any primary skill check you roll that is governed by Mind, you can add your Water Affinity as a bonus to the roll."],
      spirit: ["Any secondary skill check you roll that is governed by Wisdom or Willpower, you can add your Spirit Affinity as a bonus to the roll.",
        "With a Spirit Affinity of 6 or higher, any primary skill check you roll that is governed by Wisdom or Willpower, you can add your Spirit Affinity as a bonus to the roll."] } },
    { k: "pain", n: "Pain", lvl: 5, fx: {
      fire: ["Whenever you lose Hit Points, as a result of a Failed Saving Throw, you lose Fire Affinity/2, up to a maximum of 5 and a minimum of 1."],
      earth: ["Whenever you take the Brace Action, you can add your Earth Affinity/2 to your Damage Mitigation value."],
      wind: ["Whenever you gain Toxicity, you can reduce that number by Wind Affinity/2, up to a maximum of 5 and a minimum of 1."],
      water: ["Whenever you bleed from a Wound, you can reduce the bleeding by Water Affinity/2 down to a minimum of 1."],
      spirit: ["Whenever you lose Deprivation to some effect other than natural hunger, you can reduce the amount lost by Spirit Affinity/2 down to a minimum of 1."] } },
    { k: "healing", n: "Healing", lvl: 6, fx: {
      fire: ["You recover toxicity points equal to your Fire Affinity during a short rest. This effect can only occur once every long rest."],
      earth: ["You recover blood points equal to 10xEarth Affinity during a short rest. This effect can only occur once every long rest."],
      wind: ["You recover hit points equal to your 2xWind Affinity during a short rest. This effect can only occur once every long rest."],
      water: ["For every 5 hit points you receive as healing, you receive additional hit points equal to half your Water Affinity."],
      spirit: ["If you have recovered any sanity points since your last long rest, you recover sanity points equal to the amount you have recovered again or your Spirit Affinity, whichever is lower.",
        "Recovery takes place during your next short rest. This effect can only occur once every long rest."] } },
    { k: "limit", n: "Limit", lvl: 7, release: "", fx: {
      fire: ["Whenever you roll a disadvantaged roll caused by an ailment, you can add 2xFire Affinity to your roll."],
      earth: ["For each 2 points of Earth Affinity you have, you negate the effects of 1 stack of Exhaustion."],
      wind: ["Whenever you roll to resist an effect that would deafen, paralyze or poison you, you can add 2xWind Affinity to your roll."],
      water: ["Whenever you roll to resist an effect that would blind, petrify or stun you, you can add 2xWater Affinity to your roll."],
      spirit: ["Whenever you roll to resist an effect that would charm or frighten you, you can add 2xSpirit Affinity to your roll."] } },
    { k: "wonder", n: "Wonder", lvl: 8, release: "", fx: { fire: [], earth: [], wind: [], water: [], spirit: [] } },
    { k: "view", n: "View", lvl: 9, release: "You gain temporary hit points equal to your maximum hit points. These hit points can only be used to defend against the damage types this chakra provide resistance against.", fx: {
      fire: ["Whenever you take fire damage, neglect 2 points of it.", "With a Fire Affinity of 4 or higher you gain resistance to fire damage.",
        "With a Fire Affinity of 6 or higher, your next attack gains bonus damage equal to your Fire Affinity. This effect can only occur once a round."],
      earth: ["Whenever you take bludgeoning or poison damage, neglect 2 points of it.", "With a Earth Affinity of 4 or higher you gain resistance to bludgeoning damage.",
        "With a Earth Affinity of 6 or higher you gain resistance to poison damage."],
      wind: ["Whenever you take slashing or cold damage, neglect 2 points of it.", "With a Wind Affinity of 4 or higher you gain resistance to slashing damage.",
        "With a Wind Affinity of 6 or higher you gain resistance to cold damage."],
      water: ["Whenever you take piercing or lightning damage, neglect 2 points of it.", "With a Water Affinity of 4 or higher you gain resistance to piercing damage.",
        "With a Water Affinity of 6 or higher you gain resistance to lightning damage."],
      spirit: ["Whenever you take psychic damage, neglect 2 points of it.", "With a Spirit Affinity of 4 or higher, whenever you roll a Sanity check, you can add 2xSpirit Affinity to your roll.",
        "With a Spirit Affinity of 6 or higher you gain resistance to psychic damage."] } },
    { k: "death", n: "Death", lvl: 10, release: "You gain all reinforcement effects for the next 2 turns.", fx: {
      fire: ["When your health drops below your 2xFire Affinity, any bonus damage you deal is now considered weapon damage.", "If an attack made by you misses, you can reroll that attack once per round."],
      earth: ["Instead of death saving throws, you roll Occult:Harmony checks to stabilize.", "When you stabilize, you regain hit points equal to your Earth Affinity and regain consciousness. This can only occur once per long rest."],
      wind: ["When your health drops below your 2xWind Affinity, you gain Action Points equal to your Wind Affinity."],
      water: ["When your health drops below your 2xWater Affinity, you gain hit point regeneration equal to your Water Affinity for 3 turns."],
      spirit: ["When your health drops to 0, instead of going unconscious, you continue fighting for a number of turns equal to your Spirit Affinity. You still roll death saving throws."] } },
  ];
  const CHAKRA_BY = Object.fromEntries(CHAKRAS.map(x => [x.k, x]));
  function harmonyState(c) {
    const lvl = sk(c, "Occult: Harmony"), h = c.harmony || {}, u = c.uses || {};
    const learnMax = HARMONY_LEARN.filter(l => lvl >= l).length;
    const known = (h.els || []).filter(e => HARMONY_ELEMENTS.some(x => x[0] === e)).slice(0, Math.max(learnMax, (h.els || []).length));
    const open = CHAKRAS.filter(x => lvl >= x.lvl).map(x => x.k);
    const held = {}; open.forEach(k => { const e = (h.ch || {})[k]; if (e && known.includes(e)) held[k] = e; });
    const released = (h.rel || []).filter(k => open.includes(k));
    const aether = released.length;
    const aff = {}; known.forEach(e => { aff[e] = Object.values(held).filter(x => x === e).length + aether; });
    return {
      lvl, mod: skillModifier(c, "Occult: Harmony"), learnMax, known, canLearn: Math.max(0, learnMax - known.length),
      open, held, aff, aether, released, turnsLeft: Math.max(0, num(h.turns)), kept: Math.max(0, num(h.kept)),
      shift: lvl >= 5 ? Math.max(0, 3 - num(u["p:Occult: Harmony:5"])) : 0,   // level 5 Active: change one chakra (2 AP), 3 uses a long rest
      canRelease: lvl >= 7, canAll: lvl >= 10, releaseTurns: lvl,              // released for SP turns from the first release
      next: CHAKRAS.find(x => lvl < x.lvl) || null,
    };
  }
  // What the reinforced chakras do right now, for the sheet's "At a glance" panel: Wind in the Opening chakra adds to
  // Movement itself; every other power becomes a short line with the practitioner's numbers ({ k: label, v: value, el }).
  function harmonyGlance(c) {
    const st = harmonyState(c), out = { move: 0, facts: [] };
    if (!st.lvl || !Object.keys(st.held).length) return out;
    const add = (k, v, el, ch) => out.facts.push({ k, v, el, ch });
    Object.entries(st.held).forEach(([ch, el]) => {
      const a = num(st.aff[el]), half = Math.floor(a / 2), h15 = clamp(half, 1, 5), h1 = Math.max(1, half);
      const t = ch + ":" + el, rel = st.released.includes(ch);
      switch (t) {
        case "opening:fire": add("Reflex saves", `+${a}`, el, ch); break;
        case "opening:earth": add("Fortitude saves", `+${a}`, el, ch); break;
        case "opening:wind": out.move = Math.min(5, a); break;
        case "opening:water": add("Defend", `+${a}`, el, ch); break;
        case "opening:spirit": add("Willpower saves", `+${a}`, el, ch); break;
        case "life:fire": add(a >= 6 ? "Presence checks" : "Presence checks (secondary)", `+${a}`, el, ch); break;
        case "life:earth": add(a >= 6 ? "Strength, Endurance checks and melee" : "Strength, Endurance (secondary) and melee", `+${a}`, el, ch); break;
        case "life:wind": add(a >= 6 ? "Dexterity checks and ranged" : "Dexterity (secondary) and ranged", `+${a}`, el, ch); break;
        case "life:water": add(a >= 6 ? "Mind checks" : "Mind checks (secondary)", `+${a}`, el, ch); break;
        case "life:spirit": add(a >= 6 ? "Wisdom, Willpower checks" : "Wisdom, Willpower (secondary)", `+${a}`, el, ch); break;
        case "pain:fire": add("HP lost on a failed save", `−${h15}`, el, ch); break;
        case "pain:earth": add("Brace: mitigation", `+${half}`, el, ch); break;
        case "pain:wind": add("Toxicity gained", `−${h15}`, el, ch); break;
        case "pain:water": add("Bleeding from wounds", `−${h1}`, el, ch); break;
        case "pain:spirit": add("Deprivation lost (not hunger)", `−${h1}`, el, ch); break;
        case "healing:fire": add("Short rest, once: Toxicity", `−${a}`, el, ch); break;
        case "healing:earth": add("Short rest, once: Blood", `+${10 * a}`, el, ch); break;
        case "healing:wind": add("Short rest, once: HP", `+${2 * a}`, el, ch); break;
        case "healing:water": add("Healing: per 5 HP", `+${half}`, el, ch); break;
        case "healing:spirit": add("Sanity recovered again", `up to ${a}`, el, ch); break;
        case "limit:fire": add("Rolls hindered by ailments", `+${2 * a}`, el, ch); break;
        case "limit:earth": add("Exhaustion stacks ignored", `${half}`, el, ch); break;
        case "limit:wind": add("Resist deafen, paralyse, poison", `+${2 * a}`, el, ch); break;
        case "limit:water": add("Resist blind, petrify, stun", `+${2 * a}`, el, ch); break;
        case "limit:spirit": add("Resist charm, fright", `+${2 * a}`, el, ch); break;
        case "view:fire": add("Fire damage", a >= 4 ? "−2, resisted" : "−2", el, ch); if (a >= 6) add("Next attack, once a round", `+${a} fire`, el, ch); break;
        case "view:earth": add("Bludgeoning, poison damage", `−2${a >= 4 ? ", bludgeoning resisted" : ""}${a >= 6 ? ", poison resisted" : ""}`, el, ch); break;
        case "view:wind": add("Slashing, cold damage", `−2${a >= 4 ? ", slashing resisted" : ""}${a >= 6 ? ", cold resisted" : ""}`, el, ch); break;
        case "view:water": add("Piercing, lightning damage", `−2${a >= 4 ? ", piercing resisted" : ""}${a >= 6 ? ", lightning resisted" : ""}`, el, ch); break;
        case "view:spirit": add("Psychic damage", `−2${a >= 6 ? ", resisted" : ""}`, el, ch); if (a >= 4) add("Sanity checks", `+${2 * a}`, el, ch); break;
        case "death:fire": add(`Under ${2 * a} HP`, "bonus damage counts as weapon damage; re-roll a miss once a round", el, ch); break;
        case "death:earth": add("Stabilising", `Harmony checks; wake with ${a} HP`, el, ch); break;
        case "death:wind": add(`Under ${2 * a} HP`, `+${a} AP`, el, ch); break;
        case "death:water": add(`Under ${2 * a} HP`, `regain ${a} HP a turn for 3 turns`, el, ch); break;
        case "death:spirit": add("At 0 HP", `fight on for ${a} turns`, el, ch); break;
      }
      if (rel && ch === "view") add("View released", "temporary HP equal to your maximum, against its damage types", el, ch);
      if (rel && ch === "death") add("Death released", "every reinforcement effect for 2 turns", el, ch);
    });
    return out;
  }
  // The book's line with the practitioner's numbers filled in: "your Fire Affinity" → its value, "2xFire Affinity" → twice it,
  // "Fire Affinity/2" → half (rounded down; the book doesn't say). A line that starts "With a Fire Affinity of 6 or higher"
  // only applies from that affinity on.
  function harmonyLine(text, aff) {
    const need = (text.match(/^With a \w+ Affinity of (\d+) or higher/) || [])[1];
    const val = (el, k) => k * num(aff[el.toLowerCase()]);
    const parts = []; let rest = text, m;
    const re = /(\d+)x\s?(Fire|Earth|Wind|Water|Spirit) Affinity|half your (Fire|Earth|Wind|Water|Spirit) Affinity|(Fire|Earth|Wind|Water|Spirit) Affinity\/2|(Fire|Earth|Wind|Water|Spirit) Affinity(?! of)/;
    while ((m = rest.match(re))) {
      const at = m.index + m[0].length;
      const v = m[1] ? val(m[2], +m[1]) : m[3] ? Math.floor(val(m[3], 1) / 2) : m[4] ? Math.floor(val(m[4], 1) / 2) : val(m[5], 1);
      parts.push(rest.slice(0, at), { v }); rest = rest.slice(at);
    }
    parts.push(rest);
    return { parts, need: need ? +need : 0 };
  }

  // ---------- Occult: Daemonology (rulebook 2020.1, 10.1) ----------
  // Daemons are summoned once a contract is formed: 2 AP to summon, 1 to dismiss (1 and 0 from Demonology 7), one at a
  // time. Summons a day: 1 per 2 SP; a daemon can stay half an hour per SP. Perks: partial summon (4, 2 uses), boost (5,
  // 2 uses), unlimited partial summons for materials (6), banish (7, 1 use), +2 AP a turn for daemons' innate abilities (7),
  // unlimited boosts for materials (8), a Guardian outside the duration (9), up to 5 at once (10: 5 AP, 3 Stamina).
  function demonState(c) {
    const lvl = sk(c, "Demonology"), d = c.demon || {}, u = c.uses || {};
    const left = (lv, n) => Math.max(0, n - num(u["p:Demonology:" + lv]));
    const perDay = Math.floor(lvl / 2), used = Math.max(0, num(d.today));
    return {
      lvl, mod: skillModifier(c, "Demonology"), perDay, used, left: Math.max(0, perDay - used), hours: lvl / 2,
      summonAP: lvl >= 7 ? 1 : 2, dismissAP: lvl >= 7 ? 0 : 1, extraAP: lvl >= 7 ? 2 : 0,
      contracts: lvl >= 3, partial: lvl >= 4, partialLeft: lvl >= 4 ? left(4, 2) : 0, partialMat: lvl >= 6,
      boost: lvl >= 5, boostLeft: lvl >= 5 ? left(5, 2) : 0, boostMat: lvl >= 8,
      banish: lvl >= 7, banishLeft: lvl >= 7 ? left(7, 1) : 0, guardian: lvl >= 9, army: lvl >= 10,
    };
  }

  // ---------- Dreamwalking (rulebook 2020.1, 12.3) ----------
  // Toll (%) is the pressure of everything the dreamwalker sustains: GM-set tolls on translocations and transfigurations,
  // items in the dream realm, the Observation Active (+5% until a long rest), dreamwalking during a mundane task (+15%),
  // travellers (+8% each), a dreamsphere's extra size (+4% per 2 m) and extra turns (+5% each), dreamseeds past two (+15%
  // each, until destroyed). Bonus = modifier − Toll; Calamity chance = 5% + Toll. Tolls disperse when released or at a
  // long rest (dreamseeds stay until destroyed).
  // Put something from the dream realm's vault back where it came from: a weapon or a suit of armor to Gear (a suit
  // comes back taken off), anything else to the inventory (joining a stack of the same name).
  function dreamReturn(c, v) {
    if ((v.kind === "weapon" || v.kind === "armor") && v.obj && typeof v.obj === "object") {
      const list = v.kind === "weapon" ? (c.weapons = c.weapons || []) : (c.armor = c.armor || []);
      const o = Object.assign({}, v.obj, { id: v.obj.id || v.id });
      if (v.kind === "armor") o.worn = false;
      if (list.some(x => x.id === o.id)) o.id = o.id + "-" + Math.random().toString(36).slice(2, 7);
      list.push(o); return;
    }
    const items = c.items = c.items || [], have = items.find(i => i.name === v.name);
    if (have) have.qty = num(have.qty) + num(v.qty); else items.push({ id: v.id, name: v.name, qty: num(v.qty), size: v.size || "small" });
  }

  function dreamState(c) {
    const lvl = sk(c, "Dreamwalking"), d = c.dream || {}, u = c.uses || {};
    const parts = [];
    (d.tolls || []).forEach(t => parts.push([t.n || "Manipulation", Math.max(0, num(t.pct)), t.id]));
    (d.vault || []).forEach(v => { if (!v.lost && num(v.pct)) parts.push([`${v.name} in the dream realm`, Math.max(0, num(v.pct)), "v:" + v.id]); });
    if (d.inRealm && d.mundane) parts.push(["Dreaming while awake", 15, "mundane"]);
    if (d.inRealm && num(d.travelers)) parts.push([`${num(d.travelers)} traveller${num(d.travelers) === 1 ? "" : "s"}`, 8 * num(d.travelers), "travel"]);
    const sp = d.sphere;
    if (sp && (num(sp.grow) || num(sp.extra))) parts.push(["The dreamsphere", 4 * num(sp.grow) + 5 * num(sp.extra), "sphere"]);
    const seeds = (d.seeds || []).length;
    if (seeds > 2) parts.push([`${seeds - 2} dreamseed${seeds - 2 === 1 ? "" : "s"} past two`, 15 * (seeds - 2), "seeds"]);
    const toll = parts.reduce((a, p) => a + p[1], 0), mod = skillModifier(c, "Dreamwalking");
    return {
      lvl, mod, toll, parts, bonus: mod - toll, calamity: 5 + toll,
      enter: lvl >= 3, easyEnter: lvl >= 6, transpose: lvl >= 4, vault: lvl >= 5, translocate: lvl >= 5, observe: lvl >= 6,
      observeLeft: lvl >= 6 ? Math.max(0, 2 - num(u["p:Dreamwalking:6"])) : 0, spheres: lvl >= 7, transfigure: lvl >= 7,
      travellers: lvl >= 8, sphereAP: lvl >= 9 ? 1 : 2, sphereLeft: lvl >= 7 ? Math.max(0, 3 - num(u["p:Dreamwalking:7"])) : 0,
      delay: lvl >= 9, seeds: lvl >= 10,
    };
  }

  // ---------- Alchemy (rulebook 2020.1, 10.2) ----------
  // Every transmutation uses an alchemical circle; each circle does one thing. The size table gives the time to draw and
  // to activate (FA, BA and A as the book writes them). Elements from 3, compounds from 5, organics from 7. Life energy
  // drawn from the earth from 4: (SP/2)d6, and a Medium or larger circle eats at least 1 ration. Signature Circles: one at
  // 6 (Medium or below), a second at 9 (Large or below). Arrays at 8: up to 5 (arms, legs, torso), Medium or below, or one
  // Large over 2 limbs and the torso; 50–100 hours to embed. Re-roll at 9; the maximum energy at 10.
  const ALCH_SIZES = [
    ["fine", "Fine", "below 15 cm", "2 FA", "1 FA"], ["diminutive", "Diminutive", "15 to 30 cm", "1 BA", "2 FA"], ["small", "Small", "15 cm to 1 m", "1 BA", "4 FA"],
    ["medium", "Medium", "1 to 2 m", "1 A", "1 BA"], ["large", "Large", "2 to 5 m", "2 A to 1 minute", "1 A"], ["huge", "Huge", "5 to 10 m", "1 to 5 minutes", "1 A"],
    ["gigantic", "Gigantic", "10 to 30 m", "5 minutes to 1 hour", "1 minute"], ["gargantuan", "Gargantuan", "30 to 100 m", "1 to 4 hours", "5 minutes"], ["colossal", "Colossal", "above 100 m", "at least 4 hours", "30 minutes"],
  ];
  const ALCH_SIZE_I = Object.fromEntries(ALCH_SIZES.map((x, i) => [x[0], i]));
  const ALCH_LIMBS = [["larm", "Left arm"], ["rarm", "Right arm"], ["torso", "Torso"], ["lleg", "Left leg"], ["rleg", "Right leg"]];
  function alchState(c) {
    const lvl = sk(c, "Alchemy"), a = c.alch || {};
    const sigs = (a.circles || []).filter(x => x.sig);
    return {
      lvl, mod: skillModifier(c, "Alchemy"),
      can: lvl >= 7 ? "Elements, compounds and organic compounds" : lvl >= 5 ? "Elements and compounds (not organic ones)" : lvl >= 3 ? "Pure elements, mixtures and alloys" : "From Alchemy 3",
      earth: lvl >= 4 ? Math.floor(lvl / 2) : 0,                 // d6 of life energy drawn from the earth
      sigMax: lvl >= 9 ? 2 : lvl >= 6 ? 1 : 0, sigs: sigs.length,
      sigBiggest: i => (i === 0 ? ALCH_SIZE_I.medium : ALCH_SIZE_I.large),   // the first Signature Circle Medium or below, the second Large or below
      arrays: lvl >= 8, reroll: lvl >= 9, maxEnergy: lvl >= 10,
    };
  }

  // ---------- Armor Maintenance (rulebook 16.5 and the Armor chapter) ----------
  // Repair (book): cost = the type's grams × Armor Value; roll an Armor Maintenance check (d100 − modifier);
  // Repair Count = 10 − check ÷ 10, rounded down; roll the type's Repair Die that many times and add it to the Soak Pool.
  // Our readings: the Repair Count is capped at 10 (Utku); a broken suit (Soak 0) needs a skilled craftsman,
  // which we read as Armor Maintenance 5 and double materials (draft, to confirm).
  // Crafting: the 2020.1 book names it but gives no procedure, so it follows the book's weapon crafting (our reading):
  // 5 × the repair materials, difficulty 70%, the GM gives type, AV and Soak; a failure adds a flaw and rolls again;
  // a second failure loses everything. Optional extras mirror the weapon table: +1 AV = −10%, +5 Soak = −5%.
  const AM_CRAFT_DC = 70;
  const AM_FORGE = ["heavy", "plate"];          // heavy and plate armor need smelting: a forge
  function amState(c) {
    const lvl = sk(c, "Armor Maintenance"), a = (c.craft && c.craft.armor) || {};
    return { lvl, mod: skillModifier(c, "Armor Maintenance") + num(a.bonus), bonus: num(a.bonus),
             repair: lvl >= 3, craft: lvl >= 4, restore: lvl >= 5, artisan: lvl >= 8, forge: !!a.forge };
  }
  const repairCount = check => clamp(Math.floor(10 - check / 10), 0, 10);
  // Everything a repair of suit a needs: cost, materials, dice, and why it can't happen yet (if so).
  function repairPlan(c, a) {
    const st = amState(c), t = ARMOR[a.type] || ARMOR.light, chk = armorCheck(c, a);
    // A suit sent by another player carries its wearer's own maximum (their Armor Mastery bonus included).
    const max = a.jobMax != null ? num(a.jobMax) : chk.soakMax, soak = clamp(num(a.soak), 0, max);
    // A suit with no Soak Pool yet (a new card on the Gear tab) isn't broken: it just hasn't been given its stats.
    const unset = max <= 0, broken = !unset && soak <= 0, av = Math.max(1, num(a.av));
    const cost = t.repairPerAV * av * (broken ? 2 : 1);
    const sides = +String(t.repairDie).slice(1);
    const have = num(c.craft && c.craft.supplies && c.craft.supplies[a.type]);
    let block = "";
    if (!st.repair) block = `Repairing armor needs Armor Maintenance 3 ("Is that a dent?"). This character has ${st.lvl}.`;
    else if (unset) block = "This suit has no Soak Pool set. Give it its AV and Soak on the Gear tab.";
    else if (soak >= max) block = "This suit's Soak Pool is already full.";
    else if (broken && !st.restore) block = "It's broken (Soak 0). Rebuilding it needs a skilled craftsman: Armor Maintenance 5.";
    else if (AM_FORGE.includes(a.type) && !st.forge) block = `${t.label} armor needs a forge. Tick "At a forge" under Supplies.`;
    else if (have < cost) block = `Needs ${cost} g of ${t.label.toLowerCase()} armor materials (have ${have}).`;
    return { cost, av, mat: a.type, die: t.repairDie, sides, soak, max, broken, unset, missing: max - soak, block, st };
  }
  // A crafting order: { type, av, soak, plusAV, plusSoak, name } → final stats, difficulty, cost.
  function craftPlan(c, r) {
    const st = amState(c), t = ARMOR[r.type] || ARMOR.medium;
    const av = clamp(num(r.av) || t.av[0], t.av[0], t.av[1]);
    const plusAV = clamp(num(r.plusAV), 0, t.av[1] - av);
    const soak = Math.max(5, num(r.soak) || 10 * av), plusSoak = clamp(num(r.plusSoak), 0, 10);
    const finalAV = av + plusAV, finalSoak = soak + 5 * plusSoak;
    const dc = Math.max(5, AM_CRAFT_DC - 10 * plusAV - 5 * plusSoak);
    const cost = 5 * t.repairPerAV * finalAV;
    const have = num(c.craft && c.craft.supplies && c.craft.supplies[r.type]);
    let block = "";
    if (!st.craft) block = `Crafting armor needs Armor Maintenance 4. This character has ${st.lvl}.`;
    else if (AM_FORGE.includes(r.type) && !st.forge) block = `${t.label} armor needs a forge. Tick "At a forge" under Supplies.`;
    else if (have < cost) block = `Needs ${cost} g of ${t.label.toLowerCase()} armor materials (have ${have}).`;
    return { type: r.type in ARMOR ? r.type : "medium", av, plusAV, soak, plusSoak, finalAV, finalSoak, dc, cost, chance: clamp(dc + st.mod - 1, 0, 100), block, st, t };
  }

  // ---------- Weapon Maintenance (rulebook 16.4) ----------
  // Repair: 400 g (one-handed) or 800 g (two-handed), +400 g if Unwieldy; roll a check; Repair Count = 10 − check ÷ 10
  // (rounded down, capped at 10 like armor); roll that many d10 and add it to Durability. An hour per attempt.
  // Craft: 5 × the repair materials; difficulty 70%; the GM gives the base stats; optional changes from the book's
  // Weapons Modification Table; exotic materials (Weapon Maintenance 5) move the difficulty as the GM says.
  // A failure adds a random flaw and rolls again; a second failure (third from level 7) loses everything.
  // On a success, a weapon with fewer than 2 properties gets 2 random positive ones. Eight hours.
  // [name, has a Rating, melee | ranged | both]
  const WEAPON_PROPS = [["Defensive", 1, "both"], ["Durable", 1, "both"], ["Fast", 0, "both"], ["Finesse", 0, "both"], ["Gore", 0, "both"], ["Impact", 0, "both"],
    ["Impale", 0, "both"], ["Penetrating", 1, "both"], ["Reliable", 1, "both"], ["Bladebreaker", 1, "melee"], ["Entangle", 0, "melee"], ["Hack", 0, "melee"],
    ["Light", 0, "melee"], ["Pummel", 1, "melee"], ["Reach", 0, "melee"], ["Shield", 1, "melee"], ["Accurate", 1, "ranged"], ["Blast", 1, "ranged"],
    ["Overbearing", 1, "ranged"], ["Pistol", 0, "ranged"], ["Precise", 1, "ranged"]];
  const WEAPON_FLAWS = [["Brittle", 1, "both"], ["Impotent", 0, "both"], ["Slow", 0, "both"], ["Unwieldy", 0, "both"], ["Poorly Weighed", 0, "melee"],
    ["Undamaging", 0, "melee"], ["Inaccurate", 1, "ranged"], ["Experimental", 0, "ranged"]];
  const DUR_DICE = ["d4", "d6", "d8", "d10", "d12", "d20"];
  // [key, label, difficulty change per step, step size]
  const WEAPON_MODS = [["damage", "Damage +1", 10, 1], ["accuracy", "Accuracy +1%", 2, 1], ["crit", "Critical chance +1%", 2, 1], ["dur", "Durability +1", 1, 1], ["die", "Higher durability die", 5, 1]];
  const WM_CRAFT_DC = 70;
  function wmState(c) {
    const lvl = sk(c, "Weapon Maintenance"), w = (c.craft && c.craft.weapon) || {};
    return { lvl, mod: skillModifier(c, "Weapon Maintenance") + num(w.bonus), bonus: num(w.bonus),
             repair: lvl >= 3, craft: lvl >= 3, exotic: lvl >= 5, props: lvl >= 7 ? 2 : 1, maxFails: lvl >= 7 ? 2 : 1, masterwork: lvl >= 9 };
  }
  const isUnwieldy = w => /unwieldy/i.test(String(w.props || "")) || !!w.unwieldy;
  const weaponRepairCost = w => (num(w.hands) === 2 ? 800 : 400) + (isUnwieldy(w) ? 400 : 0);
  const fitsKind = (kind, k) => k === "both" || k === kind;
  function wRepairPlan(c, w) {
    const st = wmState(c), max = num(w.durMax), dur = clamp(num(w.dur), 0, max), cost = weaponRepairCost(w);
    const have = num(c.craft && c.craft.supplies && c.craft.supplies.weapon);
    let block = "";
    if (!st.repair) block = `Repairing weapons needs Weapon Maintenance 3 ("Is that a dent?"). This character has ${st.lvl}.`;
    else if (!max) block = "This weapon has no durability set. Give it one on the Gear tab.";
    else if (dur >= max) block = "This weapon's durability is already full.";
    else if (have < cost) block = `Needs ${cost} g of weapon materials (have ${have}).`;
    return { cost, dur, max, missing: max - dur, broken: max > 0 && dur <= 0, die: "d10", sides: 10, block, st };
  }
  // A crafting order: { name, skill, hands, unwieldy, damage, crit, accuracy, dur, durDie, plus: {damage, accuracy, crit, dur, die}, props: [], exotic: {name, dc, note} }
  function wCraftPlan(c, r) {
    const st = wmState(c), plus = r.plus || {}, kind = weaponKind({ skill: r.skill }) === "ranged" ? "ranged" : "melee";
    const props = (r.props || []).filter(p => WEAPON_PROPS.some(x => x[0] === p && fitsKind(kind, x[2]))).slice(0, st.props);
    const di = Math.max(0, DUR_DICE.indexOf(r.durDie || "d10")), dieUp = clamp(num(plus.die), 0, DUR_DICE.length - 1 - di);
    const ex = st.exotic && r.exotic && String(r.exotic.name || "").trim() ? r.exotic : null;
    let dc = WM_CRAFT_DC - 10 * num(plus.damage) - 2 * num(plus.accuracy) - 2 * num(plus.crit) - num(plus.dur) - 5 * dieUp - 10 * props.length;
    if (ex) dc += num(ex.dc);
    const cost = 5 * weaponRepairCost(r);
    const have = num(c.craft && c.craft.supplies && c.craft.supplies.weapon);
    let block = "";
    if (!st.craft) block = `Crafting weapons needs Weapon Maintenance 3. This character has ${st.lvl}.`;
    else if (dc <= 0) block = "Those changes make the difficulty 0% or lower: it can't succeed. Take some away.";
    else if (have < cost) block = `Needs ${cost} g of weapon materials (have ${have}).`;
    return { kind, props, dieUp, ex, dc, cost, block, st, chance: clamp(dc + st.mod - 1, 0, 100),
             final: { damage: num(r.damage) + num(plus.damage), accuracy: num(r.accuracy) + num(plus.accuracy), crit: num(r.crit) + num(plus.crit),
                      durMax: num(r.dur) + num(plus.dur), durDie: DUR_DICE[di + dieUp] } };
  }
  // Pick n random entries of a list that fit the weapon and aren't taken yet. A Rating is left for the GM.
  function randomTraits(list, kind, taken, n) {
    const pool = list.filter(([k, , t]) => fitsKind(kind, t) && !taken.includes(k) && k !== "Shield"), out = [];
    while (out.length < n && pool.length) out.push(pool.splice(rollDie(pool.length) - 1, 1)[0]);
    return out.map(([k, rated]) => (rated ? `${k} (Rating: GM)` : k));
  }

  // ---------- Brewing (rulebook 16.1 and the Brewing skill) ----------
  // A recipe: base materials, effect, toxicity die and difficulty, plus the same per increment.
  // Roll d100 − Brewing modifier under the difficulty; a failure wastes the materials. Then roll toxicity.
  // The book writes the per-increment difficulty as "%15 − SP": we read it as 15% − Brewing (never below 0) per increment.
  // Catalysts: declared before the roll; their difficulty "−%10 + SP" we read as harder by 10% − Brewing.
  // Level 3 brews; 5 increments and catalysts (known: 1 per 3 levels, 4 at 10); 7 Potent Brews (two effects,
  // both rolls must hold, twice as long); 9 potent toxicity takes the higher roll and increments apply to both.
  // [key, name, herb, base g, g per increment, base toxicity, toxicity per increment, base difficulty, difficulty per increment (minus Brewing), duration, effect(sp, n), when]
  const BREWS = [
    { k: "health", n: "Health Potion", herb: "healing herbs", g: 300, gi: 100, tox: "1d8", toxi: "1d4", dc: 50, dci: 15, dur: "long",
      eff: (sp, n) => `${2 * sp + 2 * n} hit points`, how: "Over the next long rest, instead of your natural hit point regeneration, you regain hit points equal to its effect." },
    { k: "skele", n: "Skele-Gro", herb: "bone herbs", g: 400, gi: 150, tox: "1d12", toxi: "1d8", dc: 50, dci: 13, dur: "long",
      eff: (sp, n) => `bones heal ${3 + n}× faster`, how: "Over the next long rest, bones regenerate that many times faster. Count healing time in days." },
    { k: "sanguinar", n: "The Sanguinar", herb: "blood herbs", g: 300, gi: 200, tox: "1d10", toxi: "1d4", dc: 40, dci: 13, dur: "long",
      eff: (sp, n) => `${10 * sp + 3 * sp * n} blood points`, how: "Over the next long rest, instead of your natural blood regeneration, you regain blood points equal to its effect." },
    { k: "sleep", n: "Sleep Tightener", herb: "exhaustion herbs", g: 500, gi: 500, tox: "1d8", toxi: "1d6", dc: 30, dci: 18, dur: "long",
      eff: (sp, n) => `${1 + n} Exhaustion point${n ? "s" : ""}`, how: "Over the next long rest, on top of natural recovery, you regain that many Exhaustion points." },
    { k: "pickme", n: "The Pick Me Up", herb: "exhaustion herbs", g: 200, gi: 100, tox: "1d6", toxi: "1d4", dc: 50, dci: 13, dur: "now",
      eff: (sp, n) => `${Math.floor(sp / 3) + n} turn${Math.floor(sp / 3) + n === 1 ? "" : "s"}`, how: "Takes effect at once: the side effects of Exhaustion wait that many turns." },
  ];
  const CATALYSTS = [
    { k: "duration", n: "Duration Catalyst", dc: 10, what: "Doubles the brew's active duration (only brews lasting less than an hour). Toxicity ×2." },
    { k: "toxicity", n: "Toxicity Catalyst", dc: 12, what: "Lowers the brew's toxicity by your Brewing." },
    { k: "volatile", n: "Volatile Catalyst", dc: 10, what: "Roll a d100: 1–10 five more increments, 11–25 three more, 26–70 nothing, 71–94 it fizzles and turns inert, 95–100 it explodes for 1d20 damage in 2 m." },
  ];
  const VOLATILE = [[10, 5, "Five more increments!"], [25, 3, "Three more increments."], [70, 0, "Nothing happens."], [94, -1, "It fizzles and turns inert."], [100, -2, "It explodes: 1d20 damage to everyone within 2 m."]];
  const parseDie = d => { const m = /^(\d*)d(\d+)$/i.exec(String(d || "").trim()); return m ? { n: +(m[1] || 1), sides: +m[2] } : null; };
  function brewState(c) {
    const lvl = sk(c, "Brewing"), b = (c.craft && c.craft.brew) || {};
    return { lvl, mod: skillModifier(c, "Brewing") + num(b.bonus), bonus: num(b.bonus), brew: lvl >= 3, incs: lvl >= 5, catalysts: lvl >= 5,
             known: lvl >= 10 ? 4 : lvl >= 5 ? Math.max(1, Math.floor(lvl / 3)) : 0, potent: lvl >= 7, potentPlus: lvl >= 9 };
  }
  const allCatalysts = c => [...CATALYSTS, ...(((c.craft && c.craft.brew && c.craft.brew.catalysts) || []).map(k => Object.assign({ custom: true }, k)))];
  const allBrews = c => [...BREWS, ...(((c.craft && c.craft.brew && c.craft.brew.recipes) || []).map(r => Object.assign({ custom: true }, r)))];
  const findBrew = (c, k) => allBrews(c).find(r => r.k === k) || BREWS[0];
  // One brew's numbers at n increments.
  function brewOne(c, rec, n) {
    const st = brewState(c), sp = st.lvl;
    const dci = Math.max(0, num(rec.dci) - sp);
    const td = parseDie(rec.tox) || { n: 1, sides: 6 }, ti = parseDie(rec.toxi);
    const tox = [{ n: td.n, sides: td.sides }]; if (ti && n) tox.push({ n: ti.n * n, sides: ti.sides });
    const effect = rec.custom ? `${rec.effect || "effect"}${n ? ` + ${n} × ${rec.effecti || "more"}` : ""}` : rec.eff(sp, n);
    return { rec, n, grams: num(rec.g) + num(rec.gi) * n, herb: rec.herb || "herbs", dc: num(rec.dc) - dci * n, dci, tox, effect };
  }
  // A brewing order: { k, inc, catalyst, potent: { k, inc } | null }
  function brewPlan(c, o) {
    const st = brewState(c), inc = st.incs ? clamp(num(o.inc), 0, 10) : 0;
    const a = brewOne(c, findBrew(c, o.k), inc);
    const p = st.potent && o.potent && o.potent.k ? brewOne(c, findBrew(c, o.potent.k), st.potentPlus ? inc : (st.incs ? clamp(num(o.potent.inc), 0, 10) : 0)) : null;
    const known = (c.craft && c.craft.brew && c.craft.brew.known) || [];
    const cat = st.catalysts && o.catalyst && known.includes(o.catalyst) ? allCatalysts(c).find(x => x.k === o.catalyst) || null : null;
    const catDc = cat ? Math.max(0, cat.dc - st.lvl) : 0;
    const need = {}; [a, p].filter(Boolean).forEach(b => (need[b.herb] = (need[b.herb] || 0) + b.grams));
    const have = h => num(c.craft && c.craft.supplies && c.craft.supplies["herb:" + h]);
    const dcs = [a, p].filter(Boolean).map(b => b.dc - catDc);
    let block = "";
    if (!st.brew) block = `Brewing potions needs Brewing 3. This character has ${st.lvl}.`;
    else if (dcs.some(d => d <= 0)) block = "That many increments makes it impossible (difficulty 0% or lower). Take some away.";
    else { const short = Object.entries(need).find(([h, g]) => have(h) < g); if (short) block = `Needs ${short[1]} g of ${short[0]} (have ${have(short[0])}).`; }
    return { st, a, p, cat, catDc, need, dcs, chances: dcs.map(d => clamp(d + st.mod - 1, 0, 100)), hours: p ? 2 : 1, block };
  }

  // ---------- Runecrafting (Crafting: Runecrafting, and the skill's perks) ----------
  // Level 3 identify runestones; 4 enchant semi-precious gems; 5 precious gems, and extra materials (+1% per 50 rubles);
  // 6 Hoaxstones; 7 Potent Runestones (two effects, twice the time); 8 one re-roll per gemstone; 9 extract runes;
  // 10 move enchantments, merge two runestones. An enchantment takes 8 hours.
  const GEMS = [
    { k: "amethyst", n: "Amethyst", hue: "#8a5cd0" }, { k: "garnet", n: "Garnet", hue: "#9e1f2e" }, { k: "topaz", n: "Topaz", hue: "#e3a23a" },
    { k: "jade", n: "Jade", hue: "#3f9b6a" }, { k: "lapis", n: "Lapis lazuli", hue: "#2c4fa8" }, { k: "moonstone", n: "Moonstone", hue: "#c9d6e6" },
    { k: "ruby", n: "Ruby", hue: "#d0213f", precious: true }, { k: "sapphire", n: "Sapphire", hue: "#1f55d6", precious: true },
    { k: "emerald", n: "Emerald", hue: "#14a35a", precious: true }, { k: "diamond", n: "Diamond", hue: "#e8f4ff", precious: true },
    { k: "other", n: "Other vessel", hue: "#b08a5a" },
  ];
  // The Runecrafting Difficulty table: d100 − modifier → the stone's potency. 30 or more fails.
  const RUNE_TABLE = [[-31, "12"], [-21, "d12"], [-11, "d10"], [-1, "d8"], [9, "d6"], [19, "d4"], [29, "1"]];
  const POTENCY_RANK = ["1", "d4", "d6", "d8", "d10", "d12", "12"];
  function runePotency(result, semi) {
    const row = RUNE_TABLE.find(([hi]) => result <= hi);
    if (!row) return { pot: null, capped: false };
    // Semi-precious gems hold power up to d6; anything better counts as d6.
    if (semi && POTENCY_RANK.indexOf(row[1]) > POTENCY_RANK.indexOf("d6")) return { pot: "d6", capped: row[1] };
    return { pot: row[1], capped: false };
  }
  const HOAX_PAY = { hp: { n: "hit points", per: 2 }, bp: { n: "blood points", per: 10 }, dp: { n: "deprivation points", per: 5 } };
  /* ---------- Hunting (Presence) ---------- */
  // Salvaging Roll: the Hunting check's result → how many of the trophy's properties are positive or negative.
  const SALVAGE = [[-Infinity, -30, "pos", 8], [-29, -20, "pos", 7], [-19, -10, "pos", 6], [-9, 0, "pos", 5], [1, 10, "pos", 4], [11, 20, "pos", 3], [21, 30, "pos", 2], [31, 50, "pos", 1],
    [51, 60, "neg", 1], [61, 70, "neg", 2], [71, 80, "neg", "all"], [81, Infinity, "fail", 0]];
  function salvageRow(total) { return SALVAGE.find(([lo, hi]) => total >= lo && total <= hi); }
  // A trophy of level L has 2 × L properties (the book's example: level 3, 6 properties). The roll decides some of them;
  // a trophy can't be all positive. Every property left over is rolled again: a result in the negative rows (51 or more)
  // makes it negative, anything lower leaves it void (the app's reading of the book's example).
  function salvagePlan(lvl, total) {
    const n = 2 * clamp(Math.round(num(lvl)) || 1, 1, 5), row = salvageRow(total);
    if (row[2] === "fail") return { n, fail: true, pos: 0, neg: 0, rest: 0, row };
    if (row[3] === "all") return { n, fail: false, pos: 0, neg: n, rest: 0, row };
    const pos = row[2] === "pos" ? Math.min(row[3], n - 1) : 0, neg = row[2] === "neg" ? Math.min(row[3], n) : 0;
    return { n, fail: false, pos, neg, rest: n - pos - neg, row, capped: row[2] === "pos" && row[3] > n - 1 };
  }
  const salvageRest = total => total >= 51 ? "neg" : "void";
  // Combining Roll: how many of the giver's positive properties move to the receiver.
  const COMBINE = [[-30, 9], [-20, 8], [-10, 7], [0, 6], [10, 5], [20, 4], [30, 3], [50, 2], [60, 1], [80, 0]];
  function combineCount(total) { if (total >= 80) return { fail: true, n: 0 }; const r = COMBINE.find(([under]) => total < under); return { fail: false, n: r ? r[1] : 0 }; }
  function huntState(c) {
    const lvl = sk(c, "Hunting"), h = (c.craft && c.craft.hunt) || {}, trophies = h.trophies || [];
    const belted = trophies.filter(t => t.belted), attuned = trophies.filter(t => t.attuned);
    return { lvl, mod: skillModifier(c, "Hunting") + num(h.bonus), bonus: num(h.bonus),
      use: lvl >= 3, maxLvl: lvl >= 3 ? Math.min(5, lvl - 2) : 0, salvage: lvl >= 4, release: lvl >= 5, second: lvl >= 6, combine: lvl >= 7, reroll: lvl >= 8,
      together: lvl >= 9, ap: lvl >= 9 ? 0 : 1, legend: lvl >= 10, myths: lvl >= 3 ? lvl - 2 : 0,
      slots: clamp(Math.round(num(h.slots)) || 4, 1, 12), belted, attuned, attuneMax: lvl >= 3 ? 1 : 0 };
  }

  function runeState(c) {
    const lvl = sk(c, "Runecrafting"), b = (c.craft && c.craft.rune) || {};
    return { lvl, mod: skillModifier(c, "Runecrafting") + num(b.bonus), bonus: num(b.bonus), identify: lvl >= 3, semi: lvl >= 4, precious: lvl >= 5,
             extra: lvl >= 5, hoax: lvl >= 6, potent: lvl >= 7, reroll: lvl >= 8, extract: lvl >= 9, sage: lvl >= 10 };
  }
  // An enchanting order: { gem, gemName, precious, kind: enhance|manifest, effect, dc, cost, extra, second: { kind, effect, dc } | null, hoax, pay, hours }
  function runePlan(c, o) {
    const st = runeState(c), g = GEMS.find(x => x.k === o.gem) || GEMS[0];
    const hoax = st.hoax && !!o.hoax;
    const precious = !hoax && (g.k === "other" ? !!o.precious : !!g.precious);
    const semi = !hoax && !precious;
    const second = st.potent && !hoax && precious && o.second ? o.second : null;
    const extra = st.extra && !hoax ? Math.max(0, num(o.extra)) : 0;
    const extraPct = Math.floor(extra / 50);
    const mod = st.mod + extraPct, cost = Math.max(0, num(o.cost));
    const eff = x => ({ kind: x.kind === "manifest" ? "manifest" : "enhance", effect: String(x.effect || "").trim(), dc: num(x.dc), note: String(x.note || "").trim() });
    const effects = [eff(o)].concat(second ? [eff(second)] : []);
    // Chance to succeed: an enhancing stone holds on d100 − mod below 30, a manifesting stone below the GM's difficulty.
    const chances = effects.map(e => clamp((e.kind === "manifest" ? e.dc : 30) + mod - 1, 0, 100));
    const hours = Math.max(1, Math.floor(num(o.hours)) || 1), pay = HOAX_PAY[o.pay] ? o.pay : "hp";
    const life = hoax ? Math.max(1, Math.ceil(cost / 100)) * HOAX_PAY[pay].per * hours : 0;
    const name = hoax ? (String(o.gemName || "").trim() || "a mundane object") : g.k === "other" ? (String(o.gemName || "").trim() || "a vessel") : g.n;
    const have = num(c.craft && c.craft.supplies && c.craft.supplies.runemat);
    const lifeHave = hoax ? derived(c).cur[pay] : 0;
    let block = "";
    if (hoax) { if (!st.hoax) block = "Hoaxstones need Runecrafting 6."; else if (life > lifeHave) block = `This Hoaxstone costs ${life} ${HOAX_PAY[pay].n}; you have ${lifeHave}.`; }
    else if (!st.semi) block = `Enchanting gems needs Runecrafting 4. This character has ${st.lvl}.`;
    else if (precious && !st.precious) block = "Precious gems need Runecrafting 5. Pick a semi-precious gem.";
    else if (cost + extra > have) block = `Needs ${cost + extra} rubles' worth of materials (have ${have}).`;
    if (!block && effects.some(e => !e.effect)) block = "Describe the effect first (what the GM agreed it does).";
    if (!block && effects.some(e => e.kind === "manifest" && e.dc <= 0)) block = "Set the difficulty the GM gave for the manifesting effect.";
    return { st, g, name, hoax, precious, semi, second: !!second, effects, extra, extraPct, mod, cost, spend: hoax ? 0 : cost + extra,
             chances, hours: second ? 16 : 8, lasts: hoax ? hours : 0, life, pay, payName: HOAX_PAY[pay].n, block };
  }

  // ---------- Tabletop Simulator export ----------
  function toTabletop(c) {
    const d = derived(c);
    const attrs = {}, attrBases = {}; ATTRS.forEach(a => { attrs[a.k] = attr(c, a.k); attrBases[a.k] = attrBase(c, a.k); });
    const skills = {}; Object.keys(SKILLS).forEach(s => { if (sk(c, s)) skills[s] = sk(c, s); });
    const weap = WEAPON_TYPES.map(([w]) => [w, num(c.weaponSkills[w])]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
    const sec = SECONDARY.map(s => [s.name, num(c.secondary[s.name])]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
    return {
      cw: 1, id: c.id || "", name: c.name, profession: c.profession, faction: c.faction,
      age: c.age, height: c.height, weight: c.weight, karma: num(c.karma), pool: num(c.pool),
      portrait: c.portraitUrl || "",
      attrs, attrBases, skills, weapons: weap, secondary: sec,
      vitals: { hp: d.cur.hp, hpMax: d.max.hp, bp: d.cur.bp, bpMax: d.max.bp, dp: d.cur.dp, dpMax: d.max.dp,
                tox: d.cur.tox, toxMax: d.max.tox, exhaustion: num(c.vitals.exhaustion), staminaLost: num(c.vitals.staminaLost),
                wounds: Object.assign({}, c.vitals.wounds) },
      move: d.move,
    };
  }
  // Merge a code exported from the Tabletop Simulator sheet back into a character.
  function fromTabletop(c, t) {
    if (!t || t.cw !== 1) throw new Error("That isn't a Clockwork code. Copy it from the sheet's Export button.");
    const n = normalize(JSON.parse(JSON.stringify(c)));
    ["name", "profession", "faction", "age", "height", "weight"].forEach(k => { if (typeof t[k] === "string" && t[k]) n[k] = t[k]; });
    if (Number.isFinite(t.karma)) n.karma = t.karma;
    if (Number.isFinite(t.pool)) n.pool = t.pool;
    if (t.attrs) ATTRS.forEach(a => { if (Number.isFinite(t.attrs[a.k])) n.attrs[a.k].value = t.attrs[a.k]; });
    if (t.skills) Object.keys(SKILLS).forEach(s => (n.skills[s] = Number.isFinite(t.skills[s]) ? t.skills[s] : 0));
    if (Array.isArray(t.weapons)) t.weapons.forEach(([w, l]) => { if (w in n.weaponSkills && Number.isFinite(l)) n.weaponSkills[w] = l; });
    if (Array.isArray(t.secondary)) t.secondary.forEach(([s, l]) => { if (s in n.secondary && Number.isFinite(l)) n.secondary[s] = l; });
    if (t.vitals) {
      const v = t.vitals;
      ["hp", "bp", "dp", "tox"].forEach(k => { if (Number.isFinite(v[k])) n.vitals[k] = v[k]; });
      // The Tabletop sheet still has two counters for the one track: take whichever was changed there.
      const was = num(n.vitals.exhaustion), a = v.exhaustion, b = v.staminaLost;
      const pick = Number.isFinite(a) && a !== was ? a : Number.isFinite(b) && b !== was ? b : was;
      setStamina(n, pick);
      if (v.wounds) ["light", "moderate", "mortal"].forEach(k => { if (Number.isFinite(v.wounds[k])) n.vitals.wounds[k] = v.wounds[k]; });
    }
    return n;
  }

  return { ATTRS, ATTR_NAME, SKILL_GROUPS, SKILLS, CASTING, WEAPON_TYPES, WEAPON_ATTR, RANGED_WEAPONS, weaponKind, SECONDARY, SECONDARY_BY_NAME, SIZES, ITEM_SIZES, ITEM_SIZE, PROSTHETIC_TYPES, ARMOR,
           ENCUMBRANCE, WOUNDS, EXHAUSTION, LEVELS, clamp, num, tri, karmaBetween, levelDelta, blankCharacter, normalize,
           attr, attrBase, attrThreshold, attrCap, attrCost, skillCap, weaponCap, pointsAbove10, secondaryCap, secondaryCost,
           proficiency, karmaSpent, armorCheck, armorPenalties, wornArmor, dreamReturn, skillModifier, secondaryBonus, vitalsMax, derived,
           encumbrance, itemUnits, weaponLine, shortRest, longRest, setStamina, refreshUses, rollAttribute, rollAttributeDetail, ATTR_BLURB, toTabletop, fromTabletop,
           WORD_KINDS, WARD_GRAMMAR, WARD_KIND_NAME, wardState, wardNext, wardCost, wardPlan, wardFatigue, HARMONY_ELEMENTS, HARMONY_LEARN, CHAKRAS, CHAKRA_BY, harmonyState, harmonyLine, harmonyGlance, demonState, dreamState, ALCH_SIZES, ALCH_SIZE_I, ALCH_LIMBS, alchState,
           PT_PARTS, MUNITIONS, MUNITION, COATS, TIPS, AREAS, ELEMENTS, STATUSES, PT_GRAMS, PT_BASE_DC, ptLists, ptAccess, ptState, ptDifficulty, ptChance, ptSteps, ptYield, ptName, rollDie,
           AM_CRAFT_DC, AM_FORGE, amState, repairCount, repairPlan, craftPlan,
           WEAPON_PROPS, WEAPON_FLAWS, DUR_DICE, WEAPON_MODS, WM_CRAFT_DC, wmState, weaponRepairCost, wRepairPlan, wCraftPlan, randomTraits,
           BREWS, CATALYSTS, VOLATILE, parseDie, brewState, allCatalysts, allBrews, findBrew, brewOne, brewPlan,
           GEMS, RUNE_TABLE, runePotency, HOAX_PAY, runeState, runePlan,
           SALVAGE, salvageRow, salvagePlan, salvageRest, COMBINE, combineCount, huntState };
})();
if (typeof module !== "undefined") module.exports = CW;
