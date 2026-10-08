import {TASK_BANK_VERSION} from '../shared/task-bank-meta.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {pathToFileURL,fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
import {build} from 'esbuild'
import {indexedDB,IDBKeyRange} from 'fake-indexeddb'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'genius-bank-test-'))
process.on('exit',()=>fs.rmSync(temp,{recursive:true,force:true}))
await build({entryPoints:[path.join(root,'app/task-store.js')],bundle:true,format:'esm',platform:'node',outfile:path.join(temp,'store.mjs')})
await build({entryPoints:[path.join(root,'worker/src/index.js')],bundle:true,format:'esm',platform:'node',outfile:path.join(temp,'worker.mjs')})
const store=await import(pathToFileURL(path.join(temp,'store.mjs')))
const worker=(await import(pathToFileURL(path.join(temp,'worker.mjs')))).default
const sqlite=path.join(temp,'db.sqlite')
function dbCall(sql,params=[],script=false){
 const py=`import sqlite3,json,sys\nx=json.load(sys.stdin)\nc=sqlite3.connect(x['db']);c.row_factory=sqlite3.Row;c.execute('PRAGMA foreign_keys=ON')\nif x['script']:\n c.executescript(x['sql']);rows=[]\nelse:\n cur=c.execute(x['sql'],x['params']);rows=[dict(r) for r in cur.fetchall()]\nc.commit();print(json.dumps(rows))`
 const r=spawnSync('python3',['-c',py],{input:JSON.stringify({db:sqlite,sql,params,script}),encoding:'utf8'})
 if(r.status!==0)throw Error(r.stderr);return JSON.parse(r.stdout)
}
dbCall(fs.readFileSync(path.join(root,'cloudflare/schema.sql'),'utf8')+fs.readFileSync(path.join(root,'cloudflare/task-bank.sql'),'utf8'),[],true)
const env={DB:{prepare(sql){let params=[];return {bind(...values){params=values;return this},async first(){return dbCall(sql,params)[0]||null},async all(){return {results:dbCall(sql,params)}},async run(){dbCall(sql,params);return {success:true}}}}}}
const token='local_test_token_never_deployed'
const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('')
dbCall("INSERT INTO students(id,class_id,current_grade) VALUES('test_student','class_8B',8)")
dbCall("INSERT INTO student_sessions(id,student_id,token_hash,expires_at) VALUES('ss','test_student',?,'2099-01-01T00:00:00Z')",[hash])
const payload={studentId:'test_student',attempts:[{attemptId:'attempt_00001',eventId:'event_000001',taskId:'genius-src8-7-19601',version:TASK_BANK_VERSION,answer:'4'}]}
async function post(body,cookie=true){const r=await worker.fetch(new Request('https://genius.test/api/student/task-attempts',{method:'POST',headers:{'content-type':'application/json',...(cookie?{cookie:'genius_student='+token}:{})},body:JSON.stringify(body)}),env);return {status:r.status,data:await r.json()}}
test('Worker: authentication, actual answer grading, replay, conflicts and untrusted XP',async()=>{
 assert.equal((await post(payload,false)).status,401)
 assert.equal((await post({...payload,studentId:'other'})).status,403)
 let r=await post(payload);assert.equal(r.data.totalXp,10);assert.equal(r.data.results[0].correct,true)
 r=await post(payload);assert.equal(r.data.totalXp,10)
 r=await post({...payload,attempts:[{...payload.attempts[0],answer:123}]});assert.equal(r.data.results[0].error,'attempt_id_conflict')
 r=await post({...payload,attempts:[{...payload.attempts[0],attemptId:'attempt_00002',eventId:'event_000002',xp:999999}]});assert.equal(r.data.totalXp,10);assert.equal(r.data.results[0].xpAwarded,0)
 r=await post({...payload,attempts:[{...payload.attempts[0],attemptId:'attempt_00003',eventId:'event_000003',taskId:'genius-src8-7-23867',answer:'999',xp:9999}]});assert.equal(r.data.results[0].correct,false);assert.equal(r.data.totalXp,10)
 r=await post({...payload,attempts:[{...payload.attempts[0],attemptId:'attempt_00004',eventId:'event_000004',version:'stale'}]});assert.equal(r.data.results[0].error,'content_version_mismatch')
})
test('Teacher sees answer and awarded XP only for own students after authentication',async()=>{
 const teacherToken='teacher_task_test_token'
 const teacherHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(teacherToken))),b=>b.toString(16).padStart(2,'0')).join('')
 dbCall("INSERT INTO teacher_sessions(id,teacher_id,token_hash,expires_at) VALUES('ts_task','teacher_01',?,'2099-01-01T00:00:00Z')",[teacherHash])
 const get=async(pathname,cookie)=>{const response=await worker.fetch(new Request('https://genius.test'+pathname,{headers:cookie?{cookie:'genius_teacher='+teacherToken}:{}}),env);return {status:response.status,data:await response.json()}}
 const path='/api/teacher/tasks/genius-src8-7-19601'
 assert.equal((await get(path)).status,401)
 assert.equal((await get('/api/teacher/tasks?grade=8&q=19601')).status,401)
 const list=await get('/api/teacher/tasks?grade=8&q=19601',true)
 assert.equal(list.status,200);assert.ok(list.data.tasks.some(t=>t.id==='genius-src8-7-19601'))
 const detail=await get(path,true)
 assert.equal(detail.status,200);assert.equal(detail.data.task.ANSWER.values[0],'4')
 assert.equal(detail.data.students.length,1);assert.equal(detail.data.students[0].xp,10)
})
test('Offline: explicit download, offline load, guest isolation, pending sync and server reconciliation',async()=>{
 Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true})
 globalThis.window={indexedDB};globalThis.indexedDB=indexedDB;globalThis.IDBKeyRange=IDBKeyRange
 let auth=false
 const networkCalls=[]
 globalThis.fetch=async(url,options={})=>{
   networkCalls.push(url)
   if(!navigator.onLine)throw Error('offline')
   if(String(url).startsWith('/task-bank/'))return new Response(fs.readFileSync(path.join(root,'public',url)),{status:200})
   if(url==='/api/student/me')return new Response(JSON.stringify(auth?{student:{id:'test_student',grade:8}}:{error:'auth_required'}),{status:auth?200:401})
   const headers={...options.headers,...(auth?{cookie:'genius_student='+token}:{})}
   return worker.fetch(new Request('https://genius.test'+url,{...options,headers}),env)
 }
 const index=await store.bankIndex();assert.equal(index.tasks.length,324)
 assert.ok(index.tasks.some(t=>t.id==='genius-peryshkin8-1046'))
 assert.equal(networkCalls.filter(x=>x!=='/task-bank/index.json').length,0,'index must not auto-download tasks')
 await store.downloadBankPackage(index,'paragraph',1)
 navigator.onLine=false
 const task=await store.loadBankTask('genius-src8-7-19601',index.version);assert.equal(task.ANSWER.values[0],'4')
 await assert.rejects(()=>store.loadBankTask('genius-src8-19-343',index.version),/ещё не скачана/)
 await store.saveBankAttempt(null,task,'4',{correct:true});assert.equal((await store.bankAttempts())[0].status,'LOCAL_PRACTICE')
 navigator.onLine=true;auth=true;await store.bankIdentity();navigator.onLine=false
 const saved=await store.saveBankAttempt('test_student',task,'4',{correct:true});assert.equal(saved.status,'PENDING_SYNC')
 assert.equal((await store.bankPendingLocal()).length,1)
 navigator.onLine=true
 const result=await store.syncBankAttempts();assert.equal(result.totalXp,10)
 assert.equal((await store.bankAttempts('test_student')).find(a=>a.attemptId===saved.attemptId).status,'CONFIRMED')
 assert.equal((await store.bankAttempts()).length,1,'guest answer must not become another student’s server attempt')
 assert.equal((await store.bankPendingLocal()).length,0)
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('genius-offline',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})
 await new Promise((resolve,reject)=>{const tx=db.transaction(['content','packages'],'readwrite');tx.objectStore('content').clear();tx.objectStore('packages').clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})
 navigator.onLine=false
 await assert.rejects(()=>store.loadBankTask(task.ID,index.version),/ещё не скачана/)
 assert.ok((await store.bankAttempts('test_student')).length>0)
 assert.equal(dbCall("SELECT total_xp FROM class_progress WHERE student_id='test_student'")[0].total_xp,10)
})

test('Teacher statistics include every own active pupil and the first successful attempt, with isolated classes',async()=>{
 const teacherHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('teacher_stats_token'))),b=>b.toString(16).padStart(2,'0')).join('')
 dbCall("INSERT INTO teacher_sessions(id,teacher_id,token_hash,expires_at) VALUES('stats_ts','teacher_01',?,'2099-01-01T00:00:00Z')",[teacherHash])
 dbCall("INSERT INTO teachers(id) VALUES('other_teacher')")
 dbCall("INSERT INTO classes(id,teacher_id,title,grade) VALUES('other_class','other_teacher','Чужой класс',9)")
 for(const [id,classId,status] of [['stats_pupil','class_9A','ACTIVE'],['stats_not_started','class_9A','ACTIVE'],['stats_suspended','class_9A','SUSPENDED'],['stats_foreign','other_class','ACTIVE']])dbCall('INSERT INTO students(id,class_id,current_grade,status) VALUES(?,?,9,?)',[id,classId,status])
 const {ogeTasks,OGE_BANK_VERSION}=await import('../app/oge-task-data.mjs')
 const task=ogeTasks.find(t=>typeof t.answer==='number')
 const attempts=[false,true,false].map((right,i)=>({attemptId:`stats_attempt_${i}`,eventId:`stats_event_${i}`,taskId:task.id,version:OGE_BANK_VERSION,answer:String(task.answer+(right?0:999))}))
 // Use authenticated student sessions, so teacher-only endpoints remain protected.
 const pupilToken='stats_student_token',pupilHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(pupilToken))),b=>b.toString(16).padStart(2,'0')).join('')
 dbCall("INSERT INTO student_sessions(id,student_id,token_hash,expires_at) VALUES('stats_ss','stats_pupil',?,'2099-01-01T00:00:00Z')",[pupilHash])
 const submit=async(batch)=>{const r=await worker.fetch(new Request('https://genius.test/api/student/task-attempts',{method:'POST',headers:{cookie:'genius_student='+pupilToken,'content-type':'application/json'},body:JSON.stringify({studentId:'stats_pupil',attempts:batch})}),env);assert.equal(r.status,200);return r.json()}
 let result=await submit(attempts)
 assert.deepEqual(result.results.map(r=>r.correct),[false,true,false])
 assert.equal(result.totalXp,Math.floor(task.xp*.7))
 await submit(attempts)
 const get=async(url)=>{const r=await worker.fetch(new Request('https://genius.test'+url,{headers:{cookie:'genius_teacher=teacher_stats_token'}}),env);assert.equal(r.status,200);return r.json()}
 const detail=await get('/api/teacher/tasks/'+task.id)
 assert.equal(detail.task.ANSWER.value,task.answer)
 const pupil=detail.students.find(s=>s.id==='stats_pupil')
 assert.equal(pupil.attempts,3)
 assert.equal(pupil.solvedAttempt,2)
 assert.equal(pupil.xp,Math.floor(task.xp*.7))
 assert.equal(detail.students.find(s=>s.id==='stats_not_started').attempts,0)
 assert.equal(detail.students.find(s=>s.id==='stats_not_started').solvedAttempt,null)
 assert.ok(!detail.students.some(s=>['stats_foreign','stats_suspended'].includes(s.id)))
 const missing={id:'genius-peryshkin9-1588'}
 result=await submit([{...attempts[0],attemptId:'stats_unknown_key',eventId:'stats_unknown_event',taskId:missing.id,version:(await import('../shared/task-bank-meta.mjs')).TASK_BANK_VERSION_9,answer:'Измерить время падения и высоту'}])
 assert.equal(result.results[0].status,'PENDING_REVIEW')
 assert.equal(result.results[0].correct,null)
 assert.equal((await get('/api/teacher/tasks/'+missing.id)).students.find(s=>s.id==='stats_pupil').pendingReview,true)
 const catalog=await get('/api/teacher/tasks?source=fipi&type='+task.type)
 assert.ok(catalog.tasks.length)
 assert.ok(catalog.tasks.every(t=>t.type===task.type))
 assert.equal((await get('/api/teacher/tasks?source=fipi&q='+task.sourceNo)).tasks.some(t=>t.id===task.id),true)
 const progress=await worker.fetch(new Request('https://genius.test/api/student/task-attempts',{headers:{cookie:'genius_student='+pupilToken}}),env)
 assert.equal((await progress.json()).attempts.length,4)
})

test('OGE attempts use the student current grade and retain idempotency and version checks',async()=>{
 const {ogeTasks,OGE_BANK_VERSION}=await import('../app/oge-task-data.mjs')
 const task=ogeTasks.find(t=>typeof t.answer==='number')
 const item={attemptId:'oge_grade8_attempt',eventId:'oge_grade8_event',taskId:task.id,version:OGE_BANK_VERSION,answer:String(task.answer)}
 const r=await post({studentId:'test_student',attempts:[item]})
 assert.equal(r.data.results[0].correct,true)
 assert.equal(r.data.results[0].xpAwarded,task.xp)
 assert.equal((await post({studentId:'test_student',attempts:[item]})).data.results[0].xpAwarded,task.xp)
 assert.equal(dbCall("SELECT COUNT(*) AS count FROM task_attempts WHERE student_id='test_student' AND task_id=?",[task.id])[0].count,1)
 const stale=await post({studentId:'test_student',attempts:[{...item,attemptId:'oge_stale_attempt',eventId:'oge_stale_event',version:'old-version'}]})
 assert.equal(stale.data.results[0].error,'content_version_mismatch')
 assert.equal(dbCall("SELECT grade FROM xp_events WHERE student_id='test_student' AND source_id=?",[task.id])[0].grade,8)
})

test('High difficulty FIPI calculation attempts are persisted and award their declared 40 XP',async()=>{
 const {ogeTasks,OGE_BANK_VERSION}=await import('../app/oge-task-data.mjs')
 const task=ogeTasks.find(t=>t.kind==='calculation'&&t.xp===40)
 const item={attemptId:'oge_calculation_40',eventId:'oge_calculation_event_40',taskId:task.id,version:OGE_BANK_VERSION,answer:String(task.answer)}
 const result=await post({studentId:'test_student',attempts:[item]})
 assert.equal(result.data.results[0].status,'CONFIRMED')
 assert.equal(result.data.results[0].correct,true)
 assert.equal(result.data.results[0].xpAwarded,40)
 assert.equal(dbCall("SELECT max_xp FROM task_attempts WHERE student_id='test_student' AND attempt_id=?",[item.attemptId])[0].max_xp,40)
})

test('Verified keys confirm old correct attempts once, preserve uncertain answers and award the original attempt discount',async()=>{
 const id='verified_keys_pupil',token='verified_keys_token'
 const tokenHash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex')
 dbCall("INSERT INTO students(id,class_id,current_grade) VALUES(?,'class_8B',8)",[id])
 dbCall("INSERT INTO student_sessions(id,student_id,token_hash,expires_at) VALUES('verified_keys_session',?,?,'2099-01-01T00:00:00Z')",[id,tokenHash])
 const insert=(attempt,task,answer,xp=10)=>dbCall(`INSERT INTO task_attempts(student_id,attempt_id,event_id,task_id,content_version,payload_hash,answer_json,correct,status,max_xp)
 VALUES(?,?,?,?,?,'original_hash',?,NULL,'PENDING_REVIEW',?)`,[id,attempt,'event_'+attempt,task,'previous_bank_version',JSON.stringify(answer),xp])
 insert('old_wrong','genius-peryshkin-739','20000')
 insert('old_right','genius-peryshkin-739','21000')
 insert('old_equivalent','oge-1-1182',['5','3','4'],20)
 insert('old_free_text','genius-peryshkin-736','Для 1 кг на 1 градус нужно 920 Дж')
 const progress=async()=>{
  const r=await worker.fetch(new Request('https://genius.test/api/student/task-attempts',{headers:{cookie:'genius_student='+token}}),env)
  assert.equal(r.status,200);return r.json()
 }
 for(let i=0;i<2;i++){
  const data=await progress()
  assert.equal(data.totalXp,27)
  assert.equal(data.attempts.find(a=>a.attempt_id==='old_right').xp_awarded,7)
  assert.equal(data.attempts.find(a=>a.attempt_id==='old_right').status,'CONFIRMED')
  assert.equal(data.attempts.find(a=>a.attempt_id==='old_equivalent').correct,1)
  assert.equal(data.attempts.find(a=>a.attempt_id==='old_wrong').status,'PENDING_REVIEW')
  assert.equal(data.attempts.find(a=>a.attempt_id==='old_free_text').status,'PENDING_REVIEW')
 }
 assert.equal(dbCall('SELECT count(*) AS n FROM task_awards WHERE student_id=?',[id])[0].n,2)
 assert.ok(dbCall('SELECT payload_hash FROM task_attempts WHERE student_id=?',[id]).every(a=>a.payload_hash==='original_hash'))
})
