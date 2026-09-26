'use client'

import {useEffect,useMemo,useRef,useState} from 'react'
import {createPortal} from 'react-dom'

const CATEGORIES=[
  ['all','Все разделы'],
  ['units','Единицы и константы'],
  ['matter','Вещество'],
  ['thermal','Термодинамика'],
  ['astronomy','Астрономия'],
  ['atomic','Атомная физика'],
]

const SECTIONS=[
  {
    id:'prefixes',category:'units',icon:'↔',title:'Десятичные приставки',summary:'Гига, мега, кило, санти, милли, микро и другие',
    columns:['Наименование','Обозн.','Множитель','Наименование','Обозн.','Множитель'],
    rows:[
      ['гига','Г','10⁹','санти','с','10⁻²'],
      ['мега','М','10⁶','милли','м','10⁻³'],
      ['кило','к','10³','микро','мк','10⁻⁶'],
      ['гекто','г','10²','нано','н','10⁻⁹'],
      ['деци','д','10⁻¹','пико','п','10⁻¹²'],
    ],
  },
  {
    id:'constants',category:'units',icon:'⚛',title:'Константы',summary:'Основные физические постоянные из справочных материалов',
    columns:['Наименование','Обозначение и значение'],
    rows:[
      ['число π','π = 3,14'],
      ['ускорение свободного падения на Земле','g = 10 м/с²'],
      ['гравитационная постоянная','G = 6,7 · 10⁻¹¹ Н·м²/кг²'],
      ['универсальная газовая постоянная','R = 8,31 Дж/(моль·К)'],
      ['постоянная Больцмана','k = 1,38 · 10⁻²³ Дж/К'],
      ['постоянная Авогадро','Nₐ = 6 · 10²³ моль⁻¹'],
      ['скорость света в вакууме','c = 3 · 10⁸ м/с'],
      ['коэффициент пропорциональности в законе Кулона','k = 1/(4πɛ₀) = 9 · 10⁹ Н·м²/Кл²'],
      ['модуль заряда электрона (элементарный электрический заряд)','e = 1,6 · 10⁻¹⁹ Кл'],
      ['постоянная Планка','h = 6,6 · 10⁻³⁴ Дж·с'],
    ],
  },
  {
    id:'unit-relations',category:'units',icon:'⇄',title:'Соотношения между различными единицами',summary:'Температура, а. е. м., электронвольт и астрономические единицы',
    columns:['Наименование','Соотношение'],
    rows:[
      ['температура','0 К = −273 °C'],
      ['атомная единица массы','1 а. е. м. = 1,66 · 10⁻²⁷ кг'],
      ['1 атомная единица массы эквивалентна','931,5 МэВ'],
      ['1 электронвольт','1 эВ = 1,6 · 10⁻¹⁹ Дж'],
      ['1 астрономическая единица','1 а.е. ≈ 150 000 000 км'],
      ['1 световой год','1 св. год ≈ 9,46 · 10¹⁵ м'],
      ['1 парсек','1 пк ≈ 3,26 св. года'],
    ],
  },
  {
    id:'particle-mass',category:'atomic',icon:'◉',title:'Масса частиц',summary:'Электрон, протон, нейтрон',
    columns:['Частица','Масса'],
    rows:[
      ['электрон','9,1 · 10⁻³¹ кг ≈ 5,5 · 10⁻⁴ а. е. м.'],
      ['протон','1,673 · 10⁻²⁷ кг ≈ 1,007 а. е. м.'],
      ['нейтрон','1,675 · 10⁻²⁷ кг ≈ 1,008 а. е. м.'],
    ],
  },
  {
    id:'astronomy',category:'astronomy',icon:'♄',title:'Астрономические величины',summary:'Радиусы Земли и Солнца, температура поверхности Солнца',
    columns:['Наименование','Значение'],
    rows:[
      ['средний радиус Земли','R⊕ = 6370 км'],
      ['радиус Солнца','R☉ = 6,96 · 10⁸ м'],
      ['температура поверхности Солнца','T = 6000 К'],
    ],
  },
  {
    id:'density',category:'matter',icon:'◇',title:'Плотность',summary:'Вода, древесина, керосин, масло, алюминий, железо, ртуть',
    columns:['Вещество','ρ, кг/м³','Вещество','ρ, кг/м³'],
    rows:[
      ['воды','1000','подсолнечного масла','900'],
      ['древесины (сосны)','400','алюминия','2700'],
      ['керосина','800','железа','7800'],
      ['','','ртути','13 600'],
    ],
  },
  {
    id:'heat-capacity',category:'thermal',icon:'≋',title:'Удельная теплоёмкость',summary:'Вода, лёд, металлы и чугун',
    columns:['Вещество','c, Дж/(кг·К)','Вещество','c, Дж/(кг·К)'],
    rows:[
      ['воды','4,2 · 10³','алюминия','900'],
      ['льда','2,1 · 10³','меди','380'],
      ['железа','460','чугуна','500'],
      ['свинца','130','',''],
    ],
  },
  {
    id:'latent-heat',category:'thermal',icon:'♨',title:'Удельная теплота',summary:'Парообразование воды и плавление веществ',
    columns:['Процесс','L, Дж/кг'],
    rows:[
      ['парообразования воды','2,3 · 10⁶'],
      ['плавления свинца','2,5 · 10⁴'],
      ['плавления льда','3,3 · 10⁵'],
    ],
  },
  {
    id:'normal',category:'thermal',icon:'◌',title:'Нормальные условия',summary:'Давление и температура',
    columns:['Условие','Значение'],
    rows:[
      ['давление','10⁵ Па'],
      ['температура','0 °C'],
    ],
  },
  {
    id:'molar-mass',category:'matter',icon:'⌬',title:'Молярная масса',summary:'Газы, вода и литий',
    columns:['Вещество','M, кг/моль','Вещество','M, кг/моль'],
    rows:[
      ['азота','28 · 10⁻³','гелия','4 · 10⁻³'],
      ['аргона','40 · 10⁻³','кислорода','32 · 10⁻³'],
      ['водорода','2 · 10⁻³','лития','6 · 10⁻³'],
      ['воздуха','29 · 10⁻³','неона','20 · 10⁻³'],
      ['воды','18 · 10⁻³','углекислого газа','44 · 10⁻³'],
    ],
  },
]

const normalize=value=>String(value||'').toLocaleLowerCase('ru-RU').replaceAll('ё','е').replace(/\s+/g,' ').trim()

function sectionSearchText(section){
  return normalize([section.title,section.summary,...section.columns,...section.rows.flat()].join(' '))
}

function rowsForQuery(section,query){
  if(!query)return section.rows
  if(normalize(`${section.title} ${section.summary}`).includes(query))return section.rows
  return section.rows.filter(row=>normalize(row.join(' ')).includes(query))
}

function mobileTableFor(section){
  const rows=section.visibleRows||section.rows

  if(section.id==='prefixes'){
    return {
      columns:['Приставка','Обозначение и множитель'],
      rows:rows.flatMap(row=>[
        [row[0],`${row[1]} · ${row[2]}`],
        [row[3],`${row[4]} · ${row[5]}`],
      ]).filter(row=>row[0]||row[1]),
    }
  }

  if(section.columns.length===4){
    return {
      columns:[section.columns[0],section.columns[1]],
      rows:rows.flatMap(row=>[
        [row[0],row[1]],
        [row[2],row[3]],
      ]).filter(row=>row[0]||row[1]),
    }
  }

  if(section.columns.length===2)return {columns:section.columns,rows}

  return {
    columns:[section.columns[0],'Значение'],
    rows:rows.map(row=>[row[0],row.slice(1).filter(Boolean).join(' · ')]),
  }
}

function ReferenceTable({sectionId,columns,rows,className=''}){
  return <div className={`rm-table-wrap ${className}`}>
    <table>
      <thead><tr>{columns.map((column,index)=><th key={`${sectionId}-h-${className}-${index}`}>{column}</th>)}</tr></thead>
      <tbody>{rows.map((row,rowIndex)=><tr key={`${sectionId}-r-${className}-${rowIndex}`}>{row.map((cell,cellIndex)=><td key={`${sectionId}-${className}-${rowIndex}-${cellIndex}`}>{cell||'—'}</td>)}</tr>)}</tbody>
    </table>
  </div>
}

export default function ReferenceMaterials(){
  const [navAnchor,setNavAnchor]=useState(null)
  const [open,setOpen]=useState(false)

  useEffect(()=>{
    let frame=0
    const scan=()=>{
      cancelAnimationFrame(frame)
      frame=requestAnimationFrame(()=>{
        const nav=document.querySelector('#student-sidebar-nav')
        if(!nav){setNavAnchor(null);return}
        let anchor=nav.querySelector('[data-reference-materials-nav]')
        if(!anchor){
          anchor=document.createElement('span')
          anchor.dataset.referenceMaterialsNav='1'
          anchor.className='reference-materials-nav-anchor'
          const v17=nav.querySelector('[data-genius-v17-nav]')
          if(v17)v17.insertAdjacentElement('afterend',anchor)
          else nav.append(anchor)
        }
        setNavAnchor(current=>current===anchor?current:anchor)
      })
    }
    scan()
    const observer=new MutationObserver(scan)
    observer.observe(document.body,{childList:true,subtree:true})
    return()=>{cancelAnimationFrame(frame);observer.disconnect()}
  },[])

  return <>
    {navAnchor&&createPortal(
      <button className={`side-nav genius-ref-nav genius-materials-nav ${open?'active':''}`} onClick={()=>setOpen(true)}><span aria-hidden="true">▤</span>Справочные материалы</button>,
      navAnchor,
    )}
    {open&&createPortal(<ReferenceMaterialsPage onClose={()=>setOpen(false)}/>,document.body)}
  </>
}

function ReferenceMaterialsPage({onClose}){
  const [category,setCategory]=useState('all')
  const [query,setQuery]=useState('')
  const [expanded,setExpanded]=useState(()=>new Set(['prefixes','constants']))
  const searchRef=useRef(null)
  const q=normalize(query)

  useEffect(()=>{
    const previous=document.body.style.overflow
    document.body.style.overflow='hidden'
    const onKey=event=>{if(event.key==='Escape')onClose()}
    window.addEventListener('keydown',onKey)
    return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',onKey)}
  },[onClose])

  const visible=useMemo(()=>SECTIONS.map(section=>({
    ...section,
    visibleRows:rowsForQuery(section,q),
  })).filter(section=>(category==='all'||section.category===category)&&(!q||sectionSearchText(section).includes(q))),[category,q])

  const totalMatches=useMemo(()=>{
    if(!q)return 0
    return visible.reduce((sum,section)=>sum+(normalize(`${section.title} ${section.summary}`).includes(q)?section.rows.length:section.visibleRows.length),0)
  },[q,visible])

  function toggle(id){
    setExpanded(current=>{
      const next=new Set(current)
      if(next.has(id))next.delete(id);else next.add(id)
      return next
    })
  }

  function openStudentMenu(){
    onClose()
    window.setTimeout(()=>document.querySelector('.mobile-nav-toggle')?.click(),30)
  }

  return <div className="reference-materials-overlay" role="dialog" aria-modal="true" aria-label="Справочные материалы по физике">
    <div className="rm-mobile-topbar">
      <div className="rm-mobile-brand"><span className="rm-brand-atom" aria-hidden="true"><i/><i/><i/><b/></span><strong>Genius</strong></div>
      <div className="rm-mobile-actions">
        <button type="button" aria-label="Перейти к поиску" onClick={()=>searchRef.current?.focus()}>⌕</button>
        <button type="button" aria-label="Открыть меню" onClick={openStudentMenu}>☰</button>
      </div>
    </div>

    <main className="reference-materials-page">
      <header className="rm-hero">
        <div className="rm-title-block">
          <span className="rm-book-icon" aria-hidden="true">▤</span>
          <div><h1>Справочные материалы</h1><p>Вся необходимая справочная информация по физике в одном месте</p></div>
        </div>
        <label className="rm-search">
          <span aria-hidden="true">⌕</span>
          <input ref={searchRef} value={query} onChange={event=>setQuery(event.target.value)} placeholder="Поиск по справочным материалам…" autoComplete="off"/>
          {query&&<button type="button" onClick={()=>setQuery('')} aria-label="Очистить поиск">×</button>}
        </label>
        <button className="rm-close" type="button" onClick={onClose} aria-label="Закрыть справочник">×</button>
      </header>

      <nav className="rm-categories" aria-label="Категории справочных материалов">
        {CATEGORIES.map(([key,label])=><button key={key} type="button" className={category===key?'active':''} onClick={()=>setCategory(key)}>{label}</button>)}
      </nav>

      {q&&<div className="rm-search-result"><strong>{visible.length}</strong> {visible.length===1?'раздел':'разделов'} · <span>{totalMatches} совпадений</span> по запросу «{query}»</div>}

      <section className="rm-grid">
        {visible.map(section=>{
          const isOpen=q||expanded.has(section.id)
          const mobile=mobileTableFor(section)
          return <article key={section.id} className={`rm-card rm-card-${section.id} ${isOpen?'open':''}`}>
            <button className="rm-card-head" type="button" onClick={()=>toggle(section.id)} aria-expanded={Boolean(isOpen)}>
              <span className="rm-card-icon" aria-hidden="true">{section.icon}</span>
              <span className="rm-card-copy"><strong>{section.title}</strong><small>{section.summary}</small></span>
              <span className="rm-chevron" aria-hidden="true">⌄</span>
            </button>
            <div className="rm-card-body">
              <ReferenceTable sectionId={section.id} columns={section.columns} rows={section.visibleRows} className="rm-desktop-table"/>
              <ReferenceTable sectionId={section.id} columns={mobile.columns} rows={mobile.rows} className="rm-mobile-table"/>
            </div>
          </article>
        })}
      </section>

      {visible.length===0&&<div className="rm-empty"><span>⌕</span><strong>Ничего не найдено</strong><p>Попробуй изменить запрос или выбрать «Все разделы».</p></div>}

      <footer className="rm-source-note">Справочные значения отображаются в формулировках и единицах из предоставленного справочного листа.</footer>
    </main>
  </div>
}
