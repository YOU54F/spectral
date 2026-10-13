import * as fs from 'fs';
import * as path from 'path';
import Ajv2020 from 'ajv/dist/2020.js';
import standaloneCode from 'ajv/dist/standalone/index.js';
import ajvErrors from 'ajv-errors';
import ajvFormats from 'ajv-formats';
import { minify } from 'terser';
import { sync } from 'gzip-size';

// The A2A validators are compiled with their own Ajv instance so that src/a2a/schemas/validators.ts only contains
// the Agent Card validators rather than the whole OpenAPI/Arazzo bundle.
export async function compileA2aSchemas(cwd: string, log: (...args: unknown[]) => void): Promise<void> {
  const schemas = await Promise.all(
    ['a2a/schemas/a2a/v0.3/index.json', 'a2a/schemas/a2a/v1.0/index.json'].map(
      async schema => JSON.parse(await fs.promises.readFile(path.join(cwd, schema), 'utf8')) as Record<string, unknown>,
    ),
  );

  const ajv = new Ajv2020({
    schemas,
    allErrors: true,
    messages: true,
    strict: false,
    inlineRefs: false,
    code: {
      esm: true,
      source: true,
    },
  });

  ajvFormats(ajv);
  ajvErrors(ajv);

  const target = path.join(cwd, 'a2a/schemas/validators.ts');
  const code = standaloneCode(ajv, {
    a2aAgentCard0_3: 'https://a2a-protocol.org/v0.3.0/spec/agent-card.schema.json',
    a2aAgentCard1_0: 'https://a2a-protocol.org/v1.0.1/spec/agent-card.schema.json',
  });

  const minified = (
    await minify(code, {
      compress: {
        passes: 2,
      },
      ecma: 2020,
      module: true,
      format: {
        comments: false,
      },
    })
  ).code as string;

  log(
    'writing %s size is %dKB (original), %dKB (minified) %dKB (minified + gzipped)',
    target,
    Math.round((code.length / 1024) * 100) / 100,
    Math.round((minified.length / 1024) * 100) / 100,
    Math.round((sync(minified) / 1024) * 100) / 100,
  );

  await fs.promises.writeFile(target, ['// @ts-nocheck', minified].join('\n'));
}
