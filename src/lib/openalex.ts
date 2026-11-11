export type SearchMode = "basic" | "ai";
export type SearchSort = "relevance" | "newest" | "cited";

export type SearchRequest = {
  query: string;
  mode: SearchMode;
  fromYear?: number;
  toYear?: number;
  type?: string;
  language?: string;
  isOpenAccess?: boolean;
  sort?: SearchSort;
  cursor?: string;
};

export type Work = {
  id: string;
  openAlexUrl: string;
  doi: string | null;
  title: string;
  publicationYear: number | null;
  publicationDate: string | null;
  type: string;
  language: string | null;
  citedByCount: number;
  abstract: string | null;
  authors: string[];
  institutions: string[];
  source: string | null;
  landingPageUrl: string | null;
  pdfUrl: string | null;
  isOpenAccess: boolean;
  openAccessStatus: string;
  openAccessUrl: string | null;
  primaryTopic: string | null;
};

type OpenAlexLocation = {
  landing_page_url: string | null;
  pdf_url: string | null;
  source: { id: string; display_name: string } | null;
};

export type OpenAlexWork = {
  id: string;
  doi: string | null;
  title: string | null;
  display_name: string | null;
  publication_year: number | null;
  publication_date: string | null;
  type: string;
  language: string | null;
  cited_by_count: number;
  abstract_inverted_index: Record<string, number[]> | null;
  authorships: Array<{
    author: { id: string; display_name: string };
    institutions: Array<{ id: string; display_name: string }>;
  }>;
  primary_location: OpenAlexLocation | null;
  best_oa_location: OpenAlexLocation | null;
  open_access: { is_oa: boolean; oa_status: string; oa_url: string | null };
  primary_topic: { id: string; display_name: string } | null;
};

type OpenAlexListResponse = {
  meta: { count: number; next_cursor: string | null };
  results: OpenAlexWork[];
};

const SORTS: Record<SearchSort, string> = {
  relevance: "relevance_score:desc",
  newest: "publication_date:desc",
  cited: "cited_by_count:desc",
};

const SELECT_FIELDS = [
  "id",
  "doi",
  "title",
  "display_name",
  "publication_year",
  "publication_date",
  "type",
  "language",
  "cited_by_count",
  "abstract_inverted_index",
  "authorships",
  "primary_location",
  "best_oa_location",
  "open_access",
  "primary_topic",
].join(",");

export function buildOpenAlexHeaders(apiKey = process.env.OPENALEX_API_KEY) {
  return {
    Accept: "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
}

export function buildOpenAlexWorksUrl(
  request: SearchRequest,
  mailto?: string,
): string {
  const url = new URL("https://api.openalex.org/works");
  const filters: string[] = [];

  url.searchParams.set("search", request.query.trim());
  if (request.fromYear) filters.push(`from_publication_date:${request.fromYear}-01-01`);
  if (request.toYear) filters.push(`to_publication_date:${request.toYear}-12-31`);
  if (request.type) filters.push(`type:${request.type}`);
  if (request.language) filters.push(`language:${request.language}`);
  if (request.isOpenAccess) filters.push("is_oa:true");
  if (filters.length) url.searchParams.set("filter", filters.join(","));

  url.searchParams.set("sort", SORTS[request.sort ?? "relevance"]);
  url.searchParams.set("cursor", request.cursor ?? "*");
  url.searchParams.set("per-page", "20");
  url.searchParams.set("select", SELECT_FIELDS);
  if (mailto) url.searchParams.set("mailto", mailto);

  return url.toString();
}

export function reconstructAbstract(
  invertedIndex: Record<string, number[]> | null,
): string | null {
  if (!invertedIndex) return null;

  const words = Object.entries(invertedIndex)
    .flatMap(([word, positions]) => positions.map((position) => ({ word, position })))
    .sort((a, b) => a.position - b.position)
    .map(({ word }) => word);

  return words.length ? words.join(" ") : null;
}

export function normalizeOpenAlexWork(raw: OpenAlexWork): Work {
  const institutions = Array.from(
    new Set(
      raw.authorships.flatMap(({ institutions }) =>
        institutions.map(({ display_name }) => display_name),
      ),
    ),
  );

  return {
    id: raw.id.replace("https://openalex.org/", ""),
    openAlexUrl: raw.id,
    doi: raw.doi?.replace("https://doi.org/", "") ?? null,
    title: raw.title ?? raw.display_name ?? "暂无题名",
    publicationYear: raw.publication_year,
    publicationDate: raw.publication_date,
    type: raw.type,
    language: raw.language,
    citedByCount: raw.cited_by_count,
    abstract: reconstructAbstract(raw.abstract_inverted_index),
    authors: raw.authorships.map(({ author }) => author.display_name),
    institutions,
    source: raw.primary_location?.source?.display_name ?? null,
    landingPageUrl: raw.primary_location?.landing_page_url ?? null,
    pdfUrl: raw.best_oa_location?.pdf_url ?? raw.primary_location?.pdf_url ?? null,
    isOpenAccess: raw.open_access.is_oa,
    openAccessStatus: raw.open_access.oa_status,
    openAccessUrl: raw.open_access.oa_url,
    primaryTopic: raw.primary_topic?.display_name ?? null,
  };
}

export async function searchOpenAlex(
  request: SearchRequest,
  fetcher: typeof fetch = fetch,
): Promise<{ works: Work[]; total: number; nextCursor: string | null; searchExpression: string }> {
  const requestUrl = buildOpenAlexWorksUrl(request, process.env.OPENALEX_MAILTO);
  const response = await fetcher(
    requestUrl,
    { headers: buildOpenAlexHeaders(), cache: "no-store" },
  );
  if (!response.ok) throw new Error(`OpenAlex request failed (${response.status})`);

  const data = (await response.json()) as OpenAlexListResponse;
  const params = new URL(requestUrl).searchParams;
  const filter = params.get("filter");
  return {
    works: data.results.map(normalizeOpenAlexWork),
    total: data.meta.count,
    nextCursor: data.meta.next_cursor,
    searchExpression: [
      `search=${JSON.stringify(params.get("search") ?? "")}`,
      filter ? `AND filter=(${filter})` : null,
      `SORT ${params.get("sort")}`,
    ].filter(Boolean).join(" "),
  };
}

export async function getOpenAlexWork(
  id: string,
  fetcher: typeof fetch = fetch,
): Promise<Work | null> {
  if (!/^W\d+$/.test(id)) return null;

  const url = new URL(`https://api.openalex.org/works/${id}`);
  url.searchParams.set("select", SELECT_FIELDS);
  if (process.env.OPENALEX_MAILTO) {
    url.searchParams.set("mailto", process.env.OPENALEX_MAILTO);
  }

  const response = await fetcher(url, { headers: buildOpenAlexHeaders() });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`OpenAlex request failed (${response.status})`);
  return normalizeOpenAlexWork((await response.json()) as OpenAlexWork);
}
