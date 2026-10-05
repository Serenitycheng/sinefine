import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = mkdtempSync(join(tmpdir(), 'sinefine-tests-'));

try {
  // Compile only these tests and their imports; never read or write .next output.
  const configPath = join(root, 'tsconfig.test.json');
  const config = ts.readConfigFile(configPath, (file) => ts.sys.readFile(file));
  if (config.error)
    throw new Error(
      ts.flattenDiagnosticMessageText(config.error.messageText, '\n'),
    );
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    root,
    {
      outDir: output,
    },
    configPath,
  );
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
  if (diagnostics.length) {
    process.stderr.write(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (file) => file,
        getCurrentDirectory: () => root,
        getNewLine: () => '\n',
      }),
    );
    process.exitCode = 1;
  } else {
    const emitted = program.emit();
    if (emitted.emitSkipped)
      throw new Error('Test compilation did not produce JavaScript.');
    writeFileSync(join(output, 'package.json'), '{"type":"commonjs"}\n');
    const tests = readdirSync(join(output, 'tests'))
      .filter((file) => file.endsWith('.test.js'))
      .sort()
      .map((file) => join(output, 'tests', file));
    if (!tests.length) throw new Error('No test files were found.');
    // Explicit filenames and no shell keep paths with spaces portable on Windows.
    const result = spawnSync(process.execPath, ['--test', ...tests], {
      cwd: root,
      stdio: 'inherit',
      // Compiled files live in a temporary directory; resolve app dependencies
      // from this project's node_modules rather than the system temp directory.
      env: {
        ...process.env,
        NODE_PATH: [join(root, 'node_modules'), process.env.NODE_PATH]
          .filter(Boolean)
          .join(delimiter),
      },
    });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  }
} finally {
  // This exact directory was created by mkdtemp for this run, outside the repository.
  if (
    dirname(output) === resolve(tmpdir()) &&
    output.startsWith(join(tmpdir(), 'sinefine-tests-'))
  ) {
    rmSync(output, { recursive: true, force: true });
  }
}
