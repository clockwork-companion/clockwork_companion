// Tables printed with skills in the Clockwork Rulebook 2020.1, shown at the top of each skill's panel.
const SKILL_TABLES = {
  "Maim": [{ title: "Fury Table", cols: ["Stacks", "Effect"], rows: [
    ["1", "+2 bonus damage to your next attack."],
    ["2", "Your next attack also doubles bonus damage."],
    ["3", "You decrease the movement of your target by 5 for 3 rounds."],
    ["4", "All Bonus Damage is considered Weapon Damage for the attack."],
    ["5", "You can make another attack with your main hand weapon."],
    ["5", "Increase your Maim chance by 5% for this encounter."],
    ["6", "Any natural Maim deals triple damage, instead of double, for the rest of the encounter."],
    ["6", "Your Maim chance cannot be reduced by any means this round."],
    ["12", "Your next attack ignores armor, and cannot be blocked or guarded against by non-magical means."]] }],
  "Precision": [{ title: "Sure-Shot Table", note: "The Focus Table that Eyes of the Hawk refers to.", cols: ["Stacks", "Effect"], rows: [
    ["1", "Taking damage does not cause loss of Focus stacks this round."],
    ["2", "Effect of the next designated hit doubles."],
    ["3", "Your next attack roll gains an additional 2×SP accuracy."],
    ["4", "You gain an additional use of Keen-Eye."],
    ["5", "When using Keen-Eye, you gain your reliable value as bonus damage."],
    ["6", "You can Designate Hits with Keen-Eye."],
    ["7", "The Reliable property's value doubles this turn."]] }],
  "Belly": [{ title: "Rations per Meal", note: "From Glutton! (level 3).", cols: ["Rations", "Endurance"], rows: [["5", "Up to 5"], ["6", "6 to 8"], ["7", "9 and 10"]] }],
  "Armor Maintenance": [
    { title: "Tune Armor Options", cols: ["Option", "For the next day"], rows: [
      ["Protection", "The armor's Armor Value increases based on your roll."],
      ["Harden", "Anytime the armor loses Soak Pool, it loses less based on your roll. Cannot reduce the loss below 1."],
      ["Repair", "Any damage the armor suffers that day costs less to repair based on your roll. Cannot lower the repair cost below half."],
      ["Lighten", "The armor's penalty to its wearer's casting skills is reduced by your roll."],
      ["Quicken", "The armor's penalty to its wearer's Dexterity skills is reduced by your roll."],
      ["Reflexive", "The armor's penalty to its wearer's Dexterity saving throws is reduced by your roll."],
      ["Brace", "The armor's penalty to its wearer's Strength saving throws is reduced by your roll."]] },
    { title: "Tune Armor Effects", note: "Read the column for your Armor Maintenance roll.", cols: ["Option", "Below −40", "−40 to −20", "−20 to 0", "1 to 20", "21 to 40", "41 to 60", "Above 61"], rows: [
      ["Protection", "3", "3", "2", "2", "1", "1", "—"],
      ["Harden", "5", "4", "4", "3", "2", "1", "—"],
      ["Repair", "50×AV", "40×AV", "30×AV", "30×AV", "20×AV", "10×AV", "—"],
      ["Lighten", "12", "10", "8", "6", "4", "2", "—"],
      ["Quicken", "6", "5", "4", "3", "2", "1", "—"],
      ["Reflexive", "6", "5", "4", "3", "2", "1", "—"],
      ["Brace", "6", "5", "4", "3", "2", "1", "—"]] }],
  "Weapon Maintenance": [
    { title: "Tune Weapon Results", note: "Material reductions come off the base cost of 100 g (×2 two-handed, ×3 Unwieldy). One full round of attacks is one use.", cols: ["Roll", "Material cost", "Uses"], rows: [
      ["Below −40", "−199", "10d4"], ["−40 to −20", "−160", "5d4"], ["−20 to 0", "−120", "4d4"], ["1 to 20", "−80", "3d4"], ["21 to 40", "−40", "2d4"], ["41 to 60", "−0", "1d4"], ["Above 60", "Failure", "Failure"]] },
    { title: "Artisans Mark", cols: ["Count", "Effect"], rows: [
      ["10", "Next time you tune a weapon, Uses of your tuning is its maximum possible value."],
      ["10", "Next time you tune a weapon, your Weapon Maintenance check has advantage."],
      ["50", "Remove 1 Masterwork counter from a weapon."],
      ["70", "Next time you fail a Weapon Maintenance process, you recover all materials."],
      ["n", "Next time you start a Weapon Maintenance process, you gain n% bonus to the roll. Cannot more than double your modifier."]] }],
  "Medicine": [
    { title: "Assist Options", note: "Read the column for your Medicine check.", cols: ["Option", "Below −40", "−40 to −20", "−20 to 0", "1 to 20", "21 to 40", "41 to 60", "61 to 80", "Above 80"], rows: [
      ["Health", "10", "8", "6", "4", "2", "1", "—", "—"],
      ["Blood", "2d20", "2d12", "2d10", "2d8", "2d6", "2d4", "—", "—"],
      ["Deprivation", "7", "6", "5", "4", "3", "2", "1", "—"],
      ["Bone Growth", "7", "6", "5", "4", "3", "2", "1", "—"],
      ["Toxicity", "1d20", "1d12", "1d10", "1d8", "1d6", "1d4", "—", "—"],
      ["Exhaustion", "3", "3", "2", "2", "1", "1", "—", "—"]] },
    { title: "What each option does", cols: ["Option", "Effect"], rows: [
      ["Health", "Extra Hit Points."], ["Blood", "Extra Blood Points."], ["Deprivation", "Extra Rations. The patient's daily ration needs must have been met."],
      ["Bone Growth", "Additional days' worth of bone healing."], ["Toxicity", "Cleanse extra Toxicity."], ["Exhaustion", "Remove extra stacks of Exhaustion."]] }],
  "Hunting": [
    { title: "Salvaging Roll", cols: ["Roll", "Trophy properties"], rows: [
      ["81 – 100", "Failure to retrieve a trophy altogether."], ["71 – 80", "All negative attributes."], ["61 – 70", "2 negative attributes"], ["51 – 60", "1 negative attribute"],
      ["31 – 50", "1 positive attribute"], ["21 – 30", "2 positive attributes"], ["11 – 20", "3 positive attributes"], ["1 – 10", "4 positive attributes"],
      ["−9 – 0", "5 positive attributes"], ["−19 – −10", "6 positive attributes"], ["−29 – −20", "7 positive attributes"], ["−40 – −30", "8 positive attributes"]] },
    { title: "Combining Roll", cols: ["Roll", "Receiver trophy properties"], rows: [
      ["80 or above", "Failure to transfer attribute"], ["below 80", "No positive attributes"], ["below 60", "1 positive attribute"], ["below 50", "2 positive attributes"],
      ["below 30", "3 positive attributes"], ["below 20", "4 positive attributes"], ["below 10", "5 positive attributes"], ["below 0", "6 positive attributes"],
      ["below −10", "7 positive attributes"], ["below −20", "8 positive attributes"], ["below −30", "9 positive attributes"]] }],
};
