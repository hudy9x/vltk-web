export interface BuildSourceMap {
  version: number;
  file: string;
  sources: string[];
  sourcesContent: string[];
  names: string[];
  mappings: string;
}
export interface BuildResult {
  code: string;
  map: BuildSourceMap;
  hash: string;
  modules: Array<{ file: string; globalName?: string; source: string }>;
  inputs: string[];
}
export function assemble(): BuildResult;
export function buildApp(): BuildResult;
export function compileTypeScriptEntry(file: string, globalName?: string,
  dependencies?: Array<{ file: string; source: string }>): { code: string; map: BuildSourceMap; inputs: string[] };
