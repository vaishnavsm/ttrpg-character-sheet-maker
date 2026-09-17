"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { examples } from "@/lib/sheet/examples";
import { parseCharacter, systemLabels } from "@/lib/sheet/schema";
import { renderCharacterDocument } from "@/lib/sheet/render";
import { paginateDocument } from "@/lib/sheet/paginate";

const initialSource = JSON.stringify(examples[0].character, null, 2);
const initialCharacter = parseCharacter(initialSource);
type RenderJob = { id: number; source: string; character: ReturnType<typeof parseCharacter>; html: string };
type RenderResult = { html: string; pages: number; source: string; name: string; paper: "a4" | "letter"; system: string };

function Icon({ name }: { name: "print" | "download" | "arrow" | "file" }) {
  const paths = {
    print: <><path d="M6 8V3h12v5M6 17H3V9h18v8h-3"/><path d="M6 14h12v7H6zM17 11h1"/></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    file: <><path d="M14 2H5v20h14V7zM14 2v6h5M8 12h8M8 16h8"/></>,
  };
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function Workshop({ siteUrl = "" }: { siteUrl?: string }) {
  const [source, setSource] = useState(initialSource);
  const [exampleId, setExampleId] = useState("2014");
  const [job, setJob] = useState<RenderJob | null>(() => ({ id: 0, source: initialSource, character: initialCharacter, html: renderCharacterDocument(initialCharacter, siteUrl) }));
  const [result, setResult] = useState<RenderResult | null>(null);
  const [error, setError] = useState("");
  const [scale, setScale] = useState(1);
  const [tab, setTab] = useState<"preview" | "html">("preview");
  const requestId = useRef(0);
  const processingDocuments = useRef(new WeakSet<Document>());
  const preview = useRef<HTMLIFrameElement>(null);
  const previewViewport = useRef<HTMLDivElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const stale = result !== null && source !== result.source;
  const pageWidth = result?.paper === "letter" ? 816 : 210 * 96 / 25.4;
  const pageHeight = result?.paper === "letter" ? 1056 : 297 * 96 / 25.4;
  const totalHeight = result ? result.pages * pageHeight + Math.max(0, result.pages - 1) * (7 * 96 / 25.4) : pageHeight;

  useEffect(() => {
    const viewport = previewViewport.current;
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, Math.max(.1, (entry.contentRect.width - 48) / pageWidth))));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [pageWidth]);

  function render(nextSource = source) {
    try {
      const character = parseCharacter(nextSource);
      const html = renderCharacterDocument(character, siteUrl);
      setError("");
      setJob({ id: ++requestId.current, source: nextSource, character, html });
    } catch (e) {
      requestId.current++;
      setJob(null);
      setError(e instanceof Error ? e.message : "Unable to render this character.");
    }
  }

  async function finishRender(frame: HTMLIFrameElement, currentJob: RenderJob) {
    try {
      const doc = frame.contentDocument;
      if (!doc) throw new Error("The print renderer could not be opened.");
      if (!doc.getElementById("sheets") || processingDocuments.current.has(doc)) return;
      processingDocuments.current.add(doc);
      await doc.fonts.ready;
      if (requestId.current !== currentJob.id) return;
      const rendered = paginateDocument(doc);
      setResult({ ...rendered, source: currentJob.source, name: currentJob.character.name || String(currentJob.character.identity.find(field => field.label === "Class & level")?.value ?? "Unnamed character"), paper: currentJob.character.paper, system: currentJob.character.systemName ?? systemLabels[currentJob.character.system] });
      setJob(null);
    } catch (e) {
      if (requestId.current !== currentJob.id) return;
      setError(e instanceof Error ? e.message : "The sheet could not be paginated.");
      setJob(null);
    }
  }

  function loadExample(id: string) {
    const sample = examples.find(example => example.id === id)!;
    const nextSource = JSON.stringify(sample.character, null, 2);
    setExampleId(id);
    setSource(nextSource);
    render(nextSource);
  }

  function format() {
    try { setSource(JSON.stringify(JSON.parse(source), null, 2)); setError(""); }
    catch { setError("Cannot format invalid JSON. Check commas, quotes, and brackets."); }
  }

  function download() {
    if (!result || stale || job) return;
    const url = URL.createObjectURL(new Blob([result.html], { type: "text/html;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${result.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "character"}-sheet.html`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function print() {
    if (!result || stale || job) return;
    setTab("preview");
    requestAnimationFrame(() => {
      preview.current?.contentWindow?.focus();
      preview.current?.contentWindow?.print();
    });
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand" href="/" aria-label="Folio home"><span className="brand-mark">f<span>✧</span></span><span>folio<span className="brand-period">.</span></span></Link>
        <span className="header-divider" />
        <span className="header-caption">THE CHARACTER SHEET WORKSHOP</span>
        <span className="build-tag"><span className="status-dot" /> Renderer playground <span className="version">v0.1</span></span>
      </header>

      <main>
        <div className="intro">
          <div><div className="overline">FROM SPECIFICATION TO ADVENTURE</div><h1>Your character, on paper.</h1><p>Paste a character’s JSON. Make a sheet worth bringing to the table.</p></div>
          <div className="intro-note"><span className="little-star">✧</span><span>Made for pencil marks,<br/>coffee rings, and critical hits.</span></div>
        </div>

        <div className="workbench">
          <section className="editor-panel" aria-labelledby="input-heading">
            <div className="panel-heading"><div><span className="step">01</span><h2 id="input-heading">Character specification</h2></div><span className="code-badge">JSON</span></div>
            <div className="example-control"><label htmlFor="example">Start with an example</label><select id="example" value={exampleId} onChange={e => loadExample(e.target.value)}>{examples.map(example => <option key={example.id} value={example.id}>{example.label}</option>)}</select></div>
            <div className="editor-toolbar"><span><span className="file-dot" /> character.json</span><button onClick={format} title="Format JSON with two-space indentation">Format JSON</button></div>
            <div className="code-editor">
              <div className="line-numbers" aria-hidden="true" ref={gutter}>{source.split("\n").map((_, i) => <div key={i}>{i + 1}</div>)}</div>
              <textarea id="character-json" aria-label="Character JSON" aria-describedby="editor-help" value={source} onChange={e => setSource(e.target.value)} onScroll={e => { if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop; }} spellCheck={false} autoCapitalize="off" autoCorrect="off" onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); render(); } }} />
            </div>
            {error && <div className="error-box" role="alert"><strong>Check your specification</strong><pre>{error}</pre>{result && <p>The preview still shows your last successful render.</p>}</div>}
            <div className="editor-bottom"><p id="editor-help">All numbers are yours. This renderer lays out the values you provide.</p><button className="primary-button" onClick={() => render()} disabled={Boolean(job)}>{job ? "Laying out pages…" : "Render character sheet"}<Icon name="arrow" /></button><span className="shortcut">⌘ / Ctrl + Enter to render</span></div>
          </section>

          <section className="preview-panel" aria-labelledby="preview-heading">
            <div className="panel-heading"><div><span className="step">02</span><h2 id="preview-heading">The character sheet</h2></div><div className="view-switch" aria-label="Output view"><button aria-pressed={tab === "preview"} onClick={() => setTab("preview")}>Preview</button><button aria-pressed={tab === "html"} onClick={() => setTab("html")}>HTML</button></div></div>
            <div className="preview-toolbar"><span className="paper-label"><Icon name="file" />{result ? `${result.paper === "a4" ? "A4" : "US Letter"} · Portrait · ${result.pages} ${result.pages === 1 ? "page" : "pages"}` : "Preparing preview…"}</span><div className="export-actions"><button onClick={download} disabled={!result || stale || Boolean(job)}><Icon name="download" /><span>HTML</span></button><button onClick={print} disabled={!result || stale || Boolean(job)}><Icon name="print" /><span>Print / PDF</span></button></div></div>
            <div className={`render-status${stale ? " is-stale" : ""}`} role="status"><span className="status-dot" />{job ? "Measuring content and laying out pages…" : stale ? "JSON changed. Render again to update your sheet." : result ? `${result.name} · Ready to print` : "Waiting for a valid character"}</div>
            <div className="preview-viewport" ref={previewViewport} style={{ display: tab === "preview" ? undefined : "none" }}>
              {result ? <div className="scaled-sheet" style={{ width: pageWidth * scale, height: totalHeight * scale }}><iframe ref={preview} title="Printable character sheet" srcDoc={result.html} sandbox="allow-same-origin allow-modals" style={{ width: pageWidth, height: totalHeight, transform: `scale(${scale})` }} /></div> : <div className="empty-preview">Your adventure starts here.</div>}
            </div>
            {tab === "html" && <div className="html-view"><div className="html-caption">Self-contained HTML · embedded styles and artwork · no scripts</div><pre aria-label="Generated HTML">{result?.html ?? "Render a character to see its HTML."}</pre></div>}
            <div className="preview-footer"><span>✧ &nbsp; Ink-friendly. Pencil-ready.</span><span>{Math.round(scale * 100)}% · Fit to width</span></div>
          </section>
        </div>

        <details className="schema-help"><summary><span>Working with the specification</span><span>Fields, paper sizes & custom systems <span aria-hidden="true">＋</span></span></summary><div className="help-grid"><div><h3>The essentials</h3><p>Required: <code>version: 1</code>, <code>name</code>, and <code>system</code>. Choose <code>dnd-5e-2014</code>, <code>dnd-5e-2024</code>, or <code>generic</code>. Set <code>paper</code> to <code>a4</code> or <code>letter</code>.</p></div><div><h3>Build your own system</h3><p>Use arbitrary labels in <code>attributes</code>, <code>defenses</code>, and <code>resources</code>. Add <code>sections</code> with a title, column, and named entries. The generic template makes no D&D assumptions. Try the Cards & blank boxes example to see both output styles together.</p></div><div><h3>Made to leave the screen</h3><p>Download the HTML to keep an offline copy. Use Print / PDF to print or save as PDF; turn off browser headers and footers. Whole boxes move onto additional pages; they never split. Set <code>presentation</code> to <code>card</code> for a cut-out. Card types share pages. Use <code>options</code> for alternate modes and <code>usage</code> for resource costs. Examples demonstrate layout, not complete rules-validated builds.</p></div></div></details>
      </main>
      <footer className="app-footer"><span>FOLIO / CHARACTER SHEET WORKSHOP</span><span>Rendered in your browser. Nothing is uploaded.</span></footer>
      {job && <iframe key={job.id} ref={frame => { if (frame?.contentDocument?.readyState === "complete") void finishRender(frame, job); }} className="measurement-frame" title="Sheet layout measurement" aria-hidden="true" tabIndex={-1} sandbox="allow-same-origin" srcDoc={job.html} onLoad={e => void finishRender(e.currentTarget, job)} />}
    </div>
  );
}
