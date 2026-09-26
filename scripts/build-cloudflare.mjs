import { spawnSync } from 'node:child_process'

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const env = { ...process.env, GENIUS_STATIC_BUILD: '1' }
delete env.NEXT_PUBLIC_GENIUS_API_ORIGIN

const result = spawnSync(npm, ['run', 'build'], {
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

if (result.error) {
  console.error(result.error)
  process.exit(1)
}

process.exit(result.status ?? 1)
