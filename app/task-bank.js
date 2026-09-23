'use client'

import {useEffect,useMemo,useState} from 'react'
import {checkAnswer} from '../shared/task-checker.mjs'
import {formatBytes} from './offline-db'
import {bankIdentity,bankIndex,bankAttempts,loadBankTask,downloadBankPackage,saveBankAttempt,syncBankAttempts} from './task-store'
import MatchingTaskFields,{emptyMatchingAnswer,matchingAnswerReady} from './matching-task'

const sections={thermal:'Тепловые явления',electric:'Электрические явления',extra8:'Электромагнитные и световые явления'}
const sectionRanges={thermal:'§1–§26',electric:'§27–§40',extra8:'Доп. темы 8 класса'}
const typeLabels={single_choice:'Один ответ',numeric:'Числовой ответ',multiple_choice:'Несколько ответов',matching:'Соответствие',sequence:'Последовательность',qualitative:'Качественная',calculation:'Расчётная',graph:'График',table:'Таблица',experiment:'Эксперимент',circuit:'Электрическая цепь'}
const difficultyLabels={БАЗОВЫЙ:'Базовый',ПОВЫШЕННЫЙ:'Повышенный',ВЫСОКИЙ:'Высокий'}
const BANK_POSITION_KEY='genius:task-bank-position:v1'

function answerState(attempt){
  const correct=attempt.status==='CONFIRMED'?attempt.result?.correct:attempt.localResult?.correct
  return typeof correct==='boolean'?correct:null
}
function locationLabel(task){return Number.isInteger(task.paragraph)?`§${task.paragraph}`:'Доп. тема'}

export default function TaskBank({onXp=()=>{},refreshOffline=async()=>{},setScreen=()=>{}}) {
  const [index,setIndex]=useState(null),[student,setStudent]=useState(null),[attempts,setAttempts]=useState([])
  const [section,setSection]=useState(''),[paragraph,setParagraph]=useState(''),[topic,setTopic]=useState(''),[difficulty,setDifficulty]=useState(''),[type,setType]=useState(''),[progress,setProgress]=useState(''),[query,setQuery]=useState('')
  const [task,setTask]=useState(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[online,setOnline]=useState(true)
  const [restoreTaskId,setRestoreTaskId]=useState('')

  async function reload(sync=false) {
    try {
      const catalog=await bankIndex();setIndex(catalog)
      let identity=null
      try {identity=await bankIdentity()} catch {setMessage('Сервер недоступен. Можно решать задачи локально без начисления XP.')}
      setStudent(identity)
      if(sync&&identity&&navigator.onLine) {
        try {const result=await syncBankAttempts();if(Number.isFinite(result.totalXp))onXp(result.totalXp)} catch(e){setMessage(e.message)}
      }
      setAttempts(await bankAttempts(identity?.id))
    } catch(e){setMessage(e.message)}
  }

  useEffect(()=>{
    try{
      const saved=JSON.parse(sessionStorage.getItem(BANK_POSITION_KEY)||'null')
      if(saved){setSection(saved.section||'');setParagraph(saved.paragraph||'');setTopic(saved.topic||'');setDifficulty(saved.difficulty||'');setType(saved.type||'');setProgress(saved.progress||'');setQuery(saved.query||'');setRestoreTaskId(saved.taskId||'')}
    }catch{}
    setOnline(navigator.onLine);reload(true)
    const up=()=>{setOnline(true);reload(true)},down=()=>setOnline(false)
    window.addEventListener('online',up);window.addEventListener('offline',down)
    return()=>{window.removeEventListener('online',up);window.removeEventListener('offline',down)}
  },[])

  const states=useMemo(()=>{
    const out={}
    for(const a of attempts){
      const s=out[a.taskId]||{solved:false,repeat:false,pending:false,count:0,correct:0,wrong:0,status:a.status}
      const correct=answerState(a);s.count+=1
      if(correct===true){s.solved=true;s.repeat=false;s.correct+=1}
      if(correct===false){s.wrong+=1;if(!s.solved)s.repeat=true}
      if(a.status==='PENDING_SYNC')s.pending=true
      s.status=a.status;out[a.taskId]=s
    }
    return out
  },[attempts])

  const stats=useMemo(()=>{
    const all=Object.values(states),graded=attempts.map(answerState).filter(x=>x!==null),correct=graded.filter(Boolean).length
    return {total:index?.tasks.length||0,solved:all.filter(x=>x.solved).length,repeat:all.filter(x=>x.repeat).length,pending:attempts.filter(x=>x.status==='PENDING_SYNC').length,accuracy:graded.length?Math.round(correct/graded.length*100):0}
  },[states,attempts,index])

  const rows=useMemo(()=>{
    const needle=query.trim().toLocaleLowerCase('ru-RU')
    return (index?.tasks||[]).filter(t=>(!section||t.section===section)&&(!paragraph||t.paragraph===Number(paragraph))&&(!topic||t.topic===topic)&&(!difficulty||t.difficulty===difficulty)&&(!type||t.type===type)&&(!progress||(progress==='solved'?states[t.id]?.solved:progress==='repeat'?states[t.id]?.repeat:progress==='pending'?states[t.id]?.pending:!states[t.id]?.solved))&&(!needle||`${t.topic} ${locationLabel(t)} ${typeLabels[t.type]||t.type}`.toLocaleLowerCase('ru-RU').includes(needle)))
  },[index,section,paragraph,topic,difficulty,type,progress,query,states])

  useEffect(()=>{
    if(task||!index||!restoreTaskId)return
    const frame=requestAnimationFrame(()=>requestAnimationFrame(()=>{
      document.getElementById(`task-${restoreTaskId}`)?.scrollIntoView({block:'center',behavior:'auto'})
    }))
    return()=>cancelAnimationFrame(frame)
  },[index,rows.length,restoreTaskId,task])

  const currentParagraphs=(index?.paragraphs||[]).filter(p=>!section||p.section===section)
  function resetFilters(){setSection('');setParagraph('');setTopic('');setDifficulty('');setType('');setProgress('');setQuery('')}
  function selectSection(id){setSection(section===id?'':id);setParagraph('');setTopic('')}
  function selectParagraph(value){setParagraph(value?String(value):'');setTopic('')}

  function rememberPosition(id){
    setRestoreTaskId(id)
    try{sessionStorage.setItem(BANK_POSITION_KEY,JSON.stringify({taskId:id,section,paragraph,topic,difficulty,type,progress,query,scrollY:window.scrollY}))}catch{}
  }
  async function open(id){rememberPosition(id);setBusy(true);setMessage('');try{setTask(await loadBankTask(id,index.version))}catch(e){setMessage(e.message)}finally{setBusy(false)}}
  function backToBank(){const id=task?.ID||restoreTaskId;rememberPosition(id);setTask(null)}
  async function download(kind,value){setBusy(true);setMessage('');try{const result=await downloadBankPackage(index,kind,value);await refreshOffline();setMessage(`Готово: скачано ${result.count} задач · ${formatBytes(result.sizeBytes)}.`)}catch(e){setMessage(e.message)}finally{setBusy(false)}}
  async function submit(t,answer){
    const checked=checkAnswer(t,answer);await saveBankAttempt(student?.id,t,answer,checked);setAttempts(await bankAttempts(student?.id))
    if(student&&navigator.onLine){try{const result=await syncBankAttempts();if(Number.isFinite(result.totalXp))onXp(result.totalXp);setAttempts(await bankAttempts(student.id))}catch(e){setMessage(e.message)}}
    return checked
  }

  if(task){
    const navRows=rows.length?rows:(index?.tasks||[])
    const pos=navRows.findIndex(x=>x.id===task.ID)
    return <TaskCard key={task.ID} task={task} submit={submit} back={backToBank} goLearn={()=>setScreen('topics')} student={student} attempts={attempts.filter(a=>a.taskId===task.ID)} message={message} navigate={open} previousId={pos>0?navRows[pos-1].id:null} nextId={pos>=0&&pos<navRows.length-1?navRows[pos+1].id:null} position={pos>=0?pos+1:1} total={navRows.length}/>
  }

  return <div className="bank-page bank-v11 bank-v12">
    <header className="bank-hero bank-hero-v10">
      <div className="bank-hero-copy">
        <div className="bank-kicker">GENIUS · БАНК ЗАДАЧ · 8 КЛАСС</div>
        <h1>{stats.total||'…'} задач для практики</h1>
        <p>Задачи собраны из предоставленных PDF. Для каждой задачи — единое поле ввода ответа; задачи повышенного и высокого уровня отмечены отдельно. Решения в этой сборке пока не публикуются.</p>
        <div className="bank-pills"><span>{stats.total||'…'} задач</span><span>по темам 8 класса</span><span>{online?'● Онлайн':'○ Офлайн'}</span><span>{student?'XP подтверждает сервер':'Локальная тренировка'}</span></div>
      </div>
      <div className="bank-orbit" aria-hidden="true"><i/><i/><i/><b/></div>
    </header>

    <section className="bank-stats" aria-label="Прогресс по задачам">
      <article><span>Решено</span><strong>{stats.solved}<small> / {stats.total}</small></strong><div><i style={{width:`${stats.total?stats.solved/stats.total*100:0}%`}}/></div></article>
      <article><span>Точность</span><strong>{stats.accuracy}%</strong><small>{attempts.length?`${attempts.length} попыток`:'Начни с первой задачи'}</small></article>
      <article><span>Повторить</span><strong>{stats.repeat}</strong><small>задач после ошибки</small></article>
      <article><span>Синхронизация</span><strong>{stats.pending}</strong><small>{stats.pending?'ожидают сервера':'всё сохранено'}</small></article>
    </section>

    {!student&&<p className="bank-note">Сейчас открыт режим практики: результаты хранятся на этом устройстве. Для серверного прогресса, рейтинга и XP войди по ученическому коду.</p>}
    {message&&<p role="status" className="bank-note">{message}</p>}

    <div className="bank-sections">{Object.entries(sections).map(([id,label])=><button key={id} className={section===id?'selected':''} onClick={()=>selectSection(id)}><small>{sectionRanges[id]}</small><strong>{label}</strong><span>{index?.tasks.filter(t=>t.section===id).length??0} задач →</span></button>)}</div>

    <div className="bank-filter-dock">
      <section className="bank-navigator">
        <div className="bank-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Найти тему" aria-label="Поиск по банку задач"/></div>
        {!!currentParagraphs.length&&<div className="bank-paragraph-strip" aria-label="Параграфы"><button className={!paragraph?'active':''} onClick={()=>selectParagraph('')}>Все</button>{currentParagraphs.map(p=><button key={p.paragraph} title={p.title} className={Number(paragraph)===p.paragraph?'active':''} onClick={()=>selectParagraph(p.paragraph)}>§{p.paragraph}</button>)}</div>}
      </section>

      <section className="bank-filters" aria-label="Фильтры задач">
        <label>Параграф<select value={paragraph} onChange={e=>selectParagraph(e.target.value)} disabled={!currentParagraphs.length}><option value="">Все параграфы</option>{currentParagraphs.map(p=><option key={p.paragraph} value={p.paragraph}>§{p.paragraph}. {p.title}</option>)}</select></label>
        <label>Тема<select value={topic} onChange={e=>setTopic(e.target.value)}><option value="">Все темы</option>{[...new Set((index?.tasks||[]).filter(t=>(!section||t.section===section)&&(!paragraph||t.paragraph===Number(paragraph))).map(t=>t.topic))].sort().map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Сложность<select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="">Любая сложность</option>{['БАЗОВЫЙ','ПОВЫШЕННЫЙ','ВЫСОКИЙ'].map(x=><option key={x} value={x}>{difficultyLabels[x]}</option>)}</select></label>
        <label>Тип<select value={type} onChange={e=>setType(e.target.value)}><option value="">Все типы</option>{[...new Set(index?.tasks.map(t=>t.type)||[])].map(x=><option key={x} value={x}>{typeLabels[x]||x}</option>)}</select></label>
        <label>Прогресс<select value={progress} onChange={e=>setProgress(e.target.value)}><option value="">Все задачи</option><option value="solved">Решённые</option><option value="unsolved">Нерешённые</option><option value="repeat">Требуют повторения</option><option value="pending">Ждут синхронизации</option></select></label>
        <button onClick={resetFilters}>Сбросить фильтры</button>
      </section>
    </div>

    <div className="bank-tools"><span><b>{rows.length}</b> из {stats.total} задач</span><button disabled={!paragraph||busy||!online} onClick={()=>download('paragraph',paragraph)}>⇩ Скачать тему {paragraph&&`· ${formatBytes(index.tasks.filter(t=>t.paragraph===Number(paragraph)).reduce((a,t)=>a+t.bytes,0))}`}</button><button disabled={!section||busy||!online} onClick={()=>download('section',section)}>⇩ Скачать раздел {section&&`· ${formatBytes(index.tasks.filter(t=>t.section===section).reduce((a,t)=>a+t.bytes,0))}`}</button><button onClick={()=>setScreen('offline')}>Офлайн-материалы</button></div>

    <div className="bank-grid">{rows.map(t=>{const state=states[t.id];return <button id={`task-${t.id}`} disabled={busy} className={`bank-tile ${state?.solved?'solved':''} ${state?.repeat?'repeat':''} ${restoreTaskId===t.id?'last-opened':''}`} key={t.id} onClick={()=>open(t.id)}><div className="bank-tile-top"><span>{locationLabel(t)}</span><span>{t.xp} XP</span></div><h2>{t.topic}</h2><p>{typeLabels[t.type]||t.type} · {difficultyLabels[t.difficulty]||t.difficulty.toLowerCase()}</p><div className="bank-tile-meta"><span>{state?.count?`${state.count} попыт.`:'Новая'}</span>{state?.pending&&<span className="pending">SYNC</span>}</div><footer>{state?.repeat?'↻ Повторить':state?.solved?'✓ Решено':'Начать решение →'}</footer></button>})}</div>
    {index&&!rows.length&&<div className="bank-empty"><span>⌕</span><h2>Ничего не найдено</h2><p>Измени фильтры или вернись ко всему банку задач.</p><button onClick={resetFilters}>Показать все задачи</button></div>}
  </div>
}

function TaskCard({task:t,submit,back,goLearn,student,attempts,message,navigate,previousId,nextId,position,total}) {
  const [answer,setAnswer]=useState(()=>t.TASK_TYPE==='matching'?emptyMatchingAnswer(t):''),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const latest=attempts.at(-1),wrongCount=attempts.filter(a=>answerState(a)===false).length,solved=attempts.some(a=>answerState(a)===true)
  async function check(e){e.preventDefault();setBusy(true);setError('');try{const checked=await submit(t,answer);setResult(checked)}catch(e){setError(e.message)}finally{setBusy(false)}}
  function tryAgain(){setAnswer(t.TASK_TYPE==='matching'?emptyMatchingAnswer(t):'');setResult(null);setError('')}
  const location=Number.isInteger(t.PARAGRAPH)?`§${t.PARAGRAPH}`:'Дополнительная тема 8 класса'
  const isAdvanced=t.DIFFICULTY==='ПОВЫШЕННЫЙ'||t.DIFFICULTY==='ВЫСОКИЙ'
  const manual=t.ANSWER?.mode==='manual'

  return <article className="bank-page bank-detail bank-v11 bank-v12">
    <div className="bank-detail-top">
      <button className="bank-back" onClick={back}>← К банку задач</button>
      <div className="bank-task-nav" aria-label="Переключение между задачами">
        <button className="bank-nav-arrow" onClick={()=>previousId&&navigate(previousId)} disabled={!previousId} aria-label="Предыдущая задача">←</button>
        <span>{position} / {total}</span>
        <button className="bank-nav-arrow" onClick={()=>nextId&&navigate(nextId)} disabled={!nextId} aria-label="Следующая задача">→</button>
      </div>
      {Number.isInteger(t.PARAGRAPH)&&<button className="bank-learn" onClick={goLearn}>§{t.PARAGRAPH} · открыть урок</button>}
    </div>
    <header className="bank-task-head"><div><div className="bank-kicker">ЗАДАЧА · {location}{t.BOOK_TASK_NUMBER?` · СБОРНИК №${t.BOOK_TASK_NUMBER}`:''}</div><h1>{t.TOPIC}</h1><div className="bank-pills"><span className={isAdvanced?'bank-level-hot':''}>{difficultyLabels[t.DIFFICULTY]||t.DIFFICULTY}</span><span>{typeLabels[t.TASK_TYPE]||t.TASK_TYPE}</span><span>{t.XP} XP</span></div></div><div className={`bank-task-status ${solved?'done':wrongCount?'retry':''}`}>{solved?'✓':wrongCount?'↻':'◇'}<small>{solved?'Решено':wrongCount?'Повторение':'В работе'}</small></div></header>

    <section className="bank-question">
      <div className="bank-card-title"><span>01</span><h2>Условие</h2></div>
      {t.TASK_TYPE!=='matching'&&<div className="bank-task-text">{t.TASK}</div>}
      {t.DIAGRAM&&<TaskDiagram spec={t.DIAGRAM}/>} 
      <form onSubmit={check}>{t.TASK_TYPE==='matching'?<MatchingTaskFields task={t} value={answer} onChange={value=>{setAnswer(value);setResult(null)}}/>:<label className="bank-answer"><span>{t.ANSWER_PROMPT||'Введите ответ'}</span><input inputMode={manual?'text':'decimal'} autoComplete="off" value={answer} onChange={e=>{setAnswer(e.target.value);setResult(null)}} placeholder={manual?'Введите ответ':'Введите число'} required/><small>{manual?'Ответ сохранится в попытке. Автоматическая проверка для задач из сборника будет добавлена позже.':'Можно использовать точку или запятую для десятичной дроби.'}</small></label>}<div className="bank-submit-row"><button className="bank-primary" disabled={busy||(t.TASK_TYPE==='matching'?!matchingAnswerReady(answer):!String(answer).trim())}>{busy?'Сохраняю…':manual?'Сохранить ответ':'Проверить ответ'}</button>{attempts.length>0&&<span>Попыток: {attempts.length}</span>}</div></form>
      {(error||message)&&<p role="alert" className="bank-inline-message">{error||message}</p>}
      {result&&result.correct===null&&<div role="status" className="bank-feedback manual"><div className="bank-feedback-icon">◇</div><div><strong>Ответ сохранён</strong><p>Для этой задачи пока не включена автоматическая проверка и не опубликовано решение. Можно перейти к следующей задаче стрелкой.</p></div></div>}
      {result&&result.correct!==null&&<div role="status" className={`bank-feedback ${result.correct?'right':'wrong'}`}><div className="bank-feedback-icon">{result.correct?'✓':'×'}</div><div><strong>{result.correct?'Верно!':'Ответ пока неверный'}</strong><p>{result.correct?(!student?'Результат сохранён локально. В режиме ученика сервер подтвердит XP.':latest?.status==='CONFIRMED'?`Сервер подтвердил ответ. XP за эту задачу: ${latest.result?.xpAwarded||0}.`:'Попытка сохранена и ожидает серверной синхронизации.'):'Проверь вычисления и попробуй ещё раз. Решение для этой сборки пока не опубликовано.'}</p>{!result.correct&&<button type="button" onClick={tryAgain}>Попробовать ещё</button>}</div></div>}
    </section>

    <div className="bank-bottom-nav">
      <button onClick={()=>previousId&&navigate(previousId)} disabled={!previousId}>← Предыдущая</button>
      <span>Задача {position} из {total}</span>
      <button onClick={()=>nextId&&navigate(nextId)} disabled={!nextId}>Следующая →</button>
    </div>
  </article>
}

function TaskDiagram({spec}){
  if(spec.type==='data-table')return <figure className="bank-chart-figure"><div className="bank-data-table-wrap"><table className="bank-data-table"><thead><tr>{spec.headers.map((h,i)=><th key={i}>{h}</th>)}</tr></thead><tbody>{spec.rows.map((row,i)=><tr key={i}>{row.map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody></table></div><figcaption>{spec.label}</figcaption></figure>

  if(['line-chart','multi-line-chart'].includes(spec.type)){
    const W=700,H=420,left=92,right=72,top=44,bottom=86
    const series=spec.type==='multi-line-chart'?spec.series:[{label:'',points:spec.points}]
    const allPoints=series.flatMap(s=>s.points)
    const xVals=[...(spec.xTicks||[]),...allPoints.map(p=>p[0])],yVals=[...(spec.yTicks||[]),...allPoints.map(p=>p[1])]
    const xMin=spec.xMin??Math.min(0,...xVals),xMax=spec.xMax??Math.max(...xVals,1),yMin=spec.yMin??Math.min(0,...yVals),yMax=spec.yMax??Math.max(...yVals,1)
    const X=x=>left+(x-xMin)/(xMax-xMin||1)*(W-left-right),Y=y=>top+(yMax-y)/(yMax-yMin||1)*(H-top-bottom)
    return <figure className="bank-chart-figure"><svg viewBox={`0 0 ${W} ${H}`} className="bank-chart" role="img" aria-label={spec.label}>
      {(spec.yTicks||[]).map((v,i)=><g key={`y${i}`}><line className="grid" x1={left} x2={W-right} y1={Y(v)} y2={Y(v)}/><text className="tick" x={left-12} y={Y(v)+5} textAnchor="end">{String(v).replace('.',',')}</text></g>)}
      {(spec.xTicks||[]).map((v,i)=><g key={`x${i}`}><line className="grid" y1={top} y2={H-bottom} x1={X(v)} x2={X(v)}/><text className="tick" x={X(v)} y={H-bottom+25} textAnchor="middle">{String(v).replace('.',',')}</text></g>)}
      <line className="axis" x1={left} x2={W-right} y1={Y(yMin)} y2={Y(yMin)}/><line className="axis" x1={X(xMin)} x2={X(xMin)} y1={top} y2={H-bottom}/>
      {series.map((sr,i)=>{const last=sr.points.at(-1),lx=Math.min(W-right-8,Math.max(left+8,X(last[0])+(i%2?-10:12))),ly=Math.min(H-bottom-12,Math.max(top+18,Y(last[1])+(i%2?18:-14)));return <g key={i}><polyline className={`series s${i+1}`} points={sr.points.map(([x,y])=>`${X(x)},${Y(y)}`).join(' ')}/>{sr.label&&<text className="series-label" x={lx} y={ly} textAnchor={i%2?'end':'start'}>{sr.label}</text>}</g>})}
      <text className="axis-label" x={W-right} y={H-14} textAnchor="end">{spec.xLabel}</text><text className="axis-label" x={18} y={top+8}>{spec.yLabel}</text>
    </svg><figcaption>{spec.label}</figcaption></figure>
  }

  if(spec.type==='bar-chart'){
    const W=640,H=360,left=72,right=28,top=28,bottom=70
    const maxTick=Math.max(...(spec.yTicks||[0]),...spec.bars.map(b=>b.value),1),Y=v=>top+(maxTick-v)/maxTick*(H-top-bottom)
    const plotW=W-left-right,slot=plotW/spec.bars.length,barW=Math.min(100,slot*.52)
    return <figure className="bank-chart-figure"><svg viewBox={`0 0 ${W} ${H}`} className="bank-chart" role="img" aria-label={spec.label}>
      {(spec.yTicks||[]).map((v,i)=><g key={i}><line className="grid" x1={left} x2={W-right} y1={Y(v)} y2={Y(v)}/><text className="tick" x={left-12} y={Y(v)+5} textAnchor="end">{v}</text></g>)}
      <line className="axis" x1={left} x2={W-right} y1={H-bottom} y2={H-bottom}/><line className="axis" x1={left} x2={left} y1={top} y2={H-bottom}/>
      {spec.bars.map((b,i)=>{const x=left+slot*i+(slot-barW)/2,y=Y(b.value);return <g key={i}><rect className={`bar b${i+1}`} x={x} y={y} width={barW} height={H-bottom-y} rx="5"/><text className="tick" x={x+barW/2} y={H-bottom+26} textAnchor="middle">{b.label}</text><text className="bar-value" x={x+barW/2} y={y-10} textAnchor="middle">{String(b.value).replace('.',',')}</text></g>})}
      <text className="axis-label" x={18} y={top+8}>{spec.yLabel}</text>
    </svg><figcaption>{spec.label}</figcaption></figure>
  }

  const common={viewBox:'0 0 560 240',role:'img','aria-label':spec.label,className:'bank-inline-diagram'}
  if(spec.type==='coil-induction')return <figure><svg {...common}><rect x="35" y="70" width="90" height="90" rx="12"/><text x="54" y="122">источник</text><path d="M125 115 C175 115 175 82 220 82"/><path d="M125 130 C175 130 175 158 220 158"/><ellipse cx="280" cy="120" rx="60" ry="78"/><ellipse cx="280" cy="120" rx="35" ry="62"/><path className="accent" d="M340 88 C395 88 395 70 438 70 M340 152 C395 152 395 170 438 170"/><rect x="438" y="65" width="85" height="110" rx="12"/><path d="M460 130 Q480 95 500 130"/><text x="451" y="196">амперметр</text><text x="232" y="222">катушки</text></svg><figcaption>{spec.label}</figcaption></figure>
  if(spec.type==='coil-magnet')return <figure><svg {...common}><ellipse cx="280" cy="130" rx="72" ry="62"/><ellipse cx="280" cy="130" rx="48" ry="45"/><rect x="258" y="28" width="44" height="92" rx="8"/><path className="accent" d={spec.direction==='in'?'M330 70 L330 118 M318 104 L330 118 L342 104':'M330 118 L330 70 M318 84 L330 70 L342 84'}/><path d="M352 112 C400 112 405 80 448 80 M352 148 C400 148 405 180 448 180"/><rect x="448" y="72" width="80" height="116" rx="12"/><path d="M468 138 Q487 105 506 138"/><text x="456" y="212">амперметр</text><text x="245" y="224">катушка</text></svg><figcaption>{spec.label}</figcaption></figure>
  if(spec.type==='pipe-compensator')return <figure><svg {...common}><path d="M40 155 H175 V72 H385 V155 H520"/><path d="M40 175 H195 V92 H365 V175 H520"/><circle cx="40" cy="165" r="8"/><circle cx="520" cy="165" r="8"/><path className="accent" d="M175 135 V72 H385 V135"/></svg><figcaption>{spec.label}</figcaption></figure>
  if(spec.type==='wet-glass')return <figure><svg {...common}><path d="M85 55 H205 L190 205 H100 Z"/><path d="M355 55 H475 L460 205 H370 Z"/><path className="water" d="M100 115 H190 L182 190 H108 Z"/><path className="water" d="M370 115 H460 L452 190 H378 Z"/><path className="accent dash" d="M348 70 Q330 100 348 130 Q330 160 348 190 M482 70 Q500 100 482 130 Q500 160 482 190"/><text x="92" y="35">обычный стакан</text><text x="348" y="35">мокрая бумага</text></svg><figcaption>{spec.label}</figcaption></figure>
  if(spec.type==='comb-water')return <figure><svg {...common}><path d="M90 55 h150 v26 h-150 z"/><path d="M105 81 v34 M130 81 v34 M155 81 v34 M180 81 v34 M205 81 v34 M230 81 v34"/><path className="water" d="M420 28 C420 90 395 115 355 130 C330 140 320 166 322 220"/><path className="accent dash" d="M250 108 C300 105 330 108 360 128"/><text x="84" y="42">расчёска</text><text x="400" y="30">вода</text></svg><figcaption>{spec.label}</figcaption></figure>
  if(spec.type==='balloon-pepper')return <figure><svg {...common}><ellipse cx="250" cy="80" rx="105" ry="58"/><path d="M250 138 q-12 18 0 34 q12-18 0-34"/><path className="accent dash" d="M230 145 C220 168 218 184 215 205 M270 145 C280 168 282 184 285 205"/>{[155,185,215,245,275,305,335].map((x,i)=><circle key={i} className="pepper" cx={x} cy={210-(i%2)*8} r="5"/>)}<text x="205" y="82">шарик</text><text x="175" y="232">крупинки перца</text></svg><figcaption>{spec.label}</figcaption></figure>
  if(spec.type==='comb-foil')return <figure><svg {...common}><path d="M80 48 h180 v28 h-180 z"/><path d="M95 76 v32 M125 76 v32 M155 76 v32 M185 76 v32 M215 76 v32 M245 76 v32"/><path className="accent dash" d="M165 112 C185 145 210 170 250 185"/><path d="M285 190 l22-12 16 18-24 10z M350 178 l20-14 18 20-24 12z M420 194 l18-16 20 18-20 14z"/><text x="82" y="35">расчёска</text><text x="300" y="228">листочки фольги</text></svg><figcaption>{spec.label}</figcaption></figure>
  if(spec.type==='ice-calorimeter')return <figure><svg {...common} viewBox="0 0 560 320"><path className="ice-body" d="M90 70 L280 28 L465 78 L465 258 L278 300 L90 252 Z"/><path className="ice-edge" d="M90 70 L278 118 L465 78 M278 118 L278 300"/><ellipse className="ice-cavity" cx="280" cy="168" rx="86" ry="62"/><path className="ice-lid" d="M204 135 Q280 98 356 135 L342 151 Q280 126 218 151 Z"/><path className="weight" d="M250 176 h60 l-7 56 h-46 z"/><ellipse className="weight" cx="280" cy="173" rx="31" ry="10"/><path className="weight" d="M270 153 q10-20 20 0"/><text x="365" y="292">лёд</text><text x="315" y="225">латунная гиря</text></svg><figcaption>{spec.label}</figcaption></figure>
  return null
}
