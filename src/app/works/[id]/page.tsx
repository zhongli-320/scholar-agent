import { notFound } from "next/navigation";

import { CitationActions } from "@/components/citation-actions";
import { SaveWorkButton } from "@/components/save-work-button";
import { getOpenAlexWork } from "@/lib/openalex";

export const instant = false;

export default async function WorkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let work;
  try {
    work = await getOpenAlexWork(id);
  } catch {
    return <main className="mx-auto max-w-3xl px-4 py-16"><div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">论文服务暂时不可用，请稍后重试。</div></main>;
  }
  if (!work) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="flex flex-wrap gap-2 text-sm text-slate-500"><span>{work.publicationYear ?? "年份暂无"}</span><span>·</span><span>{work.type || "类型暂无"}</span><span>·</span><span>被引 {work.citedByCount}</span>{work.isOpenAccess && <span className="rounded-full bg-emerald-50 px-2 text-emerald-700">开放获取</span>}</div>
        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{work.title}</h1>
        <p className="mt-5 leading-7 text-slate-700">{work.authors.length ? work.authors.join("、") : "作者暂无"}</p>
        <dl className="mt-7 grid gap-4 rounded-xl bg-slate-50 p-5 text-sm sm:grid-cols-2">
          <Detail label="机构" value={work.institutions.join("、") || "暂无"} />
          <Detail label="来源" value={work.source ?? "暂无"} />
          <Detail label="DOI" value={work.doi ?? "暂无"} />
          <Detail label="主要主题" value={work.primaryTopic ?? "暂无"} />
        </dl>
        <section className="mt-8"><h2 className="text-xl font-bold">摘要</h2><p className="mt-3 whitespace-pre-wrap leading-8 text-slate-700">{work.abstract ?? "暂无摘要"}</p></section>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={work.openAlexUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center rounded-lg border border-slate-300 px-4 font-medium hover:bg-slate-50">OpenAlex</a>
          {work.openAccessUrl && <a href={work.openAccessUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center rounded-lg border border-slate-300 px-4 font-medium hover:bg-slate-50">全文来源</a>}
          {work.pdfUrl && <a href={work.pdfUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center rounded-lg border border-slate-300 px-4 font-medium hover:bg-slate-50">PDF</a>}
        </div>
        <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-start sm:justify-between"><SaveWorkButton work={work} /><CitationActions work={work} /></div>
      </article>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-semibold text-slate-950">{label}</dt><dd className="mt-1 break-words text-slate-600">{value}</dd></div>;
}
