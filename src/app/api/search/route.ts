import { NextResponse } from "next/server";

import { buildAiSearchPlan } from "@/lib/glm";
import { searchOpenAlex } from "@/lib/openalex";
import { searchRequestSchema } from "@/lib/search-schema";
import { executeSearch, SearchServiceError } from "@/lib/search-service";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求内容不是有效 JSON" }, { status: 400 });
  }

  const parsed = searchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "检索条件无效", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const configuredLimit = Number(process.env.AI_DAILY_LIMIT ?? "2");
  const dailyLimit = Number.isInteger(configuredLimit) ? configuredLimit : 2;
  try {
    const result = await executeSearch(parsed.data, {
      async getUser() {
        if (!supabase) return null;
        const { data } = await supabase.auth.getUser();
        return data.user ? { id: data.user.id } : null;
      },
      async getAiQuota() {
        if (!supabase) return 0;
        const today = new Date().toISOString().slice(0, 10);
        const { data, error } = await supabase
          .from("ai_daily_usage")
          .select("used_count")
          .eq("usage_date", today)
          .maybeSingle();
        if (error) throw new SearchServiceError("无法验证智能检索额度", 503);
        return Math.max(0, dailyLimit - (data?.used_count ?? 0));
      },
      async consumeAiQuota() {
        if (!supabase) return -1;
        const { data, error } = await supabase.rpc("consume_ai_quota", {
          daily_limit: dailyLimit,
        });
        if (error) throw new SearchServiceError("无法验证智能检索额度", 503);
        return data;
      },
      buildAiPlan: buildAiSearchPlan,
      searchWorks: searchOpenAlex,
      async saveHistory(history) {
        if (!supabase) return;
        const { error } = await supabase.from("search_history").insert({
          user_id: history.userId,
          query: history.query,
          mode: history.mode,
          filters: history.filters,
          ai_explanation: history.aiExplanation,
          result_count: history.resultCount,
        });
        if (error) throw new SearchServiceError("检索成功，但无法保存检索历史", 503);
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SearchServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Search failed", error);
    return NextResponse.json(
      { error: "文献服务暂时不可用，请稍后重试" },
      { status: 502 },
    );
  }
}
