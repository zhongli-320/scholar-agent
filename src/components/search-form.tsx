"use client";

import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

import { isSuggestionQueryReady, type SearchSuggestions } from "@/lib/suggestions";

export function SearchForm({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [edited, setEdited] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestions>({ terms: [], queries: [] });
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const options = [...suggestions.terms, ...suggestions.queries];

  useEffect(() => {
    if (!edited || !isSuggestionQueryReady(query)) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`/api/suggestions?q=${encodeURIComponent(query.trim())}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const result = await response.json() as SearchSuggestions | { error: string };
          if (!response.ok || "error" in result) {
            throw new Error("error" in result ? result.error : "联想服务暂时不可用");
          }
          return result;
        })
        .then((result) => {
          setSuggestions(result);
          setSuggestionError(null);
          setActiveIndex(-1);
        })
        .catch((error: unknown) => {
          if (error instanceof Error && error.name === "AbortError") return;
          setSuggestions({ terms: [], queries: [] });
          setSuggestionError(error instanceof Error ? error.message : "联想服务暂时不可用");
        });
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [edited, query]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const mode = submitter?.value === "ai" ? "ai" : "basic";
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}&mode=${mode}`);
  }

  function selectSuggestion(value: string) {
    setQuery(value);
    setEdited(false);
    setSuggestions({ terms: [], queries: [] });
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!options.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? options.length - 1 : current - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(options[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setSuggestions({ terms: [], queries: [] });
      setActiveIndex(-1);
    }
  }

  return (
    <form onSubmit={search} className="rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-xl shadow-slate-200/60">
      <label htmlFor="search-query" className="sr-only">研究问题或关键词</label>
      <div className="relative">
        <textarea
          ref={inputRef}
          id="search-query"
          name="query"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setEdited(true);
            setSuggestions({ terms: [], queries: [] });
            setActiveIndex(-1);
            setSuggestionError(null);
          }}
          onKeyDown={handleKeyDown}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `search-suggestion-${activeIndex}` : undefined}
          placeholder="例如：生成式人工智能如何影响大学生的信息行为？"
          rows={3}
          required
          className="w-full resize-none rounded-xl border-0 bg-slate-50 px-4 py-3 text-base text-slate-950 placeholder:text-slate-400"
        />
        {(options.length > 0 || suggestionError) && (
          <div className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
            {suggestionError ? (
              <p className="px-3 py-2 text-sm text-amber-700">{suggestionError}</p>
            ) : (
              <div id="search-suggestions" role="listbox" aria-label="检索联想">
                <SuggestionGroup label="联想词" items={suggestions.terms} offset={0} activeIndex={activeIndex} onSelect={selectSuggestion} />
                <SuggestionGroup label="联想检索句" items={suggestions.queries} offset={suggestions.terms.length} activeIndex={activeIndex} onSelect={selectSuggestion} />
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button type="submit" value="basic" className="min-h-11 rounded-xl border border-slate-300 px-5 font-semibold text-slate-700 hover:bg-slate-50">普通检索</button>
        <button type="submit" value="ai" className="min-h-11 rounded-xl bg-indigo-600 px-5 font-semibold text-white hover:bg-indigo-700">智能检索</button>
      </div>
    </form>
  );
}

function SuggestionGroup({
  label,
  items,
  offset,
  activeIndex,
  onSelect,
}: {
  label: string;
  items: string[];
  offset: number;
  activeIndex: number;
  onSelect: (value: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="py-1">
      <p className="px-3 py-1 text-xs font-semibold text-slate-500">{label}</p>
      {items.map((item, index) => {
        const optionIndex = offset + index;
        return (
          <button
            id={`search-suggestion-${optionIndex}`}
            key={`${label}-${item}`}
            type="button"
            role="option"
            aria-selected={activeIndex === optionIndex}
            onClick={() => onSelect(item)}
            className={`block min-h-10 w-full rounded-lg px-3 py-2 text-left text-sm ${activeIndex === optionIndex ? "bg-indigo-50 text-indigo-800" : "text-slate-700 hover:bg-slate-50"}`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
