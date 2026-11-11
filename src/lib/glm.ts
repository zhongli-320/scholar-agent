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

export type AiSearchPlan = z.infer<typeof aiSearchPlanSchema>;

const SYSTEM_PROMPT =
  "你是学术检索词规划器。只返回 JSON：topics、keywordsZh、keywordsEn、filters、explanation。filters 仅可含 fromYear、toYear、type、language、isOpenAccess、sort；关键词应适合 OpenAlex 题名与摘要检索，不得虚构论文。";

export function parseAiSearchPlan(content: string): AiSearchPlan | null {
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return aiSearchPlanSchema.parse(JSON.parse(cleaned));
  } catch {
    return null;
  }
}

export async function buildAiSearchPlan(
  query: string,
  fetcher: typeof fetch = fetch,
): Promise<AiSearchPlan | null> {
  const apiKey = process.env.GLM_API_KEY;
  const baseUrl = process.env.GLM_BASE_URL;
  const model = process.env.GLM_MODEL;
  if (!apiKey || !baseUrl || !model) return null;

  try {
    const anthropicCompatible = baseUrl.includes("/api/anthropic");
    const response = await fetcher(`${baseUrl.replace(/\/$/, "")}/${anthropicCompatible ? "v1/messages" : "chat/completions"}`, {
      method: "POST",
      headers: anthropicCompatible
        ? { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" }
        : { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(anthropicCompatible
        ? { model, max_tokens: 800, temperature: 0.1, system: SYSTEM_PROMPT, messages: [{ role: "user", content: query }] }
        : { model, temperature: 0.1, response_format: { type: "json_object" }, messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: query }] }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      content?: Array<{ type?: string; text?: string }>;
    };
    const content = anthropicCompatible
      ? data.content?.find((item) => item.type === "text")?.text
      : data.choices?.[0]?.message?.content;
    return content ? parseAiSearchPlan(content) : null;
  } catch {
    return null;
  }
}
