import { NextResponse } from "next/server";

import { getSearchSuggestions } from "@/lib/search-suggestions";
import { isSuggestionQueryReady } from "@/lib/suggestions";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!isSuggestionQueryReady(query)) {
    return NextResponse.json({ terms: [], queries: [] });
  }

  try {
    return NextResponse.json(await getSearchSuggestions(query, request.signal));
  } catch (error) {
    console.error("Search suggestions failed", error);
    return NextResponse.json({ error: "联想服务暂时不可用" }, { status: 502 });
  }
}
