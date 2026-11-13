---
name: juicebar-module
description: Use when adding a module to the juicebar library (a sidebar entry with its listing, record page and dialogs), when porting a module from the old juicebox into the library, or when changing how a module is laid out. Gives the generator command and sends you to the module guide.
---

# A module in the juicebar library

1. Read `projects/juicebar/MODULE_GUIDE.md` in full before you write or restructure a module, and follow it. `CLAUDE.md` holds the Angular and style rules for all code here; `AGENTS.md` tells how a library module is built from its intent under `/aim/`.
2. Start a new module with the generator, then fill the skeleton in. The schematics are run from the build, so build them first:

   ```
   PATH=~/.nvm/versions/node/v24.21.0/bin:$PATH npm run build:schematics
   npx ng g ./dist/juicebar/schematics/collection.json:module <name> --lib --label "<Name staff read>" --role <role> --service <backend service>
   ```

   It writes `projects/juicebar/src/lib/core/modules/<name>/` and wires the module into `config/base-app.config.ts`, `core/modules/main/main.providers.ts`, `public-api.ts` and the playground.
3. The generator's templates are in `projects/juicebar/schematics/module/files/`. When the library's way of building a listing, a record page or a dialog changes, change the templates and the guide with it, so new modules start from the current shape.
