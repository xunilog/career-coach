# Zod Schemas as Single Source of Truth

**Status:** Accepted

Every structured data boundary in the app is defined by a Zod schema, and TypeScript types are derived from Zod via `z.infer<>` — never declared manually.

This applies at two levels:

1. **Database tables** — `createTable()` from `zod-sqlite` generates SQL DDL, indexes, and Zod validation schemas from a single definition per table in `src/shared/db-migrations.ts`. Every SQLite read site validates the returned row with the table's Zod schema.
2. **LLM outputs** — Every LLM call uses `model.withStructuredOutput(zodSchema)`. The Zod schema becomes the JSON Schema sent to the LLM API, and the returned value is runtime-validated before it reaches application code.

The alternative — hand-writing TypeScript interfaces and separately maintaining validation — leads to drift between types, runtime validation, and documentation. Zod eliminates that class of bug.

## Considered Options

- **TypeScript interfaces + JSON Schema separately** — Two sources of truth that inevitably diverge. Requires manual synchronization.
- **Prisma or Drizzle ORM** — Would handle DB schema → TypeScript types but doesn't cover LLM output validation. Using Zod everywhere gives one consistent pattern.
