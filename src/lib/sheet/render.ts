import { characterSchema, systemLabels, type Character } from "./schema";
import { crestSvg } from "./ornaments";
import { sheetStyles } from "./styles";

/** All character text passes through this function, including attributes and titles. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
const e = escapeHtml;
const row = (html: string, className = "", keepNext = false) => `<div class="${className}" data-row${keepNext ? ' data-keep-next="true"' : ""}>${html}</div>`;
const lines = (count: number) => Array.from({ length: count }, () => row("", "write-line")).join("");
const panel = (title: string, rows: string, className = "") => `<section class="panel"><h2>${e(title)}</h2><div class="panel-content ${className}">${rows}</div></section>`;

// Bounded text fragments allow pagination between paragraphs without dropping text.
function prose(text: string) {
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 220) {
    const space = remaining.lastIndexOf(" ", 220);
    const end = space > 100 ? space + 1 : 220;
    chunks.push(remaining.slice(0, end));
    remaining = remaining.slice(end);
  }
  if (remaining) chunks.push(remaining);
  return chunks.map(chunk => row(e(chunk), "prose")).join("");
}
const entries = (items: { name: string; description: string }[]) => items.map(item => row(e(item.name), "entry-title", Boolean(item.description)) + prose(item.description)).join("");
const checks = (items: Character["skills"]) => items.map(item => row(`<span class="dot${item.proficient ? " filled" : ""}" aria-label="${item.proficient ? "Proficient" : "Not proficient"}"></span><span class="bonus">${e(item.bonus)}</span><span>${e(item.name)}</span>`, "check-row")).join("");
const list = (items: string[]) => items.map(item => row(e(item), "list-row")).join("");
const pips = (count: number, used = 0) => `<span class="pips">${Array.from({ length: count }, (_, i) => `<span class="pip">${i < used ? "×" : ""}</span>`).join("")}</span>`;
const tracker = (name: string, count: number, used = 0) => row(`<span class="tracker-label">${e(name)}</span>${pips(count, used)}`, "tracker");
const writingField = (label: string, value?: string | number, small = false) => row(`<div class="writing-value">${e(value)}</div><span class="field-label">${e(label)}</span>`, `writing-field${small ? " small" : ""}`);

/** Creates an unpaginated document. Call paginateDocument in a browser before export. */
export function renderCharacterDocument(input: Character): string {
  const c = characterSchema.parse(input);
  const system = c.systemName ?? systemLabels[c.system];
  const left: string[] = [], middle: string[] = [], right: string[] = [];

  if (c.attributes.length) left.push(panel("Attributes", c.attributes.map(a => row(`<span class="attribute-label">${e(a.label)}</span><span class="attribute-main">${e(a.modifier ?? a.value)}</span>${a.modifier !== undefined ? `<span class="attribute-score">${e(a.value)}</span>` : ""}`, "attribute")).join(""), "attribute-grid"));
  if (c.savingThrows.length) left.push(panel("Saving throws", checks(c.savingThrows)));
  if (c.skills.length) left.push(panel("Skills", checks(c.skills)));

  if (c.defenses.length) middle.push(panel("Combat", c.defenses.map(d => row(`<span class="stat-value">${e(d.value)}</span><span class="stat-label">${e(d.label)}</span>`, "stat")).join(""), "stat-grid"));
  if (c.hitPoints) {
    middle.push(panel("Hit points", row(`<span class="field-label">Maximum</span><strong>${e(c.hitPoints.maximum)}</strong>`, "hp-max") + writingField("Current hit points", c.hitPoints.current) + writingField("Temporary hit points", c.hitPoints.temporary, true) + (c.hitPoints.hitDice !== undefined ? row(`<span class="field-label">Hit dice</span><span>${e(c.hitPoints.hitDice)}</span>`, "list-row") : "")));
    if (c.system !== "generic") middle.push(panel("Death saves", tracker("Successes", 3) + tracker("Failures", 3), "tracker-grid"));
  }
  if (c.resources.length) left.push(panel("Resources", c.resources.map(r => tracker(r.name, r.maximum, r.used)).join("")));
  if (c.attacks.length) middle.push(panel("Attacks", c.attacks.map(a => row(`<div class="attack-top"><strong>${e(a.name)}</strong><span>${e(a.bonus)}</span></div><div>${e(a.damage)}</div>${a.notes ? `<small>${e(a.notes)}</small>` : ""}`, "attack")).join("")));
  if (c.equipment.length) middle.push(panel("Equipment", list(c.equipment) + lines(2)));

  if (c.features.length) right.push(panel("Features & traits", entries(c.features)));
  if (c.proficiencies.length) right.push(panel("Proficiencies & languages", list(c.proficiencies)));
  c.personality.forEach(p => right.push(panel(p.label, prose(p.text) + lines(p.text ? 1 : 3))));
  if (c.spellcasting) {
    const s = c.spellcasting;
    right.push(panel("Spellcasting", row(`<span class="field-label">Spellcasting ability</span>${e(s.ability)}`, "list-row") + row(`<span class="field-label">Save DC / attack bonus</span>${e(s.saveDC)} / ${e(s.attackBonus)}`, "list-row") + s.slots.map(slot => tracker(`${slot.level} level slots`, slot.total)).join("")));
    if (s.spells.length) right.push(panel("Spells", entries(s.spells.map(s => ({ name: `${s.name} · ${s.level}`, description: s.description })))));
  }
  c.sections.forEach(s => ({ left, middle, right })[s.column].push(panel(s.title, entries(s.entries) || lines(4))));
  right.push(panel("Notes", prose(c.notes) + lines(5)));

  // Empty columns retain useful space for pencil notes in a minimal specification.
  if (!left.length) left.push(panel("Attributes & skills", lines(18)));
  if (!middle.length) middle.push(panel("Equipment & resources", lines(18)));

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><title>${e(c.name)} — Character sheet</title><style>${sheetStyles(c.paper)}</style></head><body><main id="sheets"><article class="sheet-page"><header class="sheet-header"><div class="name-banner"><span class="crest">${crestSvg}</span><div class="eyebrow">${e(system)} · Character record</div><h1>${e(c.name)}</h1></div><div class="identity">${c.identity.map(f => `<div class="identity-field"><span class="field-label">${e(f.label)}</span><span class="field-value">${e(f.value)}</span></div>`).join("")}</div></header><div class="sheet-columns">${[left, middle, right].map((col, i) => `<div class="sheet-column" data-column="${i}">${col.join("")}</div>`).join("")}</div><footer class="sheet-footer"><span>${e(c.name)} · ${e(system)}</span><span data-page-number>01 / 01</span></footer></article></main></body></html>`;
}
