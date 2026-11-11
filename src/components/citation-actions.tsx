"use client";

import { toBibtex, toRis } from "@/lib/citations";
import type { Work } from "@/lib/openalex";

export function CitationActions({ work }: { work: Work }) {
  return <div className="flex flex-wrap gap-2"><button type="button" onClick={() => download(`${work.id}.bib`, toBibtex(work), "application/x-bibtex")} className="min-h-11 rounded-lg border border-slate-300 px-4 font-medium hover:bg-slate-50">导出 BibTeX</button><button type="button" onClick={() => download(`${work.id}.ris`, toRis(work), "application/x-research-info-systems")} className="min-h-11 rounded-lg border border-slate-300 px-4 font-medium hover:bg-slate-50">导出 RIS</button></div>;
}

export function download(filename: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
