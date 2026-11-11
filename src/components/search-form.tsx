"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function SearchForm({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const mode = submitter?.value === "ai" ? "ai" : "basic";
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}&mode=${mode}`);
  }

  return (
    <form onSubmit={search} className="rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-xl shadow-slate-200/60">
      <label htmlFor="search-query" className="sr-only">研究问题或关键词</label>
      <textarea id="search-query" name="query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如：生成式人工智能如何影响大学生的信息行为？" rows={3} required className="w-full resize-none rounded-xl border-0 bg-slate-50 px-4 py-3 text-base text-slate-950 placeholder:text-slate-400" />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button type="submit" value="basic" className="min-h-11 rounded-xl border border-slate-300 px-5 font-semibold text-slate-700 hover:bg-slate-50">普通检索</button>
        <button type="submit" value="ai" className="min-h-11 rounded-xl bg-indigo-600 px-5 font-semibold text-white hover:bg-indigo-700">智能检索</button>
      </div>
    </form>
  );
}
