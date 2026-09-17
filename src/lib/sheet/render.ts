import { renderFooter } from "./footer";
import { type Character, type Entry } from "./schema";
import { sheetStyles } from "./styles";
import { renderCardTemplates, renderUsage } from "./cards";
import { escapeHtml as e } from "./html";
export { escapeHtml } from "./html";

const lines = (count: number) => `<div class="writing-space">${Array.from({ length: count }, () => '<div class="write-line"></div>').join("")}</div>`;
const prose = (text: string) => text ? `<div class="prose">${e(text)}</div>` : "";
type Layout = { column?: number; width?: number; placement?: "main" | "secondary"; pinned?: boolean; priority?: number; group?: string; allowedWidths?: number[] };
const panel = (title: string, body: string, layout: Layout = {}, className = "") => `<section class="panel" data-priority="${layout.priority ?? (layout.pinned ? 100 : layout.placement === "secondary" ? 20 : 60)}" data-group="${e(layout.group ?? "")}" data-widths="${(layout.allowedWidths ?? [layout.width ?? 1]).join(",")}" data-column="${layout.column ?? 2}" data-width="${layout.width ?? 1}" data-placement="${layout.placement ?? "main"}"${layout.pinned ? ' data-pinned="true"' : ""}><h2>${e(title)}</h2><div class="panel-content ${className}">${body}</div></section>`;
const entries = (items: Entry[]) => items.map(item => `<div class="entry"><div class="entry-title">${e(item.name)}</div>${renderUsage(item.usage)}${item.details.map(d => `<div class="list-row"><span class="field-label">${e(d.label)}</span>${e(d.value)}</div>`).join("")}${prose(item.description)}${item.options.map(o => `<div class="entry-title">${e(o.name)}</div>${renderUsage(o.usage)}${o.details.map(d => `<div class="list-row">${e(d.label)}: ${e(d.value)}</div>`).join("")}${prose(o.description)}`).join("")}${lines(item.blankLines)}</div>`).join("");
const checks = (items: Character["skills"]) => items.map(item => `<div class="check-row"><span class="dot${item.proficient ? " filled" : ""}"></span><span class="bonus">${e(item.bonus)}</span><span>${e(item.name)}</span></div>`).join("");
const list = (items: string[]) => items.map(item => `<div class="list-row">${e(item)}</div>`).join("");
const pips = (count: number, used = 0) => `<span class="pips">${Array.from({ length: count }, (_, i) => `<span class="pip">${i < used ? "×" : ""}</span>`).join("")}</span>`;
const tracker = (name: string, count: number, used = 0, recovery?: string, pool = false) => `<div class="tracker"><strong class="tracker-label">${e(name)}</strong>${pool ? `<div class="pool-value">______ / ${count}</div>` : pips(count, used)}${recovery ? `<small class="recovery">${e(recovery)}</small>` : ""}</div>`;
const writingField = (label: string, value?: string | number, small = false) => `<div class="writing-field${small ? " small" : ""}"><div class="writing-value">${e(value)}</div><span class="field-label">${e(label)}</span></div>`;

/** Creates unpaginated, script-free HTML. All boxes are indivisible. */
export function renderCharacterDocument(input: Character, siteUrl = ""): string {
  const c = input;
  const primary: string[] = [], secondary: string[] = [];
  const left = { column: 0, pinned: true };
  const middle = { column: 1, pinned: true };
  if (c.attributes.length) primary.push(panel("Attributes", c.attributes.map(a => `<div class="attribute"><span class="attribute-label">${e(a.label)}</span><span class="attribute-main">${e(a.modifier ?? a.value)}</span>${a.modifier !== undefined ? `<span class="attribute-score">${e(a.value)}</span>` : ""}</div>`).join(""), left, "attribute-grid"));
  if (c.savingThrows.length) primary.push(panel("Saving throws", checks(c.savingThrows), left));
  if (c.skills.length) primary.push(panel("Skills", checks(c.skills), left));
  if (c.defenses.length) primary.push(panel("Combat", c.defenses.map(d => `<div class="stat"><span class="stat-value">${e(d.value)}</span><span class="stat-label">${e(d.label)}</span></div>`).join(""), middle, "stat-grid"));
  if (c.hitPoints) primary.push(panel("Hit points", `<div class="hp-max"><span class="field-label">Maximum</span><strong>${e(c.hitPoints.maximum)}</strong></div>${writingField("Current hit points",c.hitPoints.current)}${writingField("Temporary hit points",c.hitPoints.temporary,true)}${c.hitPoints.hitDice !== undefined ? `<div class="list-row">Hit dice: ${e(c.hitPoints.hitDice)}</div>` : ""}`, {...middle,group:"vitality"}));
  if (c.resources.length || c.spellcasting?.slots.length) {
    const resources = c.resources.map(r => tracker(r.name,r.maximum,r.used,r.recovery,r.display === "pool")).join("");
    const slots = c.spellcasting?.slots.map(s => tracker(`${s.level} level spell slots`, s.total,0,"Long rest")).join("") ?? "";
    primary.push(panel("Resources", resources + slots, {...middle,group:"vitality"}, "resource-tracks"));
  }
  if (c.attacks.length) primary.push(panel("Attacks", c.attacks.map(a => `<div class="attack"><div class="attack-top"><strong>${e(a.name)}</strong><span>${e(a.bonus)}</span></div><div>${e(a.damage)}</div>${a.notes ? `<small>${e(a.notes)}</small>` : ""}</div>`).join(""),{column:2,pinned:true,group:"offense"}));
  if (c.spellcasting) primary.push(panel("Spellcasting", `<div class="spell-stats"><div><span class="field-label">Ability</span>${e(c.spellcasting.ability)}</div><div><span class="field-label">Save DC</span><strong>${e(c.spellcasting.saveDC)}</strong></div><div><span class="field-label">Attack</span><strong>${e(c.spellcasting.attackBonus)}</strong></div></div>`, {column:2,pinned:true,group:"offense"}));
  const abilities = c.features.filter(f => f.presentation === "card");
  if (abilities.length) primary.push(panel("Abilities", abilities.map(a => `<div class="ability-summary"><strong>${e(a.name)}</strong>${a.summary ? prose(a.summary) : ""}${a.usage ? `<small>${e(a.usage.amount === 0 ? a.usage.frequency ?? "No resource spent" : `${a.usage.amount} ${a.usage.resource}`)}</small>` : ""}</div>`).join(""),{column:1,pinned:true}));
  const listFeatures = c.features.filter(f => f.presentation === "list");
  if (listFeatures.length) primary.push(panel("Features & traits", entries(listFeatures),{column:2}));
  if (c.spellcasting?.spells.length) {
    const spells = c.spellcasting.spells;
    primary.push(panel("Spells", spells.filter(s => s.presentation === "card").map(s => `<div class="list-row"><strong>${e(s.name)}</strong> <span>${e(s.level)}</span></div>`).join("") + entries(spells.filter(s => s.presentation === "list")),{column:2}));
  }
  for (const p of c.personality) if (p.text || p.blankLines) (p.placement === "main" ? primary : secondary).push(panel(p.label,prose(p.text)+lines(p.blankLines ?? 0),{placement:p.placement,column:2}));
  if (c.equipment.length) secondary.push(panel("Equipment", list(c.equipment),{placement:"secondary",column:1,width:1,allowedWidths:[1,2]},"equipment-list"));
  if (c.proficiencies.length) secondary.push(panel("Proficiencies & languages",list(c.proficiencies),{placement:"secondary",column:2}));
  for (const s of c.sections) {
    const items = s.entries.filter(item => item.presentation === "list");
    if (items.some(item => item.description || item.name || item.blankLines) || s.blankLines) (s.placement === "main" ? primary : secondary).push(panel(s.title,entries(items)+lines(s.blankLines ?? 0),{placement:s.placement,column:{left:0,middle:1,right:2}[s.column],width:s.width,priority:s.priority,group:s.group,allowedWidths:s.allowedWidths}));
  }
  if (c.notes || c.notesBlankLines) secondary.push(panel("Notes",prose(c.notes)+lines(c.notesBlankLines),{placement:"secondary",column:0,width:2}));
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><title>${e(c.name || "Character sheet")}</title><style>${sheetStyles(c.paper)}</style></head><body><main id="sheets"><article class="sheet-page"><header class="sheet-header"><div class="name-banner"><span class="field-label">Name</span><div class="name-line"></div></div><div class="identity">${c.identity.map(f => `<div class="identity-field"><span class="field-label">${e(f.label)}</span><span class="field-value">${e(f.value)}</span></div>`).join("")}</div></header><div class="sheet-panels">${primary.join("")}${secondary.join("")}</div>${renderFooter(siteUrl)}</article></main>${renderCardTemplates(c, siteUrl)}</body></html>`;
}
