"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Loader2, LockKeyhole, LogIn, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { AuthUser, getCurrentUser, isManagerRole, login, logout } from "@/lib/authClient";

type AuthGateProps = {
  children: (user: AuthUser, onLogout: () => Promise<void>) => ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    getCurrentUser()
      .then((currentUser) => {
        if (!mounted || !currentUser) return;
        if (isManagerRole(currentUser.role)) {
          setUser(currentUser);
        } else {
          setMessage("관리자 이상 권한이 있는 계정만 사용할 수 있습니다.");
        }
      })
      .catch(() => {
        if (mounted) {
          setMessage("");
        }
      })
      .finally(() => {
        if (mounted) setIsChecking(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const loggedInUser = await login(email, password);
      if (!isManagerRole(loggedInUser.role)) {
        await logout();
        setUser(null);
        setMessage("관리자 이상 권한이 있는 계정만 사용할 수 있습니다.");
        return;
      }
      setUser(loggedInUser);
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    setPassword("");
    setMessage("로그아웃했습니다.");
  }

  if (isChecking) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <p className="auth-status">
            <Loader2 className="icon spin" aria-hidden="true" />
            로그인 상태를 확인하고 있습니다.
          </p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="auth-shell">
        <form className="auth-card" onSubmit={handleLogin}>
          <header className="auth-header">
            <p className="eyebrow">
              <ShieldCheck className="icon" aria-hidden="true" />
              YUSCON_WEB 로그인
            </p>
            <h1>업무보고 자동화</h1>
          </header>
          <div className="field">
            <label htmlFor="email">
              <Mail className="icon" aria-hidden="true" />
              이메일
            </label>
            <input
              id="email"
              name="email"
              autoComplete="email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">
              <LockKeyhole className="icon" aria-hidden="true" />
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              autoComplete="current-password"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {message ? <p className="form-message error">{message}</p> : null}
          <div className="actions">
            <button className="button primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? (
                <>
                  <Loader2 className="icon spin" aria-hidden="true" />
                  로그인 중
                </>
              ) : (
                <>
                  <LogIn className="icon" aria-hidden="true" />
                  로그인
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    );
  }

  return children(user, handleLogout);
}

export function UserBar({ user, onLogout }: { user: AuthUser; onLogout: () => Promise<void> }) {
  return (
    <div className="user-bar">
      <div>
        <strong>
          <UserRound className="icon" aria-hidden="true" />
          {user.name}
        </strong>
        <span>{user.role}</span>
      </div>
      <button className="button" type="button" onClick={onLogout}>
        <LogOut className="icon" aria-hidden="true" />
        로그아웃
      </button>
    </div>
  );
}
