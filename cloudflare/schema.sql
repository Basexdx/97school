PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','REVOKED')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  title TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade IN (7,8,9)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  nickname TEXT,
  current_grade INTEGER NOT NULL CHECK (current_grade IN (7,8,9)),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','REVOKED')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id)
);

CREATE TABLE IF NOT EXISTS access_keys (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  student_id TEXT,
  key_hash TEXT NOT NULL UNIQUE,
  key_label TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'INITIAL_ACCESS' CHECK (purpose IN ('INITIAL_ACCESS','NEW_DEVICE','RECOVERY')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PENDING','USED','REVOKED','EXPIRED')),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS connection_requests (
  id TEXT PRIMARY KEY,
  access_key_id TEXT NOT NULL,
  student_id TEXT,
  pending_token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','EXPIRED')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at TEXT,
  decided_by TEXT,
  FOREIGN KEY (access_key_id) REFERENCES access_keys(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (decided_by) REFERENCES teachers(id)
);

CREATE TABLE IF NOT EXISTS student_sessions (
  id TEXT PRIMARY KEY,
  request_id TEXT UNIQUE,
  student_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  last_active_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  FOREIGN KEY (request_id) REFERENCES connection_requests(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS teacher_sessions (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  last_active_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

CREATE TABLE IF NOT EXISTS class_progress (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade IN (7,8,9)),
  total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, grade),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS xp_events (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade IN (7,8,9)),
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  source_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key_hash TEXT NOT NULL,
  bucket TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key_hash, bucket, window_start)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('STUDENT','TEACHER','ADMIN','SYSTEM')),
  actor_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_connection_requests_status ON connection_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_access_keys_hash ON access_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_access_keys_class ON access_keys(class_id, created_at);
CREATE INDEX IF NOT EXISTS idx_student_sessions_student ON student_sessions(student_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_teacher_sessions_teacher ON teacher_sessions(teacher_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_xp_events_weekly ON xp_events(grade, created_at);

INSERT OR IGNORE INTO teachers (id, email) VALUES ('teacher_01', 'teacher@genius.local');
INSERT OR IGNORE INTO classes (id, teacher_id, title, grade) VALUES
  ('class_7A', 'teacher_01', '7А', 7),
  ('class_8B', 'teacher_01', '8Б', 8),
  ('class_9A', 'teacher_01', '9А', 9),
  ('class_9B', 'teacher_01', '9Б', 9);

-- v5 offline-first sync
CREATE TABLE IF NOT EXISTS learning_tests (
  id TEXT PRIMARY KEY,
  grade INTEGER NOT NULL CHECK (grade IN (7,8,9)),
  title TEXT NOT NULL,
  max_xp INTEGER NOT NULL DEFAULT 60 CHECK (max_xp >= 0 AND max_xp <= 60),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  content_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sync_events (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  client_created_at TEXT,
  status TEXT NOT NULL DEFAULT 'ACCEPTED' CHECK (status IN ('ACCEPTED','REJECTED')),
  result_json TEXT,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE INDEX IF NOT EXISTS idx_sync_events_student ON sync_events(student_id, received_at);

INSERT OR IGNORE INTO learning_tests (id, grade, title, max_xp, active, content_version) VALUES
  ('demo-grade-7', 7, 'Демонстрационный тест 7 класса', 60, 1, 1),
  ('demo-grade-8', 8, 'Демонстрационный тест 8 класса', 60, 1, 1),
  ('demo-grade-9', 9, 'Демонстрационный тест 9 класса', 60, 1, 1);

-- v14 academic progress: Tuesday/Friday diary, homework and rankings.
CREATE TABLE IF NOT EXISTS school_breaks (
  id TEXT PRIMARY KEY,
  academic_year TEXT NOT NULL,
  title TEXT NOT NULL,
  starts_on TEXT NOT NULL,
  ends_on TEXT NOT NULL,
  CHECK (starts_on <= ends_on)
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  lesson_date TEXT NOT NULL,
  topic TEXT,
  status TEXT NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED','COMPLETED','CANCELLED')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, lesson_date),
  FOREIGN KEY (class_id) REFERENCES classes(id)
);

CREATE TABLE IF NOT EXISTS homework (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, lesson_id),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id),
  FOREIGN KEY (created_by) REFERENCES teachers(id)
);

CREATE TABLE IF NOT EXISTS homework_overrides (
  id TEXT PRIMARY KEY,
  homework_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  title TEXT,
  description TEXT,
  lesson_id TEXT,
  is_exempt INTEGER NOT NULL DEFAULT 0 CHECK (is_exempt IN (0,1)),
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(homework_id, student_id),
  FOREIGN KEY (homework_id) REFERENCES homework(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id),
  FOREIGN KEY (updated_by) REFERENCES teachers(id)
);

CREATE TABLE IF NOT EXISTS homework_progress (
  homework_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED','IN_PROGRESS','DONE')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (homework_id, student_id),
  FOREIGN KEY (homework_id) REFERENCES homework(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS gradebook_entries (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  value INTEGER NOT NULL CHECK (value BETWEEN 2 AND 5),
  kind TEXT NOT NULL DEFAULT 'LESSON' CHECK (kind IN ('LESSON','HOMEWORK','TEST','LAB')),
  comment TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lesson_id, student_id, kind),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (created_by) REFERENCES teachers(id)
);

CREATE TABLE IF NOT EXISTS reminder_deliveries (
  id TEXT PRIMARY KEY,
  homework_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('IN_APP','WEB_NOTIFICATION')),
  lesson_date TEXT NOT NULL,
  delivered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(homework_id, student_id, channel, lesson_date),
  FOREIGN KEY (homework_id) REFERENCES homework(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE INDEX IF NOT EXISTS idx_lessons_class_date ON lessons(class_id, lesson_date);
CREATE INDEX IF NOT EXISTS idx_homework_class_lesson ON homework(class_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_homework_progress_student ON homework_progress(student_id, status);
CREATE INDEX IF NOT EXISTS idx_gradebook_student ON gradebook_entries(student_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_class_progress_rank ON class_progress(grade, total_xp DESC);

INSERT OR IGNORE INTO school_breaks (id, academic_year, title, starts_on, ends_on) VALUES
  ('break_2026_10', '2026-2027', 'Осенние каникулы', '2026-10-05', '2026-10-11'),
  ('break_2026_11', '2026-2027', 'Осенние каникулы', '2026-11-16', '2026-11-22'),
  ('break_2026_12', '2026-2027', 'Зимние каникулы', '2026-12-31', '2027-01-10'),
  ('break_2027_02', '2026-2027', 'Февральские каникулы', '2027-02-22', '2027-02-28'),
  ('break_2027_04', '2026-2027', 'Весенние каникулы', '2027-04-05', '2027-04-11');

WITH RECURSIVE calendar(day) AS (
  SELECT date('2026-09-01')
  UNION ALL
  SELECT date(day, '+1 day') FROM calendar WHERE day < date('2027-05-28')
)
INSERT OR IGNORE INTO lessons (id, class_id, academic_year, lesson_date)
SELECT 'lesson_' || c.id || '_' || replace(calendar.day, '-', ''), c.id, '2026-2027', calendar.day
FROM calendar CROSS JOIN classes c
WHERE strftime('%w', calendar.day) IN ('2','5')
  AND NOT EXISTS (
    SELECT 1 FROM school_breaks b
    WHERE b.academic_year='2026-2027' AND calendar.day BETWEEN b.starts_on AND b.ends_on
  );


-- v15 class journal: attendance and visual assessment types.
CREATE TABLE IF NOT EXISTS attendance_entries (
  lesson_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ABSENT' CHECK (status IN ('ABSENT')),
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (lesson_id, student_id),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (updated_by) REFERENCES teachers(id)
);
CREATE TABLE IF NOT EXISTS lesson_assessments (
  lesson_id TEXT PRIMARY KEY,
  assessment_type TEXT NOT NULL DEFAULT 'LESSON' CHECK (assessment_type IN ('LESSON','INDEPENDENT','TEST','HOMEWORK')),
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id),
  FOREIGN KEY (updated_by) REFERENCES teachers(id)
);
CREATE INDEX IF NOT EXISTS idx_attendance_student_lesson ON attendance_entries(student_id,lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_assessments_type ON lesson_assessments(assessment_type,lesson_id);
