import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {buildSync} from 'esbuild'
import {createRequire} from 'node:module'
const workerModule={exports:{}}
const workerBundle=buildSync({entryPoints:['worker/src/index.js'],bundle:true,write:false,format:'cjs',platform:'node'})
new Function('require','module','exports',workerBundle.outputFiles[0].text)(createRequire(import.meta.url),workerModule,workerModule.exports)
const worker=workerModule.exports.default
import {createD1Database} from '../server/sqlite-d1.mjs'
import {studentAvatars,studentDestination} from '../shared/student-avatars.mjs'
function fixture(){const dir=mkdtempSync(join(tmpdir(),'genius-access-'));const DB=createD1Database(join(dir,'db.sqlite'));const env={DB,TEACHER_ACCESS_SECRET:'test-only-access-secret',RATE_LIMIT_SECRET:'test-only-rate-secret'};const jar={};async function api(path,{body,role='student'}={}){const response=await worker.fetch(new Request(`https://genius.test${path}`,{method:body===undefined?'GET':'POST',headers:{cookie:jar[role]||'','content-type':'application/json','cf-connecting-ip':role==='teacher'?'192.0.2.1':'192.0.2.2'},...(body===undefined?{}:{body:JSON.stringify(body)})}),env);const cookies=response.headers.getSetCookie();if(cookies.length){const values=new Map((jar[role]||'').split('; ').filter(Boolean).map(x=>x.split('=')));for(const cookie of cookies){const [pair]=cookie.split(';');const [name,value]=pair.split('=');if(value)values.set(name,value);else values.delete(name)}jar[role]=[...values].map(([k,v])=>`${k}=${v}`).join('; ')}return {status:response.status,data:await response.json(),cookies}};return {DB,jar,api,close:()=>{DB.close();rmSync(dir,{recursive:true,force:true})}}}
async function login(f){assert.equal((await f.api('/api/teacher/login',{role:'teacher',body:{secret:'test-only-access-secret'}})).status,200)}
async function key(f,extra={}){const response=await f.api('/api/teacher/access-keys',{role:'teacher',body:{classId:'class_8B',label:'Ученик №17',...extra}});assert.equal(response.status,201);return response.data.key}
async function connect(f,k){const pending=await f.api('/api/student/access/request',{body:{code:k.code}});assert.equal(pending.status,201);assert.equal((await f.api(`/api/teacher/connection-requests/${pending.data.requestId}/approve`,{role:'teacher',body:{}})).status,200);return f.api('/api/student/access/status')}
test('real first login, approval, server profile, persistent session, logout and new device preserve student identity',async()=>{const f=fixture();try{
 assert.equal((await f.api('/api/student/profile',{body:{avatarId:'avatar_boy_01'}})).status,401)
 await login(f);const k=await key(f);const pending=await f.api('/api/student/access/request',{body:{code:k.code}});assert.equal(pending.status,201)
 const repeated=await f.api('/api/student/access/request',{body:{code:k.code}});assert.equal(repeated.data.requestId,pending.data.requestId)
 assert.equal((await f.api('/api/student/access/status')).data.status,'PENDING')
 assert.equal((await f.api('/api/student/me')).status,401)
 assert.equal((await f.api(`/api/teacher/connection-requests/${pending.data.requestId}/approve`,{role:'teacher',body:{}})).status,200)
 const approved=await f.api('/api/student/access/status');assert.equal(approved.data.status,'APPROVED');const id=approved.data.student.id
 assert.equal(studentDestination(approved.data.student),'avatar-setup')
 const cookie=approved.cookies.find(c=>c.startsWith('genius_student='));assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/Max-Age=2592000/)
 assert.equal((await f.api('/api/student/profile',{body:{avatarId:'not-approved'}})).status,400)
 assert.equal((await f.api('/api/student/profile',{body:{avatarId:'avatar_girl_06',gender:'ignored'}})).status,200)
 const me=await f.api('/api/student/me');assert.equal(me.data.student.avatarId,'avatar_girl_06');assert.equal(me.data.student.profileSetupCompleted,true);assert.equal(studentDestination(me.data.student),'home')
 assert.equal((await f.api('/api/student/access/request',{body:{code:k.code}})).data.error,'code_used')
 // Browser restart keeps the persistent cookie; server profile is authoritative without a local draft.
 f.jar.restarted=f.jar.student;assert.equal((await f.api('/api/student/me',{role:'restarted'})).data.student.avatarId,'avatar_girl_06')
 assert.equal((await f.api('/api/student/profile',{body:{avatarId:'avatar_boy_05'}})).data.student.avatarId,'avatar_boy_05')
 await f.api('/api/student/logout',{body:{}});assert.equal((await f.api('/api/student/me')).status,401)
 const recovery=await key(f,{purpose:'NEW_DEVICE',studentId:id});const restored=await connect(f,recovery)
 assert.equal(restored.data.student.id,id);assert.equal(restored.data.student.avatarId,'avatar_boy_05');assert.equal(studentDestination(restored.data.student),'home')
 assert.equal((await f.DB.prepare('SELECT COUNT(*) AS n FROM students').first()).n,1)
 await f.DB.prepare("UPDATE student_sessions SET expires_at='2000-01-01T00:00:00Z'").run();assert.equal((await f.api('/api/student/me')).status,401)
 const recovered=await connect(f,await key(f,{purpose:'RECOVERY',studentId:id}));assert.equal(recovered.data.student.avatarId,'avatar_boy_05')
 }finally{f.close()}})
test('bad, expired, in-use, rejected and expired pending requests never create a student session',async()=>{const f=fixture();try{
 await login(f);assert.equal((await f.api('/api/student/access/request',{body:{code:'WRONG'}})).data.error,'invalid_code')
 const expired=await key(f);await f.DB.prepare("UPDATE access_keys SET expires_at='2000-01-01T00:00:00Z' WHERE id=?").bind(expired.id).run();assert.equal((await f.api('/api/student/access/request',{body:{code:expired.code}})).data.error,'code_expired')
 const k=await key(f);const pending=await f.api('/api/student/access/request',{body:{code:k.code}});assert.equal((await f.api('/api/student/access/request',{role:'other-device',body:{code:k.code}})).data.error,'code_already_in_use')
 await f.api(`/api/teacher/connection-requests/${pending.data.requestId}/reject`,{role:'teacher',body:{}});assert.equal((await f.api('/api/student/access/status')).data.status,'REJECTED');assert.equal((await f.api('/api/student/me')).status,401)
 const another=await key(f);const waiting=await f.api('/api/student/access/request',{body:{code:another.code}});await f.DB.prepare("UPDATE connection_requests SET expires_at='2000-01-01T00:00:00Z' WHERE id=?").bind(waiting.data.requestId).run();assert.equal((await f.api('/api/student/access/status')).data.status,'EXPIRED');assert.equal((await f.api('/api/student/me')).status,401)
 }finally{f.close()}})
test('teacher cannot recover a foreign student and fresh keys cannot attach an existing profile',async()=>{const f=fixture();try{await login(f);await f.DB.prepare("INSERT INTO students(id,class_id,current_grade) VALUES('foreign','class_9A',9)").run();assert.equal((await f.api('/api/teacher/access-keys',{role:'teacher',body:{classId:'class_8B',purpose:'RECOVERY',studentId:'foreign'}})).status,404);assert.equal((await f.api('/api/teacher/access-keys',{role:'teacher',body:{classId:'class_9A',purpose:'INITIAL_ACCESS',studentId:'foreign'}})).status,400)}finally{f.close()}})
test('all twelve approved avatars map to distinct portraits in the supplied original sheets',()=>{assert.equal(new Set(studentAvatars.map(a=>a.id)).size,12);for(const group of ['boys','girls']){const list=studentAvatars.filter(a=>a.group===group);assert.equal(list.length,6);assert.equal(new Set(list.map(a=>a.viewBox)).size,6);assert.ok(readFileSync(`public/avatars/${group}.png`).length>100000)}assert.equal(studentDestination({profileSetupCompleted:true,avatarId:'unknown'}),'avatar-setup')})

test('concurrent teacher approvals create only one student',async()=>{const f=fixture();try{await login(f);const k=await key(f);const pending=await f.api('/api/student/access/request',{body:{code:k.code}});const responses=await Promise.all([f.api(`/api/teacher/connection-requests/${pending.data.requestId}/approve`,{role:'teacher',body:{}}),f.api(`/api/teacher/connection-requests/${pending.data.requestId}/approve`,{role:'teacher',body:{}})]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);assert.equal((await f.DB.prepare('SELECT COUNT(*) AS n FROM students').first()).n,1)}finally{f.close()}})
