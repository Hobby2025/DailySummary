"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, FileText, Home, PenLine, Workflow } from "lucide-react";
import { getCurrentUser } from "@/lib/authClient";

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

const superAdminDockItems = [
  {
    href: "/model-health",
    label: "Ping",
    icon: Activity,
  },
];

export function BottomDock() {
  const pathname = usePathname();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    getCurrentUser()
      .then((user) => {
        if (mounted) {
          setIsSuperAdmin(user?.role === "SUPERADMIN");
        }
      })
      .catch(() => {
        if (mounted) {
          setIsSuperAdmin(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const visibleItems = isSuperAdmin ? [...dockItems, ...superAdminDockItems] : dockItems;

  return (
    <nav className="bottom-dock" aria-label="주요 화면 이동">
      {visibleItems.map((item) => {
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
