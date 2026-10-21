import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { parse } from 'acorn';
import type { LegacyScope } from './types.ts';
const require = createRequire(import.meta.url);

/** Load declarations lazily so the benchmark executes native formulas without
 * starting the browser, persistence layer or UI. The generated bundle is excluded
 * to avoid loading each declaration twice.
 */
export function collectLegacyDeclarations(directory: string, declarations = new Map<string, string>()): Map<string, string> {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectLegacyDeclarations(filePath, declarations);
    else if (filePath.endsWith('.js') && !filePath.endsWith('/game.js')) {
      const source = fs.readFileSync(filePath, 'utf8');
      let program;
      try { program = parse(source, { ecmaVersion: 'latest' }); }
      catch { continue; } // Non-legacy modules cannot run in the shared JS scope.
      for (const statement of program.body) {
        if (statement.type !== 'VariableDeclaration') continue;
        for (const declaration of statement.declarations) {
          if (declaration.id.type === 'Identifier') declarations.set(declaration.id.name, `var ${source.slice(declaration.start, declaration.end)};`);
        }
      }
    }
  }
  return declarations;
}

/** Create a fresh game from the existing headless fixture without registering its
 * tests. Only declarations and imports before the first test are evaluated.
 */
export function createHeadlessGame(repositoryRoot: string): LegacyScope {
  const fixturePath = path.join(repositoryRoot, 'test/combat-sandbox.test.js');
  const fixtureSource = fs.readFileSync(fixturePath, 'utf8');
  const program = parse(fixtureSource, { ecmaVersion: 'latest' });
  const firstTest = program.body.find(statement => statement.type === 'ExpressionStatement' &&
    statement.expression.type === 'CallExpression' && statement.expression.callee.type === 'Identifier' && statement.expression.callee.name === 'test');
  if (!firstTest) throw new Error('Headless fixture: first test was not found.');
  const helperSource = program.body.filter(statement => statement.type === 'FunctionDeclaration' || statement.end < firstTest.start)
    .map(statement => fixtureSource.slice(statement.start, statement.end)).join('\n');
  // The fixture uses CommonJS relative imports, so bind require to its own path.
  const fixtureRequire = require('node:module').createRequire(fixturePath);
  const createGame = new Function('require', '__dirname', `${helperSource}\nreturn battlefieldGame;`)(fixtureRequire, path.dirname(fixturePath)) as () => LegacyScope;
  return createGame();
}

export function installNativeDeclarations(game: LegacyScope, declarations: Map<string, string>): void {
  for (const [symbolName, declarationSource] of declarations) {
    if (symbolName in game) continue;
    Object.defineProperty(game, symbolName, {
      configurable: true,
      get() {
        delete game[symbolName];
        try { vm.runInContext(declarationSource, game, { filename: `native:${symbolName}` }); return game[symbolName]; }
        catch (error) { throw new Error(`Native declaration ${symbolName} failed`, { cause: error }); }
      },
      set(value: unknown) { Object.defineProperty(game, symbolName, { value, writable: true, configurable: true, enumerable: true }); },
    });
  }
}
