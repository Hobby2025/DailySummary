import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeWorkItems } from "@/lib/normalizer";
import { isFridayDate } from "@/lib/reporting";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const createDailyReportSchema = z.object({
  userName: z.string().trim().min(1, "작성자를 입력해 주세요.").max(50),
  reportDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "작성일 형식이 올바르지 않습니다."),
  currentWeek: z.string().trim().min(1, "당일 업무를 입력해 주세요.").max(5000),
  nextWeek: z.string().trim().max(5000).optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    const body = createDailyReportSchema.parse(json);
    const reportDate = parseReportDate(body.reportDate);
    const nextWeek = body.nextWeek?.trim();

    if (nextWeek && !isFridayDate(body.reportDate)) {
      return NextResponse.json(
        { error: "차주 업무는 금요일에만 입력할 수 있습니다." },
        { status: 400 },
      );
    }

    const syntheticEmail = buildLocalEmail(body.userName);
    const user = await prisma.user.upsert({
      where: { email: syntheticEmail },
      update: { name: body.userName },
      create: {
        name: body.userName,
        email: syntheticEmail,
      },
    });

    const currentItems = await normalizeWorkItems({
      rawText: body.currentWeek,
      planType: "CURRENT_WEEK",
    });
    const nextItems = nextWeek
      ? await normalizeWorkItems({
          rawText: nextWeek,
          planType: "NEXT_WEEK",
        })
      : [];

    const dailyReport = await prisma.dailyReport.create({
      data: {
        userId: user.id,
        reportDate,
        rawCurrentWeek: body.currentWeek,
        rawNextWeek: nextWeek,
        workItems: {
          create: [
            ...currentItems.map((item) => ({
              userId: user.id,
              workDate: reportDate,
              projectName: item.projectName,
              content: item.content,
              workType: item.workType,
              status: item.status,
              planType: "CURRENT_WEEK",
              rawText: body.currentWeek,
            })),
            ...nextItems.map((item) => ({
              userId: user.id,
              workDate: reportDate,
              projectName: item.projectName,
              content: item.content,
              workType: item.workType,
              status: item.status,
              planType: "NEXT_WEEK",
              rawText: nextWeek ?? "",
            })),
          ],
        },
      },
    });

    return NextResponse.json({ id: dailyReport.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "INVALID_REPORT_DATE") {
      return NextResponse.json({ error: "작성일이 올바르지 않습니다." }, { status: 400 });
    }

    return NextResponse.json({ error: "보고서를 저장하지 못했습니다." }, { status: 500 });
  }
}

function parseReportDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("INVALID_REPORT_DATE");
  }

  return date;
}

function buildLocalEmail(userName: string) {
  const encodedName = Buffer.from(userName).toString("base64url");

  return `${encodedName}@local.invalid`;
}
