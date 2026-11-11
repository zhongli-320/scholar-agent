import { describe, expect, it } from "vitest";

import { getOpenAlexSuggestions, isSuggestionQueryReady } from "./suggestions";

describe("isSuggestionQueryReady", () => {
  it("requires two Chinese characters or three Latin characters", () => {
    expect(isSuggestionQueryReady("生")).toBe(false);
    expect(isSuggestionQueryReady("生成")).toBe(true);
    expect(isSuggestionQueryReady("AI")).toBe(false);
    expect(isSuggestionQueryReady("AIG")).toBe(true);
  });
});

describe("getOpenAlexSuggestions", () => {
  it("maps keyword autocomplete results to distinct terms and editable query suggestions", async () => {
    let requestUrl = "";
    const response = {
      meta: { count: 4, db_response_time_ms: 5, page: 1, per_page: 10 },
      results: [
        { id: "https://openalex.org/keywords/generative-ai", display_name: "生成式人工智能", hint: "", cited_by_count: 10, works_count: 5, entity_type: "keyword", external_id: null },
        { id: "https://openalex.org/keywords/education-technology", display_name: "教育技术", hint: "", cited_by_count: 9, works_count: 4, entity_type: "keyword", external_id: null },
        { id: "https://openalex.org/keywords/information-behavior", display_name: "信息行为", hint: "", cited_by_count: 8, works_count: 3, entity_type: "keyword", external_id: null },
        { id: "https://openalex.org/keywords/information-behavior-2", display_name: "信息行为", hint: "", cited_by_count: 7, works_count: 2, entity_type: "keyword", external_id: null },
      ],
    };

    const suggestions = await getOpenAlexSuggestions("生成式人工智能", async (url) => {
      requestUrl = String(url);
      return new Response(JSON.stringify(response));
    });

    const url = new URL(requestUrl);
    expect(url.pathname).toBe("/autocomplete/keywords");
    expect(url.searchParams.get("q")).toBe("生成式人工智能");
    expect(suggestions).toEqual({
      terms: ["教育技术", "信息行为"],
      queries: [
        "生成式人工智能与教育技术的关系",
        "生成式人工智能对信息行为的影响",
        "生成式人工智能领域的教育技术研究",
      ],
    });
  });

  it("falls back to work titles when Chinese keyword autocomplete is empty", async () => {
    const requestPaths: string[] = [];
    const suggestions = await getOpenAlexSuggestions("人工智能", async (url) => {
      requestPaths.push(new URL(String(url)).pathname);
      const results = requestPaths.length === 1
        ? []
        : [
            { display_name: "人工智能" },
            { display_name: "人工智能时代的本科翻译教学" },
            { display_name: "人工智能赋能高校学生思想政治教育研究" },
          ];
      return new Response(JSON.stringify({ results }));
    });

    expect(requestPaths).toEqual(["/autocomplete/keywords", "/autocomplete/works"]);
    expect(suggestions.terms).toEqual([
      "人工智能时代的本科翻译教学",
      "人工智能赋能高校学生思想政治教育研究",
    ]);
    expect(suggestions.queries).toEqual([
      "人工智能与人工智能时代的本科翻译教学的关系",
      "人工智能对人工智能赋能高校学生思想政治教育研究的影响",
      "人工智能领域的人工智能时代的本科翻译教学研究",
    ]);
  });
});
