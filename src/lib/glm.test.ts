import { describe, expect, it } from "vitest";

import { parseAiSearchPlan } from "./glm";

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
