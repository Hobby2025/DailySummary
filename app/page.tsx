import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page">
      <header className="header">
        <div>
          <p className="eyebrow">업무보고 자동화</p>
          <h1>일일 업무보고 정리</h1>
        </div>
      </header>

      <section className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>사용자</th>
              <th>화면</th>
              <th>기능</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>작성자</td>
              <td>
                <Link href="/reports/new">업무 입력</Link>
              </td>
              <td>오늘 업무와 다음 주 예정 업무를 자유 형식으로 입력합니다.</td>
            </tr>
            <tr>
              <td>관리자</td>
              <td>
                <Link href="/weekly">주간 보고서</Link>
              </td>
              <td>작성자별 주간 업무 내역과 다음 주 예정 업무를 표로 확인합니다.</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}
