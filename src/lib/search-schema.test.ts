import { describe, expect, it } from "vitest";

import { searchRequestSchema } from "./search-schema";

describe("searchRequestSchema", () => {
  it("trims a valid Chinese query and applies defaults", () => {
    expect(searchRequestSchema.parse({ query: "  信息行为  " })).toMatchObject({
      query: "信息行为",
      mode: "basic",
      sort: "relevance",
    });
  });

  it("rejects an empty query", () => {
    expect(() => searchRequestSchema.parse({ query: "   " })).toThrow();
  });

  it("rejects an inverted year range", () => {
    expect(() =>
      searchRequestSchema.parse({ query: "AI", fromYear: 2025, toYear: 2020 }),
    ).toThrow();
  });
});
