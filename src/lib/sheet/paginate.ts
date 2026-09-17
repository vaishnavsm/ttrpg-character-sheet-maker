import { paginateCards } from "./cards";

type Rectangle = { left: number; top: number; width: number; height: number };

/** Pack whole boxes, filling available gaps before adding pages. */
function arrange(doc: Document, strategy: number): { html: string; pages: number; penalty: number } {
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
    if (!group) {
      group=doc.createElement("div");
      group.className="layout-group";
      Object.assign(group.dataset,panel.dataset);
      group.style.display="grid";group.style.gap="3mm";
      groups.set(key,group);source.push(group);
    }
    if(panel.hasAttribute("data-pinned"))group.setAttribute("data-pinned","true");
    group.dataset.priority=String(Math.max(Number(group.dataset.priority),Number(panel.dataset.priority)));
    // Grouped panels use their shared width and remain adjacent on one page.
    group.dataset.widths=(group.dataset.widths ?? "1").split(",").filter(w=>(panel.dataset.widths ?? "1").split(",").includes(w)).join(",");
    if (!group.dataset.widths) throw new Error(`Group “${key}” has incompatible allowed widths.`);
    group.dataset.width=group.dataset.widths.split(",")[0];
    group.append(panel);
  }
  const template = first.cloneNode(true) as HTMLElement;
  first.querySelector(".sheet-panels")!.replaceChildren();
  const pages = [first];
  const occupied: Rectangle[][] = [[]];
  const gap = 3 * 96 / 25.4;
  function addPage() {
    if (pages.length >= 60) throw new Error("This character exceeds 60 pages.");
    const page = template.cloneNode(true) as HTMLElement;
    page.querySelector(".sheet-header")?.remove();
    page.classList.add("secondary-page");
    page.querySelector(".sheet-panels")!.replaceChildren();
    root!.append(page);
    pages.push(page);
    occupied.push([]);
    return pages.length-1;
  }
  function measure(box: HTMLElement, pageIndex: number, span: number) {
    const area = pages[pageIndex].querySelector<HTMLElement>(".sheet-panels")!;
    const columnWidth = (area.clientWidth - 2*gap)/3;
    box.style.width = `${columnWidth*span + gap*(span-1)}px`;
    box.style.position = "absolute";
    if (box.classList.contains("layout-group")) for (const child of Array.from(box.children) as HTMLElement[]) {child.style.position="relative";child.style.width="100%";}
    area.append(box);
    const height = box.getBoundingClientRect().height;
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
      box.style.left = `${left}px`;
      box.style.top = `${top}px`;
      box.dataset.actualWidth = String(span);
      occupied[pageIndex].push({left,top,width,height});
      return true;
    }
    box.remove();
    return false;
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
  // Preserve all main-page content first, then place larger secondary boxes
  // before small ones so narrow boxes can fill the remaining gaps.
  const secondary = [...overflow,...source.filter(box => box.dataset.placement === "secondary")].map((box,index) => {
    const {width,height} = measure(box,0,Number(box.dataset.width));
    box.remove();
    return {box,index,area:width*height};
  }).sort((a,b)=>Number(b.box.dataset.priority)-Number(a.box.dataset.priority) || (strategy===2 ? a.area-b.area : b.area-a.area) || a.index-b.index);
  for (const {box} of secondary) {
    let placed = false;
    for (let p=0;p<pages.length;p++) if (fit(box,p,true)) { placed=true; break; }
    if (!placed) {
      const next = addPage();
      // Widen secondary sheet boxes if necessary; cutout cards never widen.
      placed=fit(box,next,true);
      if (!placed) throw new Error(`The “${box.querySelector("h2")!.textContent}” box is larger than a full page. Shorten it or create separate boxes. Boxes are never split.`);
    }
  }
  const penalty=pages.slice(1).reduce((sum,page)=>sum+Array.from(page.querySelectorAll<HTMLElement>(".panel")).reduce((n,p)=>n+Number(p.dataset.priority),0),0);
  paginateCards(doc,root,pages);
  pages.forEach((page,i) => { page.querySelector("[data-page-number]")!.textContent = `${i+1} / ${pages.length}`; });
  return { html:"<!DOCTYPE html>\n"+doc.documentElement.outerHTML,pages:pages.length, penalty };
}

/** Bounded deterministic search: fewest pages, then keep higher-priority content first. */
export function paginateDocument(doc: Document): {html:string;pages:number} {
  const original=doc.body.innerHTML;
  let best: ReturnType<typeof arrange> | undefined;
  let failure: unknown;
  for(let strategy=0;strategy<3;strategy++) {
    doc.body.innerHTML=original;
    try {
      const result=arrange(doc,strategy);
      if(!best || result.pages<best.pages || (result.pages===best.pages && result.penalty<best.penalty)) best=result;
    } catch(error) {failure=error;}
  }
  if(!best) {doc.body.innerHTML=original;throw failure;}
  const parsed=new DOMParser().parseFromString(best.html,"text/html");
  doc.body.innerHTML=parsed.body.innerHTML;
  return {html:best.html,pages:best.pages};
}
