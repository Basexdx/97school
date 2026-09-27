'use client'

import {useEffect,useMemo,useState} from 'react'
import Grade7TaskBank from './grade7-task-bank'
import TaskBank from './task-bank'
import Grade9TaskBank from './grade9-task-bank'

const GRADE_KEY='genius:task-bank-grade:v3'

export default function UnifiedTaskBank({initialGrade=7,onXp=()=>{},refreshOffline=async()=>{},setScreen=()=>{}}){
  const normalized=[7,8,9].includes(initialGrade)?initialGrade:7
  const [grade,setGrade]=useState(normalized)
  const [search,setSearch]=useState('')
  const [searchData,setSearchData]=useState({tasks:[],counts:{}})
  const [searchLoading,setSearchLoading]=useState(true)
  const [pendingTask,setPendingTask]=useState(null)

  useEffect(()=>{
    try{const saved=sessionStorage.getItem(GRADE_KEY);if([7,8,9].includes(Number(saved)))setGrade(Number(saved))}catch{}
  },[])
  useEffect(()=>{let live=true;fetch('/task-bank/search-all.json').then(r=>r.ok?r.json():Promise.reject()).then(data=>{if(live)setSearchData(data)}).catch(()=>{}).finally(()=>{if(live)setSearchLoading(false)});return()=>{live=false}},[])
  const results=useMemo(()=>{const q=search.trim().toLocaleLowerCase('ru-RU').replaceAll('ё','е');return q.length<2?[]:(searchData.tasks||[]).filter(item=>item.searchText.includes(q)).slice(0,30)},[search,searchData])

  useEffect(()=>{
    if(!pendingTask)return undefined
    let attempts=0
    const timer=setInterval(()=>{
      const prefix=pendingTask.grade===7?'grade7-task-':pendingTask.grade===9?'grade9-task-':'task-'
      const tile=document.getElementById(`${prefix}${pendingTask.id}`)
      if(tile){clearInterval(timer);tile.scrollIntoView({block:'center',behavior:'smooth'});tile.click();setPendingTask(null)}
      else{
        attempts++
        if(attempts===10)[...document.querySelectorAll('.task-bank-hub button')].find(button=>button.textContent?.startsWith('Сбросить'))?.click()
        if(attempts>50){clearInterval(timer);setPendingTask(null)}
      }
    },100)
    return()=>clearInterval(timer)
  },[pendingTask,grade])

  function chooseGrade(value){
    setGrade(value)
    try{sessionStorage.setItem(GRADE_KEY,String(value))}catch{}
  }

  function openSearchResult(item){
    const detail=document.querySelector('.task-bank-hub .bank-detail, .task-bank-hub article[class*="_detail__"], .task-bank-hub article[class*="_detail_"]')
    detail?.querySelector('nav button:first-child')?.click()
    chooseGrade(item.grade);setSearch('');setPendingTask(item)
  }

  return <section className="task-bank-hub">
    <header className="task-grade-switch">
      <div className="bank-header-search">
        <label><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Найти задачу по номеру или словам" aria-label="Поиск задачи" autoComplete="off"/></label>
        {search.trim().length>=2&&<div className="bank-header-results" role="region" aria-label="Результаты поиска задач">
          <small>{searchLoading?'Загружаю задачи…':`Найдено: ${results.length}${results.length===30?' (первые 30)':''}`}</small>
          {results.map(item=><button type="button" key={`${item.grade}-${item.id}`} onClick={()=>openSearchResult(item)}><b>{item.bookNumber?`№ ${item.bookNumber}`:`${item.grade} класс`}</b><span>{item.grade} класс · {item.topic}</span></button>)}
          {!searchLoading&&!results.length&&<p>Задачи не найдены</p>}
        </div>}
      </div>
      <div role="tablist" aria-label="Раздел банка задач">
        {[7,8,9].map(value=><button key={value} role="tab" aria-selected={grade===value} className={grade===value?'active':''} onClick={()=>chooseGrade(value)}><b>{value} класс</b><small>{searchData.counts?.[value]||'…'} задач</small></button>)}
      </div>
    </header>
    {grade===7
      ? <Grade7TaskBank onXp={onXp}/>
      : grade===8
        ? <TaskBank onXp={onXp} refreshOffline={refreshOffline} setScreen={setScreen}/>
        : <Grade9TaskBank onXp={onXp}/>
    }
  </section>
}
