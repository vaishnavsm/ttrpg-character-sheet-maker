# D&D/TTRPG Character Sheet Maker

A Next.js workshop and stateless remote MCP server that turn character JSON into printable, self-contained HTML. Rendering is deterministic: there are no model calls, uploads, accounts, or persistence.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3010. Choose **Do it yourself**, select a blank starter profile or paste JSON, then click **Render** (Cmd/Ctrl + Enter).

## Agent interface

Connect any Streamable HTTP MCP client to `http://localhost:3010/mcp`. The endpoint uses the stateless MCP `2026-07-28` protocol exclusively: clients discover it with `server/discover`, every request is self-describing, and legacy initialization/session traffic is rejected. It exposes:

- `validate_character`, which returns normalized character data or repairable JSON Pointer errors.
- `render_character_sheet`, which accepts the complete version-1 character object and returns self-contained HTML in both the text result and `structuredContent.html`.
- `skill://render-character-sheet/SKILL.md`, a progressively disclosed Agent Skill that teaches the calling agent how to construct and render a sheet.
- `character-sheet://examples/minimal`, a small structural example. The complete human-readable format is documented in the Markdown skill.

The server also exposes `skill://index.json` for clients using the earlier MCP skill-discovery convention and advertises the `io.modelcontextprotocol/skills` extension. It remains usable by ordinary MCP clients that only understand tools and resources.

For pre-connection discovery, `/.well-known/ai-catalog.json` publishes an experimental AI Catalog that points to the MCP Server Card at `/mcp/server-card`. Both documents use their specified media types, allow browser reads with CORS, cache for one hour, and support `ETag` revalidation. Their public URLs follow `SITE_URL` when configured and otherwise use the request origin.

With the development server running, exercise the endpoint using the included ad-hoc client:

```sh
npm run test:mcp-client
```

Or inspect it with Kado MCP:

```sh
kado mcp tools-list http://localhost:3010/mcp --transport http --json
kado mcp tools-get http://localhost:3010/mcp render_character_sheet --transport http --json
```

## HTTP API

Non-agent clients can use the versioned, stateless API under `/api/v1`:

- `GET /api/v1` discovers the available API and MCP endpoints.
- `GET /api/v1/schema` returns the accepted character JSON Schema.
- `POST /api/v1/validate` accepts a character object as the JSON body and returns normalized data or validation errors.
- `POST /api/v1/render` accepts the same direct JSON body and returns `text/html; charset=utf-8`. Invalid characters return structured JSON with status `422`.

For example:

```sh
curl -sS http://localhost:3010/api/v1/render \
  -H 'Content-Type: application/json' \
  --data '{"version":1,"name":"Arin","system":"generic"}' \
  --output arin-sheet.html
```

Requests are limited to 250,000 bytes. Browser requests are allowed from the API's own origin; add comma-separated origins with `API_ALLOWED_ORIGINS`. Server-to-server requests do not need an `Origin` header.

The stack follows the adjacent portfolio project: Next.js 16.3.3 App Router, React 19, TypeScript, ESLint, and Zod.

## Corrected level-three party

The selector includes five supplied 2014 D&D 5e characters. These files are the single source of their data and can also be downloaded at `/examples/<filename>`:

| Character | JSON |
| --- | --- |
| Wood Elf Rogue — Thief | [level-3-rogue-thief.json](public/examples/level-3-rogue-thief.json) |
| Human Monk — Way of the Open Hand | [level-3-monk-open-hand.json](public/examples/level-3-monk-open-hand.json) |
| Wood Elf Druid — Circle of the Moon | [level-3-druid-moon.json](public/examples/level-3-druid-moon.json) |
| Wood Elf Ranger — Hunter | [level-3-ranger-hunter.json](public/examples/level-3-ranger-hunter.json) |
| Wood Elf Paladin — Oath of Devotion | [level-3-paladin-devotion.json](public/examples/level-3-paladin-devotion.json) |

These use the user's revised data, including ranger INT 8 / Investigation +1 and the paladin's revised abilities, DC 12, +4 spell attack, three Divine Sense uses, three prepared spells plus two oath spells, and scale mail. They include the listed proficient skills, no Quirk/Ideal/Flaw/Notes boxes, and no beginner-turn boxes. The renderer does not audit game rules or invent missing choices.

## Sheet layout

- The printed name line is always blank. `name` is optional metadata for the debug page and download filename; it is not printed on sheets or cards.
- There are no system/version subtitles, printing instructions, owner names, or group banners in the printed output.
- Core stats, saves, skills, attacks, HP, resources, spellcasting numbers, and ability summaries are placed on the main page. Essential boxes cannot silently overflow onto later pages: rendering reports an error if they cannot fit.
- Resource pools and spell slots sit beside HP. Resources can use circles or a handwritten remaining/maximum pool, with recovery information underneath.
- After core content is placed, equipment, extra notes, and secondary boxes fill available main-page space before using later pages. Equipment uses a compact single-column box; Notes are double width by default.
- Boxes and related groups are indivisible. Pagination compares three deterministic arrangements, choosing fewer pages and then fewer high-priority sections on later pages. It tries explicitly allowed widths before adding pages; it never shrinks text. This is a bounded heuristic, not a guarantee of the mathematical minimum. A box larger than a full page produces an error instead of being split or clipped.

## Character specification

Smallest input:

```json
{ "version": 1, "system": "generic" }
```

`src/lib/sheet/schema.ts` is authoritative. `public/character.schema.json` is the downloadable JSON Schema; the runtime also checks that resource `used` does not exceed `maximum`. Unknown fields are rejected.

| Field | Shape / purpose |
| --- | --- |
| `version` | `1` |
| `name` | Optional metadata; may be empty; not printed |
| `system` | `dnd-5e-2014`, `dnd-5e-2024`, or `generic` |
| `systemName` | Optional debug metadata |
| `paper` | `a4` (default) or `letter` |
| `identity` | `[{ "label": "Class & level", "value": "Ranger 3" }]` |
| `attributes` | `[{ "label": "Dexterity", "value": 16, "modifier": "+3" }]` |
| `defenses` | `[{ "label": "Armor class", "value": 15 }]` |
| `savingThrows`, `skills` | `[{ "name": "Stealth", "bonus": "+5", "proficient": true }]` |
| `hitPoints` | `{ "maximum": 28, "current": 20, "temporary": 0, "hitDice": "3d10" }`; only maximum required |
| `resources` | `[{ "name": "Ki", "maximum": 3, "used": 0, "recovery": "Short or long rest" }]`; `display` can be `circles` (default) or `pool` |
| `attacks` | `[{ "name": "Longbow", "bonus": "+7", "damage": "1d8+3 piercing", "notes": "Range 150/600 ft" }]` |
| `features` | Array of entries (see below) |
| `equipment`, `proficiencies` | Arrays of strings |
| `personality` | `[{ "label": "Ideal", "text": "", "blankLines": 6 }]`; optional `placement`: `main` or `secondary` (default) |
| `spellcasting` | `{ "ability": "Wisdom", "saveDC": 13, "attackBonus": "+5", "slots": [{ "level": "1st", "total": 4 }], "spells": [...] }` |
| `sections` | Named boxes with `title`, optional `entries`, `blankLines`, `column` (`left`/`middle`/`right`), `width` (1/2/3), and `placement` (`main`/`secondary`, default secondary) |
| `notes`, `notesBlankLines` | Freeform notes and handwriting space (default five lines) |

Display values can be strings or finite numbers. Omitted HP current/temporary values remain empty; zero is printed as zero. All scores and bonuses are supplied, not calculated. The D&D profiles add death saves when HP is present; generic does not.

## Cards, resource costs, and alternate options

Entries in `features`, `spellcasting.spells`, and custom sections support:

- `name` and `description`.
- `presentation`: `list` (default) or `card`.
- `kind`: the prominent card header, such as `spell`, `ability`, or `trait`.
- `summary`: a short main-sheet description of an ability whose full rules live on a card.
- `details`: label/value pairs such as range, timing, and duration.
- `usage`: resource name, amount, optional frequency, and optional recovery.
- `options`: alternate modes of the **same ability**, each with a name, description, optional details, and optional usage override.
- `blankLines`: additional handwriting space.

For example:

```json
{
  "name": "Channel Divinity",
  "presentation": "card",
  "kind": "ability",
  "summary": "Choose Sacred Weapon or Turn the Unholy.",
  "usage": {
    "resource": "Channel Divinity use",
    "amount": 1,
    "recovery": "Short or long rest"
  },
  "options": [
    { "name": "Sacred Weapon", "description": "..." },
    { "name": "Turn the Unholy", "description": "..." }
  ]
}
```

`usage.amount: 0` explicitly means no resource spent. An ability can still have `frequency: "Once per turn"` or `"Once per day"`. Variable pools may use a string amount such as `"1 per HP healed"`. Options inherit the parent resource cost unless an override is supplied. The druid's ritual casting timing and zero-slot cost use compact inline notation. Wild Shape has three separate form cards; other alternate modes can share a card.

All card types pack into the same cutting pages after the character sheets. There are no type-separated pages or owner labels. Every cutout card is 88 × 110 mm, with four cards per cutting page on A4 or Letter. Cards never become double width or change height to fit their text. Content that exceeds the fixed size returns an error: condense it, split it into separate entries, or render it as a list. Dashed outlines mark the cut boundary.

For D&D spell cards, omitted usage is inferred only for numbered spell levels (one corresponding slot, long-rest recovery) and cantrips (no slot, unlimited). Other systems must supply usage. Legacy `details` with a Cost label is displayed prominently; otherwise an unspecified card cost is identified as unspecified, never assumed to be free.

## Intentionally empty boxes

Omit text or provide `""`, then choose `blankLines`:

```json
"personality": [
  { "label": "Ideal", "text": "", "blankLines": 6 },
  { "label": "Flaw", "blankLines": 4 }
],
"sections": [
  { "title": "Equipment sketch", "width": 2, "blankLines": 8 }
]
```

Each line reserves 6 mm, plus the heading and frame. Values range from 0 to 24; zero adds no writing space. No placeholder prose is generated. The entire box moves together when needed.

## Rendering and checks

1. `renderCharacterJson(source)` parses and validates input through the shared sheet service.
2. The service calls `renderCharacterDocument(character)` to create HTML with inline CSS, static SVG frames, card templates, and the dependency-free layout runtime.
3. When the returned file opens, that runtime measures boxes, packs whole boxes and mixed cards, numbers pages, removes templates, and marks the document `data-layout-state="complete"`.
4. The debug page, `POST /api/v1/render`, and MCP tool all use that same self-contained document contract.

Pagination uses the reader's browser DOM; the server does not launch a browser. The API/MCP response lays itself out when opened directly and does not depend on `/build` or private site code. Exported files have no external assets or fonts; input text is escaped and a restrictive content security policy permits only the embedded layout runtime. For a frozen layout across different machines, save to PDF in the browser that rendered it.

```sh
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm test
```

Browser tests cover all five revised premades on A4 and Letter, first-page resources and abilities, blank names, clean card pages, alternate modes, resource costs, mixed-card packing, unsplit wide boxes, invalid input, oversized-content errors, standalone exports, and mobile layout.

## Reusable layout rules

Attacks and spellcasting form an adjacent group; HP and resources form another. Core sections must fit page one. Other main sections have priority 60 and secondary sections priority 20 by default. Custom sections default to priority 30; higher numbers are placed first within their placement tier. `column` is a preference rather than a fixed position.

Custom sections accept:

```json
{
  "title": "Inventory",
  "placement": "secondary",
  "priority": 40,
  "width": 1,
  "allowedWidths": [1, 2],
  "group": "travel",
  "entries": [{ "name": "Supplies", "description": "Rope, lantern, rations" }]
}
```

Sections with the same `group` stay adjacent on the same page and must share an allowed width. `offense` and `vitality` are built-in group names; use other names for custom groups. A group's highest member priority applies. If any member is core, the whole group must fit page one. Without `allowedWidths`, `width` is fixed. Equipment permits one or two columns automatically.

Empty personality sections, empty custom sections, and Notes are omitted unless text or an explicit positive `blankLines` / `notesBlankLines` is supplied. This changes the previous default of automatically reserving note lines.

Entries accept `optionLayout`: `stacked` (default, headings within one card), `compact` (inline option text and costs), or `cards` (one fixed-size card per option, repeating the shared description/details and inheriting its cost unless overridden). These are deterministic formatting choices; the renderer does not rewrite rules or abbreviate arbitrary prose. Supply concise timing such as `Action / Ritual (+10 min)` in `details` and state the zero-slot ritual cost explicitly. All cards remain 88 × 110 mm; oversized content reports an error.

## Page attribution

Set `SITE_URL=https://your-domain.example` in `.env.local` or your deployment environment to override the public URL. Every sheet and cutting page includes “Made using” and a clickable URL; without `SITE_URL`, the renderer uses the current request origin. The attribution is retained in generated HTML and printed PDFs. The server reads the environment variable at request time; restart it after changing the value. Only absolute HTTP(S) URLs without credentials are accepted.
