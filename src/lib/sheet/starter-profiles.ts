import type { CharacterInput } from "./schema";
import { premadeExamples } from "./examples";

const blankProfiles: { id: string; label: string; character: CharacterInput }[] = [
  { id: "generic", label: "Generic", character: { version: 1, name: "", system: "generic" } },
  {
    id: "dnd-2014",
    label: "D&D 5e (2014)",
    character: {
      version: 1,
      name: "",
      system: "dnd-5e-2014",
      identity: [
        { label: "Class & level", value: "" },
        { label: "Race", value: "" },
        { label: "Background", value: "" },
        { label: "Alignment", value: "" },
      ],
      attributes: ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"].map((label) => ({ label, value: "", modifier: "" })),
      defenses: ["Armor class", "Initiative", "Speed", "Proficiency", "Perception"].map((label) => ({ label, value: "" })),
      hitPoints: { maximum: "", hitDice: "" },
    },
  },
  {
    id: "dnd-2024",
    label: "D&D 5e (2024)",
    character: {
      version: 1,
      name: "",
      system: "dnd-5e-2024",
      identity: [
        { label: "Class & level", value: "" },
        { label: "Species", value: "" },
        { label: "Background", value: "" },
        { label: "Alignment", value: "" },
      ],
      attributes: ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"].map((label) => ({ label, value: "", modifier: "" })),
      defenses: ["Armor class", "Initiative", "Speed", "Proficiency", "Perception"].map((label) => ({ label, value: "" })),
      hitPoints: { maximum: "", hitDice: "" },
    },
  },
  {
    id: "cairn",
    label: "Cairn",
    character: {
      version: 1,
      name: "",
      system: "generic",
      systemName: "Cairn",
      identity: [{ label: "Background", value: "" }, { label: "Age", value: "" }],
      attributes: ["Strength", "Dexterity", "Willpower"].map((label) => ({ label, value: "" })),
      defenses: [{ label: "Armor", value: "" }],
      hitPoints: { maximum: "" },
      sections: [{ title: "Inventory", width: 2, blankLines: 10 }, { title: "Scars", blankLines: 5 }],
      notesBlankLines: 5,
    },
  },
];

const cairnExamples: { id: string; label: string; character: CharacterInput }[] = [
  {
    id: "cairn-elowen-reed",
    label: "Elowen Reed · Bog Guide",
    character: {
      version: 1, name: "Elowen Reed", system: "generic", systemName: "Cairn",
      identity: [{ label: "Background", value: "Bog guide" }, { label: "Age", value: 27 }],
      attributes: [{ label: "Strength", value: 8 }, { label: "Dexterity", value: 14 }, { label: "Willpower", value: 12 }],
      defenses: [{ label: "Armor", value: 1 }], hitPoints: { maximum: 6 },
      attacks: [{ name: "Hunting bow", bonus: "", damage: "d6", notes: "Bulky" }],
      equipment: ["Hunting bow", "20 arrows", "Brigandine", "Rope", "Lantern", "Three days of rations"],
      features: [{ name: "Bog guide", description: "Knows which ground will hold and which lights should not be followed." }],
      personality: [{ label: "Scar", text: "A pale burn circles the left wrist." }], notesBlankLines: 4,
    },
  },
  {
    id: "cairn-bram-ironwood",
    label: "Bram Ironwood · Dismissed Soldier",
    character: {
      version: 1, name: "Bram Ironwood", system: "generic", systemName: "Cairn",
      identity: [{ label: "Background", value: "Dismissed soldier" }, { label: "Age", value: 41 }],
      attributes: [{ label: "Strength", value: 15 }, { label: "Dexterity", value: 10 }, { label: "Willpower", value: 9 }],
      defenses: [{ label: "Armor", value: 2 }], hitPoints: { maximum: 8 },
      attacks: [{ name: "Halberd", bonus: "", damage: "d8", notes: "Bulky" }, { name: "Dagger", bonus: "", damage: "d6", notes: "" }],
      equipment: ["Halberd", "Dagger", "Chain armor", "Weathered uniform", "Whetstone", "Rations"],
      features: [{ name: "Dismissed soldier", description: "Still carries an officer’s sealed order that was never delivered." }],
      personality: [{ label: "Scar", text: "A split eyebrow from the last day of service." }], notesBlankLines: 4,
    },
  },
  {
    id: "cairn-nessa-vale",
    label: "Nessa Vale · Hedge Witch",
    character: {
      version: 1, name: "Nessa Vale", system: "generic", systemName: "Cairn",
      identity: [{ label: "Background", value: "Hedge witch" }, { label: "Age", value: 33 }],
      attributes: [{ label: "Strength", value: 6 }, { label: "Dexterity", value: 12 }, { label: "Willpower", value: 16 }],
      defenses: [{ label: "Armor", value: 0 }], hitPoints: { maximum: 4 },
      attacks: [{ name: "Ash staff", bonus: "", damage: "d6", notes: "" }],
      equipment: ["Ash staff", "Spellbook", "Dried herbs", "Chalk", "Bell", "Black candle"],
      features: [{ name: "Hedge witch", description: "Trades remedies and quiet advice at the edges of settled lands." }],
      sections: [{ title: "Spellbook", entries: [{ name: "Mirrorwalk", description: "The pages show a silver doorway beneath a moonless sky." }] }],
      personality: [{ label: "Scar", text: "Hair turns white at the temples when magic draws near." }], notesBlankLines: 4,
    },
  },
  {
    id: "cairn-orin-pike",
    label: "Orin Pike · Tomb Raider",
    character: {
      version: 1, name: "Orin Pike", system: "generic", systemName: "Cairn",
      identity: [{ label: "Background", value: "Tomb raider" }, { label: "Age", value: 24 }],
      attributes: [{ label: "Strength", value: 11 }, { label: "Dexterity", value: 15 }, { label: "Willpower", value: 8 }],
      defenses: [{ label: "Armor", value: 1 }], hitPoints: { maximum: 5 },
      attacks: [{ name: "Short sword", bonus: "", damage: "d6", notes: "" }],
      equipment: ["Short sword", "Gambeson", "Crowbar", "50 ft rope", "Chisel", "Small mirror"],
      features: [{ name: "Tomb raider", description: "Can spot the difference between a sealed door and a wall that wants to look sealed." }],
      personality: [{ label: "Scar", text: "Two missing fingertips, taken by a stone trap." }], notesBlankLines: 4,
    },
  },
  {
    id: "cairn-mara-flint",
    label: "Mara Flint · Beast Hunter",
    character: {
      version: 1, name: "Mara Flint", system: "generic", systemName: "Cairn",
      identity: [{ label: "Background", value: "Beast hunter" }, { label: "Age", value: 36 }],
      attributes: [{ label: "Strength", value: 13 }, { label: "Dexterity", value: 13 }, { label: "Willpower", value: 10 }],
      defenses: [{ label: "Armor", value: 1 }], hitPoints: { maximum: 7 },
      attacks: [{ name: "Spear", bonus: "", damage: "d8", notes: "Bulky" }, { name: "Long knife", bonus: "", damage: "d6", notes: "" }],
      equipment: ["Spear", "Long knife", "Brigandine", "Snare wire", "Torch", "Salt pouch"],
      features: [{ name: "Beast hunter", description: "Keeps a careful ledger of tracks, wounds, and things that should not exist." }],
      personality: [{ label: "Scar", text: "Three claw marks run from shoulder to collarbone." }], notesBlankLines: 4,
    },
  },
];

const dndExampleNames: Record<string, { name: string; label: string }> = {
  "level-3-rogue-thief": { name: "Tamsin Quickstep", label: "Tamsin Quickstep · Rogue (Level 3)" },
  "level-3-monk-open-hand": { name: "Aric Vale", label: "Aric Vale · Monk (Level 3)" },
  "level-3-druid-moon": { name: "Sylwen Moss", label: "Sylwen Moss · Druid (Level 3)" },
  "level-3-ranger-hunter": { name: "Mira Thornwood", label: "Mira Thornwood · Ranger (Level 3)" },
  "level-3-paladin-devotion": { name: "Seraphine Dawn", label: "Seraphine Dawn · Paladin (Level 3)" },
};

export const starterProfileGroups = [
  { label: "Blank profiles", profiles: blankProfiles },
  {
    label: "D&D examples",
    profiles: premadeExamples.map(({ id, label, character }) => ({
      id,
      label: dndExampleNames[id]?.label ?? label,
      character: { ...character, name: dndExampleNames[id]?.name ?? character.name },
    })),
  },
  { label: "Cairn examples", profiles: cairnExamples },
];

export const starterProfiles = Object.fromEntries(
  starterProfileGroups.flatMap((group) => group.profiles.map((profile) => [profile.id, profile.character])),
) as Record<string, CharacterInput>;
