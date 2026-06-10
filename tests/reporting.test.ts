import assert from "node:assert/strict";
import test from "node:test";
import {
  getCurrentMondaySeoulDate,
  getWeeklyReportPeriod,
  getYesterdaySeoulDate,
  isFridayDate,
} from "../lib/reporting.ts";

test("금요일에는 차주 업무 입력 UI를 표시할 수 있다", () => {
  assert.equal(isFridayDate("2026-06-12"), true);
});

test("금요일이 아니면 차주 업무 입력 UI를 숨긴다", () => {
  assert.equal(isFridayDate("2026-06-10"), false);
});

test("Asia/Seoul 기준 전날 일일보고 대상일을 계산한다", () => {
  const targetDate = getYesterdaySeoulDate(new Date("2026-06-10T00:30:00.000Z"));

  assert.equal(targetDate, "2026-06-09");
});

test("월요일 기준 지난주와 이번 주 기간을 계산한다", () => {
  const monday = getCurrentMondaySeoulDate(new Date("2026-06-10T12:00:00.000Z"));
  const period = getWeeklyReportPeriod(monday);

  assert.equal(period.baseMonday, "2026-06-08");
  assert.equal(period.lastWeekStart, "2026-06-01");
  assert.equal(period.lastWeekEnd, "2026-06-07");
  assert.equal(period.thisWeekStart, "2026-06-08");
  assert.equal(period.thisWeekEnd, "2026-06-14");
});
