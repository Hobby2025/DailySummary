ders({ "content-type": "application/json" }),
    async arrayBuffer() {
      return body;
    },
  };
}

function buildBackendUrl(apiPath) {
  return `${BACKEND_API_BASE_URL}${apiPath.startsWith("/") ? apiPath : `/${apiPath}`}`;
}

function getTokenFilePath() {
  return path.join(app.getPath("userData"), "desktop-refresh-token.bin");
}

async function saveRefreshToken(value) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("이 PC에서 보안 저장소를 사용할 수 없어 로그인 상태를 저장할 수 없습니다.");
  }

  const encrypted = safeStorage.encryptString(value);
  await fs.writeFile(getTokenFilePath(), encrypted);
}

async function loadRefreshToken() {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      return null;
    }

    const encrypted = await fs.readFile(getTokenFilePath());
    return safeStorage.decryptString(encrypted);
  } catch {
    return null;
  }
}

async function clearRefreshToken() {
  try {
    await fs.unlink(getTokenFilePath());
  } catch {
    // 저장된 토큰이 없으면 삭제할 작업도 없다.
  }
}

function bufferToBase64(buffer) {
  return buffer.toString("base64");
}

function getAppIconPath() {
  if (IS_PACKAGED) {
    return path.join(process.resourcesPath, "build", "icon.ico");
  }

  return path.join(process.cwd(), "build", "icon.ico");
}

function getAppRootPath() {
  if (IS_PACKAGED) {
    return app.getAppPath();
  }

  return process.cwd();
}
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dailySummaryDesktop", {
  auth: {
    login: (email, password) => ipcRenderer.invoke("desktop-auth:login", { email, password }),
    me: () => ipcRenderer.invoke("desktop-auth:me"),
    logout: () => ipcRenderer.invoke("desktop-auth:logout"),
  },
  api: {
    request: (payload) => ipcRenderer.invoke("desktop-api:request", payload),
  },
});
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
    headers: { "Content-Type": "applica