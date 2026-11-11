# ScholarAgent MVP Implementation Plan

> Implement the user-approved ScholarAgent plan on branch `feature/scholar-agent-mvp` with TDD and fresh verification.

## Goal

Ship a public Next.js academic-search product using OpenAlex, GLM, Supabase and Vercel. Anonymous users can perform basic search; authenticated users receive two AI searches per day plus projects, notes, exports and automatic history.

## Tasks

1. Establish tests, application shell, authentication clients and secure database migration.
2. Implement tested OpenAlex query construction, normalization, pagination and work detail retrieval.
3. Implement tested GLM parsing, daily quota integration and `/api/search` fallback behavior.
4. Build the approved home, results, detail, projects, history and authentication flows.
5. Verify unit, type, lint, build and browser flows; apply the migration and publish through GitHub/Vercel when credentials are available.

## Constraints

- One OpenAlex source only; Chinese retrieval is validated but completeness is not claimed.
- `AI_DAILY_LIMIT=2` and AI mode requires authentication.
- No review generation, related-work recommender, collaboration, admin panel, full-text hosting or commercial database integration.
- Every user-owned table uses RLS ownership checks; secrets remain server-only.
