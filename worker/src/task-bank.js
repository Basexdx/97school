import {ogeTasks,OGE_BANK_VERSION} from '../../app/oge-task-data.mjs'
import {sectionsForTask} from '../../app/oge-task-filters.mjs'
import {checkOgeAttempt} from '../../shared/oge-attempts.mjs'
import tasks8 from '../../bank/tasks.json'
import tasks8extra from '../../bank/tasks-grade8-additions.json'
import grade7Pack from '../../public/task-bank/grade7.json'
import grade9Pack from '../../public/task-bank/grade9.json'
import {grade8RuntimeAdditions} from '../../bank/peryshkin-runtime-additions.mjs'
import {checkAnswer,publishable} from '../../shared/task-checker.mjs'
import {TASK_BANK_VERSION,TASK_BANK_VERSION_7,TASK_BANK_VERSION_9} from '../../shared/task-bank-meta.mjs'

const allTasks=[...tasks8,...tasks8extra,...grade8RuntimeAdditions,...(grade7Pack.tasks||[]),...(grade9Pack.tasks||[])]
const ogeById=new Map(ogeTasks.map(t=>[t.id,t]))
const byId=new Map(allTasks.filter(publishable).map(t=>[t.ID,t]))
const versionForGrade=grade=>Number(grade)===7?TASK_BANK_VERSION_7:Number(grade)===9?TASK_BANK_VERSION_9:TASK_BANK_VERSION
const gradeSql="CASE WHEN task_id LIKE 'genius-peryshkin7-%' THEN 7 WHEN task_id LIKE 'oge-%' THEN (SELECT current_grade FROM students WHERE id=a.student_id) WHEN task_id LIKE 'genius-peryshkin9-%' THEN 9 ELSE 8 END"
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})
const digest=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('')

export async function teacherTaskCatalog(request){
 const url=new URL(request.url),source=url.searchParams.get('source')||'peryshkin',grade=Number(url.searchParams.get('grade')||8),page=Math.max(0,Math.min(1000,Number(url.searchParams.get('page'))||0))
 if(!['fipi','peryshkin'].includes(source)||![7,8,9].includes(grade))return json({error:'invalid_filter'},400)
 const query=(url.searchParams.get('q')||'').trim().toLocaleLowerCase('ru-RU').slice(0,120),type=Number(url.searchParams.get('type')||0),section=url.searchParams.get('section')||''
 const tasks=source==='fipi'?ogeTasks.map(t=>({id:t.id,number:t.sourceNo,grade:9,xp:t.xp,topic:sectionsForTask(t).join(' · '),preview:t.text,type:t.type,sections:sectionsForTask(t)})):[...byId.values()].filter(t=>Number(t.CLASS)===grade).map(t=>({id:t.ID,number:t.BOOK_TASK_NUMBER,grade:t.CLASS,xp:t.XP,topic:t.TOPIC,preview:t.TASK}))
 const matches=tasks.filter(t=>(!type||t.type===type)&&(!section||t.sections?.includes(section))&&(!query||`${t.id} ${t.number||''} ${t.topic} ${t.preview}`.toLocaleLowerCase('ru-RU').includes(query)))
 return json({source,total:matches.length,tasks:matches.slice(page*40,page*40+40).map(t=>({...t,preview:String(t.preview||'').slice(0,160)}))})
}

export async function teacherTaskDetail(env,teacher,id){
 const oge=ogeById.get(id),book=byId.get(id)
 if(!oge&&!book)return json({error:'task_not_found'},404)
 const task=oge?{ID:oge.id,CLASS:9,TOPIC:sectionsForTask(oge).join(' · '),TASK:oge.text,BOOK_TASK_NUMBER:oge.sourceNo,XP:oge.xp,ANSWER:oge.answer==null?{mode:'manual'}:Array.isArray(oge.answer)?{mode:'sequence',values:oge.answer}:{mode:'numeric',value:oge.answer,unit:oge.unit},oge}:book
 const rows=await env.DB.prepare(`SELECT s.id,s.nickname,c.title AS class_name,a.attempt_id,a.correct,a.status,a.received_at,w.amount AS xp
 FROM students s JOIN classes c ON c.id=s.class_id
 LEFT JOIN task_attempts a ON a.student_id=s.id AND a.task_id=?
 LEFT JOIN task_awards w ON w.student_id=s.id AND w.task_id=?
 WHERE c.teacher_id=? AND s.status='ACTIVE'
 ORDER BY c.title,s.nickname,s.id,a.received_at,a.rowid`).bind(id,id,teacher.id).all()
 const students=new Map()
 for(const row of rows.results||[]){
  if(!students.has(row.id))students.set(row.id,{id:row.id,nickname:row.nickname,className:row.class_name,xp:row.xp||0,attempts:0,solvedAttempt:null,pendingReview:false})
  const pupil=students.get(row.id)
  if(row.attempt_id){pupil.attempts++;if(row.correct===1&&row.status==='CONFIRMED'&&pupil.solvedAttempt===null)pupil.solvedAttempt=pupil.attempts;if(row.status==='PENDING_REVIEW')pupil.pendingReview=true}
 }
 return json({task,students:[...students.values()]})
}

export async function taskProgress(env,student) {
  const grade=Number(student.grade)
  const rows=await env.DB.prepare(`SELECT a.task_id,a.attempt_id,a.event_id,a.correct,a.status,a.received_at,
    COALESCE((SELECT amount FROM task_awards w WHERE w.student_id=a.student_id AND w.task_id=a.task_id AND w.attempt_id=a.attempt_id),0) AS xp_awarded
    FROM task_attempts a
    WHERE a.student_id=? AND (${gradeSql})=?
    ORDER BY a.received_at,a.rowid`).bind(student.id,grade).all()
  const xp=await env.DB.prepare('SELECT total_xp FROM class_progress WHERE student_id=? AND grade=?').bind(student.id,grade).first()
  return json({studentId:student.id,grade,attempts:rows.results||[],totalXp:xp?.total_xp||0})
}

export async function submitTaskAttempts(request,env,student) {
  const grade=Number(student.grade)
  if(![7,8,9].includes(grade)) return json({error:'grade_mismatch'},403)
  const text=await request.text()
  if(text.length>100000) return json({error:'payload_too_large'},413)
  let body
  try {body=JSON.parse(text)} catch {return json({error:'invalid_json'},400)}
  if(body.studentId!==student.id) return json({error:'student_mismatch'},403)
  if(!Array.isArray(body.attempts)||body.attempts.length>50) return json({error:'invalid_batch'},400)
  const results=[]
  for(const item of body.attempts) {
    const {attemptId,eventId,taskId,version,answer}=item||{}
    if(![attemptId,eventId].every(x=>typeof x==='string'&&/^[A-Za-z0-9_-]{8,120}$/.test(x)) || typeof taskId!=='string' || JSON.stringify(answer??'').length>10000) {
      results.push({attemptId,status:'REJECTED',error:'invalid_attempt'});continue
    }
    const hash=await digest(JSON.stringify({taskId,version,answer:answer??null}))
    let existing=await env.DB.prepare('SELECT * FROM task_attempts WHERE student_id=? AND (attempt_id=? OR event_id=?)').bind(student.id,attemptId,eventId).first()
    if(!existing) {
      const oge=ogeById.get(taskId)
      const task=oge?{CLASS:grade,XP:oge.xp}:byId.get(taskId)
      if(!task||Number(task.CLASS)!==grade||version!==(oge?OGE_BANK_VERSION:versionForGrade(grade))) {
        results.push({attemptId,status:'REJECTED',error:!task?'task_unavailable':Number(task.CLASS)!==grade?'grade_mismatch':'content_version_mismatch'});continue
      }
      const checked=oge?checkOgeAttempt(oge,answer):checkAnswer(task,answer)
      const status=checked.reviewRequired?'PENDING_REVIEW':'CONFIRMED'
      await env.DB.prepare(`INSERT OR IGNORE INTO task_attempts
        (student_id,attempt_id,event_id,task_id,content_version,payload_hash,answer_json,correct,status,max_xp)
        VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(student.id,attemptId,eventId,taskId,version,hash,JSON.stringify(answer??null),checked.correct===null?null:Number(checked.correct),status,task.XP).run()
      existing=await env.DB.prepare('SELECT * FROM task_attempts WHERE student_id=? AND (attempt_id=? OR event_id=?)').bind(student.id,attemptId,eventId).first()
    }
    if(!existing || existing.payload_hash!==hash || existing.attempt_id!==attemptId || existing.event_id!==eventId) {
      results.push({attemptId,status:'REJECTED',error:'attempt_id_conflict'});continue
    }
    const award=await env.DB.prepare('SELECT amount FROM task_awards WHERE student_id=? AND task_id=? AND attempt_id=?').bind(student.id,taskId,attemptId).first()
    results.push({attemptId,taskId,status:existing.status,correct:existing.correct===null?null:Boolean(existing.correct),xpAwarded:award?.amount||0})
  }
  const xp=await env.DB.prepare('SELECT total_xp FROM class_progress WHERE student_id=? AND grade=?').bind(student.id,grade).first()
  return json({studentId:student.id,grade,results,totalXp:xp?.total_xp||0})
}
