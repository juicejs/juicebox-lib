---
aim_version: 6.4
aim_root: ./aim/
spec: https://raw.githubusercontent.com/juicejs/application-intent-model/refs/heads/master/specification.md
---

# Agents

This project uses the **Agentic Intent Model (AIM) v6.4** to specify the behaviour of the juicebar library's admin modules. Read this file before working on a module.

The repository is `@juicejs/juicebar`, the Angular admin library every project's back office is built on. It has two parts:

- **The modules** (users, exports, locations, categories, and more as they move in): their behaviour is specified in `/aim/` and authored with Amy on amybuilds.com. The code under `projects/juicebar/src/lib/core/modules/<name>/` is their realization.
- **The framework** (app shell, sign-in, top bar, sidebar menu, search, `ui-components/`, theming): hand-coded, not modelled in AIM. `CLAUDE.md` holds its rules, and the Angular rules for all code.

## How to read this project

- **Behavioural truth lives in `.aim` files** under `/aim/`. They are the only files that define what a module is supposed to do.
- **Each `.aim` file is a projection of a node-and-edge graph.** Headings are nodes (`## Operation: CreateCategory`); cross-references are typed edges written as `[verb](aim:<address>)`, always with the full address. Tooling derives the graph from these edges.
- **The AIM specification** is the grammar. Read it before parsing or writing any `.aim` file:
  1. the local cache, `/aim/specs/spec.md`;
  2. otherwise the canonical URL in the frontmatter above;
  3. if neither resolves, stop.
- **`.md` files, this one included, explain and never define behaviour.** A behavioural rule found only in a `.md` file is drift; move it into intent.

## Layout

```
juicebox-lib/
├── AGENTS.md                  # this file
├── CLAUDE.md                  # Angular and framework rules
├── aim/
│   ├── specs/spec.md          # cached AIM specification (verbatim; never edit)
│   ├── work/                  # encoding reports (explanatory, not intent)
│   └── juicebar/              # the admin's intent: juicebar.aim, then one directory per child
│       ├── core/              # juicebar.core: what the modules share (staff, organisations, media)
│       └── categories/        # juicebar.categories and its children
└── projects/juicebar/src/lib/core/modules/<name>/   # each module's realization
```

`specs/` is reserved. A directory holding a `<name>.aim` file is an intent directory; `work/` holds none.

## Operating modes

You are one assistant; enter the right mode from the request, never ask which role to use (spec §1):

- **Architect** writes intent: forward from requirements, or in reverse to recover intent from existing code (§13, output marked `provenance: inferred` until the owner confirms it).
- **Realizer / Developer** writes code that makes the module match its intent.
- **Reviewer** writes nothing: it compares code with intent and reports drift. It runs cold and read-only.

Drift is resolved explicitly: the Realizer fixes the code, or the Architect revises the intent. Never normalise it silently.

## Working with Amy

The intent is authored in Studio on amybuilds.com. When the `amy` MCP server is connected, read the intent through it (`get_intent`, `get_content`, `get_change_records`) and keep the local `/aim/` copy in step with what it returns. Don't edit confirmed intent here: when the code and the intent disagree, or a change was agreed that the model lacks, file a change request with `report_adjustment`; the owner applies it in Studio.

## Realizing a module

- Realize only confirmed intents (no `provenance: inferred` in the frontmatter).
- Binding locators for the lib's code are relative to this repository's root (`projects/juicebar/src/lib/...`). `service:<juice service>#<method>` names a backend method; `configuration:<key>` a backend configuration entry. The backend (`juicejs/juice-modules`) is not changed from here.
- The old juicebox (`juicejs/juicebox`, branch master) is the functional reference the modules were ported from. Where it and a confirmed intent disagree, the intent wins.
- A module is done when it passes every Tests line of the intents it realizes.
