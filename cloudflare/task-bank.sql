-- Multi-grade task bank tables for fresh databases.
-- Existing databases created with v13 should apply cloudflare/task-bank-v14-multigrade.sql once.
CREATE TABLE IF NOT EXISTS task_attempts (
 student_id TEXT NOT NULL REFERENCES students(id),
 attempt_id TEXT NOT NULL,
 event_id TEXT NOT NULL,
 task_id TEXT NOT NULL,
 grade INTEGER NOT NULL CHECK(grade IN (7,8,9)),
 content_version TEXT NOT NULL,
 payload_hash TEXT NOT NULL,
 answer_json TEXT NOT NULL,
 correct INTEGER CHECK(correct IN (0,1)),
 status TEXT NOT NULL CHECK(status IN ('CONFIRMED','PENDING_REVIEW')),
 max_xp INTEGER NOT NULL CHECK(max_xp IN (10,20,30)),
 received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(student_id,attempt_id),
 UNIQUE(student_id,event_id)
);
CREATE TABLE IF NOT EXISTS task_awards (
 student_id TEXT NOT NULL REFERENCES students(id),
 task_id TEXT NOT NULL,
 attempt_id TEXT NOT NULL,
 grade INTEGER NOT NULL CHECK(grade IN (7,8,9)),
 amount INTEGER NOT NULL,
 PRIMARY KEY(student_id,task_id),
 FOREIGN KEY(student_id,attempt_id) REFERENCES task_attempts(student_id,attempt_id)
);

-- A task can be attempted many times, but XP is awarded once, on the first correct answer.
-- Attempt 1: 100%, attempt 2: 70%, attempt 3: 40%, attempt 4+: 20%.
CREATE TRIGGER IF NOT EXISTS task_attempt_award AFTER INSERT ON task_attempts
WHEN NEW.correct=1 AND NEW.status='CONFIRMED'
BEGIN
 INSERT OR IGNORE INTO task_awards(student_id,task_id,attempt_id,grade,amount)
 VALUES(
   NEW.student_id,NEW.task_id,NEW.attempt_id,NEW.grade,
   CASE
     WHEN (SELECT COUNT(*) FROM task_attempts WHERE student_id=NEW.student_id AND task_id=NEW.task_id)=1 THEN NEW.max_xp
     WHEN (SELECT COUNT(*) FROM task_attempts WHERE student_id=NEW.student_id AND task_id=NEW.task_id)=2 THEN CAST(NEW.max_xp*0.7 AS INTEGER)
     WHEN (SELECT COUNT(*) FROM task_attempts WHERE student_id=NEW.student_id AND task_id=NEW.task_id)=3 THEN CAST(NEW.max_xp*0.4 AS INTEGER)
     ELSE CAST(NEW.max_xp*0.2 AS INTEGER)
   END
 );
END;
CREATE TRIGGER IF NOT EXISTS task_award_progress AFTER INSERT ON task_awards
BEGIN
 INSERT INTO xp_events(id,student_id,grade,amount,reason,source_id)
 VALUES('task:'||NEW.student_id||':'||NEW.task_id,NEW.student_id,NEW.grade,NEW.amount,'TASK_SOLVED',NEW.task_id);
 INSERT INTO class_progress(id,student_id,grade,total_xp)
 VALUES('task-progress:'||NEW.student_id||':'||NEW.grade,NEW.student_id,NEW.grade,NEW.amount)
 ON CONFLICT(student_id,grade) DO UPDATE SET total_xp=total_xp+NEW.amount,updated_at=CURRENT_TIMESTAMP;
END;
CREATE INDEX IF NOT EXISTS idx_task_attempt_history ON task_attempts(student_id,grade,received_at);
