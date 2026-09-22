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
# Fresh schema script remains harmless when tables/triggers already exist.
db.executescript((root/'cloudflare/task-bank.sql').read_text())
for student,class_id,grade in [('alice','class_8B',8),('bob','class_8B',8),('charlie','class_7A',7)]:
 db.execute("INSERT INTO students(id,class_id,current_grade) VALUES(?,?,?)",(student,class_id,grade))

def attempt(student,aid,eid,tid,grade=8,correct=1,max_xp=10):
 db.execute("""INSERT OR IGNORE INTO task_attempts
 (student_id,attempt_id,event_id,task_id,grade,content_version,payload_hash,answer_json,correct,status,max_xp)
 VALUES(?,?,?,?,?,'v','hash','1',?,'CONFIRMED',?)""",(student,aid,eid,tid,grade,correct,max_xp))

# First-attempt correct answer = full XP and replay is idempotent.
attempt('alice','a1','e1','task1');attempt('alice','a1','e1','task1');attempt('alice','a2','e2','task1')
assert db.execute("SELECT total_xp FROM class_progress WHERE student_id='alice' AND grade=8").fetchone()[0]==10

# Correct on second attempt = 70%.
attempt('alice','a3','e3','task2',correct=0);attempt('alice','a4','e4','task2')
assert db.execute("SELECT total_xp FROM class_progress WHERE student_id='alice' AND grade=8").fetchone()[0]==17

# Grade 7: correct on third attempt = 40%, after third = minimum 20%.
attempt('charlie','c1','ce1','task3',grade=7,correct=0);attempt('charlie','c2','ce2','task3',grade=7,correct=0);attempt('charlie','c3','ce3','task3',grade=7)
assert db.execute("SELECT total_xp FROM class_progress WHERE student_id='charlie' AND grade=7").fetchone()[0]==4
for n in range(1,4):attempt('charlie',f'd{n}',f'de{n}','task4',grade=7,correct=0)
attempt('charlie','d4','de4','task4',grade=7)
assert db.execute("SELECT total_xp FROM class_progress WHERE student_id='charlie' AND grade=7").fetchone()[0]==6

attempt('bob','b1','be1','task1')
assert db.execute("SELECT total_xp FROM class_progress WHERE student_id='bob' AND grade=8").fetchone()[0]==10
assert db.execute("SELECT SUM(amount) FROM xp_events WHERE reason='TASK_SOLVED'").fetchone()[0]==33

# A failed side effect rolls back attempt and award together.
db.commit();db.execute("CREATE TRIGGER fail_award BEFORE INSERT ON xp_events WHEN NEW.source_id='fail' BEGIN SELECT RAISE(ABORT,'test failure'); END")
try:attempt('alice','bad','ebad','fail')
except sqlite3.IntegrityError:pass
else:raise AssertionError('expected rollback')
assert db.execute("SELECT COUNT(*) FROM task_attempts WHERE attempt_id='bad'").fetchone()[0]==0
assert db.execute("SELECT COUNT(*) FROM task_awards WHERE task_id='fail'").fetchone()[0]==0
print('Exact arithmetic, replay, multigrade XP decay and atomic rollback: PASS')
