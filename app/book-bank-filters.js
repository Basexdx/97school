'use client'
import {useId} from 'react'
import {bookAreas} from '../shared/book-filters.mjs'
export default function BookBankFilters({values,setters,index,typeLabels,reset}){
 const id=useId(), field=(key,label,placeholder)=><label>{label}<input type="search" list={`${id}-${key}`} value={values[key]} onChange={e=>setters[key](e.target.value)} placeholder={placeholder}/></label>
 return <div className="book-filter-dock"><nav className="book-areas" aria-label="Разделы физики">{bookAreas.map(([key,label])=><button type="button" key={key} aria-pressed={values.section===key} onClick={()=>setters.section(key)}>{label}</button>)}</nav><section className="book-filter-grid" aria-label="Фильтры задач">
 {field('paragraph','Параграф','Номер или название')}{field('topic','Тема','Введите тему')}
 <label>Сложность<select value={values.difficulty} onChange={e=>setters.difficulty(e.target.value)}><option value="">Любая сложность</option>{['БАЗОВЫЙ','ПОВЫШЕННЫЙ','ВЫСОКИЙ'].map((value,i)=><option key={value} value={value}>{['Базовый','Повышенный','Высокий'][i]}</option>)}</select></label>
 <label>Тип<select value={values.type} onChange={e=>setters.type(e.target.value)}><option value="">Все типы</option>{[...new Set(index?.tasks?.map(t=>t.type)||[])].map(value=><option key={value} value={value}>{typeLabels[value]||value}</option>)}</select></label>
 <label>Прогресс<select value={values.progress} onChange={e=>setters.progress(e.target.value)}>{[['','Все задачи'],['solved','Решённые'],['unsolved','Нерешённые'],['viewed','Просмотренные'],['repeat','Требуют повторения'],['pending','Ждут синхронизации']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><button type="button" className="book-reset" onClick={reset}>Сбросить фильтры</button>
 </section><datalist id={`${id}-paragraph`}>{index?.paragraphs?.map(p=><option key={p.paragraph} value={`§${p.paragraph}. ${p.title}`}/>)}</datalist><datalist id={`${id}-topic`}>{[...new Set(index?.tasks?.map(t=>t.topic)||[])].map(topic=><option key={topic} value={topic}/>)}</datalist></div>
}
