'use client'

import {useEffect,useState} from 'react'

function answerLabel(answer){
  if(!answer||answer.mode==='manual')return 'Ответ не задан: требуется проверка учителем.'
  if(Array.isArray(answer.values))return answer.values.join(', ')
  if(answer.value!=null)return String(answer.value)
  return 'Ключ ответа доступен только для автоматической проверки.'
}

export default function TeacherTaskBank({onBack,onHome}){
  const [grade,setGrade]=useState(8),[query,setQuery]=useState(''),[page,setPage]=useState(0)
  const [catalog,setCatalog]=useState(null),[detail,setDetail]=useState(null),[selected,setSelected]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  useEffect(()=>{let active=true;const timer=setTimeout(()=>{
    fetch(`/api/teacher/tasks?grade=${grade}&page=${page}&q=${encodeURIComponent(query)}`,{credentials:'same-origin'})
      .then(r=>r.ok?r.json():Promise.reject(Error(`Не удалось загрузить задачи (${r.status})`)))
      .then(data=>{if(active){setCatalog(data);setError('')}})
      .catch(e=>{if(active)setError(e.message)})
  },200);return()=>{active=false;clearTimeout(timer)}},[grade,query,page])
  async function open(id){setSelected(id);setDetail(null);setBusy(true);setError('');try{
    const response=await fetch(`/api/teacher/tasks/${encodeURIComponent(id)}`,{credentials:'same-origin'})
    if(!response.ok)throw Error(`Не удалось открыть задачу (${response.status})`)
    setDetail(await response.json())
  }catch(e){setError(e.message)}finally{setBusy(false)}}
  return <section className="teacher-task-bank">
    <header className="teacher-head unified-section-header"><div className="unified-section-title"><h1>Банк задач</h1><p>Ответы и результаты учеников по каждой задаче.</p></div><nav aria-label="Навигация по разделам"><button type="button" onClick={onBack}>← Назад</button><button type="button" onClick={onHome}>⌂ Домой</button></nav></header>
    <div className="teacher-task-controls"><label>Класс<select value={grade} onChange={e=>{setGrade(Number(e.target.value));setPage(0);setDetail(null)}}>{[7,8,9].map(x=><option key={x} value={x}>{x} класс</option>)}</select></label><label>Поиск<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);setDetail(null)}} placeholder="Номер, тема или текст"/></label></div>
    {error&&<p role="alert" className="bank-note">{error}</p>}
    <div className="teacher-task-layout"><div className="teacher-task-list" aria-label="Задачи">{catalog?.tasks.map(t=><button key={t.id} className={selected===t.id?'active':''} onClick={()=>open(t.id)}><small>№ {t.number||'—'} · {t.grade} класс · {t.xp} XP</small><strong>{t.topic}</strong><span>{t.preview}</span></button>)}{catalog&&!catalog.tasks.length&&<p>По запросу задач нет.</p>}<nav className="teacher-task-pages"><button disabled={!page} onClick={()=>setPage(page-1)}>← Назад</button><span>{catalog?`${page+1} / ${Math.max(1,Math.ceil(catalog.total/40))}`:'…'}</span><button disabled={!catalog||page+1>=Math.ceil(catalog.total/40)} onClick={()=>setPage(page+1)}>Далее →</button></nav></div>
    <article className="teacher-task-detail" aria-live="polite">{busy?<p>Загружаю задачу…</p>:detail?<><small>№ {detail.task.BOOK_TASK_NUMBER||'—'} · {detail.task.CLASS} класс · {detail.task.XP} XP</small><h2>{detail.task.TOPIC}</h2><p className="teacher-task-question">{detail.task.TASK}</p><div className="teacher-task-answer"><b>Ответ</b><p>{answerLabel(detail.task.ANSWER)}{detail.task.ANSWER?.unit&&detail.task.ANSWER.mode!=='manual'?` ${detail.task.ANSWER.unit}`:''}</p></div><h3>Решили задачу · {detail.students.length}</h3>{detail.students.length?<ul>{detail.students.map(s=><li key={s.id}><span>{s.nickname||'Ученик'} · {s.className}</span><strong>+{s.xp} XP</strong></li>)}</ul>:<p>Пока никто не решил эту задачу с подтверждённым результатом.</p>}</>:<p>Выберите задачу, чтобы увидеть ответ и результат учеников.</p>}</article></div>
  </section>
}
