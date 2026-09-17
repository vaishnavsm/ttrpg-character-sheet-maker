"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { renderCharacterJson } from "@/lib/sheet/service";
import { paginateDocument } from "@/lib/sheet/paginate";
import { starterProfileGroups, starterProfiles } from "@/lib/sheet/starter-profiles";

const initialSource = JSON.stringify(starterProfiles.generic, null, 2);

type RenderJob = { id: number; html: string };

export function Workshop({ siteUrl = "" }: { siteUrl?: string }) {
  const [source, setSource] = useState(initialSource);
  const [profile, setProfile] = useState("generic");
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [job, setJob] = useState<RenderJob | null>(() => ({
    id: 0,
    html: renderCharacterJson(initialSource, siteUrl).html,
  }));
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const processingDocuments = useRef(new WeakSet<Document>());

  function render(nextSource = source) {
    try {
      const rendered = renderCharacterJson(nextSource, siteUrl);
      setError("");
      setJob({ id: ++requestId.current, html: rendered.html });
    } catch (exception) {
      requestId.current += 1;
      setJob(null);
      setError(exception instanceof Error ? exception.message : "Unable to render this JSON.");
    }
  }

  async function finishRender(frame: HTMLIFrameElement, currentJob: RenderJob) {
    try {
      const document = frame.contentDocument;
      if (!document || !document.getElementById("sheets") || processingDocuments.current.has(document)) return;
      processingDocuments.current.add(document);
      await document.fonts.ready;
      if (requestId.current !== currentJob.id) return;
      setHtml(paginateDocument(document).html);
      setJob(null);
    } catch (exception) {
      if (requestId.current !== currentJob.id) return;
      setError(exception instanceof Error ? exception.message : "Unable to render this JSON.");
      setJob(null);
    }
  }

  return (
    <main className="builder">
      <section className="source-pane">
        <div className="builder-bar">
          <Link href="/">Back</Link>
          <button className="text-button" type="button" onClick={() => setShowCheatsheet(true)}>
            Cheatsheet / schema
          </button>
          <select
            aria-label="Starter profile"
            value={profile}
            onChange={(event) => {
              const nextProfile = event.target.value;
              const nextSource = JSON.stringify(starterProfiles[nextProfile], null, 2);
              setProfile(nextProfile);
              setSource(nextSource);
              render(nextSource);
            }}
          >
            {starterProfileGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.profiles.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </optgroup>
            ))}
          </select>
          <button type="button" onClick={() => render()} disabled={Boolean(job)}>
            {job ? "Rendering…" : "Render"}
          </button>
        </div>
        <textarea
          aria-label="Character JSON"
          value={source}
          onChange={(event) => {
            setSource(event.target.value);
          }}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              render();
            }
          }}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
        {error && <pre className="error-box" role="alert">{error}</pre>}
      </section>

      <section className="output-pane" aria-label="Rendered HTML">
        {html && <iframe title="Rendered character sheet" srcDoc={html} sandbox="allow-same-origin" />}
      </section>

      {job && (
        <iframe
          key={job.id}
          className="measurement-frame"
          title="Sheet layout measurement"
          aria-hidden="true"
          tabIndex={-1}
          sandbox="allow-same-origin"
          srcDoc={job.html}
          ref={(frame) => {
            if (frame?.contentDocument?.readyState === "complete") void finishRender(frame, job);
          }}
          onLoad={(event) => void finishRender(event.currentTarget, job)}
        />
      )}

      {showCheatsheet && (
        <div className="docs-backdrop" role="presentation" onMouseDown={() => setShowCheatsheet(false)}>
          <article
            className="docs-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="docs-title"
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") setShowCheatsheet(false);
            }}
          >
            <header className="docs-header">
              <h2 id="docs-title">Character JSON</h2>
              <button type="button" onClick={() => setShowCheatsheet(false)} aria-label="Close cheatsheet">Close</button>
            </header>

            <div className="docs-content">
              <p>Start with these three fields. Everything else is optional.</p>
              <pre>{`{
  "version": 1,
  "name": "",
  "system": "generic"
}`}</pre>

              <section>
                <h3>Document</h3>
                <dl className="field-list">
                  <div><dt><code>version</code></dt><dd>Always <code>1</code>.</dd></div>
                  <div><dt><code>name</code></dt><dd>Character name. May be blank.</dd></div>
                  <div><dt><code>system</code></dt><dd><code>generic</code>, <code>dnd-5e-2014</code>, or <code>dnd-5e-2024</code>.</dd></div>
                  <div><dt><code>systemName</code></dt><dd>Custom display name when using <code>generic</code>.</dd></div>
                  <div><dt><code>paper</code></dt><dd><code>a4</code> or <code>letter</code>. Defaults to <code>a4</code>.</dd></div>
                </dl>
              </section>

              <section>
                <h3>Identity and numbers</h3>
                <pre>{`"identity": [
  { "label": "Class & level", "value": "Fighter 3" }
],
"attributes": [
  { "label": "Strength", "value": 16, "modifier": "+3" }
],
"defenses": [
  { "label": "Armor class", "value": 17 }
],
"hitPoints": {
  "maximum": 24,
  "current": 19,
  "temporary": 0,
  "hitDice": "3d10"
}`}</pre>
                <p><code>identity</code> and <code>defenses</code> use label/value pairs. <code>attributes</code> can also include a modifier. Values may be text or numbers.</p>
              </section>

              <section>
                <h3>Checks</h3>
                <pre>{`"savingThrows": [
  { "name": "Strength", "bonus": "+5", "proficient": true }
],
"skills": [
  { "name": "Athletics", "bonus": "+5", "proficient": true }
]`}</pre>
                <p><code>proficient</code> defaults to <code>false</code>.</p>
              </section>

              <section>
                <h3>Resources and attacks</h3>
                <pre>{`"resources": [
  {
    "name": "Focus",
    "maximum": 3,
    "used": 1,
    "recovery": "Long rest",
    "display": "circles"
  }
],
"attacks": [
  {
    "name": "Longsword",
    "bonus": "+5",
    "damage": "1d8 + 3 slashing",
    "notes": "Versatile 1d10"
  }
]`}</pre>
                <p>Resource <code>display</code> can be <code>circles</code> or <code>pool</code>. <code>maximum</code> is 1–30.</p>
              </section>

              <section>
                <h3>Features and cards</h3>
                <pre>{`"features": [
  {
    "name": "Second Wind",
    "description": "Regain hit points.",
    "kind": "ability",
    "presentation": "list",
    "details": [
      { "label": "Use", "value": "Bonus action" }
    ],
    "usage": {
      "resource": "Second Wind",
      "amount": 1,
      "recovery": "Short or long rest"
    }
  }
]`}</pre>
                <p><code>presentation</code> is <code>list</code> or <code>card</code>. Add <code>blankLines</code> for writing space. Entries can also contain <code>options</code>; use <code>optionLayout</code> with <code>stacked</code>, <code>compact</code>, or <code>cards</code>.</p>
              </section>

              <section>
                <h3>Spellcasting</h3>
                <pre>{`"spellcasting": {
  "ability": "Intelligence",
  "saveDC": 13,
  "attackBonus": "+5",
  "slots": [
    { "level": "1st", "total": 2 }
  ],
  "spells": [
    { "name": "Magic Missile", "level": "1st", "description": "" }
  ]
}`}</pre>
                <p>Spells accept the same entry fields as features.</p>
              </section>

              <section>
                <h3>Equipment, personality, and notes</h3>
                <pre>{`"equipment": ["Backpack", "Rope", "Lantern"],
"proficiencies": ["Light armor", "Common", "Elvish"],
"personality": [
  { "label": "Ideal", "text": "", "blankLines": 4 }
],
"notes": "Free-form notes",
"notesBlankLines": 6`}</pre>
                <p>Empty personality boxes and notes are omitted unless you provide text or positive blank-line counts.</p>
              </section>

              <section>
                <h3>Custom sections</h3>
                <pre>{`"sections": [
  {
    "title": "Inventory",
    "entries": [
      { "name": "Supplies", "description": "Rope and rations" }
    ],
    "blankLines": 4,
    "width": 2,
    "allowedWidths": [1, 2],
    "placement": "secondary",
    "priority": 40,
    "group": "travel"
  }
]`}</pre>
                <dl className="field-list compact">
                  <div><dt><code>width</code></dt><dd><code>1</code>, <code>2</code>, or <code>3</code> columns.</dd></div>
                  <div><dt><code>placement</code></dt><dd><code>main</code> or <code>secondary</code>.</dd></div>
                  <div><dt><code>priority</code></dt><dd>Higher numbers are placed first.</dd></div>
                  <div><dt><code>group</code></dt><dd>Keeps related sections together.</dd></div>
                  <div><dt><code>column</code></dt><dd>Preferred <code>left</code>, <code>middle</code>, or <code>right</code> column.</dd></div>
                </dl>
              </section>
            </div>
          </article>
        </div>
      )}
    </main>
  );
}
