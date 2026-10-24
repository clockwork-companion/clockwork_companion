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
      portraitAsset: "", portraitUrl: "", notes: "",
      karma: 0, pool: 0,
      attrs, skills, weaponSkills: weapons, secondary,
      vitals: { hp: null, bp: null, dp: null, tox: 0, exhaustion: 0, staminaLost: 0,
                wounds: { light: 0, moderate: 0, mortal: 0 }, conditions: [] },
      prosthetics: [], coins: 0,
      items: [], weapons: [], armor: [], log: [],
      craft: { supplies: { container: 0 }, bonus: 0, batch: {}, recipe: { type: "rifle" }, ledger: [],
               armor: { forge: false, bonus: 0, recipe: { type: "medium", av: 5, soak: 50, plusAV: 0, plusSoak: 0, name: "" }, ledger: [] } },
      talents: [], uses: {},
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
    // Stamina lost and Exhaustion are one track: each Stamina stack lost is a level of Exhaustion.
    // Older sheets kept them apart, so take the higher of the two. staminaLost stays as a mirror for the Tabletop sheet.
    out.vitals.exhaustion = clamp(Math.max(num(out.vitals.exhaustion), num(out.vitals.staminaLost)), 0, 10);
    out.vitals.staminaLost = out.vitals.exhaustion;
    if (!Array.isArray(out.vitals.conditions)) out.vitals.conditions = [];
    out.craft = Object.assign({}, b.craft, out.craft);
    ["supplies", "batch"].forEach(k => (out.craft[k] = Object.assign({}, b.craft[k], out.craft[k])));
    out.craft.recipe = Object.assign({ type: "rifle" }, out.craft.recipe);
    if (!Array.isArray(out.craft.ledger)) out.craft.ledger = [];
    out.craft.armor = Object.assign({}, b.craft.armor, out.craft.armor);
    out.craft.armor.recipe = Object.assign({}, b.craft.armor.recipe, out.craft.armor.recipe);
    if (!Array.isArray(out.craft.armor.ledger)) out.craft.armor.ledger = [];
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
    const move = enc.tier.move == null ? 0 : Math.max(0, baseMove + enc.effectiveMove);
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
      move, baseMove, climb: Math.floor(move / 2),
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
  function ptDifficulty(part, inc = 0) {
    if (part === "coat") return 60;
    if (part === "tip") return 40 - 5 * inc;
    if (part === "area") return 30;
    if (part === "core") return 40 - 10 * inc;
    return 40;
  }
  // Chance that d100 (1–100) − mod lands below dc.
  const ptChance = (dc, mod) => clamp(dc + mod - 1, 0, 100);
  // The steps a recipe needs, in crafting order. A recipe: { type, coat, tips: {Precise: inc, …}, area: {k, cone}, core: {el, inc}, status: [names] }.
  function ptSteps(c, rc) {
    const st = ptState(c), type = rc.type, steps = [];
    const can = p => ptAccess(type, p) && st.unlock[p];
    const m = MUNITION[type] || MUNITIONS[0];
    const coat = can("coat") ? rc.coat || "Piercing" : "Piercing";
    steps.push({ part: "coat", key: "coat", label: m.shape === "grenade" ? "Casing" : m.shape === "flask" ? "Base oil" : `${coat} coat`, dc: 60, mat: "container" });
    if (can("tip")) TIPS.forEach(([k, rated]) => {
      const inc = rc.tips && rc.tips[k];
      if (inc == null || inc === false) return;
      const i = rated ? num(inc) : 0;
      steps.push({ part: "tip", key: "tip:" + k, label: rated ? `${k} (${st.base.tip + i})` : k, dc: ptDifficulty("tip", i), mat: "container", name: k, rating: rated ? st.base.tip + i : null });
    });
    const area = rc.area && rc.area.k;
    if (area && can("area") && !(m.shape === "grenade" && area === "Sphere"))
      steps.push({ part: "area", key: "area", label: `${area === "Cone" ? `Cone ${rc.area.cone || 60}°` : area} (${st.base.area})`, dc: 30, mat: "container", name: area, rating: st.base.area });
    const core = rc.core && rc.core.el;
    if (core && can("core")) {
      const i = num(rc.core.inc);
      steps.push({ part: "core", key: "core", label: `${core} core (${st.base.core + i})`, dc: ptDifficulty("core", i), mat: core, name: core, rating: st.base.core + i });
      if (can("status")) (rc.status || []).forEach(s => { const S = STATUSES.find(x => x[0] === s); if (S && S[1] === core)
        steps.push({ part: "status", key: "status:" + s, label: `${s} (${st.base.status})`, dc: 40, mat: core, name: s, rating: st.base.status }); });
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
    const max = chk.soakMax, soak = clamp(num(a.soak), 0, max), broken = soak <= 0;
    const cost = t.repairPerAV * Math.max(1, num(a.av)) * (broken ? 2 : 1);
    const sides = +String(t.repairDie).slice(1);
    const have = num(c.craft && c.craft.supplies && c.craft.supplies[a.type]);
    let block = "";
    if (!st.repair) block = `Repairing armor needs Armor Maintenance 3 ("Is that a dent?"). This character has ${st.lvl}.`;
    else if (soak >= max) block = "This suit's Soak Pool is already full.";
    else if (broken && !st.restore) block = "It's broken (Soak 0). Rebuilding it needs a skilled craftsman: Armor Maintenance 5.";
    else if (AM_FORGE.includes(a.type) && !st.forge) block = `${t.label} armor needs a forge. Tick "At a forge" under Supplies.`;
    else if (have < cost) block = `Needs ${cost} g of ${t.label.toLowerCase()} armor materials (have ${have}).`;
    return { cost, mat: a.type, die: t.repairDie, sides, soak, max, broken, missing: max - soak, block, st };
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
           proficiency, karmaSpent, armorCheck, armorPenalties, wornArmor, skillModifier, secondaryBonus, vitalsMax, derived,
           encumbrance, itemUnits, weaponLine, shortRest, longRest, setStamina, refreshUses, rollAttribute, rollAttributeDetail, ATTR_BLURB, toTabletop, fromTabletop,
           PT_PARTS, MUNITIONS, MUNITION, COATS, TIPS, AREAS, ELEMENTS, STATUSES, PT_GRAMS, ptAccess, ptState, ptDifficulty, ptChance, ptSteps, ptYield, ptName, rollDie,
           AM_CRAFT_DC, AM_FORGE, amState, repairCount, repairPlan, craftPlan };
})();
if (typeof module !== "undefined") module.exports = CW;
