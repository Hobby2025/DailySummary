함께 입력합니다.",
    icon: PenLine,
  },
  {
    href: "/daily",
    title: "일일보고 생성",
    description: "전날 업무를 정리해 일일보고 Markdown을 생성합니다.",
    icon: FileText,
  },
  {
    href: "/weekly",
    title: "주간보고 생성",
    description: "지난주 업무와 이번 주 계획을 Word 형식 DOCX로 생성합니다.",
    icon: FileDown,
  },
];

export default function HomePage() {
  return (
    <AuthGate>
      {(user, onLogout) => (
        <main className="page">
          <UserBar user={user} onLogout={onLogout} />
          <header className="header">
            <div>
              <p className="eyebrow">
                <ShieldCheck className="icon" aria-hidden="true" />
                업무보고 자동화
              </p>
              <h1>업무 내역 입력과 보고서 생성</h1>
            </div>
          </header>

          <section className="workflow-grid">
            {workflowLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link className="workflow-card" href={item.href} key={item.href}>
                  <span className="workflow-icon">
                    <Icon className="icon large" aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                  </span>
                </Link>
              );
            })}
          </section>

          <section className="panel compact-panel">
            <p className="summary-text">
              <ClipboardList className="icon" aria-hidden="true" />
              관리자 권한 계정으로 로그인한 뒤 업무 입력, 일일보고, 주간보고를 바로 실행합니다.
            </p>
          </section>
        </main>
      )}
    </AuthGate>
  );
}
"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock, Home, Loader2, Save, UserRound } from "lucide-react";
import { AuthGate, UserBar } from "@/components/AuthGate";
import { apiRequest } from "@/lib/authClient";
import { getTodaySeoulDate, isFridayDate } from "@/lib/reporting";

const MAX_TEXT_LENGTH = 5000;

export default function NewReportPage() {
  return (
    <AuthGate>
      {(user, onLogout) => <NewReportForm userName={user.name} onLogout={onLogout} user={user} />}
    </AuthGate>
  );
}

function NewReportForm({
  user,
  userName,
  onLogout,
}: {
  user: Parameters<typeof UserBar>[0]["user"];
  userName: string;
  onLogout: () => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [reportDate, setReportDate] = useState(() => getTodaySeoulDate());
  const [currentWeek, setCurrentWeek] = useState("");
  const [nextWeek, setNextWeek] = useState("");
  const canEnterNextWeek = useMemo(() => isFridayDate(reportDate), [reportDate]);

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

      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(result?.error ?? "저장에 실패했습니다. 입력 내용을 확인해 주세요.");
    } catch {
      setMessage("네트워크 오류로 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
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
              17:30 · {canEnterNextWeek ? "차주 계획도 함께 입력" : "오늘 업무 입력"}
            </p>
            <h1>{canEnterNextWeek ? "금요일 업무 정리" : "오늘 업무 정리"}</h1>
          </div>
          <Link className="entry-link" href="/">
            <Home className="icon" aria-hidden="true" />
            관리
          </Link>
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
              placeholder={"오늘 진행한 업무를 간단히 요약해 주세요.\n예) 회의 내용, 완료 업무, 전달 사항 등"}
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
                placeholder={"다음 주 주요 계획과 우선순위를 입력해 주세요.\n예) 프로젝트 일정, 업무 목표, 협업 계획 