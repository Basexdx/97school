'use client'

import {useState} from 'react'
import {checkOgeClozeAnswer,ogeClozeAnswerReady,ogeClozeLetters,parseOgeClozeInput} from './oge-cloze-answer.mjs'
import styles from './oge-task-bank.module.css'

function Passage({text}){
  return text.split(/(\([АБВГ]\) ___)/g).map((part,index)=>/^\([АБВГ]\) ___$/.test(part)?<strong className={styles.clozeBlank} key={index}>{part}</strong>:part)
}

export default function OgeClozeDetail({task,position,total,back,previous,next,navigate,saved,onSave}){
  const [values,setValues]=useState(()=>Array.from({length:4},(_,i)=>saved[i]??''))
  const complete=ogeClozeAnswerReady(values,task)
  const isSaved=complete&&values.join('')===saved.join('')
  const checked=isSaved?checkOgeClozeAnswer(task,values):null
  function change(index,value){
    if(value===''){setValues(previous=>previous.map((item,i)=>i===index?'':item));return}
    const parsed=parseOgeClozeInput(value,task)
    if(parsed?.length===4)setValues(parsed)
    else if(parsed?.length===1)setValues(previous=>previous.map((item,i)=>i===index?parsed[0]:item))
  }
  function paste(event,index){
    const value=event.clipboardData.getData('text')
    const parsed=parseOgeClozeInput(value,task)
    if(parsed?.length===4){event.preventDefault();setValues(parsed)}
    else if(parsed?.length===1){event.preventDefault();change(index,value)}
  }
  return <article className={styles.detail}>
    <nav className={styles.topNav}><button type="button" onClick={back}>← К заданиям ОГЭ</button><span>{position} / {total}</span><div><button type="button" aria-label="Предыдущее задание" disabled={!previous} onClick={()=>previous&&navigate(previous)}>←</button><button type="button" aria-label="Следующее задание" disabled={!next} onClick={()=>next&&navigate(next)}>→</button></div></nav>
    <header className={styles.taskHead}><div><span className={styles.kicker}>{task.label} · {task.section}</span><h1>№ {task.sourceNo}</h1><div className={styles.pills}><span>ОГЭ по физике</span><span>Пропуски в тексте</span></div></div><div className={styles.sourceBadge}>Задание 4<small>формат ОГЭ</small></div></header>
    <section className={styles.question}>
      <div className={styles.questionLabel}><span>01</span><h2>Условие</h2></div>
      <div className={styles.clozePassage}>{task.text.split('\n\n').map((paragraph,index)=><p key={index}><Passage text={paragraph}/></p>)}</div>
      {task.figures.map((src,index)=><figure className={styles.sourceFigure} key={src}><img src={src} alt={`Рисунок к заданию № ${task.sourceNo}, часть ${index+1}`} loading="lazy"/><figcaption>Рисунок к заданию № {task.sourceNo}</figcaption></figure>)}
      <h3 className={styles.choiceHeading}>Слова и словосочетания</h3>
      <ol className={styles.clozeOptions}>{task.options.map((option,index)=><li key={index}><b aria-hidden="true">{index+1}</b><span>{option}</span></li>)}</ol>
      <form onSubmit={event=>{event.preventDefault();if(complete&&!isSaved)onSave([...values])}}>
        <fieldset className={styles.matchingFields}><legend>Ответ в порядке А — Б — В — Г</legend>
          <div className={`${styles.matchingAnswerTable} ${styles.clozeAnswerTable}`}>{ogeClozeLetters.map((letter,index)=><label key={letter}><strong>{letter}</strong><input type="text" inputMode="numeric" autoComplete="off" maxLength={4} aria-label={`Номер слова для пропуска ${letter}`} aria-describedby={`cloze-help-${task.id}`} value={values[index]} onChange={event=>change(index,event.target.value)} onPaste={event=>paste(event,index)}/></label>)}</div>
          <small className={styles.matchingHelp} id={`cloze-help-${task.id}`}>В каждой ячейке — номер от 1 до {task.options.length}. Цифры могут повторяться. Ответ из четырёх цифр можно вставить целиком.</small>
        </fieldset>
        {values.some(Boolean)&&<ul className={styles.clozeSelection} aria-label="Выбранные слова">{ogeClozeLetters.map((letter,index)=><li key={letter}><b>{letter}</b><span>{values[index]?task.options[values[index]-1]:'Не выбрано'}</span></li>)}</ul>}
        <button type="submit" className={styles.primary} disabled={!complete||isSaved}>{isSaved?'Ответ проверен':'Проверить ответ'}</button>
      </form>
      {checked!==null?<div role="status" className={`${styles.feedback} ${checked?styles.right:styles.wrong}`}><strong>{checked?'Верно!':'Пока неверно'}</strong><p>{checked?task.explanation:'Проверьте номера слов и их порядок: А, Б, В, Г. Затем попробуйте ещё раз.'}</p></div>:<p className={styles.answerNotice}>Заполните все четыре пропуска и проверьте ответ. Результат сохранится после обновления страницы.</p>}
    </section>
    <footer className={styles.bottomNav}><button type="button" disabled={!previous} onClick={()=>previous&&navigate(previous)}>← Предыдущая</button><span>{task.label} · № {task.sourceNo}</span><button type="button" disabled={!next} onClick={()=>next&&navigate(next)}>Следующая →</button></footer>
  </article>
}
