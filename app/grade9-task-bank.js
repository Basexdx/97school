'use client'

import {useEffect,useMemo,useState} from 'react'
import {checkAnswer} from '../shared/task-checker.mjs'
import {bankIdentity,bankAttempts,saveBankAttempt,syncBankAttempts} from './task-store'
import {useTaskViews} from './task-views'
import styles from './grade7-task-bank.module.css'

const difficultyLabels={БАЗОВЫЙ:'Базовый',ПОВЫШЕННЫЙ:'Повышенный',ВЫСОКИЙ:'Высокий'}
const typeLabels={numeric:'Числовой ответ',calculation:'Расчётная',experiment:'Эксперимент',qualitative:'Качественная',graph:'Расчёт + график'}
const POSITION_KEY='genius:task-bank-position:grade9:v1'
const xpForAttempt=(max,count)=>count===0?max:count===1?Math.floor(max*.7):count===2?Math.floor(max*.4):Math.floor(max*.2)
const answerState=a=>a?.status==='CONFIRMED'?a.result?.correct:a?.localResult?.correct

export default function Grade9TaskBank({onXp=()=>{}}){
  const [bank,setBank]=useState(null),[index,setIndex]=useState(null),[student,setStudent]=useState(null),[attempts,setAttempts]=useState([])
  const [taskId,setTaskId]=useState(null),[paragraph,setParagraph]=useState(''),[difficulty,setDifficulty]=useState(''),[type,setType]=useState(''),[query,setQuery]=useState(''),[message,setMessage]=useState(''),[restoreTaskId,setRestoreTaskId]=useState('')
  const {viewed,markViewed}=useTaskViews(student?.id)

  async function reloadAttempts(owner){setAttempts(await bankAttempts(owner))}
  useEffect(()=>{let live=true;try{const saved=JSON.parse(sessionStorage.getItem(POSITION_KEY)||'null');if(saved){setParagraph(saved.paragraph||'');setDifficulty(saved.difficulty||'');setType(saved.type||'');setQuery(saved.query||'');setRestoreTaskId(saved.taskId||'')}}catch{};(async()=>{try{
    const [b,i]=await Promise.all([fetch('/task-bank/grade9.json',{cache:'no-store'}),fetch('/task-bank/index-grade9.json',{cache:'no-store'})])
    if(!b.ok||!i.ok)throw Error('Банк 9 класса ещё не подготовлен. Перезапустите Genius после обновления.')
    const [bankData,indexData]=await Promise.all([b.json(),i.json()]);if(!live)return;setBank(bankData);setIndex(indexData)
    let identity=null;try{identity=await bankIdentity()}catch{};if(!live)return;setStudent(identity);await reloadAttempts(identity?.id)
  }catch(e){if(live)setMessage(e.message)}})();return()=>{live=false}},[])

  const gradeAttempts=useMemo(()=>attempts.filter(a=>String(a.taskId||'').startsWith('genius-peryshkin9-')),[attempts])
  const taskStates=useMemo(()=>{const m={};for(const a of gradeAttempts){const s=m[a.taskId]||{count:0,solved:false};s.count++;if(answerState(a)===true)s.solved=true;m[a.taskId]=s}return m},[gradeAttempts])
  const filtered=useMemo(()=>{const q=query.trim().toLocaleLowerCase('ru-RU');return (index?.tasks||[]).filter(t=>(!paragraph||t.paragraph===Number(paragraph))&&(!difficulty||t.difficulty===difficulty)&&(!type||t.type===type)&&(!q||`${t.bookNumber} ${t.topic}`.toLocaleLowerCase('ru-RU').includes(q)))},[index,paragraph,difficulty,type,query])
  const current=taskId&&bank?.tasks.find(t=>t.ID===taskId)
  const nav=filtered.length?filtered:index?.tasks||[]
  const navPos=current?nav.findIndex(t=>t.id===current.ID):-1

  useEffect(()=>{if(current||!index||!restoreTaskId)return;const frame=requestAnimationFrame(()=>requestAnimationFrame(()=>document.getElementById(`grade9-task-${restoreTaskId}`)?.scrollIntoView({block:'center',behavior:'auto'})));return()=>cancelAnimationFrame(frame)},[current,index,filtered.length,restoreTaskId])
  function rememberPosition(id){setRestoreTaskId(id);try{sessionStorage.setItem(POSITION_KEY,JSON.stringify({taskId:id,paragraph,difficulty,type,query}))}catch{}}
  function openTask(id){markViewed(id);rememberPosition(id);setTaskId(id)}
  function backToBank(){rememberPosition(current?.ID||restoreTaskId);setTaskId(null)}
  async function submit(task,answer){const checked=checkAnswer(task,answer);await saveBankAttempt(student?.id,task,answer,checked);await reloadAttempts(student?.id);if(student&&navigator.onLine){try{const sync=await syncBankAttempts();if(Number.isFinite(sync.totalXp))onXp(sync.totalXp);await reloadAttempts(student.id)}catch(e){setMessage(e.message)}}return checked}

  if(current)return <Grade9TaskCard key={current.ID} task={current} submit={submit} attempts={gradeAttempts.filter(a=>a.taskId===current.ID)} back={backToBank} previousId={navPos>0?nav[navPos-1].id:null} nextId={navPos>=0&&navPos<nav.length-1?nav[navPos+1].id:null} navigate={openTask} position={navPos+1} total={nav.length} student={student}/>
  const solved=Object.values(taskStates).filter(s=>s.solved).length
  return <div className={styles.page}>
    <section className={styles.hero}><div><div className={styles.kicker}>GENIUS · ФИЗИКА · 9 КЛАСС</div><h1>Задачи Перышкина</h1><p>Кинематика и колебания: расчётные задачи из сборника Перышкина с проверкой числовых ответов.</p><div className={styles.heroPills}><span>{index?.tasks.length||'…'} задач</span><span>кинематика</span><span>колебания</span><span>XP по попыткам</span></div></div><div className={styles.atom} aria-hidden="true"><i/><i/><i/><b/></div></section>
    {message&&<div className={styles.notice}>{message}</div>}
    <section className={styles.stats}><article><small>Отобрано</small><strong>{index?.tasks.length||'…'}</strong><span>задач</span></article><article><small>Решено</small><strong>{solved}</strong><span>задач</span></article><article><small>Попытки</small><strong>{gradeAttempts.length}</strong><span>в этом классе</span></article><article><small>Источник</small><strong>9</strong><span>класс</span></article></section>
    <div className={styles.filterDock}><section className={styles.filters}>
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Найти номер или тему" aria-label="Поиск"/>
      <select value={paragraph} onChange={e=>setParagraph(e.target.value)}><option value="">Все темы</option>{(index?.paragraphs||[]).map(p=><option key={p.paragraph} value={p.paragraph}>§{p.paragraph}. {p.title}</option>)}</select>
      <select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="">Любая сложность</option>{Object.entries(difficultyLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
      <select value={type} onChange={e=>setType(e.target.value)}><option value="">Все типы</option>{[...new Set((index?.tasks||[]).map(t=>t.type))].map(k=><option key={k} value={k}>{typeLabels[k]||k}</option>)}</select>
      <button onClick={()=>{setParagraph('');setDifficulty('');setType('');setQuery('')}}>Сбросить</button>
    </section></div>
    <div className={styles.summary}><span><b>{filtered.length}</b> задач</span><span>1-я попытка — полный XP · 2-я — 70% · 3-я — 40% · далее — 20%</span></div>
    <section className={styles.grid}>{filtered.map(item=>{const state=taskStates[item.id]||{count:0,solved:false};const next=xpForAttempt(item.xp,state.count);return <button id={`grade9-task-${item.id}`} key={item.id} className={`${styles.tile} ${state.solved?styles.solved:''} ${viewed.has(item.id)?styles.viewed:''} ${restoreTaskId===item.id?styles.lastOpened:''}`} onClick={()=>openTask(item.id)}><div className={styles.tileTop}><span>Задача {item.bookNumber}</span><span>{state.solved?'✓':`${next} XP`}</span></div><h2>{item.topic}</h2><p>{typeLabels[item.type]||item.type} · {difficultyLabels[item.difficulty]}</p><footer><span>{state.solved?'Решено':viewed.has(item.id)?'Просмотрено':state.count?`${state.count} попыт.`:'Новая'}</span><b>{state.solved?'Решено':'Открыть →'}</b></footer></button>})}</section>
  </div>
}

function Grade9TaskCard({task,submit,attempts,back,previousId,nextId,navigate,position,total,student}){
  const [answer,setAnswer]=useState(()=>emptyAnswer(task.ANSWER)),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const solved=attempts.some(a=>answerState(a)===true),attemptNo=attempts.length+1,nextXp=solved?0:xpForAttempt(task.XP,attempts.length)
  useEffect(()=>{setAnswer(emptyAnswer(task.ANSWER));setResult(null);setError('')},[task.ID])
  async function check(e){e.preventDefault();setBusy(true);setError('');try{setResult(await submit(task,answer))}catch(err){setError(err.message)}finally{setBusy(false)}}
  return <article className={styles.detail}>
    <nav className={styles.topNav}><button onClick={back}>← К задачам</button><span>{position} / {total}</span><div><button disabled={!previousId} onClick={()=>previousId&&navigate(previousId)}>←</button><button disabled={!nextId} onClick={()=>nextId&&navigate(nextId)}>→</button></div></nav>
    <header className={styles.taskHead}><div><div className={styles.kicker}>9 КЛАСС · СБОРНИК ПЕРЫШКИНА</div><h1>Задача {task.BOOK_TASK_NUMBER}</h1><div className={styles.taskPills}><span>§{task.PARAGRAPH}</span><span>{difficultyLabels[task.DIFFICULTY]}</span><span>{typeLabels[task.TASK_TYPE]||task.TASK_TYPE}</span></div></div><div className={styles.xpCard}><small>{solved?'Статус':'За правильный ответ сейчас'}</small><strong>{solved?'✓':`${nextXp} XP`}</strong><span>{solved?'решено':`попытка №${attemptNo}`}</span></div></header>
    <section className={styles.question}><div className={styles.questionLabel}><span>01</span><h2>Условие</h2></div><p className={styles.taskText}>{task.TASK}</p>{task.GRAPH_REQUIRED&&<div className={styles.notice}>В этой задаче график строится отдельно по условию сборника; числовые величины можно проверить в полях ниже.</div>}<form onSubmit={check}><AnswerFields task={task} value={answer} onChange={setAnswer}/><button className={styles.primary} disabled={busy||!answerReady(task.ANSWER,answer)}>{busy?'Сохраняю…':task.ANSWER.mode==='manual'?'Сохранить ответ':'Проверить ответ'}</button></form>{error&&<div className={styles.error}>{error}</div>}{result&&<div className={`${styles.feedback} ${result.reviewRequired?'':result.correct?styles.right:styles.wrong}`}><strong>{result.reviewRequired?'Ответ сохранён':result.correct?'Верно!':'Пока неверно'}</strong><p>{result.reviewRequired?'Задание требует проверки учителем.':result.correct?(student?'Попытка сохранена. Сервер начислит XP по номеру попытки.':'Ответ верный. В гостевом режиме результат хранится локально.'):'Можно пробовать ещё.'}</p></div>}</section>
    <footer className={styles.bottomNav}><button disabled={!previousId} onClick={()=>previousId&&navigate(previousId)}>← Предыдущая</button><span>Задача {task.BOOK_TASK_NUMBER}</span><button disabled={!nextId} onClick={()=>nextId&&navigate(nextId)}>Следующая →</button></footer>
  </article>
}

function emptyAnswer(spec){if(spec.mode==='numeric_list')return (spec.fields||spec.values||[]).map(()=> '');return ''}
function answerReady(spec,value){if(spec.mode==='numeric_list')return value.every(v=>String(v).trim());return String(value).trim().length>0}
function AnswerFields({task,value,onChange}){
  const spec=task.ANSWER
  if(spec.mode==='manual')return <label className={styles.answerBox}><span>{task.ANSWER_PROMPT||'Введите ответ'}</span><textarea rows="5" value={value} onChange={e=>onChange(e.target.value)} placeholder="Краткий ответ"/></label>
  if(spec.mode==='numeric_list')return <div className={styles.multiFields}>{spec.fields.map((f,i)=><label key={i}><span>{f.label}</span><div><input inputMode="decimal" value={value?.[i]??''} onChange={e=>{const a=[...value];a[i]=e.target.value;onChange(a)}}/><em>{f.unit}</em></div></label>)}</div>
  return <label className={styles.answerBox}><span>{task.ANSWER_PROMPT||'Введите ответ'}</span><div><input inputMode="decimal" value={value} onChange={e=>onChange(e.target.value)} placeholder="Ответ"/><em>{spec.unit}</em></div></label>
}
