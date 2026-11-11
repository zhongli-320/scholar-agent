import { describe, expect, it } from "vitest";

import type { Work } from "./openalex";
import { executeSearch, type SearchDependencies } from "./search-service";

const result = {
  works: [{ id: "W1", title: "Paper" } as Work],
  total: 1,
  nextCursor: null,
};

function dependencies(overrides: Partial<SearchDependencies> = {}): SearchDependencies {
  return {
    getUser: async () => null,
    getAiQuota: async () => 2,
    consumeAiQuota: async () => 1,
    buildAiPlan: async () => ({ plan: null, error: "智能解析请求失败" }),
    searchWorks: async () => result,
    saveHistory: async () => undefined,
    ...overrides,
  };
}

describe("executeSearch", () => {
  it("allows anonymous basic search without saving history", async () => {
    const response = await executeSearch(
      { query: "信息行为", mode: "basic", sort: "relevance" },
      dependencies({ saveHistory: async () => { throw new Error("must not save"); } }),
    );

    expect(response.total).toBe(1);
    expect(response.historySaved).toBe(false);
  });

  it("rejects AI search when the user is anonymous", async () => {
    await expect(
      executeSearch(
        { query: "信息行为", mode: "ai", sort: "relevance" },
        dependencies(),
      ),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("rejects the third AI search when quota is exhausted", async () => {
    await expect(
      executeSearch(
        { query: "信息行为", mode: "ai", sort: "relevance" },
        dependencies({
          getUser: async () => ({ id: "user-1" }),
          getAiQuota: async () => 0,
        }),
      ),
    ).rejects.toMatchObject({ status: 429 });
  });

  it("does not consume quota when GLM parsing fails", async () => {
    let searchedQuery = "";
    let quotaConsumed = false;
    const response = await executeSearch(
      { query: "信息行为", mode: "ai", sort: "relevance" },
      dependencies({
        getUser: async () => ({ id: "user-1" }),
        buildAiPlan: async () => ({ plan: null, error: "智能解析返回格式无效" }),
        consumeAiQuota: async () => {
          quotaConsumed = true;
          return 1;
        },
        searchWorks: async (request) => {
          searchedQuery = request.query;
          return result;
        },
      }),
    );

    expect(searchedQuery).toBe("信息行为");
    expect(quotaConsumed).toBe(false);
    expect(response.aiFallback).toBe(true);
    expect(response.aiError).toBe("智能解析返回格式无效");
    expect(response.remainingAiUses).toBe(2);
  });

  it("applies validated AI filters while preserving explicit user filters", async () => {
    let searchedRequest: Parameters<SearchDependencies["searchWorks"]>[0] | null = null;
    await executeSearch(
      { query: "近年中文生成式人工智能研究", mode: "ai", sort: "newest" },
      dependencies({
        getUser: async () => ({ id: "user-1" }),
        buildAiPlan: async () => ({
          plan: {
            topics: ["生成式人工智能"],
            keywordsZh: ["生成式人工智能"],
            keywordsEn: ["generative AI"],
            filters: { fromYear: 2022, language: "zh", sort: "cited" },
            explanation: "提取年份和语言条件",
          },
          error: null,
        }),
        searchWorks: async (request) => {
          searchedRequest = request;
          return result;
        },
      }),
    );

    expect(searchedRequest).toMatchObject({ fromYear: 2022, language: "zh", sort: "newest" });
  });

  it("saves every successful authenticated search automatically", async () => {
    let savedQuery = "";
    const response = await executeSearch(
      { query: "AI", mode: "basic", sort: "newest" },
      dependencies({
        getUser: async () => ({ id: "user-1" }),
        saveHistory: async (history) => {
          savedQuery = history.query;
        },
      }),
    );

    expect(savedQuery).toBe("AI");
    expect(response.historySaved).toBe(true);
  });
});
