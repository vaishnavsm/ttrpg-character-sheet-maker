/** Measures real browser layout, then freezes the result into script-free HTML. */
export function paginateDocument(doc: Document): { html: string; pages: number } {
  const root = doc.getElementById("sheets");
  const first = root?.querySelector<HTMLElement>(".sheet-page");
  if (!root || !first) throw new Error("The sheet could not be loaded.");
  const template = first.cloneNode(true) as HTMLElement;
  const sourceColumns = Array.from(template.querySelectorAll<HTMLElement>(".sheet-column"));
  first.querySelectorAll(".sheet-column").forEach(col => col.replaceChildren());
  const pages = [first];

  function column(pageIndex: number, columnIndex: number): HTMLElement {
    while (pages.length <= pageIndex) {
      if (pages.length >= 60) throw new Error("This character exceeds 60 pages. Reduce the amount of content.");
      const next = template.cloneNode(true) as HTMLElement;
      next.querySelectorAll(".sheet-column").forEach(col => col.replaceChildren());
      root!.append(next);
      pages.push(next);
    }
    return pages[pageIndex].querySelectorAll<HTMLElement>(".sheet-column")[columnIndex];
  }

  function fits(col: HTMLElement): boolean {
    const last = col.lastElementChild;
    return !last || last.getBoundingClientRect().bottom <= col.getBoundingClientRect().bottom + .5;
  }

  sourceColumns.forEach((source, columnIndex) => {
    let pageIndex = 0;
    for (const original of Array.from(source.children)) {
      let col = column(pageIndex, columnIndex);
      const complete = original.cloneNode(true) as HTMLElement;
      col.append(complete);
      if (fits(col)) continue;
      complete.remove();

      const content = original.querySelector(".panel-content")!;
      const rows = Array.from(content.children);
      let fragment: HTMLElement;
      let target: Element;
      let continued = false;
      function createFragment() {
        fragment = original.cloneNode(true) as HTMLElement;
        target = fragment.querySelector(".panel-content")!;
        target.replaceChildren();
        if (continued) {
          const marker = doc.createElement("span");
          marker.className = "continued";
          marker.textContent = "continued";
          fragment.querySelector("h2")!.append(marker);
        }
        col.append(fragment);
      }
      createFragment();
      for (let i = 0; i < rows.length; i++) {
        const group = [rows[i].cloneNode(true)];
        if (rows[i].hasAttribute("data-keep-next") && rows[i + 1]) group.push(rows[++i].cloneNode(true));
        target!.append(...group);
        if (fits(col)) continue;
        group.forEach(node => node.parentNode?.removeChild(node));
        if (!target!.childElementCount) fragment!.remove();
        else continued = true;
        pageIndex++;
        col = column(pageIndex, columnIndex);
        createFragment();
        target!.append(...group);
        if (!fits(col)) throw new Error("A field is too tall for the page. Shorten its label or value.");
      }
    }
  });

  pages.forEach((page, i) => {
    page.querySelector("[data-page-number]")!.textContent = `${String(i + 1).padStart(2, "0")} / ${String(pages.length).padStart(2, "0")}`;
  });
  return { html: "<!DOCTYPE html>\n" + doc.documentElement.outerHTML, pages: pages.length };
}
