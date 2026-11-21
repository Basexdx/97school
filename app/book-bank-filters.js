'use client'
import {useEffect,useId,useState} from 'react'
import {bookAreas} from '../shared/book-filters.mjs'
export default function BookBankFilters({values,setters,index,typeLabels,reset}){
 const [open,setOpen]=useState(false)
 const activeKeys=['section','paragraph','topic','difficulty','type','progress'].filter(key=>String(values[key]||'').trim())
 const count=activeKeys.length
 const progressLabels={solved:'Решённые',unsolved:'Нерешённые',viewed:'Просмотренные',repeat:'Требуют повторения',pending:'Ждут синхронизации'}
 const labelFor=key=>key==='section'?(bookAreas.find(([value])=>value===values.section)?.[1]||values.section):key==='difficulty'?({БАЗОВЫЙ:'Базовый',ПОВЫШЕННЫЙ:'Повышенный',ВЫСОКИЙ:'Высокий'}[values.difficulty]||values.difficulty):key==='type'?(typeLabels[values.type]||values.type):key==='progress'?(progressLabels[values.progress]||values.progress):values[key]
 useEffect(()=>{const toggle=()=>setOpen(value=>!value);window.addEventListener('genius:toggle-book-filters',toggle);return()=>window.removeEventListener('genius:toggle-book-filters',toggle)},[])
 useEffect(()=>{window.dispatchEvent(new CustomEvent('genius:book-filter-state',{detail:{count,open}}))},[count,open])
 const id=useId(), field=(key,label,placeholder)=><label>{label}<input type="search" list={`${id}-${key}`} value={values[key]} onChange={e=>setters[key](e.target.value)} placeholder={placeholder}/></label>
 return <div className="book-filter-dock"><nav className="book-areas" aria-label="Разделы физики">{bookAreas.map(([key,label])=><button type="button" key={key} aria-pressed={values.section===key} onClick={()=>setters.section(key)}>{label}</button>)}</nav><section id={`${id}-panel`} className="book-filter-grid" aria-label="Фильтры задач" hidden={!open}>
 {activeKeys.length>0&&<div className="book-active-filters"><span>Применено:</span>{activeKeys.map(key=><button type="button" key={key} onClick={()=>setters[key]('')} aria-label={`Убрать фильтр ${labelFor(key)}`}>{labelFor(key)} ×</button>)}</div>}
 {field('paragraph','Параграф','Номер или название')}{field('topic','Тема','Введите тему')}
 <label>Сложность<select value={values.difficulty} onChange={e=>setters.difficulty(e.target.value)}><option value="">Любая сложность</option>{['БАЗОВЫЙ','ПОВЫШЕННЫЙ','ВЫСОКИЙ'].map((value,i)=><option key={value} value={value}>{['Базовый','Повышенный','Высокий'][i]}</option>)}</select></label>
 <label>Тип<select value={values.type} onChange={e=>setters.type(e.target.value)}><option value="">Все типы</option>{[...new Set(index?.tasks?.map(t=>t.type)||[])].map(value=><option key={value} value={value}>{typeLabels[value]||value}</option>)}</select></label>
 <label>Прогресс<select value={values.progress} onChange={e=>setters.progress(e.target.value)}>{[['','Все задачи'],['solved','Решённые'],['unsolved','Нерешённые'],['viewed','Просмотренные'],['repeat','Требуют повторения'],['pending','Ждут синхронизации']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><button type="button" className="book-reset" onClick={reset}>Сбросить фильтры</button>
 </section><datalist id={`${id}-paragraph`}>{index?.paragraphs?.map(p=><option key={p.paragraph} value={`§${p.paragraph}. ${p.title}`}/>)}</datalist><datalist id={`${id}-topic`}>{[...new Set(index?.tasks?.map(t=>t.topic)||[])].map(topic=><option key={topic} value={topic}/>)}</datalist></div>
}
