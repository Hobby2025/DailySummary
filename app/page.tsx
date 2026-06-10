"use client";

import { useEffect, useState } from "react";
import { Power, ShieldCheck } from "lucide-react";
import { AuthGate, UserBar } from "@/components/AuthGate";
import { BottomDock } from "@/components/BottomDock";
import { getStartupSetting, setStartupSetting } from "@/lib/authClient";

export default function HomePage() {
  const [openAtLogin, setOpenAtLogin] = useState<boolean | null>(null);
  const [isSavingStartup, setIsSavingStartup] = useState(false);
  const [startupMessage, setStartupMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    getStartupSetting()
      .then((value) => {
        if (!mounted || value === null) return;
        setOpenAtLogin(value);
      })
      .catch(() => {
        if (mounted) {
          setStartupMessage("자동 시작 설정을 불러오지 못했습니다.");
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function handleStartupChange(nextValue: boolean) {
    setIsSavingStartup(true);
    setStartupMessage("");

    try {
      const savedValue = await setStartupSetting(nextValue);
      setOpenAtLogin(savedValue ?? nextValue);
    } catch (error) {
      setStartupMessage(
        error instanceof Error ? error.message : "자동 시작 설정을 저장하지 못했습니다.",
      );
    } finally {
      setIsSavingStartup(false);
    }
  }

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

          {openAtLogin !== null ? (
            <section className="settings-panel" aria-label="앱 설정">
              <div>
                <strong>
                  <Power className="icon" aria-hidden="true" />
                  윈도우 시작 시 자동 시작
                </strong>
                <small>PC 로그인 후 앱을 자동으로 실행합니다.</small>
                {startupMessage ? <p className="form-message error">{startupMessage}</p> : null}
              </div>
              <label className="toggle-switch">
                <input
                  checked={openAtLogin}
                  disabled={isSavingStartup}
                  type="checkbox"
                  onChange={(event) => handleStartupChange(event.target.checked)}
                />
                <span aria-hidden="true" />
              </label>
            </section>
          ) : null}
          <BottomDock />
        </main>
      )}
    </AuthGate>
  );
}
