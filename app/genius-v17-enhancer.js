'use client'

import {useEffect,useMemo,useState} from 'react'
import {createPortal} from 'react-dom'
import {grade8Lessons} from './grade8-lessons'
import {ogeFormulas,searchOgeReference} from './oge-reference-data.mjs'
import OgeTaskBank from './oge-task-bank'

const VIEWED_KEY='genius:viewed-tasks:v17'
const SOLVED_KEY='genius:solved-tasks:v17'
const FIGURES={1:'/lesson-figures/lesson-1.webp',2:'/lesson-figures/lesson-2.webp',10:'/lesson-figures/lesson-10.webp',13:'/lesson-figures/lesson-13.webp',17:'/lesson-figures/lesson-17.webp'}
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
  const [navAnchor,setNavAnchor]=useState(null)
  const [searchAnchor,setSearchAnchor]=useState(null)
  const [lessonAnchor,setLessonAnchor]=useState(null)
  const [lessonParagraph,setLessonParagraph]=useState(null)
  const [mode,setMode]=useState(null)
  const [returnToTask,setReturnToTask]=useState(false)

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

      const nav=document.querySelector('.sidebar-light nav')
      if(nav){
        const oldOge=[...nav.querySelectorAll(':scope > button')].find(button=>button.textContent?.includes('Подготовка к ОГЭ'))
        if(oldOge)oldOge.style.display='none'
        let anchor=nav.querySelector('[data-genius-v17-nav]')
        if(!anchor){
          anchor=document.createElement('span');anchor.dataset.geniusV17Nav='1';anchor.className='genius-v17-nav-anchor'
          const buttons=[...nav.querySelectorAll(':scope > button')]
          const after=buttons.find(button=>button.textContent?.includes('Учебник'))
          if(after)after.insertAdjacentElement('afterend',anchor);else nav.append(anchor)
        }
        if(navAnchor!==anchor)setNavAnchor(anchor)
      }else if(navAnchor)setNavAnchor(null)

      const hub=document.querySelector('.task-bank-hub')
      if(hub){
        let anchor=hub.querySelector('[data-genius-v17-search]')
        if(!anchor){anchor=document.createElement('div');anchor.dataset.geniusV17Search='1';anchor.className='genius-global-search-anchor';const switcher=hub.querySelector('.task-grade-switch');switcher?.insertAdjacentElement('afterend',anchor)}
        if(searchAnchor!==anchor)setSearchAnchor(anchor)
        enhanceTaskBank(hub)
      }else if(searchAnchor)setSearchAnchor(null)

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

      const fipiHeading=[...document.querySelectorAll('h1')].find(x=>x.textContent?.trim()==='Задачи ОГЭ')
      if(fipiHeading&&fipiHeading.closest('.genius-reference-overlay'))fipiHeading.textContent='Банк задач ФИПИ'
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
  },[navAnchor,searchAnchor,lessonAnchor,lessonParagraph])

  function openReference(next){
    const taskActive=Boolean(document.querySelector('.bank-detail, article[class*="_detail__"], article[class*="_detail_"]'))
    setReturnToTask(taskActive)
    setMode(next)
  }

  return <>
    {navAnchor&&createPortal(<>
      <button className={`side-nav genius-ref-nav ${mode==='constants'?'active':''}`} onClick={()=>openReference('constants')}><span>π</span>Постоянные величины</button>
      <button className={`side-nav genius-ref-nav ${mode==='formulas'?'active':''}`} onClick={()=>openReference('formulas')}><span>Σ</span>Основные формулы</button>
      <button className={`side-nav genius-ref-nav ${mode==='fipi'?'active':''}`} onClick={()=>openReference('fipi')}><span>Ф</span>Банк задач ФИПИ</button>
    </>,navAnchor)}
    {searchAnchor&&createPortal(<GlobalTaskSearch/>,searchAnchor)}
    {lessonAnchor&&lessonParagraph&&createPortal(<OnePageLesson paragraph={lessonParagraph}/>,lessonAnchor)}
    {mode&&createPortal(<ReferenceOverlay mode={mode} close={()=>setMode(null)} returnToTask={returnToTask}/>,document.body)}
  </>
}

function enhanceTaskBank(hub){
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

function GlobalTaskSearch(){
  const [items,setItems]=useState([]),[query,setQuery]=useState(''),[scope,setScope]=useState('all'),[loading,setLoading]=useState(true)
  useEffect(()=>{let live=true;fetch('/task-bank/search-all.json',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(data=>{if(live)setItems(data.tasks||[])}).catch(()=>{}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[])
  const results=useMemo(()=>{
    const q=normalize(query);if(q.length<2)return []
    return items.filter(item=>(scope==='all'||item.grade===Number(scope))&&item.searchText.includes(q)).slice(0,60)
  },[items,query,scope])
  function openResult(item){
    const targetButton=[...document.querySelectorAll('.task-grade-switch button')].find(button=>button.textContent?.includes(`${item.grade} класс`))
    targetButton?.click()
    const selector=item.grade===7?`#grade7-task-${CSS.escape(item.id)}`:item.grade===9?`#grade9-task-${CSS.escape(item.id)}`:`#task-${CSS.escape(item.id)}`
    let count=0
    const timer=setInterval(()=>{const tile=document.querySelector(selector);if(tile){clearInterval(timer);tile.scrollIntoView({block:'center',behavior:'smooth'});setTimeout(()=>tile.click(),180)}else if(++count>35)clearInterval(timer)},90)
  }
  return <section className="genius-global-search">
    <div className="genius-global-search-head"><div><span>ПОИСК ПО БАНКУ</span><h2>Найти задачу по словам</h2></div><div className="genius-search-scopes">{[['all','Весь банк'],['7','7 класс'],['8','8 класс'],['9','9 класс']].map(([key,label])=><button key={key} className={scope===key?'active':''} onClick={()=>setScope(key)}>{label}</button>)}</div></div>
    <label className="genius-global-search-box"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Например: плотность, поезд, сила тока, нагрев воды…"/>{query&&<button type="button" onClick={()=>setQuery('')}>×</button>}</label>
    {query.trim().length>=2&&<div className="genius-search-results"><div className="genius-search-result-count">{loading?'Загружаю индекс…':`Найдено: ${results.length}`}</div>{results.map(item=><button key={`${item.grade}-${item.id}`} onClick={()=>openResult(item)}><div><span>{item.grade} класс</span><em>{item.area}</em>{item.bookNumber&&<small>№ {item.bookNumber}</small>}</div><strong>{item.topic}</strong><p>{item.excerpt}</p></button>)}</div>}
  </section>
}

function ReferenceOverlay({mode,close,returnToTask}){
  return <div className="genius-reference-overlay">
    <header className="genius-reference-top"><button onClick={close}>← Назад</button><strong>Genius · справочник</strong><button onClick={close}>×</button></header>
    <main className="genius-reference-scroll">{mode==='constants'?<ConstantsReference/>:mode==='formulas'?<FormulaReference/>:<div className="genius-fipi-wrap"><OgeTaskBank/></div>}</main>
    {returnToTask&&<button className="genius-return-task" onClick={close}>← Вернуться к задаче</button>}
  </div>
}

function ConstantsReference(){
  return <section className="genius-reference-page"><div className="genius-reference-hero"><span>СПРАВОЧНИК 7–9 КЛАСС</span><h1>Постоянные величины</h1><p>Короткая таблица величин, которые часто используются в школьных задачах по физике.</p></div><div className="genius-constant-grid">{CONSTANTS.map(([symbol,value,title])=><article key={symbol}><div>{symbol}</div><strong>{value}</strong><p>{title}</p></article>)}</div></section>
}

function FormulaReference(){
  const [query,setQuery]=useState('')
  const results=useMemo(()=>searchOgeReference(query,ogeFormulas),[query])
  const groups=useMemo(()=>results.reduce((acc,item)=>{(acc[item.section]??=[]).push(item);return acc},{}),[results])
  return <section className="genius-reference-page"><div className="genius-reference-hero"><span>СПРАВОЧНИК 7–9 КЛАСС</span><h1>Основные формулы</h1><p>Найди нужную формулу по названию величины, обозначению или слову из условия задачи.</p></div><label className="genius-formula-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Например: масса, давление, теплота, сопротивление…"/>{query&&<button onClick={()=>setQuery('')}>×</button>}</label>{Object.entries(groups).map(([section,items])=><section className="genius-formula-group" key={section}><h2>{section}<span>{items.length}</span></h2><div className="genius-formula-grid">{items.map(item=><article key={item.id}><small>{item.title}</small><div>{item.formula}</div><ul>{item.variables.map(v=><li key={v}>{v}</li>)}</ul></article>)}</div></section>)}</section>
}

function OnePageLesson({paragraph}){
  const lesson=grade8Lessons.find(item=>item.paragraph===paragraph)
  if(!lesson)return null
  const figure=FIGURES[paragraph]
  function sourceButton(selector){document.querySelector(`.lesson-dark-shell ${selector}`)?.click()}
  return <article className="genius-one-page-lesson">
    <div className="genius-lesson-top"><button onClick={()=>sourceButton('.lesson-dark-topbar > button:first-child')}>← К урокам</button><span>8 класс · §{lesson.paragraph} · стр. {lesson.pages}</span><button onClick={()=>sourceButton('.offline-download-btn, .offline-saved-btn')}>⇩ Офлайн</button></div>
    <header className="genius-lesson-hero"><div><span>§{lesson.paragraph}</span><h1>{lesson.title}</h1><p>{lesson.teaser}</p></div><div className="genius-lesson-orbit"><i/><i/><b>⚛</b></div></header>
    <section className="genius-lesson-lead"><h2>Что важно понять</h2><div>{lesson.objectives.map(item=><p key={item}><span>•</span>{item}</p>)}</div></section>
    {figure&&<figure className="genius-textbook-figure"><img src={figure} alt={`Иллюстрация к §${paragraph} из учебника`}/><figcaption>Иллюстрация из учебника к §{paragraph}. В приложении она используется как часть объяснения, а не как отдельная страница учебника.</figcaption></figure>}
    <section className="genius-key-points"><div className="genius-section-kicker">ОСНОВНЫЕ ПОЛОЖЕНИЯ</div><h2>Ключевые мысли урока</h2><div className="genius-key-grid">{lesson.keyPoints.map((item,i)=><article key={item}><span>{String(i+1).padStart(2,'0')}</span><p>{item}</p></article>)}</div></section>
    {lesson.formula&&<section className="genius-lesson-formula"><span>ФОРМУЛА</span><div>{lesson.formula}</div></section>}
    <div className="genius-lesson-sections">{lesson.steps.map((step,i)=><section key={`${step.title}-${i}`}><div className="genius-lesson-section-no">{String(i+1).padStart(2,'0')}</div><div className="genius-lesson-section-copy"><h2>{step.title}</h2><p>{step.text}</p><LessonConceptVisual type={step.type}/></div></section>)}</div>
    <footer className="genius-lesson-summary"><span>ИТОГ</span><h2>{lesson.shortTitle}</h2><p>{lesson.keyPoints.at(-1)||lesson.teaser}</p><button onClick={()=>sourceButton('.lesson-dark-topbar > button:first-child')}>Вернуться к списку уроков</button></footer>
  </article>
}

function LessonConceptVisual({type}){
  if(['brownian','diffusion','states','solid','liquid','gas','crystal','interaction'].includes(type))return <div className={`genius-concept-visual particles ${type}`}><i/><i/><i/><i/><i/><i/><b>движение частиц</b></div>
  if(['conduction','convection','radiation','heat-quantity','specific-heat','heat-balance','fuel','fuel-calc','energy-conservation','energy-flow'].includes(type))return <div className="genius-concept-visual energy"><span>Q</span><em>→</em><span>ΔU</span><b>передача и превращение энергии</b></div>
  if(['phase-change','phase-graph','latent-heat','latent-heat-calc','evaporation','evaporation-controls','condensation','vapor-equilibrium','boiling','boiling-graph','pressure-boiling','vaporization-heat','vaporization-calc'].includes(type))return <div className="genius-concept-visual phase"><span>❄</span><em>⇄</em><span>💧</span><em>⇄</em><span>≈</span><b>изменение состояния вещества</b></div>
  if(['electrostatics','charge-interaction','elementary-charge','electron','charge-count','charge-transfer','charge-conservation','induction','static-use','grounding','coulomb','electric-field','field-lines','field-superposition','electroscope','conductors','atom','ions'].includes(type))return <div className="genius-concept-visual charge"><span>+</span><em>↔</em><span>−</span><b>электрическое взаимодействие</b></div>
  if(['current-source','source','source-types','circuit','circuit-symbols','metal-current','current-direction','current-effects','electrolysis','magnetic-current','current-meter','current-calc','ammeter','voltage','voltage-calc','voltmeter','resistance','ohm','ohm-lab'].includes(type))return <div className="genius-concept-visual circuit"><span>＋</span><i/><span>💡</span><i/><span>−</span><b>электрическая цепь</b></div>
  return null
}
