/**
 * The complete browser layout engine. Keep this function dependency-free: its
 * source is embedded verbatim in API/MCP HTML so downloaded files can lay
 * themselves out without the Next.js application or a server-side browser.
 */
export function layoutCharacterSheetDocument(doc: Document): { html: string; pages: number } {
  if (doc.documentElement.dataset.layoutState === "complete") {
    return { html: "<!DOCTYPE html>\n" + doc.documentElement.outerHTML, pages: doc.querySelectorAll(".sheet-page").length };
  }
  type Rectangle = { left: number; top: number; width: number; height: number };

  function paginateCards(root: HTMLElement, pages: HTMLElement[]) {
    const source = doc.querySelector<HTMLTemplateElement>("#card-source");
    const template = doc.querySelector<HTMLTemplateElement>("#card-page-template");
    if (!source || !template) return;
    const grids: HTMLElement[] = [];
    const mm = 96 / 25.4;
    const gap = 5 * mm;
    function addPage() {
      if (pages.length >= 60) throw new Error("This character exceeds 60 pages. Reduce the amount of content.");
      const page = template!.content.firstElementChild!.cloneNode(true) as HTMLElement;
      root.append(page); pages.push(page);
      const grid = page.querySelector<HTMLElement>(".card-grid")!;
      grids.push(grid); return grid;
    }
    function fitsContent(card: HTMLElement) {
      const content = card.querySelector<HTMLElement>(".card-content")!;
      return content.scrollHeight <= content.clientHeight + 1 && content.scrollWidth <= content.clientWidth + 1;
    }
    const first = addPage();
    const measured = Array.from(source.content.querySelectorAll<HTMLElement>(".reference-card")).map((card,index) => {
      card.style.position = "absolute"; card.style.top = "0"; card.style.left = "0"; card.style.height = "110mm";
      first.append(card);
      if (!fitsContent(card)) throw new Error(`Card “${card.querySelector("h3")!.textContent}” is too tall for a single-width card. Condense its text, split it into separate cards, or set presentation to "list". Nothing has been clipped.`);
      const height = card.getBoundingClientRect().height;
      if (height > first.clientHeight + .5) throw new Error("A card does not fit on this paper size.");
      card.remove(); return { card, height, index };
    });
    type Item = typeof measured[number];
    function pack(bestFit: boolean) {
      const bins: { height: number; items: Item[] }[] = [];
      for (const item of [...measured].sort((a,b) => b.height-a.height || a.index-b.index)) {
        const candidates = bins.map((bin,index) => ({bin,index,remaining:first.clientHeight-bin.height-item.height})).filter(c => c.remaining >= -.5);
        if (bestFit) candidates.sort((a,b) => a.remaining-b.remaining || a.index-b.index);
        const bin = candidates[0]?.bin ?? (() => { const next = {height:0,items:[] as Item[]}; bins.push(next); return next; })();
        bin.items.push(item); bin.height += item.height + gap;
      }
      return bins;
    }
    const alternatives = [pack(true),pack(false)].sort((a,b) => a.length-b.length);
    alternatives[0].forEach((bin,index) => {
      const pageIndex = Math.floor(index/2);
      while (grids.length <= pageIndex) addPage();
      const grid = grids[pageIndex];
      const left = (grid.clientWidth - (176 * mm + gap))/2 + (index%2)*(88*mm+gap);
      let top = 0;
      for (const {card,height} of bin.items) { card.style.left = `${left}px`; card.style.top = `${top}px`; grid.append(card); top += height+gap; }
    });
    source.remove(); template.remove();
  }

  function arrange(strategy: number): { html: string; pages: number; penalty: number } {
    const root = doc.getElementById("sheets");
    const first = root?.querySelector<HTMLElement>(".sheet-page");
    if (!root || !first) throw new Error("The sheet could not be loaded.");
    const panels = Array.from(first.querySelectorAll<HTMLElement>(".panel"));
    const source: HTMLElement[] = [];
    const groups = new Map<string,HTMLElement>();
    for (const panel of panels) {
      const key=panel.dataset.group;
      if (!key) {source.push(panel);continue;}
      let group=groups.get(key);
      if (!group) { group=doc.createElement("div"); group.className="layout-group"; Object.assign(group.dataset,panel.dataset); group.style.display="grid"; group.style.gap="3mm"; groups.set(key,group); source.push(group); }
      if(panel.hasAttribute("data-pinned"))group.setAttribute("data-pinned","true");
      group.dataset.priority=String(Math.max(Number(group.dataset.priority),Number(panel.dataset.priority)));
      group.dataset.widths=(group.dataset.widths ?? "1").split(",").filter(w=>(panel.dataset.widths ?? "1").split(",").includes(w)).join(",");
      if (!group.dataset.widths) throw new Error(`Group “${key}” has incompatible allowed widths.`);
      group.dataset.width=group.dataset.widths.split(",")[0]; group.append(panel);
    }
    const template = first.cloneNode(true) as HTMLElement;
    first.querySelector(".sheet-panels")!.replaceChildren();
    const pages = [first]; const occupied: Rectangle[][] = [[]]; const gap = 3 * 96 / 25.4;
    function addPage() {
      if (pages.length >= 60) throw new Error("This character exceeds 60 pages.");
      const page = template.cloneNode(true) as HTMLElement;
      page.querySelector(".sheet-header")?.remove(); page.classList.add("secondary-page"); page.querySelector(".sheet-panels")!.replaceChildren();
      root!.append(page); pages.push(page); occupied.push([]); return pages.length-1;
    }
    function measure(box: HTMLElement, pageIndex: number, span: number) {
      const area = pages[pageIndex].querySelector<HTMLElement>(".sheet-panels")!;
      const columnWidth = (area.clientWidth - 2*gap)/3;
      box.style.width = `${columnWidth*span + gap*(span-1)}px`; box.style.position = "absolute";
      if (box.classList.contains("layout-group")) for (const child of Array.from(box.children) as HTMLElement[]) {child.style.position="relative";child.style.width="100%";}
      area.append(box); const height = box.getBoundingClientRect().height;
      return { area,columnWidth,height,width:columnWidth*span+gap*(span-1) };
    }
    function place(box: HTMLElement, pageIndex: number, span: number, compact = false) {
      const {area,columnWidth,height,width} = measure(box,pageIndex,span);
      const preferred = Math.min(Number(box.dataset.column),3-span);
      const positions = [...new Set([0,...occupied[pageIndex].map(r => r.top+r.height+gap)])].sort((a,b)=>a-b);
      const candidates = positions.flatMap(top => Array.from({length:4-span},(_,column)=>({column,top})));
      if (!compact) candidates.sort((a,b) => (Number(b.column===preferred)-Number(a.column===preferred)) || a.top-b.top);
      for (const {column,top} of candidates) {
        if (top+height > area.clientHeight+.5) continue;
        const left = column*(columnWidth+gap);
        const collision = occupied[pageIndex].some(r => left < r.left+r.width+gap-.5 && left+width+gap > r.left+.5 && top < r.top+r.height+gap-.5 && top+height+gap > r.top+.5);
        if (collision) continue;
        box.style.left = `${left}px`; box.style.top = `${top}px`; box.dataset.actualWidth = String(span); occupied[pageIndex].push({left,top,width,height}); return true;
      }
      box.remove(); return false;
    }
    const main = source.filter(box => box.dataset.placement !== "secondary");
    main.sort((a,b) => Number(b.hasAttribute("data-pinned"))-Number(a.hasAttribute("data-pinned")) || Number(b.dataset.priority)-Number(a.dataset.priority) || (strategy===1 ? Number(b.dataset.column)-Number(a.dataset.column) : strategy===2 ? Number(a.dataset.column)-Number(b.dataset.column) : 0));
    function widths(box: HTMLElement) { return (box.dataset.widths ?? box.dataset.width!).split(",").map(Number); }
    function fit(box: HTMLElement, page: number, compact=false) { return widths(box).some(width=>place(box,page,width,compact)); }
    const overflow: HTMLElement[] = [];
    for (const box of main) {
      if (fit(box,0,false)) continue;
      if (box.hasAttribute("data-pinned")) throw new Error(`The main-page “${box.querySelector("h2")!.textContent}” box does not fit. Reduce its content; main stats and resources cannot move to another page.`);
      overflow.push(box);
    }
    const secondary = [...overflow,...source.filter(box => box.dataset.placement === "secondary")].map((box,index) => { const {width,height} = measure(box,0,Number(box.dataset.width)); box.remove(); return {box,index,area:width*height}; }).sort((a,b)=>Number(b.box.dataset.priority)-Number(a.box.dataset.priority) || (strategy===2 ? a.area-b.area : b.area-a.area) || a.index-b.index);
    for (const {box} of secondary) {
      let placed = false;
      for (let p=0;p<pages.length;p++) if (fit(box,p,true)) { placed=true; break; }
      if (!placed) { const next = addPage(); placed=fit(box,next,true); if (!placed) throw new Error(`The “${box.querySelector("h2")!.textContent}” box is larger than a full page. Shorten it or create separate boxes. Boxes are never split.`); }
    }
    const penalty=pages.slice(1).reduce((sum,page)=>sum+Array.from(page.querySelectorAll<HTMLElement>(".panel")).reduce((n,p)=>n+Number(p.dataset.priority),0),0);
    paginateCards(root,pages);
    pages.forEach((page,i) => { page.querySelector("[data-page-number]")!.textContent = `${i+1} / ${pages.length}`; });
    return { html:"<!DOCTYPE html>\n"+doc.documentElement.outerHTML,pages:pages.length, penalty };
  }

  doc.documentElement.dataset.layoutState = "running";
  const original=doc.body.innerHTML; let best: ReturnType<typeof arrange> | undefined; let failure: unknown;
  for(let strategy=0;strategy<3;strategy++) {
    doc.body.innerHTML=original;
    try { const result=arrange(strategy); if(!best || result.pages<best.pages || (result.pages===best.pages && result.penalty<best.penalty)) best=result; } catch(error) {failure=error;}
  }
  if(!best) {doc.body.innerHTML=original;doc.documentElement.dataset.layoutState="failed";throw failure;}
  const parsed=new DOMParser().parseFromString(best.html,"text/html");
  doc.body.innerHTML=parsed.body.innerHTML; doc.documentElement.dataset.layoutState="complete";
  return {html:"<!DOCTYPE html>\n"+doc.documentElement.outerHTML,pages:best.pages};
}

/** Return the layout function as a standalone inline program. */
export function layoutRuntimeSource(): string {
  const source = `(() => {
    const layout = ${layoutCharacterSheetDocument.toString()};
    const notify = (state, message) => window.dispatchEvent(new CustomEvent("character-sheet-layout", { detail: { state, message } }));
    const run = async () => {
      if (document.documentElement.dataset.layoutState === "complete") return;
      try {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        layout(document); notify("complete");
      } catch (error) {
        document.documentElement.dataset.layoutState = "failed";
        const message = error instanceof Error ? error.message : "Unable to lay out this character sheet.";
        const box = document.createElement("pre"); box.className = "layout-error"; box.setAttribute("role", "alert"); box.textContent = message; document.body.prepend(box); notify("failed", message);
      }
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => void run(), { once: true }); else void run();
  })();`;
  return source.replaceAll("</script", "<\\/script");
}
