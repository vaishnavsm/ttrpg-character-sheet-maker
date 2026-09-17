import { z } from "zod";

import { renderCharacterDocument } from "./render";
import { characterSchema, type Character } from "./schema";

export type ValidationError = {
  path: string;
  code: string;
  message: string;
};

export type CharacterValidation =
  | { valid: true; character: Character; errors: [] }
  | { valid: false; errors: ValidationError[] };

function jsonPointer(path: PropertyKey[]): string {
  if (path.length === 0) return "";
  return `/${path
    .map(String)
    .map((part) => part.replaceAll("~", "~0").replaceAll("/", "~1"))
    .join("/")}`;
}

export function validateCharacter(candidate: unknown): CharacterValidation {
  const parsed = characterSchema.safeParse(candidate);
  if (parsed.success) {
    return { valid: true, character: parsed.data, errors: [] };
  }

  return {
    valid: false,
    errors: parsed.error.issues.map((issue) => ({
      path: jsonPointer(issue.path),
      code: issue.code,
      message: issue.message,
    })),
  };
}

export function parseCharacterJson(source: string): Character {
  if (source.length > 250_000) {
    throw new Error("Keep the character JSON below 250,000 characters.");
  }

  let candidate: unknown;
  try {
    candidate = JSON.parse(source) as unknown;
  } catch (error) {
    throw new Error(
      `Invalid JSON: ${error instanceof Error ? error.message : "check your syntax"}`,
    );
  }

  const validation = validateCharacter(candidate);
  if (!validation.valid) {
    throw new Error(
      validation.errors
        .map((error) => `${error.path.slice(1).replaceAll("/", ".") || "character"}: ${error.message}`)
        .join("\n"),
    );
  }
  return validation.character;
}

export function getCharacterJsonSchema() {
  return z.toJSONSchema(characterSchema);
}

export function characterSheetFilename(name: string): string {
  const stem = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${stem || "character"}-sheet.html`;
}

export function renderCharacterSheet(character: Character, siteUrl = "") {
  return {
    html: renderCharacterDocument(character, siteUrl),
    mimeType: "text/html; charset=utf-8" as const,
    filename: characterSheetFilename(character.name),
  };
}

export function renderCharacterJson(source: string, siteUrl = "") {
  const character = parseCharacterJson(source);
  return { character, ...renderCharacterSheet(character, siteUrl) };
}
