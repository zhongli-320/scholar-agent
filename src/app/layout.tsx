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
        <Header />
        {children}
      </body>
    </html>
  );
}
