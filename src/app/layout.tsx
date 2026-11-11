import type { Metadata } from "next";

import { Header } from "@/components/header";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScholarAgent 学术检索",
  description: "面向高校学生和研究者的 OpenAlex 学术检索智能体",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50 text-slate-950 antialiased">
        <a href="#main-content" className="sr-only z-50 rounded-lg bg-white px-4 py-3 font-semibold shadow focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          跳到主要内容
        </a>
        <Header />
        <div id="main-content" tabIndex={-1}>{children}</div>
      </body>
    </html>
  );
}
