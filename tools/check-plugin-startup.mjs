/**
 * Smoke-test the top-level Svelte <script> initializers without external services.
 * The prior v0.10.2 failure was a ReferenceError in an initializer, which
 * tests of imported TypeScript utility modules cannot detect.
 *
 * Uses the same TypeScript compiler required by typecheck:core. The original
 * imports are replaced by narrow mocks only for the test; no production code
 * or Windy API endpoint is substituted in the published plugin.
 */
import { readFileSync, writeFileSync, rmSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = readFileSync('src/plugin.svelte', 'utf8');
const script = source.match(/<script\s+lang=["']ts["']>([\s\S]*?)<\/script>/)?.[1];
assert(script, 'Svelte component TS script missing');
assert.match(script, /import\s*\{[^}]*\bPRESSURES\b[^}]*\}\s*from\s*['"]\.\/weather['"]/,
  'Must import pressure levels from the current Open-Meteo client');
assert.match(script, /const\s+pressuresDescending\s*=\s*\[\.\.\.PRESSURES\]\.reverse\(\)/,
  'Pressure table initializer must use the imported PRESSURES constant');

const temp = mkdtempSync(join(tmpdir(), 'windy-plugin-startup-'));
const entry = 'src/__windy_plugin_startup_audit__.ts';
try {
  writeFileSync(entry, script);
  const output = join(temp, '__windy_plugin_startup_audit__.js');
  let diagnostics = '';
  try {
    execFileSync('tsc', [
      '--target', 'es2022', '--module', 'commonjs',
      '--moduleResolution', 'node', '--lib', 'es2022,dom',
      '--skipLibCheck', '--esModuleInterop', '--noEmitOnError', 'false',
      '--rootDir', 'src', '--outDir', temp, entry,
    ], { encoding: 'utf8', stdio: 'pipe' });
  } catch (err) {
    diagnostics = `${err.stdout ?? ''}\n${err.stderr ?? ''}`;
  }
  assert(existsSync(output), `Could not transpile Svelte script for startup check:\n${diagnostics}`);
  const unexpectedFreeNames = diagnostics.split(/\r?\n/).filter(line =>
    /error TS(?:2304|2552):/.test(line) && !/Cannot find name 'L'/.test(line));
  assert.equal(unexpectedFreeNames.length, 0,
    `Undeclared symbol(s) in plugin startup:\n${unexpectedFreeNames.join('\n')}`);
  const js = readFileSync(output, 'utf8');

  const mocks = {
    '@windy/broadcast': { default: { emit() {} } },
    '@windy/map': { map: {} },
    '@windy/store': { default: { get() {}, set() {} } },
    'svelte': { onMount() {}, onDestroy() {} },
    './pluginConfig': { default: { title: 'Flight Route Analyzer' } },
    './navdataConfig': { NAVDATA_GITHUB_REPO: 'https://example.invalid/test' },
    './weather': { PRESSURES: [850,700,600,500,400,300,250,200,150] },
    './profileChart': { buildRouteProfile: () => ({ recommendations: [] }) },
  };
  function execute(code, { failedWindyStore = false } = {}) {
    const exports = {};
    const fakeStore = { set() { if (failedWindyStore) throw Error('Windy map store unavailable'); }, get() { return 'none'; } };
    const context = {
      exports, console: { warn() {}, error() {}, log() {} }, Date, Math, JSON,
      setTimeout: () => 1, clearTimeout() {},
      require: name => ({ __esModule: true, ...(name === '@windy/store' ? { default: fakeStore } : (mocks[name] ?? {})) }),
    };
    vm.runInNewContext(code, context, { timeout: 2000, filename: 'plugin-startup-smoke.js' });
    return exports;
  }
  const plugin = execute(js);
  assert.equal(typeof plugin.onopen, 'function', 'Windy onopen lifecycle hook missing');
  assert.doesNotThrow(() => plugin.onopen(), 'Opening plugin must not throw');
  const restrictedWindy = execute(js, { failedWindyStore: true });
  assert.doesNotThrow(() => restrictedWindy.onopen(),
    'Failure of Windy weather layers must not block opening the plugin pane');
  // Mutation test: the exact v0.10.2 regression MUST make the startup check fail.
  const broken = js.replace(/\.\.\.weather_1\.PRESSURES/g, '...WINDY_PRESSURES');
  assert.notEqual(broken, js, 'Regression mutation did not reach pressure initializer');
  assert.throws(() => execute(broken), /WINDY_PRESSURES/,
    'Smoke test must catch legacy missing symbol if it returns');
  console.log('PASS: Svelte script initializers execute with mocked Windy runtime; no undefined symbols; regression reproduced and blocked');
} finally {
  rmSync(entry, { force: true });
  rmSync(temp, { recursive: true, force: true });
}
