import { NextResponse } from "next/server";

import { getOpenAlexSuggestions, isSuggestionQueryReady } from "@/lib/suggestions";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!isSuggestionQueryReady(query)) {
    return NextResponse.json({ terms: [], queries: [] });
  }

  try {
    return NextResponse.json(await getOpenAlexSuggestions(query));
  } catch (error) {
    console.error("OpenAlex suggestions failed", error);
    return NextResponse.json({ error: "联想服务暂时不可用" }, { status: 502 });
  }
}
