// Parses `key=value` lines.
const keyValue = {
  parse(input) {
    const data = {};
    const ast = {};
    const lineMap = [];

    input.split('\n').forEach((line, i) => {
      lineMap.push(i);
      const index = line.indexOf('=');
      if (index === -1) return;
      const key = line.slice(0, index).trim();
      data[key] = line.slice(index + 1).trim();
      ast[key] = { start: { line: i, character: 0 }, end: { line: i, character: line.length } };
    });

    return { data, ast, lineMap, diagnostics: [] };
  },
  getLocationForJsonPath(result, path) {
    const range = path.length > 0 ? result.ast[String(path[0])] : void 0;
    return range === void 0 ? void 0 : { range };
  },
  trapAccess(obj) {
    return obj;
  },
};

function truthy(input) {
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!input) {
    return [{ message: '#{{print("property")}}must be truthy' }];
  }
}

module.exports = {
  parsers: [{ parser: keyValue, extensions: ['.kv'] }],
  rules: {
    'defined-port': {
      given: '$..port',
      then: {
        function: truthy,
      },
    },
  },
};
