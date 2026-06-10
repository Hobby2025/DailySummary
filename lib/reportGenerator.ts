import { requestGithubModelJson } from "@/lib/githubModels";
import {
  buildDailyMarkdownReport,
  buildWeeklyFallbackRows,
  type UserReportBlock,
  type WeeklyUserReportBlock,
} from "@/lib/reporting";

export type WeeklyDocxRow = {
  userName: string;
  lastWeekText: string;
  thisWeekText: string;
};

export async function generateDailyMarkdown(input: {
  targetDate: string;
  rows: UserReportBlock[];
}) {
  const fallback = buildDailyMarkdownReport(input.targetDate, input.rows);

  try {
    const parsed = await requestGithubModelJson({
      system:
        "일일 업무 내역을 한국어 보고용 Markdown으로 정리합니다. 입력에 없는 내용은 추가하지 않습니다.",
      user: [
        "다음 데이터를 일일보고 Markdown 문서로 정리하세요.",
        "반드시 {\"markdown\":\"...\"} 형식으로 응답하세요.",
        `대상일: ${input.targetDate}`,
        JSON.stringify(input.rows),
      ].join("\n"),
    });

    if (typeof parsed.markdown !== "string" || parsed.markdown.length > 50_000) {
      return fallback;
    }

    return parsed.markdown;
  } catch {
    return fallback;
  }
}

export async function generateWeeklyRows(rows: WeeklyUserReportBlock[]): Promise<WeeklyDocxRow[]> {
  const fallback = buildWeeklyFallbackRows(rows);

  try {
    const parsed = await requestGithubModelJson({
      system:
        "주간 업무보고서 양식에 넣을 팀원별 목록을 한국어로 정리합니다. 입력에 없는 내용은 추가하지 않습니다.",
      user: [
        "다음 데이터를 팀원별 지난주 업무와 이번 주 할 일로 정리하세요.",
        "반드시 {\"rows\":[{\"userName\":\"...\",\"lastWeekText\":\"...\",\"thisWeekText\":\"...\"}]} 형식으로 응답하세요.",
        "각 텍스트는 줄바꿈이 포함된 번호 목록으로 작성하세요.",
        JSON.stringify(rows),
      ].join("\n"),
    });

    if (!Array.isArray(parsed.rows)) {
      return fallback;
    }

    const byName = new Map(
      parsed.rows
        .filter((row: unknown): row is WeeklyDocxRow => isWeeklyDocxRow(row))
        .map((row: WeeklyDocxRow) => [row.userName, row]),
    );

    return fallback.map((row) => byName.get(row.userName) ?? row);
  } catch {
    return fallback;
  }
}

function isWeeklyDocxRow(value: unknown): value is WeeklyDocxRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Record<string, unknown>;

  return (
    typeof row.userName === "string" &&
    typeof row.lastWeekText === "string" &&
    typeof row.thisWeekText === "string"
  );
}
