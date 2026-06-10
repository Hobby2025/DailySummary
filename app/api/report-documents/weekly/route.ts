import { NextResponse } from "next/server";
import { z } from "zod";
import { generateWeeklyRows } from "@/lib/reportGenerator";
import { buildWeeklyDocx } from "@/lib/weeklyDocx";
import { getCurrentMondaySeoulDate, getWeeklyReportPeriod, groupWeeklyItems } from "@/lib/reporting";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const weeklyReportDocumentSchema = z.object({
  baseMonday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const body = weeklyReportDocumentSchema.parse(json);
    const period = getWeeklyReportPeriod(body.baseMonday ?? getCurrentMondaySeoulDate());
    const items = await prisma.workItem.findMany({
      where: {
        planType: {
          in: ["CURRENT_WEEK", "NEXT_WEEK"],
        },
        workDate: {
          gte: period.lastWeekStartDate,
          lte: period.lastWeekEndDate,
        },
      },
      include: { user: true },
      orderBy: [{ user: { name: "asc" } }, { projectName: "asc" }, { createdAt: "asc" }],
    });
    const grouped = groupWeeklyItems(
      items.map((item) => ({
        userName: item.user.name,
        projectName: item.projectName,
        content: item.content,
        planType: item.planType,
      })),
    );
    const rows = await generateWeeklyRows(grouped);
    const docx = await buildWeeklyDocx({ ...period, rows });
    const fileName = `weekly-report-${period.lastWeekStart}_${period.lastWeekEnd}.docx`;

    return new NextResponse(docx, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "주간보고 문서를 생성하지 못했습니다.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
