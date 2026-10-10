// UserPromptSubmit hook: append each prompt to .claude/prompt-history.log
// Format: [YYYY-MM-DD HH:MM:SS] session:<first 8 chars of id> | <prompt>
import fs from 'node:fs';
import path from 'node:path';

let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  try {
    const { prompt, session_id: sessionId } = JSON.parse(input);
    const pad = (n) => String(n).padStart(2, '0');
    const d = new Date();
    const stamp =
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const session = String(sessionId || 'unknown').slice(0, 8);
    const text = String(prompt || '').replace(/\s*[\r\n]+\s*/g, ' ').trim();
    const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    fs.appendFileSync(
      path.join(dir, '.claude', 'prompt-history.log'),
      `[${stamp}] session:${session} | ${text}\n`
    );
  } catch {
    // never block a prompt because logging failed
  }
  process.exit(0);
});
