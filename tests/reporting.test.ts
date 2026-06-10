import assert from "node:assert/strict";
import test from "node:test";
import { buildMarkdownReport, groupWeeklyRows, resolvePeriod } from "../lib/reporting.ts";

test("업무 항목을 작성자와 프로젝트별로 집계한다", () => {
  const rows = groupWeeklyRows([
    {
      user: { name: "홍길동" },
      projectName: "YUSCON",
      content: "장비 카탈로그 API 추가",
      planType: "CURRENT_WEEK",
    },
    {
      user: { name: "홍길동" },
      projectName: "YUSCON",
      content: "검색 조건 추가",
      planType: "NEXT_WEEK",
    },
    {
      user: { name: "홍길동" },
      projectName: "YUSCON",
      content: "잘못된 타입은 제외",
      planType: "UNKNOWN_TYPE",
    },
  ]);

  assert.deepEqual(rows, [
    {
      userName: "홍길동",
      projectName: "YUSCON",
      currentWeek: ["장비 카탈로그 API 추가"],
      nextWeek: ["검색 조건 추가"],
    },
  ]);
});

test("기간 파라미터가 없으면 기준일의 월요일부터 일요일까지 조회한다", () => {
  const period = resolvePeriod({}, new Date("2026-06-10T12:00:00.000Z"));

  assert.equal(period.startValue, "2026-06-08");
  assert.equal(period.endValue, "2026-06-14");
});

test("종료일보다 늦은 시작일은 거부한다", () => {
  assert.throws(
    () => resolvePeriod({ start: "2026-06-15", end: "2026-06-14" }),
    /조회 시작일/,
  );
});

test("마크다운 표 셀의 줄바꿈과 구분자를 이스케이프한다", () => {
  const markdown = buildMarkdownReport(
    [
      {
        userName: "홍|길동",
        projectName: "보고",
        currentWeek: ["A|B\nC"],
        nextWeek: [],
      },
    ],
    "2026-06-08",
    "2026-06-14",
  );

  assert.match(markdown, /홍\\\|길동/);
  assert.match(markdown, /A\\\|B<br>C/);
  assert.match(markdown, /없음/);
});
