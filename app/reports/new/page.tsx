"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function NewReportPage() {
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/daily-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
      });

      if (response.ok) {
        form.reset();
        setMessage("저장했습니다.");
        return;
      }

      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(result?.error ?? "저장에 실패했습니다. 입력 내용을 확인해 주세요.");
    } catch {
      setMessage("네트워크 오류로 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="page">
      <header className="header">
        <div>
          <p className="eyebrow">작성자 화면</p>
          <h1>오늘 업무 입력</h1>
        </div>
        <nav className="nav">
          <Link href="/">처음으로</Link>
        </nav>
      </header>

      <form className="panel" onSubmit={handleSubmit}>
        <div className="grid">
          <div className="field">
            <label htmlFor="userName">작성자</label>
            <input id="userName" name="userName" required maxLength={50} placeholder="홍길동" />
          </div>
          <div className="field">
            <label htmlFor="reportDate">작성일</label>
            <input
              id="reportDate"
              name="reportDate"
              required
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
        </div>

        <div className="grid">
          <div className="field">
            <label htmlFor="currentWeek">오늘 업무</label>
            <textarea
              id="currentWeek"
              name="currentWeek"
              required
              maxLength={5000}
              placeholder={"- YUSCON-IMS 장비 카탈로그 API 추가\n- 제품명 검색 기능 복구"}
            />
          </div>
          <div className="field">
            <label htmlFor="nextWeek">다음 주 예정 업무</label>
            <textarea
              id="nextWeek"
              name="nextWeek"
              maxLength={5000}
              placeholder={"- 장비 상세 화면 개선\n- 검색 조건 추가"}
            />
          </div>
        </div>

        {message ? <p className="form-message">{message}</p> : null}

        <div className="actions">
          <button className="button primary" disabled={isSaving} type="submit">
            {isSaving ? "저장 중" : "저장"}
          </button>
        </div>
      </form>
    </main>
  );
}
