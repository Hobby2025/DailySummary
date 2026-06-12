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

export type WeeklyMarkdownReportInput = {
  reporterName: string;
  periodStart: string;
  periodEnd: string;
  currentWeekItems: string[];
  nextWeekItems: string[];
  currentWeekStatus?: string;
  currentWeekEtc?: string;
  currentWeekNote?: string;
  nextWeekScheduleText?: string;
  nextWeekNote?: string;
};

export type WeeklyMarkdownReportPeriod = {
  lastWeekStart: string;
  lastWeekEnd: string;
  thisWeekStart: string;
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
  const map = new Map<string, WorkItemForReport[]>();

  for (const item of items) {
    if (item.planType !== "CURRENT_WEEK") {
      continue;
    }

    const entries = map.get(item.userName) ?? [];
    entries.push(item);
    map.set(item.userName, entries);
  }

  return Array.from(map.entries())
    .sort(([left], [right]) => left.localeCompare(right, "ko"))
    .map(([userName, userItems]) => ({ userName, items: formatGroupedWorkItems(userItems) }));
}

export function groupWeeklyItems(items: WorkItemForReport[]): WeeklyUserReportBlock[] {
  const map = new Map<
    string,
    {
      userName: string;
      lastWeekItems: WorkItemForReport[];
      thisWeekItems: WorkItemForReport[];
    }
  >();

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
      });

    if (item.planType === "CURRENT_WEEK") {
      row.lastWeekItems.push(item);
    } else {
      row.thisWeekItems.push(item);
    }

    map.set(item.userName, row);
  }

  return Array.from(map.values())
    .sort((left, right) => left.userName.localeCompare(right.userName, "ko"))
    .map((row) => ({
      userName: row.userName,
      lastWeekItems: formatGroupedWorkItems(row.lastWeekItems),
      thisWeekItems: formatGroupedWorkItems(row.thisWeekItems),
    }));
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
    userName: row.userName,
    lastWeekText: formatNumberedList(row.lastWeekItems),
    thisWeekText: formatNumberedList(row.thisWeekItems),
  }));
}

export function buildWeeklyMarkdownReports(period: WeeklyMarkdownReportPeriod, rows: WeeklyUserReportBlock[]) {
  assertDateString(period.lastWeekStart, "금주 시작일");
  assertDateString(period.lastWeekEnd, "금주 종료일");
  assertDateString(period.thisWeekStart, "차주 시작일");

  if (rows.length === 0) {
    return buildPersonalWeeklyMarkdownReport({
      reporterName: "",
      periodStart: period.lastWeekStart,
      periodEnd: period.lastWeekEnd,
      currentWeekItems: [],
      nextWeekItems: [],
      nextWeekScheduleText: formatKoreanMonthDay(period.thisWeekStart),
    });
  }

  return rows
    .map((row) =>
      buildPersonalWeeklyMarkdownReport({
        reporterName: row.userName,
        periodStart: period.lastWeekStart,
        periodEnd: period.lastWeekEnd,
        currentWeekItems: row.lastWeekItems,
        nextWeekItems: row.thisWeekItems,
        nextWeekScheduleText: formatKoreanMonthDay(period.thisWeekStart),
      }),
    )
    .join("\n\n");
}

export function buildPersonalWeeklyMarkdownReport(input: WeeklyMarkdownReportInput) {
  assertDateString(input.periodStart, "기간 시작일");
  assertDateString(input.periodEnd, "기간 종료일");

  const periodText = `${formatDotDate(input.periodStart)} ~ ${formatDotDate(input.periodEnd)}`;
  const reporterName = normalizeInlineText(input.reporterName) || "-";
  const currentWeekStatus = normalizeInlineText(input.currentWeekStatus) || "완료";
  const nextWeekScheduleText = normalizeInlineText(input.nextWeekScheduleText) || "-";

  return [
    "# 개인 주간 업무 보고서",
    "",
    `- 기간: ${escapeMarkdown(periodText)}`,
    `- 보고자: ${escapeMarkdown(reporterName)}`,
    "",
    "## 금주 진행 업무",
    "",
    `- 완결 여부: ${escapeMarkdown(currentWeekStatus)}`,
    ...formatOptionalMeta("기타 사항", input.currentWeekEtc),
    ...formatOptionalMeta("비고", input.currentWeekNote),
    "",
    ...formatMarkdownWorkList(input.currentWeekItems),
    "",
    "## 차주 예정 업무",
    "",
    `- 예정 일자: ${escapeMarkdown(nextWeekScheduleText)}`,
    ...formatOptionalMeta("비고", input.nextWeekNote),
    "",
    ...formatMarkdownWorkList(input.nextWeekItems),
    "",
    "## 기타",
    "",
    "- 없음",
  ].join("\n");
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

type ProjectWorkGroup = {
  key: string;
  projectName: string;
  items: string[];
};

function formatGroupedWorkItems(items: WorkItemForReport[]) {
  const result: string[] = [];
  const groups: ProjectWorkGroup[] = [];

  for (const item of items) {
    if (item.projectName === "미분류") {
      result.push(item.content);
      continue;
    }

    const key = normalizeProjectName(item.projectName);
    const group = findProjectGroup(groups, key);

    if (group) {
      group.projectName = getPreferredProjectName(group.projectName, item.projectName);
      group.items.push(item.content);
      continue;
    }

    groups.push({
      key,
      projectName: item.projectName,
      items: [item.content],
    });
  }

  return [
    ...result,
    ...groups.map((group) =>
      group.items.length === 1
        ? `${group.projectName}: ${group.items[0]}`
        : [group.projectName, ...group.items.map((item) => ` - ${item}`)].join("\n"),
    ),
  ];
}

function findProjectGroup(groups: ProjectWorkGroup[], key: string) {
  return groups.find((group) => isSameProjectKey(group.key, key));
}

function isSameProjectKey(left: string, right: string) {
  if (!left || !right) {
    return false;
  }
  return left === right;
}

function normalizeProjectName(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[\s_-]+/g, "")
    .replace(/[^\p{Letter}\p{Number}가-힣]/gu, "");
}

function getPreferredProjectName(current: string, incoming: string) {
  const currentScore = getProjectNameScore(current);
  const incomingScore = getProjectNameScore(incoming);

  return incomingScore > currentScore ? incoming : current;
}

function getProjectNameScore(value: string) {
  const hasLatinUppercase = /[A-Z]/.test(value);
  const hasSeparator = /[\s_-]/.test(value);
  const hasDigit = /\d/.test(value);

  return (hasLatinUppercase ? 20 : 0) + (hasSeparator ? 2 : 0) - (hasDigit ? 5 : 0) - value.length / 100;
}

function escapeMarkdown(value: string) {
  return value.replace(/\|/g, "\\|");
}

function formatDotDate(value: string) {
  const [year, month, day] = value.split("-");

  return `${year}.${month}.${day}`;
}

function formatKoreanMonthDay(value: string) {
  const [, month, day] = value.split("-");

  return `${month}월 ${day}일 ~`;
}

function formatMarkdownWorkList(items: string[]) {
  const rows = items.flatMap((item, index) => formatMarkdownWorkItem(item, index + 1));

  if (rows.length === 0) {
    return ["- 없음"];
  }

  return rows;
}

function formatMarkdownWorkItem(item: string, order: number) {
  const [title, ...children] = item.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!title) {
    return [];
  }

  return [
    `${order}. ${escapeMarkdown(title)}`,
    ...children
      .map((line) => line.replace(/^[-*]\s*/, ""))
      .filter(Boolean)
      .map((line) => `   - ${escapeMarkdown(line)}`),
  ];
}

function formatOptionalMeta(label: string, value: string | undefined) {
  const text = normalizeInlineText(value);
  if (!text) {
    return [];
  }

  return [`- ${label}: ${escapeMarkdown(text)}`];
}

function normalizeInlineText(value: string | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}
