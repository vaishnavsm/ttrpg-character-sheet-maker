---
name: render-character-sheet
description: Compose structured TTRPG character data into a compact, printable character sheet and optional cut-out reference cards. Use when creating or revising a sheet from explicit character mechanics.
---

# Compose and render a character sheet

The main job is information design: turn the supplied character into the smallest practical set of useful printed pages. The renderer handles measurement and HTML generation, but your JSON choices determine what stays together, what becomes a card, and what receives first-page priority.

Do not treat the input as a form to dump into sections in source order. Design the sheet around play at the table.

## Page strategy

Aim for one character-sheet page. Use additional character-sheet pages only when the material cannot remain readable and useful on one page. Cut-out card pages are separate and do not count as a failure to keep the character sheet to one page.

Use the first page for information needed during play:

- identity and core attributes;
- defenses, hit points, movement, initiative, saves, and skills;
- every spendable or trackable resource, including spell slots;
- attacks and spellcasting numbers such as save DC and attack bonus;
- concise summaries of combat-relevant abilities.

Keep resources visually close to hit points and keep attacks, offensive abilities, and spellcasting numbers near one another. Group related material so a player can understand their available actions and remaining resources without turning a page.

Use adaptive multi-column layout. Give compact statistics narrow columns and allow dense material such as equipment, notes, or an inventory to span two columns when that packs the page better. Prefer useful occupation of available first-page space over automatically relegating equipment or notes to page two. If another page is unavoidable, move lower-priority reference material there: equipment, proficiencies, background detail, personality, extended notes, and non-combat lore.

Never split a single box across pages. Move it whole, change its allowed width, shorten redundant prose, or move the whole box to the next page. Use `group`, `placement`, `priority`, `width`, `allowedWidths`, and `column` on custom sections to express these relationships instead of relying on source order.

Do not add decorative or low-value printed matter merely because space exists. In particular, omit system/version badges, print instructions, player or owner names on cards, beginner-combat advice, death-save boxes, empty personality prompts, and similar furniture unless the user explicitly wants them. A character name may remain blank for handwriting.

## Decide between sheet entries and cards

Use `presentation: "list"` for short, always-on information that is easiest to scan on the sheet: passive traits, proficiencies, senses, languages, and brief permanent features.

Use `presentation: "card"` when a spell or ability benefits from being held as a separate play aid, especially when it:

- consumes a tracked resource;
- has a limited frequency or recovery rule;
- contains enough procedure or choices to clutter the main sheet; or
- is something the player actively selects during play.

Keep a short `summary` on the main sheet when the full rules move to a card, particularly for combat-relevant abilities. The sheet must still tell the player that the option exists and how it fits their turn.

Every consumable card must state its cost prominently through `usage`: resource, amount, frequency, and recovery as applicable. Do not make the player infer whether a card costs Ki, Focus, a spell slot, a once-per-day use, or another pool. Use `amount: 0` only when the action explicitly spends no resource.

Cards are uniform, single-width cut-outs. Never create a double-width card merely to preserve verbose prose. Condense wording and details to the information required at the table. Use compact notation where it remains clear—for example, `1 action / ritual (+10 min)` rather than a paragraph explaining both casting modes.

Alternate modes of one ability belong together on one card using `options`; different abilities belong on different cards. Do not split Wild Shape forms, Channel Divinity choices, or similar modes into separate cards unless the user explicitly asks. Choose `optionLayout: "compact"` when concise inline options fit, or `"stacked"` when each option needs its own readable block. Use `"cards"` only when the user actually wants separate option cards.

Mix spell, ability, and trait cards on the same cutting pages to minimize paper. Their `kind` labels should remain visually prominent; do not create separate pages by type.

## Blank writing space

Omitted information and intentionally blank printable space are different. Use `blankLines` when the user wants a labeled box or notes area to fill by hand. Otherwise omit empty personality, notes, and custom sections rather than generating placeholder boxes.

## Preserve the character

Use only mechanics supplied by the user or an authoritative source they selected. Do not calculate, rebalance, audit, or invent spells, equipment, bonuses, proficiencies, resources, or character choices. Preserve meaningful formatting in display strings such as `"+5"` and `"1d8+3 piercing"`. Use `generic` with `systemName` when there is no dedicated system profile.

When source material is verbose, condense presentation without changing mechanics. Remove repeated explanations, not rules that affect decisions at the table.

## Render

Construct a `version: 1` character object; the smallest valid object is `{ "version": 1, "system": "generic" }`. The render tool's input schema is the authoritative field reference.

For uncertain or incrementally assembled data, call `validate_character` and fix the reported JSON Pointer paths. Unknown fields are rejected, text is escaped, and `resources[].used` cannot exceed `resources[].maximum`.

Call `render_character_sheet` only after making the composition decisions above. Read the HTML from `structuredContent.html` when available, otherwise from the text result. The returned document is self-contained and stateless. It includes a tightly scoped inline layout runtime that measures and positions the sheet when the file is opened; it needs no network connection, external assets, site workflow, or server-side browser.

After rendering, check the outcome conceptually against these questions:

1. Did the character sheet stay to one page where reasonably possible?
2. Are HP, resources, attacks, spellcasting numbers, and combat abilities together on page one?
3. Is any box split, any page unnecessarily sparse, or any content duplicated between sheet and cards?
4. Do all limited-use cards clearly show their cost and recovery?
5. Are cards single-width, consistently sized, and packed together regardless of type?

If validation fails, change only the invalid fields. If the layout is poor, revise grouping, priority, width, summaries, or card/list presentation rather than changing the character's mechanics.
