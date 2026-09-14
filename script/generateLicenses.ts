import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

try {
  const output = execSync('bunx license-checker@latest --production --json', {
    encoding: 'utf8',
  });
  const licenses: Record<
    string,
    { version: string; licenses: string; repository: string }
  > = JSON.parse(output);
  const disclaimer = Object.entries(licenses)
    .map(
      ([name, info]) => `${name}@${info.version}\n${info.licenses}\n${info.repository}\n`,
    )
    .join('\n');

  const content = `${disclaimer}\n\nffmpeg is licensed under GPL v2+:\n\nhttp://www.gnu.org/licenses/old-licenses/gpl-2.0.html`;
  writeFileSync('licenses.txt', content, 'utf8');
} catch (error) {
  console.error('Failed to generate licenses:', error);
  throw error;
}
