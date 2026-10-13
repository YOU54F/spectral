/* eslint-disable no-console */
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import Ajv2020 from 'ajv/dist/2020.js';
import standaloneCode from 'ajv/dist/standalone/index.js';
import ajvErrors from 'ajv-errors';
import ajvFormats from 'ajv-formats';
import chalk from 'chalk';
import { minify } from 'terser';
import { sync } from 'gzip-size';

const cwd = path.join(__dirname, '../src');

const schemas = [
  'oas/schemas/json-schema/draft-04.json',
  'oas/schemas/json-schema/draft-2020-12/index.json',
  'oas/schemas/json-schema/draft-2020-12/validation.json',
  'oas/schemas/oas/v2.0.json',
  'oas/schemas/oas/v3.0.json',
  'oas/schemas/oas/v3.1/dialect.schema.json',
  'oas/schemas/oas/v3.1/meta.schema.json',
  'oas/schemas/oas/v3.1/index.json',
  'oas/schemas/oas/v3.2/dialect.schema.json',
  'oas/schemas/oas/v3.2/meta.schema.json',
  'oas/schemas/oas/v3.2/index.json',
  'arazzo/schemas/arazzo/v1.0/index.json',
].map(async schema => JSON.parse(await fs.promises.readFile(path.join(cwd, schema), 'utf8')));

// Overlay validators are compiled with a dedicated Ajv instance so that they end up in a separate, small module
const overlaySchemas = [
  'overlay/schemas/overlay/v1.0/index.json',
  'overlay/schemas/overlay/v1.1/index.json',
  'overlay/schemas/overlay/v1.2/index.json',
].map(async schema => JSON.parse(await fs.promises.readFile(path.join(cwd, schema), 'utf8')));

const log = process.argv.includes('--quiet')
  ? (): void => {
      /* no-op */
    }
  : console.log.bind(console);

Promise.all(schemas)
  .then(async schemas => {
    const ajv = new Ajv2020({
      schemas,
      allErrors: true,
      messages: true,
      strict: false,
      inlineRefs: false,
      formats: {
        'media-range': true,
      },
      code: {
        esm: true,
        source: true,
      },
    });

    ajvFormats(ajv);
    ajvErrors(ajv);

    const target = path.join(cwd, 'oas/schemas/validators.ts');
    const arazzoTarget = path.join(cwd, 'arazzo/schemas/validators.ts');
    const basename = path.basename(target);
    const code = standaloneCode(ajv, {
      oas2_0: 'http://swagger.io/v2/schema.json',
      oas3_0: 'https://spec.openapis.org/oas/3.0/schema/2019-04-02',
      oas3_1: 'https://spec.openapis.org/oas/3.1/schema/2021-09-28',
      oas3_2: 'https://spec.openapis.org/oas/3.2/schema/2025-11-23',
      arazzo1_0: 'https://spec.openapis.org/arazzo/1.0/schema/2024-08-01',
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
      path.join(target, '..', basename),
      Math.round((code.length / 1024) * 100) / 100,
      Math.round((minified.length / 1024) * 100) / 100,
      Math.round((sync(minified) / 1024) * 100) / 100,
    );

    await fs.promises.writeFile(path.join(target, '..', basename), ['// @ts-nocheck', minified].join('\n'));

    log(
      'writing %s size is %dKB (original), %dKB (minified) %dKB (minified + gzipped)',
      path.join(arazzoTarget, '..', basename),
      Math.round((code.length / 1024) * 100) / 100,
      Math.round((minified.length / 1024) * 100) / 100,
      Math.round((sync(minified) / 1024) * 100) / 100,
    );

    await fs.promises.writeFile(path.join(arazzoTarget, '..', basename), ['// @ts-nocheck', minified].join('\n'));
  })
  .then(async () => {
    const ajv = new Ajv2020({
      schemas: await Promise.all(overlaySchemas),
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

    const target = path.join(cwd, 'overlay/schemas/validators.ts');
    const code = standaloneCode(ajv, {
      overlay1_0: 'https://spec.openapis.org/overlay/1.0/schema/2026-04-01',
      overlay1_1: 'https://spec.openapis.org/overlay/1.1/schema/2026-04-01',
      overlay1_2: 'https://spec.openapis.org/overlay/1.2/schema/2026-08-08',
      // the two branches of the Overlay 1.2 "actions" oneOf, used to report errors of the relevant branch only
      overlay1_2_action: 'https://spec.openapis.org/overlay/1.2/schema/2026-08-08#/$defs/action-object',
      overlay1_2_actionReference:
        'https://spec.openapis.org/overlay/1.2/schema/2026-08-08#/$defs/reusable-action-reference-object',
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
  })
  .then(() => {
    log(chalk.green('Validators generated.'));
  })
  .catch(e => {
    console.error(chalk.red('Error generating validators %s'), e.message);
    process.exit(1);
  });
