'use client'

import {useEffect,useState} from 'react'
import Grade7TaskBank from './grade7-task-bank'
import TaskBank from './task-bank'
import Grade9TaskBank from './grade9-task-bank'
import OgeTaskBank from './oge-task-bank'

const GRADE_KEY='genius:task-bank-grade:v3'

export default function UnifiedTaskBank({initialGrade=7,onXp=()=>{},refreshOffline=async()=>{},setScreen=()=>{}}){
  const normalized=[7,8,9].includes(initialGrade)?initialGrade:7
  const [grade,setGrade]=useState(normalized)

  useEffect(()=>{
    try{const saved=sessionStorage.getItem(GRADE_KEY);if(saved==='oge')setGrade('oge');else if([7,8,9].includes(Number(saved)))setGrade(Number(saved))}catch{}
  },[])

  function chooseGrade(value){
    setGrade(value)
    try{sessionStorage.setItem(GRADE_KEY,String(value))}catch{}
  }

  return <section className="task-bank-hub">
    <header className="task-grade-switch">
      <div><strong>Банк задач</strong><span>Школьные задачи и отдельный раздел подготовки к ОГЭ</span></div>
      <div role="tablist" aria-label="Раздел банка задач">
        <button role="tab" aria-selected={grade===7} className={grade===7?'active':''} onClick={()=>chooseGrade(7)}><b>7 класс</b><small>71 задача</small></button>
        <button role="tab" aria-selected={grade===8} className={grade===8?'active':''} onClick={()=>chooseGrade(8)}><b>8 класс</b><small>321 задача</small></button>
        <button role="tab" aria-selected={grade===9} className={grade===9?'active':''} onClick={()=>chooseGrade(9)}><b>9 класс</b><small>59 задач</small></button>
        <button role="tab" aria-selected={grade==='oge'} className={grade==='oge'?'active':''} onClick={()=>chooseGrade('oge')}><b>ОГЭ</b><small>65 задач</small></button>
      </div>
    </header>
    {grade===7
      ? <Grade7TaskBank onXp={onXp}/>
      : grade===8
        ? <TaskBank onXp={onXp} refreshOffline={refreshOffline} setScreen={setScreen}/>
        : grade===9
          ? <Grade9TaskBank onXp={onXp}/>
          : <OgeTaskBank/>
    }
  </section>
}
