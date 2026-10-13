import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { card0_3, card1_0, clone } from './__helpers__/cards';

const skill = card1_0.skills[0];

testRule('a2a-media-types', [
  {
    name: 'valid 1.0 card',
    document: {
      ...clone(card1_0),
      defaultInputModes: ['text/plain', 'image/*', 'application/json; charset=utf-8', 'application/vnd.a2a+json'],
    },
    errors: [],
  },
  {
    name: 'valid 0.3 card',
    document: clone(card0_3),
    errors: [],
  },
  {
    name: 'invalid media types',
    document: {
      ...clone(card0_3),
      defaultOutputModes: ['text'],
      skills: [{ ...skill, inputModes: ['text/plain'], outputModes: ['image png'] }],
    },
    errors: [
      {
        message: '"text" is not a valid media type (expected "type/subtype").',
        path: ['defaultOutputModes', '0'],
        severity: DiagnosticSeverity.Warning,
      },
      {
        message: '"image png" is not a valid media type (expected "type/subtype").',
        path: ['skills', '0', 'outputModes', '0'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
]);
