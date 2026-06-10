Routes> = {
  default: React.ComponentType<LayoutProps<Route>> | ((props: LayoutProps<Route>) => React.ReactNode | Promise<React.ReactNode> | never | void | Promise<void>)
  generateStaticParams?: (props: { params: ParamMap[Route] }) => Promise<any[]> | any[]
  generateMetadata?: (
    props: { params: Promise<ParamMap[Route]> } & any,
    parent: ResolvingMetadata
  ) => Promise<any> | any
  generateViewport?: (
    props: { params: Promise<ParamMap[Route]> } & any,
    parent: ResolvingViewport
  ) => Promise<any> | any
  metadata?: any
  viewport?: any
}


// Validate ../../app/daily/page.tsx
{
  type __IsExpected<Specific extends AppPageConfig<"/daily">> = Specific
  const handler = {} as typeof import("../../app/daily/page.js")
  type __Check = __IsExpected<typeof handler>
  // @ts-ignore
  type __Unused = __Check
}

// Validate ../../app/page.tsx
{
  type __IsExpected<Specific extends AppPageConfig<"/">> = Specific
  const handler = {} as typeof import("../../app/page.js")
  type __Check = __IsExpected<typeof handler>
  // @ts-ignore
  type __Unused = __Check
}

// Validate ../../app/reports/new/page.tsx
{
  type __IsExpected<Specific extends AppPageConfig<"/reports/new">> = Specific
  const handler = {} as typeof import("../../app/reports/new/page.js")
  type __Check = __IsExpected<typeof handler>
  // @ts-ignore
  type __Unused = __Check
}

// Validate ../../app/weekly/page.tsx
{
  type __IsExpected<Specific extends AppPageConfig<"/weekly">> = Specific
  const handler = {} as typeof import("../../app/weekly/page.js")
  type __Check = __IsExpected<typeof handler>
  // @ts-ignore
  type __Unused = __Check
}







// Validate ../../app/layout.tsx
{
  type __IsExpected<Specific extends LayoutConfig<"/">> = Specific
  const handler = {} as typeof import("../../app/layout.js")
  type __Check = __IsExpected<typeof handler>
  // @ts-ignore
  type __Unused = __Check
}
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CalendarDays, FileText, Home, Loader2, PenLine, Send, Workflow } from "lucide-react";
import { AuthGate, UserBar } from "@/components/AuthGate";
import { CopyMarkdownButton } from "@/components/CopyMarkdownButton";
import { apiRequest } from "@/lib/authClient";
import { getYesterdaySeoulDate } from "@/lib/reporting";

export default function DailyReportPage() {
  return (
    <AuthGate>
      {(user, onLogout) => <DailyReportContent user={user} onLogout={onLogout} />}
    </AuthGate>
  );
}

function DailyReportContent({
  user,
  onLogout,
}: {
  user: Parameters<typeof UserBar>[0]["user"];
  onLogout: () => Promise<void>;
}) {
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
      <UserBar user={user} onLogout={onLogout} />
      <header className="header">
        <div>
          <p className="eyebrow">
            <FileText className="icon" aria-hidden="true" />
            관리자 화면
          <