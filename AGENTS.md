# AGENTS.md

CLAUDE.md is a symlink to this file — they are the same file.
Similarly, `.claude/skills` is a symlink to `.agents/skills`.

# Context

Project uses:

- TypeScript 5.9
- Mantine 9.2
- Tauri 2
- Vite 8
- Vitest for testing
- TanStack Query for data fetching

# Commands

- for testing, use `npm run test`, as there is specific configuration to enable testing

# Skills

- `tdd` — red-green-refactor loop, see `.agents/skills/tdd/SKILL.md`
- `improve-codebase-architecture` — deepening modules, finding seams, see `.agents/skills/improve-codebase-architecture/SKILL.md`

# Code navigation: prefer LSP over Grep

When LSP operations are available, use them instead of Grep/Glob/Read for
semantic code questions. LSP is precise (exact symbol, file, line); Grep is
fuzzy text matching. Use the right tool for the job.

## Use LSP for (semantic queries on a known symbol):

- Finding where a function/class/type/variable is **defined** → goToDefinition
- Finding all **usages** of a symbol before refactoring → findReferences
- Finding **implementations** of an interface/abstract method → goToImplementation
- Understanding a **type signature** or inferred type → hover
- Tracing **call relationships** → callHierarchy / incoming & outgoing calls
- Listing the **symbols in a file** → documentSymbol

## Use Grep/Glob for (discovery, when you don't yet have a symbol):

- Finding which files contain a string, comment, config key, or log message
- Locating a symbol by partial/unknown name to _then_ hand off to LSP
- Searching non-code text, TODOs, or matches across many file types
- Any case where you don't yet have a concrete file + symbol to point LSP at

## Workflow

Discovery first (Grep/Glob to locate), then precision (LSP to understand).
Before any non-trivial refactor, run findReferences on the affected symbols
to know the full blast radius before editing anything.

## Note

LSP requires an exact file path, line, and character position — so identify
the symbol first. If no LSP server is available for a file type, fall back
to Grep without comment.

# Development guidelines

## TDD

Always use red-green-refactor with TDD. One test → one implementation → repeat (vertical slices). Never write all tests first (horizontal slicing).

## Architecture

Use the vocabulary and principles from `.agents/skills/improve-codebase-architecture/LANGUAGE.md`.

## UI

- Always make UI adaptable to different screen sizes.
- Use responsive design principles — no main content window scrolling; scrolling belongs in individual components.
- Modularize UI code to favor testability and reusability.
- When creating UI components properties, try to use the same naming conventions as the component itself and as Mantine components.

## LLM

LLM calls MUST use structured JSON output via Zod schemas

Every LLM call must follow this pipeline for full type safety and consistency:

1. **Define a Zod schema** for the expected output shape.
2. **Pass it to `withStructuredOutput`** on the LangChain model (which internally converts Zod → JSON Schema for the LLM API).
3. **TypeScript infers the return type** from Zod via `z.infer<typeof schema>` — never declare the type manually.

```typescript
import { z } from "zod/v4";
import { getModel } from "../../shared/llm-provider.js";

const MyOutputSchema = z.object({
  field1: z.string(),
  field2: z.number(),
});

type MyOutput = z.infer<typeof MyOutputSchema>;

const model = getModel();
const structuredModel = model.withStructuredOutput(MyOutputSchema);
const result: MyOutput = await structuredModel.invoke(prompt);
// result is fully typed and validated — no manual parsing, no try/catch for JSON.parse
```

**Why:**

- LLM output is validated at runtime by Zod before it reaches application code.
- TypeScript types are derived from the Zod schema — single source of truth.
- No manual `JSON.parse`, no hand-written response parsing, no string munging.
- LangChain's `withStructuredOutput` sends the JSON Schema to the LLM API so the model knows the expected shape.

**Do NOT:**

- Use `model.invoke(prompt)` with a "respond in JSON" instruction in the prompt.
- Manually `JSON.parse(response.content)`.
- Declare a TypeScript interface and then write a separate Zod schema — derive the type from Zod.

**Mistral constraints:** Avoid `z.discriminatedUnion()`, `z.union()`, `.nullable()`, and `.optional()` on object schemas — they produce `oneOf`/`anyOf` in JSON Schema. Use sentinel enum values instead. Verify with:

```bash
node -e "console.log(JSON.stringify(MySchema.toJSONSchema(), null, 2))" | grep -E '(oneOf|anyOf)'
```

## Database Schema & Migrations

All table definitions live in `src/shared/db-migrations.ts` using `createTable()` from `zod-sqlite`. This is the single source of truth — it generates SQL DDL, indexes, and Zod validation schemas from one definition per table.

### When changing `src/shared/db-migrations.ts`

1. **Bump `SCHEMA_VERSION`** in `src/shared/db-migrations.ts` to the new version number.
2. **Add a new `Migration` entry** in the `MIGRATIONS` array with the DDL needed to go from the previous version to the new one.
3. **Never edit existing migrations** — migrations are append-only. If a migration hasn't shipped yet (same PR), it's OK to amend it. Once merged, it's immutable.
4. **The `up` DDL must be idempotent where possible** — use `IF NOT EXISTS`, `IF EXISTS` for DROP, and check for column existence before ALTER TABLE.
5. **The `SCHEMA_VERSION` constant must always equal the highest version in `MIGRATIONS`.**

### Migration DDL rules

- Use `ALTER TABLE ... ADD COLUMN ...` for adding new columns (SQLite 3.35+ also supports `DROP COLUMN`)
- For complex changes (column rename, type change, table restructure), use the pattern: create new table, copy data, drop old, rename new
- Always wrap migration DDL in a transaction if doing multi-step changes
- Test migrations against a copy of the production database before shipping
- New columns should use `ALTER TABLE ... ADD COLUMN ...` with a DEFAULT value or allow NULL

### Zod schemas for reads

Every SQLite read site MUST validate the returned row with the table's Zod schema:

```typescript
import { jobs as jobsTable } from "../shared/db-migrations.js";

// Full row validation
const raw = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as unknown;
if (!raw) return undefined;
const row = jobsTable.schema.parse(raw);

// Partial row validation (use .pick())
const raw = db.prepare("SELECT status FROM jobs WHERE id = ?").get(id) as unknown;
const { status } = jobsTable.schema.pick({ status: true }).parse(raw);
```

**Never use `as Record<string, unknown>` or manual type casts on SQLite reads.** The Zod schema is the single source of truth.

### `zod-sqlite` edge cases

`zod-sqlite` doesn't natively express some SQLite features. These are handled by `patchDdl()` in `db-migrations.ts`:

- **BLOB columns** — `z.string()` → replace TEXT with BLOB in the generated DDL
- **`DEFAULT (datetime('now'))`** — function defaults can't be expressed in Zod; injected into DDL via `datetimeDefaults` patches
- **`CHECK` constraints** — singleton tables (`CHECK (id = 1)`) added via `checks` patches

### `.nullable()` vs `.optional()` in column schemas

SQLite returns `null` for NULL column values, not `undefined`. Always use `.nullable()` (not `.optional()`) for columns that can be NULL:

```typescript
// ✅ Correct: SQLite returns null
{ name: "location", schema: z.string().nullable() }

// ❌ Wrong: SQLite never returns undefined
{ name: "location", schema: z.string().optional() }
```

## Spec-to-Code Structure

The canonical specification source lives in `/specs/`, not `/docs/`. When planning changes:

1. **Start at [`specs/index.md`](specs/index.md)** — the full navigation map, REQ-ID registry, capability-to-feature map, and diagram/decision indexes.
2. **Read the relevant `.feature` file** in `specs/features/<capability>/` for scenario-level requirements with stable REQ-IDs.
3. **Check `specs/architecture/decisions/`** for ADRs that constrain the design space.
4. **Check [`specs/domain/glossary.md`](specs/domain/glossary.md)** for term definitions before inventing new names.

### When adding a feature

- Create a new `.feature` file in the appropriate capability directory (or a new capability directory with a new REQ-ID prefix).
- Assign REQ-IDs from the capability's prefix range. Use consistent format: `REQ-XXXX-NN` (prefix + two-digit serial).
- Register the new REQ-IDs in `specs/index.md`.
- Add an `acceptance.md` capturing edge cases and non-functional notes.

### When changing architecture

- Update the relevant `.puml` diagram in `specs/architecture/` or `specs/design/`.
- Add an ADR in `specs/architecture/decisions/` if the change represents a significant, hard-to-reverse decision.
- Update `specs/domain/glossary.md` if terms or invariants change.

### When implementing a feature

- Reference the REQ-ID in commit messages and PR descriptions (e.g., "Implement REQ-SCOR-01 batch scoring").
- Gherkin scenarios in `.feature` files are the acceptance criteria — they describe business intent, not implementation details.
- Diagrams are PlantUML `.puml` files (plain text) — read them directly, don't look for pre-rendered images.

### Never

- Reference "Hiring.cafe API" — the actual data source is Indeed/LinkedIn via ts-jobspy.
- Reference `data/profile.md` as the source of truth — career data lives in SQLite tables.
- Use Mermaid for diagrams — all diagrams are PlantUML `.puml` files.
