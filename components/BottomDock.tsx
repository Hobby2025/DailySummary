"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, FileText, Home, PenLine, Tags, Workflow } from "lucide-react";
import { getCurrentUser } from "@/lib/authClient";
import { getPendingProjectAliasCount } from "@/lib/projectAliases";

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
  {
    href: "/project-aliases",
    label: "별칭",
    icon: Tags,
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
  const [pendingAliasCount, setPendingAliasCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function refreshState() {
      const user = await getCurrentUser();
      if (!mounted) return;

      setIsSuperAdmin(user?.role === "SUPERADMIN");
      setPendingAliasCount(user ? await getPendingProjectAliasCount() : 0);
    }

    refreshState()
      .catch(() => {
        if (mounted) {
          setIsSuperAdmin(false);
          setPendingAliasCount(0);
        }
      });

    window.addEventListener("project-aliases:changed", refreshState);

    return () => {
      mounted = false;
      window.removeEventListener("project-aliases:changed", refreshState);
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
            {item.href === "/project-aliases" && pendingAliasCount > 0 ? (
              <strong className="dock-badge" aria-label={`승인 대기 ${pendingAliasCount}건`}>
                {pendingAliasCount > 99 ? "99+" : pendingAliasCount}
              </strong>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
