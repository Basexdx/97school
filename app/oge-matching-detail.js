'use client'

import {useState} from 'react'
import {ogeMatchingAnswerReady,parseOgeMatchingValue,checkOgeMatchingAnswer} from './oge-matching-answer.mjs'
import {sectionsForTask} from './oge-task-filters.mjs'
import styles from './oge-task-bank.module.css'

export default function OgeMatchingDetail({task,position,total,back,previous,next,navigate,saved=[],onSave}){
  const [answer,setAnswer]=useState(()=>saved.length?saved:task.left.map(()=>''))
  const [result,setResult]=useState(()=>saved.length?checkOgeMatchingAnswer(task,saved):null)
  const ready=ogeMatchingAnswerReady(answer,task)
  const isSaved=ready&&answer.every((value,index)=>value===saved[index])
  function change(index,value){
    const parsed=parseOgeMatchingValue(value,task)
    if(parsed!==null){setAnswer(previous=>previous.map((item,i)=>i===index?parsed:item));setResult(null)}
  }
  function save(event){event.preventDefault();if(ready&&!isSaved){setResult(checkOgeMatchingAnswer(task,answer));onSave([...answer])}}

  return <article className={styles.detail}>
    <nav className={styles.topNav}><button onClick={back}>← К заданиям ОГЭ</button><span>{position} / {total}</span><div><button disabled={!previous} onClick={()=>previous&&navigate(previous)}>←</button><button disabled={!next} onClick={()=>next&&navigate(next)}>→</button></div></nav>
    <header className={styles.taskHead}><div><span className={styles.kicker}>{task.label} · {sectionsForTask(task).join(' · ')}</span><h1>№ {task.sourceNo}</h1><div className={styles.pills}><span>ОГЭ по физике</span><span>Соответствие</span></div></div><div className={styles.sourceBadge}>Задание 1<small>формат ОГЭ</small></div></header>
    <section className={styles.question}>
      <div className={styles.questionLabel}><span>01</span><h2>Условие</h2></div><p className={styles.choicePrompt}>{task.text}</p>
      <div className={styles.matchingColumns}>
        <section><h3>{task.leftTitle}</h3>{task.left.map(item=><div className={styles.matchingItem} key={item.id}><b>{item.id}</b><span>{item.text}</span></div>)}</section>
        <section><h3>{task.rightTitle}</h3>{task.right.map(item=><div className={styles.matchingItem} key={item.id}><b>{item.id}</b><span>{item.text}</span></div>)}</section>
      </div>
      <form onSubmit={save}>
        <fieldset className={styles.matchingFields}><legend>Ответ</legend><div className={styles.matchingAnswerTable}>{task.left.map((item,index)=><label key={item.id}><strong>{item.id}</strong><input type="text" inputMode="numeric" autoComplete="off" value={answer[index]} onChange={event=>change(index,event.target.value)} placeholder="№" aria-label={`Ответ для ${item.id}`} aria-describedby="oge-matching-help" required/></label>)}</div></fieldset>
        <small className={styles.matchingHelp} id="oge-matching-help">В каждом поле — номер варианта от 1 до {task.right.length}. Порядок ответов: А, Б, В.</small>
        <button className={styles.primary} disabled={!ready||isSaved}>{isSaved?'Ответ сохранён':task.answer?'Проверить ответ':'Сохранить ответ'}</button>
      </form>
      <p className={styles.answerNotice} aria-live="polite">{result===true?'Верно! Ответ сохранён.':result===false?'Пока неверно. Проверь соответствия и попробуй ещё.':isSaved?'Ответ сохранён. Он останется после обновления страницы.':'Заполните все три поля и проверьте ответ.'}</p>
    </section>
    <footer className={styles.bottomNav}><button disabled={!previous} onClick={()=>previous&&navigate(previous)}>← Предыдущая</button><span>{task.label} · № {task.sourceNo}</span><button disabled={!next} onClick={()=>next&&navigate(next)}>Следующая →</button></footer>
  </article>
}
