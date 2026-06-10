import { NextResponse } from "next/server";
import { z } from "zod";
import { generateDailyMarkdown } from "@/lib/reportGenerator";
import { getDailyRange, getYesterdaySeoulDate, groupDailyItems } from "@/lib/reporting";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const dailyReportDocumentSchema = z.object({
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const body = dailyReportDocumentSchema.parse(json);
    const targetDate = body.targetDate ?? getYesterdaySeoulDate();
    const range = getDailyRange(targetDate);
    const items = await prisma.workItem.findMany({
      where: {
        planType: "CURRENT_WEEK",
        workDate: {
          gte: range.startDate,
          lte: range.endDate,
        },
      },
      include: { user: true },
      orderBy: [{ user: { name: "asc" } }, { projectName: "asc" }, { createdAt: "asc" }],
    });
    const rows = groupDailyItems(
      items.map((item) => ({
        userName: item.user.name,
        projectName: item.projectName,
        content: item.content,
        planType: item.planType,
      })),
    );
    const markdown = await generateDailyMarkdown({ targetDate, rows });

    return NextResponse.json({ targetDate, markdown });
  } catch (error) {
    const message = error instanceof Error ? error.message : "일일보고 문서를 생성하지 못했습니다.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
