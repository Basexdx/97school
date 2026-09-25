import { randomBytes } from 'node:crypto'
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'

const varsFile = '.dev.vars'
let varsText = existsSync(varsFile) ? readFileSync(varsFile, 'utf8') : ''
const readVar = name => varsText.match(new RegExp(`^${name}=(?:"([^"]*)"|'([^']*)'|([^\\r\\n]*))$`, 'm'))?.slice(1).find(value => value !== undefined) || ''
const setVar = (name, value) => {
  const line = `${name}="${value}"`
  const pattern = new RegExp(`^${name}=.*$`, 'm')
  varsText = pattern.test(varsText) ? varsText.replace(pattern, line) : `${varsText}${varsText.endsWith('\n') || !varsText ? '' : '\n'}${line}\n`
}

let teacherEmail = process.env.TEACHER_EMAIL || readVar('TEACHER_EMAIL')
if (!teacherEmail && process.stdin.isTTY) {
  const prompt = createInterface({ input: process.stdin, output: process.stdout })
  teacherEmail = (await prompt.question('Введите email, с которым будете входить как учитель: ')).trim().toLowerCase()
  prompt.close()
}
teacherEmail = (teacherEmail || '').trim().toLowerCase()
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teacherEmail || '') || teacherEmail.length > 254) {
  console.error('Не задан корректный TEACHER_EMAIL. Запустите setup:local в терминале или задайте TEACHER_EMAIL.')
  process.exit(1)
}

const existingTeacherSecret = process.env.TEACHER_ACCESS_SECRET || readVar('TEACHER_ACCESS_SECRET')
const teacherSecret = existingTeacherSecret || randomBytes(24).toString('base64url')
const rateLimitSecret = process.env.RATE_LIMIT_SECRET || readVar('RATE_LIMIT_SECRET') || randomBytes(32).toString('base64url')
const appOrigin = process.env.APP_ORIGIN || readVar('APP_ORIGIN') || 'http://127.0.0.1:3000'
let parsedOrigin
try { parsedOrigin = new URL(appOrigin) } catch {}
if (!parsedOrigin || parsedOrigin.origin !== appOrigin || !(parsedOrigin.protocol === 'https:' || (parsedOrigin.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(parsedOrigin.hostname)))) {
  console.error('APP_ORIGIN должен быть HTTPS-origin сайта или localhost для разработки (без пути).')
  process.exit(1)
}
setVar('APP_ORIGIN', appOrigin)
setVar('TEACHER_EMAIL', teacherEmail)
setVar('TEACHER_ACCESS_SECRET', teacherSecret)
setVar('RATE_LIMIT_SECRET', rateLimitSecret)
writeFileSync(varsFile, varsText, { mode: 0o600 })
try { chmodSync(varsFile, 0o600) } catch {}

if (existingTeacherSecret) {
  console.log('.dev.vars подготовлен; существующий секрет учителя сохранён.')
} else {
  console.log('\nСоздан локальный пароль учителя. Сохраните его — он показывается только сейчас:')
  console.log(teacherSecret)
}
console.log('Локальные настройки содержат email, пароль и ключ rate limit; .dev.vars исключён из Git.\n')

console.log('Создаём/обновляем локальную D1 базу...')
const result = spawnSync('npx', ['wrangler', 'd1', 'execute', 'DB', '--config', 'wrangler.jsonc', '--local', '--file=cloudflare/schema.sql', '--yes'], {
  stdio: 'inherit',
  shell: true,
})
if (result.status !== 0) process.exit(result.status ?? 1)

const tasksResult = spawnSync('npx', ['wrangler', 'd1', 'execute', 'DB', '--config', 'wrangler.jsonc', '--local', '--file=cloudflare/task-bank.sql', '--yes'], { stdio: 'inherit', shell: true })
if (tasksResult.status !== 0) process.exit(tasksResult.status ?? 1)

console.log('\nЕсли вы забыли пароль учителя, откройте локальный файл .dev.vars на своём компьютере.')
console.log('\nЛокальный сервер подготовлен. Запуск: npm run dev')
