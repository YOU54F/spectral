import type { Format } from '@stoplight/spectral-core';
import { isPlainObject } from '@stoplight/json';

type MaybeOpenRpc = { openrpc: unknown } & Record<string, unknown>;

// Matches released OpenRPC 1.x versions, i.e. 1.0.0-rc0 ... 1.4.x
const openrpc1Regex = /^1\.[0-9]+\.[0-9]+(?:-rc[0-9]+)?$/;

const isOpenRpc1 = (document: unknown): document is { openrpc: string } & Record<string, unknown> =>
  isPlainObject(document) &&
  'openrpc' in document &&
  typeof (document as MaybeOpenRpc).openrpc === 'string' &&
  openrpc1Regex.test((document as MaybeOpenRpc).openrpc as string);

export const openrpc1: Format = isOpenRpc1;
openrpc1.displayName = 'OpenRPC 1.x';
