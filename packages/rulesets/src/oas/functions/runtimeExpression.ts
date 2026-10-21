import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

export default createRulesetFunction<string, null>(
  {
    input: {
      type: 'string',
    },
    options: null,
  },
  function runtimeExpressions(exp) {
    // Link parameters and requestBody may hold constants as well as expressions.
    // Only values that start with `$` are runtime expressions.
    if (!exp.startsWith('$')) {
      return;
    }

    if (['$url', '$method', '$statusCode'].includes(exp)) {
      // valid expression
      return;
    } else if (exp.startsWith('$request.') || exp.startsWith('$response.')) {
      return validateSource(exp.replace(/^\$(request\.|response\.)/, ''));
    }

    return [
      {
        message: 'Expressions must start with one of: `$url`, `$method`, `$statusCode`, `$request.`,`$response.`',
      },
    ];
  },
);

function validateSource(source: string): void | IFunctionResult[] {
  if (source === 'body') {
    // valid expression
    return;
  } else if (source.startsWith('body#')) {
    return validateJsonPointer(source.replace(/^body#/, ''));
  } else if (source.startsWith('query.') || source.startsWith('path.')) {
    return validateName(source.replace(/^(query\.|path\.)/, ''));
  } else if (source.startsWith('header.')) {
    return validateToken(source.replace(/^header\./, ''));
  }

  return [
    {
      message: '`$request.` and `$response.` must be followed by one of: `header.`, `query.`, `body`, `body#`',
    },
  ];
}

function validateJsonPointer(jsonPointer: string): void | IFunctionResult[] {
  if (!jsonPointer.startsWith('/')) {
    return [
      {
        message: '`body#` must be followed by `/`',
      },
    ];
  }

  // RFC 6901: every reference token may only use `~` as part of the `~0` or `~1` escapes.
  const referenceTokens = jsonPointer.slice(1).split('/');
  if (!referenceTokens.every(isValidReferenceToken)) {
    return [
      {
        message:
          'String following `body#` is not a valid JSON pointer, see https://spec.openapis.org/oas/v3.1.0#runtime-expressions for more information',
      },
    ];
  }
}

function validateName(name: string): void | IFunctionResult[] {
  // zero or more of characters in the ASCII range 0x01-0x7F
  // eslint-disable-next-line no-control-regex
  const validName = /^[\x01-\x7F]*$/;
  if (!validName.test(name)) {
    return [
      {
        message: 'String following `query.` and `path.` must only include ascii characters 0x01-0x7F.',
      },
    ];
  }
}

function validateToken(token: string): void | IFunctionResult[] {
  // one or more of the given tchar characters
  const validTCharString = /^[a-zA-Z0-9!#$%&'*+\-.^_`|~]+$/;
  if (!validTCharString.test(token)) {
    return [
      {
        message: 'Must provide valid header name after `header.`',
      },
    ];
  }
}

function isValidReferenceToken(referenceToken: string): boolean {
  return /^(?:[^~]|~[01])*$/.test(referenceToken);
}
