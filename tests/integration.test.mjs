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
 const index=await store.bankIndex();assert.equal(index.tasks.length,319)
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
 // Content removal does not erase attempts or server XP.
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('genius-offline',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})
 await new Promise((resolve,reject)=>{const tx=db.transaction(['content','packages'],'readwrite');tx.objectStore('content').clear();tx.objectStore('packages').clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})
 navigator.onLine=false
 await assert.rejects(()=>store.loadBankTask(task.ID,index.version),/ещё не скачана/)
 assert.ok((await store.bankAttempts('test_student')).length>0)
 assert.equal(dbCall("SELECT total_xp FROM class_progress WHERE student_id='test_student'")[0].total_xp,10)
})
