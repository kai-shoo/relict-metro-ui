# Domain Docs

This repository uses a single-context layout.

## Before exploring, read these

- `GLOSSARY.md` at the repository root.
- Relevant architecture decision records in `docs/adr/`.

If these files do not exist, proceed silently. Do not flag their absence
or suggest creating them upfront. The `/domain-modeling` skill, reached
via `/grill-with-docs` and `/improve-codebase-architecture`, creates them
lazily when terms or decisions are resolved.

## File structure

- `GLOSSARY.md`: shared domain vocabulary.
- `docs/adr/`: architecture decision records.
- `src/`: implementation.

## Use the glossary's vocabulary

Use glossary terms in issue titles, refactor proposals, hypotheses, and
test names. Avoid synonyms the glossary explicitly rejects.

If a concept is missing, reconsider whether it belongs to the domain
or note the gap for `/domain-modeling`.

## Flag ADR conflicts

Explicitly flag proposals that contradict an existing ADR rather than
silently overriding it. For example:

> Contradicts ADR-0007, but worth reopening because…
