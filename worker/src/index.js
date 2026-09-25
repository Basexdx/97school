import { submitTaskAttempts, taskProgress } from './task-bank.js'
import { saveAttendance, saveGrade, saveHomework, saveHomeworkOverride, saveLessonAssessment, studentPerformance, studentRanking, teacherAcademic, updateHomeworkProgress } from './academic-v2.js'
const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
}

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env)
    } catch (error) {
      // Never log request bodies, credentials, cookies, or database error details.
      console.error('Genius Worker request failed:', error?.name || 'Error')
      return json({ error: 'internal_error' }, 500)
    }
  },
}

async function handleRequest(request, env) {
  const url = new URL(request.url)
  const path = url.pathname

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: JSON_HEADERS })
  // Restrict teacher login and mutations to the configured front-end origin to block CSRF.
  if (path.startsWith('/api/teacher/') && request.method !== 'GET' && !isAllowedAppOrigin(request, env)) {
    return json({ error: 'invalid_origin' }, 403)
  }
  if (path === '/api/student/task-attempts' && ['GET','POST'].includes(request.method)) {
    const auth=await requireStudent(request,env)
    if(!auth.ok) return auth.response
    return request.method==='GET' ? taskProgress(env,auth.student) : submitTaskAttempts(request,env,auth.student)
  }
  if (path === '/api/health' && request.method === 'GET') return json({ ok: true, service: 'genius-api' })

  if (path === '/api/student/access/request' && request.method === 'POST') return studentRequestAccess(request, env)
  if (path === '/api/student/access/status' && request.method === 'GET') return studentAccessStatus(request, env)
  if (path === '/api/student/me' && request.method === 'GET') return studentMe(request, env)
  if (path === '/api/student/sync' && request.method === 'POST') return studentSync(request, env)
  if (path === '/api/student/logout' && request.method === 'POST') return studentLogout(request, env)
  if (path === '/api/student/performance' && request.method === 'GET') {
    const auth=await requireStudent(request,env);return auth.ok?studentPerformance(env,auth.student):auth.response
  }
  if (path === '/api/student/rankings' && request.method === 'GET') {
    const auth=await requireStudent(request,env);return auth.ok?studentRanking(request,env,auth.student):auth.response
  }
  const progressMatch=path.match(/^\/api\/student\/homework\/([^/]+)\/status$/)
  if(progressMatch&&request.method==='POST'){
    const auth=await requireStudent(request,env);return auth.ok?updateHomeworkProgress(request,env,auth.student,progressMatch[1]):auth.response
  }

  if (path === '/api/teacher/login' && request.method === 'POST') return teacherLogin(request, env)
  if (path === '/api/teacher/logout' && request.method === 'POST') return teacherLogout(request, env)
  if (path === '/api/teacher/me' && request.method === 'GET') return teacherMe(request, env)
  if (path === '/api/teacher/classes' && request.method === 'GET') return teacherClasses(request, env)
  if (path === '/api/teacher/connection-requests' && request.method === 'GET') return teacherRequests(request, env)
  if (path === '/api/teacher/access-keys' && request.method === 'GET') return teacherAccessKeys(request, env)
  if (path === '/api/teacher/access-keys' && request.method === 'POST') return teacherCreateAccessKey(request, env)
  if (path === '/api/teacher/academic' && request.method === 'GET') {
    const auth=await requireTeacher(request,env);return auth.ok?teacherAcademic(request,env,auth.teacher):auth.response
  }
  if (path === '/api/teacher/grades' && request.method === 'POST') {
    const auth=await requireTeacher(request,env);return auth.ok?saveGrade(request,env,auth.teacher):auth.response
  }
  if (path === '/api/teacher/attendance' && request.method === 'POST') {
    const auth=await requireTeacher(request,env);return auth.ok?saveAttendance(request,env,auth.teacher):auth.response
  }
  if (path === '/api/teacher/lesson-assessment' && request.method === 'POST') {
    const auth=await requireTeacher(request,env);return auth.ok?saveLessonAssessment(request,env,auth.teacher):auth.response
  }
  if (path === '/api/teacher/homework' && request.method === 'POST') {
    const auth=await requireTeacher(request,env);return auth.ok?saveHomework(request,env,auth.teacher):auth.response
  }
  const overrideMatch=path.match(/^\/api\/teacher\/homework\/([^/]+)\/override$/)
  if(overrideMatch&&request.method==='POST'){
    const auth=await requireTeacher(request,env);return auth.ok?saveHomeworkOverride(request,env,auth.teacher,overrideMatch[1]):auth.response
  }

  const approveMatch = path.match(/^\/api\/teacher\/connection-requests\/([^/]+)\/approve$/)
  if (approveMatch && request.method === 'POST') return teacherDecideRequest(request, env, approveMatch[1], 'APPROVED')

  const rejectMatch = path.match(/^\/api\/teacher\/connection-requests\/([^/]+)\/reject$/)
  if (rejectMatch && request.method === 'POST') return teacherDecideRequest(request, env, rejectMatch[1], 'REJECTED')

  return json({ error: 'not_found' }, 404)
}

async function studentRequestAccess(request, env) {
  const limited = await consumeRateLimit(request, env, 'student-code', 10, 5 * 60 * 1000)
  if (!limited.ok) return rateLimitResponse(limited)

  const body = await safeJson(request)
  const code = normalizeAccessCode(body?.code)
  if (!code) return json({ error: 'invalid_code' }, 400)

  const keyHash = await sha256(code)
  const now = new Date().toISOString()
  const key = await env.DB.prepare(`
    SELECT ak.id, ak.class_id, ak.student_id, ak.key_label, ak.purpose, ak.status, ak.expires_at,
           c.title AS class_title, c.grade
    FROM access_keys ak
    JOIN classes c ON c.id = ak.class_id
    WHERE ak.key_hash = ?
    LIMIT 1
  `).bind(keyHash).first()

  if (!key || key.status !== 'ACTIVE' || key.expires_at <= now) {
    if (key && key.expires_at <= now && key.status === 'ACTIVE') {
      await env.DB.prepare(`UPDATE access_keys SET status='EXPIRED' WHERE id=?`).bind(key.id).run()
    }
    return json({ error: 'invalid_code' }, 400)
  }

  const pendingTtl = Math.max(5, Number(env.PENDING_TTL_MINUTES || 15))
  const expiresAt = new Date(Date.now() + pendingTtl * 60_000).toISOString()
  const requestId = crypto.randomUUID()
  const pendingToken = randomToken(32)
  const pendingHash = await sha256(pendingToken)

  try {
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO connection_requests (id, access_key_id, student_id, pending_token_hash, status, expires_at)
        VALUES (?, ?, ?, ?, 'PENDING', ?)
      `).bind(requestId, key.id, key.student_id || null, pendingHash, expiresAt),
      env.DB.prepare(`UPDATE access_keys SET status='PENDING' WHERE id=? AND status='ACTIVE'`).bind(key.id),
      env.DB.prepare(`
        INSERT INTO audit_log (id, actor_role, action, target_type, target_id)
        VALUES (?, 'SYSTEM', 'CREATE_CONNECTION_REQUEST', 'connection_request', ?)
      `).bind(crypto.randomUUID(), requestId),
    ])
  } catch {
    return json({ error: 'code_already_in_use' }, 409)
  }

  const response = json({
    status: 'PENDING',
    requestId,
    className: key.class_title,
    grade: key.grade,
    codeLabel: key.key_label,
    expiresAt,
  }, 201)
  response.headers.append('set-cookie', makeCookie('genius_pending', pendingToken, pendingTtl * 60, request))
  return response
}

async function studentAccessStatus(request, env) {
  const pendingToken = getCookie(request, 'genius_pending')
  if (!pendingToken) return json({ status: 'NONE' }, 401)

  const pendingHash = await sha256(pendingToken)
  const row = await env.DB.prepare(`
    SELECT cr.id, cr.student_id, cr.status, cr.expires_at,
           ak.key_label, ak.class_id,
           c.title AS class_title, c.grade
    FROM connection_requests cr
    JOIN access_keys ak ON ak.id = cr.access_key_id
    JOIN classes c ON c.id = ak.class_id
    WHERE cr.pending_token_hash = ?
    LIMIT 1
  `).bind(pendingHash).first()

  if (!row) return clearPending(json({ status: 'NONE' }, 401), request)

  const now = new Date().toISOString()
  if (row.expires_at <= now && row.status === 'PENDING') {
    await env.DB.batch([
      env.DB.prepare(`UPDATE connection_requests SET status='EXPIRED' WHERE id=? AND status='PENDING'`).bind(row.id),
      env.DB.prepare(`
        UPDATE access_keys SET status='ACTIVE'
        WHERE id=(SELECT access_key_id FROM connection_requests WHERE id=?) AND status='PENDING'
      `).bind(row.id),
    ])
    return clearPending(json({ status: 'EXPIRED' }), request)
  }

  if (row.status === 'PENDING') {
    return json({ status: 'PENDING', requestId: row.id, className: row.class_title, grade: row.grade, codeLabel: row.key_label, expiresAt: row.expires_at })
  }

  if (row.status === 'REJECTED' || row.status === 'EXPIRED') {
    return clearPending(json({ status: row.status }), request)
  }

  if (row.status !== 'APPROVED' || !row.student_id) return json({ status: row.status }, 409)

  const student = await env.DB.prepare(`
    SELECT s.id, s.nickname, s.current_grade, s.status, c.title AS class_title
    FROM students s JOIN classes c ON c.id=s.class_id
    WHERE s.id=? LIMIT 1
  `).bind(row.student_id).first()
  if (!student || student.status !== 'ACTIVE') return clearPending(json({ status: 'REJECTED' }), request)

  const sessionToken = randomToken(32)
  const sessionHash = await sha256(sessionToken)
  const sessionDays = Math.max(1, Number(env.STUDENT_SESSION_DAYS || 30))
  const sessionExpires = new Date(Date.now() + sessionDays * 86_400_000).toISOString()
  const existing = await env.DB.prepare(`SELECT id FROM student_sessions WHERE request_id=? LIMIT 1`).bind(row.id).first()
  if (existing) {
    await env.DB.prepare(`
      UPDATE student_sessions
      SET token_hash=?, expires_at=?, last_active_at=CURRENT_TIMESTAMP, revoked_at=NULL
      WHERE id=?
    `).bind(sessionHash, sessionExpires, existing.id).run()
  } else {
    await env.DB.prepare(`
      INSERT INTO student_sessions (id, request_id, student_id, token_hash, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(crypto.randomUUID(), row.id, student.id, sessionHash, sessionExpires).run()
  }

  const response = json({
    status: 'APPROVED',
    student: { id: student.id, nickname: student.nickname, grade: student.current_grade, className: student.class_title },
  })
  response.headers.append('set-cookie', makeCookie('genius_student', sessionToken, sessionDays * 86_400, request))
  response.headers.append('set-cookie', expireCookie('genius_pending', request))
  return response
}

async function studentMe(request, env) {
  const auth = await requireStudent(request, env)
  if (!auth.ok) return auth.response
  return json({ student: auth.student })
}

async function studentLogout(request, env) {
  const token = getCookie(request, 'genius_student')
  if (token) {
    const hash = await sha256(token)
    await env.DB.prepare(`UPDATE student_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE token_hash=?`).bind(hash).run()
  }
  const response = json({ ok: true })
  response.headers.append('set-cookie', expireCookie('genius_student', request))
  return response
}

async function studentSync(request, env) {
  const auth = await requireStudent(request, env)
  if (!auth.ok) return auth.response

  const body = await safeJson(request)
  const events = Array.isArray(body?.events) ? body.events.slice(0, 100) : []
  if (!events.length) return json({ results: [] })

  const results = []
  for (const event of events) {
    const eventId = typeof event?.eventId === 'string' ? event.eventId.slice(0, 120) : ''
    const type = typeof event?.type === 'string' ? event.type.slice(0, 40) : ''
    const payload = event?.payload && typeof event.payload === 'object' ? event.payload : {}
    const clientCreatedAt = typeof event?.createdAt === 'string' ? event.createdAt.slice(0, 40) : null
    if (!eventId || !/^[A-Za-z0-9_-]{8,120}$/.test(eventId)) {
      results.push({ eventId: eventId || null, status: 'REJECTED', error: 'invalid_event_id' })
      continue
    }

    const payloadHash = await sha256(JSON.stringify({ eventId, type, payload, clientCreatedAt }))
    const existing = await env.DB.prepare(`
      SELECT payload_hash, result_json FROM sync_events
      WHERE id=? AND student_id=? LIMIT 1
    `).bind(eventId, auth.student.id).first()

    if (existing) {
      if (existing.payload_hash !== payloadHash) {
        results.push({ eventId, status: 'REJECTED', error: 'event_id_conflict' })
      } else {
        let previous = {}
        try { previous = JSON.parse(existing.result_json || '{}') } catch {}
        results.push({ eventId, status: 'DUPLICATE', ...previous })
      }
      continue
    }

    let result
    if (type === 'TEST_COMPLETED') {
      result = await syncTestCompleted(env, auth.student, payload)
    } else if (type === 'DAILY_LOGIN') {
      result = await syncDailyLogin(env, auth.student)
    } else if (type === 'PRACTICE_PROGRESS') {
      result = { accepted: true, xpAwarded: 0 }
    } else {
      results.push({ eventId, status: 'REJECTED', error: 'unsupported_event_type' })
      continue
    }

    if (!result.accepted) {
      results.push({ eventId, status: 'REJECTED', error: result.error || 'invalid_event' })
      continue
    }

    const publicResult = { xpAwarded: Number(result.xpAwarded || 0), totalXp: result.totalXp ?? null }
    await env.DB.prepare(`
      INSERT INTO sync_events (id, student_id, event_type, payload_hash, client_created_at, status, result_json)
      VALUES (?, ?, ?, ?, ?, 'ACCEPTED', ?)
    `).bind(eventId, auth.student.id, type, payloadHash, clientCreatedAt, JSON.stringify(publicResult)).run()

    results.push({ eventId, status: 'ACCEPTED', ...publicResult })
  }

  return json({ results, serverTime: new Date().toISOString() })
}

async function syncTestCompleted(env, student, payload) {
  // Legacy lessons send a client-computed percentage, not independently checkable answers.
  // Keep the progress event, but do not award XP from that untrusted percentage.
  const progress = await env.DB.prepare('SELECT total_xp FROM class_progress WHERE student_id=? AND grade=?').bind(student.id, student.grade).first()
  return { accepted: true, xpAwarded: 0, totalXp: Number(progress?.total_xp || 0) }
}

async function syncDailyLogin(env, student) {
  const progress = await env.DB.prepare('SELECT total_xp FROM class_progress WHERE student_id=? AND grade=?').bind(student.id, student.grade).first()
  return { accepted: true, xpAwarded: 0, totalXp: Number(progress?.total_xp || 0) }
}

function xpTargetForScore(scorePercent, maxXp = 60) {
  const cap = Math.max(0, Math.min(60, Math.floor(maxXp)))
  if (scorePercent >= 100) return cap
  if (scorePercent >= 85) return Math.min(cap, 50)
  if (scorePercent >= 70) return Math.min(cap, 35)
  if (scorePercent >= 50) return Math.min(cap, 20)
  return 0
}

async function teacherLogin(request, env) {
  // Local HTTP is allowed for loopback development only; real credentials require HTTPS.
  if (!isHttpsRequest(request) && !isLocalRequest(request)) return json({ error: 'https_required' }, 400)
  const body = await safeJson(request)
  const email = normalizeTeacherEmail(body?.email)
  const password = typeof body?.password === 'string' ? body.password : ''
  const limited = await consumeRateLimit(request, env, 'teacher-login', 8, 10 * 60 * 1000, email)
  if (!limited.ok) return rateLimitResponse(limited)

  // Email is an allow-listed account name; the password is a server-only secret.
  const configuredEmail = normalizeTeacherEmail(env.TEACHER_EMAIL)
  if (!configuredEmail || !env.TEACHER_ACCESS_SECRET || !env.RATE_LIMIT_SECRET) {
    return json({ error: 'teacher_login_not_configured' }, 503)
  }
  if (!email || password.length < 16 || password.length > 256) return json({ error: 'invalid_credentials' }, 401)
  const [providedHash, configuredHash, emailHash, allowedEmailHash] = await Promise.all([
    sha256(password),
    sha256(env.TEACHER_ACCESS_SECRET),
    sha256(email),
    sha256(configuredEmail),
  ])
  const emailMatches = constantTimeEqual(emailHash, allowedEmailHash)
  const passwordMatches = constantTimeEqual(providedHash, configuredHash)
  if (!emailMatches || !passwordMatches) return json({ error: 'invalid_credentials' }, 401)

  const teacher = await env.DB.prepare(`SELECT id, status FROM teachers WHERE id=? LIMIT 1`).bind(env.TEACHER_ID || 'teacher_01').first()
  if (!teacher || teacher.status !== 'ACTIVE') return json({ error: 'teacher_unavailable' }, 403)

  const token = randomToken(32)
  const tokenHash = await sha256(token)
  // Keep teacher sessions short and cap configuration mistakes to 12 hours.
  const configuredHours = Number(env.TEACHER_SESSION_HOURS || 12)
  const hours = Number.isFinite(configuredHours) ? Math.max(1, Math.min(12, configuredHours)) : 12
  const expiresAt = new Date(Date.now() + hours * 3_600_000).toISOString()
  await env.DB.prepare(`
    INSERT INTO teacher_sessions (id, teacher_id, token_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `).bind(crypto.randomUUID(), teacher.id, tokenHash, expiresAt).run()

  const response = json({ teacher: { id: teacher.id, email: configuredEmail } })
  response.headers.append('set-cookie', makeCookie('genius_teacher', token, hours * 3600, request))
  return response
}

async function teacherLogout(request, env) {
  const token = getCookie(request, 'genius_teacher')
  if (token) {
    const hash = await sha256(token)
    await env.DB.prepare(`UPDATE teacher_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE token_hash=?`).bind(hash).run()
  }
  const response = json({ ok: true })
  response.headers.append('set-cookie', expireCookie('genius_teacher', request))
  return response
}

async function teacherMe(request, env) {
  const auth = await requireTeacher(request, env)
  if (!auth.ok) return auth.response
  return json({ teacher: auth.teacher })
}

async function teacherClasses(request, env) {
  const auth = await requireTeacher(request, env)
  if (!auth.ok) return auth.response
  const result = await env.DB.prepare(`
    SELECT c.id, c.title, c.grade, COUNT(s.id) AS student_count
    FROM classes c
    LEFT JOIN students s ON s.class_id=c.id AND s.status='ACTIVE'
    WHERE c.teacher_id=?
    GROUP BY c.id, c.title, c.grade
    ORDER BY c.grade, c.title
  `).bind(auth.teacher.id).all()
  return json({ classes: result.results || [] })
}

async function teacherRequests(request, env) {
  const auth = await requireTeacher(request, env)
  if (!auth.ok) return auth.response
  await expireOldPending(env)
  const result = await env.DB.prepare(`
    SELECT cr.id, cr.status, cr.created_at, cr.expires_at,
           ak.key_label, ak.purpose,
           c.id AS class_id, c.title AS class_title, c.grade
    FROM connection_requests cr
    JOIN access_keys ak ON ak.id=cr.access_key_id
    JOIN classes c ON c.id=ak.class_id
    WHERE c.teacher_id=?
    ORDER BY CASE cr.status WHEN 'PENDING' THEN 0 ELSE 1 END, cr.created_at DESC
    LIMIT 100
  `).bind(auth.teacher.id).all()
  return json({ requests: result.results || [] })
}

async function teacherAccessKeys(request, env) {
  const auth = await requireTeacher(request, env)
  if (!auth.ok) return auth.response
  const result = await env.DB.prepare(`
    SELECT ak.id, ak.key_label, ak.purpose, ak.status, ak.expires_at, ak.created_at,
           c.id AS class_id, c.title AS class_title, c.grade
    FROM access_keys ak JOIN classes c ON c.id=ak.class_id
    WHERE c.teacher_id=?
    ORDER BY ak.created_at DESC LIMIT 100
  `).bind(auth.teacher.id).all()
  return json({ keys: result.results || [] })
}

async function teacherCreateAccessKey(request, env) {
  const auth = await requireTeacher(request, env)
  if (!auth.ok) return auth.response
  const body = await safeJson(request)
  const classId = String(body?.classId || '')
  const label = sanitizeLabel(body?.label) || 'Новый ученик'
  const purpose = ['INITIAL_ACCESS', 'NEW_DEVICE', 'RECOVERY'].includes(body?.purpose) ? body.purpose : 'INITIAL_ACCESS'
  const studentId = body?.studentId ? String(body.studentId) : null

  const classRow = await env.DB.prepare(`SELECT id, title, grade FROM classes WHERE id=? AND teacher_id=? LIMIT 1`).bind(classId, auth.teacher.id).first()
  if (!classRow) return json({ error: 'class_not_found' }, 404)
  if ((purpose === 'NEW_DEVICE' || purpose === 'RECOVERY') && !studentId) return json({ error: 'student_required' }, 400)

  const code = generateAccessCode()
  const keyHash = await sha256(code)
  const id = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString()
  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO access_keys (id, class_id, student_id, key_hash, key_label, purpose, status, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
    `).bind(id, classId, studentId, keyHash, label, purpose, expiresAt),
    env.DB.prepare(`
      INSERT INTO audit_log (id, actor_role, actor_id, action, target_type, target_id)
      VALUES (?, 'TEACHER', ?, 'CREATE_ACCESS_KEY', 'access_key', ?)
    `).bind(crypto.randomUUID(), auth.teacher.id, id),
  ])

  return json({
    key: { id, code, label, purpose, classId, className: classRow.title, grade: classRow.grade, expiresAt },
    warning: 'Код показывается в открытом виде только сейчас. В базе хранится только его SHA-256 хэш.',
  }, 201)
}

async function teacherDecideRequest(request, env, requestId, decision) {
  const auth = await requireTeacher(request, env)
  if (!auth.ok) return auth.response
  const now = new Date().toISOString()
  const row = await env.DB.prepare(`
    SELECT cr.id, cr.status, cr.expires_at, cr.student_id,
           ak.id AS access_key_id, ak.student_id AS key_student_id, ak.key_label, ak.purpose, ak.class_id,
           c.grade, c.teacher_id
    FROM connection_requests cr
    JOIN access_keys ak ON ak.id=cr.access_key_id
    JOIN classes c ON c.id=ak.class_id
    WHERE cr.id=? LIMIT 1
  `).bind(requestId).first()

  if (!row || row.teacher_id !== auth.teacher.id) return json({ error: 'request_not_found' }, 404)
  if (row.status !== 'PENDING') return json({ error: 'request_already_decided', status: row.status }, 409)
  if (row.expires_at <= now) {
    await env.DB.batch([
      env.DB.prepare(`UPDATE connection_requests SET status='EXPIRED' WHERE id=?`).bind(row.id),
      env.DB.prepare(`UPDATE access_keys SET status='ACTIVE' WHERE id=? AND status='PENDING'`).bind(row.access_key_id),
    ])
    return json({ error: 'request_expired' }, 409)
  }

  if (decision === 'REJECTED') {
    await env.DB.batch([
      env.DB.prepare(`UPDATE connection_requests SET status='REJECTED', decided_at=CURRENT_TIMESTAMP, decided_by=? WHERE id=?`).bind(auth.teacher.id, row.id),
      env.DB.prepare(`UPDATE access_keys SET status='REVOKED', revoked_at=CURRENT_TIMESTAMP WHERE id=?`).bind(row.access_key_id),
      env.DB.prepare(`INSERT INTO audit_log (id, actor_role, actor_id, action, target_type, target_id) VALUES (?, 'TEACHER', ?, 'REJECT_CONNECTION', 'connection_request', ?)`).bind(crypto.randomUUID(), auth.teacher.id, row.id),
    ])
    return json({ status: 'REJECTED' })
  }

  let studentId = row.key_student_id || row.student_id
  const statements = []
  if (!studentId) {
    studentId = crypto.randomUUID()
    statements.push(
      env.DB.prepare(`INSERT INTO students (id, class_id, nickname, current_grade, status) VALUES (?, ?, ?, ?, 'ACTIVE')`).bind(studentId, row.class_id, row.key_label, row.grade),
      env.DB.prepare(`INSERT INTO class_progress (id, student_id, grade, total_xp) VALUES (?, ?, ?, 0)`).bind(crypto.randomUUID(), studentId, row.grade),
    )
  } else {
    const existingStudent = await env.DB.prepare(`SELECT id, status FROM students WHERE id=? LIMIT 1`).bind(studentId).first()
    if (!existingStudent || existingStudent.status !== 'ACTIVE') return json({ error: 'student_unavailable' }, 409)
  }

  statements.push(
    env.DB.prepare(`UPDATE connection_requests SET status='APPROVED', student_id=?, decided_at=CURRENT_TIMESTAMP, decided_by=? WHERE id=?`).bind(studentId, auth.teacher.id, row.id),
    env.DB.prepare(`UPDATE access_keys SET status='USED', student_id=?, used_at=CURRENT_TIMESTAMP WHERE id=?`).bind(studentId, row.access_key_id),
    env.DB.prepare(`INSERT INTO audit_log (id, actor_role, actor_id, action, target_type, target_id) VALUES (?, 'TEACHER', ?, 'APPROVE_CONNECTION', 'connection_request', ?)`).bind(crypto.randomUUID(), auth.teacher.id, row.id),
  )
  await env.DB.batch(statements)
  return json({ status: 'APPROVED', studentId })
}

async function requireStudent(request, env) {
  const token = getCookie(request, 'genius_student')
  if (!token) return { ok: false, response: json({ error: 'student_auth_required' }, 401) }
  const hash = await sha256(token)
  const now = new Date().toISOString()
  const row = await env.DB.prepare(`
    SELECT ss.id AS session_id, ss.expires_at, s.id, s.class_id, s.nickname, s.current_grade, s.status, c.title AS class_title
    FROM student_sessions ss
    JOIN students s ON s.id=ss.student_id
    JOIN classes c ON c.id=s.class_id
    WHERE ss.token_hash=? AND ss.revoked_at IS NULL AND ss.expires_at>? LIMIT 1
  `).bind(hash, now).first()
  if (!row || row.status !== 'ACTIVE') return { ok: false, response: json({ error: 'student_auth_required' }, 401) }
  await env.DB.prepare(`UPDATE student_sessions SET last_active_at=CURRENT_TIMESTAMP WHERE id=?`).bind(row.session_id).run()
  return { ok: true, student: { id: row.id, classId: row.class_id, nickname: row.nickname, grade: row.current_grade, className: row.class_title } }
}

async function requireTeacher(request, env) {
  const token = getCookie(request, 'genius_teacher')
  if (!token) return { ok: false, response: json({ error: 'teacher_auth_required' }, 401) }
  const hash = await sha256(token)
  const now = new Date().toISOString()
  const row = await env.DB.prepare(`
    SELECT ts.id AS session_id, t.id, t.status
    FROM teacher_sessions ts JOIN teachers t ON t.id=ts.teacher_id
    WHERE ts.token_hash=? AND ts.revoked_at IS NULL AND ts.expires_at>? LIMIT 1
  `).bind(hash, now).first()
  if (!row || row.status !== 'ACTIVE') return { ok: false, response: json({ error: 'teacher_auth_required' }, 401) }
  await env.DB.prepare(`UPDATE teacher_sessions SET last_active_at=CURRENT_TIMESTAMP WHERE id=?`).bind(row.session_id).run()
  return { ok: true, teacher: { id: row.id, email: normalizeTeacherEmail(env.TEACHER_EMAIL) } }
}

async function expireOldPending(env) {
  const now = new Date().toISOString()
  const old = await env.DB.prepare(`SELECT id, access_key_id FROM connection_requests WHERE status='PENDING' AND expires_at<=? LIMIT 100`).bind(now).all()
  if (!old.results?.length) return
  const statements = []
  for (const row of old.results) {
    statements.push(env.DB.prepare(`UPDATE connection_requests SET status='EXPIRED' WHERE id=?`).bind(row.id))
    statements.push(env.DB.prepare(`UPDATE access_keys SET status='ACTIVE' WHERE id=? AND status='PENDING'`).bind(row.access_key_id))
  }
  await env.DB.batch(statements)
}

// Atomically counts failed or successful credential attempts by trusted client IP and account.
async function consumeRateLimit(request, env, bucket, max, windowMs, subject = '') {
  if (typeof env.RATE_LIMIT_SECRET !== 'string' || env.RATE_LIMIT_SECRET.length < 32) {
    return { ok: false, configurationError: true }
  }
  // CF-Connecting-IP is set by Cloudflare; never trust a client-supplied X-Forwarded-For value.
  const source = request.headers.get('CF-Connecting-IP') || 'local'
  const now = Date.now()
  const windowStart = Math.floor(now / windowMs) * windowMs
  const retryAfterSeconds = Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000))
  const scopes = [{ bucket: `${bucket}:ip`, identity: source }]
  if (subject) scopes.push({ bucket: `${bucket}:account`, identity: subject.toLowerCase() })

  for (const scope of scopes) {
    const keyHash = await hmacSha256(env.RATE_LIMIT_SECRET, `${scope.bucket}|${scope.identity}`)
    // One conditional upsert is race-safe: parallel requests cannot pass a read-then-write check.
    const accepted = await env.DB.prepare(`
      INSERT INTO rate_limits (key_hash, bucket, window_start, count) VALUES (?, ?, ?, 1)
      ON CONFLICT(key_hash, bucket, window_start) DO UPDATE SET count=count+1
      WHERE count < ?
      RETURNING count
    `).bind(keyHash, scope.bucket, windowStart, max).first()
    if (!accepted) return { ok: false, retryAfterSeconds }
  }
  return { ok: true }
}

function rateLimitResponse(result) {
  if (result.configurationError) return json({ error: 'security_configuration_error' }, 503)
  return json({ error: 'too_many_attempts', retryAfterSeconds: result.retryAfterSeconds }, 429)
}

function normalizeAccessCode(value) {
  if (typeof value !== 'string') return ''
  const compact = value.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9-]/g, '')
  return compact.slice(0, 64)
}

function sanitizeLabel(value) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/[<>]/g, '').slice(0, 60)
}

function generateAccessCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  let body = ''
  for (const byte of bytes) body += alphabet[byte % alphabet.length]
  return `GNS-${body.slice(0,4)}-${body.slice(4,8)}-${body.slice(8,12)}`
}

function randomToken(size = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(size))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

async function hmacSha256(secret, value) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

function getCookie(request, name) {
  const cookie = request.headers.get('cookie') || ''
  for (const part of cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) {
      try { return decodeURIComponent(rest.join('=')) } catch { return '' }
    }
  }
  return ''
}

function makeCookie(name, value, maxAge, request) {
  const secure = isHttpsRequest(request) ? '; Secure' : ''
  return `${name}=${encodeURIComponent(value)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(maxAge)}${secure}`
}

function expireCookie(name, request) {
  const secure = isHttpsRequest(request) ? '; Secure' : ''
  return `${name}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`
}

function clearPending(response, request) {
  response.headers.append('set-cookie', expireCookie('genius_pending', request))
  return response
}

function isHttpsRequest(request) {
  // The URL scheme comes from the Worker request; forwarded headers can be forged.
  return new URL(request.url).protocol === 'https:'
}

function isLocalRequest(request) {
  const url = new URL(request.url)
  return url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
}

function normalizeTeacherEmail(value) {
  if (typeof value !== 'string') return ''
  const email = value.trim().toLowerCase()
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ''
}

function isAllowedAppOrigin(request, env) {
  const origin = request.headers.get('origin')
  if (!origin || typeof env.APP_ORIGIN !== 'string') return false
  try {
    const configured = new URL(env.APP_ORIGIN)
    const isLoopback = ['127.0.0.1', 'localhost', '[::1]'].includes(configured.hostname)
    if (configured.origin !== env.APP_ORIGIN || !(configured.protocol === 'https:' || (configured.protocol === 'http:' && isLoopback))) return false
    return new URL(origin).origin === configured.origin && origin === new URL(origin).origin
  } catch {
    return false
  }
}

async function safeJson(request) {
  // Read JSON with a strict cap so oversized request bodies cannot exhaust Worker memory.
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) return null
  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > 64 * 1024) return null
  if (!request.body) return null
  const reader = request.body.getReader()
  const chunks = []
  let totalBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > 64 * 1024) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
    const body = new Uint8Array(totalBytes)
    let offset = 0
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength }
    return JSON.parse(new TextDecoder().decode(body))
  } catch {
    return null
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}
