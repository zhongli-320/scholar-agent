"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function Header() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await createClient()?.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2 sm:px-6">
        <Link href="/" className="mr-auto text-lg font-bold tracking-tight text-indigo-700">
          ScholarAgent
        </Link>
        <nav aria-label="主导航" className="order-3 flex w-full items-center justify-between gap-2 text-sm font-medium text-slate-600 sm:order-none sm:w-auto sm:justify-start sm:gap-6">
          <Link href="/search" className="rounded px-2 py-2 hover:text-indigo-700">智能检索</Link>
          <Link href="/projects" className="rounded px-2 py-2 hover:text-indigo-700">项目空间</Link>
          <Link href="/history" className="rounded px-2 py-2 hover:text-indigo-700">检索历史</Link>
        </nav>
        {email ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden max-w-40 truncate text-slate-500 md:inline">{email}</span>
            <button type="button" onClick={signOut} className="min-h-11 rounded-lg border border-slate-300 px-3 font-medium hover:bg-slate-50">退出</button>
          </div>
        ) : (
          <Link href="/login" className="flex min-h-11 items-center rounded-lg border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50">
            登录 / 注册
          </Link>
        )}
      </div>
    </header>
  );
}
