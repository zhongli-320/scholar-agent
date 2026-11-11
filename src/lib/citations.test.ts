import { describe, expect, it } from "vitest";

import type { Work } from "./openalex";
import { toBibtex, toRis } from "./citations";

const work = {
  id: "W123",
  title: "Generative AI and Information Seeking",
  authors: ["Li Ming", "Zhang Wei"],
  publicationYear: 2025,
  source: "Journal of Information Science",
  doi: "10.1000/example",
  type: "article",
} as Work;

describe("toBibtex", () => {
  it("exports the academic fields available on a work", () => {
    expect(toBibtex(work)).toBe(`@article{W123,
  title = {Generative AI and Information Seeking},
  author = {Li Ming and Zhang Wei},
  year = {2025},
  journal = {Journal of Information Science},
  doi = {10.1000/example}
}`);
  });

  it("omits unavailable fields instead of writing placeholders", () => {
    const output = toBibtex({ ...work, publicationYear: null, source: null, doi: null });

    expect(output).not.toContain("year =");
    expect(output).not.toContain("journal =");
    expect(output).not.toContain("doi =");
    expect(output).not.toMatch(/null|undefined|暂无/);
  });
});

describe("toRis", () => {
  it("writes one author line per author and terminates the record", () => {
    expect(toRis(work)).toBe(`TY  - JOUR
TI  - Generative AI and Information Seeking
AU  - Li Ming
AU  - Zhang Wei
PY  - 2025
JO  - Journal of Information Science
DO  - 10.1000/example
ER  -`);
  });
});
