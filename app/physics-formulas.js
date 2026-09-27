'use client'

import {useMemo,useState} from 'react'
import {physicsFormulaCount,physicsFormulaSections,variableUnit} from './formulas-data'

function group(expression,start){
  if(expression[start]!=='{')return null
  let depth=1
  for(let index=start+1;index<expression.length;index++){
    if(expression[index]==='{')depth++
    if(expression[index]==='}'){
      depth--
      if(depth===0)return {value:expression.slice(start+1,index),end:index+1}
    }
  }
  return null
}

function renderMath(expression,depth=0){
  if(depth>8)return expression
  const pieces=[]
  let text='',index=0
  const flush=()=>{if(text){pieces.push(<span key={pieces.length}>{text}</span>);text=''}}
  while(index<expression.length){
    if(expression.startsWith('\\frac{',index)){
      const top=group(expression,index+5),bottom=top&&group(expression,top.end)
      if(top&&bottom){
        flush()
        pieces.push(<span className="fl-frac" key={pieces.length}><span className="fl-num">{renderMath(top.value,depth+1)}</span><span className="fl-den">{renderMath(bottom.value,depth+1)}</span></span>)
        index=bottom.end
        continue
      }
    }
    if(expression.startsWith('\\sqrt{',index)){
      const root=group(expression,index+5)
      if(root){
        flush()
        pieces.push(<span className="fl-root" key={pieces.length}><span className="fl-root-mark">√</span><span className="fl-radicand">{renderMath(root.value,depth+1)}</span></span>)
        index=root.end
        continue
      }
    }
    if((expression[index]==='_'||expression[index]==='^')&&expression[index+1]==='{'){
      const sub=group(expression,index+1)
      if(sub){
        flush()
        pieces.push(expression[index]==='_'?<sub key={pieces.length}>{renderMath(sub.value,depth+1)}</sub>:<sup key={pieces.length}>{renderMath(sub.value,depth+1)}</sup>)
        index=sub.end
        continue
      }
    }
    text+=expression[index++]
  }
  flush()
  return pieces
}

const normalize=value=>String(value).toLocaleLowerCase('ru-RU').replaceAll('ё','е').replace(/\\(?:frac|sqrt)/g,'').replace(/[{}]/g,'').replace(/\s+/g,' ').trim()

export default function PhysicsFormulas(){
  const [query,setQuery]=useState('')
  const [openId,setOpenId]=useState(null)
  const words=normalize(query).split(' ').filter(Boolean)
  const sections=useMemo(()=>physicsFormulaSections.map(section=>({
    ...section,
    formulas:section.formulas.filter(item=>{
      const haystack=normalize([section.title,item.title,item.unit,item.math,item.description,...item.variables,...item.variables.map(variableUnit)].join(' '))
      return words.every(word=>haystack.includes(word))
    }),
  })).filter(section=>section.formulas.length),[query])
  const count=sections.reduce((sum,section)=>sum+section.formulas.length,0)

  return <section className="fl-page">
    <header className="fl-hero">
      <div className="fl-hero-icon" aria-hidden="true">Σ</div>
      <div className="fl-hero-copy"><h1>Формулы по физике</h1><p>Основные формулы школьной физики с обозначениями, единицами измерения и понятными объяснениями.</p><span className="fl-hero-count">▤&nbsp; {physicsFormulaCount} формул</span></div>
      <span className="fl-total">{physicsFormulaCount} формул</span>
    </header>
    <label className="fl-search"><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Поиск по названию, величине или слову…" autoComplete="off" aria-label="Поиск формулы"/>{query&&<button type="button" onClick={()=>setQuery('')} aria-label="Очистить поиск">×</button>}</label>
    <p className="fl-result" aria-live="polite">{query?`Найдено: ${count}`:`Общий перечень · ${physicsFormulaSections.length} разделов`}</p>
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
            <span className="fl-math" role="math" aria-label={item.math}>{renderMath(item.math)}</span>
          </button>
          <div className="fl-card-detail">
            <h3>Обозначения</h3>
            <ul>{showResult&&<li><span className="fl-variable-symbol">{renderMath(resultSymbol)}</span><span className="fl-variable-dash">—</span><span>{item.title.toLowerCase()}, <span className="fl-variable-unit">{item.unit==='безразмерная'?'без ед.':item.unit}</span></span></li>}{item.variables.map(variable=>{
              const [symbols,meaning]=variable.split(' — ')
              return <li key={variable}><span className="fl-variable-symbol">{symbols}</span><span className="fl-variable-dash">—</span><span>{meaning}, <span className="fl-variable-unit">{variableUnit(variable)}</span></span></li>
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
