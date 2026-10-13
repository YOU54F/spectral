import { Resolver } from '@stoplight/spectral-ref-resolver';
import * as Parsers from '@stoplight/spectral-parsers';
import { Document } from '../document';
import { Spectral } from '../spectral';
import { Ruleset } from '../ruleset';
import type { Format } from '../ruleset';

const fragmentFormat: Format = document => typeof document === 'object' && document !== null && 'fragments' in document;
fragmentFormat.displayName = 'Fragments';
fragmentFormat.unresolvedPaths = ['$.fragments[*].value'];

const plainFormat: Format = () => true;

const input = {
  fragments: [
    { value: { $ref: '#/components/schemas/Pet' } },
    { value: { nested: { deeper: { $ref: '#/also/missing' } } } },
    { other: { $ref: '#/broken' } },
  ],
  local: { $ref: '#/definitions/Existing' },
  definitions: { Existing: { type: 'string' } },
};

function createSpectral(formats: Format[], resolver?: Resolver): Spectral {
  const spectral = new Spectral(resolver !== void 0 ? { resolver } : void 0);
  spectral.setRuleset(new Ruleset({ formats, rules: {} }));
  return spectral;
}

describe('Format.unresolvedPaths', () => {
  it('leaves $refs within the declared subtrees unresolved and unreported', async () => {
    const { results, resolved } = await createSpectral([fragmentFormat]).runWithResolved(JSON.stringify(input));

    expect(results).toEqual([
      expect.objectContaining({
        code: 'invalid-ref',
        path: ['fragments', '2', 'other', '$ref'],
      }),
    ]);

    expect(resolved).toEqual({
      ...input,
      local: { type: 'string' },
    });
  });

  it('does not attempt to fetch remote $refs within the declared subtrees', async () => {
    const resolve = jest.fn().mockResolvedValue('{}');
    const resolver = new Resolver({ resolvers: { https: { resolve } } });

    const results = await createSpectral([fragmentFormat], resolver).run(
      JSON.stringify({ fragments: [{ value: { $ref: 'https://example.com/pet.json' } }] }),
    );

    expect(results).toEqual([]);
    expect(resolve).not.toHaveBeenCalled();
  });

  it('resolves everything when the declaring format does not match the document', async () => {
    const results = await createSpectral([fragmentFormat, plainFormat]).run(
      JSON.stringify({ items: [{ value: { $ref: '#/missing' } }] }),
    );

    expect(results).toEqual([expect.objectContaining({ code: 'invalid-ref', path: ['items', '0', 'value', '$ref'] })]);
  });

  it('resolves everything when no format declares unresolvedPaths', async () => {
    const results = await createSpectral([plainFormat]).run(JSON.stringify(input));

    expect(results.map(({ path }) => path)).toEqual([
      ['fragments', '0', 'value', '$ref'],
      ['fragments', '1', 'value', 'nested', 'deeper', '$ref'],
      ['fragments', '2', 'other', '$ref'],
    ]);
  });

  it('does not alter the resolver options when nothing needs to be skipped', async () => {
    const resolver = new Resolver();
    const resolve = jest.spyOn(resolver, 'resolve');

    await createSpectral([fragmentFormat], resolver).run(JSON.stringify({ fragments: [] }));

    expect(resolve).toHaveBeenCalledWith(expect.any(Object), {
      parseResolveResult: expect.any(Function),
    });
  });

  it('honours formats assigned to the document upfront', async () => {
    const document = new Document(JSON.stringify(input), Parsers.Json);
    document.formats = new Set([fragmentFormat]);

    const results = await createSpectral([plainFormat]).run(document);

    expect(results.map(({ path }) => path)).toEqual([['fragments', '2', 'other', '$ref']]);
  });

  it('keeps calling the transformRef of a custom resolver for other $refs', async () => {
    const transformRef = jest.fn(({ ref }: { ref?: unknown }) => ref);
    const resolver = new Resolver({ transformRef });

    await createSpectral([fragmentFormat], resolver).run(JSON.stringify(input));

    expect(transformRef.mock.calls.map(([{ jsonPointer }]) => jsonPointer as string)).toEqual(
      expect.arrayContaining(['#/fragments/2/other', '#/local']),
    );
    expect(transformRef.mock.calls.map(([{ jsonPointer }]) => jsonPointer as string)).not.toEqual(
      expect.arrayContaining(['#/fragments/0/value']),
    );
  });
});
