'use client'

import {useMemo,useState} from 'react'
import {searchOgeReference} from './oge-reference-data.mjs'
import styles from './oge-reference.module.css'

const scopes=[
  {id:'all',label:'Всё'},
  {id:'formulas',label:'Формулы'},
  {id:'units',label:'Величины и единицы'},
]

export default function OgeReference(){
  const [query,setQuery]=useState('')
  const [scope,setScope]=useState('all')
  const results=useMemo(()=>searchOgeReference(query,scope),[query,scope])
  const count=results.formulas.length+results.quantities.length

  return <section className={styles.reference} aria-labelledby="oge-reference-title">
    <header className={styles.referenceHead}>
      <div><span className={styles.eyebrow}>СПРАВОЧНИК</span><h2 id="oge-reference-title">Формулы, величины и единицы измерения</h2><p>Ищи по названию, обозначению или теме. Например: масса, скорость, плотность, закон Ома.</p></div>
      <span className={styles.totalBadge}>{count} {count===1?'результат':'результатов'}</span>
    </header>

    <div className={styles.searchPanel}>
      <label className={styles.searchField} htmlFor="oge-reference-search">
        <svg aria-hidden="true" className={styles.searchIcon} viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>
        <input id="oge-reference-search" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Например: масса" autoComplete="off" />
        {query&&<button type="button" className={styles.clearSearch} onClick={()=>setQuery('')} aria-label="Очистить поиск">×</button>}
      </label>
      <div className={styles.scopeTabs} role="tablist" aria-label="Что искать">
        {scopes.map(item=><button type="button" key={item.id} role="tab" aria-selected={scope===item.id} className={scope===item.id?styles.scopeActive:''} onClick={()=>setScope(item.id)}>{item.label}</button>)}
      </div>
    </div>

    {!count ? <div className={styles.emptyState}><strong>Ничего не найдено</strong><p>Попробуй другое слово или обозначение физической величины.</p><button type="button" onClick={()=>{setQuery('');setScope('all')}}>Показать весь справочник</button></div> : <div className={styles.results} aria-live="polite">
      {results.formulas.length>0&&<section className={styles.resultSection} aria-labelledby="oge-formulas-title">
        <div className={styles.sectionHeading}><div><span>01</span><h3 id="oge-formulas-title">Основные формулы</h3></div><small>{results.formulas.length}</small></div>
        <div className={styles.formulaGrid}>{results.formulas.map(item=><article className={styles.formulaCard} key={item.id}>
          <div className={styles.cardTop}><span>{item.section}</span><small>Кодификатор · {item.source}</small></div>
          <h4>{item.title}</h4>
          <div className={styles.equation}>{item.formula}</div>
          <p>{item.description}</p>
        </article>)}</div>
      </section>}
      {results.quantities.length>0&&<section className={styles.resultSection} aria-labelledby="oge-units-title">
        <div className={styles.sectionHeading}><div><span>02</span><h3 id="oge-units-title">Величины и единицы измерения</h3></div><small>{results.quantities.length}</small></div>
        <div className={styles.quantityGrid}>{results.quantities.map(item=><article className={styles.quantityCard} key={item.id}>
          <h4>{item.name}</h4>
          <div className={styles.symbolLine}><span>Обозначение</span><b>{item.symbols}</b></div>
          <div className={styles.unitLine}><span>СИ</span><b>{item.si}</b></div>
          {item.common!=='—'&&<div className={styles.unitLine}><span>Ещё встречаются</span><b>{item.common}</b></div>}
        </article>)}</div>
      </section>}
      <p className={styles.sourceNote}>Обозначения сверены с кодификатором ФИПИ ОГЭ по физике на 2026 год. Для поиска учитываются русские названия и привычные формулировки.</p>
    </div>}
  </section>
}
