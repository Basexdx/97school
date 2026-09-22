import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {spawnSync} from 'node:child_process'
import {build} from 'esbuild'
import {generateLessonDates,isSchoolBreak} from '../shared/academic-calendar.mjs'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'genius-academic-test-'))
process.on('exit',()=>fs.rmSync(temp,{recursive:true,force:true}))
await build({entryPoints:[path.join(root,'worker/src/index.js')],bundle:true,format:'esm',platform:'node',outfile:path.join(temp,'worker.mjs')})
const worker=(await import(pathToFileURL(path.join(temp,'worker.mjs')))).default
const sqlite=path.join(temp,'db.sqlite')

function dbCall(sql,params=[],script=false){
  const py=`import sqlite3,json,sys\nx=json.load(sys.stdin)\nc=sqlite3.connect(x['db']);c.row_factory=sqlite3.Row;c.execute('PRAGMA foreign_keys=ON')\nif x['script']:\n c.executescript(x['sql']);rows=[]\nelse:\n cur=c.execute(x['sql'],x['params']);rows=[dict(r) for r in cur.fetchall()]\nc.commit();print(json.dumps(rows))`
  const result=spawnSync('python3',['-c',py],{input:JSON.stringify({db:sqlite,sql,params,script}),encoding:'utf8'})
  if(result.status!==0)throw Error(result.stderr)
  return JSON.parse(result.stdout)
}
dbCall(fs.readFileSync(path.join(root,'cloudflare/schema.sql'),'utf8'),[],true)
const env={DB:{prepare(sql){let params=[];return {bind(...values){params=values;return this},async first(){return dbCall(sql,params)[0]||null},async all(){return {results:dbCall(sql,params)}},async run(){dbCall(sql,params);return {success:true}}}}}}

async function hash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('')}
const studentToken='academic_student_token',teacherToken='academic_teacher_token'
dbCall("INSERT INTO students(id,class_id,nickname,current_grade) VALUES('academic_student','class_8B','Алексей',8)")
dbCall("INSERT INTO class_progress(id,student_id,grade,total_xp) VALUES('cp_academic','academic_student',8,420)")
dbCall("INSERT INTO student_sessions(id,student_id,token_hash,expires_at) VALUES('academic_ss','academic_student',?,'2099-01-01T00:00:00Z')",[await hash(studentToken)])
dbCall("INSERT INTO teacher_sessions(id,teacher_id,token_hash,expires_at) VALUES('academic_ts','teacher_01',?,'2099-01-01T00:00:00Z')",[await hash(teacherToken)])

async function call(pathname,{method='GET',role='student',body}={}){
  const token=role==='teacher'?teacherToken:studentToken
  const response=await worker.fetch(new Request(`https://genius.test${pathname}`,{method,headers:{cookie:`genius_${role}=${token}`,'content-type':'application/json'},body:body?JSON.stringify(body):undefined}),env)
  return {status:response.status,data:await response.json()}
}

test('academic calendar contains only Tuesday and Friday lessons outside supplied breaks',()=>{
  const dates=generateLessonDates()
  assert.equal(dates[0],'2026-09-01')
  assert.equal(dates.at(-1),'2027-05-28')
  assert.ok(dates.length>60)
  for(const iso of dates){const day=new Date(`${iso}T12:00:00Z`).getUTCDay();assert.ok(day===2||day===5);assert.equal(isSchoolBreak(iso),false)}
  assert.equal(dates.includes('2026-10-06'),false)
  assert.equal(dates.includes('2027-04-09'),false)
})

test('teacher can grade, assign class homework and override it for one student',async()=>{
  const lesson=dbCall("SELECT id,lesson_date FROM lessons WHERE class_id='class_8B' ORDER BY lesson_date LIMIT 1")[0]
  let result=await call('/api/teacher/grades',{method:'POST',role:'teacher',body:{studentId:'academic_student',lessonId:lesson.id,value:5,kind:'LESSON',comment:'Отлично'}})
  assert.equal(result.status,201)
  result=await call('/api/teacher/homework',{method:'POST',role:'teacher',body:{classId:'class_8B',lessonId:lesson.id,title:'Задачи §1',description:'№ 1–4'}})
  assert.equal(result.status,201)
  const homeworkId=result.data.homework.id
  result=await call(`/api/teacher/homework/${homeworkId}/override`,{method:'POST',role:'teacher',body:{studentId:'academic_student',title:'Индивидуальные задачи',description:'№ 5–6'}})
  assert.equal(result.status,201)
  result=await call('/api/student/performance')
  assert.equal(result.status,200)
  const row=result.data.lessons.find(x=>x.lesson_id===lesson.id)
  assert.equal(row.grade,5)
  assert.equal(row.homework_title,'Индивидуальные задачи')
  assert.equal(row.homework_personal,1)
  result=await call(`/api/student/homework/${homeworkId}/status`,{method:'POST',body:{status:'DONE'}})
  assert.equal(result.data.status,'DONE')
})

test('rankings expose class, parallel and school scopes with current student marker',async()=>{
  for(const scope of ['class','grade','school']){
    const result=await call(`/api/student/rankings?scope=${scope}`)
    assert.equal(result.status,200)
    assert.equal(result.data.scope,scope)
    assert.equal(result.data.current.id,'academic_student')
    assert.equal(result.data.current.xp,420)
  }
})
