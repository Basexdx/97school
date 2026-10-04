'use client'

import {useEffect,useState} from 'react'
import {createPortal} from 'react-dom'
import {grade8Lessons} from './grade8-lessons'
import Grade8Diagram from './grade8-diagrams'
import {grade8Definitions} from './grade8-definitions'
import PhysicsFormulas from './physics-formulas'
import OgeTaskBank from './oge-task-bank'

const VIEWED_KEY='genius:viewed-tasks:v17'
const SOLVED_KEY='genius:solved-tasks:v17'
const CONSTANTS=[
  ['g','9,8 Н/кг','Ускорение свободного падения у поверхности Земли'],
  ['c','3,0 · 10⁸ м/с','Скорость света в вакууме'],
  ['G','6,67 · 10⁻¹¹ Н·м²/кг²','Гравитационная постоянная'],
  ['e','1,60 · 10⁻¹⁹ Кл','Модуль элементарного электрического заряда'],
  ['k','9,0 · 10⁹ Н·м²/Кл²','Коэффициент в законе Кулона'],
  ['h','6,63 · 10⁻³⁴ Дж·с','Постоянная Планка'],
  ['Nₐ','6,02 · 10²³ моль⁻¹','Постоянная Авогадро'],
  ['ρ воды','1000 кг/м³','Плотность воды (школьное табличное значение)'],
  ['c воды','4200 Дж/(кг·°C)','Удельная теплоёмкость воды'],
]

const normalize=value=>String(value||'').toLocaleLowerCase('ru-RU').replaceAll('ё','е').replace(/\s+/g,' ').trim()
const loadSet=key=>{try{return new Set(JSON.parse(localStorage.getItem(key)||'[]'))}catch{return new Set()}}
const saveSet=(key,set)=>{try{localStorage.setItem(key,JSON.stringify([...set]))}catch{}}

function taskDomId(button){return button?.id||''}
function gradeFromDomId(id){if(id.startsWith('grade7-task-'))return 7;if(id.startsWith('grade9-task-'))return 9;if(id.startsWith('task-'))return 8;return null}
function areaFromText(text,grade){
  if(grade===7||grade===9)return 'Механические явления'
  const s=normalize(text)
  if(/свет|линз|зеркал|оптик|луч|изображен/.test(s))return 'Оптика'
  if(/тепл|температур|плав|кристалл|кипен|испар|пар|влаж|топлив|внутренн.*энерг|теплоем|количеств.*теплот/.test(s))return 'Тепловые явления'
  if(/ток|напряж|сопротив|электр|заряд|магнит|ампер|вольт|цеп/.test(s))return 'Электрические явления'
  return 'Механические явления'
}
function activeGrade(){
  const select=document.querySelector('.task-bank-grade select')
  if(select)return Number(select.value)
  const button=[...document.querySelectorAll('.task-grade-switch button')].find(x=>x.getAttribute('aria-selected')==='true'||x.classList.contains('active'))
  const match=button?.textContent?.match(/[789]/)
  return match?Number(match[0]):null
}
function gradeSections(grade){
  if(grade===7)return 'Механические явления · Измерения'
  if(grade===8)return 'Тепловые явления · Электрические явления · Оптика'
  if(grade===9)return 'Механические явления'
  return ''
}
function countByGrade(set,grade){return [...set].filter(id=>gradeFromDomId(id)===grade).length}

export default function GeniusV17Enhancer(){
  const [lessonAnchor,setLessonAnchor]=useState(null)
  const [lessonParagraph,setLessonParagraph]=useState(null)

  useEffect(()=>{
    let scheduled=false
    function schedule(){
      if(scheduled)return
      scheduled=true
      requestAnimationFrame(()=>{scheduled=false;scan()})
    }
    function scan(){
      const landingText=document.querySelector('.landing-v15-copy > p')
      if(landingText&&landingText.textContent?.includes('ОГЭ'))landingText.textContent='Учебник, задачи и справочные материалы по физике — в одной системе.'
      const ogeCard=document.getElementById('oge')
      if(ogeCard)ogeCard.style.display='none'

      const hub=document.querySelector('.task-bank-hub')
      if(hub)enhanceTaskBank(hub)

      const shell=document.querySelector('.lesson-dark-shell')
      if(shell){
        shell.classList.add('genius-v17-source-hidden')
        let anchor=shell.nextElementSibling?.matches?.('[data-genius-v17-lesson]')?shell.nextElementSibling:null
        if(!anchor){anchor=document.createElement('div');anchor.dataset.geniusV17Lesson='1';shell.insertAdjacentElement('afterend',anchor)}
        const match=shell.querySelector('.lesson-dark-topbar b')?.textContent?.match(/\d+/)
        const paragraph=match?Number(match[0]):null
        if(lessonAnchor!==anchor)setLessonAnchor(anchor)
        if(lessonParagraph!==paragraph)setLessonParagraph(paragraph)
      }else{
        if(lessonAnchor)setLessonAnchor(null)
        if(lessonParagraph)setLessonParagraph(null)
      }

    }
    function onClick(event){
      const tile=event.target.closest?.('button[id^="task-"],button[id^="grade7-task-"],button[id^="grade9-task-"]')
      if(tile){const viewed=loadSet(VIEWED_KEY);viewed.add(taskDomId(tile));saveSet(VIEWED_KEY,viewed);setTimeout(schedule,40)}
    }
    const observer=new MutationObserver(schedule)
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-selected']})
    document.addEventListener('click',onClick,true)
    scan()
    return()=>{observer.disconnect();document.removeEventListener('click',onClick,true)}
  },[lessonAnchor,lessonParagraph])

  return <>
    {lessonAnchor&&lessonParagraph&&createPortal(<OnePageLesson paragraph={lessonParagraph}/>,lessonAnchor)}
  </>
}

function enhanceTaskBank(hub){
  if(hub.dataset.nativeLayout==='true')return
  const viewed=loadSet(VIEWED_KEY),solved=loadSet(SOLVED_KEY)
  const tiles=[...hub.querySelectorAll('button[id^="task-"],button[id^="grade7-task-"],button[id^="grade9-task-"]')]
  for(const tile of tiles){
    const id=taskDomId(tile),grade=gradeFromDomId(id)
    if(/Решено/i.test(tile.textContent||''))solved.add(id)
    tile.classList.add('genius-enhanced-task')
    let row=tile.querySelector(':scope > .genius-task-meta-row')
    if(!row){row=document.createElement('div');row.className='genius-task-meta-row';tile.firstElementChild?.insertAdjacentElement('afterend',row)}
    const status=solved.has(id)?'solved':viewed.has(id)?'viewed':'new'
    row.innerHTML=`<span class="genius-physics-area">${areaFromText(tile.textContent,grade)}</span><span class="genius-task-status ${status}">${status==='solved'?'Решено':status==='viewed'?'Просмотрено':'Новая'}</span>`
  }
  saveSet(SOLVED_KEY,solved)

  const grade=activeGrade()
  const root=hub.querySelector('.bank-page')||hub.querySelector('div[class*="_page__"]')||hub.querySelector('div[class*="_page_"]')
  if(!root||!grade)return
  root.classList.add('genius-task-bank-page')
  const hero=root.querySelector('.bank-hero')||root.querySelector('section[class*="_hero__"]')||root.querySelector('section[class*="_hero_"]')
  if(!hero)return
  hero.classList.add('genius-bank-hero')
  let compact=hero.querySelector('.genius-bank-compact')
  if(!compact){compact=document.createElement('div');compact.className='genius-bank-compact';hero.querySelector('h1')?.insertAdjacentElement('afterend',compact)}
  const active=[...hub.querySelectorAll('.task-grade-switch button')].find(x=>x.getAttribute('aria-selected')==='true'||x.classList.contains('active'))
  const total=Number(active?.querySelector('small')?.textContent?.match(/\d+/)?.[0]||0)
  const solvedCount=countByGrade(solved,grade),viewedCount=Math.max(0,countByGrade(viewed,grade)-solvedCount),remaining=Math.max(0,total-solvedCount-viewedCount)
  compact.innerHTML=`<div class="genius-bank-sections"><span>Разделы</span><b>${gradeSections(grade)}</b></div><div class="genius-bank-mini-stats"><span><b>${solvedCount}</b><small>решено</small></span><span><b>${viewedCount}</b><small>просмотрено</small></span><span><b>${remaining}</b><small>осталось</small></span></div>`
}

export function ReferenceOverlay({mode,close,onMenu,returnToTask}){
  return <div className={`genius-reference-overlay ${mode==='formulas'?'formula-reference-overlay':mode==='fipi'?'fipi-reference-overlay':''}`}>
    {mode!=='formulas'&&mode!=='fipi'&&<header className="genius-reference-top"><button onClick={close}>← Назад</button><strong>Основные формулы</strong><button onClick={onMenu} aria-label="В меню">⌂ Меню</button></header>}
    {mode==='formulas'&&<header className="genius-reference-top formula-mobile-top"><button onClick={close}>← Назад</button><button onClick={onMenu} aria-label="На главную страницу">⌂ Домой</button></header>}
    <main className="genius-reference-scroll">{mode==='constants'?<ConstantsReference/>:mode==='formulas'?<PhysicsFormulas onBack={close} onHome={onMenu}/>:<div className="genius-fipi-wrap"><OgeTaskBank onBack={close} onHome={onMenu}/></div>}</main>
    {returnToTask&&<button className="genius-return-task" onClick={close}>← Вернуться к задаче</button>}
  </div>
}

function ConstantsReference(){
  return <section className="genius-reference-page"><div className="genius-reference-hero"><span>СПРАВОЧНИК 7–9 КЛАСС</span><h1>Постоянные величины</h1><p>Короткая таблица величин, которые часто используются в школьных задачах по физике.</p></div><div className="genius-constant-grid">{CONSTANTS.map(([symbol,value,title])=><article key={symbol}><div>{symbol}</div><strong>{value}</strong><p>{title}</p></article>)}</div></section>
}

function OnePageLesson({paragraph}){
  const lesson=grade8Lessons.find(item=>item.paragraph===paragraph)
  if(!lesson)return null
  const ideas=lesson.steps.filter(item=>item.type!=='summary')
  const firstDefinition=lesson.keyPoints.find(point=>/\s[—–]\s/.test(point))||lesson.keyPoints[0]
  const [definitionTerm,definitionText]=grade8Definitions[paragraph]||(/\s[—–]\s/.test(firstDefinition)?[firstDefinition.split(/\s[—–]\s/)[0],firstDefinition.split(/\s[—–]\s/).slice(1).join(' — ')]:[ideas[0]?.title,firstDefinition])
  const chapter=lesson.chapter==='magnetic'?'Электромагнитные явления':lesson.chapter==='electric'?'Электрические явления':'Тепловые явления'
  function sourceButton(selector){document.querySelector(`.lesson-dark-shell ${selector}`)?.click()}
  return <article className="genius-one-page-lesson g8-textbook-page">
    <div className="genius-lesson-top"><button onClick={()=>sourceButton('.lesson-dark-topbar > button:first-child')}>← К урокам</button><span>8 класс › {chapter} › §{lesson.paragraph}</span><button onClick={()=>sourceButton('.offline-download-btn, .offline-saved-btn')}>⇩ Офлайн</button></div>
    <header className="genius-lesson-hero g8-textbook-hero"><div className="g8-hero-copy"><span>§{lesson.paragraph}</span><div><h1>{lesson.title}</h1><p>{lesson.teaser}</p><small>Учебник: стр. {lesson.pages} · ~{lesson.duration} мин</small></div></div><div className="g8-hero-art" aria-hidden="true"><i/><i/><b>{lesson.chapter==='magnetic'?'⊙':lesson.chapter==='electric'?'ϟ':'⚛'}</b></div></header>
    <div className="g8-opening-grid">
      <section className="g8-opening-card"><div className="g8-section-title"><span>1</span><h2>{ideas[0]?.title||'Главная идея'}</h2></div><p>{ideas[0]?.text||lesson.teaser}</p><div className="g8-definition"><div className="g8-book-icon" aria-hidden="true">▣</div><p><strong>{definitionTerm}</strong> — {definitionText}</p></div></section>
      <Grade8Diagram lesson={lesson}/>
    </div>
    {lesson.formula&&<section className="genius-lesson-formula"><span>ФОРМУЛА</span><div>{lesson.formula}</div></section>}
    <div className="g8-lesson-continuation">{ideas.slice(1).map((step,i)=><section key={`${step.title}-${i}`} className="g8-topic-card"><div className="g8-section-title"><span>{i+2}</span><h2>{step.title}</h2></div><p>{step.text}</p>{step.definition&&<div className="g8-definition"><div className="g8-book-icon" aria-hidden="true">▣</div><p><strong>{step.title}.</strong> {step.text}</p></div>}</section>)}</div>
    <section className="g8-recap"><span>ЗАПОМНИ</span><h2>Главное в §{lesson.paragraph}</h2><ul>{lesson.keyPoints.map((point,i)=><li key={i}>{point}</li>)}</ul></section>
    <footer className="genius-lesson-summary"><span>ИТОГ УРОКА</span><h2>{lesson.shortTitle}</h2><p>{lesson.steps.find(step=>step.type==='summary')?.text||lesson.keyPoints.at(-1)}</p><button onClick={()=>sourceButton('.lesson-dark-topbar > button:first-child')}>← К списку уроков</button></footer>
  </article>
}
