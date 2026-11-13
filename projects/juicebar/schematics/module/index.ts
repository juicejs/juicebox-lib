import { dirname, normalize, relative, strings } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  noop,
  url,
} from '@angular-devkit/schematics';
import { getWorkspace } from '@schematics/angular/utility/workspace';

interface ModuleOptions {
  name: string;
  route?: string;
  project?: string;
  path?: string;
  label?: string;
  role?: string;
  service?: string;
  icon: string;
  lib: boolean;
  skipSkill: boolean;
}

/** What the templates are written with */
interface ModuleNames {
  /** Folder and file names: `order-items` */
  name: string;
  /** The address under /main/ and the sidebar id; the name unless a ported module keeps the old one */
  route: string;
  /** Classes: `OrderItems` */
  className: string;
  /** The dictionary's constant: `orderItems` */
  camel: string;
  /** The lib's customization token: `ORDER_ITEMS` */
  constant: string;
  /** As staff read it: `Order items` */
  label: string;
  role: string;
  service: string;
  icon: string;
}

const LIB = '@juicejs/juicebar';
const GUIDE = 'MODULE_GUIDE.md';
const SKILL_DIR = '.claude/skills/juicebar-module';

/** Where the library keeps its own modules, and the files a new one is wired into */
const LIB_ROOT = 'projects/juicebar/src';
const LIB_MODULES = `${LIB_ROOT}/lib/core/modules`;
const LIB_CONFIG = `${LIB_ROOT}/lib/config/base-app.config.ts`;
const LIB_MAIN_PROVIDERS = `${LIB_MODULES}/main/main.providers.ts`;
const LIB_PUBLIC_API = `${LIB_ROOT}/public-api.ts`;
const PLAYGROUND_CONFIG = 'projects/playground/src/app/app.config.ts';

/** What a module imports from the library: one package for a project, these files inside the library */
const LIB_FILES = {
  ui: 'ui-components',
  confirmation: 'core/shared/components/confirmation-dialog/confirmation-dialog.component',
  listingPane: 'core/shared/components/listing-pane/listing-pane',
  promiseButton: 'core/shared/directives/PromiseButton',
  translationPipe: 'core/shared/pipes/TranslationPipe',
  juice: 'core/shared/services/juice.service',
  juicebox: 'core/shared/services/Juicebox.service',
  result: 'core/shared/types/Result',
} as const;

type ImportGroups = Partial<Record<keyof typeof LIB_FILES, string[]>>;

/**
 * Adds a module in the library's shape: a listing with the split view, a record page, a create dialog, the backend
 * service, the types and the labels. In a project it is registered in `mainRoutes`; with `--lib` it becomes a module
 * of the library itself.
 */
export function moduleSchematic(options: ModuleOptions): Rule {
  return async (tree: Tree) => {
    const names = namesOf(options);
    return options.lib ? libModule(tree, names) : projectModule(tree, names, options);
  };
}

function namesOf(options: ModuleOptions): ModuleNames {
  const name = strings.dasherize(options.name.trim());
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new SchematicsException(`"${options.name}" is not a module name: use letters, digits and dashes, starting with a letter.`);
  }
  const route = options.route?.trim() || name;
  if (!/^[a-z][a-z0-9-]*$/.test(route)) {
    throw new SchematicsException(`--route "${options.route}" is not an address: use letters, digits and dashes, starting with a letter.`);
  }
  const label = options.label ?? strings.capitalize(name.replace(/-/g, ' '));
  const role = options.role ?? `${name}:role`;
  const service = options.service ?? name;
  for (const [option, value] of Object.entries({ label, role, service, icon: options.icon })) {
    // They are written into string literals
    if (/['"`\\\n]/.test(value)) {
      throw new SchematicsException(`--${option} must not contain quotes, backslashes or line breaks.`);
    }
  }
  return {
    name,
    route,
    className: strings.classify(name),
    camel: strings.camelize(name),
    constant: strings.underscore(name).toUpperCase(),
    label,
    role,
    service,
    icon: options.icon,
  };
}

/** The import lines of what a file takes from the library; `depth` is how deep the file lies in the module's folder */
function importsFor(lib: boolean) {
  return (depth: number, groups: ImportGroups): string => {
    const entries = Object.entries(groups) as Array<[keyof typeof LIB_FILES, string[]]>;
    if (!lib) return importLine(entries.flatMap(([, names]) => names), LIB);
    // From lib/core/modules/<name>/…: the library's other modules write these paths the same way
    const toCore = '../'.repeat(depth + 2);
    return entries
      .map(([group, symbols]) => {
        const file = LIB_FILES[group];
        return importLine(symbols, file.startsWith('core/') ? toCore + file.slice('core/'.length) : `${toCore}../${file}`);
      })
      .join('\n');
  };
}

function importLine(symbols: string[], from: string): string {
  const sorted = [...symbols].sort();
  return sorted.length > 4
    ? `import {\n${sorted.map(symbol => `  ${symbol},`).join('\n')}\n} from '${from}';`
    : `import {${sorted.join(', ')}} from '${from}';`;
}

function moduleFiles(source: string, target: string, names: ModuleNames, lib: boolean): Rule {
  return mergeWith(apply(url(source), [
    applyTemplates({ ...strings, ...names, importLib: importsFor(lib) }),
    move(target),
  ]));
}

function assertFree(tree: Tree, target: string): void {
  const dir = tree.getDir(target);
  if (dir.subfiles.length || dir.subdirs.length) {
    throw new SchematicsException(`${target} already exists.`);
  }
}

// ---------------------------------------------------------------------------------------------------------- project

async function projectModule(tree: Tree, names: ModuleNames, options: ModuleOptions): Promise<Rule> {
  const workspace = await getWorkspace(tree);
  const projectName = options.project
    ?? [...workspace.projects.keys()].find(key => workspace.projects.get(key)?.extensions['projectType'] === 'application');
  const project = projectName ? workspace.projects.get(projectName) : undefined;
  if (!project) {
    throw new SchematicsException('No application found in angular.json. Pass --project, or --lib inside the juicebox-lib repository.');
  }
  const sourceRoot = project.sourceRoot ?? `${project.root ? project.root + '/' : ''}src`;
  const target = `${options.path ?? `${sourceRoot}/app/modules`}/${names.name}`;
  assertFree(tree, target);

  return chain([
    moduleFiles('./files/common', target, names, false),
    moduleFiles('./files/project', target, names, false),
    registerInMainRoutes(`${sourceRoot}/app/app.config.ts`, target, names),
    options.skipSkill ? noop() : writeSkill(),
    (_: Tree, context: SchematicContext) => {
      context.logger.info(`\n${names.label}: ${target}`);
      context.logger.info(`Next: read node_modules/${LIB}/${GUIDE}, point ${names.name}.service.ts at the backend's real methods,`);
      context.logger.info(`and give a test user the role "${names.role}" with the permission "juicebox:visible".`);
    },
  ]);
}

/** The module's entry in `provideJuicebar({mainRoutes: [...]})`, which also puts it in the sidebar */
function registerInMainRoutes(appConfig: string, target: string, names: ModuleNames): Rule {
  return (tree: Tree, context: SchematicContext) => {
    // The devkit compares absolute paths
    const fromConfig = relative(dirname(normalize(`/${appConfig}`)), normalize(`/${target}/${names.name}.routes`));
    const importPath = fromConfig.startsWith('.') ? fromConfig : `./${fromConfig}`;
    const entry = [
      '{',
      `  path: '${names.route}',`,
      `  loadChildren: () => import('${importPath}'),`,
      `  navigation: { label: '${names.label}', role: '${names.role}', icon: '${names.icon}' },`,
      '},',
    ];
    const text = tree.readText(appConfigOrEmpty(tree, appConfig));
    const match = /^([ \t]*)mainRoutes:\s*\[/m.exec(text);
    if (!match) {
      context.logger.warn(`No "mainRoutes: [" in ${appConfig}. Add the module by hand:\n${entry.join('\n')}`);
      return;
    }
    const indent = match[1];
    const at = match.index + match[0].length;
    const rest = text.slice(at);
    const emptyList = /^\s*\]/.exec(rest);
    const lines = entry.map(line => `${indent}  ${line}`).join('\n');
    const tail = emptyList ? `\n${indent}${rest.slice(emptyList[0].length - 1)}` : rest;
    tree.overwrite(appConfig, `${text.slice(0, at)}\n${lines}${tail}`);
  };
}

function appConfigOrEmpty(tree: Tree, appConfig: string): string {
  if (!tree.exists(appConfig)) {
    throw new SchematicsException(`${appConfig} not found: the module is registered in provideJuicebar's mainRoutes there.`);
  }
  return appConfig;
}

/** A Claude skill in the project that sends module work to the library's guide */
function writeSkill(): Rule {
  return (tree: Tree) => tree.exists(`${SKILL_DIR}/SKILL.md`)
    ? noop()
    : mergeWith(apply(url('./files/skill'), [applyTemplates({ lib: LIB, guide: GUIDE }), move(SKILL_DIR)]));
}

// ---------------------------------------------------------------------------------------------------------- library

function libModule(tree: Tree, names: ModuleNames): Rule {
  if (!tree.exists(LIB_MAIN_PROVIDERS)) {
    throw new SchematicsException(`--lib is for the juicebox-lib repository: ${LIB_MAIN_PROVIDERS} not found.`);
  }
  const target = `${LIB_MODULES}/${names.name}`;
  assertFree(tree, target);
  const token = `${names.constant}_CUSTOMIZATION`;

  return chain([
    moduleFiles('./files/common', target, names, true),
    moduleFiles('./files/lib', target, names, true),
    edit(LIB_CONFIG, text => insertBefore(text, 'export interface JuicebarFeature {', [
      `/** The ${names.label} module has no options of its own yet */`,
      `export type ${names.className}Customization = ModuleCustomization;`,
      '',
      `export const ${token} = new InjectionToken<${names.className}Customization>('${token}');`,
      '',
      '',
    ].join('\n'))),
    edit(LIB_MAIN_PROVIDERS, text => {
      const imported = insertAfterLine(text, /^import \{[^}]*\} from '\.\.\/\.\.\/\.\.\/config\/base-app\.config';$/m,
        `import { ${token} } from '../../../config/base-app.config';`);
      return imported && insertBefore(imported, '      if (config?.mainRoutes) {', [
        `      if (inject(${token}, { optional: true }) != null) {`,
        `        sidebarService.registerSidebarItem('${names.route}', '${names.label}', '${names.role}', '${names.icon}', '${names.route}');`,
        '      }',
        '',
        '',
      ].join('\n'));
    }),
    edit(LIB_PUBLIC_API, text => insertAfterLine(text, /^export \* from '\.\/lib\/core\/modules\/[^']+\.providers';$/gm,
      `export * from './lib/core/modules/${names.name}/${names.name}.providers';`)),
    edit(PLAYGROUND_CONFIG, text => {
      const imported = insertAfterLine(text, /^import \{[^}]*\} from '@juicejs\/juicebar';$/m,
        `import { provide${names.className} } from '${LIB}';`);
      return imported && insertBefore(imported, '    ),\n  ],\n};', `      provide${names.className}(),\n`);
    }),
    (_: Tree, context: SchematicContext) => {
      context.logger.info(`\n${names.label}: ${target}`);
      context.logger.info(`Next: read projects/juicebar/${GUIDE}. A library module is built from its intent (AGENTS.md):`);
      context.logger.info(`write aim/juicebar/${names.name}/ with Amy first, then fill this skeleton in.`);
    },
  ]);
}

/** Changes one of the library's own files; says what to do by hand when the place is not found */
function edit(path: string, change: (text: string) => string | null): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const updated = tree.exists(path) ? change(tree.readText(path)) : null;
    if (updated === null) {
      context.logger.warn(`Could not wire the module into ${path}: do it by hand, as for the other modules there.`);
      return;
    }
    tree.overwrite(path, updated);
  };
}

function insertBefore(text: string, anchor: string, addition: string): string | null {
  const at = text.indexOf(anchor);
  return at < 0 ? null : text.slice(0, at) + addition + text.slice(at);
}

/** After the last line the pattern matches */
function insertAfterLine(text: string, pattern: RegExp, line: string): string | null {
  const matches = pattern.global ? [...text.matchAll(pattern)] : [pattern.exec(text)].filter(match => match !== null);
  const last = matches[matches.length - 1];
  if (!last) return null;
  const at = last.index + last[0].length;
  return `${text.slice(0, at)}\n${line}${text.slice(at)}`;
}
