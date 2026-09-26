'use client'

import {useEffect,useMemo,useRef,useState} from 'react'
import {formatSchoolDate,generateLessonDates,tomorrowIso,SCHOOL_BREAKS} from '../shared/academic-calendar.mjs'
import styles from './performance-v2.module.css'

const classOptions=[['class_7A','7А',7],['class_8B','8Б',8],['class_9A','9А',9],['class_9B','9Б',9]]
const demoNames=['Иванов Артём','Петрова Анна','Сидоров Максим','Кузнецова Мария','Смирнов Даниил','Волкова Елизавета','Фёдоров Илья','Орлова София']
const workTypes={
  LESSON:{label:'Работа на уроке',short:'Урок',icon:'✦'},
  INDEPENDENT:{label:'Самостоятельная работа',short:'Самост.',icon:'◇'},
  TEST:{label:'Контрольная работа',short:'Контр.',icon:'★'},
  HOMEWORK:{label:'Домашняя работа',short:'ДЗ',icon:'⌂'},
}
const workType=value=>workTypes[value]||workTypes.LESSON

function todayIso(){return new Date().toISOString().slice(0,10)}
function demoPerformance(grade=8){
  const dates=generateLessonDates(),tomorrow=tomorrowIso(),today=todayIso()
  const lessons=dates.map((date,index)=>{
    const assessment_type=index%9===4?'TEST':index%5===2?'INDEPENDENT':'LESSON'
    const past=date<today
    return {
      lesson_id:`demo-${date}`,lesson_date:date,lesson_status:past?'COMPLETED':'PLANNED',
      topic:index%3===0?'Решение задач по теме':index%3===1?'Законы и физические величины':'Практика и закрепление',
      assessment_type,
      grade:past&&index%2===0?[5,4,5,3][index%4]:null,
      grade_kind:'LESSON',attendance_status:past&&index===3?'ABSENT':null,
      homework_id:index>1&&index<12?`hw-${index}`:null,
      homework_title:index>1&&index<12?`Задачи §${index+1}`:null,
      homework_description:index>1&&index<12?`Решить упражнения ${index*2+1}–${index*2+4}.`:'',
      homework_due_date:date,homework_status:index<5?'DONE':'NOT_STARTED',homework_personal:index===7?1:0,homework_exempt:0,
    }
  })
  const nextLesson=lessons.find(x=>x.lesson_date>=today&&x.homework_id)
  const reminders=nextLesson&&nextLesson.lesson_date===tomorrow?[{homeworkId:nextLesson.homework_id,title:nextLesson.homework_title,lessonDate:nextLesson.lesson_date,message:`Завтра урок. Не забудь выполнить ДЗ: ${nextLesson.homework_title}`}]:[]
  return {student:{nickname:'Алексей',className:`${grade}Б`,grade},lessons,breaks:[],reminders,academicYear:'2026-2027'}
}

async function api(url,options){
  const response=await fetch(url,{credentials:'same-origin',headers:{'content-type':'application/json',...(options?.headers||{})},...options})
  if(!response.ok)throw Error((await response.json().catch(()=>({}))).error||`HTTP ${response.status}`)
  return response.json()
}

export function StudentPerformance({grade,xp}){
  const [tab,setTab]=useState('diary')
  return <div className={styles.performancePage}>
    <header className={styles.performanceHero}>
      <div><div className={styles.kicker}>GENIUS · ФИЗИКА</div><h1>Моя успеваемость</h1><p>Дневник, результаты и прогресс — всё по физике в одном месте.</p></div>
      <div className={styles.heroAtom} aria-hidden="true">⚛</div>
    </header>
    <div className={styles.tabs}><button className={tab==='diary'?styles.active:''} onClick={()=>setTab('diary')}>Дневник</button><button className={tab==='rating'?styles.active:''} onClick={()=>setTab('rating')}>Рейтинг</button></div>
    {tab==='diary'?<StudentDiary grade={grade}/>:<StudentRating grade={grade} xp={xp}/>} 
  </div>
}

function StudentDiary({grade}){
  const [data,setData]=useState(()=>demoPerformance(grade)),[notice,setNotice]=useState(''),[showAll,setShowAll]=useState(false)
  useEffect(()=>{let live=true;api('/api/student/performance').then(x=>live&&setData(x)).catch(()=>{});return()=>{live=false}},[grade])
  const today=todayIso()
  const visible=useMemo(()=>{
    if(showAll)return data.lessons
    const past=data.lessons.filter(x=>x.lesson_date<today).slice(-5),future=data.lessons.filter(x=>x.lesson_date>=today).slice(0,7)
    return [...past,...future]
  },[data,showAll,today])
  const grades=data.lessons.map(x=>x.attendance_status==='ABSENT'?null:Number(x.grade)).filter(Boolean)
  const average=grades.length?(grades.reduce((a,b)=>a+b,0)/grades.length).toFixed(1):'—'
  const pending=data.lessons.filter(x=>x.homework_id&&x.homework_status!=='DONE'&&!x.homework_exempt).length
  const todayLesson=data.lessons.find(x=>x.lesson_date===today)
  const nextControl=data.lessons.find(x=>x.lesson_date>=today&&x.assessment_type==='TEST')
  const todayControl=todayLesson?.assessment_type==='TEST'

  useEffect(()=>{if(typeof Notification==='undefined'||Notification.permission!=='granted'||!data.reminders.length)return;showReminder(data.reminders[0])},[data.reminders])
  async function enableNotifications(){
    if(typeof Notification==='undefined'){setNotice('Системные уведомления не поддерживаются этим браузером. Напоминание останется внутри Genius.');return}
    const permission=await Notification.requestPermission()
    if(permission==='granted'){setNotice('Напоминания включены. Genius предупредит за день до урока.');if(data.reminders[0])await showReminder(data.reminders[0])}
    else setNotice('Разрешение не выдано. Напоминания останутся внутри приложения.')
  }
  async function showReminder(reminder){
    const key=`genius-reminder:${reminder.homeworkId}:${reminder.lessonDate}`
    if(localStorage.getItem(key))return
    try{const registration=await navigator.serviceWorker?.ready;await registration?.showNotification('Невыполненное домашнее задание',{body:reminder.message,icon:'/icons/icon-192.png',badge:'/icons/icon-192.png',tag:key,data:{url:'/?screen=performance'}});localStorage.setItem(key,'shown')}catch{}
  }
  async function setDone(item){
    setData(current=>({...current,lessons:current.lessons.map(x=>x.homework_id===item.homework_id?{...x,homework_status:'DONE'}:x)}))
    try{await api(`/api/student/homework/${encodeURIComponent(item.homework_id)}/status`,{method:'POST',body:JSON.stringify({status:'DONE'})})}catch{}
  }

  return <div className={styles.diaryShell}>
    {todayControl&&<div className={styles.controlAlert}><span>★</span><div><strong>Сегодня контрольная работа</strong><p>{todayLesson.topic||'Проверь материалы по последней теме и приходи готовым.'}</p></div></div>}
    {!todayControl&&nextControl&&<div className={styles.nextControl}><span>★</span><div><strong>Ближайшая контрольная</strong><p>{formatSchoolDate(nextControl.lesson_date,{weekday:true})} · {nextControl.topic||'Физика'}</p></div></div>}
    {data.reminders.length>0&&<div className={styles.reminder}><span>🔔</span><div><strong>Завтра урок</strong><p>{data.reminders[0].message}</p></div><button onClick={enableNotifications}>Уведомления</button></div>}
    {notice&&<p className={styles.notice} role="status">{notice}</p>}

    <section className={styles.studentOverview}>
      <article><span>Средний балл</span><strong>{average}</strong><small>по физике</small></article>
      <article><span>Оценок</span><strong>{grades.length}</strong><small>без пропусков «н»</small></article>
      <article><span>Невыполнено</span><strong>{pending}</strong><small>домашних заданий</small></article>
      <article><span>XP</span><strong>+{Math.max(0,grades.length*25)}</strong><small>за учебную активность</small></article>
    </section>

    <section className={styles.diaryCard}>
      <div className={styles.diaryHead}><div><div className={styles.kicker}>ФИЗИКА · {data.student?.className||`${grade} КЛАСС`}</div><h2>Дневник</h2><p>Оценки визуально разделены по типу работы.</p></div><button onClick={()=>setShowAll(!showAll)}>{showAll?'Ближайшие уроки':'Весь год'}</button></div>
      <div className={styles.legend}><span className={styles.kindLesson}>✦ Работа на уроке</span><span className={styles.kindIndependent}>◇ Самостоятельная</span><span className={styles.kindTest}>★ Контрольная</span><span className={styles.absentLegend}>н · не был на уроке</span></div>
      <div className={styles.agenda}>{visible.map(item=>{
        const meta=workType(item.assessment_type),absent=item.attendance_status==='ABSENT',isToday=item.lesson_date===today
        return <article key={item.lesson_id} className={`${styles.lessonCard} ${isToday?styles.today:''} ${styles[`work${item.assessment_type||'LESSON'}`]||''}`}>
          <div className={styles.lessonDate}><b>{formatSchoolDate(item.lesson_date,{short:true})}</b><small>{formatSchoolDate(item.lesson_date,{weekday:true}).split(',')[0]}</small>{isToday&&<em>Сегодня</em>}</div>
          <div className={styles.lessonMain}><span className={styles.workChip}>{meta.icon} {meta.label}</span><h3>{item.topic||'Тема будет указана учителем'}</h3>{item.homework_id?<p><b>ДЗ:</b> {item.homework_title}</p>:<p className={styles.muted}>Домашнее задание не задано</p>}</div>
          <div className={styles.lessonResult}>{absent?<span className={styles.absentMark}>н</span>:item.grade?<span className={`${styles.gradeMark} ${styles[`grade${item.grade}`]} ${styles[`grade${item.assessment_type||'LESSON'}`]||''}`}>{item.grade}</span>:<span className={styles.noGrade}>—</span>}<small>{absent?'не был':item.grade?'оценка':'без оценки'}</small></div>
          <div className={styles.lessonStatus}>{item.homework_id?(item.homework_exempt?<span className={styles.neutral}>Освобождён</span>:item.homework_status==='DONE'?<span className={styles.done}>✓ Выполнено</span>:<button onClick={()=>setDone(item)}>Отметить выполненным</button>):<span className={styles.muted}>—</span>}</div>
        </article>
      })}</div>
    </section>
  </div>
}

function StudentRating({grade,xp}){
  const [scope,setScope]=useState('class'),[data,setData]=useState(null)
  useEffect(()=>{let live=true;api(`/api/student/rankings?scope=${scope}`).then(x=>live&&setData(x)).catch(()=>live&&setData(null));return()=>{live=false}},[scope])
  const fallback=demoNames.map((name,i)=>({id:`d${i}`,nickname:name,class_name:i<4?`${grade}Б`:`${grade}А`,grade,xp:i===0?Math.max(xp,2840):2700-i*190,rank:i+1,isCurrent:i===0}))
  const rows=data?.entries?.length?data.entries:fallback,current=rows.find(x=>x.isCurrent)||rows[0]
  return <div className={styles.ratingShell}><div className={styles.ratingScope}><button className={scope==='class'?styles.active:''} onClick={()=>setScope('class')}>Мой класс</button><button className={scope==='grade'?styles.active:''} onClick={()=>setScope('grade')}>Параллель</button><button className={scope==='school'?styles.active:''} onClick={()=>setScope('school')}>Школа</button></div><div className={styles.ratingGrid}><div>{rows.map(row=><div className={`${styles.ratingRow} ${row.isCurrent?styles.current:''}`} key={row.id}><span>{row.rank}</span><strong>{row.nickname||'Ученик Genius'}{row.isCurrent&&<small>Это ты</small>}</strong><em>{row.class_name}</em><b>{row.xp} XP</b></div>)}</div><aside><span>Твоё место</span><strong>{current?.rank||'—'}</strong><b>{current?.xp??xp} XP</b><p>Только подтверждённый сервером XP.</p></aside></div></div>
}

function demoAcademic(classId){
  const option=classOptions.find(x=>x[0]===classId)||classOptions[1],dates=generateLessonDates()
  const students=demoNames.map((nickname,i)=>({id:`student-${i}`,nickname,current_grade:option[2]}))
  const lessons=dates.map((date,index)=>({id:`lesson-${date}`,lesson_date:date,topic:index%4===0?'Повторение':index%4===1?'Механическое движение':index%4===2?'Тепловые явления':'Электрический ток',status:'PLANNED',assessment_type:index%7===3?'TEST':index%5===2?'INDEPENDENT':'LESSON'}))
  const grades=students.flatMap((s,si)=>lessons.slice(0,8).filter((_,li)=>(si+li)%2===0).map((l,li)=>({student_id:s.id,lesson_id:l.id,value:3+(si+li)%3,kind:'LESSON'})))
  const attendance=[{student_id:students[3].id,lesson_id:lessons[2].id,status:'ABSENT'},{student_id:students[6].id,lesson_id:lessons[4].id,status:'ABSENT'}]
  return {class:{id:option[0],title:option[1],grade:option[2]},students,lessons,grades,attendance,homework:[],overrides:[]}
}

export function TeacherAcademic(){
  const [classId,setClassId]=useState('class_8B'),[data,setData]=useState(()=>demoAcademic('class_8B')),[selectedLesson,setSelectedLesson]=useState(''),[studentId,setStudentId]=useState(''),[title,setTitle]=useState(''),[description,setDescription]=useState(''),[message,setMessage]=useState('')
  const tableScrollRef=useRef(null)
  useEffect(()=>{setData(demoAcademic(classId));api(`/api/teacher/academic?classId=${classId}`).then(x=>setData({...x,attendance:x.attendance||[]})).catch(()=>{})},[classId])
  useEffect(()=>{
    if(!data.lessons.length||(selectedLesson&&data.lessons.some(l=>l.id===selectedLesson)))return
    const today=todayIso(),soon=SCHOOL_BREAKS.find(item=>item.start>=today&&Date.parse(item.start)-Date.parse(today)<45*86400000)
    const target=soon?.start||today
    setSelectedLesson([...data.lessons].filter(l=>l.lesson_date<=target).at(-1)?.id||data.lessons[0].id)
  },[data,selectedLesson])
  useEffect(()=>{
    if(!selectedLesson)return
    const frame=requestAnimationFrame(()=>{
      const wrap=tableScrollRef.current,lesson=data.lessons.find(l=>l.id===selectedLesson)
      const header=lesson&&wrap?.querySelector(`[data-lesson-date="${lesson.lesson_date}"]`)
      if(wrap&&header)wrap.scrollLeft=Math.max(0,header.offsetLeft-270)
    })
    return()=>cancelAnimationFrame(frame)
  },[selectedLesson,data.lessons])
  const lessons=[...data.lessons].sort((a,b)=>a.lesson_date.localeCompare(b.lesson_date))
  const timeline=[]
  lessons.forEach((lesson,index)=>{
    if(index){
      const previous=lessons[index-1].lesson_date
      SCHOOL_BREAKS.filter(item=>item.start>previous&&item.end<lesson.lesson_date).forEach(item=>{
        const cursor=new Date(`${item.start}T12:00:00Z`)
        while(cursor.toISOString().slice(0,10)<=item.end){
          timeline.push({kind:'break',date:cursor.toISOString().slice(0,10),break:item})
          cursor.setUTCDate(cursor.getUTCDate()+1)
        }
      })
    }
    timeline.push({kind:'lesson',date:lesson.lesson_date,lesson})
  })
  const selected=data.lessons.find(l=>l.id===selectedLesson)
  const metrics=useMemo(()=>{
    const values=data.grades.map(g=>Number(g.value)).filter(Boolean),avg=values.length?(values.reduce((a,b)=>a+b,0)/values.length).toFixed(1):'—'
    const byStudent=data.students.map(s=>{const gs=data.grades.filter(g=>g.student_id===s.id).map(g=>Number(g.value)).filter(Boolean);return {...s,avg:gs.length?gs.reduce((a,b)=>a+b,0)/gs.length:0}})
    return {avg,absent:(data.attendance||[]).filter(x=>x.status==='ABSENT').length,top:[...byStudent].sort((a,b)=>b.avg-a.avg).slice(0,3),support:byStudent.filter(x=>x.avg&&x.avg<3.8).slice(0,3)}
  },[data])

  async function setMark(student,lesson,raw){
    if(raw==='N'){
      setData(current=>({...current,grades:current.grades.filter(g=>!(g.student_id===student&&g.lesson_id===lesson)),attendance:[...(current.attendance||[]).filter(a=>!(a.student_id===student&&a.lesson_id===lesson)),{student_id:student,lesson_id:lesson,status:'ABSENT'}]}))
      try{await api('/api/teacher/attendance',{method:'POST',body:JSON.stringify({studentId:student,lessonId:lesson,status:'ABSENT'})});setMessage('Отсутствие отмечено. «н» не влияет на средний балл.')}catch{setMessage('«н» сохранено в демонстрационном режиме.')}
      return
    }
    if(!raw)return
    const value=Number(raw)
    setData(current=>({...current,attendance:(current.attendance||[]).filter(a=>!(a.student_id===student&&a.lesson_id===lesson)),grades:[...current.grades.filter(g=>!(g.student_id===student&&g.lesson_id===lesson&&g.kind==='LESSON')),{student_id:student,lesson_id:lesson,value,kind:'LESSON'}]}))
    try{await api('/api/teacher/attendance',{method:'POST',body:JSON.stringify({studentId:student,lessonId:lesson,status:'PRESENT'})}).catch(()=>{});await api('/api/teacher/grades',{method:'POST',body:JSON.stringify({studentId:student,lessonId:lesson,value,kind:'LESSON'})});setMessage('Оценка сохранена.')}catch{setMessage('Оценка сохранена в демонстрационном режиме.')}
  }
  async function setAssessmentType(value){
    if(!selectedLesson)return
    setData(current=>({...current,lessons:current.lessons.map(l=>l.id===selectedLesson?{...l,assessment_type:value}:l)}))
    try{await api('/api/teacher/lesson-assessment',{method:'POST',body:JSON.stringify({lessonId:selectedLesson,assessmentType:value})});setMessage('Тип работы сохранён.')}catch{setMessage('Тип работы изменён в демонстрационном режиме.')}
  }
  async function saveHomework(){
    if(!selectedLesson||!title.trim())return setMessage('Выберите урок и укажите домашнее задание.')
    try{const result=await api('/api/teacher/homework',{method:'POST',body:JSON.stringify({classId,lessonId:selectedLesson,title,description})});if(studentId)await api(`/api/teacher/homework/${result.homework.id}/override`,{method:'POST',body:JSON.stringify({studentId,title,description})});setMessage(studentId?'Индивидуальное ДЗ сохранено.':'ДЗ назначено всему классу.')}catch{setMessage(studentId?'Индивидуальное ДЗ сохранено в демонстрационном режиме.':'ДЗ классу сохранено в демонстрационном режиме.')}
  }

  return <div className={styles.teacherPage}>
    <section className={styles.teacherMetrics}><article><span>Средняя оценка</span><strong>{metrics.avg}</strong><small>по классу</small></article><article><span>Учеников</span><strong>{data.students.length}</strong><small>в журнале</small></article><article><span>Пропуски</span><strong>{metrics.absent}</strong><small>отметок «н»</small></article><article><span>Предмет</span><strong>Физика</strong><small>текущий курс</small></article></section>

    <div className={styles.teacherGrid}>
      <section className={styles.gradebookCard}>
        <div className={styles.gradebookHead}><div><h2>Журнал класса</h2><p>«н» — ученик отсутствовал; в средний балл не входит.</p></div><div className={styles.lessonEditor}><select aria-label="Дата урока" value={selectedLesson} onChange={e=>setSelectedLesson(e.target.value)}>{data.lessons.map(l=><option key={l.id} value={l.id}>{formatSchoolDate(l.lesson_date,{short:true})}</option>)}</select><select aria-label="Тип работы" value={selected?.assessment_type||'LESSON'} onChange={e=>setAssessmentType(e.target.value)}><option value="LESSON">Работа на уроке</option><option value="INDEPENDENT">Самостоятельная</option><option value="TEST">Контрольная</option><option value="HOMEWORK">Домашняя</option></select><select aria-label="Класс" value={classId} onChange={e=>{setClassId(e.target.value);setSelectedLesson('')}}>{classOptions.map(c=><option value={c[0]} key={c[0]}>{c[1]}</option>)}</select></div></div>
        <div className={styles.gradebookWrap} ref={tableScrollRef}><table><thead><tr className={styles.breakBands}><th aria-hidden="true"/>{timeline.map((entry,index)=>entry.kind==='break'?(index===0||timeline[index-1]?.break?.id!==entry.break.id?<th key={entry.break.id} colSpan={timeline.filter(x=>x.break?.id===entry.break.id).length} className={styles.breakBand}>🍂 {entry.break.title}</th>:null):<th key={entry.lesson.id} aria-hidden="true"/>)}<th aria-hidden="true"/></tr><tr><th>Фамилия и имя</th>{timeline.map(entry=>entry.kind==='break'?<th key={entry.date} className={styles.holidayHead}><b>{formatSchoolDate(entry.date,{short:true})}</b><small>{formatSchoolDate(entry.date,{weekday:true}).split(',')[0]}</small></th>:(()=>{const l=entry.lesson,meta=workType(l.assessment_type);return <th key={l.id} data-lesson-date={l.lesson_date} className={styles[`head${l.assessment_type||'LESSON'}`]}><b>{formatSchoolDate(l.lesson_date,{short:true})}</b><small>{meta.short}</small></th>})())}<th>Средняя</th></tr></thead><tbody>{data.students.map(s=>{const own=data.grades.filter(g=>g.student_id===s.id).map(g=>Number(g.value)).filter(Boolean),avg=own.length?(own.reduce((a,b)=>a+b,0)/own.length).toFixed(1):'—';return <tr key={s.id}><td><span className={styles.studentAvatar}>{(s.nickname||'?').slice(0,1)}</span><b>{s.nickname||'Ученик'}</b></td>{timeline.map(entry=>{if(entry.kind==='break')return <td key={entry.date} className={styles.holidayCell} title={entry.break.title}>🍂</td>;const l=entry.lesson,absent=(data.attendance||[]).some(a=>a.student_id===s.id&&a.lesson_id===l.id&&a.status==='ABSENT'),value=data.grades.find(g=>g.student_id===s.id&&g.lesson_id===l.id&&g.kind==='LESSON')?.value,cell=absent?'N':value||'';return <td key={l.id}><select className={`${styles.markSelect} ${absent?styles.markAbsent:''} ${value?styles[`mark${l.assessment_type||'LESSON'}`]:''}`} aria-label={`Оценка ${s.nickname} ${l.lesson_date}`} value={cell} onChange={e=>setMark(s.id,l.id,e.target.value)}><option value="">—</option><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="N">н</option></select></td>})}<td><strong>{avg}</strong></td></tr>})}</tbody></table></div>
      </section>

      <aside className={styles.classAnalytics}><h2>Аналитика класса</h2><div><h3>🏆 Лучшие результаты</h3>{metrics.top.map((s,i)=><p key={s.id}><span>{i+1}</span><b>{s.nickname}</b><em>{s.avg?s.avg.toFixed(1):'—'}</em></p>)}</div><div><h3>△ Нужна поддержка</h3>{metrics.support.length?metrics.support.map(s=><p key={s.id}><span>!</span><b>{s.nickname}</b><em>{s.avg.toFixed(1)}</em></p>):<small>Сейчас нет учеников в зоне внимания.</small>}</div><div className={styles.workLegend}><h3>Типы работ</h3><span className={styles.kindLesson}>✦ Урок</span><span className={styles.kindIndependent}>◇ Самостоятельная</span><span className={styles.kindTest}>★ Контрольная</span></div></aside>
    </div>

    <section className={styles.homeworkEditor}><div><h2>Назначить домашнее задание</h2><p>Обычное или индивидуальное.</p></div><label>Урок<select value={selectedLesson} onChange={e=>setSelectedLesson(e.target.value)}>{data.lessons.map(l=><option key={l.id} value={l.id}>{formatSchoolDate(l.lesson_date,{weekday:true})}</option>)}</select></label><label>Кому<select value={studentId} onChange={e=>setStudentId(e.target.value)}><option value="">Всему классу</option>{data.students.map(s=><option key={s.id} value={s.id}>{s.nickname||s.id}</option>)}</select></label><label>Кратко<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Например: задачи §12"/></label><label>Описание<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Номера упражнений и пояснение"/></label><button onClick={saveHomework}>Сохранить ДЗ</button></section>
    {message&&<p className={styles.notice} role="status">{message}</p>}
  </div>
}

export function LabsPlaceholder(){return <div className={styles.placeholder}><span>⚗</span><h2>Лабораторные работы</h2><p>Раздел подготовлен для следующего этапа Genius.</p></div>}
