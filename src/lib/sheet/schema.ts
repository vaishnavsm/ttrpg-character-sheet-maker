import { z } from "zod";

const label = z.string().trim().min(1).max(80);
const value = z.union([z.string().max(80), z.number().finite()]);
const field = z.strictObject({ label, value });
const check = z.strictObject({ name: label, bonus: value, proficient: z.boolean().default(false) });
const blankLines = z.number().int().min(0).max(24);
const usage = z.strictObject({
  resource: label,
  amount: value,
  frequency: z.string().max(120).optional(),
  recovery: z.string().max(120).optional(),
});
export type Usage = z.infer<typeof usage>;
const entry = z.strictObject({
  name: label,
  description: z.string().max(8000).default(""),
  presentation: z.enum(["list", "card"]).default("list"),
  optionLayout: z.enum(["stacked", "compact", "cards"]).default("stacked"),
  kind: z.string().trim().min(1).max(40).optional(),
  details: z.array(field).max(12).default([]),
  blankLines: blankLines.default(0),
  summary: z.string().max(300).optional(),
  usage: usage.optional(),
  options: z.array(z.strictObject({ name: label, description: z.string().max(4000), details: z.array(field).max(12).default([]), usage: usage.optional() })).max(20).default([]),
});
export type Entry = z.infer<typeof entry>;

/** A display contract, not a game-rules engine. All mechanical values are supplied. */
export const characterSchema = z.strictObject({
  version: z.literal(1),
  name: z.string().trim().max(100).default(""),
  system: z.enum(["dnd-5e-2014", "dnd-5e-2024", "generic"]),
  systemName: z.string().trim().min(1).max(80).optional(),
  paper: z.enum(["a4", "letter"]).default("a4"),
  identity: z.array(field).max(12).default([]),
  attributes: z.array(z.strictObject({ label, value, modifier: value.optional() })).max(24).default([]),
  defenses: z.array(field).max(12).default([]),
  savingThrows: z.array(check).max(40).default([]),
  skills: z.array(check).max(100).default([]),
  hitPoints: z.strictObject({ maximum: value, current: value.optional(), temporary: value.optional(), hitDice: value.optional() }).optional(),
  resources: z.array(z.strictObject({ name: label, maximum: z.number().int().min(1).max(30), used: z.number().int().min(0).default(0), recovery: z.string().max(120).optional(), display: z.enum(["circles", "pool"]).default("circles") }).refine(r => r.used <= r.maximum, { message: "Used cannot exceed maximum", path: ["used"] })).max(30).default([]),
  attacks: z.array(z.strictObject({ name: label, bonus: value, damage: z.string().max(120), notes: z.string().max(300).default("") })).max(100).default([]),
  features: z.array(entry).max(100).default([]),
  equipment: z.array(z.string().min(1).max(300)).max(200).default([]),
  proficiencies: z.array(z.string().min(1).max(300)).max(100).default([]),
  personality: z.array(z.strictObject({ label, text: z.string().max(8000).default(""), blankLines: blankLines.optional(), placement: z.enum(["main", "secondary"]).default("secondary") })).max(20).default([]),
  spellcasting: z.strictObject({
    ability: label,
    saveDC: value,
    attackBonus: value,
    slots: z.array(z.strictObject({ level: label, total: z.number().int().min(1).max(20) })).max(12).default([]),
    spells: z.array(entry.extend({ level: z.string().max(40).default("") })).max(150).default([]),
  }).optional(),
  sections: z.array(z.strictObject({ title: label, priority: z.number().int().min(0).max(100).default(30), group: label.optional(), allowedWidths: z.array(z.union([z.literal(1),z.literal(2),z.literal(3)])).min(1).max(3).optional(), column: z.enum(["left", "middle", "right"]).default("right"), entries: z.array(entry).max(100).default([]), blankLines: blankLines.optional(), width: z.union([z.literal(1),z.literal(2),z.literal(3)]).default(1), placement: z.enum(["main", "secondary"]).default("secondary") })).max(30).default([]),
  notes: z.string().max(20000).default(""),
  notesBlankLines: blankLines.default(0),
});

export type Character = z.infer<typeof characterSchema>;
export type CharacterInput = z.input<typeof characterSchema>;

export const systemLabels: Record<Character["system"], string> = {
  "dnd-5e-2014": "D&D 5e · 2014",
  "dnd-5e-2024": "D&D 5e · 2024",
  generic: "Generic system",
};

export function parseCharacter(source: string): Character {
  if (source.length > 250_000) throw new Error("Keep the character JSON below 250,000 characters.");
  let data: unknown;
  try { data = JSON.parse(source); }
  catch (error) { throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : "check your syntax"}`); }
  const result = characterSchema.safeParse(data);
  if (!result.success) {
    throw new Error(result.error.issues.map(issue => `${issue.path.join(".") || "character"}: ${issue.message}`).join("\n"));
  }
  return result.data;
}
