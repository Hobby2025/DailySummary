"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, FolderPlus, Loader2, RefreshCw, Tags, X } from "lucide-react";
import { AuthGate, UserBar } from "@/components/AuthGate";
import { BottomDock } from "@/components/BottomDock";
import { apiRequest } from "@/lib/authClient";

type ProjectAlias = {
  id: string;
  projectId: string;
  aliasName: string;
  normalizedKey: string;
  status: "ACTIVE" | "PENDING" | "REJECTED" | string;
  source: string;
  confidence: number | null;
  reason: string | null;
  lastSeenAt: string | null;
};

type Project = {
  id: string;
  name: string;
  normalizedKey: string;
  status: "ACTIVE" | "PENDING" | "REJECTED" | string;
  source: string;
  isActive: boolean;
  aliases: ProjectAlias[];
};

type PendingAlias = ProjectAlias & {
  project: Project;
};

export default function ProjectAliasesPage() {
  return (
    <AuthGate>
      {(user, onLogout) => <ProjectAliasesContent user={user} onLogout={onLogout} />}
    </AuthGate>
  );
}

function ProjectAliasesContent({
  user,
  onLogout,
}: {
  user: Parameters<typeof UserBar>[0]["user"];
  onLogout: () => Promise<void>;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectByAlias, setSelectedProjectByAlias] = useState<Record<string, string>>({});
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectAliases, setNewProjectAliases] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === "ACTIVE" && project.isActive),
    [projects],
  );

  const pendingAliases = useMemo(
    () =>
      projects.flatMap((project) =>
        project.aliases
          .filter((alias) => alias.status === "PENDING")
          .map((alias) => ({ ...alias, project })),
      ),
    [projects],
  );

  const activeAliasCount = useMemo(
    () => projects.reduce((count, project) => count + project.aliases.filter((alias) => alias.status === "ACTIVE").length, 0),
    [projects],
  );

  useEffect(() => {
    void loadProjects();
  }, []);

  async function loadProjects() {
    setIsLoading(true);
    setMessage("");
    setErrorMessage("");

    try {
      const response = await apiRequest("/api/daily-summary/projects", { method: "GET" });
      const data = (await response.json().catch(() => null)) as Project[] | { error?: string } | null;

      if (!response.ok || !Array.isArray(data)) {
        setErrorMessage(!Array.isArray(data) ? data?.error ?? "프로젝트 별칭 목록을 불러오지 못했습니다." : "프로젝트 별칭 목록을 불러오지 못했습니다.");
        return;
      }

      setProjects(data);
      setSelectedProjectByAlias((current) => buildDefaultSelection(data, current));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "프로젝트 별칭 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function approveAlias(alias: PendingAlias) {
    setBusyId(alias.id);
    setMessage("");
    setErrorMessage("");

    const selectedProjectId = selectedProjectByAlias[alias.id];
    const body = selectedProjectId && selectedProjectId !== alias.projectId ? { projectId: selectedProjectId } : {};

    try {
      const response = await apiRequest(`/api/daily-summary/project-aliases/${alias.id}/approve`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setErrorMessage(result?.error ?? "별칭을 승인하지 못했습니다.");
        return;
      }

      setMessage("별칭을 승인했습니다.");
      await loadProjects();
      notifyAliasChanged();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "별칭을 승인하지 못했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  async function rejectAlias(alias: PendingAlias) {
    setBusyId(alias.id);
    setMessage("");
    setErrorMessage("");

    try {
      const response = await apiRequest(`/api/daily-summary/project-aliases/${alias.id}/reject`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setErrorMessage(result?.error ?? "별칭을 거절하지 못했습니다.");
        return;
      }

      setMessage("별칭을 거절했습니다.");
      await loadProjects();
      notifyAliasChanged();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "별칭을 거절하지 못했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setMessage("");
    setErrorMessage("");

    const aliases = newProjectAliases
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    try {
      const response = await apiRequest("/api/daily-summary/projects", {
        method: "POST",
        body: JSON.stringify({ name: newProjectName, aliases }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setErrorMessage(result?.error ?? "프로젝트를 추가하지 못했습니다.");
        return;
      }

      setNewProjectName("");
      setNewProjectAliases("");
      setMessage("프로젝트를 추가했습니다.");
      await loadProjects();
      notifyAliasChanged();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "프로젝트를 추가하지 못했습니다.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="page">
      <UserBar user={user} onLogout={onLogout} />
      <header className="header">
        <div>
          <p className="eyebrow">
            <Tags className="icon" aria-hidden="true" />
            프로젝트 정규화
          </p>
          <h1>프로젝트 별칭 승인</h1>
        </div>
        <button className="button" disabled={isLoading} type="button" onClick={loadProjects}>
          {isLoading ? <Loader2 className="icon spin" aria-hidden="true" /> : <RefreshCw className="icon" aria-hidden="true" />}
          새로고침
        </button>
      </header>

      <section className="alias-summary-grid">
        <SummaryItem label="승인 대기" value={String(pendingAliases.length)} />
        <SummaryItem label="활성 프로젝트" value={String(activeProjects.length)} />
        <SummaryItem label="활성 별칭" value={String(activeAliasCount)} />
      </section>

      {message ? <p className="form-message">{message}</p> : null}
      {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}

      <section className="alias-page-body">
        <div className="alias-list">
          {isLoading ? (
            <div className="panel alias-empty">
              <Loader2 className="icon spin" aria-hidden="true" />
              <span>목록을 불러오는 중입니다.</span>
            </div>
          ) : pendingAliases.length === 0 ? (
            <div className="panel alias-empty">
              <Check className="icon" aria-hidden="true" />
              <span>승인 대기 중인 별칭이 없습니다.</span>
            </div>
          ) : (
            pendingAliases.map((alias) => (
              <article className="panel alias-card" key={alias.id}>
                <div className="alias-card-main">
                  <div className="alias-title-row">
                    <strong>{alias.aliasName}</strong>
                    <StatusBadge status={alias.project.status === "PENDING" ? "신규 후보" : "별칭 후보"} />
                  </div>
                  <dl className="alias-meta">
                    <div>
                      <dt>정규화 키</dt>
                      <dd>{alias.normalizedKey}</dd>
                    </div>
                    <div>
                      <dt>추천 프로젝트</dt>
                      <dd>{alias.project.name}</dd>
                    </div>
                    <div>
                      <dt>신뢰도</dt>
                      <dd>{formatConfidence(alias.confidence)}</dd>
                    </div>
                    <div>
                      <dt>최근 발견</dt>
                      <dd>{formatDateTime(alias.lastSeenAt)}</dd>
                    </div>
                  </dl>
                  {alias.reason ? <p className="alias-reason">{alias.reason}</p> : null}
                </div>
                <div className="alias-actions">
                  <select
                    aria-label={`${alias.aliasName} 연결 프로젝트`}
                    value={selectedProjectByAlias[alias.id] ?? alias.projectId}
                    onChange={(event) =>
                      setSelectedProjectByAlias((current) => ({
                        ...current,
                        [alias.id]: event.target.value,
                      }))
                    }
                  >
                    {alias.project.status === "PENDING" ? (
                      <option value={alias.projectId}>신규 프로젝트로 등록</option>
                    ) : null}
                    {activeProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  <button className="button primary" disabled={!!busyId} type="button" onClick={() => approveAlias(alias)}>
                    {busyId === alias.id ? <Loader2 className="icon spin" aria-hidden="true" /> : <Check className="icon" aria-hidden="true" />}
                    승인
                  </button>
                  <button className="button danger" disabled={!!busyId} type="button" onClick={() => rejectAlias(alias)}>
                    <X className="icon" aria-hidden="true" />
                    거절
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <form className="panel alias-create-panel" onSubmit={createProject}>
          <p className="eyebrow">
            <FolderPlus className="icon" aria-hidden="true" />
            수동 등록
          </p>
          <div className="field">
            <label htmlFor="projectName">프로젝트명</label>
            <input
              id="projectName"
              name="projectName"
              maxLength={120}
              required
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="projectAliases">별칭</label>
            <input
              id="projectAliases"
              name="projectAliases"
              maxLength={1000}
              placeholder="쉼표로 구분"
              value={newProjectAliases}
              onChange={(event) => setNewProjectAliases(event.target.value)}
            />
          </div>
          <div className="actions">
            <button className="button primary" disabled={isCreating} type="submit">
              {isCreating ? <Loader2 className="icon spin" aria-hidden="true" /> : <FolderPlus className="icon" aria-hidden="true" />}
              추가
            </button>
          </div>
        </form>
      </section>
      <BottomDock />
    </main>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel alias-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className="status-badge">{status}</span>;
}

function buildDefaultSelection(projects: Project[], current: Record<string, string>) {
  const next = { ...current };

  for (const project of projects) {
    for (const alias of project.aliases) {
      if (alias.status === "PENDING" && !next[alias.id]) {
        next[alias.id] = project.id;
      }
    }
  }

  return next;
}

function formatConfidence(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `${Math.round(value * 100)}%`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("ko-KR");
}

function notifyAliasChanged() {
  window.dispatchEvent(new Event("project-aliases:changed"));
}
