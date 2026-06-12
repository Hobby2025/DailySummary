const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  nativeImage,
  Notification,
  screen,
  ipcMain,
  safeStorage,
  dialog,
} = require("electron");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const net = require("node:net");

const IS_PACKAGED = app.isPackaged;
const PORT = Number(process.env.DESKTOP_APP_PORT ?? 3210);
const DEV_SERVER_URL = IS_PACKAGED ? null : process.env.NEXT_DEV_SERVER_URL;
const APP_URL = DEV_SERVER_URL ?? `http://127.0.0.1:${PORT}`;
const MAIN_URL = `${APP_URL}/`;
const REPORT_ENTRY_URL = `${APP_URL}/reports/new`;
const BACKEND_API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ?? "https://terra-survey.com";
const POPUP_HOUR = 17;
const POPUP_MINUTE = 30;
const WINDOW_WIDTH = 520;
const WINDOW_HEIGHT = 720;
const WINDOW_MARGIN = 18;
const DESKTOP_SETTINGS_FILE = "desktop-settings.json";
const APP_NAME = "업무보고 자동화";

let mainWindow = null;
let tray = null;
let nextServer = null;
let lastPopupDate = "";
let popupAnimationTimer = null;
let accessToken = null;
let refreshToken = null;
let refreshPromise = null;

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
}

app.setName(APP_NAME);
app.setAppUserModelId("com.yusco.daily-summary");

app.on("second-instance", () => {
  showPopupWindow();
});

app.whenReady()
  .then(async () => {
    Menu.setApplicationMenu(null);
    registerIpcHandlers();
    await ensureDefaultStartupSetting();
    await ensureNextServer();
    createTray();
    showPopupWindow();
    scheduleDailyPopup();
  })
  .catch((error) => {
    dialog.showErrorBox(
      `${APP_NAME} 시작 실패`,
      error instanceof Error ? error.message : "앱을 시작하지 못했습니다.",
    );
    app.quit();
  });

app.on("window-all-closed", (event) => {
  event.preventDefault();
});

app.on("before-quit", () => {
  if (popupAnimationTimer) {
    clearInterval(popupAnimationTimer);
  }

  if (nextServer) {
    nextServer.close();
  }
});

function createMainWindow(initialUrl = MAIN_URL) {
  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: 400,
    minHeight: 520,
    resizable: false,
    maximizable: false,
    movable: false,
    show: false,
    title: APP_NAME,
    icon: getAppIconPath(),
    backgroundColor: "#f4f6f8",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadURL(initialUrl);
  mainWindow.setMovable(false);
  mainWindow.setResizable(false);
  mainWindow.setIcon(getAppIconPath());

  mainWindow.on("close", (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(getAppIconPath());
  tray = new Tray(icon);
  tray.setToolTip(APP_NAME);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "열기",
        click: () => showPopupWindow(),
      },
      {
        label: "숨기기",
        click: () => mainWindow?.hide(),
      },
      { type: "separator" },
      {
        label: "종료",
        click: () => {
          app.isQuiting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on("click", () => showPopupWindow());
}

function showPopupWindow(targetUrl = MAIN_URL) {
  const nextUrl = typeof targetUrl === "string" ? targetUrl : MAIN_URL;

  if (!mainWindow) {
    createMainWindow(nextUrl);
  }

  if (!mainWindow) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.loadURL(nextUrl);
  showFixedWindowOnRight(mainWindow);
}

function showFixedWindowOnRight(window) {
  if (popupAnimationTimer) {
    clearInterval(popupAnimationTimer);
  }

  const display = screen.getPrimaryDisplay();
  const { x, y, width, height } = display.workArea;
  const windowWidth = Math.min(WINDOW_WIDTH, width - WINDOW_MARGIN * 2);
  const windowHeight = Math.min(WINDOW_HEIGHT, height - WINDOW_MARGIN * 2);
  const targetX = x + width - windowWidth - WINDOW_MARGIN;
  const targetY = y + height - windowHeight - WINDOW_MARGIN;
  const startX = x + width + WINDOW_MARGIN;
  const steps = 12;
  let currentStep = 0;

  window.setMovable(false);
  window.setBounds({ x: startX, y: targetY, width: windowWidth, height: windowHeight });
  window.show();
  window.focus();

  popupAnimationTimer = setInterval(() => {
    currentStep += 1;
    const progress = easeOutCubic(currentStep / steps);
    const nextX = Math.round(startX + (targetX - startX) * progress);

    window.setBounds({ x: nextX, y: targetY, width: windowWidth, height: windowHeight });

    if (currentStep >= steps) {
      clearInterval(popupAnimationTimer);
      popupAnimationTimer = null;
      window.setBounds({ x: targetX, y: targetY, width: windowWidth, height: windowHeight });
      window.setMovable(false);
    }
  }, 16);
}

function scheduleDailyPopup() {
  setInterval(() => {
    const now = new Date();
    const today = toDateKey(now);

    if (
      now.getHours() === POPUP_HOUR &&
      now.getMinutes() >= POPUP_MINUTE &&
      lastPopupDate !== today
    ) {
      lastPopupDate = today;
      showPopupWindow(REPORT_ENTRY_URL);
      if (Notification.isSupported()) {
        new Notification({
          title: "업무보고 입력 시간",
          body: "오늘 업무를 입력해 주세요. 금요일이면 차주 계획도 함께 정리합니다.",
          icon: getAppIconPath(),
        }).show();
      }
    }
  }, 30_000);
}

async function ensureNextServer() {
  if (DEV_SERVER_URL) {
    return waitForPort(Number(new URL(APP_URL).port || 3000));
  }

  if (await isPortOpen(PORT)) {
    return;
  }

  const next = require(path.join(getAppRootPath(), "node_modules", "next"));
  const nextApp = next({
    dev: false,
    dir: getAppRootPath(),
    hostname: "127.0.0.1",
    port: PORT,
  });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();
  nextServer = http.createServer((request, response) => {
    handle(request, response);
  });

  await new Promise((resolve, reject) => {
    nextServer.once("error", reject);
    nextServer.listen(PORT, "127.0.0.1", resolve);
  });
}

function waitForPort(port) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = setInterval(async () => {
      if (await isPortOpen(port)) {
        clearInterval(timer);
        resolve();
        return;
      }

      if (Date.now() - startedAt > 30_000) {
        clearInterval(timer);
        reject(new Error("Next 서버를 시작하지 못했습니다."));
      }
    }, 500);
  });
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port }, () => {
      socket.end();
      resolve(true);
    });

    socket.on("error", () => resolve(false));
    socket.setTimeout(500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

async function ensureDefaultStartupSetting() {
  const settings = await loadDesktopSettings();
  if (typeof settings.openAtLogin === "boolean") {
    setLoginItemOpenAtLogin(settings.openAtLogin);
    return;
  }

  setLoginItemOpenAtLogin(true);
  await saveDesktopSettings({ ...settings, openAtLogin: true });
}

function setLoginItemOpenAtLogin(openAtLogin) {
  app.setLoginItemSettings({
    openAtLogin,
    openAsHidden: false,
  });
}

function getDesktopSettingsPath() {
  return path.join(app.getPath("userData"), DESKTOP_SETTINGS_FILE);
}

async function loadDesktopSettings() {
  try {
    const rawSettings = await fs.readFile(getDesktopSettingsPath(), "utf8");
    const settings = JSON.parse(rawSettings);
    return settings && typeof settings === "object" ? settings : {};
  } catch {
    return {};
  }
}

async function saveDesktopSettings(settings) {
  await fs.writeFile(getDesktopSettingsPath(), JSON.stringify(settings, null, 2), "utf8");
}

function registerIpcHandlers() {
  ipcMain.handle("desktop-settings:getStartup", async () => {
    return {
      ok: true,
      status: 200,
      data: {
        openAtLogin: app.getLoginItemSettings().openAtLogin,
      },
    };
  });

  ipcMain.handle("desktop-settings:setStartup", async (_event, payload) => {
    const openAtLogin = payload?.openAtLogin === true;
    const settings = await loadDesktopSettings();
    setLoginItemOpenAtLogin(openAtLogin);
    await saveDesktopSettings({ ...settings, openAtLogin });

    return {
      ok: true,
      status: 200,
      data: {
        openAtLogin: app.getLoginItemSettings().openAtLogin,
      },
    };
  });

  ipcMain.handle("desktop-notifications:show", async (_event, payload) => {
    if (!Notification.isSupported()) {
      return {
        ok: false,
        status: 400,
        data: { message: "이 PC에서 알림을 지원하지 않습니다." },
      };
    }

    const title = typeof payload?.title === "string" && payload.title.trim()
      ? payload.title.trim().slice(0, 80)
      : APP_NAME;
    const body = typeof payload?.body === "string" ? payload.body.trim().slice(0, 200) : "";
    const path = typeof payload?.path === "string" && payload.path.startsWith("/")
      ? payload.path
      : null;

    const notification = new Notification({
      title,
      body,
      icon: getAppIconPath(),
    });

    if (path) {
      notification.on("click", () => showPopupWindow(`${APP_URL}${path}`));
    }

    notification.show();

    return {
      ok: true,
      status: 200,
      data: { shown: true },
    };
  });

  ipcMain.handle("desktop-auth:login", async (_event, payload) => {
    if (!safeStorage.isEncryptionAvailable()) {
      return {
        ok: false,
        status: 500,
        data: {
          message: "이 PC에서 보안 저장소를 사용할 수 없어 로그인 상태를 저장할 수 없습니다.",
        },
      };
    }

    const response = await backendJsonRequest("/api/auth/desktop/login", {
      method: "POST",
      body: JSON.stringify({
        email: payload?.email,
        password: payload?.password,
      }),
    });

    if (!response.ok) {
      return response;
    }

    accessToken = response.data.accessToken;
    refreshToken = response.data.refreshToken;
    try {
      await saveRefreshToken(refreshToken);
    } catch (error) {
      await backendJsonRequest("/api/auth/desktop/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }).catch(() => null);
      accessToken = null;
      refreshToken = null;
      return {
        ok: false,
        status: 500,
        data: {
          message:
            error instanceof Error
              ? error.message
              : "로그인 상태를 저장할 수 없습니다.",
        },
      };
    }

    return {
      ok: true,
      status: 200,
      data: response.data.user,
    };
  });

  ipcMain.handle("desktop-auth:me", async () => {
    const response = await authenticatedBackendRequest("/api/auth/me", {
      method: "GET",
    });

    return normalizeApiResponse(response);
  });

  ipcMain.handle("desktop-auth:logout", async () => {
    await ensureRefreshTokenLoaded();
    await backendJsonRequest("/api/auth/desktop/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }).catch(() => null);

    accessToken = null;
    refreshToken = null;
    await clearRefreshToken();

    return { ok: true, status: 200, data: { success: true } };
  });

  ipcMain.handle("desktop-api:request", async (_event, payload) => {
    if (!payload?.path || typeof payload.path !== "string") {
      return {
        ok: false,
        status: 400,
        headers: { "content-type": "application/json" },
        bodyBase64: bufferToBase64(
          Buffer.from(JSON.stringify({ error: "API 경로가 올바르지 않습니다." })),
        ),
      };
    }

    if (!payload.path.startsWith("/api/")) {
      return {
        ok: false,
        status: 400,
        headers: { "content-type": "application/json" },
        bodyBase64: bufferToBase64(
          Buffer.from(JSON.stringify({ error: "허용되지 않은 API 경로입니다." })),
        ),
      };
    }

    const response = await authenticatedBackendRequest(payload.path, {
      method: payload.method ?? "GET",
      headers: payload.headers,
      body: payload.body,
    });

    return normalizeApiResponse(response);
  });
}

async function authenticatedBackendRequest(apiPath, options) {
  if (!accessToken) {
    const refreshed = await refreshDesktopSession();
    if (!refreshed) {
      return buildJsonLikeResponse(401, {
        error: "Unauthorized",
        message: "로그인이 필요합니다.",
      });
    }
  }

  let response = await rawBackendRequest(apiPath, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshDesktopSession();
  if (!refreshed) {
    return response;
  }

  response = await rawBackendRequest(apiPath, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response;
}

async function refreshDesktopSession() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = refreshDesktopSessionOnce().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function refreshDesktopSessionOnce() {
  await ensureRefreshTokenLoaded();
  if (!refreshToken) {
    return false;
  }

  const response = await backendJsonRequest("/api/auth/desktop/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  }).catch(() => null);

  if (!response?.ok) {
    if (!response || ![401, 403].includes(response.status)) {
      return false;
    }

    accessToken = null;
    refreshToken = null;
    await clearRefreshToken();
    return false;
  }

  accessToken = response.data.accessToken;
  refreshToken = response.data.refreshToken;
  await saveRefreshToken(refreshToken);
  return true;
}

async function ensureRefreshTokenLoaded() {
  if (refreshToken) {
    return;
  }

  refreshToken = await loadRefreshToken();
}

async function backendJsonRequest(apiPath, options) {
  const response = await rawBackendRequest(apiPath, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

async function rawBackendRequest(apiPath, options) {
  return fetch(buildBackendUrl(apiPath), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
}

async function normalizeApiResponse(response) {
  const buffer = Buffer.from(await response.arrayBuffer());
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    ok: response.ok,
    status: response.status,
    headers,
    bodyBase64: bufferToBase64(buffer),
  };
}

function buildJsonLikeResponse(status, data) {
  const body = Buffer.from(JSON.stringify(data));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": "application/json" }),
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
    return path.join(app.getAppPath(), ".next", "standalone");
  }

  return process.cwd();
}
