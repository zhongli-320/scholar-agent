import { describe, expect, it } from "vitest";

import {
  buildOpenAlexHeaders,
  buildOpenAlexWorksUrl,
  normalizeOpenAlexWork,
  reconstructAbstract,
  searchOpenAlex,
} from "./openalex";

describe("buildOpenAlexHeaders", () => {
  it("keeps the OpenAlex API key on the server in an authorization header", () => {
    expect(buildOpenAlexHeaders("test-key")).toEqual({
      Accept: "application/json",
      Authorization: "Bearer test-key",
    });
    expect(buildOpenAlexHeaders("")).toEqual({ Accept: "application/json" });
  });
});

describe("buildOpenAlexWorksUrl", () => {
  it("maps Chinese filters, citation sorting and cursor pagination", () => {
    const url = new URL(
      buildOpenAlexWorksUrl(
        {
          query: "生成式人工智能",
          mode: "basic",
          fromYear: 2022,
          toYear: 2026,
          type: "article",
          language: "zh",
          isOpenAccess: true,
          sort: "cited",
          cursor: "next-page",
        },
        "contact@example.com",
      ),
    );

    expect(url.origin + url.pathname).toBe("https://api.openalex.org/works");
    expect(url.searchParams.get("search")).toBe("生成式人工智能");
    expect(url.searchParams.get("filter")).toBe(
      "from_publication_date:2022-01-01,to_publication_date:2026-12-31,type:article,language:zh,is_oa:true",
    );
    expect(url.searchParams.get("sort")).toBe("cited_by_count:desc");
    expect(url.searchParams.get("cursor")).toBe("next-page");
    expect(url.searchParams.get("per-page")).toBe("20");
    expect(url.searchParams.get("mailto")).toBe("contact@example.com");
  });

  it("uses relevance sorting and the first cursor by default", () => {
    const url = new URL(
      buildOpenAlexWorksUrl({ query: "information behavior", mode: "basic" }),
    );

    expect(url.searchParams.get("sort")).toBe("relevance_score:desc");
    expect(url.searchParams.get("cursor")).toBe("*");
    expect(url.searchParams.has("filter")).toBe(false);
  });
});

describe("reconstructAbstract", () => {
  it("orders words by their recorded positions", () => {
    expect(
      reconstructAbstract({
        behavior: [3],
        information: [1],
        Studies: [0],
        seeking: [2],
      }),
    ).toBe("Studies information seeking behavior");
  });

  it("returns null when OpenAlex has no abstract", () => {
    expect(reconstructAbstract(null)).toBeNull();
  });
});

describe("searchOpenAlex", () => {
  it("returns the actual search, filter and sort expression sent to OpenAlex", async () => {
    const result = await searchOpenAlex(
      {
        query: "生成式人工智能",
        mode: "basic",
        fromYear: 2022,
        language: "zh",
        sort: "cited",
      },
      async () => new Response(JSON.stringify({
        meta: { count: 0, next_cursor: null },
        results: [],
      })),
    );

    expect((result as typeof result & { searchExpression?: string }).searchExpression).toBe(
      'search="生成式人工智能" AND filter=(from_publication_date:2022-01-01,language:zh) SORT cited_by_count:desc',
    );
  });
});

describe("normalizeOpenAlexWork", () => {
  it("normalizes authors, institutions, source and open-access links", () => {
    const work = normalizeOpenAlexWork({
      id: "https://openalex.org/W123",
      doi: "https://doi.org/10.1000/example",
      title: "生成式人工智能与信息行为",
      display_name: "生成式人工智能与信息行为",
      publication_year: 2025,
      publication_date: "2025-03-08",
      type: "article",
      language: "zh",
      cited_by_count: 12,
      abstract_inverted_index: { 中文: [0], 摘要: [1] },
      authorships: [
        {
          author: { id: "A1", display_name: "张三" },
          institutions: [{ id: "I1", display_name: "中山大学" }],
        },
        {
          author: { id: "A2", display_name: "李四" },
          institutions: [{ id: "I1", display_name: "中山大学" }],
        },
      ],
      primary_location: {
        landing_page_url: "https://publisher.example/work",
        pdf_url: null,
        source: { id: "S1", display_name: "情报学报" },
      },
      best_oa_location: {
        landing_page_url: "https://repository.example/work",
        pdf_url: "https://repository.example/work.pdf",
        source: { id: "S2", display_name: "Institutional Repository" },
      },
      open_access: {
        is_oa: true,
        oa_status: "green",
        oa_url: "https://repository.example/work",
      },
      primary_topic: { id: "T1", display_name: "Information Behavior" },
    });

    expect(work.id).toBe("W123");
    expect(work.authors).toEqual(["张三", "李四"]);
    expect(work.institutions).toEqual(["中山大学"]);
    expect(work.source).toBe("情报学报");
    expect(work.abstract).toBe("中文 摘要");
    expect(work.doi).toBe("10.1000/example");
    expect(work.pdfUrl).toBe("https://repository.example/work.pdf");
    expect(work.openAlexUrl).toBe("https://openalex.org/W123");
  });

  it("uses nulls and empty arrays instead of inventing missing metadata", () => {
    const work = normalizeOpenAlexWork({
      id: "https://openalex.org/W999",
      doi: null,
      title: null,
      display_name: null,
      publication_year: null,
      publication_date: null,
      type: "article",
      language: null,
      cited_by_count: 0,
      abstract_inverted_index: null,
      authorships: [],
      primary_location: null,
      best_oa_location: null,
      open_access: { is_oa: false, oa_status: "closed", oa_url: null },
      primary_topic: null,
    });

    expect(work.title).toBe("暂无题名");
    expect(work.authors).toEqual([]);
    expect(work.abstract).toBeNull();
    expect(work.source).toBeNull();
    expect(work.doi).toBeNull();
  });
});
