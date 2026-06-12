import { buildBackendUrl } from "@/lib/clientConfig";

export const MANAGER_ROLES = ["SUPERADMIN", "LICENSEMANAGER", "ADMIN"] as const;

export type ManagerRole = (typeof MANAGER_ROLES)[number];

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
  department?: string | null;
  position?: string | null;
};

type RequestOptions = RequestInit & {
  retryOnUnauthorized?: boolean;
};

type DesktopApiResponse = {
  ok: boolean;
  status: number;
  headers?: Record<string, string>;
  bodyBase64?: string;
  data?: unknown;
};

type DesktopBridge = {
  auth: {
    login: (email: string, password: string) => Promise<DesktopApiResponse>;
    me: () => Promise<DesktopApiResponse>;
    logout: () => Promise<DesktopApiResponse>;
  };
  api: {
    request: (payload: {
      path: string;
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    }) => Promise<DesktopApiResponse>;
  };
  settings?: {
    getStartup: () => Promise<DesktopApiResponse>;
    setStartup: (openAtLogin: boolean) => Promise<DesktopApiResponse>;
  };
  notifications?: {
    show: (payload: { title: string; body: string; path?: string }) => Promise<DesktopApiResponse>;
  };
};

declare global {
  interface Window {
    dailySummaryDesktop?: DesktopBridge;
  }
}

export function isManagerRole(role: string | undefined | null) {
  return MANAGER_ROLES.includes(role as ManagerRole);
}

export async function apiRequest(path: string, options: RequestOptions = {}) {
  if (isDesktopRuntime()) {
    const { retryOnUnauthorized: _retryOnUnauthorized, ...requestOptions } = options;
    return desktopApiRequest(path, requestOptions);
  }

  const { retryOnUnauthorized = true, ...requestOptions } = options;
  const response = await fetchWithCredentials(path, requestOptions);

  if (response.status !== 401 || !retryOnUnauthorized || path.includes("/auth/refresh")) {
    return response;
  }

  const refreshed = await refreshSession();
  if (!refreshed) {
    return response;
  }

  return fetchWithCredentials(path, requestOptions);
}

export async function getCurrentUser() {
  try {
    const desktop = getDesktopBridge();
    if (desktop) {
      const response = await desktop.auth.me();
      if (!response.ok) return null;
      return responseJson<AuthUser>(toFetchResponse(response));
    }

    const response = await apiRequest("/api/auth/me", { method: "GET", retryOnUnauthorized: false });
    if (response.status === 401) {
      const refreshed = await refreshSession();
      if (!refreshed) return null;
      const retried = await apiRequest("/api/auth/me", { method: "GET", retryOnUnauthorized: false });
      if (!retried.ok) return null;
      return (await retried.json()) as AuthUser;
    }
    if (!response.ok) return null;
    return (await response.json()) as AuthUser;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string) {
  const desktop = getDesktopBridge();
  if (desktop) {
    const response = await desktop.auth.login(email, password);
    const data = response.data as AuthUser | { message?: string; error?: string } | null;
    if (!response.ok || !data || !("id" in data)) {
      throw new Error(getErrorMessage(data, "로그인에 실패했습니다."));
    }
    return data;
  }

  const response = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    retryOnUnauthorized: false,
  });
  const data = (await response.json().catch(() => null)) as { user?: AuthUser; message?: string; error?: string } | null;
  if (!response.ok || !data?.user) {
    throw new Error(data?.message ?? data?.error ?? "로그인에 실패했습니다.");
  }
  return data.user;
}

export async function logout() {
  const desktop = getDesktopBridge();
  if (desktop) {
    await desktop.auth.logout().catch(() => null);
    return;
  }

  await apiRequest("/api/auth/logout", { method: "POST", retryOnUnauthorized: false }).catch(() => null);
}

export async function getStartupSetting() {
  const desktop = getDesktopBridge();
  if (!desktop?.settings) {
    return null;
  }

  const response = await desktop.settings.getStartup();
  const data = response.data as { openAtLogin?: unknown } | null;
  if (!response.ok || typeof data?.openAtLogin !== "boolean") {
    throw new Error("자동 시작 설정을 불러오지 못했습니다.");
  }

  return data.openAtLogin;
}

export async function setStartupSetting(openAtLogin: boolean) {
  const desktop = getDesktopBridge();
  if (!desktop?.settings) {
    return null;
  }

  const response = await desktop.settings.setStartup(openAtLogin);
  const data = response.data as { openAtLogin?: unknown } | null;
  if (!response.ok || typeof data?.openAtLogin !== "boolean") {
    throw new Error("자동 시작 설정을 저장하지 못했습니다.");
  }

  return data.openAtLogin;
}

export async function showDesktopNotification(payload: { title: string; body: string; path?: string }) {
  const desktop = getDesktopBridge();
  if (!desktop?.notifications) {
    return null;
  }

  const response = await desktop.notifications.show(payload);
  if (!response.ok) {
    throw new Error("데스크톱 알림을 표시하지 못했습니다.");
  }

  return true;
}

async function desktopApiRequest(path: string, options: RequestInit) {
  const desktop = getDesktopBridge();
  if (!desktop) {
    throw new Error("Electron API 브리지를 찾을 수 없습니다.");
  }

  if (typeof options.body !== "undefined" && typeof options.body !== "string") {
    throw new Error("Electron API 요청 본문은 문자열 JSON만 지원합니다.");
  }

  const response = await desktop.api.request({
    path,
    method: options.method,
    headers: normalizeHeaders(options.headers),
    body: options.body,
  });

  return toFetchResponse(response);
}

async function refreshSession() {
  const response = await fetch(buildBackendUrl("/api/auth/refresh"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  }).catch(() => null);
  return !!response?.ok;
}

function isDesktopRuntime() {
  return !!getDesktopBridge();
}

function getDesktopBridge() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.dailySummaryDesktop ?? null;
}

function toFetchResponse(response: DesktopApiResponse) {
  const headers = new Headers(response.headers);
  const body = response.bodyBase64 ? base64ToUint8Array(response.bodyBase64) : null;

  return new Response(body, {
    status: response.status,
    headers,
  });
}

async function responseJson<T>(response: Response) {
  return (await response.json()) as T;
}

function normalizeHeaders(headers: HeadersInit | undefined) {
  if (!headers) return undefined;
  return Object.fromEntries(new Headers(headers).entries());
}

function base64ToUint8Array(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function getErrorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") {
    return fallback;
  }

  const errorData = data as { message?: unknown; error?: unknown };
  if (typeof errorData.message === "string") {
    return errorData.message;
  }
  if (typeof errorData.error === "string") {
    return errorData.error;
  }

  return fallback;
}

async function fetchWithCredentials(path: string, options: RequestInit) {
  try {
    return await fetch(buildBackendUrl(path), {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new Error("YUSCON_WEB 백엔드에 연결할 수 없습니다. 백엔드 서버 실행 상태와 API 주소를 확인해 주세요.");
  }
}
