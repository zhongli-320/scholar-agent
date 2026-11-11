import { buildAiSuggestions, type AiSuggestions } from "./glm";
import {
  getOpenAlexSuggestions,
  isSuggestionQueryReady,
  type SearchSuggestions,
} from "./suggestions";

type AiSuggestionBuilder = (query: string) => Promise<AiSuggestions | null>;

export async function getSearchSuggestions(
  query: string,
  aiBuilder: AiSuggestionBuilder = buildAiSuggestions,
  fetcher: typeof fetch = fetch,
): Promise<SearchSuggestions> {
  const normalized = query.trim();
  if (!isSuggestionQueryReady(normalized)) return { terms: [], queries: [] };

  return await aiBuilder(normalized) ?? getOpenAlexSuggestions(normalized, fetcher);
}
