import { Rule, SchematicContext, Tree, apply, chain, empty, externalSchematic, mergeWith, move } from '@angular-devkit/schematics';
import { NodePackageInstallTask, RepositoryInitializerTask } from '@angular-devkit/schematics/tasks';
import { DependencyType, ExistingBehavior, InstallBehavior, addDependency } from '@schematics/angular/utility';
import { ngAdd } from '../ng-add/index';

interface NgNewOptions {
  name: string;
  directory?: string;
  /** The Angular CLI's version, given by the CLI */
  version: string;
  apiUrl: string;
  appName: string;
  packageManager?: string;
  skipInstall: boolean;
  skipGit: boolean;
  commit: boolean;
}

// The schematics are CommonJS (schematics/package.json); they are compiled without Node's types
declare function require(id: string): unknown;

const LIB = '@juicejs/juicebar';
/** Where @juicejs packages are published; the token stays in each developer's ~/.npmrc or a CI secret */
const NPMRC = '@juicejs:registry=https://npm.pkg.github.com\n';

/**
 * A new Juicebox admin in one step:
 * `npx -p @angular/cli@22 -p @juicejs/juicebar@beta ng new juicebox --collection @juicejs/juicebar`.
 * It is Angular's `ng new` (workspace and application, with SCSS and without server-side rendering), then this
 * package's `ng add`, with the package itself in package.json at this version and an `.npmrc` that names its registry.
 */
export function ngNew(options: NgNewOptions): Rule {
  // As Angular's ng-new: a scoped name ("@foo/bar") makes the folder "foo/bar"
  const directory = options.directory || (options.name.startsWith('@') ? options.name.slice(1) : options.name);

  return chain([
    mergeWith(apply(empty(), [
      externalSchematic('@schematics/angular', 'workspace', {
        name: options.name,
        version: options.version,
        packageManager: options.packageManager,
      }),
      externalSchematic('@schematics/angular', 'application', {
        projectRoot: '',
        name: options.name,
        style: 'scss',
        ssr: false,
        skipPackageJson: false,
        // Installed once, after the move
        skipInstall: true,
      }),
      addDependency(LIB, ownVersion(), {
        type: DependencyType.Default,
        existing: ExistingBehavior.Replace,
        install: InstallBehavior.None,
      }),
      // On this same tree: run as a schematic of its own, the placeholder files it deletes would come back
      ngAdd({ project: options.name, apiUrl: options.apiUrl, appName: options.appName, skipInstall: true }),
      (tree: Tree) => {
        if (!tree.exists('.npmrc')) tree.create('.npmrc', NPMRC);
      },
      move(directory),
    ])),
    (_tree: Tree, context: SchematicContext) => {
      const install = options.skipInstall
        ? undefined
        : context.addTask(new NodePackageInstallTask({ workingDirectory: directory, packageManager: options.packageManager }));
      if (!options.skipGit) {
        context.addTask(new RepositoryInitializerTask(directory, options.commit ? {} : undefined), install ? [install] : []);
      }
    },
  ]);
}

/** This package's version (its package.json, two folders up in the built package): the new app installs the same */
function ownVersion(): string {
  return (require('../../package.json') as { version: string }).version;
}
