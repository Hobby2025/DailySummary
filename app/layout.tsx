import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "업무보고 자동화",
  description: "일일 업무 입력을 일일보고와 주간보고 문서로 정리하는 도구",
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
