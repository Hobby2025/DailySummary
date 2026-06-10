"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock,
  Loader2,
  Save,
  UserRound,
} from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { BottomDock } from "@/components/BottomDock";
import { apiRequest } from "@/lib/authClient";
import { getTodaySeoulDate, isFridayDate } from "@/lib/reporting";

const MAX_TEXT_LENGTH = 5000;

export default function NewReportPage() {
  return (
    <AuthGate>
      {(user) => <NewReportForm userName={user.name} />}
    </AuthGate>
  );
}

function NewReportForm({
  userName,
}: {
  userName: string;
}) {
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [reportDate, setReportDate] = useState(() => getTodaySeoulDate());
  const [currentWeek, setCurrentWeek] = useState("");
  const [nextWeek, setNextWeek] = useState("");
  const canEnterNextWeek = useMemo(
    () => isFridayDate(reportDate),
    [reportDate],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (!canEnterNextWeek) {
      formData.delete("nextWeek");
    }

    try {
      const response = await apiRequest("/api/daily-summary/daily-reports", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(formData)),
      });

      if (response.ok) {
        form.reset();
        setCurrentWeek("");
        setNextWeek("");
        setReportDate(getTodaySeoulDate());
        setMessage("업무 내역을 저장했습니다.");
        return;
      }

      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setMessage(
        result?.error ?? "저장에 실패했습니다. 입력 내용을 확인해 주세요.",
      );
    } catch {
      setMessage(
        "네트워크 오류로 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const hasError = message.includes("실패") || message.includes("오류");

  return (
    <main className="entry-shell">
      <form className="entry-card slide-up-panel" onSubmit={handleSubmit}>
        <header className="entry-header">
          <div>
            <p className="entry-status">
              <Clock className="icon" aria-hidden="true" />
              17:30 ·{" "}
              {canEnterNextWeek ? "차주 계획도 함께 입력" : "오늘 업무 입력"}
            </p>
            <h1>{canEnterNextWeek ? "금요일 업무 정리" : "오늘 업무 정리"}</h1>
          </div>
        </header>

        <section className="entry-section">
          <label className="entry-label" htmlFor="currentWeek">
            당일 업무 내역
          </label>
          <div className="textarea-wrap">
            <textarea
              id="currentWeek"
              name="currentWeek"
              required
              maxLength={MAX_TEXT_LENGTH}
              value={currentWeek}
              onChange={(event) => setCurrentWeek(event.target.value)}
              placeholder={
                "오늘 진행한 업무를 간단히 요약해 주세요.\n예) 회의 내용, 완료 업무, 전달 사항 등"
              }
            />
            <span className="text-count">
              {currentWeek.length} / {MAX_TEXT_LENGTH}
            </span>
          </div>
        </section>

        {canEnterNextWeek ? (
          <section className="entry-section">
            <label className="entry-label" htmlFor="nextWeek">
              차주 계획
            </label>
            <div className="textarea-wrap">
              <textarea
                id="nextWeek"
                name="nextWeek"
                maxLength={MAX_TEXT_LENGTH}
                value={nextWeek}
                onChange={(event) => setNextWeek(event.target.value)}
                placeholder={
                  "다음 주 주요 계획과 우선순위를 입력해 주세요.\n예) 프로젝트 일정, 업무 목표, 협업 계획 등"
                }
              />
              <span className="text-count">
                {nextWeek.length} / {MAX_TEXT_LENGTH}
              </span>
            </div>
          </section>
        ) : (
          <p className="entry-note">
            금요일에는 차주 계획 입력란도 함께 표시합니다.
          </p>
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
            <input
              id="userName"
              name="userName"
              readOnly
              required
              maxLength={50}
              value={userName}
            />
          </div>
        </div>

        {message ? (
          <p className={hasError ? "entry-message error" : "entry-message"}>
            {message}
          </p>
        ) : null}

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
        </footer>
      </form>
      <BottomDock />
    </main>
  );
}
