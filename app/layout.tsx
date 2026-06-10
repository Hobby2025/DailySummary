import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "업무보고 자동화",
  description: "일일 업무 입력을 주간 보고서로 정리하는 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
