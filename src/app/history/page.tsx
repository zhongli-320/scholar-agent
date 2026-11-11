"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type History = Database["public"]["Tables"]["search_history"]["Row"];

export default function HistoryPage() {
  const [items, setItems] = useState<History[] | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      if (!supabase) return setItems([]);
      const { data: userData } = await supabase.auth.getUser();
      setSignedIn(Boolean(userData.user));
      if (!userData.user) return setItems([]);
      const { data } = await supabase.from("search_history").select("*").order("created_at", { ascending: false });
      setItems(data ?? []);
    })();
  }, []);

  async function remove(id: string) {
    const { error } = await createClient()!.from("search_history").delete().eq("id", id);
    if (!error) setItems((current) => current?.filter((item) => item.id !== id) ?? []);
  }

  async function clear() {
    if (!window.confirm("确定清空全部检索历史吗？此操作无法撤销。")) return;
    const { error } = await createClient()!.from("search_history").delete().not("id", "is", null);
    if (!error) setItems([]);
  }

  if (items === null) return <main className="mx-auto max-w-5xl px-4 py-10 text-slate-600">正在加载检索历史…</main>;
  if (!signedIn) return <main className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="text-3xl font-bold">登录后查看检索历史</h1><p className="mt-3 text-slate-600">成功检索会自动保存，无需手动操作。</p><Link href="/login" className="mt-7 inline-flex min-h-11 items-center rounded-lg bg-indigo-600 px-5 font-semibold text-white">登录 / 注册</Link></main>;

  return <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">检索历史</h1><p className="mt-2 text-slate-600">每次成功检索均自动记录。</p></div>{items.length > 0 && <button type="button" onClick={() => void clear()} className="min-h-11 rounded-lg border border-red-200 px-4 text-red-700">清空历史</button>}</div><div className="mt-7 space-y-3">{items.map((item) => <article key={item.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><h2 className="truncate text-lg font-bold">{item.query}</h2><p className="mt-1 text-sm text-slate-500">{item.mode === "ai" ? "智能检索" : "普通检索"} · {item.result_count.toLocaleString("zh-CN")} 条 · {new Date(item.created_at).toLocaleString("zh-CN")}</p></div><div className="flex gap-2"><Link href={historyUrl(item)} className="flex min-h-11 items-center rounded-lg bg-indigo-600 px-4 font-semibold text-white">重新执行</Link><button type="button" onClick={() => void remove(item.id)} className="min-h-11 rounded-lg border border-slate-300 px-4">删除</button></div></article>)}{items.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">暂无检索历史。</p>}</div></main>;
}

function historyUrl(item: History) {
  const params = new URLSearchParams({ q: item.query, mode: item.mode });
  if (item.filters && typeof item.filters === "object" && !Array.isArray(item.filters)) {
    Object.entries(item.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== false && key !== "cursor") params.set(key, String(value));
    });
  }
  return `/search?${params.toString()}`;
}
