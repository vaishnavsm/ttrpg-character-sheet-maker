import { expect, test } from "@playwright/test";

test("prints the rendered sheet from its preview frame", async ({ page }) => {
  await page.goto("/build");

  const printButton = page.getByRole("button", { name: "Print", exact: true });
  await expect(printButton).toBeEnabled();

  const preview = page.locator('iframe[title="Rendered character sheet"]');
  await expect(preview).toHaveAttribute("sandbox", /allow-modals/);
  await preview.evaluate((frame: HTMLIFrameElement) => {
    const frameWindow = frame.contentWindow;
    if (!frameWindow) throw new Error("Preview frame is unavailable");
    frameWindow.print = () => frame.setAttribute("data-print-called", "true");
  });

  await printButton.click();
  await expect(preview).toHaveAttribute("data-print-called", "true");
});
