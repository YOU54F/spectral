import { overlay1, overlay1_0, overlay1_1, overlay1_2 } from '../overlay';

const invalidDocuments = [
  { overlay: '0.1' },
  { overlay: '2' },
  { overlay: '2.0' },
  { overlay: '1.0.x' },
  { overlay: '1.3.0' },
  { overlay: 1 },
  { overlay: 1.0 },
  { overlay: null },
  { openapi: '3.1.0' },
  { arazzo: '1.0.0' },
  {},
  null,
  [],
  '1.0.0',
];

describe('Overlay format', () => {
  describe.each([
    ['1.0', overlay1_0, ['1.0.0', '1.0', '1.0.1', '1.0.99']],
    ['1.1', overlay1_1, ['1.1.0', '1.1', '1.1.1', '1.1.99']],
    ['1.2', overlay1_2, ['1.2.0', '1.2', '1.2.1', '1.2.99']],
  ] as const)('Overlay %s.x', (minor, format, versions) => {
    it.each(versions)('recognizes %s version correctly', version => {
      expect(format({ overlay: version }, null)).toBe(true);
      expect(overlay1({ overlay: version }, null)).toBe(true);
    });

    it.each(['1.0.0', '1.1.0', '1.2.0'].filter(version => !version.startsWith(minor)))(
      'does not recognize %s version',
      version => {
        expect(format({ overlay: version }, null)).toBe(false);
      },
    );

    it.each(invalidDocuments)('does not recognize invalid document %o', document => {
      expect(format(document, null)).toBe(false);
    });
  });

  it.each(invalidDocuments)('overlay1 does not recognize invalid document %o', document => {
    expect(overlay1(document, null)).toBe(false);
  });
});
