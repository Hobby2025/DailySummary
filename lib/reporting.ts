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

  return [`# 일일 업무 보고`, "", `대상일: ${targetDate}`, "", ...body].join("\n").trim();
}

export function buildWeeklyFallbackRows(rows: WeeklyUserReportBlock[]) {
  return rows.map((row) => ({
    userName: row.userName,
    lastWeekText: formatNumberedList(row.lastWeekItems),
    thisWeekText: formatNumberedList(row.thisWeekItems),
  }));
}

export function formatNumberedList(items: string[]) {
  if (items.length === 0) {
    return "";
  }

  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

export function formatShortDateRange(start: string, end: string) {
  const [, startMonth, startDay] = start.split("-");
  const [, endMonth, endDay] = end.split("-");

  return `${Number(startMonth)}/${Number(startDay)} ~ ${Number(endMonth)}/${Number(endDay)}`;
}

export function addDays(value: string, amount: number) {
  assertDateString(value);
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);

  return date.toISOString().slice(0, 10);
}

function formatSeoulDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function getDayOfWeek(value: string) {
  assertDateString(value);

  const [year, month, day] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function isRealDateString(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.toISOString().slice(0, 10) === value;
}

function isPlanType(value: string): value is PlanType {
  return PLAN_TYPES.includes(value as PlanType);
}

function formatWorkItem(item: WorkItemForReport) {
  return item.projectName === "미분류" ? item.content : `${item.projectName}: ${item.content}`;
}

function escapeMarkdown(value: string) {
  return value.replace(/\|/g, "\\|");
}
