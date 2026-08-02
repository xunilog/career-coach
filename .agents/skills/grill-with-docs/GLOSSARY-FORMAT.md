# Glossary Format

The glossary lives at `specs/domain/glossary.md`. It is organized into three sections.

## Structure

```md
# Glossary — Ubiquitous Language

Every term used in specifications, architecture diagrams, and code. Agents: use these exact terms when discussing design.

## Core Domain Entities

### EntityName

A one-sentence definition of what the entity is. Stored in `table_name` table. Defined in `src/path/to/file.ts` (`TypeName`), table schema in `src/shared/db-migrations.ts` (`tableName`).

**Invariants:**

- Constraint or rule that must always hold.
- Another invariant.
- Values must be one of: `a`, `b`, `c`.

### AnotherEntity

...

## Architecture Patterns

### PatternName

Definition. Never say "alias1", "alias2".

## Technical Infrastructure

### InfrastructurePiece

Definition. Technical detail, location, how it's used.
```

## Rules

- **Each entity gets its own `###` subheading** under `## Core Domain Entities`.
- **Include source code pointers**: the TypeScript type file path and the `db-migrations.ts` table name.
- **List invariants as bullets** — constraints, valid values, cardinality, uniqueness, dependencies.
- **Architecture Patterns** covers design vocabulary: module, seam, adapter, depth, locality, etc.
- **Technical Infrastructure** covers IPC channels, state management, LangGraph graphs, SQLite config, external libraries.
- **Only include terms specific to this project.** General programming concepts (timeouts, error types, utility patterns) don't belong.
- **Be opinionated.** When multiple words exist for the same concept, pick the best one and list the others as aliases to avoid in the Architecture Patterns section.
- **Flag conflicts.** If a term is used ambiguously, call it out explicitly.
