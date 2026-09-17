import { escapeHtml } from "./html";

export function renderFooter(siteUrl = ""): string {
  let attribution = "";
  if (siteUrl.trim()) {
    const url = new URL(siteUrl.trim());
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
      throw new Error("SITE_URL must be an absolute HTTP or HTTPS URL without credentials.");
    }
    const escaped = escapeHtml(url.href);
    attribution = `<span class="sheet-attribution">Made using <a href="${escaped}" target="_blank" rel="noopener noreferrer">${escaped}</a></span>`;
  }
  return `<footer class="sheet-footer">${attribution}<span data-page-number></span></footer>`;
}
