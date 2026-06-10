"use client";

import { FormEvent, useState } from "react";
import { CalendarDays, Download, Loader2, Workflow } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { BottomDock } from "@/components/BottomDock";
import { apiRequest } from "@/lib/authClient";
import { addDays, getCurrentMondaySeoulDate } from "@/lib/reporting";

export default function WeeklyPage() {
  return (
    <AuthGate>
      {() => <WeeklyContent />}
    </AuthGate>
  );
}

function WeeklyContent() {
  const [baseMonday, setBaseMonday] = useState(() => getCurrentMondaySeoulDate());
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const lastWeekStart = addDays(baseMonday, -7);
  const lastWeekEnd = addDays(baseMonday, -1);
  const thisWeekEnd = addDays(baseMonday, 6);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsGenerating(true);
    setMessage("");

    try {
      const response = await apiRequest("/api/daily-summary/report-documents/weekly", {
        method: "POST",
        body: JSON.stringify({ baseMonday }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        setMessage(result?.error ?? "주간보고 문서를 생성하지 못했습니다.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `weekly-report-${lastWeekStart}_${lastWeekEnd}.docx`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage("주간보고 DOCX를 생성했습니다.");
    } catch {
      setMessage("네트워크 오류로 주간보고 문서를 생성하지 못했습니다.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="page">
      <header className="header">
        <div>
          <p className="eyebrow">
            <Workflow className="icon" aria-hidden="true" />
            관리자 화면
          </p>
          <h1>주간보고 DOCX 생성</h1>
        </div>
      </header>

      <form className="panel section" onSubmit={handleSubmit}>
        <div className="grid">
          <div className="field">
            <label htmlFor="baseMonday">
              <CalendarDays className="icon" aria-hidden="true" />
              이번 주 월요일
            </label>
            <input
              id="baseMonday"
              name="baseMonday"
              type="date"
              value={baseMonday}
              onChange={(event) => setBaseMonday(event.target.value)}
            />
          </div>
          <div className="field">
            <label>생성 범위</label>
            <p className="summary-text">
              지난주 업무: {lastWeekStart} ~ {lastWeekEnd}
              <br />
              이번 주 계획: {baseMonday} ~ {thisWeekEnd}
            </p>
          </div>
        </div>
        {message ? <p className="form-message">{message}</p> : null}
        <div className="actions">
          <button className="button primary" disabled={isGenerating} type="submit">
            {isGenerating ? (
              <>
                <Loader2 className="icon spin" aria-hidden="true" />
                생성 중
              </>
            ) : (
              <>
                <Download className="icon" aria-hidden="true" />
                DOCX 다운로드
              </>
            )}
          </button>
        </div>
      </form>
      <BottomDock />
    </main>
  );
}
