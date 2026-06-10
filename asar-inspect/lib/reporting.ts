ull;
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
export const BACKEND_API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ?? "http://127.0.0.1:4000";

export function buildBackendUrl(path: string) {
  return `${BACKEND_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
export const PLAN_TYPES = ["CURRENT_WEEK", "NEXT_WEEK"] as const;

export type PlanType = (typeof PLAN_TYPES)[number];

export type WorkItemForReport = {
  userName: string;
  projectName: string;
  content: string;
  planType: string;
};

export type UserReportBlock = {
  userName: string;
  items: string[];
};

export type WeeklyUserReportBlock = {
  userName: string;
  lastWeekItems: string[];
  thisWeekItems: string[];
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function assertDateString(value: string, fieldName = "날짜") {
  if (!DATE_PATTERN.test(value) || !isRealDateString(value)) {
    throw new Error(`${fieldName}가 올바르지 않습니다.`);
  }
}

export function getTodaySeoulDate(baseDate = new Date()) {
  return formatSeoulDate(baseDate);
}

export function getYesterdaySeoulDate(baseDate = new Date()) {
  return addDays(getTodaySeoulDate(baseDate), -1);
}

export function getCurrentMondaySeoulDate(baseDate = new Date()) {
  const today = getTodaySeoulDate(baseDate);
  const day = getDayOfWeek(today);
  const diff = day === 0 ? -6 : 1 - day;

  return addDays(today, diff);
}

export function getDailyRange(targetDate: string) {
  assertDateString(targetDate, "대상일");

  return {
    startDate: new Date(`${targetDate}T00:00:00.000Z`),
    endDate: new Date(`${targetDate}T23:59:59.999Z`),
    value: targetDate,
  };
}

export function getWeeklyReportPeriod(baseMonday: string) {
  assertDateString(baseMonday, "기준 월요일");

  if (getDayOfWeek(baseMonday) !== 1) {
    throw new Error("기준일은 월요일이어야 합니다.");
  }

  const lastWeekStart = addDays(baseMonday, -7);
  const lastWeekEnd = addDays(baseMonday, -1);
  const thisWeekStart = baseMonday;
  const thisWeekEnd = addDays(baseMonday, 6);

  return {
    baseMonday,
    lastWeekStart,
    lastWeekEnd,
    thisWeekStart,
    thisWeekEnd,
    lastWeekStartDate: new Date(`${lastWeekStart}T00:00:00.000Z`),
    lastWeekEndDate: new Date(`${lastWeekEnd}T23:59:59.999Z`),
  };
}

export function isFridayDate(value: string) {
  assertDateString(value, "작성일");

  return getDayOfWeek(value) === 5;
}

export function groupDailyItems(items: WorkItemForReport[]): UserReportBlock[] {
  const map = new Map<string, string[]>();

  for (const item of items) {
    if (item.planType !== "CURRENT_WEEK") {
      continue;
    }

    const entries = map.get(item.userName) ?? [];
    entries.push(formatWorkItem(item));
    map.set(item.userName, entries);
  }

  return Array.from(map.entries())
    .sort(([left], [right]) => left.localeCompare(right, "ko"))
    .map(([userName, userItems]) => ({ userName, items: userItems }));
}

export function groupWeeklyItems(items: WorkItemForReport[]): WeeklyUserReportBlock[] {
  const map = new Map<string, WeeklyUserReportBlock>();

  for (const item of items) {
    if (!isPlanType(item.planType)) {
      continue;
    }

    const row =
      map.get(item.userName) ??
      ({
        userName: item.userName,
        lastWeekItems: [],
        thisWeekItems: [],
      } satisfies WeeklyUserReportBlock);

    if (item.planType === "CURRENT_WEEK") {
      row.lastWeekItems.push(formatWorkItem(item));
    } else {
      row.thisWeekItems.push(formatWorkItem(item));
    }

    map.set(item.userName, row);
  }

  return Array.from(map.values()).sort((left, right) => left.userName.localeCompare(right.userName, "ko"));
}

export function buildDailyMarkdownReport(targetDate: string, rows: UserReportBlock[]) {
  const body =
    rows.length === 0
      ? ["- 저장된 업무 내역이 없습니다."]
      : rows.flatMap((row) => [
          `## ${escapeMarkdown(row.userName)}`,
          ...row.items.map((item) => `- ${escapeMarkdown(item)}`),
          "",
        ]);

  return ["# 일일 업무 보고", "", `대상일: ${targetDate}`, "", ...body].join("\n").trim();
}

export function buildWeeklyFallbackRows(rows: WeeklyUserReportBlock[]) {
  return rows.map((row) => ({
    userName: row.userNa