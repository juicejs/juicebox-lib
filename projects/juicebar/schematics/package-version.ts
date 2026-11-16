// The schematics are CommonJS (schematics/package.json); they are compiled without Node's types
declare function require(id: string): unknown;

/** This package's version: its package.json, one folder above the schematics in the built package */
export function packageVersion(): string {
  return (require('../package.json') as { version: string }).version;
}
