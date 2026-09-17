---
name: render-character-sheet
description: Validate structured TTRPG character data and render it as a printable, self-contained HTML character sheet. Use when a user wants to create or revise a character sheet and the mechanical values can be supplied explicitly.
---

# Render a character sheet

Use this server as a deterministic renderer, not as a game-rules engine. You are responsible for translating the user's request into character JSON. The server validates that JSON and returns HTML; it does not infer missing choices, calculate rules, or decide what a character should contain.

## Workflow

1. Preserve the user's chosen game system and supplied mechanical values. Do not invent missing spells, equipment, bonuses, proficiencies, or character choices.
2. Construct a `version: 1` character object. The smallest valid object is `{ "version": 1, "system": "generic" }`.
3. Use the human-readable character JSON reference below for field-level details. Use `character-sheet://examples/minimal` only as a structural example, not as character facts.
4. For uncertain or incrementally assembled data, call `validate_character` and repair every returned JSON Pointer path.
5. Call `render_character_sheet` with the complete character object. Read the HTML from `structuredContent.html` when supported, otherwise use the text result.

## Important constraints

- All text values are treated as literal text and escaped. Do not send HTML in character fields.
- Unknown fields are rejected.
- Display values may be strings or finite numbers. Use strings when formatting matters, such as `"+5"` or `"1d8+3 piercing"`.
- `resources[].used` cannot exceed `resources[].maximum`.
- `presentation: "card"` produces a cut-out reference card; `presentation: "list"` keeps the entry on the sheet.
- Use `generic` for systems without a dedicated profile and optionally provide `systemName`.
- The returned document is self-contained, script-free HTML with embedded styles. The renderer is stateless and does not retain the character or generated document.

If validation fails, change only the fields identified by the errors unless the user asks for a broader revision.

## Character JSON reference

Start with these three fields. Everything else is optional.

```json
{
  "version": 1,
  "name": "",
  "system": "generic"
}
```

### Document

| Field | Meaning |
| --- | --- |
| `version` | Always `1`. |
| `name` | Character name. May be blank. |
| `system` | `generic`, `dnd-5e-2014`, or `dnd-5e-2024`. |
| `systemName` | Custom display name when using `generic`. |
| `paper` | `a4` or `letter`. Defaults to `a4`. |

### Identity and numbers

```json
"identity": [
  { "label": "Class & level", "value": "Fighter 3" }
],
"attributes": [
  { "label": "Strength", "value": 16, "modifier": "+3" }
],
"defenses": [
  { "label": "Armor class", "value": 17 }
],
"hitPoints": {
  "maximum": 24,
  "current": 19,
  "temporary": 0,
  "hitDice": "3d10"
}
```

`identity` and `defenses` use label/value pairs. `attributes` can also include a modifier. Display values may be strings or finite numbers.

### Checks

```json
"savingThrows": [
  { "name": "Strength", "bonus": "+5", "proficient": true }
],
"skills": [
  { "name": "Athletics", "bonus": "+5", "proficient": true }
]
```

`proficient` defaults to `false`.

### Resources and attacks

```json
"resources": [
  {
    "name": "Focus",
    "maximum": 3,
    "used": 1,
    "recovery": "Long rest",
    "display": "circles"
  }
],
"attacks": [
  {
    "name": "Longsword",
    "bonus": "+5",
    "damage": "1d8 + 3 slashing",
    "notes": "Versatile 1d10"
  }
]
```

Resource `display` can be `circles` or `pool`. `maximum` is an integer from 1 through 30. `used` defaults to `0` and cannot exceed `maximum`.

### Features and cards

```json
"features": [
  {
    "name": "Second Wind",
    "description": "Regain hit points.",
    "kind": "ability",
    "presentation": "list",
    "details": [
      { "label": "Use", "value": "Bonus action" }
    ],
    "usage": {
      "resource": "Second Wind",
      "amount": 1,
      "frequency": "Once per rest",
      "recovery": "Short or long rest"
    }
  }
]
```

`presentation` is `list` or `card`. Add `blankLines` from 0 through 24 for writing space. Entries can contain `options`, each with `name`, `description`, optional `details`, and optional `usage`. Set `optionLayout` to `stacked`, `compact`, or `cards`.

### Spellcasting

```json
"spellcasting": {
  "ability": "Intelligence",
  "saveDC": 13,
  "attackBonus": "+5",
  "slots": [
    { "level": "1st", "total": 2 }
  ],
  "spells": [
    { "name": "Magic Missile", "level": "1st", "description": "" }
  ]
}
```

Spells accept the same entry fields as features. Slot totals are positive integers up to 20.

### Equipment, personality, and notes

```json
"equipment": ["Backpack", "Rope", "Lantern"],
"proficiencies": ["Light armor", "Common", "Elvish"],
"personality": [
  {
    "label": "Ideal",
    "text": "",
    "blankLines": 4,
    "placement": "secondary"
  }
],
"notes": "Free-form notes",
"notesBlankLines": 6
```

Empty personality boxes, custom sections, and notes are omitted unless they contain text or a positive blank-line count. Personality `placement` is `main` or `secondary`.

### Custom sections

```json
"sections": [
  {
    "title": "Inventory",
    "entries": [
      { "name": "Supplies", "description": "Rope and rations" }
    ],
    "blankLines": 4,
    "width": 2,
    "allowedWidths": [1, 2],
    "placement": "secondary",
    "priority": 40,
    "group": "travel",
    "column": "right"
  }
]
```

| Field | Meaning |
| --- | --- |
| `entries` | Uses the same entry format as `features`. |
| `width` | `1`, `2`, or `3` columns. Defaults to `1`. |
| `allowedWidths` | One or more permitted widths from `1`, `2`, and `3`. |
| `placement` | `main` or `secondary`. Defaults to `secondary`. |
| `priority` | Integer from 0 through 100. Higher values are placed first. |
| `group` | Keeps related sections adjacent and gives them a shared width. |
| `column` | Preferred `left`, `middle`, or `right` column. |

Unknown fields are rejected. Call `validate_character` after constructing or revising an object; use its JSON Pointer paths to correct invalid fields before rendering.
