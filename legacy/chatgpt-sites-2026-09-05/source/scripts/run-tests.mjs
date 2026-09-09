import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const compile = spawnSync(
  process.execPath,
  [
    require.resolve('typescript/bin/tsc'),
    'tests/simulation.test.ts',
    '--outDir',
    '.test-build',
    '--module',
    'CommonJS',
    '--moduleResolution',
    'Node',
    '--target',
    'ES2022',
    '--esModuleInterop',
    '--skipLibCheck',
    '--types',
    'node',
  ],
  { stdio: 'inherit' },
);
if (compile.status !== 0) process.exit(compile.status || 1);
mkdirSync('.test-build', { recursive: true });
writeFileSync('.test-build/package.json', JSON.stringify({ type: 'commonjs' }));
const run = spawnSync(
  process.execPath,
  ['--test', '.test-build/tests/simulation.test.js'],
  { stdio: 'inherit' },
);
process.exit(run.status ?? 1);
