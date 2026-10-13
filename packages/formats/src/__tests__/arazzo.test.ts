import { arazzo1_0, arazzo1_1, arazzo1_2 } from '../arazzo';

describe('Arazzo format', () => {
  describe('Arazzo 1.0.x', () => {
    it.each(['1.0.0', '1.0', '1.0.1', '1.0.2', '1.0.99'])('recognizes %s version correctly', version => {
      expect(arazzo1_0({ arazzo: version }, null)).toBe(true);
    });

    const testCases = [
      { arazzo: '0.1' },
      { arazzo: '1.1.0' },
      { arazzo: '2' },
      { arazzo: '2.0' },
      { arazzo: '2.0.' },
      { arazzo: '2.0.01' },
      { arazzo: 2 },
      { arazzo: null },
      { arazzo: '4.0' },
      {},
      null,
    ];

    it.each(testCases)('does not recognize invalid document %o', document => {
      expect(arazzo1_0(document, null)).toBe(false);
    });
  });

  describe('Arazzo 1.1.x', () => {
    it.each(['1.1.0', '1.1', '1.1.1', '1.1.99'])('recognizes %s version correctly', version => {
      expect(arazzo1_1({ arazzo: version }, null)).toBe(true);
    });

    const testCases = [
      { arazzo: '1.0.0' },
      { arazzo: '1.0.1' },
      { arazzo: '1.2.0' },
      { arazzo: '1.10.0' },
      { arazzo: '1.1.0-rc1' },
      { arazzo: '2.0' },
      { arazzo: null },
      {},
      null,
    ];

    it.each(testCases)('does not recognize invalid document %o', document => {
      expect(arazzo1_1(document, null)).toBe(false);
    });
  });

  describe('Arazzo 1.2.x', () => {
    it.each(['1.2.0', '1.2', '1.2.1'])('recognizes %s version correctly', version => {
      expect(arazzo1_2({ arazzo: version }, null)).toBe(true);
      expect(arazzo1_1({ arazzo: version }, null)).toBe(false);
      expect(arazzo1_0({ arazzo: version }, null)).toBe(false);
    });

    it.each([{ arazzo: '1.1.0' }, { arazzo: '1.0.1' }, { arazzo: '1.3.0' }, { arazzo: '1.20.0' }, {}, null])(
      'does not recognize invalid document %o',
      document => {
        expect(arazzo1_2(document, null)).toBe(false);
      },
    );
  });
});
