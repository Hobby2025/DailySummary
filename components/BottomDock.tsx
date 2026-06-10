"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Home, PenLine, Workflow } from "lucide-react";

const dockItems = [
  {
    href: "/",
    label: "홈",
    icon: Home,
  },
  {
    href: "/reports/new",
    label: "업무 입력",
    icon: PenLine,
  },
  {
    href: "/daily",
    label: "일일보고",
    icon: FileText,
  },
  {
    href: "/weekly",
    label: "주간보고",
    icon: Workflow,
  },
];

export function BottomDock() {
  const pathname = usePathname();

  return (
    <nav className="bottom-dock" aria-label="주요 화면 이동">
      {dockItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={isActive ? "active" : undefined}
            href={item.href}
            key={item.href}
          >
            <Icon className="icon" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
