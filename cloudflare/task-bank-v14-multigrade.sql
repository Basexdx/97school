-- Run ONCE on a v13 D1 database. Preserves existing attempts/XP and marks them as grade 8.
ALTER TABLE task_attempts ADD COLUMN grade INTEGER NOT NULL DEFAULT 8;
ALTER TABLE task_awards ADD COLUMN grade INTEGER NOT NULL DEFAULT 8;

DROP TRIGGER IF EXISTS task_attempt_award;
DROP TRIGGER IF EXISTS task_award_progress;

CREATE TRIGGER task_attempt_award AFTER INSERT ON task_attempts
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

CREATE TRIGGER task_award_progress AFTER INSERT ON task_awards
BEGIN
 INSERT INTO xp_events(id,student_id,grade,amount,reason,source_id)
 VALUES('task:'||NEW.student_id||':'||NEW.task_id,NEW.student_id,NEW.grade,NEW.amount,'TASK_SOLVED',NEW.task_id);
 INSERT INTO class_progress(id,student_id,grade,total_xp)
 VALUES('task-progress:'||NEW.student_id||':'||NEW.grade,NEW.student_id,NEW.grade,NEW.amount)
 ON CONFLICT(student_id,grade) DO UPDATE SET total_xp=total_xp+NEW.amount,updated_at=CURRENT_TIMESTAMP;
END;

DROP INDEX IF EXISTS idx_task_attempt_history;
CREATE INDEX idx_task_attempt_history ON task_attempts(student_id,grade,received_at);
