// PreToolUse hook: appends every Bash command Claude runs to .claude/bash-history.log
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

let input = ''
process.stdin.on('data', (chunk) => (input += chunk))
process.stdin.on('end', () => {
  try {
    const command = JSON.parse(input).tool_input?.command
    if (!command) return
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const stamp =
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    const logFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bash-history.log')
    fs.appendFileSync(logFile, `[${stamp}] ${command}\n`)
  } catch {
    // Never block a tool call because logging failed.
  }
})
