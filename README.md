# Folio — character sheet workshop

A Next.js debug page that turns a character JSON specification into a printable, self-contained HTML document. Rendering runs locally in the browser. There are no model calls, agent endpoints, API keys, uploads, accounts, or persistence.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3010. Paste JSON or select an example, then click **Render character sheet** (Cmd/Ctrl + Enter). Download the HTML for an offline copy, or use **Print / PDF** to open the browser print dialog. Disable browser headers and footers; use the sheet's configured paper size and default/100% scale.

The setup follows the adjacent portfolio project: Next.js 16.3.3 App Router, React 19, TypeScript, ESLint, and Zod. No A2A dependencies are included.

## Character specification

The smallest valid input is:

```json
{
  "version": 1,
  "name": "A new adventurer",
  "system": "generic"
}
```

See `src/lib/sheet/schema.ts` for the authoritative schema. Downloadable JSON examples are in `public/examples/`; a JSON Schema representation is in `public/character.schema.json` (the runtime Zod schema additionally checks that resource `used` does not exceed `maximum`). Unknown fields are rejected to prevent accidentally omitting misspelled content.

| Field | Shape / purpose |
| --- | --- |
| `version` | `1` |
| `name` | Character name |
| `system` | `dnd-5e-2014`, `dnd-5e-2024`, or `generic` |
| `systemName` | Optional printed system label |
| `paper` | `a4` (default) or `letter` |
| `identity` | `[{ "label": "Class & level", "value": "Ranger · 3" }]` |
| `attributes` | `[{ "label": "Dexterity", "value": 16, "modifier": "+3" }]`; modifier optional |
| `defenses` | `[{ "label": "Armor class", "value": 15 }]` |
| `savingThrows`, `skills` | `[{ "name": "Stealth", "bonus": "+5", "proficient": true }]` |
| `hitPoints` | `{ "maximum": 28, "current": 20, "temporary": 0, "hitDice": "3d10" }`; only maximum required |
| `resources` | `[{ "name": "Focus", "maximum": 5, "used": 1 }]`; used defaults to zero |
| `attacks` | `[{ "name": "Longbow", "bonus": "+7", "damage": "1d8 + 3", "notes": "Range 150 / 600 ft" }]` |
| `features` | `[{ "name": "Feature", "description": "Rules reminder or flavor" }]` |
| `equipment`, `proficiencies` | Arrays of strings |
| `personality` | `[{ "label": "Bond", "text": "..." }]`; labels are freeform |
| `spellcasting` | `{ "ability": "Intelligence", "saveDC": 13, "attackBonus": "+5", "slots": [{ "level": "1st", "total": 2 }], "spells": [{ "name": "Light", "level": "Cantrip", "description": "..." }] }` |
| `sections` | `[{ "title": "Vows", "column": "right", "entries": [{ "name": "A promise", "description": "..." }] }]`; column can be left, middle, or right |
| `notes` | Freeform text |

Numeric display values may be strings or finite numbers. Omit `hitPoints.current` and `temporary` for empty pencil fields; zero is printed as zero. Resource circles marked with an × represent spent uses. Filled skill circles represent proficiency.

These are **display profiles**, not rules engines. Both D&D editions use the same ornamental layout, with their own system labels and example data. D&D profiles add death-save tracks when hit points are provided. The generic profile allows arbitrary labels without D&D-only fields. All scores, modifiers, DCs, bonuses, and selected abilities must be supplied; examples are illustrative, incomplete builds, not rules-validated characters.

## Rendering pipeline

1. `parseCharacter(source)` validates JSON and reports field paths.
2. `renderCharacterDocument(character)` creates the initial HTML with inline CSS and static SVG artwork.
3. `paginateDocument(document)` measures the HTML in a browser iframe, splits sections at row/text boundaries, repeats section titles on continuation pages, and numbers the pages.
4. The debug page previews and downloads that final, script-free HTML.

`renderCharacterDocument` is browser-independent, but its raw output must be paginated before export. Pagination requires a browser DOM; this version is not a server rendering endpoint. The two rendering functions are separated from the debug UI so a future browser-based export worker can use them.

The sheet uses three independently flowing columns. Long content continues in the same column on later pages; this preserves section positions and may leave other columns empty. Font sizes remain fixed. There is a 60-page cap and bounded input fields; layout failures leave the previous successful preview intact and report an error. Export buttons are disabled while the JSON differs from the rendered version.

Original vector ornaments are in `src/lib/sheet/ornaments.ts`. The panel border uses a static nine-slice SVG border image. There is no runtime image generation, remote artwork, external font dependency, or JavaScript in exported sheets. Input text is escaped and the export includes a restrictive content security policy.

The preview and print output use the same paginated document. Pagination is measured in the current browser with local fonts; another browser or machine can substitute fonts and slightly change wrapping. For a frozen artifact, save to PDF in the browser that rendered it.

## Validation

```sh
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm test
```

The browser tests cover the initial render, malformed and invalid JSON, stale export prevention, all examples, long-content pagination, escaped input, standalone offline HTML, Letter sizing, PDF generation, and mobile overflow.
