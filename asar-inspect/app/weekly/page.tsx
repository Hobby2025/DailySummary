등"}
              />
              <span className="text-count">
                {nextWeek.length} / {MAX_TEXT_LENGTH}
              </span>
            </div>
          </section>
        ) : (
          <p className="entry-note">금요일에는 차주 계획 입력란도 함께 표시합니다.</p>
        )}

        <div className="entry-grid">
          <div className="entry-field">
            <label htmlFor="reportDate">
              <CalendarDays className="icon" aria-hidden="true" />
              날짜
            </label>
            <input
              id="reportDate"
              name="reportDate"
              required
              type="date"
              value={reportDate}
              onChange={(event) => setReportDate(event.target.value)}
            />
          </div>
          <div className="entry-field">
            <label htmlFor="userName">
              <UserRound className="icon" aria-hidden="true" />
              작성자
            </label>
            <input id="userName" name="userName" readOnly required maxLength={50} value={userName} />
          </div>
        </div>

        {message ? <p className={hasError ? "entry-message error" : "entry-message"}>{message}</p> : null}

        <footer className="entry-actions">
          <button className="button primary" disabled={isSaving} type="submit">
            {isSaving ? (
              <>
                <Loader2 className="icon spin" aria-hidden="true" />
                저장 중
              </>
            ) : (
              <>
                <Save className="icon" aria-hidden="true" />
                저장
              </>
            )}
          </button>
          <Link className="entry-secondary" href="/">
            <CheckCircle2 className="icon" aria-hidden="true" />
            나중에
          </Link>
        </footer>
      </form>
    </main>
  );
}
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CalendarDays, Download, FileText, Home, Loader2, PenLine, Workflow } from "lucide-react";
import { AuthGate, UserBar } from "@/components/AuthGate";
import { apiRequest } from "@/lib/authClient";
import { addDays, getCurrentMondaySeoulDate } from "@/lib/reporting";

export default function WeeklyPage() {
  return (
    <AuthGate>
      {(user, onLogout) => <WeeklyContent user={user} onLogout={onLogout} />}
    </AuthGate>
  );
}

function WeeklyContent({
  user,
  onLogout,
}: {
  user: Parameters<typeof UserBar>[0]["user"];
  onLogout: () => Promise<void>;
}) {
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
      <UserBar user={user} onLogout={onLogout} />
      <header className="header">
        <div>
          <p className="eyebrow">
            <Workflow className="icon" aria-hidden="true" />
            관리자 화면
          </p>
          <h1>주간보고 DOCX 생성</h1>
       