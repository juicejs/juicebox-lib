import { JsonValue } from '@angular-devkit/core';
import {
  MergeStrategy, Rule, SchematicContext, SchematicsException, Tree, apply, applyTemplates, chain, mergeWith, move, url,
} from '@angular-devkit/schematics';
import { DependencyType, ExistingBehavior, InstallBehavior, addDependency } from '@schematics/angular/utility';
import { getPackageJsonDependency } from '@schematics/angular/utility/dependencies';
import { getWorkspace, updateWorkspace } from '@schematics/angular/utility/workspace';
import { packageVersion } from '../package-version';

interface NgAddOptions {
  project?: string;
  apiUrl: string;
  appName: string;
  skipInstall: boolean;
}

const LIB = '@juicejs/juicebar';
const LIB_STYLES = `node_modules/${LIB}/styles.scss`;
const LIB_ASSETS = { glob: '**/*', input: `node_modules/${LIB}/assets`, output: 'assets/juicebar' };
// The rich-text editor loads its toolbar icons from assets/ae-icons/icons.svg
const EDITOR_ICONS = { glob: '**/*', input: `node_modules/${LIB}/ae-icons`, output: 'assets/ae-icons' };

/**
 * Sets up a new Angular app (`ng new`) as a Juicebox admin.
 * Meant for a fresh app: it replaces src/main.ts and src/app/app.config.ts.
 */
export function ngAdd(options: NgAddOptions): Rule {
  return async (tree: Tree) => {
    const workspace = await getWorkspace(tree);
    const projectName = options.project
      ?? [...workspace.projects.keys()].find(name => workspace.projects.get(name)?.extensions['projectType'] === 'application');
    const project = projectName ? workspace.projects.get(projectName) : undefined;
    if (!projectName || !project) {
      throw new SchematicsException('No application found in angular.json. Run `ng new` first or pass --project.');
    }
    const sourceRoot = project.sourceRoot ?? `${project.root ? project.root + '/' : ''}src`;
    const publicRoot = `${project.root ? project.root + '/' : ''}public`;
    const projectRoot = project.root || '/';

    return chain([
      addPeerDependencies(tree, options),
      configureBuild(projectName),
      writeAppFiles(sourceRoot, publicRoot, options),
      removeDefaultRootComponent(sourceRoot),
      writeReadme(projectRoot, options),
    ]);
  };
}

/**
 * @angular/cdk in the app's own package.json. The lib is zoneless (Angular's default), so no zone.js.
 * The CDK is not released in lockstep with @angular/core (core 20.3 / cdk 20.2), so only the major is matched.
 */
function addPeerDependencies(tree: Tree, options: NgAddOptions): Rule {
  const angularVersion = getPackageJsonDependency(tree, '@angular/core')?.version;
  if (!angularVersion) {
    throw new SchematicsException('@angular/core not found in package.json.');
  }
  const major = angularVersion.match(/\d+/)?.[0];
  const install = options.skipInstall ? InstallBehavior.None : InstallBehavior.Auto;
  return addDependency('@angular/cdk', `^${major}.0.0`, { type: DependencyType.Default, existing: ExistingBehavior.Skip, install });
}

function configureBuild(projectName: string): Rule {
  return updateWorkspace(workspace => {
    const build = workspace.projects.get(projectName)?.targets.get('build');
    if (!build) {
      throw new SchematicsException(`Project "${projectName}" has no build target.`);
    }
    const buildOptions = (build.options ??= {});

    // Lib styles first, so the app's own styles.scss can override them
    const styles = (buildOptions['styles'] as string[] | undefined) ?? [];
    if (!styles.includes(LIB_STYLES)) {
      buildOptions['styles'] = [LIB_STYLES, ...styles];
    }

    // Lib images are referenced as assets/juicebar/..., the editor icons as assets/ae-icons/...
    const assets = (buildOptions['assets'] as JsonValue[] | undefined) ?? [];
    const hasAsset = (input: string) => assets.some(asset => typeof asset === 'object' && (asset as { input?: string } | null)?.input === input);
    buildOptions['assets'] = [...assets, ...[LIB_ASSETS, EDITOR_ICONS].filter(asset => !hasAsset(asset.input))];

    // Build straight into dist/ (index.html at dist/index.html); deploy pipelines add dist/config.json
    buildOptions['outputPath'] = { base: 'dist', browser: '' };

    // The admin is larger than the defaults for a new app allow, more so with the lib's modules
    const production = build.configurations?.['production'];
    if (production) {
      production['budgets'] = [
        { type: 'initial', maximumWarning: '1.5MB', maximumError: '3MB' },
        { type: 'anyComponentStyle', maximumWarning: '16kB', maximumError: '32kB' },
      ];
    }
  });
}

function writeAppFiles(sourceRoot: string, publicRoot: string, options: NgAddOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    write(tree, `${sourceRoot}/main.ts`, mainTs());
    write(tree, `${sourceRoot}/app/app.config.ts`, appConfigTs(options));

    const indexPath = `${sourceRoot}/index.html`;
    const index = tree.readText(indexPath);
    if (index.includes('<app-root></app-root>')) {
      tree.overwrite(indexPath, index
        .replace('<app-root></app-root>', '<juicebox-lib></juicebox-lib>')
        .replace(/<title>.*<\/title>/, `<title>${options.appName}</title>`));
    } else if (!index.includes('<juicebox-lib')) {
      context.logger.warn(`${indexPath}: add <juicebox-lib></juicebox-lib> to <body>.`);
    }

    // Read at runtime by production builds; deploy pipelines usually overwrite it
    const configPath = `${publicRoot}/config.json`;
    if (!tree.exists(configPath)) {
      tree.create(configPath, JSON.stringify({ url: 'auto' }, null, 2) + '\n');
    }
  };
}

/** Removes the placeholder root component of a new app; JuicebarComponent is bootstrapped instead. */
function removeDefaultRootComponent(sourceRoot: string): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const app = `${sourceRoot}/app`;
    const isPlaceholder = (path: string) =>
      tree.exists(path) && tree.readText(path).includes('is only a placeholder');

    for (const base of ['app', 'app.component']) {
      if (!isPlaceholder(`${app}/${base}.html`)) continue;
      for (const ext of ['ts', 'html', 'css', 'scss', 'sass', 'less', 'spec.ts']) {
        const path = `${app}/${base}.${ext}`;
        if (tree.exists(path)) tree.delete(path);
      }
      context.logger.info(`Removed the placeholder root component (${app}/${base}.*).`);
    }

    const routes = `${app}/app.routes.ts`;
    if (tree.exists(routes) && /export const routes: Routes = \[\];/.test(tree.readText(routes))) {
      tree.delete(routes);
    }
  };
}

/**
 * The project's README: running the admin, the lib's modules and its own, configuration, deploy and updates. It only
 * replaces the README Angular's `ng new` wrote, never the project's own.
 */
function writeReadme(projectRoot: string, options: NgAddOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const path = `${projectRoot === '/' ? '' : projectRoot + '/'}README.md`;
    if (tree.exists(path) && !tree.readText(path).includes('generated using [Angular CLI]')) {
      context.logger.info(`${path} is the project's own, so it stays; the lib's README is node_modules/${LIB}/README.md.`);
      return;
    }
    // From ng-new this runs in ng-new's context, so the path names ng-add's folder from either
    const readme = apply(url('../ng-add/files'), [
      applyTemplates({ appName: options.appName, version: packageVersion() }),
      move(projectRoot),
    ]);
    return mergeWith(readme, MergeStrategy.Overwrite);
  };
}

function write(tree: Tree, path: string, content: string) {
  if (tree.exists(path)) tree.overwrite(path, content);
  else tree.create(path, content);
}

function mainTs(): string {
  return `import { bootstrapApplication } from '@angular/platform-browser';
import { JuicebarComponent } from '${LIB}';
import { appConfig } from './app/app.config';

bootstrapApplication(JuicebarComponent, appConfig)
  .catch(err => console.error(err));
`;
}

function appConfigTs(options: NgAddOptions): string {
  return `import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideJuicebar } from '${LIB}';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideJuicebar(
      {
        // Backend for \`ng serve\`; production builds read \`url\` from config.json
        apiUrl: '${options.apiUrl}',
        appName: '${options.appName}',
        // Project modules inside the shell, with sidebar entries:
        // { path: 'pages', loadChildren: () => import('./modules/pages/pages.routes'), navigation: { label: 'Pages', role: 'pages:role', icon: 'article' } }
        mainRoutes: [],
        // Routes outside the shell
        modules: [],
      },
      // The lib's modules, as the project needs them (from '${LIB}'): provideUsers(), provideExports(),
      // provideLocations(), provideCategories(), provideCommunications(), provideConfigurations()
    ),
  ],
};
`;
}
