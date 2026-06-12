import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPersonalWeeklyMarkdownReport,
  buildWeeklyMarkdownReports,
  buildWeeklyFallbackRows,
  getCurrentMondaySeoulDate,
  getWeeklyReportPeriod,
  getYesterdaySeoulDate,
  groupWeeklyItems,
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

test("주간보고는 유사한 프로젝트명을 같은 묶음으로 처리한다", () => {
  const rows = groupWeeklyItems([
    {
      userName: "홍길동",
      projectName: "TerraLink",
      content: "배포 완료",
      planType: "CURRENT_WEEK",
    },
    {
      userName: "홍길동",
      projectName: "terralink",
      content: "테스트 진행",
      planType: "CURRENT_WEEK",
    },
    {
      userName: "홍길동",
      projectName: "TerraSurvey_WEB",
      content: "보고서 생성 API 추가",
      planType: "CURRENT_WEEK",
    },
    {
      userName: "홍길동",
      projectName: "terrasurvey-web",
      content: "화면 확인",
      planType: "CURRENT_WEEK",
    },
    {
      userName: "홍길동",
      projectName: "Terra Survey 2025 급한 오류 해결",
      content: "LT20 센서 오류 확인",
      planType: "CURRENT_WEEK",
    },
  ]);

  const [row] = buildWeeklyFallbackRows(rows);

  assert.equal(
    row.lastWeekText,
    [
      "1. TerraLink",
      " - 배포 완료",
      " - 테스트 진행",
      "2. TerraSurvey_WEB",
      " - 보고서 생성 API 추가",
      " - 화면 확인",
      "3. Terra Survey 2025 급한 오류 해결: LT20 센서 오류 확인",
    ].join("\n"),
  );
});

test("개인 주간 업무 보고서를 두레이 호환 기본 Markdown 양식으로 생성한다", () => {
  const markdown = buildPersonalWeeklyMarkdownReport({
    reporterName: "주순태",
    periodStart: "2026-05-19",
    periodEnd: "2026-05-22",
    currentWeekItems: [
      ["TerraLink", " - 저장 오류 수정 작업 진행", " - 백엔드 리팩토링 진행 중"].join("\n"),
      ["TerraSurvey-Web", " - 사이트 개선 작업 진행", " - 홈페이지 유지보수 및 테스트 진행"].join("\n"),
    ],
    nextWeekItems: [
      ["TerraLink", " - 서울측기 미팅 결과 나온 문제점 해결"].join("\n"),
      ["TerraSurvey-Web", " - 사이트 개선 작업 이어서 진행"].join("\n"),
    ],
    nextWeekScheduleText: "05월 26일 ~",
  });

  assert.match(markdown, /# 개인 주간 업무 보고서/);
  assert.match(markdown, /- 기간: 2026\.05\.19 ~ 2026\.05\.22/);
  assert.match(markdown, /- 보고자: 주순태/);
  assert.match(markdown, /## 금주 진행 업무/);
  assert.match(markdown, /- 완결 여부: 완료/);
  assert.match(markdown, /1\. TerraLink/);
  assert.match(markdown, /   - 저장 오류 수정 작업 진행/);
  assert.match(markdown, /   - 백엔드 리팩토링 진행 중/);
  assert.match(markdown, /## 차주 예정 업무/);
  assert.match(markdown, /- 예정 일자: 05월 26일 ~/);
  assert.match(markdown, /## 기타/);
  assert.doesNotMatch(markdown, /<\/?table|<br|<\/?ul|<\/?li|\| ---/);
});

test("사용자별 주간 업무 보고서를 이어서 생성한다", () => {
  const markdown = buildWeeklyMarkdownReports(
    {
      lastWeekStart: "2026-05-19",
      lastWeekEnd: "2026-05-22",
      thisWeekStart: "2026-05-26",
    },
    [
      {
        userName: "주순태",
        lastWeekItems: ["TerraLink\n - 저장 오류 수정 작업 진행"],
        thisWeekItems: ["TerraLink\n - 서울측기 미팅 결과 나온 문제점 해결"],
      },
    ],
  );

  assert.match(markdown, /2026\.05\.19 ~ 2026\.05\.22/);
  assert.match(markdown, /주순태/);
  assert.match(markdown, /05월 26일 ~/);
});

test("개인 주간 업무 보고서의 빈 값과 여러 줄 메타를 안전하게 정리한다", () => {
  const markdown = buildPersonalWeeklyMarkdownReport({
    reporterName: "   ",
    periodStart: "2026-05-19",
    periodEnd: "2026-05-22",
    currentWeekItems: ["", "   "],
    nextWeekItems: [],
    currentWeekStatus: "",
    currentWeekEtc: "회의 내용\n전달 완료",
    nextWeekScheduleText: "   ",
    nextWeekNote: "추가 확인\n필요",
  });

  assert.match(markdown, /- 보고자: -/);
  assert.match(markdown, /- 완결 여부: 완료/);
  assert.match(markdown, /- 기타 사항: 회의 내용 전달 완료/);
  assert.match(markdown, /- 예정 일자: -/);
  assert.match(markdown, /- 비고: 추가 확인 필요/);
  assert.equal(markdown.match(/- 없음/g)?.length, 3);
});
