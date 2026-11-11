import type { Work } from "./openalex";

function bibValue(value: string): string {
  return value.replace(/[{}]/g, "");
}

export function toBibtex(work: Work): string {
  const type = work.type === "book" ? "book" : work.type === "book-chapter" ? "incollection" : work.type === "dissertation" ? "phdthesis" : "article";
  const fields = [
    `  title = {${bibValue(work.title)}},`,
    work.authors.length ? `  author = {${work.authors.map(bibValue).join(" and ")}},` : null,
    work.publicationYear ? `  year = {${work.publicationYear}},` : null,
    work.source ? `  journal = {${bibValue(work.source)}},` : null,
    work.doi ? `  doi = {${bibValue(work.doi)}},` : null,
  ].filter((field): field is string => Boolean(field));

  if (fields.length) fields[fields.length - 1] = fields.at(-1)!.replace(/,$/, "");
  return `@${type}{${work.id},\n${fields.join("\n")}\n}`;
}

export function toRis(work: Work): string {
  const type = work.type === "book" ? "BOOK" : work.type === "book-chapter" ? "CHAP" : work.type === "dissertation" ? "THES" : "JOUR";
  return [
    `TY  - ${type}`,
    `TI  - ${work.title}`,
    ...work.authors.map((author) => `AU  - ${author}`),
    work.publicationYear ? `PY  - ${work.publicationYear}` : null,
    work.source ? `JO  - ${work.source}` : null,
    work.doi ? `DO  - ${work.doi}` : null,
    "ER  -",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}
