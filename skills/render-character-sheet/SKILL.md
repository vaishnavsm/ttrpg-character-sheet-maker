---
name: render-character-sheet
description: Validate structured TTRPG character data and render it as a printable, self-contained HTML character sheet. Use when a user wants to create or revise a character sheet and the mechanical values can be supplied explicitly.
---

# Render a character sheet

Use this server as a deterministic renderer, not as a game-rules engine. You are responsible for translating the user's request into character JSON. The server validates that JSON and returns HTML; it does not infer missing choices, calculate rules, or decide what a character should contain.

## Workflow

1. Preserve the user's chosen game system and supplied mechanical values. Do not invent missing spells, equipment, bonuses, proficiencies, or character choices.
2. Construct a `version: 1` character object. The smallest valid object is `{ "version": 1, "system": "generic" }`.
3. When you need field-level details, read `folio://character-schema`. Use `folio://examples/minimal` only as a structural example, not as character facts.
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
