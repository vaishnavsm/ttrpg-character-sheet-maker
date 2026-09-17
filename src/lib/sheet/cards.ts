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

/** Pack uniform 88 × 110 mm cards without shrinking or clipping content. */
export function paginateCards(doc: Document, root: HTMLElement, pages: HTMLElement[]) {
  const source = doc.querySelector<HTMLTemplateElement>("#card-source");
  const template = doc.querySelector<HTMLTemplateElement>("#card-page-template");
  if (!source || !template) return;
  const grids: HTMLElement[] = [];
  const mm = 96 / 25.4;
  const gap = 5 * mm;
  function addPage() {
    if (pages.length >= 60) throw new Error("This character exceeds 60 pages. Reduce the amount of content.");
    const page = template!.content.firstElementChild!.cloneNode(true) as HTMLElement;
    root.append(page);
    pages.push(page);
    const grid = page.querySelector<HTMLElement>(".card-grid")!;
    grids.push(grid);
    return grid;
  }
  function fitsContent(card: HTMLElement) {
    const content = card.querySelector<HTMLElement>(".card-content")!;
    return content.scrollHeight <= content.clientHeight + 1 && content.scrollWidth <= content.clientWidth + 1;
  }
  const first = addPage();
  const measured = Array.from(source.content.querySelectorAll<HTMLElement>(".reference-card")).map((card,index) => {
    card.style.position = "absolute";
    card.style.top = "0";
    card.style.left = "0";
    card.style.height = "110mm";
    first.append(card);
    if (!fitsContent(card)) throw new Error(`Card “${card.querySelector("h3")!.textContent}” is too tall for a single-width card. Condense its text, split it into separate cards, or set presentation to "list". Nothing has been clipped.`);
    const height = card.getBoundingClientRect().height;
    if (height > first.clientHeight + .5) throw new Error("A card does not fit on this paper size.");
    card.remove();
    return { card, height, index };
  });
  // A column is a one-dimensional bin. Try two deterministic packing strategies
  // and keep the one using the fewest columns (two columns per cutting page).
  type Item = typeof measured[number];
  function pack(bestFit: boolean) {
    const bins: { height: number; items: Item[] }[] = [];
    for (const item of [...measured].sort((a,b) => b.height-a.height || a.index-b.index)) {
      const candidates = bins.map((bin,index) => ({bin,index,remaining:first.clientHeight-bin.height-item.height})).filter(c => c.remaining >= -.5);
      if (bestFit) candidates.sort((a,b) => a.remaining-b.remaining || a.index-b.index);
      const bin = candidates[0]?.bin ?? (() => { const next = {height:0,items:[] as Item[]}; bins.push(next); return next; })();
      bin.items.push(item);
      bin.height += item.height + gap;
    }
    return bins;
  }
  const alternatives = [pack(true),pack(false)];
  alternatives.sort((a,b) => a.length-b.length);
  const bins = alternatives[0];
  bins.forEach((bin,index) => {
    const pageIndex = Math.floor(index/2);
    while (grids.length <= pageIndex) addPage();
    const grid = grids[pageIndex];
    const left = (grid.clientWidth - (176 * mm + gap))/2 + (index%2)*(88*mm+gap);
    let top = 0;
    for (const {card,height} of bin.items) {
      card.style.left = `${left}px`;
      card.style.top = `${top}px`;
      grid.append(card);
      top += height+gap;
    }
  });
  source.remove();
  template.remove();
}
