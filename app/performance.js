'use client'

import {useEffect,useMemo,useState} from 'react'
import {formatSchoolDate,generateLessonDates,tomorrowIso} from '../shared/academic-calendar.mjs'

const demoNames=['Алексей','Катя','Максим','Лиза','Никита','София','Илья','Полина']
const classOptions=[['class_7A','7А',7],['class_8B','8Б',8],['class_9A','9А',9],['class_9B','9Б',9]]

function demoPerformance(grade=8){
  const dates=generateLessonDates(),tomorrow=tomorrowIso()
  const lessons=dates.map((date,index)=>({
    lesson_id:`demo-${date}`,lesson_date:date,lesson_status:date<new Date().toISOString().slice(0,10)?'COMPLETED':'PLANNED',
    topic:index%4===0?'Повторение и решение задач':null,
    grade:index<6&&index%2===0?[5,4,5][index/2]:null,grade_kind:'LESSON',
    homework_id:index>2&&index<10?`hw-${index}`:null,
    homework_title:index>2&&index<10?`Задачи §${index+1}`:null,
    homework_description:index>2&&index<10?`Решить упражнения ${index*2+1}–${index*2+4}, повторить определения.`:null,
    homework_due_date:date,homework_status:index<5?'DONE':'NOT_STARTED',homework_personal:index===7?1:0,homework_exempt:0,
  }))
  const nextLesson=lessons.find(x=>x.lesson_date>=new Date().toISOString().slice(0,10)&&x.homework_id)
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
  return <div className="performance-page">
    <div className="section-head"><div><h1>Успеваемость</h1><p className="subtle">Оценки, домашние задания и место в рейтинге.</p></div></div>
    <div className="performance-tabs"><button className={tab==='diary'?'active':''} onClick={()=>setTab('diary')}>Дневник</button><button className={tab==='rating'?'active':''} onClick={()=>setTab('rating')}>Рейтинг</button></div>
    {tab==='diary'?<StudentDiary grade={grade}/>:<StudentRating grade={grade} xp={xp}/>}
  </div>
}

function StudentDiary({grade}){
  const [data,setData]=useState(()=>demoPerformance(grade)),[notice,setNotice]=useState(''),[showAll,setShowAll]=useState(false)
  useEffect(()=>{let live=true;api('/api/student/performance').then(x=>live&&setData(x)).catch(()=>{});return()=>{live=false}},[grade])
  const today=new Date().toISOString().slice(0,10)
  const visible=useMemo(()=>{
    if(showAll)return data.lessons
    const past=data.lessons.filter(x=>x.lesson_date<today).slice(-8),future=data.lessons.filter(x=>x.lesson_date>=today).slice(0,10)
    return [...past,...future]
  },[data,showAll,today])
  const grades=data.lessons.map(x=>Number(x.grade)).filter(Boolean)
  const average=grades.length?(grades.reduce((a,b)=>a+b,0)/grades.length).toFixed(2):'—'
  const pending=data.lessons.filter(x=>x.homework_id&&x.homework_status!=='DONE'&&!x.homework_exempt).length

  useEffect(()=>{if(typeof Notification==='undefined'||Notification.permission!=='granted'||!data.reminders.length)return;showReminder(data.reminders[0])},[data.reminders])
  async function enableNotifications(){
    if(typeof Notification==='undefined'){setNotice('Системные уведомления не поддерживаются этим браузером. Напоминание останется внутри Genius.');return}
    const permission=await Notification.requestPermission()
    if(permission==='granted'){setNotice('Напоминания включены. Genius предупредит за день до урока.');if(data.reminders[0])await showReminder(data.reminders[0])}
    else setNotice('Разрешение не выдано. Напоминания будут видны внутри приложения.')
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
  return <>
    {data.reminders.length>0&&<div className="homework-reminder"><span>🔔</span><div><strong>Завтра урок</strong><p>{data.reminders[0].message}</p></div><button onClick={enableNotifications}>Включить уведомления</button></div>}
    {notice&&<p className="performance-note" role="status">{notice}</p>}
    <div className="diary-summary"><article><span>Средний балл</span><strong>{average}</strong></article><article><span>Оценок</span><strong>{grades.length}</strong></article><article><span>Невыполненных ДЗ</span><strong>{pending}</strong></article><article><span>Расписание</span><strong>Вт · Пт</strong></article></div>
    <section className="diary-card">
      <div className="diary-card-head"><div><h2>Дневник {data.student?.className||`${grade} класс`}</h2><p>2026–2027 учебный год · каникулы исключены</p></div><button onClick={()=>setShowAll(!showAll)}>{showAll?'Показать ближайшие':'Весь учебный год'}</button></div>
      <div className="diary-table-wrap"><table className="diary-table"><thead><tr><th>Дата</th><th>Тема</th><th>Оценка</th><th>Домашнее задание</th><th>Статус</th></tr></thead><tbody>{visible.map(item=><tr key={item.lesson_id} className={item.lesson_date===today?'today':''}><td><b>{formatSchoolDate(item.lesson_date,{short:true,weekday:true})}</b></td><td>{item.topic||<span className="muted">Будет указана учителем</span>}</td><td>{item.grade?<span className={`grade-badge grade-${item.grade}`}>{item.grade}</span>:<span className="muted">—</span>}</td><td>{item.homework_id?<><strong>{item.homework_title}</strong><small>{item.homework_description}</small>{item.homework_personal? <em>Индивидуальное</em>:null}</>:<span className="muted">Не задано</span>}</td><td>{item.homework_id?(item.homework_exempt?<span className="status-neutral">Освобождён</span>:item.homework_status==='DONE'?<span className="status-done">✓ Выполнено</span>:<button className="mark-done" onClick={()=>setDone(item)}>Отметить выполненным</button>):'—'}</td></tr>)}</tbody></table></div>
    </section>
  </>
}

function StudentRating({grade,xp}){
  const [scope,setScope]=useState('class'),[data,setData]=useState(null)
  useEffect(()=>{let live=true;api(`/api/student/rankings?scope=${scope}`).then(x=>live&&setData(x)).catch(()=>live&&setData(null));return()=>{live=false}},[scope])
  const fallback=demoNames.map((name,i)=>({id:`d${i}`,nickname:name,class_name:i<4?`${grade}Б`:`${grade}А`,grade,xp:i===0?Math.max(xp,2840):2700-i*190,rank:i+1,isCurrent:i===0}))
  const rows=data?.entries?.length?data.entries:fallback
  const current=rows.find(x=>x.isCurrent)||rows[0]
  return <>
    <div className="rating-scope"><button className={scope==='class'?'active':''} onClick={()=>setScope('class')}>Мой класс</button><button className={scope==='grade'?'active':''} onClick={()=>setScope('grade')}>Параллель</button><button className={scope==='school'?'active':''} onClick={()=>setScope('school')}>Школа</button></div>
    <div className="rating-layout"><div className="rating-list">{rows.map(row=><div className={`rating-row ${row.isCurrent?'current':''}`} key={row.id}><span className={`rank rank-${row.rank}`}>{row.rank}</span><span className="mini-avatar">{row.isCurrent?'🧑🏻':'⚛'}</span><strong>{row.nickname||'Ученик Genius'}{row.isCurrent&&<small>Это ты</small>}</strong><span>{row.class_name}</span><b>{row.xp} XP</b></div>)}</div><aside className="my-place"><span>Твоё место</span><div className="profile-bubble">🧑🏻</div><strong>{current?.rank||'—'}</strong><b>{current?.xp??xp} XP</b><p>Рейтинг строится только по подтверждённому сервером XP.</p></aside></div>
  </>
}

function demoAcademic(classId){
  const option=classOptions.find(x=>x[0]===classId)||classOptions[1],dates=generateLessonDates().slice(0,18)
  const students=demoNames.slice(0,6).map((nickname,i)=>({id:`student-${i}`,nickname,current_grade:option[2]}))
  const lessons=dates.map(date=>({id:`lesson-${date}`,lesson_date:date,topic:'',status:'PLANNED'}))
  const grades=students.flatMap((s,si)=>lessons.slice(0,5).filter((_,li)=>(si+li)%3===0).map((l,li)=>({student_id:s.id,lesson_id:l.id,value:3+(si+li)%3,kind:'LESSON'})))
  return {class:{id:option[0],title:option[1],grade:option[2]},students,lessons,grades,homework:[],overrides:[]}
}

export function TeacherAcademic(){
  const [classId,setClassId]=useState('class_8B'),[data,setData]=useState(()=>demoAcademic('class_8B')),[selectedLesson,setSelectedLesson]=useState(''),[studentId,setStudentId]=useState(''),[title,setTitle]=useState(''),[description,setDescription]=useState(''),[message,setMessage]=useState('')
  useEffect(()=>{setData(demoAcademic(classId));api(`/api/teacher/academic?classId=${classId}`).then(setData).catch(()=>{})},[classId])
  useEffect(()=>{if(data.lessons.length&&!selectedLesson)setSelectedLesson(data.lessons[0].id)},[data,selectedLesson])
  const recent=data.lessons.slice(0,12)
  async function grade(student,lesson,value){
    setData(current=>({...current,grades:[...current.grades.filter(x=>!(x.student_id===student&&x.lesson_id===lesson&&x.kind==='LESSON')),{student_id:student,lesson_id:lesson,value,kind:'LESSON'}]}))
    try{await api('/api/teacher/grades',{method:'POST',body:JSON.stringify({studentId:student,lessonId:lesson,value,kind:'LESSON'})});setMessage('Оценка сохранена на сервере.')}catch{setMessage('Оценка сохранена в демонстрационном режиме.')}
  }
  async function saveHomework(){
    if(!selectedLesson||!title.trim())return setMessage('Выберите урок и укажите домашнее задание.')
    try{
      const result=await api('/api/teacher/homework',{method:'POST',body:JSON.stringify({classId,lessonId:selectedLesson,title,description})})
      if(studentId)await api(`/api/teacher/homework/${result.homework.id}/override`,{method:'POST',body:JSON.stringify({studentId,title,description})})
      setMessage(studentId?'Индивидуальное ДЗ сохранено.':'ДЗ назначено всему классу.')
    }catch{setMessage(studentId?'Индивидуальное ДЗ сохранено в демонстрационном режиме.':'ДЗ классу сохранено в демонстрационном режиме.')}
  }
  return <div className="teacher-academic">
    <div className="teacher-head"><div><h1>Дневник и домашние задания</h1><p className="subtle">Уроки по вторникам и пятницам; каникулы уже исключены из календаря.</p></div><select value={classId} onChange={e=>{setClassId(e.target.value);setSelectedLesson('')}}>{classOptions.map(c=><option value={c[0]} key={c[0]}>{c[1]}</option>)}</select></div>
    <div className="teacher-academic-grid"><section className="gradebook-card"><h2>Журнал {data.class.title}</h2><div className="gradebook-wrap"><table><thead><tr><th>Ученик</th>{recent.map(l=><th key={l.id}>{formatSchoolDate(l.lesson_date,{short:true})}</th>)}</tr></thead><tbody>{data.students.map(s=><tr key={s.id}><td>{s.nickname||'Ученик'}</td>{recent.map(l=>{const value=data.grades.find(g=>g.student_id===s.id&&g.lesson_id===l.id&&g.kind==='LESSON')?.value;return <td key={l.id}><select aria-label={`Оценка ${s.nickname} ${l.lesson_date}`} value={value||''} onChange={e=>e.target.value&&grade(s.id,l.id,Number(e.target.value))}><option value="">—</option>{[5,4,3,2].map(x=><option key={x}>{x}</option>)}</select></td>})}</tr>)}</tbody></table></div></section>
      <section className="homework-editor"><h2>Назначить ДЗ</h2><label>Урок<select value={selectedLesson} onChange={e=>setSelectedLesson(e.target.value)}>{data.lessons.map(l=><option key={l.id} value={l.id}>{formatSchoolDate(l.lesson_date,{weekday:true})}</option>)}</select></label><label>Кому<select value={studentId} onChange={e=>setStudentId(e.target.value)}><option value="">Всему классу</option>{data.students.map(s=><option key={s.id} value={s.id}>{s.nickname||s.id}</option>)}</select></label><label>Кратко<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Например: задачи §12"/></label><label>Описание<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Номера упражнений и пояснение"/></label><button className="blue-btn" onClick={saveHomework}>{studentId?'Сохранить индивидуальное ДЗ':'Назначить классу'}</button>{message&&<p role="status">{message}</p>}</section></div>
  </div>
}

export function LabsPlaceholder(){return <div className="labs-page"><div className="section-head"><div><h1>Лабораторные работы</h1><p className="subtle">Практические работы 7–9 классов.</p></div></div><div className="empty-state"><div>⚗</div><h3>Раздел готов к наполнению</h3><p>Здесь появятся инструкции, измерения, таблицы результатов и отчёты лабораторных работ.</p></div></div>}
