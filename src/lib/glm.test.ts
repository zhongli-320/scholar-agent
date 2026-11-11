import { afterEach, describe, expect, it, vi } from "vitest";

import { buildAiSearchPlan, parseAiSearchPlan } from "./glm";

const plan = {
  topics: ["生成式人工智能"],
  keywordsZh: ["生成式人工智能"],
  keywordsEn: ["generative AI"],
  filters: { language: "zh" as const },
  explanation: "扩展中英文关键词",
};

afterEach(() => vi.unstubAllEnvs());

describe("parseAiSearchPlan", () => {
  it("accepts a valid structured plan", () => {
    expect(
      parseAiSearchPlan(
        JSON.stringify({
          topics: ["生成式人工智能", "信息行为"],
          keywordsZh: ["生成式人工智能", "信息搜寻"],
          keywordsEn: ["generative AI", "information seeking"],
          filters: { fromYear: 2022, language: "zh", type: "article" },
          explanation: "扩展中英文同义词",
        }),
      ),
    ).toEqual({
      topics: ["生成式人工智能", "信息行为"],
      keywordsZh: ["生成式人工智能", "信息搜寻"],
      keywordsEn: ["generative AI", "information seeking"],
      filters: { fromYear: 2022, language: "zh", type: "article" },
      explanation: "扩展中英文同义词",
    });
  });

  it("returns null for malformed or incomplete model output", () => {
    expect(parseAiSearchPlan("```json\n{bad}\n```" )).toBeNull();
    expect(parseAiSearchPlan('{"topics":[]}')).toBeNull();
    expect(parseAiSearchPlan(JSON.stringify({
      topics: ["AI"], keywordsZh: ["人工智能"], keywordsEn: ["AI"],
      filters: { fromYear: 2025, toYear: 2020 }, explanation: "无效年份",
    }))).toBeNull();
  });
});

describe("buildAiSearchPlan", () => {
  it("uses the Anthropic-compatible messages endpoint when configured", async () => {
    vi.stubEnv("GLM_API_KEY", "test-key");
    vi.stubEnv("GLM_BASE_URL", "https://open.bigmodel.cn/api/anthropic");
    vi.stubEnv("GLM_MODEL", "GLM-4.7-Flash");
    const requests: Array<{ url: string; init?: RequestInit }> = [];

    const result = await buildAiSearchPlan("中文生成式人工智能研究", async (url, init) => {
      requests.push({ url: String(url), init });
      return new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(plan) }] }));
    });

    expect(result).toEqual(plan);
    expect(requests[0].url).toBe("https://open.bigmodel.cn/api/anthropic/v1/messages");
    expect(new Headers(requests[0].init?.headers).get("x-api-key")).toBe("test-key");
    expect(JSON.parse(String(requests[0].init?.body))).toMatchObject({ model: "GLM-4.7-Flash", max_tokens: 800 });
  });
});
