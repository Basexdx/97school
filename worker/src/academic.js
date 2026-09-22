const HEADERS = {'content-type':'application/json; charset=utf-8'}
const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers:HEADERS})

export async function studentPerformance(env, student) {
  const [rows, breaks] = await Promise.all([
    env.DB.prepare(`
      SELECT l.id AS lesson_id,l.lesson_date,l.topic,l.status AS lesson_status,
        g.value AS grade,g.kind AS grade_kind,g.comment AS grade_comment,
        h.id AS homework_id,
        COALESCE(o.title,h.title) AS homework_title,
        COALESCE(o.description,h.description) AS homework_description,
        COALESCE(ol.lesson_date,l.lesson_date) AS homework_due_date,
        COALESCE(p.status,'NOT_STARTED') AS homework_status,
        COALESCE(o.is_exempt,0) AS homework_exempt,
        CASE WHEN o.id IS NULL THEN 0 ELSE 1 END AS homework_personal
      FROM lessons l
      LEFT JOIN gradebook_entries g ON g.lesson_id=l.id AND g.student_id=?
      LEFT JOIN homework h ON h.lesson_id=l.id AND h.class_id=l.class_id
      LEFT JOIN homework_overrides o ON o.homework_id=h.id AND o.student_id=?
      LEFT JOIN lessons ol ON ol.id=o.lesson_id
      LEFT JOIN homework_progress p ON p.homework_id=h.id AND p.student_id=?
      WHERE l.class_id=? AND l.academic_year='2026-2027'
      ORDER BY l.lesson_date
    `).bind(student.id,student.id,student.id,student.classId).all(),
    env.DB.prepare(`SELECT id,title,starts_on,ends_on FROM school_breaks WHERE academic_year='2026-2027' ORDER BY starts_on`).all(),
  ])
  const lessons=rows.results||[]
  const today=new Date().toISOString().slice(0,10)
  const next=new Date(Date.now()+86_400_000).toISOString().slice(0,10)
  const reminders=lessons.filter(x=>x.homework_id&&x.homework_due_date===next&&x.homework_status!=='DONE'&&!x.homework_exempt)
    .map(x=>({homeworkId:x.homework_id,title:x.homework_title,lessonDate:x.homework_due_date,message:`Завтра урок. Не забудь выполнить ДЗ: ${x.homework_title}`}))
  return json({student:{id:student.id,nickname:student.nickname,className:student.className,grade:student.grade},academicYear:'2026-2027',today,lessons,breaks:breaks.results||[],reminders})
}

export async function studentRanking(request,env,student) {
  const scope=new URL(request.url).searchParams.get('scope')||'class'
  if(!['class','grade','school'].includes(scope))return json({error:'invalid_scope'},400)
  let where='s.class_id=?',params=[student.classId]
  if(scope==='grade'){where='s.current_grade=?';params=[student.grade]}
  if(scope==='school'){where='1=1';params=[]}
  const result=await env.DB.prepare(`
    SELECT s.id,s.nickname,s.current_grade AS grade,c.title AS class_name,COALESCE(cp.total_xp,0) AS xp
    FROM students s JOIN classes c ON c.id=s.class_id
    LEFT JOIN class_progress cp ON cp.student_id=s.id AND cp.grade=s.current_grade
    WHERE s.status='ACTIVE' AND ${where}
    ORDER BY xp DESC,s.created_at,s.id LIMIT 200
  `).bind(...params).all()
  let rank=0,lastXp=null
  const entries=(result.results||[]).map((row,index)=>{
    const xp=Number(row.xp||0)
    if(lastXp===null||xp!==lastXp)rank=index+1
    lastXp=xp
    return {...row,xp,rank,isCurrent:row.id===student.id}
  })
  return json({scope,entries,current:entries.find(x=>x.isCurrent)||null})
}

export async function updateHomeworkProgress(request,env,student,homeworkId) {
  const body=await safeJson(request)
  const status=String(body?.status||'')
  if(!['NOT_STARTED','IN_PROGRESS','DONE'].includes(status))return json({error:'invalid_status'},400)
  const row=await env.DB.prepare(`SELECT h.id FROM homework h JOIN students s ON s.class_id=h.class_id WHERE h.id=? AND s.id=?`).bind(homeworkId,student.id).first()
  if(!row)return json({error:'homework_not_found'},404)
  await env.DB.prepare(`INSERT INTO homework_progress(homework_id,student_id,status,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(homework_id,student_id) DO UPDATE SET status=excluded.status,updated_at=CURRENT_TIMESTAMP`).bind(homeworkId,student.id,status).run()
  return json({homeworkId,status})
}

export async function teacherAcademic(request,env,teacher) {
  const classId=new URL(request.url).searchParams.get('classId')||''
  const owned=await ownedClass(env,teacher.id,classId)
  if(!owned)return json({error:'class_not_found'},404)
  const [students,lessons,grades,homework,overrides]=await Promise.all([
    env.DB.prepare(`SELECT id,nickname,current_grade FROM students WHERE class_id=? AND status='ACTIVE' ORDER BY nickname,id`).bind(classId).all(),
    env.DB.prepare(`SELECT id,lesson_date,topic,status FROM lessons WHERE class_id=? AND academic_year='2026-2027' ORDER BY lesson_date`).bind(classId).all(),
    env.DB.prepare(`SELECT g.id,g.lesson_id,g.student_id,g.value,g.kind,g.comment FROM gradebook_entries g JOIN lessons l ON l.id=g.lesson_id WHERE l.class_id=?`).bind(classId).all(),
    env.DB.prepare(`SELECT h.id,h.lesson_id,h.title,h.description,l.lesson_date FROM homework h JOIN lessons l ON l.id=h.lesson_id WHERE h.class_id=? ORDER BY l.lesson_date`).bind(classId).all(),
    env.DB.prepare(`SELECT o.id,o.homework_id,o.student_id,o.title,o.description,o.lesson_id,o.is_exempt,ol.lesson_date FROM homework_overrides o JOIN homework h ON h.id=o.homework_id LEFT JOIN lessons ol ON ol.id=o.lesson_id WHERE h.class_id=?`).bind(classId).all(),
  ])
  return json({class:owned,students:students.results||[],lessons:lessons.results||[],grades:grades.results||[],homework:homework.results||[],overrides:overrides.results||[]})
}

export async function saveGrade(request,env,teacher) {
  const body=await safeJson(request),lessonId=String(body?.lessonId||''),studentId=String(body?.studentId||''),value=Number(body?.value)
  const kind=['LESSON','HOMEWORK','TEST','LAB'].includes(body?.kind)?body.kind:'LESSON'
  if(!Number.isInteger(value)||value<2||value>5)return json({error:'invalid_grade'},400)
  const row=await env.DB.prepare(`SELECT l.id FROM lessons l JOIN classes c ON c.id=l.class_id JOIN students s ON s.class_id=c.id WHERE l.id=? AND s.id=? AND c.teacher_id=?`).bind(lessonId,studentId,teacher.id).first()
  if(!row)return json({error:'lesson_or_student_not_found'},404)
  const comment=clean(body?.comment,240)
  const id=crypto.randomUUID()
  await env.DB.prepare(`INSERT INTO gradebook_entries(id,lesson_id,student_id,value,kind,comment,created_by) VALUES(?,?,?,?,?,?,?)
    ON CONFLICT(lesson_id,student_id,kind) DO UPDATE SET value=excluded.value,comment=excluded.comment,updated_at=CURRENT_TIMESTAMP`).bind(id,lessonId,studentId,value,kind,comment,teacher.id).run()
  return json({lessonId,studentId,value,kind,comment},201)
}

export async function saveHomework(request,env,teacher) {
  const body=await safeJson(request),classId=String(body?.classId||''),lessonId=String(body?.lessonId||'')
  const title=clean(body?.title,120),description=clean(body?.description,2000)
  if(!title)return json({error:'title_required'},400)
  const row=await env.DB.prepare(`SELECT l.id FROM lessons l JOIN classes c ON c.id=l.class_id WHERE l.id=? AND c.id=? AND c.teacher_id=?`).bind(lessonId,classId,teacher.id).first()
  if(!row)return json({error:'lesson_not_found'},404)
  const id=crypto.randomUUID()
  await env.DB.prepare(`INSERT INTO homework(id,class_id,lesson_id,title,description,created_by) VALUES(?,?,?,?,?,?)
    ON CONFLICT(class_id,lesson_id) DO UPDATE SET title=excluded.title,description=excluded.description,updated_at=CURRENT_TIMESTAMP`).bind(id,classId,lessonId,title,description,teacher.id).run()
  const saved=await env.DB.prepare(`SELECT id,class_id,lesson_id,title,description FROM homework WHERE class_id=? AND lesson_id=?`).bind(classId,lessonId).first()
  return json({homework:saved},201)
}

export async function saveHomeworkOverride(request,env,teacher,homeworkId) {
  const body=await safeJson(request),studentId=String(body?.studentId||'')
  const row=await env.DB.prepare(`SELECT h.id,h.class_id FROM homework h JOIN classes c ON c.id=h.class_id JOIN students s ON s.class_id=c.id WHERE h.id=? AND s.id=? AND c.teacher_id=?`).bind(homeworkId,studentId,teacher.id).first()
  if(!row)return json({error:'homework_or_student_not_found'},404)
  const lessonId=body?.lessonId?String(body.lessonId):null
  if(lessonId){const lesson=await env.DB.prepare(`SELECT id FROM lessons WHERE id=? AND class_id=?`).bind(lessonId,row.class_id).first();if(!lesson)return json({error:'lesson_not_found'},404)}
  const title=body?.title==null?null:clean(body.title,120),description=body?.description==null?null:clean(body.description,2000),isExempt=body?.isExempt?1:0
  const id=crypto.randomUUID()
  await env.DB.prepare(`INSERT INTO homework_overrides(id,homework_id,student_id,title,description,lesson_id,is_exempt,updated_by) VALUES(?,?,?,?,?,?,?,?)
    ON CONFLICT(homework_id,student_id) DO UPDATE SET title=excluded.title,description=excluded.description,lesson_id=excluded.lesson_id,is_exempt=excluded.is_exempt,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`).bind(id,homeworkId,studentId,title,description,lessonId,isExempt,teacher.id).run()
  return json({homeworkId,studentId,title,description,lessonId,isExempt:Boolean(isExempt)},201)
}

async function ownedClass(env,teacherId,classId){return env.DB.prepare(`SELECT id,title,grade FROM classes WHERE id=? AND teacher_id=?`).bind(classId,teacherId).first()}
async function safeJson(request){try{return await request.json()}catch{return null}}
function clean(value,max){return typeof value==='string'?value.trim().replace(/[<>]/g,'').slice(0,max):''}
