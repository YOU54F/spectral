import { DiagnosticSeverity } from '@stoplight/types';
import testRule from '../../__tests__/__helpers__/tester';

const doc = (links: Record<string, unknown>, componentLinks: Record<string, unknown> = {}) => ({
  openapi: '3.0.3',
  info: {
    title: 'response example',
    version: '1.0',
  },
  paths: {
    '/user': {
      get: {
        responses: {
          200: {
            description: 'dummy description',
            links,
          },
        },
      },
    },
  },
  components: {
    links: componentLinks,
  },
});

testRule('oas3-links-parameters-expression', [
  {
    name: 'valid runtime expressions and constants',
    document: doc(
      {
        link1: {
          operationId: 'getUser',
          parameters: {
            url: '$url',
            method: '$method',
            status: '$statusCode',
            id: '$response.body#/id',
            nested: '$response.body#/data/0/a~1b',
            wholeBody: '$request.body',
            q: '$request.query.limit',
            p: '$request.path.id',
            h: '$response.header.X-Rate-Limit',
            constant: 'not-an-expression',
            numeric: 10,
          },
          requestBody: '$request.body#/user',
        },
      },
      {
        sharedLink: {
          operationId: 'getUser',
          parameters: { id: '$response.body#/id' },
        },
      },
    ),
    errors: [],
  },
  {
    name: 'invalid runtime expressions in parameters and requestBody',
    document: doc(
      {
        link1: {
          operationId: 'getUser',
          parameters: {
            keyword: '$invalidkeyword',
            source: '$request.cookie.id',
            pointer: '$response.body#id',
            header: '$response.header.',
          },
          requestBody: '$response.body#/a~2',
        },
      },
      {
        sharedLink: {
          operationId: 'getUser',
          parameters: { id: '$invalidkeyword' },
        },
      },
    ),
    errors: [
      {
        message: 'Expressions must start with one of: `$url`, `$method`, `$statusCode`, `$request.`,`$response.`',
        path: ['paths', '/user', 'get', 'responses', '200', 'links', 'link1', 'parameters', 'keyword'],
        severity: DiagnosticSeverity.Error,
      },
      {
        message: '`$request.` and `$response.` must be followed by one of: `header.`, `query.`, `body`, `body#`',
        path: ['paths', '/user', 'get', 'responses', '200', 'links', 'link1', 'parameters', 'source'],
        severity: DiagnosticSeverity.Error,
      },
      {
        message: '`body#` must be followed by `/`',
        path: ['paths', '/user', 'get', 'responses', '200', 'links', 'link1', 'parameters', 'pointer'],
        severity: DiagnosticSeverity.Error,
      },
      {
        message: 'Must provide valid header name after `header.`',
        path: ['paths', '/user', 'get', 'responses', '200', 'links', 'link1', 'parameters', 'header'],
        severity: DiagnosticSeverity.Error,
      },
      {
        message:
          'String following `body#` is not a valid JSON pointer, see https://spec.openapis.org/oas/v3.1.0#runtime-expressions for more information',
        path: ['paths', '/user', 'get', 'responses', '200', 'links', 'link1', 'requestBody'],
        severity: DiagnosticSeverity.Error,
      },
      {
        message: 'Expressions must start with one of: `$url`, `$method`, `$statusCode`, `$request.`,`$response.`',
        path: ['components', 'links', 'sharedLink', 'parameters', 'id'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
]);
