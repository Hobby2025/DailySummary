"use client";

import { FormEvent, useState } from "react";
import { CalendarDays, FileText, Loader2, Send } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { BottomDock } from "@/components/BottomDock";
import { CopyMarkdownButton } from "@/components/CopyMarkdownButton";
import { apiRequest } from "@/lib/authClient";
import { getYesterdaySeoulDate } from "@/lib/reporting";

export default function DailyReportPage() {
  return (
    <AuthGate>
      {() => <DailyReportContent />}
    </AuthGate>
  );
}

function DailyReportContent() {
  const [targetDate, setTargetDate] = useState(() => getYesterdaySeoulDate());
  const [markdown, setMarkdown] = useState("");
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsGenerating(true);
    setMessage("");

    try {
      const response = await apiRequest("/api/daily-summary/report-documents/daily", {
        method: "POST",
        body: JSON.stringify({ targetDate }),
      });
      const result = (await response.json().catch(() => null)) as
        | { markdown?: string; error?: string }
        | null;

      if (!response.ok || !result?.markdown) {
        setMessage(result?.error ?? "일일보고 문서를 생성하지 못했습니다.");
        return;
      }

      setMarkdown(result.markdown);
      setMessage("일일보고 Markdown을 생성했습니다.");
    } catch {
      setMessage("네트워크 오류로 일일보고 문서를 생성하지 못했습니다.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="page">
      <header className="header">
        <div>
          <p className="eyebrow">
            <FileText className="icon" aria-hidden="true" />
            관리자 화면
          </p>
          <h1>일일보고 생성</h1>
        </div>
      </header>

      <form className="panel section" onSubmit={handleSubmit}>
        <div className="grid">
          <div className="field">
            <label htmlFor="targetDate">
              <CalendarDays className="icon" aria-hidden="true" />
              대상일
            </label>
            <input
              id="targetDate"
              name="targetDate"
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
            />
          </div>
          <div className="actions">
            <button className="button primary" disabled={isGenerating} type="submit">
              {isGenerating ? (
                <>
                  <Loader2 className="icon spin" aria-hidden="true" />
                  생성 중
                </>
              ) : (
                <>
                  <Send className="icon" aria-hidden="true" />
                  일일보고 생성
                </>
              )}
            </button>
            <CopyMarkdownButton markdown={markdown} disabled={!markdown} />
          </div>
        </div>
        {message ? <p className="form-message">{message}</p> : null}
      </form>

      {markdown ? (
        <section className="panel">
          <pre className="markdown-preview">{markdown}</pre>
        </section>
      ) : null}
      <BottomDock />
    </main>
  );
}
