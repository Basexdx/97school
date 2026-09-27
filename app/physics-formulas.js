'use client'

import {useMemo,useState} from 'react'
import {physicsFormulaCount,physicsFormulaSections,variableUnit} from './formulas-data'
import {renderFormula} from './formula-math'

const renderedFormulas=new Map(physicsFormulaSections.flatMap(section=>section.formulas.map(item=>[item.id,renderFormula(item.math)])))

const normalize=value=>String(value).toLocaleLowerCase('ru-RU').replaceAll('ё','е').replace(/\\(?:frac|sqrt)/g,'').replace(/[{}]/g,'').replace(/\s+/g,' ').trim()

export default function PhysicsFormulas({onBack,onHome}){
  const [query,setQuery]=useState('')
  const [activeSection,setActiveSection]=useState('Все разделы')
  const [openId,setOpenId]=useState(null)
  const words=normalize(query).split(' ').filter(Boolean)
  const sections=useMemo(()=>physicsFormulaSections.filter(section=>activeSection==='Все разделы'||section.title===activeSection).map(section=>({
    ...section,
    formulas:section.formulas.filter(item=>{
      const haystack=normalize([section.title,item.title,item.unit,item.math,item.description,...item.variables,...item.variables.map(variableUnit)].join(' '))
      return words.every(word=>haystack.includes(word))
    }),
  })).filter(section=>section.formulas.length),[query,activeSection])
  const count=sections.reduce((sum,section)=>sum+section.formulas.length,0)

  return <section className="fl-page">
    <div className="fl-toolbar"><header className="fl-hero"><div className="fl-hero-title"><div className="fl-hero-icon" aria-hidden="true">Σ</div><div className="fl-hero-copy"><h1>Формулы по физике</h1><p>Основные формулы школьной физики с обозначениями, единицами измерения и понятными объяснениями.</p></div></div><span className="fl-hero-count">▤&nbsp; {physicsFormulaCount} формул</span></header>
    <label className="fl-search"><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Поиск по названию, величине или слову…" autoComplete="off" aria-label="Поиск формулы"/>{query&&<button type="button" onClick={()=>setQuery('')} aria-label="Очистить поиск">×</button>}</label><div className="fl-header-actions"><button type="button" onClick={onBack}>← Назад</button><button type="button" onClick={onHome} aria-label="На страницу профиля">⌂ Домой</button></div></div>
    <nav className="fl-categories" aria-label="Разделы формул">{['Все разделы',...physicsFormulaSections.map(section=>section.title)].map(title=><button type="button" key={title} className={activeSection===title?'active':''} aria-current={activeSection===title?'true':undefined} onClick={()=>setActiveSection(title)}>{title}</button>)}</nav>
    <p className="fl-result" aria-live="polite">{query||activeSection!=='Все разделы'?`Найдено: ${count}`:`Общий перечень · ${physicsFormulaSections.length} разделов`}</p>
    {sections.map(section=><section key={section.title} className="fl-section" aria-label={section.title}>
      <h2><span className="fl-section-dot" aria-hidden="true"/>{section.title}<span className="fl-section-count">{section.formulas.length}</span></h2>
      <div className="fl-grid">{section.formulas.map((item,index)=>{
        const open=openId===item.id
        const resultSymbol=item.math.split(' = ')[0]
        const showResult=!resultSymbol.startsWith('\\')&&!item.variables.some(variable=>variable.split(' — ')[0]===resultSymbol)
        return <article className={`fl-card ${open?'fl-card-open':''}`} key={item.id}>
          <button type="button" className="fl-card-toggle" onClick={()=>setOpenId(open?null:item.id)} aria-expanded={open}>
            <span className="fl-card-index">{index+1}</span>
            <span className="fl-card-title">{item.title} <span className="fl-card-unit">({item.unit==='безразмерная'?'без ед.':item.unit})</span></span>
            <span className="fl-card-chevron" aria-hidden="true">⌄</span>
            <span className="fl-math" dangerouslySetInnerHTML={{__html:renderedFormulas.get(item.id)}}/>
          </button>
          <div className="fl-card-detail" hidden={!open}>
            <h3>Обозначения</h3>
            <ul>{showResult&&<li><span className="fl-variable-symbol" dangerouslySetInnerHTML={{__html:renderFormula(resultSymbol)}}/><span className="fl-variable-dash">—</span><span>{item.title.toLowerCase()}, <span className="fl-variable-unit">{item.unit==='безразмерная'?'без ед.':item.unit}</span></span></li>}{item.variables.map(variable=>{
              const [symbols,meaning]=variable.split(' — ')
              return <li key={variable}><span className="fl-variable-symbol" dangerouslySetInnerHTML={{__html:renderFormula(symbols)}}/><span className="fl-variable-dash">—</span><span>{meaning}, <span className="fl-variable-unit">{variableUnit(variable)}</span></span></li>
            })}</ul>
            <p>{item.description}</p>
          </div>
        </article>
      })}</div>
    </section>)}
    {!count&&<div className="fl-empty"><strong>Формула не найдена</strong><p>Попробуй другое слово или обозначение.</p></div>}
    <p className="fl-source">Формулы и пояснения подготовлены по предоставленному файлу «ФОРМУЛЫ.pdf».</p>
  </section>
}
