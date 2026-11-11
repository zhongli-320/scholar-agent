import { describe, expect, it } from "vitest";

import { getSearchSuggestions } from "./search-suggestions";

describe("getSearchSuggestions", () => {
  it("prefers LLM-generated terms and natural academic queries", async () => {
    const expected = {
      terms: ["知识组织", "元数据", "主题标引", "分类体系"],
      queries: [
        "信息组织研究进展",
        "数智化时代的信息组织",
        "信息组织的应用与挑战",
      ],
    };

    const result = await getSearchSuggestions(
      "信息组织",
      async () => expected,
      async () => { throw new Error("OpenAlex must not be called"); },
    );

    expect(result).toEqual(expected);
  });

  it("falls back to OpenAlex when LLM suggestions are unavailable", async () => {
    const result = await getSearchSuggestions(
      "信息组织",
      async () => null,
      async () => new Response(JSON.stringify({
        results: [
          { display_name: "知识组织" },
          { display_name: "元数据" },
        ],
      })),
    );

    expect(result).toEqual({
      terms: ["知识组织", "元数据"],
      queries: [
        "信息组织与知识组织的关系",
        "信息组织对元数据的影响",
        "信息组织领域的知识组织研究",
      ],
    });
  });
});
