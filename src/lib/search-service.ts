import type { AiProvider, AiSearchPlan, AiSearchPlanResult } from "./glm";
import type { SearchRequest, Work } from "./openalex";

export type SearchHistoryInput = {
  userId: string;
  query: string;
  mode: "basic" | "ai";
  filters: Omit<SearchRequest, "query" | "mode">;
  aiExplanation: AiSearchPlan | null;
  resultCount: number;
};

export type SearchDependencies = {
  getUser: () => Promise<{ id: string } | null>;
  getAiQuota: () => Promise<number>;
  consumeAiQuota: () => Promise<number>;
  buildAiPlan: (query: string) => Promise<AiSearchPlanResult>;
  searchWorks: (request: SearchRequest) => Promise<{
    works: Work[];
    total: number;
    nextCursor: string | null;
    searchExpression: string;
  }>;
  saveHistory: (input: SearchHistoryInput) => Promise<void>;
};

export type SearchServiceResponse = {
  works: Work[];
  total: number;
  nextCursor: string | null;
  searchExpression: string;
  aiPlan: AiSearchPlan | null;
  aiFallback: boolean;
  aiError: string | null;
  aiNotice: string | null;
  aiProvider: AiProvider | null;
  aiModel: string | null;
  remainingAiUses: number | null;
  historySaved: boolean;
};

export class SearchServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function executeSearch(
  request: SearchRequest,
  dependencies: SearchDependencies,
): Promise<SearchServiceResponse> {
  const user = await dependencies.getUser();
  let aiPlan: AiSearchPlan | null = null;
  let aiError: string | null = null;
  let aiNotice: string | null = null;
  let aiProvider: AiProvider | null = null;
  let aiModel: string | null = null;
  let remainingAiUses: number | null = null;

  if (request.mode === "ai") {
    if (!user) throw new SearchServiceError("请登录后使用智能检索", 401);
    remainingAiUses = await dependencies.getAiQuota();
    if (remainingAiUses <= 0) {
      throw new SearchServiceError("今日智能检索额度已用完，仍可使用普通检索", 429);
    }
    const attempt = await dependencies.buildAiPlan(request.query);
    aiError = attempt.error;
    if (attempt.plan) {
      aiPlan = attempt.plan;
      aiProvider = attempt.provider;
      aiModel = attempt.model;
      aiNotice = attempt.notice;
      remainingAiUses = await dependencies.consumeAiQuota();
      if (remainingAiUses < 0) {
        throw new SearchServiceError("今日智能检索额度已用完，仍可使用普通检索", 429);
      }
    }
  }

  const expandedQuery = aiPlan
    ? [request.query, ...aiPlan.keywordsZh, ...aiPlan.keywordsEn].join(" ")
    : request.query;
  const explicitRequest = Object.fromEntries(
    Object.entries(request).filter(([, value]) => value !== undefined),
  );
  const result = await dependencies.searchWorks({
    ...aiPlan?.filters,
    ...explicitRequest,
    query: expandedQuery,
  } as SearchRequest);

  let historySaved = false;
  if (user) {
    const { query, mode, ...filters } = request;
    await dependencies.saveHistory({
      userId: user.id,
      query,
      mode,
      filters,
      aiExplanation: aiPlan,
      resultCount: result.total,
    });
    historySaved = true;
  }

  return {
    ...result,
    aiPlan,
    aiFallback: request.mode === "ai" && !aiPlan,
    aiError,
    aiNotice,
    aiProvider,
    aiModel,
    remainingAiUses,
    historySaved,
  };
}
