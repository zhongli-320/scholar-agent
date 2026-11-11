import { buildOpenAlexHeaders } from "./openalex";

export type SearchSuggestions = {
  terms: string[];
  queries: string[];
};

type OpenAlexAutocompleteResponse = {
  results: Array<{ display_name: string }>;
};

export function isSuggestionQueryReady(query: string) {
  const normalized = query.trim();
  return /[\u3400-\u9fff]/u.test(normalized)
    ? normalized.length >= 2
    : normalized.length >= 3;
}

export async function getOpenAlexSuggestions(
  query: string,
  fetcher: typeof fetch = fetch,
): Promise<SearchSuggestions> {
  const normalized = query.trim();
  if (!isSuggestionQueryReady(normalized)) return { terms: [], queries: [] };

  const url = new URL("https://api.openalex.org/autocomplete/keywords");
  url.searchParams.set("q", normalized);
  if (process.env.OPENALEX_MAILTO) url.searchParams.set("mailto", process.env.OPENALEX_MAILTO);

  const response = await fetcher(url, {
    headers: buildOpenAlexHeaders(),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`OpenAlex suggestions failed (${response.status})`);

  let data = (await response.json()) as OpenAlexAutocompleteResponse;
  const terms = uniqueTerms(data.results, normalized);
  let queries: string[] = [];

  if (!terms.length && /[\u3400-\u9fff]/u.test(normalized)) {
    url.pathname = "/autocomplete/works";
    const worksResponse = await fetcher(url, {
      headers: buildOpenAlexHeaders(),
      cache: "no-store",
    });
    if (!worksResponse.ok) throw new Error(`OpenAlex suggestions failed (${worksResponse.status})`);
    data = (await worksResponse.json()) as OpenAlexAutocompleteResponse;
    queries = uniqueTerms(data.results, normalized).slice(0, 3);
  }

  return { terms, queries: queries.length ? queries : buildRelatedQueries(normalized, terms) };
}

function uniqueTerms(results: OpenAlexAutocompleteResponse["results"], query: string) {
  const seen = new Set([query.toLocaleLowerCase()]);
  return results
    .map(({ display_name }) => display_name.trim())
    .filter((term) => {
      const key = term.toLocaleLowerCase();
      if (!term || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

export function buildRelatedQueries(query: string, terms: string[]) {
  if (!terms.length) return [];
  const term = (index: number) => terms[index] ?? terms[0];
  if (/[\u3400-\u9fff]/u.test(query)) {
    return [
      `${query}与${term(0)}的关系`,
      `${query}对${term(1)}的影响`,
      `${query}领域的${term(2)}研究`,
    ];
  }
  return [0, 1, 2].map((index) => `${query} AND "${term(index)}"`);
}
