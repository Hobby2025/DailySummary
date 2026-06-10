import { z } from "zod";
import { type PlanType } from "@/lib/reporting";
import { requestGithubModelJson } from "@/lib/githubModels";

export const normalizedWorkItemSchema = z.object({
  projectName: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(1000),
  workType: z.string().trim().max(80).nullable(),
  status: z.enum(["DONE", "IN_PROGRESS", "BLOCKED", "UNKNOWN"]),
});

export const normalizedWorkItemsSchema = z.array(normalizedWorkItemSchema).max(100);

export type NormalizedWorkItem = z.infer<typeof normalizedWorkItemSchema>;

export async function normalizeWorkItems(input: {
  rawText: string;
  planType: PlanType;
}): Promise<NormalizedWorkItem[]> {
  const fallbackItems = fallbackNormalize(input.rawText);

  try {
    const parsed = await requestGithubModelJson({
      system:
        "자유 형식의 업무 내역을 JSON 배열로 정규화합니다. 입력에 없는 사실은 추측하지 않습니다. 상태가 명확하지 않으면 UNKNOWN을 사용합니다.",
      user: [
        "다음 업무 내역을 JSON으로 변환하세요.",
        "반드시 {\"items\": [...]} 형식으로 응답하세요.",
        "items 필드: projectName, content, workType, status",
        "status 값: DONE, IN_PROGRESS, BLOCKED, UNKNOWN",
        `업무 구분: ${input.planType}`,
        input.rawText,
      ].join("\n"),
    });
    const items = Array.isArray(parsed) ? parsed : parsed.items;

    return normalizedWorkItemsSchema.parse(items);
  } catch {
    return fallbackItems;
  }
}

export function fallbackNormalize(rawText: string): NormalizedWorkItem[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*0-9.\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 100)
    .map((content) => ({
      projectName: "미분류",
      content: content.slice(0, 1000),
      workType: null,
      status: "UNKNOWN" as const,
    }));
}
