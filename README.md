# juicebox-lib

The workspace for **`@juicejs/juicebar`**, the Juicebox admin library (see [projects/juicebar/README.md](projects/juicebar/README.md)).

| Folder | Contents |
|---|---|
| `projects/juicebar` | The library: shell, users and exports modules, UI components, `ng add` schematic |
| `projects/playground` | A small app for developing the library; it imports the lib from source |

| Command | What it does |
|---|---|
| `npm start` | Serves the playground at http://localhost:4200 against the staging API (`projects/playground/src/app/app.config.ts`) |
| `npm run build` | Builds the package and schematics into `dist/juicebar` |
| `npm run publish:lib` | Builds and publishes to GitHub Packages |

Conventions for working on the library are in [CLAUDE.md](CLAUDE.md).
