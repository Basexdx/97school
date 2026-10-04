'use client'

import BookBankFilters from './book-bank-filters'
import {matchesBookFilters} from '../shared/book-filters.mjs'
import {textbookAnswerFormat} from '../shared/textbook-card.mjs'
import TaskTile from './task-tile'

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

export default function Grade9TaskBank({onXp=()=>{},searchIds=null,clearSearch=()=>{}}){
  const [bank,setBank]=useState(null),[index,setIndex]=useState(null),[student,setStudent]=useState(null),[attempts,setAttempts]=useState([])
  const [taskId,setTaskId]=useState(null),[paragraph,setParagraph]=useState(''),[difficulty,setDifficulty]=useState(''),[type,setType]=useState(''),[query,setQuery]=useState(''),[message,setMessage]=useState(''),[restoreTaskId,setRestoreTaskId]=useState('')
  const [section,setSection]=useState(''),[topic,setTopic]=useState(''),[progress,setProgress]=useState('')
  const {viewed,markViewed}=useTaskViews(student?.id)
  useEffect(()=>{
    setTaskId(null)
  },[searchIds])

  async function reloadAttempts(owner){setAttempts(await bankAttempts(owner))}
  useEffect(()=>{let live=true;try{const saved=JSON.parse(sessionStorage.getItem(POSITION_KEY)||'null');if(saved){setParagraph(saved.paragraph||'');setDifficulty(saved.difficulty||'');setType(saved.type||'');setSection(saved.section||'');setTopic(saved.topic||'');setProgress(saved.progress||'');setRestoreTaskId(saved.taskId||'')}}catch{};(async()=>{try{
    const [b,i]=await Promise.all([fetch('/task-bank/grade9.json',{cache:'no-store'}),fetch('/task-bank/index-grade9.json',{cache:'no-store'})])
    if(!b.ok||!i.ok)throw Error('Банк 9 класса ещё не подготовлен. Перезапустите Genius после обновления.')
    const [bankData,indexData]=await Promise.all([b.json(),i.json()]);if(!live)return;setBank(bankData);setIndex(indexData)
    let identity=null;try{identity=await bankIdentity()}catch{};if(!live)return;setStudent(identity);await reloadAttempts(identity?.id)
  }catch(e){if(live)setMessage(e.message)}})();return()=>{live=false}},[])

  const gradeAttempts=useMemo(()=>attempts.filter(a=>String(a.taskId||'').startsWith('genius-peryshkin9-')),[attempts])
  const taskStates=useMemo(()=>{const m={};for(const a of gradeAttempts){const s=m[a.taskId]||{count:0,solved:false};s.count++;if(a.status==='PENDING_SYNC')s.pending=true;if(answerState(a)===true)s.solved=true;if(answerState(a)===false)s.wrong=(s.wrong||0)+1;m[a.taskId]=s}return m},[gradeAttempts])
  const filtered=useMemo(()=>(index?.tasks||[]).filter(t=>(!searchIds||searchIds.has(t.id))&&matchesBookFilters(t,{section,paragraph,topic,difficulty,type,progress,query},taskStates[t.id],viewed.has(t.id),index?.paragraphs)),[index,section,paragraph,topic,difficulty,type,progress,query,taskStates,viewed,searchIds])
  const current=taskId&&bank?.tasks.find(t=>t.ID===taskId)
  const nav=filtered.length?filtered:index?.tasks||[]
  const navPos=current?nav.findIndex(t=>t.id===current.ID):-1

  useEffect(()=>{if(current||!index||!restoreTaskId)return;const frame=requestAnimationFrame(()=>requestAnimationFrame(()=>document.getElementById(`grade9-task-${restoreTaskId}`)?.scrollIntoView({block:'center',behavior:'auto'})));return()=>cancelAnimationFrame(frame)},[current,index,filtered.length,restoreTaskId])
  function rememberPosition(id){setRestoreTaskId(id);try{sessionStorage.setItem(POSITION_KEY,JSON.stringify({taskId:id,section,paragraph,topic,difficulty,type,progress,query}))}catch{}}
  function openTask(id){markViewed(id);rememberPosition(id);setTaskId(id)}
  function backToBank(){rememberPosition(current?.ID||restoreTaskId);setTaskId(null)}
  async function submit(task,answer){const checked=checkAnswer(task,answer);await saveBankAttempt(student?.id,task,answer,checked);await reloadAttempts(student?.id);if(student&&navigator.onLine){try{const sync=await syncBankAttempts();if(Number.isFinite(sync.totalXp))onXp(sync.totalXp);await reloadAttempts(student.id)}catch(e){setMessage(e.message)}}return checked}

  if(current)return <Grade9TaskCard key={current.ID} task={current} submit={submit} attempts={gradeAttempts.filter(a=>a.taskId===current.ID)} back={backToBank} previousId={navPos>0?nav[navPos-1].id:null} nextId={navPos>=0&&navPos<nav.length-1?nav[navPos+1].id:null} navigate={openTask} position={navPos+1} total={nav.length} student={student}/>
  return <div className={`${styles.page} compact-book-page`}>
    <BookBankFilters values={{section,paragraph,topic,difficulty,type,progress}} setters={{section:value=>{setSection(value);setParagraph('');setTopic('')},paragraph:setParagraph,topic:setTopic,difficulty:setDifficulty,type:setType,progress:setProgress}} index={index} typeLabels={typeLabels} reset={()=>{setSection('');setParagraph('');setTopic('');setDifficulty('');setType('');setProgress('');setQuery('');clearSearch()}}/>
    <section className={`${styles.grid} book-task-grid`}>{filtered.map(item=>{const state=taskStates[item.id]||{count:0,solved:false};const next=xpForAttempt(item.xp,state.count);return <button id={`grade9-task-${item.id}`} key={item.id} className={`${styles.tile} book-task-tile ${state.solved?styles.solved:''} ${viewed.has(item.id)?styles.viewed:''} ${restoreTaskId===item.id?styles.lastOpened:''}`} onClick={()=>openTask(item.id)}><TaskTile answerFormat={textbookAnswerFormat(item)} difficulty={item.difficulty} type={typeLabels[item.type]||item.type} section={item.topic} number={item.bookNumber} status={state.solved?'Решена':viewed.has(item.id)?'Просмотрена':state.count?`${state.count} попыт.`:'Новая'} xp={state.solved?0:next} preview={item.preview||item.topic} action={state.solved?'Открыть решение →':'Решить задачу →'}/></button>})}</section>
    {message&&<p role="status" className={styles.notice}>{message}</p>}
    {index&&!filtered.length&&<p className="book-empty">По выбранным фильтрам задач нет. Измени фильтры или выбери другой класс.</p>}
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
