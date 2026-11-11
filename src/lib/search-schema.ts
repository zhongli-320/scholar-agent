import { z } from "zod";

const currentYear = new Date().getFullYear();

export const searchRequestSchema = z
  .object({
    query: z.string().trim().min(1).max(500),
    mode: z.enum(["basic", "ai"]).default("basic"),
    fromYear: z.number().int().min(1800).max(currentYear + 1).optional(),
    toYear: z.number().int().min(1800).max(currentYear + 1).optional(),
    type: z.enum(["article", "book-chapter", "book", "dissertation", "review"]).optional(),
    language: z.enum(["zh", "en"]).optional(),
    isOpenAccess: z.boolean().optional(),
    sort: z.enum(["relevance", "newest", "cited"]).default("relevance"),
    cursor: z.string().min(1).optional(),
  })
  .refine(
    ({ fromYear, toYear }) => !fromYear || !toYear || fromYear <= toYear,
    { message: "起始年份不能晚于结束年份", path: ["fromYear"] },
  );

export type ValidatedSearchRequest = z.infer<typeof searchRequestSchema>;
