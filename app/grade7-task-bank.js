'use client'

import {useEffect,useMemo,useState} from 'react'
import {checkAnswer} from '../shared/task-checker.mjs'
import {bankIdentity,bankAttempts,saveBankAttempt,syncBankAttempts} from './task-store'
import styles from './grade7-task-bank.module.css'

const difficultyLabels={БАЗОВЫЙ:'Базовый',ПОВЫШЕННЫЙ:'Повышенный',ВЫСОКИЙ:'Высокий'}
const typeLabels={single_choice:'Выбор ответа',multiple_choice:'Несколько ответов',calculation:'Расчётная',graph:'График',table:'Работа с прибором'}
const sectionLabels={intro7:'Введение и измерения',motion7:'Движение'}
const POSITION_KEY='genius:task-bank-position:grade7:v1'
const xpForAttempt=(max,count)=>count===0?max:count===1?Math.floor(max*.7):count===2?Math.floor(max*.4):Math.floor(max*.2)
const answerState=a=>a?.status==='CONFIRMED'?a.result?.correct:a?.localResult?.correct
const numericText=v=>String(v).replace('.',',')

export default function Grade7TaskBank({onXp=()=>{}}){
  const [bank,setBank]=useState(null),[index,setIndex]=useState(null),[student,setStudent]=useState(null),[attempts,setAttempts]=useState([])
  const [taskId,setTaskId]=useState(null),[paragraph,setParagraph]=useState(''),[difficulty,setDifficulty]=useState(''),[type,setType]=useState(''),[query,setQuery]=useState(''),[message,setMessage]=useState(''),[restoreTaskId,setRestoreTaskId]=useState('')

  async function reloadAttempts(owner){setAttempts(await bankAttempts(owner))}
  useEffect(()=>{let live=true;try{const saved=JSON.parse(sessionStorage.getItem(POSITION_KEY)||'null');if(saved){setParagraph(saved.paragraph||'');setDifficulty(saved.difficulty||'');setType(saved.type||'');setQuery(saved.query||'');setRestoreTaskId(saved.taskId||'')}}catch{};(async()=>{try{
    const [b,i]=await Promise.all([fetch('/task-bank/grade7.json',{cache:'no-store'}),fetch('/task-bank/index-grade7.json',{cache:'no-store'})])
    if(!b.ok||!i.ok)throw Error('Банк 7 класса ещё не подготовлен. Перезапустите Genius после обновления.')
    const [bankData,indexData]=await Promise.all([b.json(),i.json()]);if(!live)return;setBank(bankData);setIndex(indexData)
    let identity=null;try{identity=await bankIdentity()}catch{};if(!live)return;setStudent(identity);await reloadAttempts(identity?.id)
  }catch(e){if(live)setMessage(e.message)}})();return()=>{live=false}},[])

  const gradeAttempts=useMemo(()=>attempts.filter(a=>String(a.taskId||'').startsWith('genius-peryshkin7-')),[attempts])
  const taskStates=useMemo(()=>{const m={};for(const a of gradeAttempts){const s=m[a.taskId]||{count:0,wrong:0,solved:false};s.count++;const c=answerState(a);if(c===false)s.wrong++;if(c===true)s.solved=true;m[a.taskId]=s}return m},[gradeAttempts])
  const filtered=useMemo(()=>{const q=query.trim().toLocaleLowerCase('ru-RU');return (index?.tasks||[]).filter(t=>(!paragraph||t.paragraph===Number(paragraph))&&(!difficulty||t.difficulty===difficulty)&&(!type||t.type===type)&&(!q||`${t.bookNumber} ${t.topic}`.toLocaleLowerCase('ru-RU').includes(q)))},[index,paragraph,difficulty,type,query])
  const current=taskId&&bank?.tasks.find(t=>t.ID===taskId)
  const nav=filtered.length?filtered:index?.tasks||[]
  const navPos=current?nav.findIndex(t=>t.id===current.ID):-1

  useEffect(()=>{
    if(current||!index||!restoreTaskId)return
    const frame=requestAnimationFrame(()=>requestAnimationFrame(()=>document.getElementById(`grade7-task-${restoreTaskId}`)?.scrollIntoView({block:'center',behavior:'auto'})))
    return()=>cancelAnimationFrame(frame)
  },[current,index,filtered.length,restoreTaskId])

  function rememberPosition(id){
    setRestoreTaskId(id)
    try{sessionStorage.setItem(POSITION_KEY,JSON.stringify({taskId:id,paragraph,difficulty,type,query}))}catch{}
  }
  function openTask(id){rememberPosition(id);setTaskId(id)}
  function backToBank(){rememberPosition(current?.ID||restoreTaskId);setTaskId(null)}

  async function submit(task,answer){
    const checked=checkAnswer(task,answer)
    await saveBankAttempt(student?.id,task,answer,checked)
    await reloadAttempts(student?.id)
    if(student&&navigator.onLine){try{const sync=await syncBankAttempts();if(Number.isFinite(sync.totalXp))onXp(sync.totalXp);await reloadAttempts(student.id)}catch(e){setMessage(e.message)}}
    return checked
  }

  if(current)return <Grade7TaskCard key={current.ID} task={current} submit={submit} attempts={gradeAttempts.filter(a=>a.taskId===current.ID)} back={backToBank} previousId={navPos>0?nav[navPos-1].id:null} nextId={navPos>=0&&navPos<nav.length-1?nav[navPos+1].id:null} navigate={openTask} position={navPos+1} total={nav.length} student={student}/>

  const solved=Object.values(taskStates).filter(s=>s.solved).length
  return <div className={styles.page}>
    <section className={styles.hero}>
      <div><div className={styles.kicker}>GENIUS · ФИЗИКА · 7 КЛАСС</div><h1>Задачи Перышкина</h1><p>Отобраны задачи №1–168: расчётные, задачи с выбором ответа и задачи с графиками. Качественные задачи в банк не включены.</p><div className={styles.heroPills}><span>{index?.tasks.length||'…'} задач</span><span>№1–168</span><span>без подсказок</span><span>XP по попыткам</span></div></div><div className={styles.atom} aria-hidden="true"><i/><i/><i/><b/></div>
    </section>
    {message&&<div className={styles.notice}>{message}</div>}
    <section className={styles.stats}><article><small>Отобрано</small><strong>{index?.tasks.length||'…'}</strong><span>из 168</span></article><article><small>Решено</small><strong>{solved}</strong><span>задач</span></article><article><small>Попытки</small><strong>{gradeAttempts.length}</strong><span>в этом классе</span></article><article><small>Источник</small><strong>7</strong><span>класс</span></article></section>

    <div className={styles.filterDock}><section className={styles.filters}>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Найти номер или тему" aria-label="Поиск"/>
        <select value={paragraph} onChange={e=>setParagraph(e.target.value)}><option value="">Все разделы</option>{(index?.paragraphs||[]).filter(p=>p.count>0).map(p=><option key={p.paragraph} value={p.paragraph}>§{p.paragraph}. {p.title}</option>)}</select>
        <select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="">Любая сложность</option>{Object.entries(difficultyLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
        <select value={type} onChange={e=>setType(e.target.value)}><option value="">Все типы</option>{[...new Set((index?.tasks||[]).map(t=>t.type))].map(k=><option key={k} value={k}>{typeLabels[k]||k}</option>)}</select>
        <button onClick={()=>{setParagraph('');setDifficulty('');setType('');setQuery('')}}>Сбросить</button>
      </section></div>

    <div className={styles.summary}><span><b>{filtered.length}</b> задач</span><span>1-я попытка — полный XP · 2-я — 70% · 3-я — 40% · далее — 20%</span></div>
    <section className={styles.grid}>{filtered.map(item=>{const state=taskStates[item.id]||{count:0,wrong:0,solved:false};const next=xpForAttempt(item.xp,state.count);return <button id={`grade7-task-${item.id}`} key={item.id} className={`${styles.tile} ${state.solved?styles.solved:''} ${restoreTaskId===item.id?styles.lastOpened:''}`} onClick={()=>openTask(item.id)}><div className={styles.tileTop}><span>Задача {item.bookNumber}</span><span>{state.solved?'✓':`${next} XP`}</span></div><h2>{item.topic}</h2><p>{typeLabels[item.type]||item.type} · {difficultyLabels[item.difficulty]}</p><footer><span>{state.count?`${state.count} попыт.`:'Новая'}</span><b>{state.solved?'Решено':'Открыть →'}</b></footer></button>})}</section>
  </div>
}

function Grade7TaskCard({task,submit,attempts,back,previousId,nextId,navigate,position,total,student}){
  const [answer,setAnswer]=useState(()=>emptyAnswer(task.ANSWER)),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const solved=attempts.some(a=>answerState(a)===true),attemptNo=attempts.length+1,nextXp=solved?0:xpForAttempt(task.XP,attempts.length)
  useEffect(()=>{setAnswer(emptyAnswer(task.ANSWER));setResult(null);setError('')},[task.ID])
  async function check(e){e.preventDefault();setBusy(true);setError('');try{setResult(await submit(task,answer))}catch(err){setError(err.message)}finally{setBusy(false)}}
  return <article className={styles.detail}>
    <nav className={styles.topNav}><button onClick={back}>← К задачам</button><span>{position} / {total}</span><div><button disabled={!previousId} onClick={()=>previousId&&navigate(previousId)}>←</button><button disabled={!nextId} onClick={()=>nextId&&navigate(nextId)}>→</button></div></nav>
    <header className={styles.taskHead}><div><div className={styles.kicker}>7 КЛАСС · СБОРНИК ПЕРЫШКИНА</div><h1>Задача {task.BOOK_TASK_NUMBER}</h1><div className={styles.taskPills}><span>{difficultyLabels[task.DIFFICULTY]}</span><span>{typeLabels[task.TASK_TYPE]||task.TASK_TYPE}</span><span>{task.XP} XP максимум</span></div></div><div className={styles.xpCard}><small>{solved?'Статус':'За правильный ответ сейчас'}</small><strong>{solved?'✓':`${nextXp} XP`}</strong><span>{solved?'решено':`попытка №${attemptNo}`}</span></div></header>
    <section className={styles.question}><div className={styles.questionLabel}><span>01</span><h2>Условие</h2></div><p className={styles.taskText}>{task.TASK}</p>{task.DIAGRAM&&<Diagram spec={task.DIAGRAM}/>}<form onSubmit={check}><AnswerFields task={task} value={answer} onChange={setAnswer}/><button className={styles.primary} disabled={busy||!answerReady(task.ANSWER,answer)}>{busy?'Проверяю…':'Проверить ответ'}</button></form>{error&&<div className={styles.error}>{error}</div>}{result&&<div className={`${styles.feedback} ${result.correct?styles.right:styles.wrong}`}><strong>{result.correct?'Верно!':'Пока неверно'}</strong><p>{result.correct?(student?`Попытка сохранена. Сервер начислит XP по номеру попытки.`:'Ответ верный. В гостевом режиме результат хранится локально.'):'Можно пробовать ещё. После третьей попытки за правильное решение сохраняется минимальный XP.'}</p></div>}</section>
    <footer className={styles.bottomNav}><button disabled={!previousId} onClick={()=>previousId&&navigate(previousId)}>← Предыдущая</button><span>Задача {task.BOOK_TASK_NUMBER}</span><button disabled={!nextId} onClick={()=>nextId&&navigate(nextId)}>Следующая →</button></footer>
  </article>
}

function emptyAnswer(spec){if(spec.mode==='numeric_list')return (spec.fields||spec.values||[]).map(()=> '');if(spec.mode==='parts')return (spec.parts||[]).map(()=> '');if(spec.mode==='set')return [];return ''}
function answerReady(spec,value){if(spec.mode==='numeric_list'||spec.mode==='parts')return value.every(v=>String(v).trim());if(spec.mode==='set')return value.length>0;return String(value).trim().length>0}

function AnswerFields({task,value,onChange}){
  const spec=task.ANSWER
  if(spec.mode==='numeric')return <label className={styles.answerBox}><span>{task.ANSWER_PROMPT||'Введите ответ'}</span><div><input inputMode="decimal" value={value} onChange={e=>onChange(e.target.value)} placeholder="Ответ"/><em>{spec.unit}</em></div></label>
  if(spec.mode==='numeric_list')return <div className={styles.multiFields}>{spec.fields.map((f,i)=><label key={i}><span>{f.label}</span><div><input inputMode="decimal" value={value?.[i]??''} onChange={e=>{const a=[...value];a[i]=e.target.value;onChange(a)}}/><em>{f.unit}</em></div></label>)}</div>
  if(spec.mode==='parts')return <div className={styles.multiFields}>{spec.parts.map((part,i)=>part.type==='numeric'?<label key={i}><span>{part.label}</span><div><input inputMode="decimal" value={value?.[i]??''} onChange={e=>{const a=[...value];a[i]=e.target.value;onChange(a)}}/><em>{part.unit||''}</em></div></label>:<fieldset key={i} className={styles.choices}><legend>{part.label}</legend>{part.options.map(o=><label key={o.id}><input type="radio" name={`p${i}`} checked={value[i]===o.id} onChange={()=>{const a=[...value];a[i]=o.id;onChange(a)}}/><span><b>{o.id}</b>{o.text}</span></label>)}</fieldset>)}</div>
  const options=task.OPTIONS||[]
  if(spec.mode==='set')return <fieldset className={styles.choices}><legend>{task.ANSWER_PROMPT||'Выберите ответы'}</legend>{options.map(o=><label key={o.id}><input type="checkbox" checked={value.includes(o.id)} onChange={e=>onChange(e.target.checked?[...value,o.id]:value.filter(x=>x!==o.id))}/><span><b>{o.id}</b>{o.text}</span></label>)}</fieldset>
  return <fieldset className={styles.choices}><legend>{task.ANSWER_PROMPT||'Выберите ответ'}</legend>{options.map(o=><label key={o.id}><input type="radio" name={`answer-${task.ID}`} checked={value===o.id} onChange={()=>onChange(o.id)}/><span><b>{o.id}</b>{o.text}</span></label>)}</fieldset>
}

function Diagram({spec}){
  if(['line-chart','multi-line-chart','blank-grid'].includes(spec.type))return <Chart spec={spec}/>
  if(spec.type==='ruler-block')return <div className={styles.visual}><svg viewBox="0 0 700 250" role="img" aria-label={spec.ariaLabel}><rect className={styles.object} x="205" y="55" width="330" height="95" rx="16"/><text x="370" y="112" textAnchor="middle">деревянный брусок</text><line className={styles.axis} x1="80" x2="620" y1="185" y2="185"/>{Array.from({length:91},(_,i)=>i).map(i=>{const v=spec.min+i/10,x=80+i*6;return <g key={i}><line className={styles.tickLine} x1={x} x2={x} y1="185" y2={i%10===0?160:173}/>{i%10===0&&<text className={styles.tickText} x={x} y="220" textAnchor="middle">{Math.round(v)}</text>}</g>})}</svg></div>
  if(spec.type==='graduated-cylinder')return <div className={styles.visual}><svg viewBox="0 0 420 330" role="img" aria-label={spec.ariaLabel}><path className={styles.glass} d="M130 35 H290 V280 Q210 315 130 280 Z"/><path className={styles.water} d={`M136 ${270-(spec.level/spec.max)*220} H284 V276 Q210 304 136 276 Z`}/>{[0,50,100,150,200,250,300].map(v=>{const y=270-(v/spec.max)*220;return <g key={v}><line className={styles.tickLine} x1="270" x2={v%100===0?305:292} y1={y} y2={y}/>{v%100===0&&<text className={styles.tickText} x="315" y={y+6}>{v}</text>}</g>})}<text className={styles.axisLabel} x="210" y="25" textAnchor="middle">мл</text></svg></div>
  if(spec.type==='liquid-levels')return <div className={styles.visual}><svg viewBox="0 0 620 300" role="img" aria-label={spec.ariaLabel}>{spec.levels.map((level,i)=>{const x=105+i*300,y=235-level*180;return <g key={i}><path className={styles.glass} d={`M${x} 35 H${x+160} L${x+145} 250 H${x+15} Z`}/><path className={styles.water} d={`M${x+12} ${y} H${x+148} L${x+140} 240 H${x+20} Z`}/><text className={styles.seriesLabel} x={x+80} y="282" textAnchor="middle">{spec.labels[i]}</text></g>})}</svg></div>
  if(spec.type==='stopwatch-pair')return <div className={styles.visual}><svg viewBox="0 0 700 340" role="img" aria-label={spec.ariaLabel}>{spec.items.map((s,i)=><Stopwatch key={i} cx={190+i*320} cy={175} spec={s}/>)}</svg></div>
  if(spec.type==='ruler-pair')return <div className={styles.visual}><svg viewBox="0 0 700 280" role="img" aria-label={spec.ariaLabel}>{[0,1].map(row=><g key={row} transform={`translate(90 ${70+row*120})`}><rect className={styles.object} x="0" y="0" width="520" height="58" rx="8"/>{Array.from({length:row?31:61},(_,i)=>i).map(i=>{const count=row?30:60,x=i*(520/count);return <line key={i} className={styles.darkTick} x1={x} x2={x} y1="58" y2={i%(row?5:10)===0?25:40}/>})}</g>)}</svg></div>
  if(spec.type==='scale-collection')return <div className={styles.scaleGrid}>{spec.items.map((item,i)=><div key={i} className={styles.scaleCard}><strong>{item.label}</strong><div className={styles.scaleBar}>{item.major.map((v,j)=><span key={j}>{v}</span>)}</div><small>{item.unit} · {item.subdivisions} делений между крупными отметками</small></div>)}</div>
  return null
}

function Stopwatch({cx,cy,spec}){const a=-Math.PI/2+(spec.value/spec.max)*Math.PI*2,x=cx+95*Math.cos(a),y=cy+95*Math.sin(a);return <g><circle className={styles.dial} cx={cx} cy={cy} r="120"/><rect className={styles.object} x={cx-28} y={cy-155} width="56" height="25" rx="8"/>{Array.from({length:60},(_,i)=>{const a=-Math.PI/2+i/60*Math.PI*2,r1=i%5===0?94:104,r2=114;return <line key={i} className={styles.tickLine} x1={cx+r1*Math.cos(a)} y1={cy+r1*Math.sin(a)} x2={cx+r2*Math.cos(a)} y2={cy+r2*Math.sin(a)}/>})}<line className={styles.needle} x1={cx} y1={cy} x2={x} y2={y}/><circle className={styles.needle} cx={cx} cy={cy} r="8"/></g>}

function Chart({spec}){
  const W=760,H=470,L=100,R=78,T=52,B=92
  const series=spec.type==='blank-grid'?[]:spec.type==='multi-line-chart'?spec.series:[{label:'',points:spec.points}]
  const xMin=spec.xMin??0,xMax=spec.xMax??1,yMin=spec.yMin??0,yMax=spec.yMax??1
  const xTicks=spec.xTicks||Array.from({length:7},(_,i)=>xMin+(xMax-xMin)*i/6),yTicks=spec.yTicks||Array.from({length:7},(_,i)=>yMin+(yMax-yMin)*i/6)
  const X=x=>L+(x-xMin)/(xMax-xMin||1)*(W-L-R),Y=y=>T+(yMax-y)/(yMax-yMin||1)*(H-T-B)
  return <div className={styles.chartWrap}><svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} role="img" aria-label={spec.ariaLabel}>{yTicks.map((v,i)=><g key={`y${i}`}><line className={styles.gridLine} x1={L} x2={W-R} y1={Y(v)} y2={Y(v)}/><text className={styles.tickText} x={L-14} y={Y(v)+6} textAnchor="end">{numericText(v)}</text></g>)}{xTicks.map((v,i)=><g key={`x${i}`}><line className={styles.gridLine} x1={X(v)} x2={X(v)} y1={T} y2={H-B}/><text className={styles.tickText} x={X(v)} y={H-B+32} textAnchor="middle">{numericText(v)}</text></g>)}<line className={styles.axis} x1={L} x2={W-R+12} y1={H-B} y2={H-B}/><line className={styles.axis} x1={L} x2={L} y1={H-B} y2={T-10}/>{series.map((s,i)=>{const last=s.points.at(-1),lx=Math.min(W-R-10,Math.max(L+10,X(last[0])+(i%2?-12:12))),ly=Math.min(H-B-14,Math.max(T+20,Y(last[1])+(i%2?18:-16)));return <g key={i}><polyline className={`${styles.series} ${i===1?styles.series2:''}`} points={s.points.map(([x,y])=>`${X(x)},${Y(y)}`).join(' ')}/>{s.label&&<text className={styles.seriesLabel} x={lx} y={ly} textAnchor={i%2?'end':'start'}>{s.label}</text>}</g>})}<text className={styles.axisLabel} x={W-R} y={H-18} textAnchor="end">{spec.xLabel}</text><text className={styles.axisLabel} x="22" y="28">{spec.yLabel}</text></svg></div>
}
