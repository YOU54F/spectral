/* eslint-disable no-console */
/**
 * Derives the Agent Card JSON Schemas used by the `spectral:a2a` ruleset from the vendored upstream A2A schemas
 * (see src/a2a/schemas/README.md). Run it whenever an upstream schema is re-vendored:
 *
 *   ts-node -T ./scripts/normalize-a2a-schemas.ts && prettier --write src/a2a/schemas/a2a
 *
 * - v1.0: the upstream bundle is generated from a2a.proto with protoc-gen-jsonschema. Its definitions are keyed by
 *   human readable titles, its $refs point at per-message files that are not part of the bundle, and it carries no
 *   `required` keywords. We re-key definitions, rewrite $refs to local pointers, add `required` from the proto's
 *   `field_behavior = REQUIRED` annotations and constrain proto `oneof` wrappers to a single member.
 * - v0.3: the upstream schema is draft-07. We drop the $schema keyword (it is compiled with the 2020-12 dialect,
 *   which is compatible for the keywords used) and replace the `anyOf` security scheme union with a `type`
 *   discriminated `if`/`then` chain so errors point at the offending scheme instead of every alternative.
 *
 * Only definitions reachable from AgentCard are kept.
 */
import * as fs from 'fs';
import * as path from 'path';

type JSONObject = Record<string, unknown>;

const schemasDir = path.join(__dirname, '../src/a2a/schemas');

// Fields annotated with `(google.api.field_behavior) = REQUIRED` in a2a.proto at v1.0.1.
const REQUIRED_1_0: Record<string, string[]> = {
  AgentCard: [
    'name',
    'description',
    'supportedInterfaces',
    'version',
    'capabilities',
    'defaultInputModes',
    'defaultOutputModes',
    'skills',
  ],
  AgentInterface: ['url', 'protocolBinding', 'protocolVersion'],
  AgentProvider: ['url', 'organization'],
  AgentSkill: ['id', 'name', 'description', 'tags'],
  AgentCardSignature: ['protected', 'signature'],
  APIKeySecurityScheme: ['location', 'name'],
  HTTPAuthSecurityScheme: ['scheme'],
  OAuth2SecurityScheme: ['flows'],
  OpenIdConnectSecurityScheme: ['openIdConnectUrl'],
  AuthorizationCodeOAuthFlow: ['authorizationUrl', 'tokenUrl', 'scopes'],
  ClientCredentialsOAuthFlow: ['tokenUrl', 'scopes'],
  DeviceCodeOAuthFlow: ['deviceAuthorizationUrl', 'tokenUrl', 'scopes'],
};

// proto `oneof` messages: exactly one member must be set.
const ONEOF_1_0 = ['SecurityScheme', 'OAuthFlows'];

function readJson(file: string): JSONObject {
  return JSON.parse(fs.readFileSync(path.join(schemasDir, file), 'utf8')) as JSONObject;
}

function writeJson(file: string, data: unknown): void {
  const target = path.join(schemasDir, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(data, null, 2) + '\n');
  console.log('wrote %s', path.relative(process.cwd(), target));
}

function mapRefs(value: unknown, mapper: (ref: string) => string): unknown {
  if (Array.isArray(value)) return value.map(item => mapRefs(item, mapper));
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      key === '$ref' && typeof item === 'string' ? mapper(item) : mapRefs(item, mapper),
    ]),
  );
}

function collectRefs(value: unknown, refs: Set<string>): Set<string> {
  if (Array.isArray(value)) {
    value.forEach(item => collectRefs(item, refs));
  } else if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key === '$ref' && typeof item === 'string') {
        refs.add(item.replace('#/definitions/', ''));
      } else {
        collectRefs(item, refs);
      }
    }
  }

  return refs;
}

function pickReachable(definitions: Record<string, JSONObject>, root: string): Record<string, JSONObject> {
  const reachable = new Set<string>();
  const queue = [root];
  while (queue.length > 0) {
    const name = queue.pop() as string;
    if (reachable.has(name)) continue;
    if (!(name in definitions)) throw new Error(`Unknown definition "${name}"`);
    reachable.add(name);
    queue.push(...collectRefs(definitions[name], new Set()));
  }

  return Object.fromEntries(
    Object.keys(definitions)
      .filter(name => reachable.has(name))
      .sort()
      .map(name => [name, definitions[name]]),
  );
}

function normalize1_0(): void {
  const upstream = readJson('upstream/a2a-v1.0.1.json');
  const definitions: Record<string, JSONObject> = {};

  for (const definition of Object.values(upstream.definitions as Record<string, JSONObject>)) {
    const { $schema: _, ...rest } = definition;
    const name = String(definition.title).replace(/ /g, '');
    definitions[name] = mapRefs(rest, ref => {
      const match = /^(?:lf\.a2a\.v1|google\.protobuf)\.(\w+)\.jsonschema\.json$/.exec(ref);
      if (match === null) throw new Error(`Unexpected $ref "${ref}"`);
      return `#/definitions/${match[1]}`;
    }) as JSONObject;
  }

  for (const [name, required] of Object.entries(REQUIRED_1_0)) {
    const properties = definitions[name].properties as JSONObject;
    for (const property of required) {
      if (!(property in properties)) throw new Error(`${name} has no "${property}" property`);
    }

    definitions[name].required = required;
  }

  for (const name of ONEOF_1_0) {
    definitions[name].minProperties = 1;
    definitions[name].maxProperties = 1;
  }

  writeJson('a2a/v1.0/index.json', {
    $id: 'https://a2a-protocol.org/v1.0.1/spec/agent-card.schema.json',
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'A2A Agent Card',
    description:
      'A2A v1.0 Agent Card. Derived by scripts/normalize-a2a-schemas.ts from https://a2a-protocol.org/v1.0.1/spec/a2a.json.',
    $ref: '#/definitions/AgentCard',
    definitions: pickReachable(definitions, 'AgentCard'),
  });
}

function normalize0_3(): void {
  const upstream = readJson('upstream/a2a-v0.3.0.json');
  const definitions = { ...(upstream.definitions as Record<string, JSONObject>) };

  const union = definitions.SecurityScheme.anyOf as { $ref: string }[];
  const types = union.map(({ $ref }) => {
    const name = $ref.replace('#/definitions/', '');
    const type = ((definitions[name].properties as JSONObject).type as { const: string }).const;
    return { $ref, type };
  });

  definitions.SecurityScheme = {
    description: definitions.SecurityScheme.description,
    type: 'object',
    required: ['type'],
    properties: {
      type: {
        type: 'string',
        enum: types.map(({ type }) => type),
      },
    },
    allOf: types.map(({ $ref, type }) => ({
      if: { properties: { type: { const: type } }, required: ['type'] },
      then: { $ref },
    })),
  };

  writeJson('a2a/v0.3/index.json', {
    $id: 'https://a2a-protocol.org/v0.3.0/spec/agent-card.schema.json',
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'A2A Agent Card',
    description:
      'A2A v0.3 Agent Card. Derived by scripts/normalize-a2a-schemas.ts from https://github.com/a2aproject/A2A/blob/v0.3.0/specification/json/a2a.json.',
    $ref: '#/definitions/AgentCard',
    definitions: pickReachable(definitions, 'AgentCard'),
  });
}

normalize1_0();
normalize0_3();
