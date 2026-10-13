import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { card0_3, card1_0, clone } from './__helpers__/cards';

const skill = card1_0.skills[0];

testRule('a2a-skill-name-description', [
  {
    name: 'valid 1.0 card',
    document: clone(card1_0),
    errors: [],
  },
  {
    name: 'valid 0.3 card',
    document: clone(card0_3),
    errors: [],
  },
  {
    name: 'skill with an empty name and no description',
    document: {
      ...clone(card1_0),
      skills: [{ ...skill, name: '', description: undefined }],
    },
    errors: [
      {
        message: 'Skill should have a non-empty "name" and "description".',
        path: ['skills', '0'],
        severity: DiagnosticSeverity.Warning,
      },
      {
        message: 'Skill should have a non-empty "name" and "description".',
        path: ['skills', '0', 'name'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
]);
