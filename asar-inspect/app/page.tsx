rid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  flex: 0 0 auto;
}

.entry-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.entry-field input[readonly] {
  background: #f7fbfc;
  color: var(--muted);
}

.entry-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  border-top: 1px solid var(--line);
  padding-top: 10px;
}

.entry-actions .button {
  min-width: 96px;
  padding: 9px 14px;
}

body:has(.page) {
  background: var(--bg);
}

.page > .panel:not(.compact-panel):not(.section):last-child {
  flex: 1 1 auto;
  overflow: hidden;
}

@keyframes slideUpPanel {
  from {
    opacity: 0;
    transform: translateX(18px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 520px) {
  .page {
    padding: 10px;
    gap: 10px;
  }

  .header {
    align-items: stretch;
    flex-direction: column;
    padding: 11px;
  }

  .header h1 {
    font-size: 18px;
  }

  .nav {
    justify-content: flex-start;
  }

  .grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .user-bar {
    min-height: 44px;
  }

  .entry-shell {
    padding: 10px;
  }

  .entry-card {
    gap: 9px;
    padding: 10px;
  }

  .entry-header h1 {
    font-size: 20px;
  }

  .entry-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .entry-actions {
    justify-content: space-between;
  }
}
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "업무보고 자동화",
  description: "일일 업무 입력을 일일보고와 주간보고 문서로 정리하는 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
"use client";

import Link from "next/link";
import { ClipboardList, FileDown, FileText, PenLine, ShieldCheck } from "lucide-react";
import { AuthGate, UserBar } from "@/components/AuthGate";

const workflowLinks = [
  {
    href: "/reports/new",
    title: "업무 입력",
    description: "당일 업무를 저장하고 금요일에는 차주 계획을 