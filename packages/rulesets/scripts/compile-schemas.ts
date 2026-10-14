/* eslint-disable no-console */
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import AjvDraft7 from 'ajv/dist/ajv.js';
import standaloneCode from 'ajv/dist/standalone/index.js';
import ajvErrors from 'ajv-errors';
import ajvFormats from 'ajv-formats';
import chalk from 'chalk';
import { minify } from 'terser';
import { sync } from 'gzip-size';
import { compileA2aSchemas } from './compile-a2a-schemas';

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
  'arazzo/schemas/arazzo/v1.1/index.json',
  'arazzo/schemas/arazzo/v1.2/index.json',
].map(async schema => JSON.parse(await fs.promises.readFile(path.join(cwd, schema), 'utf8')));

// Overlay validators are compiled with a dedicated Ajv instance so that they end up in a separate, small module
const overlaySchemas = [
  'overlay/schemas/overlay/v1.0/index.json',
  'overlay/schemas/overlay/v1.1/index.json',
  'overlay/schemas/overlay/v1.2/index.json',
].map(async schema => JSON.parse(await fs.promises.readFile(path.join(cwd, schema), 'utf8')));

// OpenRPC schemas are draft-07 based and use the json-schema-tools meta schema, so they are compiled separately.
// Both OpenRPC schemas share the same "$id" upstream (https://meta.open-rpc.org/), so we assign versioned ids here.
// They also reference the json-schema-tools meta schema both with and without a trailing slash, hence it is registered twice.
const openrpcSchemas = [
  ['openrpc/schemas/json-schema-tools/schema.json', null],
  ['openrpc/schemas/json-schema-tools/schema.json', 'https://meta.json-schema.tools'],
  ['openrpc/schemas/openrpc/v1.3/schema.json', 'https://meta.open-rpc.org/1.3/schema.json'],
  ['openrpc/schemas/openrpc/v1.4/schema.json', 'https://meta.open-rpc.org/1.4/schema.json'],
].map(async ([schema, id]) => {
  const json = discriminateOneOf(
    JSON.parse(await fs.promises.readFile(path.join(cwd, schema as string), 'utf8')) as Record<string, unknown>,
  );
  return id === null ? json : { ...json, $id: id };
});

// Upstream OpenRPC schemas use `oneOf: [<object>, <referenceObject>]` (and `oneOf: [<object>, <boolean>]` for JSON Schema),
// which makes Ajv report errors for every branch. Since the branches are trivially discriminable,
// we turn them into equivalent if/then/else constructs so that only errors of the relevant branch are reported.
function discriminateOneOf<T>(node: T): T {
  if (Array.isArray(node)) {
    return node.map(discriminateOneOf) as unknown as T;
  }

  if (node === null || typeof node !== 'object') {
    return node;
  }

  const { oneOf, ...rest } = node as Record<string, unknown>;
  const mapped = Object.fromEntries(Object.entries(rest).map(([key, value]) => [key, discriminateOneOf(value)]));
  if (!Array.isArray(oneOf) || oneOf.length !== 2) {
    return (oneOf === void 0 ? mapped : { ...mapped, oneOf: discriminateOneOf(oneOf) }) as T;
  }

  const refs = oneOf.map(item =>
    item !== null && typeof item === 'object' ? (item as { $ref?: unknown }).$ref : void 0,
  );
  const discriminators = {
    '#/definitions/referenceObject': { required: ['$ref'] },
    '#/definitions/JSONSchemaBoolean': { type: 'boolean' },
  };

  for (const [ref, condition] of Object.entries(discriminators)) {
    const index = refs.indexOf(ref);
    if (index !== -1) {
      return {
        ...mapped,
        if: condition,
        then: oneOf[index] as unknown,
        else: discriminateOneOf(oneOf[1 - index]),
      } as T;
    }
  }

  return { ...mapped, oneOf: discriminateOneOf(oneOf) } as T;
}

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
      arazzo1_1: 'https://spec.openapis.org/arazzo/1.1/schema/2026-04-15',
      arazzo1_2: 'https://spec.openapis.org/arazzo/1.2/schema/WORK-IN-PROGRESS',
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

    await compileA2aSchemas(cwd, log);
  })
  .then(compileMcpValidators)
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
  .then(() => Promise.all(openrpcSchemas))
  .then(async schemas => {
    const ajv = new Ajv({
      schemas,
      allErrors: true,
      messages: true,
      strict: false,
      inlineRefs: false,
      validateSchema: false,
      code: {
        esm: true,
        source: true,
      },
    });

    ajvFormats(ajv);

    const target = path.join(cwd, 'openrpc/schemas/validators.ts');
    const code = standaloneCode(ajv, {
      openrpc1_3: 'https://meta.open-rpc.org/1.3/schema.json',
      openrpc1_4: 'https://meta.open-rpc.org/1.4/schema.json',
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
  .then(() => compileAvroSchemas())
  .then(() => {
    log(chalk.green('Validators generated.'));
  })
  .catch(e => {
    console.error(chalk.red('Error generating validators %s'), e.message);
    process.exit(1);
  });

// MCP server.json schemas are draft-07, so they are compiled separately into their own module.
async function compileMcpValidators(): Promise<void> {
  const mcpSchemas = await Promise.all(
    ['mcp/schemas/server/2025-12-11/server.schema.json'].map(
      async schema => JSON.parse(await fs.promises.readFile(path.join(cwd, schema), 'utf8')) as Record<string, unknown>,
    ),
  );

  const ajv = new AjvDraft7({
    schemas: mcpSchemas,
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

  const target = path.join(cwd, 'mcp/schemas/validators.ts');
  const code = standaloneCode(ajv, {
    mcpServer2025_12_11: 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
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

// Avro gets its own, standalone validator module so that it does not bundle the (large) OpenAPI/Arazzo schemas.
async function compileAvroSchemas(): Promise<void> {
  const schema = JSON.parse(
    await fs.promises.readFile(path.join(cwd, 'avro/schemas/avro/v1.12/index.json'), 'utf8'),
  ) as Record<string, unknown>;

  const ajv = new Ajv2020({
    schemas: [schema],
    allErrors: true,
    messages: true,
    strict: false,
    inlineRefs: false,
    code: {
      esm: true,
      source: true,
    },
  });

  ajvErrors(ajv);

  const target = path.join(cwd, 'avro/schemas/validators.ts');
  const code = standaloneCode(ajv, {
    avro1: 'https://stoplight.io/spectral/schemas/avro/1.12/schema.json',
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
