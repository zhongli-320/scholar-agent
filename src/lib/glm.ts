import { z } from "zod";

const currentYear = new Date().getFullYear();
const aiFiltersSchema = z.object({
  fromYear: z.number().int().min(1800).max(currentYear + 1).optional(),
  toYear: z.number().int().min(1800).max(currentYear + 1).optional(),
  type: z.enum(["article", "book-chapter", "book", "dissertation", "review"]).optional(),
  language: z.enum(["zh", "en"]).optional(),
  isOpenAccess: z.boolean().optional(),
  sort: z.enum(["relevance", "newest", "cited"]).optional(),
}).refine(
  ({ fromYear, toYear }) => !fromYear || !toYear || fromYear <= toYear,
  { message: "起始年份不能晚于结束年份" },
);

const aiSearchPlanSchema = z.object({
  topics: z.array(z.string().trim().min(1)).min(1).max(5),
  keywordsZh: z.array(z.string().trim().min(1)).min(1).max(8),
  keywordsEn: z.array(z.string().trim().min(1)).min(1).max(8),
  filters: aiFiltersSchema.default({}),
  explanation: z.string().trim().min(1).max(300),
});

const aiSuggestionsSchema = z.object({
  terms: z.array(
    z.string().trim().min(2).max(40).refine(
      (term) => !/[。！？?!]/u.test(term),
      "联想词必须是短词组",
    ),
  ).min(4).max(6),
  queries: z.array(z.string().trim().min(4).max(80)).length(3),
});

export type AiSearchPlan = z.infer<typeof aiSearchPlanSchema>;
export type AiSuggestions = z.infer<typeof aiSuggestionsSchema>;
export type AiProvider = "GLM" | "SiliconFlow";
export type AiSearchPlanResult =
  | { plan: AiSearchPlan; error: null; provider: AiProvider; model: string; notice: string | null }
  | { plan: null; error: string };

type ModelConfig = {
  provider: AiProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
};

type ModelAttempt<T> =
  | { value: T; error: null }
  | { value: null; error: string; retryable: boolean };

const SYSTEM_PROMPT =
  "你是学术检索词规划器。只返回 JSON：topics、keywordsZh、keywordsEn、filters、explanation。filters 仅可含 fromYear、toYear、type、language、isOpenAccess、sort；关键词应适合 OpenAlex 题名与摘要检索，不得虚构论文。";
const SUGGESTIONS_SYSTEM_PROMPT =
  "你是学术检索联想生成器。只返回 JSON：terms、queries。terms 必须包含4至6个与输入直接相关的短学术词组，不得写完整句子、不得加序号、不得重复输入；queries 必须包含3个与输入同语种、可直接用于检索的自然学术表达，分别覆盖研究进展、时代或情境、应用或问题，不得照抄论文题名。例如输入‘信息组织’，queries 可包括‘信息组织研究进展’、‘数智化时代的信息组织’、‘信息组织的应用与挑战’。";

export function parseAiSearchPlan(content: string): AiSearchPlan | null {
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return aiSearchPlanSchema.parse(JSON.parse(cleaned));
  } catch {
    return null;
  }
}

export function parseAiSuggestions(content: string): AiSuggestions | null {
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return aiSuggestionsSchema.parse(JSON.parse(cleaned));
  } catch {
    return null;
  }
}

export async function buildAiSearchPlan(
  query: string,
  fetcher: typeof fetch = fetch,
): Promise<AiSearchPlanResult> {
  const configs = configuredModels();
  if (!configs.length) {
    console.error("GLM configuration is incomplete", {
      apiKey: Boolean(process.env.GLM_API_KEY),
      baseUrl: Boolean(process.env.GLM_BASE_URL),
      model: Boolean(process.env.GLM_MODEL),
    });
    return { plan: null, error: "智能解析服务配置不完整，请联系管理员" };
  }

  let lastError = "智能解析服务暂时不可用，请稍后重试";
  for (const [index, config] of configs.entries()) {
    const attempt = await requestStructuredOutput(
      config,
      query,
      fetcher,
      SYSTEM_PROMPT,
      parseAiSearchPlan,
      800,
      12_000,
    );
    if (attempt.value) {
      return {
        plan: attempt.value,
        error: null,
        provider: config.provider,
        model: config.model,
        notice: index > 0
          ? `优先模型暂时不可用，已由 ${config.provider}（${config.model}）完成智能解析`
          : null,
      };
    }
    lastError = attempt.error;
    if (!attempt.retryable) return { plan: null, error: attempt.error };
    if (index === configs.length - 1) {
      return {
        plan: null,
        error: configs.length > 1
          ? "全部智能解析模型当前均不可用，请稍后重试"
          : lastError,
      };
    }
  }
  return { plan: null, error: lastError };
}

export async function buildAiSuggestions(
  query: string,
  fetcher: typeof fetch = fetch,
): Promise<AiSuggestions | null> {
  for (const config of configuredModels()) {
    const attempt = await requestStructuredOutput(
      config,
      query,
      fetcher,
      SUGGESTIONS_SYSTEM_PROMPT,
      parseAiSuggestions,
      400,
      12_000,
    );
    if (attempt.value) return attempt.value;
    if (!attempt.retryable) return null;
  }
  return null;
}

function configuredModels(): ModelConfig[] {
  const apiKey = process.env.GLM_API_KEY;
  const baseUrl = process.env.GLM_BASE_URL;
  const model = process.env.GLM_MODEL;
  if (!apiKey || !baseUrl || !model) return [];

  const configs: ModelConfig[] = [{ provider: "GLM", apiKey, baseUrl, model }];
  const fallbackModel = process.env.GLM_FALLBACK_MODEL;
  if (fallbackModel && fallbackModel !== model) {
    configs.push({
      provider: "GLM",
      apiKey: process.env.GLM_FALLBACK_API_KEY || apiKey,
      baseUrl,
      model: fallbackModel,
    });
  }
  const siliconApiKey = process.env.SILICONFLOW_API_KEY;
  const siliconBaseUrl = process.env.SILICONFLOW_BASE_URL;
  const siliconModel = process.env.SILICONFLOW_MODEL;
  if (siliconApiKey && siliconBaseUrl && siliconModel) {
    configs.push({
      provider: "SiliconFlow",
      apiKey: siliconApiKey,
      baseUrl: siliconBaseUrl,
      model: siliconModel,
    });
  }
  return configs;
}

async function requestStructuredOutput<T>(
  config: ModelConfig,
  query: string,
  fetcher: typeof fetch,
  systemPrompt: string,
  parse: (content: string) => T | null,
  maxTokens: number,
  timeout: number,
): Promise<ModelAttempt<T>> {
  try {
    const anthropicCompatible = config.baseUrl.includes("/api/anthropic");
    const response = await fetcher(`${config.baseUrl.replace(/\/$/, "")}/${anthropicCompatible ? "v1/messages" : "chat/completions"}`, {
      method: "POST",
      headers: anthropicCompatible
        ? { "x-api-key": config.apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" }
        : { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(anthropicCompatible
        ? { model: config.model, max_tokens: maxTokens, temperature: 0.1, system: systemPrompt, messages: [{ role: "user", content: query }] }
        : { model: config.model, temperature: 0.1, enable_thinking: false, response_format: { type: "json_object" }, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: query }] }),
      signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      console.error("AI model request failed", {
        provider: config.provider,
        model: config.model,
        status: response.status,
        detail,
      });
      return {
        value: null,
        error: modelHttpError(config.provider, response.status),
        retryable: isTemporaryStatus(response.status),
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      content?: Array<{ type?: string; text?: string }>;
    };
    const content = anthropicCompatible
      ? data.content?.find((item) => item.type === "text")?.text
      : data.choices?.[0]?.message?.content;
    const value = content ? parse(content) : null;
    if (!value) {
      console.error("AI model returned invalid structured output", {
        provider: config.provider,
        model: config.model,
        content: content?.slice(0, 500),
      });
      return { value: null, error: "智能解析返回格式无效", retryable: false };
    }
    return { value, error: null };
  } catch (error) {
    console.error("AI model request threw", {
      provider: config.provider,
      model: config.model,
      error,
    });
    return {
      value: null,
      error: error instanceof Error && error.name === "TimeoutError"
        ? "智能解析请求超时"
        : "无法连接智能解析服务",
      retryable: true,
    };
  }
}

function modelHttpError(provider: AiProvider, status: number) {
  if (status === 401 || status === 403) return `智能解析鉴权失败，请联系管理员检查 ${provider} API 密钥`;
  if (status === 404) return `智能解析接口或模型不可用，请联系管理员检查 ${provider} 地址与模型名`;
  if (status === 429) return "智能解析服务请求过多，请稍后重试";
  if (status === 529) return `${provider} 模型当前访问量过大，请稍后重试`;
  if (status >= 500) return "智能解析服务暂时不可用，请稍后重试";
  return `智能解析请求失败（${provider} ${status}）`;
}

function isTemporaryStatus(status: number) {
  return status === 429 || status === 529 || status >= 500;
}
