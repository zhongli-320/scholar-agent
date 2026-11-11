import { Suspense } from "react";

import { SearchResults } from "@/components/search-results";

export default function SearchPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-7xl px-4 py-10 text-slate-600">正在加载检索页面…</main>}>
      <SearchResults />
    </Suspense>
  );
}
