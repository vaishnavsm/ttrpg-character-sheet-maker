import { renderFooter } from "./footer";
import type { Character, Entry, Usage } from "./schema";
import { escapeHtml as e } from "./html";

export function renderUsage(usage?: Usage): string {
  if (!usage) return "";
  const cost = usage.amount === 0 || usage.amount === "0" ? "No resource spent" : `${usage.amount} ${usage.resource}`;
  return `<div class="card-usage"><strong>${e(cost)}</strong>${usage.frequency ? `<span>${e(usage.frequency)}</span>` : ""}${usage.recovery ? `<span>Recovers: ${e(usage.recovery)}</span>` : ""}</div>`;
}
const details = (fields: Entry["details"]) => fields.length ? `<dl class="card-details">${fields.map(d => `<div><dt>${e(d.label)}</dt><dd>${e(d.value)}</dd></div>`).join("")}</dl>` : "";

/** An ability and its alternate modes always remain a single cut-out card. */
export function renderCardTemplates(character: Character, siteUrl = ""): string {
  const cards: (Entry & { kind: string })[] = [];
  for (const feature of character.features) {
    if (feature.presentation === "card") cards.push({ ...feature, kind: feature.kind ?? "ability" });
  }
  for (const spell of character.spellcasting?.spells ?? []) {
    if (spell.presentation !== "card") continue;
    const level = /^([1-9])/.exec(spell.level)?.[1];
    // Only infer the unambiguous D&D slot convention; custom systems supply usage.
    const usage = spell.usage ?? (character.system !== "generic" ? (level ? { amount: 1, resource: `level ${level} spell slot`, recovery: "Long rest" } : /^cantrip$/i.test(spell.level) ? { amount: 0, resource: "None", frequency: "Unlimited" } : undefined) : undefined);
    cards.push({ ...spell, usage, kind: spell.kind ?? "spell", details: [...(spell.level ? [{ label: "Level", value: spell.level }] : []), ...spell.details] });
  }
  for (const section of character.sections) {
    for (const entry of section.entries) if (entry.presentation === "card") cards.push({ ...entry, kind: entry.kind ?? "ability" });
  }
  const expanded = cards.flatMap(card => {
    if (card.optionLayout === "cards" && card.options.length) return card.options.map(option => ({...card, name: `${card.name}: ${option.name}`, description: [card.description,option.description].filter(Boolean).join("\n"), details:[...card.details,...option.details], usage:option.usage ?? card.usage, options:[]}));
    if (card.optionLayout === "compact") return [{...card, description:[card.description,...card.options.map(option => `${option.name}: ${option.description}${option.usage ? ` [${option.usage.amount} ${option.usage.resource}${option.usage.frequency ? `; ${option.usage.frequency}` : ""}${option.usage.recovery ? `; recovers ${option.usage.recovery}` : ""}]` : ""}${option.details.map(d=>` · ${d.label}: ${d.value}`).join("")}`)].filter(Boolean).join("\n"),options:[]}];
    return [card];
  });
  if (!expanded.length) return "";
  return `<template id="card-page-template"><article class="sheet-page card-page"><div class="card-grid"></div>${renderFooter(siteUrl)}</article></template><template id="card-source">${expanded.map(card => `<article class="reference-card" data-card-kind="${e(card.kind.toLowerCase())}"><div class="card-inner"><div class="card-content"><header class="reference-card-header"><div class="card-kind">${e(card.kind)}</div><h3>${e(card.name)}</h3></header>${card.usage ? renderUsage(card.usage) : `<div class="card-usage"><strong>${e(card.details.find(d => d.label.toLowerCase() === "cost")?.value ?? "Resource cost not specified")}</strong></div>`}${details(card.details)}<div class="card-description">${e(card.description)}</div>${card.options.length ? `<div class="card-options">${card.options.map(option => `<section class="card-option"><h4>${e(option.name)}</h4>${renderUsage(option.usage)}${details(option.details)}<div class="card-description">${e(option.description)}</div></section>`).join("")}</div>` : ""}${card.blankLines ? `<div class="writing-space">${Array.from({ length: card.blankLines }, () => '<div class="write-line"></div>').join("")}</div>` : ""}</div></div></article>`).join("")}</template>`;
}
