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

function configureProviders() {
  vi.stubEnv("GLM_API_KEY", "glm-key");
  vi.stubEnv("GLM_BASE_URL", "https://open.bigmodel.cn/api/anthropic");
  vi.stubEnv("GLM_MODEL", "glm-5.3-flash");
  vi.stubEnv("GLM_FALLBACK_API_KEY", "glm-fallback-key");
  vi.stubEnv("GLM_FALLBACK_MODEL", "GLM-4.7-Flash");
  vi.stubEnv("SILICONFLOW_API_KEY", "silicon-key");
  vi.stubEnv("SILICONFLOW_BASE_URL", "https://api.siliconflow.cn/v1");
  vi.stubEnv("SILICONFLOW_MODEL", "deepseek-ai/DeepSeek-R1-0528-Qwen3-8B");
}

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
    configureProviders();
    const requests: Array<{ url: string; init?: RequestInit }> = [];

    const result = await buildAiSearchPlan("中文生成式人工智能研究", async (url, init) => {
      requests.push({ url: String(url), init });
      return new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(plan) }] }));
    });

    expect(result).toEqual({ plan, error: null, provider: "GLM", model: "glm-5.3-flash", notice: null });
    expect(requests[0].url).toBe("https://open.bigmodel.cn/api/anthropic/v1/messages");
    expect(new Headers(requests[0].init?.headers).get("x-api-key")).toBe("glm-key");
    expect(JSON.parse(String(requests[0].init?.body))).toMatchObject({ model: "glm-5.3-flash", max_tokens: 800 });
  });

  it("tries GLM 4.7 and then SiliconFlow after temporary provider failures", async () => {
    configureProviders();
    const models: string[] = [];

    const result = await buildAiSearchPlan("中文生成式人工智能研究", async (_url, init) => {
      const model = JSON.parse(String(init?.body)).model as string;
      models.push(model);
      if (model === "glm-5.3-flash") return new Response("overloaded", { status: 529 });
      if (model === "GLM-4.7-Flash") return new Response("unavailable", { status: 503 });
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(plan) } }] }));
    });

    expect(models).toEqual([
      "glm-5.3-flash",
      "GLM-4.7-Flash",
      "deepseek-ai/DeepSeek-R1-0528-Qwen3-8B",
    ]);
    expect(result).toEqual({
      plan,
      error: null,
      provider: "SiliconFlow",
      model: "deepseek-ai/DeepSeek-R1-0528-Qwen3-8B",
      notice: "优先模型暂时不可用，已由 SiliconFlow（deepseek-ai/DeepSeek-R1-0528-Qwen3-8B）完成智能解析",
    });
  });

  it("uses the fallback GLM key for the fallback GLM model", async () => {
    configureProviders();
    const requests: Array<[string, string | null]> = [];

    await buildAiSearchPlan("中文生成式人工智能研究", async (_url, init) => {
      const model = JSON.parse(String(init?.body)).model as string;
      requests.push([model, new Headers(init?.headers).get("x-api-key")]);
      if (model === "glm-5.3-flash") return new Response("overloaded", { status: 529 });
      return new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(plan) }] }));
    });

    expect(requests).toEqual([
      ["glm-5.3-flash", "glm-key"],
      ["GLM-4.7-Flash", "glm-fallback-key"],
    ]);
  });

  it("returns an actionable error when GLM rejects the credentials", async () => {
    configureProviders();
    let requests = 0;

    const result = await buildAiSearchPlan(
      "中文生成式人工智能研究",
      async () => {
        requests += 1;
        return new Response('{"error":{"message":"invalid api key"}}', { status: 401 });
      },
    );

    expect(result).toEqual({
      plan: null,
      error: "智能解析鉴权失败，请联系管理员检查 GLM API 密钥",
    });
    expect(requests).toBe(1);
  });

  it("reports GLM overloads without hiding the reason", async () => {
    configureProviders();

    const result = await buildAiSearchPlan(
      "中文生成式人工智能研究",
      async () => new Response('{"error":{"code":"1305"}}', { status: 529 }),
    );

    expect(result.error).toBe("全部智能解析模型当前均不可用，请稍后重试");
  });
});
