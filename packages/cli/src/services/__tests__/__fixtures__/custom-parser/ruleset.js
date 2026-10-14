const kvParser = require('./kv-parser.js');

function truthy(input) {
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!input) {
    return [{ message: '#{{print("property")}}must be truthy' }];
  }
}

module.exports = {
  parsers: [kvParser],
  rules: {
    'defined-port': {
      given: '$..port',
      then: {
        function: truthy,
      },
    },
  },
};
