import { randomBytes } from 'node:crypto'
import { existsSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const varsFile = '.dev.vars'
let created = false
if (!existsSync(varsFile)) {
  const teacherSecret = randomBytes(24).toString('base64url')
  const rateLimitSecret = randomBytes(32).toString('base64url')
  writeFileSync(varsFile, `TEACHER_ACCESS_SECRET="${teacherSecret}"\nRATE_LIMIT_SECRET="${rateLimitSecret}"\n`)
  created = true
  console.log('\nСоздан .dev.vars')
  console.log('КЛЮЧ УЧИТЕЛЯ ДЛЯ ЛОКАЛЬНОГО ВХОДА:')
  console.log(teacherSecret)
  console.log('\nСохраните его. Файл .dev.vars не должен попадать в Git.\n')
} else {
  console.log('.dev.vars уже существует — секрет учителя не меняем.')
}

console.log('Создаём/обновляем локальную D1 базу...')
const result = spawnSync('npx', ['wrangler', 'd1', 'execute', 'DB', '--config', 'wrangler.jsonc', '--local', '--file=cloudflare/schema.sql', '--yes'], {
  stdio: 'inherit',
  shell: true,
})
if (result.status !== 0) process.exit(result.status ?? 1)

const tasksResult = spawnSync('npx', ['wrangler', 'd1', 'execute', 'DB', '--config', 'wrangler.jsonc', '--local', '--file=cloudflare/task-bank.sql', '--yes'], { stdio: 'inherit', shell: true })
if (tasksResult.status !== 0) process.exit(tasksResult.status ?? 1)

if (!created) {
  console.log('\nЕсли вы забыли ключ учителя, откройте локальный файл .dev.vars на своём компьютере.')
}
console.log('\nЛокальный сервер подготовлен. Запуск: npm run dev')
