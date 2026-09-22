import sqlite3,json,pathlib
from fractions import Fraction as F
root=pathlib.Path(__file__).resolve().parents[1]
tasks=json.loads((root/'bank/tasks.json').read_text())
for t in tasks:
 if t['ANSWER']['mode']=='numeric' and 'exact_expression' in t.get('CHECK',{}):
  env={'F':F,'__builtins__':{}}
  assert eval(t['CHECK']['exact_expression'],env)==F(str(t['ANSWER']['value'])),t['ID']
  assert eval(t['CHECK']['independent_zero_expression'],env)==0,t['ID']
 elif t['ANSWER']['mode']=='numeric':
  assert t.get('CHECK',{}).get('independent'),t['ID']
db=sqlite3.connect(':memory:')
db.executescript((root/'cloudflare/schema.sql').read_text())
db.executescript((root/'cloudflare/task-bank.sql').read_text())
# Applying the migration twice is harmless.
db.executescript((root/'cloudflare/task-bank.sql').read_text())
for student in ['alice','bob']:
 db.execute("INSERT INTO students(id,class_id,current_grade) VALUES(?,'class_8B',8)",(student,))
def attempt(student,aid,eid,tid,correct=1):
 db.execute("INSERT OR IGNORE INTO task_attempts VALUES(?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)",(student,aid,eid,tid,'v','hash','1',correct,'CONFIRMED',10))
attempt('alice','a1','e1','task1')
attempt('alice','a1','e1','task1')
attempt('alice','a2','e2','task1')
assert db.execute("SELECT total_xp FROM class_progress WHERE student_id='alice'").fetchone()[0]==10
attempt('alice','a3','e3','task2',0)
assert db.execute("SELECT COUNT(*) FROM task_awards").fetchone()[0]==1
attempt('alice','a4','e4','task2')
attempt('bob','a1','e1','task1')
assert db.execute("SELECT total_xp FROM class_progress WHERE student_id='alice'").fetchone()[0]==20
assert db.execute("SELECT total_xp FROM class_progress WHERE student_id='bob'").fetchone()[0]==10
assert db.execute("SELECT SUM(amount) FROM xp_events WHERE reason='TASK_SOLVED'").fetchone()[0]==30
# A failed side effect rolls back the attempt and award together.
db.commit()
db.execute("CREATE TRIGGER fail_award BEFORE INSERT ON xp_events WHEN NEW.source_id='fail' BEGIN SELECT RAISE(ABORT,'test failure'); END")
try:attempt('alice','bad','ebad','fail')
except sqlite3.IntegrityError:pass
else:raise AssertionError('expected rollback')
assert db.execute("SELECT COUNT(*) FROM task_attempts WHERE attempt_id='bad'").fetchone()[0]==0
assert db.execute("SELECT COUNT(*) FROM task_awards WHERE task_id='fail'").fetchone()[0]==0
print('Exact arithmetic, reverse checks, migration, replay, multi-user XP and atomic rollback: PASS')
