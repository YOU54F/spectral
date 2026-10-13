/**
 * A dependency-free, browser-safe syntax checker for RFC 9535 JSONPath query expressions.
 *
 * It only checks that a query is well-formed and valid (including the type checks of section 2.4.3 for the
 * functions defined by RFC 9535: `length`, `count`, `match`, `search` and `value`). It does not evaluate queries.
 *
 * Non-standard syntax accepted by other JSONPath implementations (for instance the `[?(@.foo)]` script filters,
 * `@property`/`@parent` and JavaScript expressions of JSONPath-Plus, or the `$..foo^` parent operator) is rejected
 * unless it happens to also be valid RFC 9535 syntax (e.g. `[?(@.foo)]` is a valid RFC 9535 parenthesized filter).
 */

export class JsonPathSyntaxError extends Error {
  constructor(
    message: string,
    public readonly position: number,
  ) {
    super(message);
  }
}

type FunctionType = 'value' | 'logical' | 'nodes';

type Expr =
  | { kind: 'literal' }
  | { kind: 'query'; singular: boolean }
  | { kind: 'function'; name: string; returns: FunctionType }
  | { kind: 'logical' };

const FUNCTIONS: Record<string, { params: FunctionType[]; returns: FunctionType }> = {
  length: { params: ['value'], returns: 'value' },
  count: { params: ['nodes'], returns: 'value' },
  match: { params: ['value', 'value'], returns: 'logical' },
  search: { params: ['value', 'value'], returns: 'logical' },
  value: { params: ['nodes'], returns: 'value' },
};

const MAX_SAFE = 2 ** 53 - 1;

const isDigit = (c: string | undefined): boolean => c !== void 0 && c >= '0' && c <= '9';
const isAlpha = (c: string | undefined): boolean => c !== void 0 && ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'));
const isLcAlpha = (c: string | undefined): boolean => c !== void 0 && c >= 'a' && c <= 'z';
const isBlank = (c: string | undefined): boolean => c === ' ' || c === '\t' || c === '\n' || c === '\r';

class Parser {
  #i = 0;

  constructor(private readonly input: string) {}

  parse(): void {
    if (this.peek() !== '$') {
      this.fail('a JSONPath query must start with the root identifier "$"');
    }

    this.#i++;
    this.parseSegments();

    if (this.#i < this.input.length) {
      this.fail(`unexpected ${this.describe()}`);
    }
  }

  private peek(offset = 0): string | undefined {
    return this.input[this.#i + offset];
  }

  private describe(): string {
    const c = this.peek();
    return c === void 0 ? 'end of input' : `character ${JSON.stringify(c)}`;
  }

  private fail(message: string, position = this.#i): never {
    throw new JsonPathSyntaxError(message, position);
  }

  private expect(c: string): void {
    if (this.peek() !== c) {
      this.fail(`expected ${JSON.stringify(c)} but found ${this.describe()}`);
    }

    this.#i++;
  }

  private skipBlank(): boolean {
    const start = this.#i;
    while (isBlank(this.peek())) this.#i++;
    return this.#i !== start;
  }

  // segments = *(S segment)
  // returns whether all segments are singular (name or index selectors only)
  private parseSegments(): boolean {
    let singular = true;

    for (;;) {
      const save = this.#i;
      this.skipBlank();
      const c = this.peek();

      if (c === '[') {
        singular = this.parseBracketedSelection() && singular;
      } else if (c === '.') {
        if (this.peek(1) === '.') {
          this.#i += 2;
          singular = false;
          this.parseDescendantSegment();
        } else {
          this.#i++;
          singular = this.parseDotSegment() && singular;
        }
      } else {
        this.#i = save;
        return singular;
      }
    }
  }

  // "." (wildcard-selector / member-name-shorthand)
  private parseDotSegment(): boolean {
    if (this.peek() === '*') {
      this.#i++;
      return false;
    }

    this.parseMemberNameShorthand();
    return true;
  }

  // ".." (bracketed-selection / wildcard-selector / member-name-shorthand)
  private parseDescendantSegment(): void {
    const c = this.peek();
    if (c === '[') {
      this.parseBracketedSelection();
    } else if (c === '*') {
      this.#i++;
    } else {
      this.parseMemberNameShorthand();
    }
  }

  private parseMemberNameShorthand(): void {
    const start = this.#i;

    for (;;) {
      const cp = this.input.codePointAt(this.#i);
      if (cp === void 0) break;
      const c = String.fromCodePoint(cp);
      const first = this.#i === start;

      if (
        isAlpha(c) ||
        c === '_' ||
        (!first && isDigit(c)) ||
        (cp >= 0x80 && cp <= 0xd7ff) ||
        (cp >= 0xe000 && cp <= 0x10ffff)
      ) {
        this.#i += c.length;
      } else {
        break;
      }
    }

    if (this.#i === start) {
      this.fail(`expected a member name, "*" or "[" but found ${this.describe()}`);
    }
  }

  // "[" S selector *(S "," S selector) S "]"
  private parseBracketedSelection(): boolean {
    this.expect('[');
    let hadBlank = this.skipBlank();
    let count = 0;
    let singularSelector = false;

    for (;;) {
      singularSelector = this.parseSelector();
      count++;
      hadBlank = this.skipBlank() || hadBlank;

      if (this.peek() === ',') {
        this.#i++;
        this.skipBlank();
        continue;
      }

      this.expect(']');
      break;
    }

    return count === 1 && singularSelector && !hadBlank;
  }

  // returns whether the selector is a name or index selector
  private parseSelector(): boolean {
    const c = this.peek();

    if (c === "'" || c === '"') {
      this.parseStringLiteral();
      return true;
    }

    if (c === '*') {
      this.#i++;
      return false;
    }

    if (c === '?') {
      this.#i++;
      this.skipBlank();
      this.assertTestable(this.parseLogicalOr());
      return false;
    }

    // index-selector or slice-selector
    const hasStart = c === '-' || isDigit(c);
    if (hasStart) {
      this.parseInt();
    }

    const save = this.#i;
    this.skipBlank();

    if (this.peek() !== ':') {
      this.#i = save;
      if (!hasStart) {
        this.fail(`expected a selector but found ${this.describe()}`);
      }

      return true;
    }

    // slice-selector = [start S] ":" S [end S] [":" [S step ]]
    this.#i++;
    this.skipBlank();
    if (this.peek() === '-' || isDigit(this.peek())) {
      this.parseInt();
      this.skipBlank();
    }

    if (this.peek() === ':') {
      this.#i++;
      const beforeStep = this.#i;
      this.skipBlank();
      if (this.peek() === '-' || isDigit(this.peek())) {
        this.parseInt();
      } else {
        this.#i = beforeStep;
      }
    }

    return false;
  }

  // int = "0" / (["-"] DIGIT1 *DIGIT)
  private parseInt(): void {
    const start = this.#i;
    if (this.peek() === '-') this.#i++;

    if (this.peek() === '0') {
      if (this.#i !== start) {
        this.fail('"-0" is not a valid integer', start);
      }

      this.#i++;
      if (isDigit(this.peek())) {
        this.fail('integers must not have leading zeros', start);
      }

      return;
    }

    if (!isDigit(this.peek())) {
      this.fail(`expected a digit but found ${this.describe()}`);
    }

    while (isDigit(this.peek())) this.#i++;

    if (Math.abs(Number(this.input.slice(start, this.#i))) > MAX_SAFE) {
      this.fail('integer is out of the I-JSON range [-(2^53)+1, (2^53)-1]', start);
    }
  }

  private parseStringLiteral(): void {
    const quote = this.peek();
    const start = this.#i;
    this.#i++;

    for (;;) {
      const c = this.peek();
      if (c === void 0) {
        this.fail('unterminated string literal', start);
      }

      if (c === quote) {
        this.#i++;
        return;
      }

      if (c === '\\') {
        this.#i++;
        this.parseEscape(quote as string);
        continue;
      }

      const cp = this.input.codePointAt(this.#i) as number;
      if (cp < 0x20) {
        this.fail('control characters must be escaped in string literals');
      }

      if (cp >= 0xd800 && cp <= 0xdfff) {
        this.fail('lone surrogates are not allowed in string literals');
      }

      this.#i += cp > 0xffff ? 2 : 1;
    }
  }

  private parseEscape(quote: string): void {
    const c = this.peek();

    if (c === quote || c === 'b' || c === 'f' || c === 'n' || c === 'r' || c === 't' || c === '/' || c === '\\') {
      this.#i++;
      return;
    }

    if (c === 'u') {
      this.#i++;
      const code = this.parseHex4();
      if (code >= 0xdc00 && code <= 0xdfff) {
        this.fail('unexpected low surrogate escape', this.#i - 6);
      }

      if (code >= 0xd800 && code <= 0xdbff) {
        if (this.peek() !== '\\' || this.peek(1) !== 'u') {
          this.fail('high surrogate escape must be followed by a low surrogate escape');
        }

        this.#i += 2;
        const low = this.parseHex4();
        if (low < 0xdc00 || low > 0xdfff) {
          this.fail('high surrogate escape must be followed by a low surrogate escape', this.#i - 6);
        }
      }

      return;
    }

    this.fail(`invalid escape sequence "\\${c ?? ''}"`, this.#i - 1);
  }

  private parseHex4(): number {
    const hex = this.input.slice(this.#i, this.#i + 4);
    if (!/^[0-9A-Fa-f]{4}$/.test(hex)) {
      this.fail('expected 4 hexadecimal digits');
    }

    this.#i += 4;
    return parseInt(hex, 16);
  }

  // logical-or-expr = logical-and-expr *(S "||" S logical-and-expr)
  private parseLogicalOr(): Expr {
    let expr = this.parseLogicalAnd();

    for (;;) {
      const save = this.#i;
      this.skipBlank();
      if (this.peek() === '|' && this.peek(1) === '|') {
        this.assertTestable(expr);
        this.#i += 2;
        this.skipBlank();
        this.assertTestable(this.parseLogicalAnd());
        expr = { kind: 'logical' };
      } else {
        this.#i = save;
        return expr;
      }
    }
  }

  // logical-and-expr = basic-expr *(S "&&" S basic-expr)
  private parseLogicalAnd(): Expr {
    let expr = this.parseBasic();

    for (;;) {
      const save = this.#i;
      this.skipBlank();
      if (this.peek() === '&' && this.peek(1) === '&') {
        this.assertTestable(expr);
        this.#i += 2;
        this.skipBlank();
        this.assertTestable(this.parseBasic());
        expr = { kind: 'logical' };
      } else {
        this.#i = save;
        return expr;
      }
    }
  }

  // basic-expr = paren-expr / comparison-expr / test-expr
  private parseBasic(): Expr {
    const start = this.#i;

    if (this.peek() === '!') {
      this.#i++;
      this.skipBlank();
      if (this.peek() === '(') {
        this.parseParen();
      } else {
        const operand = this.parsePrimary();
        if (operand.kind === 'literal') {
          this.fail('the "!" operator cannot be applied to a literal', start);
        }

        this.assertTestable(operand, start);
      }

      this.assertNoComparison();
      return { kind: 'logical' };
    }

    if (this.peek() === '(') {
      this.parseParen();
      this.assertNoComparison();
      return { kind: 'logical' };
    }

    const left = this.parsePrimary();
    const save = this.#i;
    this.skipBlank();
    const op = this.readComparisonOp();

    if (op === null) {
      this.#i = save;
      return left;
    }

    this.assertComparable(left, start);
    this.skipBlank();
    const rightStart = this.#i;
    if (this.peek() === '(' || this.peek() === '!') {
      this.fail('expected a literal, singular query or function expression', rightStart);
    }

    this.assertComparable(this.parsePrimary(), rightStart);
    return { kind: 'logical' };
  }

  private parseParen(): void {
    this.expect('(');
    this.skipBlank();
    this.assertTestable(this.parseLogicalOr());
    this.skipBlank();
    this.expect(')');
  }

  private assertNoComparison(): void {
    const save = this.#i;
    this.skipBlank();
    if (this.readComparisonOp() !== null) {
      this.fail('logical expressions cannot be compared', save);
    }

    this.#i = save;
  }

  private readComparisonOp(): string | null {
    const two = this.input.slice(this.#i, this.#i + 2);
    if (two === '==' || two === '!=' || two === '<=' || two === '>=') {
      this.#i += 2;
      return two;
    }

    const one = this.peek();
    if (one === '<' || one === '>') {
      this.#i++;
      return one;
    }

    return null;
  }

  // literal / filter-query / function-expr
  private parsePrimary(): Expr {
    const c = this.peek();

    if (c === '@' || c === '$') {
      this.#i++;
      return { kind: 'query', singular: this.parseSegments() };
    }

    if (c === "'" || c === '"') {
      this.parseStringLiteral();
      return { kind: 'literal' };
    }

    if (c === '-' || isDigit(c)) {
      this.parseNumber();
      return { kind: 'literal' };
    }

    if (isLcAlpha(c)) {
      const start = this.#i;
      while (isLcAlpha(this.peek()) || isDigit(this.peek()) || this.peek() === '_') this.#i++;
      const name = this.input.slice(start, this.#i);

      if (this.peek() === '(') {
        return this.parseFunctionArguments(name, start);
      }

      if (name === 'true' || name === 'false' || name === 'null') {
        return { kind: 'literal' };
      }

      this.fail(`unexpected identifier "${name}"`, start);
    }

    this.fail(`expected a literal, query or function expression but found ${this.describe()}`);
  }

  // number = (int / "-0") [ frac ] [ exp ]
  private parseNumber(): void {
    const start = this.#i;
    if (this.peek() === '-' && this.peek(1) === '0') {
      this.#i += 2;
      if (isDigit(this.peek())) {
        this.fail('numbers must not have leading zeros', start);
      }
    } else {
      this.parseInt();
    }

    if (this.peek() === '.') {
      this.#i++;
      if (!isDigit(this.peek())) {
        this.fail(`expected a digit but found ${this.describe()}`);
      }

      while (isDigit(this.peek())) this.#i++;
    }

    if (this.peek() === 'e' || this.peek() === 'E') {
      this.#i++;
      if (this.peek() === '+' || this.peek() === '-') this.#i++;
      if (!isDigit(this.peek())) {
        this.fail(`expected a digit but found ${this.describe()}`);
      }

      while (isDigit(this.peek())) this.#i++;
    }
  }

  private parseFunctionArguments(name: string, start: number): Expr {
    const fn = Object.prototype.hasOwnProperty.call(FUNCTIONS, name) ? FUNCTIONS[name] : void 0;
    if (fn === void 0) {
      this.fail(`unknown function "${name}"`, start);
    }

    this.expect('(');
    this.skipBlank();
    const args: [Expr, number][] = [];

    if (this.peek() !== ')') {
      for (;;) {
        const argStart = this.#i;
        args.push([this.parseLogicalOr(), argStart]);
        this.skipBlank();
        if (this.peek() === ',') {
          this.#i++;
          this.skipBlank();
          continue;
        }

        break;
      }
    }

    this.expect(')');

    if (args.length !== fn.params.length) {
      this.fail(
        `function "${name}" expects ${fn.params.length} argument${fn.params.length === 1 ? '' : 's'} but got ${args.length}`,
        start,
      );
    }

    fn.params.forEach((param, index) => {
      const [arg, argStart] = args[index];
      if (!isValidArgument(param, arg)) {
        this.fail(`argument ${index + 1} of function "${name}" must be of ${describeType(param)}`, argStart);
      }
    });

    return { kind: 'function', name, returns: fn.returns };
  }

  // test-expr: queries, or functions returning LogicalType or NodesType
  private assertTestable(expr: Expr, position = this.#i): void {
    if (expr.kind === 'literal') {
      this.fail('literals must be compared, they cannot be used as a test expression', position);
    }

    if (expr.kind === 'function' && expr.returns === 'value') {
      this.fail(`the result of function "${expr.name}" must be compared`, position);
    }
  }

  // comparable = literal / singular-query / function-expr (ValueType)
  private assertComparable(expr: Expr, position: number): void {
    if (expr.kind === 'query' && !expr.singular) {
      this.fail('only singular queries can be compared', position);
    }

    if (expr.kind === 'function' && expr.returns !== 'value') {
      this.fail(`the result of function "${expr.name}" cannot be compared`, position);
    }

    if (expr.kind === 'logical') {
      this.fail('logical expressions cannot be compared', position);
    }
  }
}

function isValidArgument(param: FunctionType, arg: Expr): boolean {
  switch (param) {
    case 'value':
      return (
        arg.kind === 'literal' ||
        (arg.kind === 'query' && arg.singular) ||
        (arg.kind === 'function' && arg.returns === 'value')
      );
    case 'logical':
      return arg.kind === 'logical' || arg.kind === 'query' || (arg.kind === 'function' && arg.returns !== 'value');
    case 'nodes':
      return arg.kind === 'query' || (arg.kind === 'function' && arg.returns === 'nodes');
  }
}

function describeType(type: FunctionType): string {
  switch (type) {
    case 'value':
      return 'ValueType (a literal, a singular query or a function returning a value)';
    case 'logical':
      return 'LogicalType';
    case 'nodes':
      return 'NodesType (a query)';
  }
}

/**
 * Throws a JsonPathSyntaxError if the given string is not a valid RFC 9535 JSONPath query.
 */
export function assertValidJsonPath(query: string): void {
  new Parser(query).parse();
}

/**
 * Returns null for a valid RFC 9535 JSONPath query, otherwise an error describing the problem.
 */
export function validateJsonPath(query: string): JsonPathSyntaxError | null {
  try {
    assertValidJsonPath(query);
    return null;
  } catch (e) {
    if (e instanceof JsonPathSyntaxError) {
      return e;
    }

    throw e;
  }
}
