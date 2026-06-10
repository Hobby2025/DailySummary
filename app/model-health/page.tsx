"use client";

import { useState } from "react";
import { Activity, Loader2, ShieldAlert, ShieldCheck, Wifi } from "lucide-react";
import { AuthGate, UserBar } from "@/components/AuthGate";
import { BottomDock } from "@/components/BottomDock";
import { apiRequest } from "@/lib/authClient";

type ModelHealth = {
  enabled: boolean;
  endpoint: string;
  endpointHttps: boolean;
  tokenConfigured: boolean;
  model: string;
  reachable: boolean;
  status: number | null;
  reason: string | null;
  inferenceChecked: boolean;
  inferenceOk: boolean;
  inferenceReason: string | null;
  checkedAt: string;
};

export default function ModelHealthPage() {
  return (
    <AuthGate>
      {(user, onLogout) => {
        if (user.role !== "SUPERADMIN") {
          return (
            <main className="page">
              <UserBar user={user} onLogout={onLogout} />
              <section className="panel section">
                <p className="form-message error">
                  SUPERADMIN 권한이 있는 계정만 사용할 수 있습니다.
                </p>
              </section>
              <BottomDock />
            </main>
          );
        }

        return <ModelHealthContent onLogout={onLogout} user={user} />;
      }}
    </AuthGate>
  );
}

function ModelHealthContent({
  user,
  onLogout,
}: {
  user: Parameters<typeof UserBar>[0]["user"];
  onLogout: () => Promise<void>;
}) {
  const [health, setHealth] = useState<ModelHealth | null>(null);
  const [message, setMessage] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  async function handlePing() {
    setIsChecking(true);
    setMessage("");

    try {
      const response = await apiRequest("/api/daily-summary/model-health", {
        method: "GET",
      });
      const result = (await response.json().catch(() => null)) as
        | ModelHealth
        | { error?: string }
        | null;

      if (!response.ok || !result || isErrorResponse(result)) {
        setMessage(isErrorResponse(result) ? result.error ?? "Ping 테스트에 실패했습니다." : "Ping 테스트에 실패했습니다.");
        setHealth(null);
        return;
      }

      setHealth(result);
      setMessage(result.inferenceOk ? "모델 연결이 정상입니다." : "모델 연결 상태를 확인해 주세요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ping 테스트에 실패했습니다.");
      setHealth(null);
    } finally {
      setIsChecking(false);
    }
  }

  const isHealthy = !!health?.reachable && !!health?.inferenceOk;

  return (
    <main className="page">
      <UserBar user={user} onLogout={onLogout} />
      <header className="header">
        <div>
          <p className="eyebrow">
            <Activity className="icon" aria-hidden="true" />
            GitHub Models
          </p>
          <h1>Ping 테스트</h1>
        </div>
      </header>

      <section className="panel section">
        <div className="actions">
          <button className="button primary" disabled={isChecking} type="button" onClick={handlePing}>
            {isChecking ? (
              <>
                <Loader2 className="icon spin" aria-hidden="true" />
                확인 중
              </>
            ) : (
              <>
                <Wifi className="icon" aria-hidden="true" />
                Ping 테스트
              </>
            )}
          </button>
        </div>
        {message ? <p className={isHealthy ? "form-message" : "form-message error"}>{message}</p> : null}
      </section>

      {health ? (
        <section className="panel health-panel">
          <div className="health-summary">
            <strong>
              {isHealthy ? (
                <ShieldCheck className="icon" aria-hidden="true" />
              ) : (
                <ShieldAlert className="icon" aria-hidden="true" />
              )}
              {isHealthy ? "정상" : "확인 필요"}
            </strong>
            <span>{new Date(health.checkedAt).toLocaleString("ko-KR")}</span>
          </div>
          <dl className="health-grid">
            <HealthItem label="기능 상태" value={health.enabled ? "활성" : "비활성"} />
            <HealthItem label="모델" value={health.model} />
            <HealthItem label="토큰" value={health.tokenConfigured ? "설정됨" : "없음"} />
            <HealthItem label="HTTPS" value={health.endpointHttps ? "정상" : "오류"} />
            <HealthItem label="네트워크" value={health.reachable ? "도달" : "실패"} />
            <HealthItem label="HTTP 상태" value={health.status === null ? "-" : String(health.status)} />
            <HealthItem label="네트워크 사유" value={health.reason ?? "-"} />
            <HealthItem label="Inference" value={health.inferenceOk ? "성공" : "실패"} />
            <HealthItem label="Inference 사유" value={health.inferenceReason ?? "-"} />
            <HealthItem label="Endpoint" value={health.endpoint} />
          </dl>
        </section>
      ) : null}
      <BottomDock />
    </main>
  );
}

function HealthItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function isErrorResponse(value: ModelHealth | { error?: string } | null): value is { error?: string } {
  return !!value && "error" in value;
}
