'use client'

import {useEffect,useMemo,useState} from 'react'
import {createPortal} from 'react-dom'
import {ogeFormulas,ogeQuantities,ogeUnits,searchOgeReference} from './oge-reference-data.mjs'
import styles from './oge-reference.module.css'

const tabs=[
  ['formulas','Основные формулы'],
  ['quantities','Величины'],
  ['units','Единицы измерения'],
]

export default function OgeReferenceMount(){
  const [target,setTarget]=useState(null)

  useEffect(()=>{
    let anchor=null
    const locate=()=>{
      let insertAfter=null

      // Dedicated OGE task bank screen.
      const heading=[...document.querySelectorAll('h1')].find(node=>node.textContent?.trim()==='Задачи ОГЭ')
      if(heading){
        insertAfter=heading.closest('section')
      }

      // Current student OGE course screen. The OGE bank is rendered through CourseScreen,
      // so there is no "Задачи ОГЭ" heading here. Mount the reference under the OGE tabs.
      if(!insertAfter){
        const courseTabs=[...document.querySelectorAll('.course-tabs')].find(node=>{
          const active=node.querySelector('button.active')
          return active?.textContent?.includes('Подготовка к ОГЭ')
        })
        if(courseTabs){
          const gradeRow=courseTabs.parentElement?.querySelector('.grade-mini-row')
          insertAfter=gradeRow||courseTabs
        }
      }

      if(!insertAfter){
        if(anchor?.isConnected)anchor.remove()
        anchor=null
        setTarget(null)
        return
      }

      if(anchor?.isConnected){
        if(anchor.previousElementSibling!==insertAfter)insertAfter.insertAdjacentElement('afterend',anchor)
        return
      }

      anchor=document.createElement('div')
      anchor.id='genius-oge-reference-anchor'
      insertAfter.insertAdjacentElement('afterend',anchor)
      setTarget(anchor)
    }

    locate()
    const observer=new MutationObserver(locate)
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']})
    return()=>{observer.disconnect();if(anchor?.isConnected)anchor.remove()}
  },[])

  return target?createPortal(<OgeReference/>,target):null
}

function OgeReference(){
  const [tab,setTab]=useState('formulas')
  const [query,setQuery]=useState('')
  const data=tab==='formulas'?ogeFormulas:tab==='quantities'?ogeQuantities:ogeUnits
  const results=useMemo(()=>searchOgeReference(query,data),[query,data])
  const massResults=useMemo(()=>query.trim().toLowerCase().replaceAll('ё','е')==='масса'?searchOgeReference('масса',ogeFormulas):[],[query])

  return <section className={styles.wrap} aria-label="Справочник ОГЭ по физике">
    <div className={styles.glow}/>
    <header className={styles.head}>
      <div>
        <span className={styles.kicker}>СПРАВОЧНИК · ОГЭ 2026</span>
        <h2>Формулы и величины</h2>
        <p>Быстрый поиск по формулам, физическим величинам и единицам измерения. Начни вводить, например: <b>масса</b>, <b>давление</b>, <b>Ом</b> или <b>теплота</b>.</p>
      </div>
      <div className={styles.atom} aria-hidden="true"><i/><i/><i/><b>Σ</b></div>
    </header>

    <div className={styles.searchRow}>
      <label className={styles.search}>
        <span>⌕</span>
        <input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Найти формулу, величину или единицу…" autoComplete="off"/>
        {query&&<button type="button" onClick={()=>setQuery('')} aria-label="Очистить поиск">×</button>}
      </label>
      <div className={styles.tabs} role="tablist" aria-label="Раздел справочника">
        {tabs.map(([key,label])=><button key={key} className={tab===key?styles.active:''} onClick={()=>setTab(key)}>{label}</button>)}
      </div>
    </div>

    {query&&<div className={styles.resultLine}><strong>{results.length}</strong> {resultWord(results.length)} по запросу «{query}»</div>}

    {tab==='formulas'&&<FormulaGrid items={results}/>} 
    {tab==='quantities'&&<QuantityGrid items={results}/>} 
    {tab==='units'&&<UnitGrid items={results}/>} 

    {query&&results.length===0&&<div className={styles.empty}><b>Ничего не найдено</b><span>Попробуй написать название величины полностью или её единицу измерения.</span></div>}

    {query&&massResults.length>0&&tab!=='formulas'&&<div className={styles.related}>
      <div><span>Связанные формулы</span><b>По запросу «масса»</b></div>
      <div className={styles.relatedList}>{massResults.slice(0,8).map(item=><button key={item.id} onClick={()=>setTab('formulas')}><strong>{item.formula}</strong><span>{item.title}</span></button>)}</div>
    </div>}

    <footer className={styles.note}>Формулы собраны по перечню элементов содержания кодификатора ОГЭ по физике 2026 года. Обозначения единиц приведены в привычном школьном формате.</footer>
  </section>
}

function FormulaGrid({items}){
  const grouped=useMemo(()=>items.reduce((acc,item)=>{(acc[item.section]??=[]).push(item);return acc},{}),[items])
  return <div className={styles.formulaSections}>{Object.entries(grouped).map(([section,formulas])=><section key={section} className={styles.group}>
    <h3>{section}<span>{formulas.length}</span></h3>
    <div className={styles.formulaGrid}>{formulas.map(item=><article className={styles.formulaCard} key={item.id}>
      <div className={styles.cardTop}><span>Код {item.code}</span><em>{item.section}</em></div>
      <h4>{item.title}</h4>
      <div className={styles.formula}>{item.formula}</div>
      <ul>{item.variables.map(variable=><li key={variable}>{variable}</li>)}</ul>
    </article>)}</div>
  </section>)}</div>
}

function QuantityGrid({items}){
  return <div className={styles.quantityGrid}>{items.map(item=><article key={`${item.name}-${item.symbol}`} className={styles.quantityCard}>
    <div className={styles.symbol}>{item.symbol}</div>
    <div><h4>{item.name}</h4><p><b>{item.unit}</b> · {item.unitName}</p></div>
  </article>)}</div>
}

function UnitGrid({items}){
  return <div className={styles.unitGrid}>{items.map(item=><article key={`${item.symbol}-${item.for}`} className={styles.unitCard}>
    <div className={styles.unitSymbol}>{item.symbol}</div><h4>{item.name}</h4><p>{item.for}</p>
  </article>)}</div>
}

function resultWord(value){
  const n=Math.abs(value)%100,n1=n%10
  if(n>10&&n<20)return 'результатов'
  if(n1===1)return 'результат'
  if(n1>=2&&n1<=4)return 'результата'
  return 'результатов'
}
