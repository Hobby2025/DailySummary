import Link from "next/link";
import { CopyMarkdownButton } from "@/components/CopyMarkdownButton";
import {
  buildMarkdownReport,
  groupWeeklyRows,
  resolvePeriod,
  type WeeklySearchParams,
} from "@/lib/reporting";
import { prisma } from "@/lib/prisma";

export default async function WeeklyPage({
  searchParams,
}: {
  searchParams: WeeklySearchParams;
}) {
  let period;

  try {
    period = resolvePeriod(searchParams);
  } catch (error) {
    const message = error instanceof Error ? error.message : "조회 기간이 올바르지 않습니다.";

    return (
      <main className="page">
        <header className="header">
          <div>
            <p className="eyebrow">관리자 화면</p>
            <h1>주간 보고서</h1>
          </div>
          <nav className="nav">
            <Link href="/reports/new">업무 입력</Link>
            <Link href="/">처음으로</Link>
          </nav>
        </header>
        <section className="panel">
          <p className="form-message error">{message}</p>
        </section>
      </main>
    );
  }

  const { startDate, endDate, startValue, endValue } = period;
  const items = await prisma.workItem.findMany({
    where: {
      workDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      user: true,
    },
    orderBy: [{ user: { name: "asc" } }, { projectName: "asc" }, { createdAt: "asc" }],
  });

  const rows = groupWeeklyRows(items);
  const markdown = buildMarkdownReport(rows, startValue, endValue);

  return (
    <main className="page">
      <header className="header">
        <div>
          <p className="eyebrow">관리자 화면</p>
          <h1>주간 보고서</h1>
        </div>
        <nav className="nav">
          <Link href="/reports/new">업무 입력</Link>
          <Link href="/">처음으로</Link>
        </nav>
      </header>

      <section className="panel section">
        <form className="grid">
          <div className="field">
            <label htmlFor="start">시작일</label>
            <input id="start" name="start" type="date" defaultValue={startValue} />
          </div>
          <div className="field">
            <label htmlFor="end">종료일</label>
            <input id="end" name="end" type="date" defaultValue={endValue} />
          </div>
          <div className="actions">
            <button className="button" type="submit">
              조회
            </button>
            <CopyMarkdownButton markdown={markdown} />
          </div>
        </form>
      </section>

      <section className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>작성자</th>
              <th>프로젝트</th>
              <th>이번 주 업무</th>
              <th>다음 주 예정 업무</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4}>저장된 업무 내역이 없습니다.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.userName}-${row.projectName}`}>
                  <td>{row.userName}</td>
                  <td>{row.projectName}</td>
                  <td>
                    <List items={row.currentWeek} />
                  </td>
                  <td>
                    <List items={row.nextWeek} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function List({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <span>없음</span>;
  }

  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
