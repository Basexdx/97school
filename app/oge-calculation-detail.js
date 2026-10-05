'use client'

import TaskFigureViewer from './task-figure-viewer'
import {checkOgeCalculationAnswer,parseOgeCalculationNumber} from './oge-calculation-answer.mjs'
import styles from './oge-task-bank.module.css'

export default function OgeCalculationDetail({task,position,total,back,previous,next,navigate,saved,onSave}){
 const draft=saved||{answer:'',checked:false}
 const valid=parseOgeCalculationNumber(draft.answer)!==null
 const right=draft.checked&&checkOgeCalculationAnswer(task,draft.answer)
 const precision=task.answerTolerance==null?null:Math.max(0,Math.round(-Math.log10(2*task.answerTolerance)))
 function change(value){onSave({answer:value,checked:false})}
 function check(event){event.preventDefault();if(valid)onSave({...draft,checked:true})}
 return <article className={styles.detail}>
  <nav className={styles.topNav}><button onClick={back}>← К заданиям ОГЭ</button><span>{position} / {total}</span><div><button disabled={!previous} onClick={()=>previous&&navigate(previous)}>←</button><button disabled={!next} onClick={()=>next&&navigate(next)}>→</button></div></nav>
  <header className={styles.taskHead}><div><span className={styles.kicker}>{task.label} · {task.section}</span><h1>№ {task.sourceNo}</h1><div className={styles.pills}><span>Высокая сложность</span><span>Числовой ответ</span><span>{task.xp} XP</span></div></div><div className={styles.sourceBadge}>Задание {task.type}<small>формат ОГЭ</small></div></header>
  <section className={styles.question}>
   <div className={styles.questionLabel}><span>01</span><h2>Условие</h2></div><p className={styles.choicePrompt}>{task.text}</p>
   {(task.tables||[]).map((table,index)=><div className={styles.calculationTable} key={index} role="region" aria-label={`Таблица данных ${index+1}`} tabIndex={0}><table><caption>Данные к заданию № {task.sourceNo}</caption><tbody>{table.map((row,r)=><tr key={r}>{row.map((cell,c)=>c===0?<th scope="row" key={c}>{cell}</th>:<td key={c}>{cell}</td>)}</tr>)}</tbody></table></div>)}
   {task.figures.map((src,index)=><TaskFigureViewer label={`Рисунок к заданию № ${task.sourceNo}`} key={src}><figure className={styles.sourceFigure}><img src={src} alt={`${task.figureLabels?.[index]||'Рисунок'} к заданию № ${task.sourceNo}`} loading="lazy"/>{task.figureLabels?.[index]&&<figcaption>{task.figureLabels[index]}</figcaption>}</figure></TaskFigureViewer>)}
   <form onSubmit={check}>
    <label className={styles.answer}><span>Числовой ответ{task.unit?` (${task.unit})`:''}</span><div><input aria-describedby="oge-calculation-hint" inputMode="decimal" autoComplete="off" maxLength={100} value={draft.answer} onChange={event=>change(event.target.value)} placeholder="Введите число"/><em>{task.unit}</em></div></label>
    <p id="oge-calculation-hint" className={styles.answerNotice}>Введите результат{task.unit?` в ${task.unit}`:''} без единицы измерения. {precision!==null&&`Результат можно округлить ${precision===0?'до целого числа':`до ${precision} ${precision===1?'знака':'знаков'} после запятой`}. `}Можно использовать запятую, дробь или запись 1,15·10^8. Ответ сохраняется в этом браузере.</p>
    <button type="submit" className={styles.primary} disabled={!valid}>Проверить ответ</button>
   </form>
   {draft.checked&&<div role="status" className={`${styles.feedback} ${right?styles.right:styles.wrong}`}><strong>{right?'Числовой ответ верный!':'Пока неверно'}</strong><p>{right?'Можно переходить к следующему заданию.':'Проверьте вычисления и единицы измерения, затем попробуйте ещё раз.'}</p></div>}
  </section>
  <footer className={styles.bottomNav}><button disabled={!previous} onClick={()=>previous&&navigate(previous)}>← Предыдущая</button><span>{task.label} · № {task.sourceNo}</span><button disabled={!next} onClick={()=>next&&navigate(next)}>Следующая →</button></footer>
 </article>
}
