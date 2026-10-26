import { JsonValue } from '@angular-devkit/core';
import { Rule, SchematicContext, SchematicsException, Tree, chain } from '@angular-devkit/schematics';
import { DependencyType, ExistingBehavior, InstallBehavior, addDependency } from '@schematics/angular/utility';
import { getPackageJsonDependency } from '@schematics/angular/utility/dependencies';
import { getWorkspace, updateWorkspace } from '@schematics/angular/utility/workspace';

interface NgAddOptions {
  project?: string;
  apiUrl: string;
  appName: string;
  skipInstall: boolean;
}

const LIB = '@juicejs/juicebar';
const LIB_STYLES = `node_modules/${LIB}/styles.scss`;
const LIB_ASSETS = { glob: '**/*', input: `node_modules/${LIB}/assets`, output: 'assets/juicebar' };

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

    return chain([
      addPeerDependencies(tree, options),
      configureBuild(projectName),
      writeAppFiles(sourceRoot, publicRoot, options),
      removeDefaultRootComponent(sourceRoot),
    ]);
  };
}

/** The lib's Angular peers (cdk, animations) and zone.js in the app's own package.json, matching its Angular version */
function addPeerDependencies(tree: Tree, options: NgAddOptions): Rule {
  const angularVersion = getPackageJsonDependency(tree, '@angular/core')?.version;
  if (!angularVersion) {
    throw new SchematicsException('@angular/core not found in package.json.');
  }
  const install = options.skipInstall ? InstallBehavior.None : InstallBehavior.Auto;
  const rules = ['@angular/cdk', '@angular/animations'].map(name =>
    addDependency(name, angularVersion, { type: DependencyType.Default, existing: ExistingBehavior.Skip, install }));
  if (!getPackageJsonDependency(tree, 'zone.js')) {
    rules.push(addDependency('zone.js', '~0.15.0', { type: DependencyType.Default, existing: ExistingBehavior.Skip, install }));
  }
  return chain(rules);
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

    // Lib images are referenced as assets/juicebar/...
    const assets = (buildOptions['assets'] as JsonValue[] | undefined) ?? [];
    if (!assets.some(asset => typeof asset === 'object' && (asset as { input?: string } | null)?.input === LIB_ASSETS.input)) {
      buildOptions['assets'] = [...assets, LIB_ASSETS];
    }

    // The lib uses zone-based change detection
    const polyfills = (buildOptions['polyfills'] as string[] | undefined) ?? [];
    if (!polyfills.includes('zone.js')) {
      buildOptions['polyfills'] = ['zone.js', ...polyfills];
    }

    // CommonJS packages the lib uses; avoids a build warning in every project
    const commonJs = (buildOptions['allowedCommonJsDependencies'] as string[] | undefined) ?? [];
    buildOptions['allowedCommonJsDependencies'] = [...new Set([...commonJs, 'moment', 'randexp'])];

    // Build straight into dist/ (index.html at dist/index.html); deploy pipelines add dist/config.json
    buildOptions['outputPath'] = { base: 'dist', browser: '' };

    // The admin with users and exports is larger than the defaults for a new app allow
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
  return `import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideExports, provideJuicebar, provideUsers } from '${LIB}';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideJuicebar(
      {
        // Backend for \`ng serve\`; production builds read \`url\` from config.json
        apiUrl: '${options.apiUrl}',
        appName: '${options.appName}',
        // Project modules inside the shell, with sidebar entries:
        // { path: 'pages', loadChildren: () => import('./modules/pages/pages.routes'), navigation: { label: 'pages', role: 'pages:role', icon: 'article' } }
        mainRoutes: [],
        // Routes outside the shell
        modules: [],
      },
      provideUsers(),
      provideExports(),
    ),
  ],
};
`;
}
