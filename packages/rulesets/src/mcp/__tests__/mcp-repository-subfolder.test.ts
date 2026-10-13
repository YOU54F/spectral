import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { server } from './__helpers__/tester';

const withSubfolder = (subfolder: string): Record<string, unknown> =>
  server({ repository: { url: 'https://github.com/example/monorepo', source: 'github', subfolder } });

testRule('mcp-repository-subfolder', [
  ...['src/weather', 'servers/weather-v2', 'packages/.config_dir'].map(subfolder => ({
    name: `valid subfolder ${subfolder}`,
    document: withSubfolder(subfolder),
    errors: [],
  })),
  ...['/src/weather', 'src/weather/', '../weather', 'src/./weather', 'src//weather', 'src/weather server'].map(
    subfolder => ({
      name: `invalid subfolder ${subfolder}`,
      document: withSubfolder(subfolder),
      errors: [
        {
          message: `Repository subfolder "${subfolder}" must be a relative path (e.g. "src/server") without leading or trailing slashes, "." or ".." segments.`,
          path: ['repository', 'subfolder'],
          severity: DiagnosticSeverity.Error,
        },
      ],
    }),
  ),
]);
