import { frameSvg } from "./ornaments";

export function sheetStyles(paper: "a4" | "letter") {
  const width = paper === "a4" ? "210mm" : "215.9mm";
  const height = paper === "a4" ? "297mm" : "279.4mm";
  return `
@page { size: ${paper === "a4" ? "A4" : "letter"} portrait; margin: 0; }
* { box-sizing: border-box; }
html { color: #272623; background: #e9e7e1; }
body { margin: 0; font: 9pt/1.4 Georgia, 'Times New Roman', serif; }
.sheet-page { width: ${width}; height: ${height}; padding: 10mm; margin: 0 auto 7mm; background: white; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; gap: 5mm; break-after: page; }
.sheet-page:last-child { margin-bottom: 0; break-after: auto; }
.sheet-header { display: grid; grid-template-columns: 1fr 1.08fr; gap: 5mm; align-items: center; border-bottom: 1px solid #272623; padding-bottom: 4mm; min-height: 29mm; }
.name-banner { position: relative; padding: 3mm 2mm 3mm 17mm; border-block: 3px double #272623; }
.name-banner::after { content: ''; position: absolute; left: 1mm; top: -1.5mm; bottom: -1.5mm; width: 1mm; border-inline: 1px solid; transform: rotate(3deg); }
.crest { position: absolute; width: 15mm; left: 1mm; top: 50%; transform: translateY(-50%); }
.eyebrow, .field-label, .panel h2, .stat-label, .sheet-footer, .attribute-label { font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: .1em; }
.eyebrow { font-size: 6pt; margin-bottom: 1.5mm; }
h1 { font-size: 22pt; line-height: 1.03; margin: 0; font-weight: normal; overflow-wrap: anywhere; }
.identity { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 4mm; }
.identity-field { min-width: 0; border-bottom: .5px solid #bdbbb5; padding-bottom: 1mm; }
.field-label { display: block; font-size: 5.8pt; line-height: 1.35; }
.field-value { display: block; font-size: 9pt; overflow-wrap: anywhere; }
.sheet-columns { display: grid; grid-template-columns: 1fr 1.07fr 1fr; gap: 3.5mm; min-height: 0; }
.sheet-column { min-width: 0; min-height: 0; }
.panel { border: 2mm solid transparent; border-image: url("data:image/svg+xml,${encodeURIComponent(frameSvg)}") 20 stretch; margin: 0 0 2mm; padding: .5mm 1mm; break-inside: avoid; }
.panel h2 { margin: 0 0 1.5mm; text-align: center; font-size: 6.8pt; line-height: 1.3; font-weight: 700; }
.panel h2::after { content: ''; display: block; width: 12mm; margin: 1.2mm auto 0; border-bottom: .5px solid #888; }
.continued { display: block; font-size: 5pt; letter-spacing: .08em; margin-top: .5mm; font-weight: normal; }
.panel-content { min-width: 0; }
.attribute-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 2mm; }
.attribute { text-align: center; border: 1px solid #777; border-radius: 3mm 3mm 6mm 6mm; padding: 2mm 1mm 1.5mm; min-height: 20mm; min-width: 0; }
.attribute-label { display: block; font-size: 5.4pt; letter-spacing: .025em; overflow-wrap: anywhere; }
.attribute-main { display: block; font-size: 21pt; line-height: 1.2; overflow-wrap: anywhere; }
.attribute-score { display: inline-block; min-width: 8mm; border: .7px solid #888; border-radius: 50%; padding: 0 1mm; font: 8pt/1.4 Arial, sans-serif; }
.check-row { display: grid; grid-template-columns: 2mm 7mm 1fr; align-items: baseline; gap: 1mm; min-height: 4.3mm; font-size: 8pt; overflow-wrap: anywhere; }
.check-row .bonus { text-align: center; font: 8pt/1.4 Arial, sans-serif; border-bottom: .5px solid #ccc; }
.dot { display: inline-block; height: 1.7mm; width: 1.7mm; border: .8px solid #333; border-radius: 50%; align-self: center; }
.dot.filled { background: #333; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
.stat-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2mm; }
.stat { text-align: center; padding: 1.5mm .5mm; border: .6px solid #999; border-radius: 2mm 2mm 4mm 4mm; min-width: 0; }
.stat-value { display: block; font-size: 16pt; line-height: 1.2; overflow-wrap: anywhere; }
.stat-label { display: block; font-size: 5pt; letter-spacing: .01em; margin-top: 1mm; overflow-wrap: anywhere; }
.hp-max { display: flex; align-items: baseline; justify-content: space-between; border-bottom: .5px solid #aaa; padding-bottom: 1mm; }
.hp-max strong { font-size: 16pt; font-weight: normal; }
.writing-field { padding-top: 2mm; }
.writing-value { min-height: 10mm; font-size: 15pt; border-bottom: .5px solid #bbb; margin-bottom: 1mm; overflow-wrap: anywhere; }
.writing-field.small .writing-value { min-height: 6mm; }
.tracker { padding: 1mm 0 2mm; }
.tracker-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; }
.tracker-label { font-size: 8pt; display: block; margin-bottom: 1mm; overflow-wrap: anywhere; }
.pips { display: flex; flex-wrap: wrap; gap: 1.3mm; }
.pip { height: 3mm; width: 3mm; border: .8px solid #333; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font: 9pt/1 Arial, sans-serif; }
.attack { padding: 1.5mm 0; border-bottom: .5px solid #ccc; overflow-wrap: anywhere; }
.attack-top { display: flex; justify-content: space-between; gap: 2mm; }
.attack strong { font-size: 9pt; }
.attack small { display: block; font-size: 7pt; }
.entry-title { font-size: 9pt; font-weight: bold; margin: 2mm 0 .7mm; overflow-wrap: anywhere; }
.prose { margin: 0 0 1mm; font-size: 8.2pt; white-space: pre-wrap; overflow-wrap: anywhere; }
.list-row { padding: .8mm 0; border-bottom: .5px solid #ddd; font-size: 8.2pt; overflow-wrap: anywhere; white-space: pre-wrap; }
.write-line { height: 6mm; border-bottom: .5px solid #ccc; }
.sheet-footer { display: flex; justify-content: space-between; gap: 3mm; border-top: .6px solid #777; padding-top: 2mm; font-size: 5.5pt; letter-spacing: .06em; }
.sheet-footer span { overflow-wrap: anywhere; min-height: 1lh; }
.writing-space { break-inside: avoid; }
/* Whole-box sheet layout. */
.sheet-header { min-height: 20mm; padding-bottom: 3mm; }
.name-banner { padding: 1mm 2mm; border: none; }
.name-banner::after { display: none; }
.name-line { height: 12mm; border-bottom: 1px solid #555; }
.sheet-panels { position: relative; min-height: 0; }
.secondary-page { grid-template-rows: minmax(0, 1fr) auto; }
.panel { margin: 0; }
.attribute-grid { grid-template-columns: repeat(3, minmax(0,1fr)); gap: 2mm; }
.attribute { min-height: 18mm; padding: 1.5mm .5mm; }
.attribute-main { font-size: 18pt; }
.attribute-label { font-size: 5.2pt; }
.entry + .entry { margin-top: 2mm; }
.entry-title { margin-top: 0; }
.sheet-footer { justify-content: flex-end; text-transform: none; }
.sheet-attribution { margin-right: auto; }
.sheet-attribution a { color: inherit; text-decoration: underline; }
.recovery { display: block; margin-top: 1mm; font: 6.5pt/1.35 Arial, sans-serif; }
.resource-tracks .tracker { border-bottom: .5px solid #aaa; margin-bottom: 1mm; padding-bottom: 2mm; }
.resource-tracks .tracker:last-child { border-bottom: none; margin: 0; }
.resource-tracks .tracker-label { font-size: 9pt; }
.pool-value { font-size: 16pt; padding: 2mm 0; }
.spell-stats { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 2mm; align-items: center; }
.spell-stats strong { font-size: 15pt; }
.ability-summary { margin-bottom: 2mm; }
.ability-summary strong { display: block; font-size: 9pt; }
.ability-summary small { font: 6.5pt/1.3 Arial, sans-serif; }
.equipment-list { display: grid; grid-template-columns: 1fr 1fr; column-gap: 5mm; }
.equipment-list .writing-space { grid-column: 1 / -1; }
/* All card types share the same cutting grid. */
.card-page { grid-template-rows: minmax(0, 1fr) auto; gap: 4mm; }
.card-grid { position: relative; min-height: 0; }
.reference-card { width: 88mm; height: 110mm; border: .7px dashed #555; padding: 2mm; break-inside: avoid; }
.card-inner { height: 100%; border: 2mm solid transparent; border-image: url("data:image/svg+xml,${encodeURIComponent(frameSvg)}") 20 stretch; padding: 2mm; }
.card-content { height: 100%; min-height: 0; overflow-wrap: anywhere; }
.reference-card-header { margin-bottom: 2mm; }
.card-kind { border-block: 1.5pt solid #272623; padding: 1.2mm 0; font: 800 11pt/1.2 Arial, sans-serif; text-transform: uppercase; letter-spacing: .18em; }
.reference-card h3 { font-size: 17pt; line-height: 1.1; font-weight: normal; margin: 2mm 0 0; }
.card-usage { border: 1px solid #555; padding: 1.5mm 2mm; margin: 0 0 2mm; font: 8pt/1.4 Arial, sans-serif; }
.card-usage strong { display: block; font-size: 10pt; }
.card-usage span { display: block; }
.card-details { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5mm 4mm; margin: 0 0 2mm; }
.card-details > div { min-width: 0; }
.card-details dt { font: 6pt/1.4 Arial, sans-serif; text-transform: uppercase; letter-spacing: .06em; }
.card-details dd { margin: .5mm 0 0; font-size: 9pt; }
.card-description { white-space: pre-wrap; font-size: 9pt; line-height: 1.4; }
.card-options { display: grid; grid-template-columns: repeat(auto-fit,minmax(40mm,1fr)); gap: 4mm; margin-top: 3mm; }
.card-option { min-width: 0; border-top: 1px solid #555; padding-top: 2mm; }
.card-option h4 { font-size: 11pt; margin: 0 0 2mm; }
.card-option .card-details { grid-template-columns: 1fr 1fr; }
.card-option .card-usage { padding: 1mm; }
@media screen { body { padding: 0; } .sheet-page { box-shadow: 0 2px 9px #00000012; } }
@media print { html, body { background: white; } .sheet-page { margin: 0; box-shadow: none; } }
`;
}
