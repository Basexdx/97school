-- Additive migration. Existing students, lessons and progress are retained.
CREATE TABLE IF NOT EXISTS task_attempts (
 student_id TEXT NOT NULL REFERENCES students(id),
 attempt_id TEXT NOT NULL,
 event_id TEXT NOT NULL,
 task_id TEXT NOT NULL,
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
 amount INTEGER NOT NULL,
 PRIMARY KEY(student_id,task_id),
 FOREIGN KEY(student_id,attempt_id) REFERENCES task_attempts(student_id,attempt_id)
);
-- All side effects occur inside the attempt INSERT transaction.
-- The unique award key prevents repeated XP even for different attempts/events.
CREATE TRIGGER IF NOT EXISTS task_attempt_award AFTER INSERT ON task_attempts
WHEN NEW.correct=1 AND NEW.status='CONFIRMED'
BEGIN
 INSERT OR IGNORE INTO task_awards(student_id,task_id,attempt_id,amount)
 VALUES(NEW.student_id,NEW.task_id,NEW.attempt_id,NEW.max_xp);
END;
CREATE TRIGGER IF NOT EXISTS task_award_progress AFTER INSERT ON task_awards
BEGIN
 INSERT INTO xp_events(id,student_id,grade,amount,reason,source_id)
 VALUES('task:'||NEW.student_id||':'||NEW.task_id,NEW.student_id,8,NEW.amount,'TASK_SOLVED',NEW.task_id);
 INSERT INTO class_progress(id,student_id,grade,total_xp)
 VALUES('task-progress:'||NEW.student_id,NEW.student_id,8,NEW.amount)
 ON CONFLICT(student_id,grade) DO UPDATE SET total_xp=total_xp+NEW.amount,updated_at=CURRENT_TIMESTAMP;
END;
CREATE INDEX IF NOT EXISTS idx_task_attempt_history ON task_attempts(student_id,received_at);
