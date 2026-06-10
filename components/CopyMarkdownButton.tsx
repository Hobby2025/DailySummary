"use client";

import { useState } from "react";
import { Check, ClipboardCopy, TriangleAlert } from "lucide-react";

export function CopyMarkdownButton({
  markdown,
  disabled = false,
}: {
  markdown: string;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
      setFailed(true);
      window.setTimeout(() => setFailed(false), 2500);
    }
  }

  return (
    <button className="button primary" disabled={disabled || !markdown} type="button" onClick={handleCopy}>
      {failed ? (
        <TriangleAlert className="icon" aria-hidden="true" />
      ) : copied ? (
        <Check className="icon" aria-hidden="true" />
      ) : (
        <ClipboardCopy className="icon" aria-hidden="true" />
      )}
      {failed ? "복사 실패" : copied ? "복사 완료" : "Markdown 복사"}
    </button>
  );
}
