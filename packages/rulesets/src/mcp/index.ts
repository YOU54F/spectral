import { mcpServer } from '@stoplight/spectral-formats';
import { defined, enumeration, pattern } from '@stoplight/spectral-functions';

import mcpServerSchema from './functions/mcpServerSchema';
import mcpSchemaVersion, { CURRENT_SCHEMA_URL } from './functions/mcpSchemaVersion';
import mcpServerName from './functions/mcpServerName';
import mcpVersionNotRange from './functions/mcpVersionNotRange';
import mcpPackageTransport from './functions/mcpPackageTransport';
import mcpPackageFileSha256 from './functions/mcpPackageFileSha256';
import mcpPackageRuntimeHint from './functions/mcpPackageRuntimeHint';
import mcpRemoteUrl from './functions/mcpRemoteUrl';
import mcpNamedArgument from './functions/mcpNamedArgument';
import mcpSecretInput from './functions/mcpSecretInput';
import mcpRepository from './functions/mcpRepository';
import mcpRepositorySubfolder from './functions/mcpRepositorySubfolder';
import mcpHttpsUrl from './functions/mcpHttpsUrl';
import mcpMeta from './functions/mcpMeta';
import mcpPackagesOrRemotes from './functions/mcpPackagesOrRemotes';
import { SEMVER } from './functions/utils/version';

const VERSIONS = ['$.version', '$.packages[*].version'];

const INPUTS = [
  '$.packages[*].environmentVariables[*]',
  '$.packages[*].packageArguments[*]',
  '$.packages[*].runtimeArguments[*]',
  '$.packages[*].transport.headers[*]',
  '$.remotes[*].headers[*]',
  '$..variables[*]',
];

export default {
  documentationUrl: 'https://meta.stoplight.io/docs/spectral/docs/reference/mcp-rules.md',
  formats: [mcpServer],
  rules: {
    'mcp-server-schema': {
      description: 'server.json must be valid against the MCP server.json schema.',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      given: '$',
      then: {
        function: mcpServerSchema,
      },
    },
    'mcp-server-schema-required': {
      description: '"$schema" must be set; the MCP registry requires it.',
      message: '"$schema" must be set to "' + CURRENT_SCHEMA_URL + '"; the MCP registry requires it.',
      severity: 0,
      recommended: true,
      given: '$',
      then: {
        field: '$schema',
        function: defined,
      },
    },
    'mcp-server-schema-version': {
      description: '"$schema" should reference the current MCP server.json schema.',
      message: '{{error}}',
      severity: 1,
      recommended: true,
      given: '$',
      then: {
        function: mcpSchemaVersion,
      },
    },
    'mcp-server-name': {
      description: 'Server name must be a reverse-DNS "namespace/name".',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      given: '$.name',
      then: {
        function: mcpServerName,
      },
    },
    'mcp-server-version-semver': {
      description: 'Server version should follow semantic versioning.',
      message: 'Server version "{{value}}" should be a semantic version (e.g. "1.0.0").',
      severity: 1,
      recommended: true,
      given: '$.version',
      then: {
        function: pattern,
        functionOptions: {
          match: SEMVER.source,
        },
      },
    },
    'mcp-version-not-latest': {
      description: 'Versions must be specific, not "latest".',
      message: 'Version must be a specific version, not "latest".',
      severity: 0,
      recommended: true,
      given: VERSIONS,
      then: {
        function: pattern,
        functionOptions: {
          notMatch: '^\\s*latest\\s*$',
        },
      },
    },
    'mcp-version-not-range': {
      description: 'Versions must be specific, not a version range.',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      given: VERSIONS,
      then: {
        function: mcpVersionNotRange,
      },
    },
    'mcp-server-description': {
      description: 'Server must have a non-empty description.',
      message: 'Server "description" must not be empty.',
      severity: 1,
      recommended: true,
      given: '$',
      then: {
        field: 'description',
        function: pattern,
        functionOptions: {
          match: '\\S',
        },
      },
    },
    'mcp-server-title': {
      description: 'Server title must not be blank.',
      message: 'Server "title" must not be blank.',
      severity: 0,
      recommended: true,
      given: '$.title',
      then: {
        function: pattern,
        functionOptions: {
          match: '\\S',
        },
      },
    },
    'mcp-server-packages-or-remotes': {
      description: 'Server should define at least one package or remote.',
      message: '{{error}}',
      severity: 1,
      recommended: true,
      given: '$',
      then: {
        function: mcpPackagesOrRemotes,
      },
    },
    'mcp-package-identifier': {
      description: 'Package identifier must not contain whitespace.',
      message: 'Package "identifier" must not contain whitespace.',
      severity: 0,
      recommended: true,
      given: '$.packages[*].identifier',
      then: {
        function: pattern,
        functionOptions: {
          notMatch: '\\s',
        },
      },
    },
    'mcp-package-registry-type': {
      description: 'Package registry type should be one supported by the MCP registry.',
      message: '{{error}}',
      severity: 1,
      recommended: true,
      given: '$.packages[*].registryType',
      then: {
        function: enumeration,
        functionOptions: {
          values: ['npm', 'pypi', 'oci', 'nuget', 'mcpb', 'cargo'],
        },
      },
    },
    'mcp-package-mcpb-file-sha256': {
      description: 'MCPB packages must specify "fileSha256".',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      given: '$.packages[*]',
      then: {
        function: mcpPackageFileSha256,
      },
    },
    'mcp-package-runtime-hint': {
      description: 'Packages with "runtimeArguments" should specify a "runtimeHint".',
      message: '{{error}}',
      severity: 1,
      recommended: true,
      given: '$.packages[*]',
      then: {
        function: mcpPackageRuntimeHint,
      },
    },
    'mcp-package-transport': {
      description: 'Package transport must be consistent with its type and only use defined URL variables.',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      given: '$.packages[*]',
      then: {
        function: mcpPackageTransport,
      },
    },
    'mcp-remote-url': {
      description: 'Remote URLs must be public https URLs and only use defined variables.',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      given: '$.remotes[*]',
      then: {
        function: mcpRemoteUrl,
      },
    },
    'mcp-named-argument': {
      description: 'Named arguments must have a valid name that is not repeated in their value.',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      given: ['$.packages[*].packageArguments[*]', '$.packages[*].runtimeArguments[*]'],
      then: {
        function: mcpNamedArgument,
      },
    },
    'mcp-secret-input': {
      description: 'Inputs that look like secrets should be marked "isSecret" and must not hard-code values.',
      message: '{{error}}',
      severity: 1,
      recommended: true,
      given: INPUTS,
      then: {
        function: mcpSecretInput,
      },
    },
    'mcp-repository-url': {
      description: 'Repository URL must match the repository source.',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      given: '$.repository',
      then: {
        function: mcpRepository,
      },
    },
    'mcp-repository-subfolder': {
      description: 'Repository subfolder must be a clean relative path.',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      given: '$.repository.subfolder',
      then: {
        function: mcpRepositorySubfolder,
      },
    },
    'mcp-urls-https': {
      description: 'Website and icon URLs must be absolute https URLs.',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      given: ['$.websiteUrl', '$.icons[*].src'],
      then: {
        function: mcpHttpsUrl,
      },
    },
    'mcp-meta-publisher-provided': {
      description: 'Only publisher-provided "_meta" is preserved by the MCP registry, up to 4KB.',
      message: '{{error}}',
      severity: 1,
      recommended: true,
      given: '$._meta',
      then: {
        function: mcpMeta,
      },
    },
  },
};
