import { createRulesetFunction } from '@stoplight/spectral-core';
import { overlay1_0, overlay1_1 } from '@stoplight/spectral-formats';
import { fullFormats } from 'ajv-formats/dist/formats';

const uriReference = fullFormats['uri-reference'] as RegExp;

export default createRulesetFunction<unknown, null>(
  {
    input: null,
    options: null,
  },
  function overlayExtendsUri(input, _opts, context) {
    if (input === void 0) return;

    if (typeof input !== 'string') {
      return [{ message: '"extends" must be a URI reference string' }];
    }

    if (!uriReference.test(input)) {
      return [{ message: `"extends" must be a valid URI reference, "${input}" is not` }];
    }

    const formats = context.document.formats;
    const allowsFragment = (formats?.has(overlay1_0) ?? false) || (formats?.has(overlay1_1) ?? false);
    if (!allowsFragment && input.includes('#')) {
      return [{ message: '"extends" must not contain a fragment' }];
    }

    return;
  },
);
