import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { build } from 'esbuild'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'genius-security-test-'))
process.on('exit', () => fs.rmSync(temp, { recursive: true, force: true }))
await build({ entryPoints: [path.join(root, 'worker/src/index.js')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(temp, 'worker.mjs') })
const worker = (await import(pathToFileURL(path.join(temp, 'worker.mjs')))).default
const sqlite = path.join(temp, 'security.sqlite')

// Use a throwaway SQLite database so auth and throttling behavior are tested against real SQL.
function dbCall(sql, params = [], script = false) {
  const py = `import sqlite3,json,sys\nx=json.load(sys.stdin)\nc=sqlite3.connect(x['db'],timeout=15);c.row_factory=sqlite3.Row;c.execute('PRAGMA foreign_keys=ON')\nif x['script']:\n c.executescript(x['sql']);rows=[]\nelse:\n cur=c.execute(x['sql'],x['params']);rows=[dict(r) for r in cur.fetchall()]\nc.commit();print(json.dumps(rows))`
  const result = spawnSync('python3', ['-c', py], { input: JSON.stringify({ db: sqlite, sql, params, script }), encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr)
  return JSON.parse(result.stdout)
}

dbCall(fs.readFileSync(path.join(root, 'cloudflare/schema.sql'), 'utf8'), [], true)
const env = {
  DB: {
    prepare(sql) {
      let params = []
      return {
        bind(...values) { params = values; return this },
        async first() { return dbCall(sql, params)[0] || null },
        async all() { return { results: dbCall(sql, params) } },
        async run() { dbCall(sql, params); return { success: true } },
      }
    },
    async batch(statements) {
      for (const statement of statements) await statement.run()
      return []
    },
  },
  TEACHER_EMAIL: 'teacher.real@example.org',
  TEACHER_ACCESS_SECRET: 'local-test-password-long-enough',
  RATE_LIMIT_SECRET: 'local-test-rate-limit-secret-32-bytes-long',
  TEACHER_ID: 'teacher_01',
  APP_ORIGIN: 'https://genius.test',
}

function post(url, data, ip, extraHeaders = {}) {
  return worker.fetch(new Request(`https://genius.test${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'CF-Connecting-IP': ip, Origin: env.APP_ORIGIN, ...extraHeaders },
    body: JSON.stringify(data),
  }), env)
}

test('teacher login requires configured email and strong server password and creates a protected session', async () => {
  const wrongEmail = await post('/api/teacher/login', { email: 'other@example.org', password: env.TEACHER_ACCESS_SECRET }, '198.51.100.10')
  assert.equal(wrongEmail.status, 401)

  const response = await post('/api/teacher/login', { email: env.TEACHER_EMAIL, password: env.TEACHER_ACCESS_SECRET }, '198.51.100.11')
  assert.equal(response.status, 200)
  const cookie = response.headers.get('set-cookie')
  assert.match(cookie, /HttpOnly/)
  assert.match(cookie, /Secure/)
  assert.match(cookie, /SameSite=Strict/)
  assert.match(cookie, /Max-Age=43200/)
  const result = await response.json()
  assert.equal(result.teacher.email, env.TEACHER_EMAIL)

  const me = await worker.fetch(new Request('https://genius.test/api/teacher/me', { headers: { cookie: cookie.split(';')[0] } }), env)
  assert.equal(me.status, 200)
  assert.equal((await me.json()).teacher.email, env.TEACHER_EMAIL)
})

test('teacher login blocks plain HTTP outside localhost', async () => {
  const response = await worker.fetch(new Request('http://genius.test/api/teacher/login', {
    method: 'POST', headers: { 'content-type': 'application/json', Origin: env.APP_ORIGIN }, body: JSON.stringify({ email: env.TEACHER_EMAIL, password: env.TEACHER_ACCESS_SECRET }),
  }), env)
  assert.equal(response.status, 400)
})

test('teacher login is rate limited by trusted client IP, not spoofable forwarded headers', async () => {
  const statuses = []
  for (let i = 0; i < 9; i++) {
    const response = await post('/api/teacher/login', { email: `attacker${i}@example.org`, password: 'incorrect-password-1234' }, '198.51.100.20', { 'X-Forwarded-For': `203.0.113.${i + 1}` })
    statuses.push(response.status)
  }
  assert.deepEqual(statuses, [401, 401, 401, 401, 401, 401, 401, 401, 429])
})

test('teacher actions reject cross-origin and missing-Origin requests', async () => {
  const unauthenticated = new Request('https://genius.test/api/teacher/connection-requests/request-1/approve', { method: 'POST', headers: { Origin: 'https://attacker.test' } })
  const crossOrigin = await worker.fetch(unauthenticated, env)
  assert.equal(crossOrigin.status, 403)
  const missingOrigin = await worker.fetch(new Request('https://genius.test/api/teacher/logout', { method: 'POST' }), env)
  assert.equal(missingOrigin.status, 403)
})

test('student access-code endpoint stops repeated guesses', async () => {
  const statuses = []
  for (let i = 0; i < 11; i++) {
    const response = await post('/api/student/access/request', { code: `wrong-code-${i}` }, '198.51.100.21')
    statuses.push(response.status)
  }
  assert.deepEqual(statuses, [...Array(10).fill(400), 429])
})

test('student can request access, get teacher approval, and restore a protected session', async () => {
  const code = 'GNS-ABCD-EFGH-JKLM'
  const keyHash = createHash('sha256').update(code).digest('hex')
  dbCall(`INSERT INTO access_keys(id,class_id,key_hash,key_label,purpose,status,expires_at)
    VALUES('student-flow-key','class_8B',?,'ученик 8Б','INITIAL_ACCESS','ACTIVE','2099-01-01T00:00:00Z')`, [keyHash])

  const requested = await post('/api/student/access/request', { code }, '198.51.100.30')
  assert.equal(requested.status, 201)
  const request = await requested.json()
  assert.equal(request.status, 'PENDING')
  const pendingCookie = requested.headers.get('set-cookie').split(';')[0]

  const teacherLogin = await post('/api/teacher/login', { email: env.TEACHER_EMAIL, password: env.TEACHER_ACCESS_SECRET }, '198.51.100.31')
  assert.equal(teacherLogin.status, 200)
  const teacherCookie = teacherLogin.headers.get('set-cookie').split(';')[0]
  const approved = await post(`/api/teacher/connection-requests/${request.requestId}/approve`, {}, '198.51.100.31', { Cookie: teacherCookie })
  assert.equal(approved.status, 200)

  const statusResponse = await worker.fetch(new Request('https://genius.test/api/student/access/status', { headers: { cookie: pendingCookie } }), env)
  assert.equal(statusResponse.status, 200)
  assert.equal((await statusResponse.json()).status, 'APPROVED')
  const studentCookie = (statusResponse.headers.getSetCookie?.() || [statusResponse.headers.get('set-cookie') || ''])
    .find(value => value.startsWith('genius_student='))
    .split(';')[0]
  assert.ok(studentCookie.startsWith('genius_student='))

  const restored = await worker.fetch(new Request('https://genius.test/api/student/me', { headers: { cookie: studentCookie } }), env)
  assert.equal(restored.status, 200)
  const student = (await restored.json()).student
  assert.equal(student.grade, 8)
  assert.equal(student.nickname, 'ученик 8Б')

  const reused = await post('/api/student/access/request', { code }, '198.51.100.32')
  assert.equal(reused.status, 400)
})

test('login fails closed when the rate-limit secret is missing', async () => {
  const response = await worker.fetch(new Request('https://genius.test/api/teacher/login', {
    method: 'POST', headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '198.51.100.22', Origin: env.APP_ORIGIN },
    body: JSON.stringify({ email: env.TEACHER_EMAIL, password: env.TEACHER_ACCESS_SECRET }),
  }), { ...env, RATE_LIMIT_SECRET: undefined })
  assert.equal(response.status, 503)
})
