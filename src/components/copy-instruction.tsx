"use client";

import { useState } from "react";

export function CopyInstruction({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="copy-box">
      <code>{text}</code>
      <button type="button" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
    </div>
  );
}
