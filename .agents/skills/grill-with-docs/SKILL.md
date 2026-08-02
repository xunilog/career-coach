---
name: grill-with-docs
description: Grilling session that challenges your plan against the existing domain model, sharpens terminology, and updates documentation (glossary.md, ADRs) inline as decisions crystallise. Use when user wants to stress-test a plan against their project's language and documented decisions.
---

<what-to-do>

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time, waiting for feedback on each question before continuing.

If a question can be answered by exploring the codebase, explore the codebase instead.

</what-to-do>

<supporting-info>

## Domain awareness

### Start at specs/index.md

`specs/index.md` is the canonical entry point. Read it first — it provides:

- **Read order**: Glossary → Architecture → Decisions → Design → Features
- **REQ-ID registry**: Every capability's requirement IDs with scenario → file mapping
- **Capability → Feature map**: Which directories hold Gherkin scenarios for which prefix
- **Diagram index**: All `.puml` files with their types
- **Decision index**: All ADRs with their status

### File structure

```
specs/
├── index.md                              ← Canonical entry point (read first)
├── domain/
│   └── glossary.md                       ← Ubiquitous language, term definitions
├── architecture/
│   ├── context.puml                      ← C4 L1 System Context
│   ├── container.puml                    ← C4 L2 Container
│   ├── component.puml                    ← C4 L3 Component
│   └── decisions/
│       ├── adr-0001-slug.md              ← ADRs (adr-NNNN-slug.md)
│       └── ...
├── design/
│   ├── domain-model.class.puml           ← UML Class
│   ├── schema-er.puml                    ← ER Diagram
│   ├── status-machine.puml               ← State Diagram
│   ├── *-sequence.puml                   ← UML Sequence
│   └── ...
└── features/
    ├── 01-search/
    │   ├── search-management.feature     ← Gherkin scenarios with REQ-IDs
    │   └── ...
    └── ...
```

Never look for `CONTEXT.md`, `CONTEXT-MAP.md`, or `docs/` — those don't exist in this project. The `docs/` directory is legacy and should not be created or edited.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in `specs/domain/glossary.md`, call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account' — do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts. When relevant, map these to existing `.feature` files or propose new REQ-IDs.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"

### Update glossary.md inline

When a term is resolved, update `specs/domain/glossary.md` right there. Don't batch these up — capture them as they happen. Use the format in [GLOSSARY-FORMAT.md](./GLOSSARY-FORMAT.md).

The glossary is organized into sections:

- **Core Domain Entities** — business entities with definitions, invariants, and source code pointers
- **Architecture Patterns** — deep module, seam, interface, implementation, etc.
- **Technical Infrastructure** — IPC channels, TanStack Query, Zustand stores, LangGraph graphs, etc.

`specs/domain/glossary.md` should contain only domain-specific terms. General programming concepts (timeouts, error types, utility patterns) don't belong.

### Update features when capabilities change

When a discussion adds, removes, or changes a capability:

1. Create or update `.feature` files in the appropriate `specs/features/<capability>/` directory.
2. Assign REQ-IDs from the capability's prefix range (see `specs/index.md` for the registry).
3. Register new REQ-IDs in `specs/index.md`.
4. Gherkin scenarios describe business intent, not implementation — reference IPC channels and table names only where they clarify the contract.

### Update diagrams when structure changes

When the discussion changes the system's shape:

- Update the relevant `.puml` file in `specs/architecture/` (C4 diagrams) or `specs/design/` (class, sequence, state, ER).
- Update the Diagram Index in `specs/index.md` if files are added or renamed.
- Generate updated PNGs with `java -jar plantuml.jar -tpng <file.puml>`.

### Offer ADRs sparingly

Only offer to create an ADR in `specs/architecture/decisions/` when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Use the format in [ADR-FORMAT.md](./ADR-FORMAT.md). Use `adr-NNNN-slug.md` numbering (scan `specs/architecture/decisions/` for the highest number). Register the new ADR in the Decision Index of `specs/index.md`.

</supporting-info>
