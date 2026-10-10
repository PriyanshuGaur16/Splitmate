// PostToolUse hook: run Prettier on the file Claude just wrote or edited.
// Errors are swallowed on purpose; a formatting failure must never block Claude.
import { spawnSync } from 'node:child_process';

let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  try {
    const filePath = JSON.parse(input)?.tool_input?.file_path;
    if (filePath) {
      spawnSync('npx', ['--no-install', 'prettier', '--write', filePath], {
        stdio: 'ignore',
        shell: true,
        cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
      });
    }
  } catch {
    // ignore
  }
  process.exit(0);
});
