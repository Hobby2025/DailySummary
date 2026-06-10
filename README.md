# Daily Summary

일일 업무 내역을 빠르게 입력하고, YUSCON_WEB 백엔드의 로그인 및 일일/주간 업무보고 API와 연동해 보고서 문서를 생성하는 데스크톱 보조 앱입니다.

## 프로젝트 역할

| 프로젝트 | 역할 |
| --- | --- |
| `dailySummary` | YUSCON_WEB 관리자 계정으로 로그인한 사용자가 업무 내역을 입력하고 일일보고 Markdown, 주간보고 DOCX 생성을 요청하는 Next.js/Electron 클라이언트 |
| `YUSCON_WEB` | 로그인, 권한 검증, 업무보고 데이터 저장, 정규화, 보고서 문서 생성을 담당하는 Fastify/Prisma 백엔드 |

## 연동 구조

```text
dailySummary
  ├─ /reports/new  ── POST /api/daily-summary/daily-reports
  ├─ /daily        ── POST /api/daily-summary/report-documents/daily
  └─ /weekly       ── POST /api/daily-summary/report-documents/weekly

YUSCON_WEB/backend
  ├─ src/routes/daily-summary.ts
  ├─ src/services/daily-summary/reporting.ts
  └─ prisma/schema.prisma
```

`dailySummary`는 자체 SQLite 저장소를 사용하지 않고 `NEXT_PUBLIC_BACKEND_API_BASE_URL`로 지정된 `YUSCON_WEB` 백엔드에 요청합니다. 로컬 기본값은 `http://127.0.0.1:4000`입니다.

로그인은 `YUSCON_WEB`의 `/api/auth/login`, `/api/auth/me`, `/api/auth/refresh`, `/api/auth/logout` API를 사용합니다. 업무보고 기능은 `SUPERADMIN`, `LICENSEMANAGER`, `ADMIN` 권한만 사용할 수 있습니다. 로그인은 `YUSCON_WEB`의 HttpOnly `refreshToken` 쿠키 만료 기간 동안 유지됩니다.

## 화면

| 화면 | 경로 | 기능 |
| --- | --- | --- |
| 업무 입력 | `/reports/new` | 로그인한 관리자 이름으로 당일 업무를 입력하고 금요일에는 차주 계획도 함께 입력 |
| 일일보고 생성 | `/daily` | 지정한 대상일의 업무를 일일보고 Markdown으로 생성 |
| 주간보고 생성 | `/weekly` | 지난주 업무와 이번 주 계획을 DOCX 파일로 생성 |

## 실행 준비

먼저 `YUSCON_WEB/backend`가 실행 중이어야 합니다.

```bash
cd C:\Users\yusco\workdir\YUSCON_WEB\backend
npm install
npm run db:generate
npm run dev
```

그 다음 이 앱을 실행합니다.

```bash
cd C:\Users\yusco\workdir\dailySummary
npm install
copy .env.example .env
npm run dev
```

데스크톱 모드 실행:

```bash
npm run desktop:dev
```

## 환경 변수

| 이름 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_BACKEND_API_BASE_URL` | `YUSCON_WEB` 백엔드 API 기준 주소 |

## 검증

```bash
npm test
npm run build
```
