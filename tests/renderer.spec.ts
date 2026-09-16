import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { examples } from "../src/lib/sheet/examples";

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("Ready to print");
}
async function render(page: Page, character: unknown) {
  await page.getByRole("textbox", { name: "Character JSON" }).fill(JSON.stringify(character, null, 2));
  await page.getByRole("button", { name: "Render character sheet" }).click();
  await expect(page.getByRole("status")).toContainText("Ready to print");
}
function sheet(page: Page) { return page.frameLocator('iframe[title="Printable character sheet"]'); }

test("default sheet is printable, has no controls, and fits its pages", async ({ page }) => {
  await ready(page);
  await expect(sheet(page).getByRole("heading", { name: "Mira Thornwood" })).toHaveCount(1);
  await expect(sheet(page).locator("button, input, textarea, script")).toHaveCount(0);
  const overflow = await sheet(page).locator(".sheet-column").evaluateAll(cols => cols.some(col => Array.from(col.children).some(child => child.getBoundingClientRect().bottom > col.getBoundingClientRect().bottom + 1)));
  expect(overflow).toBe(false);
  await page.screenshot({ path: "test-results/workshop.png", fullPage: true });
});

test("invalid input preserves preview and disables stale exports", async ({ page }) => {
  await ready(page);
  await page.getByRole("textbox", { name: "Character JSON" }).fill('{"name":');
  await expect(page.getByRole("button", { name: "Print / PDF" })).toBeDisabled();
  await page.getByRole("button", { name: "Render character sheet" }).click();
  await expect(page.locator(".error-box")).toContainText("Invalid JSON");
  await expect(sheet(page).getByRole("heading", { name: "Mira Thornwood" })).toBeVisible();
  await render(page, { version: 1, name: "New character", system: "generic" });
  await expect(page.locator(".error-box")).toHaveCount(0);
  await expect(sheet(page).getByRole("heading", { name: "New character" })).toBeVisible();
});

test("schema errors identify the path and unknown fields", async ({ page }) => {
  await ready(page);
  await page.getByRole("textbox", { name: "Character JSON" }).fill(JSON.stringify({ version: 1, name: "Test", system: "generic", resources: [{ name: "Stress", maximum: 3, used: 4 }], unknownField: true }));
  await page.getByRole("button", { name: "Render character sheet" }).click();
  await expect(page.locator(".error-box")).toContainText("resources.0.used");
  await expect(page.locator(".error-box")).toContainText("unknownField");
});

test("all examples render and generic supports custom sections without D&D fields", async ({ page }) => {
  await ready(page);
  await page.getByLabel("Start with an example").selectOption("2024");
  await expect(page.getByRole("status")).toContainText("Rowan Ashford · Ready to print");
  await expect(sheet(page).getByRole("heading", { name: "Spellcasting", exact: true })).toBeVisible();
  await page.getByLabel("Start with an example").selectOption("generic");
  await expect(page.getByRole("status")).toContainText("Sable, Keeper");
  await expect(sheet(page).getByRole("heading", { name: "Vows", exact: true })).toBeVisible();
  await expect(sheet(page).getByRole("heading", { name: "Death saves", exact: true })).toHaveCount(0);
});

test("long content paginates without clipping or losing text", async ({ page }) => {
  await ready(page);
  const features = Array.from({ length: 45 }, (_, i) => ({ name: `Feature ${i}`, description: `BEGIN-${i} ` + "A traveler records the paths through the valley. ".repeat(25) + ` END-${i}` }));
  await render(page, { ...examples[0].character, features, equipment: Array.from({ length: 75 }, (_, i) => `Equipment item ${i}`) });
  expect(await sheet(page).locator(".sheet-page").count()).toBeGreaterThan(2);
  const bodyText = await sheet(page).locator("body").innerText();
  for (let i = 0; i < 45; i++) {
    expect(bodyText).toContain(`BEGIN-${i}`);
    expect(bodyText).toContain(`END-${i}`);
  }
  expect(bodyText).toContain("Equipment item 74");
  const overflow = await sheet(page).locator(".sheet-column").evaluateAll(cols => cols.some(col => Array.from(col.children).some(child => child.getBoundingClientRect().bottom > col.getBoundingClientRect().bottom + 1)));
  expect(overflow).toBe(false);
  await expect(sheet(page).locator(".continued").first()).toBeVisible();
});

test("export is standalone HTML, escapes untrusted text and honors Letter", async ({ page, browser }) => {
  await ready(page);
  const injection = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
  await render(page, { version: 1, name: injection, system: "generic", paper: "letter", notes: "Test & <b>literal text</b>" });
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "HTML", exact: true }).last().click();
  const download = await event;
  const html = await readFile((await download.path())!, "utf8");
  expect(html).toContain("<!DOCTYPE html>");
  expect(html).toContain("&lt;script&gt;");
  expect(html).not.toMatch(/<script[\s>]/i);
  expect(html).not.toContain('src="http');
  const offline = await browser.newPage();
  await offline.context().setOffline(true);
  await offline.setContent(html);
  await expect(offline.locator("h1")).toHaveText(injection);
  await expect(offline.locator("img, script, button, input")).toHaveCount(0);
  const dimensions = await offline.locator(".sheet-page").evaluate(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height }));
  expect(dimensions.width).toBeCloseTo(816, 0);
  expect(dimensions.height).toBeCloseTo(1056, 0);
  await offline.pdf({ path: "test-results/letter-sheet.pdf", preferCSSPageSize: true });
  await offline.close();
});

test("mobile editor and preview stay inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflows).toBe(false);
  await expect(page.getByRole("textbox", { name: "Character JSON" })).toBeVisible();
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});
