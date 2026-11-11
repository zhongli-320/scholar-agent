"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import type { AiSearchPlan } from "@/lib/glm";
import type { SearchRequest, Work } from "@/lib/openalex";
import type { SearchServiceResponse } from "@/lib/search-service";
import { buildRelatedQueries, type SearchSuggestions } from "@/lib/suggestions";
import { SearchForm } from "./search-form";

type ResponseData = SearchServiceResponse | { error: string };
const fieldClass = "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2";

export function SearchResults() {
  const params = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const mode = params.get("mode") === "ai" ? "ai" : "basic";
  const [filters, setFilters] = useState<Omit<SearchRequest, "query" | "mode" | "cursor">>(() => ({
    fromYear: numberOrUndefined(params.get("fromYear")),
    toYear: numberOrUndefined(params.get("toYear")),
    type: stringOrUndefined(params.get("type")),
    language: stringOrUndefined(params.get("language")),
    isOpenAccess: params.get("isOpenAccess") === "true" || undefined,
    sort: (params.get("sort") as SearchRequest["sort"]) ?? "relevance",
  }));
  const [data, setData] = useState<SearchServiceResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(query));
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; fallback: boolean } | null>(null);
  const [related, setRelated] = useState<SearchSuggestions>({ terms: [], queries: [] });
  const [relatedError, setRelatedError] = useState<string | null>(null);

  useEffect(() => {
    const message = data?.aiError ?? data?.aiNotice;
    if (!message) return;
    const show = window.setTimeout(() => setToast({ message, fallback: Boolean(data?.aiError) }), 600);
    const hide = window.setTimeout(() => setToast(null), 8_600);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [data?.aiError, data?.aiNotice]);

  useEffect(() => {
    if (!data || data.aiPlan) return;
    let cancelled = false;
    void fetch(`/api/suggestions?q=${encodeURIComponent(query)}`)
      .then(async (response) => {
        const result = await response.json() as SearchSuggestions | { error: string };
        if (!response.ok || "error" in result) {
          throw new Error("error" in result ? result.error : "联想服务暂时不可用");
        }
        return result;
      })
      .then((result) => {
        if (!cancelled) {
          setRelated(result);
          setRelatedError(null);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setRelatedError(reason instanceof Error ? reason.message : "联想服务暂时不可用");
      });
    return () => { cancelled = true; };
  }, [data, query]);

  async function loadMore(cursor: string) {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSearch({ query, mode, ...filters, cursor });
      setData((current) => current ? { ...result, works: [...current.works, ...result.works] } : result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "检索失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    void fetchSearch({ query, mode, ...filters })
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "检索失败，请稍后重试");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [filters, mode, query]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setFilters({
      fromYear: numberOrUndefined(form.get("fromYear")),
      toYear: numberOrUndefined(form.get("toYear")),
      type: stringOrUndefined(form.get("type")),
      language: stringOrUndefined(form.get("language")),
      isOpenAccess: form.get("isOpenAccess") === "on" || undefined,
      sort: (form.get("sort") || "relevance") as SearchRequest["sort"],
    });
  }

  if (!query) {
    return <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6"><h1 className="mb-6 text-3xl font-bold">检索学术文献</h1><SearchForm /></main>;
  }

  const planTerms = data?.aiPlan
    ? Array.from(new Set([...data.aiPlan.keywordsZh, ...data.aiPlan.keywordsEn])).slice(0, 6)
    : null;
  const relatedTerms = planTerms ?? related.terms;
  const relatedQueries = planTerms ? buildRelatedQueries(query, planTerms) : related.queries;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {toast && (
        <div role="alert" className={`fixed right-4 top-20 z-50 max-w-sm rounded-xl border p-4 pr-12 text-sm shadow-lg ${toast.fallback ? "border-amber-300 bg-amber-50 text-amber-950" : "border-indigo-200 bg-indigo-50 text-indigo-950"}`}>
          <p>{toast.message}{toast.fallback ? "。本次未计入今日额度，已退回原始关键词检索。" : "。"}</p>
          <button type="button" aria-label="关闭提示" onClick={() => setToast(null)} className="absolute right-2 top-2 min-h-8 min-w-8 rounded-lg text-lg hover:bg-white/50">×</button>
        </div>
      )}
      <div className="mb-7"><SearchForm initialQuery={query} /></div>
      <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
        <section aria-label="检索筛选" className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold">筛选</h2>
          <form onSubmit={applyFilters} className="mt-5 space-y-4">
            <Field label="起始年份"><input name="fromYear" type="number" min="1800" max="2100" defaultValue={filters.fromYear} className={fieldClass} /></Field>
            <Field label="结束年份"><input name="toYear" type="number" min="1800" max="2100" defaultValue={filters.toYear} className={fieldClass} /></Field>
            <Field label="文献类型"><select name="type" defaultValue={filters.type ?? ""} className={fieldClass}><option value="">全部</option><option value="article">期刊论文</option><option value="review">综述</option><option value="book">图书</option><option value="book-chapter">图书章节</option><option value="dissertation">学位论文</option></select></Field>
            <Field label="语言"><select name="language" defaultValue={filters.language ?? ""} className={fieldClass}><option value="">全部</option><option value="zh">中文</option><option value="en">英文</option></select></Field>
            <Field label="排序"><select name="sort" defaultValue={filters.sort ?? "relevance"} className={fieldClass}><option value="relevance">相关度</option><option value="newest">发表时间</option><option value="cited">引用量</option></select></Field>
            <label className="flex min-h-11 items-center gap-2 text-sm"><input name="isOpenAccess" type="checkbox" defaultChecked={filters.isOpenAccess} className="size-4" />仅开放获取</label>
            <button type="submit" className="min-h-11 w-full rounded-lg bg-slate-900 px-4 font-semibold text-white hover:bg-slate-800">应用筛选</button>
          </form>
        </section>

        <section aria-live="polite" className="min-w-0 space-y-4">
          {error && <Status tone="error">{error}</Status>}
          {loading && !data && <Status>正在检索 OpenAlex…</Status>}
          {!loading && data?.works.length === 0 && <Status>没有找到匹配文献，请调整关键词或筛选条件。</Status>}
          {data?.works.map((work) => <WorkCard key={work.id} work={work} />)}
          {data?.nextCursor && <button type="button" disabled={loading} onClick={() => void loadMore(data.nextCursor!)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-5 font-semibold hover:bg-slate-50 disabled:opacity-50">{loading ? "加载中…" : "加载更多"}</button>}
        </section>

        <aside aria-label="智能检索说明" className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 text-sm text-slate-700 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold text-slate-950">本次检索</h2>
          <dl className="mt-4 space-y-3">
            <Info label="查询词" value={query} />
            <Info label="结果" value={data ? `找到 ${data.total.toLocaleString("zh-CN")} 条结果` : "正在统计"} />
            {mode === "ai" && <AiInfo plan={data?.aiPlan ?? null} fallback={data?.aiFallback ?? false} provider={data?.aiProvider ?? null} model={data?.aiModel ?? null} />}
            {relatedTerms.length > 0 && <Info label="扩展词" value={relatedTerms.join("、")} />}
            {relatedQueries.length > 0 && <Info label="联想检索句" value={relatedQueries.join("；")} />}
            {relatedError && <Info label="检索联想" value={relatedError} />}
            {data?.remainingAiUses !== null && data?.remainingAiUses !== undefined && <Info label="今日剩余" value={`${data.remainingAiUses} 次智能检索`} />}
          </dl>
          <p className="mt-5 border-t border-indigo-200 pt-4 text-slate-600">{data?.historySaved ? "已自动加入检索历史" : "登录后将自动保存检索历史"}</p>
        </aside>
      </div>
    </main>
  );
}

function WorkCard({ work }: { work: Work }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500"><span>{work.publicationYear ?? "年份暂无"}</span><span>·</span><span>{work.type || "类型暂无"}</span>{work.isOpenAccess && <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">开放获取</span>}</div>
      <h2 className="mt-3 text-xl font-bold leading-7 text-slate-950"><Link href={`/works/${work.id}`} className="hover:text-indigo-700">{work.title}</Link></h2>
      <p className="mt-3 text-sm text-slate-600">{work.authors.length ? work.authors.join("、") : "作者暂无"}</p>
      <p className="mt-1 text-sm text-slate-500">{work.source ?? "来源暂无"} · 被引 {work.citedByCount}</p>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{work.abstract ?? "暂无摘要"}</p>
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700"><span className="mb-1.5 block">{label}</span>{children}</label>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-semibold text-slate-950">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>;
}

function AiInfo({ plan, fallback, provider, model }: { plan: AiSearchPlan | null; fallback: boolean; provider: string | null; model: string | null }) {
  if (fallback) return <Info label="智能解析" value="解析失败，已退回原始关键词检索；本次不计入额度" />;
  return plan ? <><Info label="解析模型" value={[provider, model].filter(Boolean).join(" · ")} /><Info label="主题" value={plan.topics.join("、")} /><Info label="扩展关键词" value={[...plan.keywordsZh, ...plan.keywordsEn].join("、")} /></> : null;
}

function Status({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "error" }) {
  return <div className={`rounded-xl border p-5 ${tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-white text-slate-600"}`}>{children}</div>;
}

function numberOrUndefined(value: FormDataEntryValue | null) {
  const number = Number(value);
  return value && Number.isInteger(number) ? number : undefined;
}

function stringOrUndefined(value: FormDataEntryValue | null) {
  return typeof value === "string" && value ? value : undefined;
}

async function fetchSearch(request: SearchRequest): Promise<SearchServiceResponse> {
  const response = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const result = (await response.json()) as ResponseData;
  if (!response.ok || "error" in result) throw new Error("error" in result ? result.error : "检索失败");
  return result;
}
