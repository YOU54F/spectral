import { Document } from '@stoplight/spectral-core';
import { Protobuf, ProtobufDocument, ProtobufParserResult } from '@stoplight/spectral-parsers';
import testRule, { createWithRules } from '../../../__tests__/__helpers__/tester';

export const proto = (source: string): Document<ProtobufDocument, ProtobufParserResult> =>
  new Document(source, Protobuf, 'test.proto');

export { testRule as default, createWithRules };
