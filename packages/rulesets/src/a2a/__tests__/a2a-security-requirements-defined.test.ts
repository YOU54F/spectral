import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { card0_3, card1_0, clone } from './__helpers__/cards';

const skill = card1_0.skills[0];

testRule('a2a-security-requirements-defined', [
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
    name: '1.0 card referencing undefined schemes',
    document: {
      ...clone(card1_0),
      securityRequirements: [{ schemes: { bearer: { list: [] }, oauth: { list: ['read'] } } }],
      skills: [{ ...skill, securityRequirements: [{ schemes: { apiKey: { list: [] } } }] }],
    },
    errors: [
      {
        message: 'Security scheme "oauth" is not defined in "securitySchemes".',
        path: ['securityRequirements', '0', 'schemes', 'oauth'],
        severity: DiagnosticSeverity.Error,
      },
      {
        message: 'Security scheme "apiKey" is not defined in "securitySchemes".',
        path: ['skills', '0', 'securityRequirements', '0', 'schemes', 'apiKey'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: '0.3 card referencing undefined schemes',
    document: {
      ...clone(card0_3),
      securitySchemes: undefined,
      security: [{ bearer: [] }],
      skills: [{ ...skill, security: [{ oauth: ['read'] }] }],
    },
    errors: [
      {
        message: 'Security scheme "bearer" is not defined in "securitySchemes".',
        path: ['security', '0', 'bearer'],
        severity: DiagnosticSeverity.Error,
      },
      {
        message: 'Security scheme "oauth" is not defined in "securitySchemes".',
        path: ['skills', '0', 'security', '0', 'oauth'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
]);
