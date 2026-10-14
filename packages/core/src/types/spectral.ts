import { IDiagnostic, JsonPath } from '@stoplight/types';
import type { JSONSchema7 } from 'json-schema';
import type { Resolver } from '@stoplight/spectral-ref-resolver';
import type { ParserEntry } from '@stoplight/spectral-parsers';

export interface IConstructorOpts {
  resolver?: Resolver;
  // Parsers for documents that are neither JSON nor YAML. They take precedence over the parsers declared by the ruleset.
  parsers?: Iterable<ParserEntry>;
}

export interface IRunOpts {
  ignoreUnknownFormat?: boolean;
}

export interface ISpectralDiagnostic extends IDiagnostic {
  path: JsonPath;
  code: string | number;
  documentationUrl?: string;
}

export type IRuleResult = ISpectralDiagnostic;

export interface ISpectralFullResult {
  resolved: unknown;
  results: IRuleResult[];
}

export interface IGivenNode {
  path: JsonPath;
  value: unknown;
}

export type JSONSchema = JSONSchema7;
