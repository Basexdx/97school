// SQLite cannot widen an existing CHECK with ALTER COLUMN. Rebuild once, before
// accepting requests, preserving attempts, awards, custom indexes and triggers.
export function upgradeTaskAttemptXp(sqlite){
 const definition=sqlite.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='task_attempts'").get()?.sql
 const constraint=/CHECK\s*\(\s*max_xp\s+IN\s*\(\s*10\s*,\s*20\s*,\s*30\s*\)\s*\)/i
 if(!definition||!constraint.test(definition))return false
 const objects=sqlite.prepare("SELECT sql FROM sqlite_master WHERE tbl_name='task_attempts' AND type IN ('index','trigger') AND sql IS NOT NULL AND name!='task_attempt_award'").all()
 const create=definition.replace(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["`\[]?task_attempts["`\]]?/i,'CREATE TABLE task_attempts_xp_upgrade').replace(constraint,'CHECK(max_xp IN (10,20,30,40))')
 sqlite.exec('PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE;')
 try{
  sqlite.exec('DROP TRIGGER IF EXISTS task_attempt_award; DROP TRIGGER IF EXISTS task_award_progress;')
  sqlite.exec(create)
  sqlite.exec('INSERT INTO task_attempts_xp_upgrade SELECT * FROM task_attempts; DROP TABLE task_attempts; ALTER TABLE task_attempts_xp_upgrade RENAME TO task_attempts;')
  for(const object of objects)sqlite.exec(object.sql)
  if(sqlite.prepare('PRAGMA foreign_key_check').all().length)throw Error('Task attempt migration failed foreign key validation')
  sqlite.exec('COMMIT;')
 }catch(error){sqlite.exec('ROLLBACK;');throw error}
 finally{sqlite.exec('PRAGMA foreign_keys=ON;')}
 return true
}
