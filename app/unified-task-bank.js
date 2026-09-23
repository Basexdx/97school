'use client'

import {useEffect,useState} from 'react'
import Grade7TaskBank from './grade7-task-bank'
import TaskBank from './task-bank'

const GRADE_KEY='genius:task-bank-grade:v1'

export default function UnifiedTaskBank({initialGrade=7,onXp=()=>{},refreshOffline=async()=>{},setScreen=()=>{}}){
  const normalized=initialGrade===8?8:7
  const [grade,setGrade]=useState(normalized)

  useEffect(()=>{
    try{const saved=Number(sessionStorage.getItem(GRADE_KEY));if(saved===7||saved===8)setGrade(saved)}catch{}
  },[])

  function chooseGrade(value){
    setGrade(value)
    try{sessionStorage.setItem(GRADE_KEY,String(value))}catch{}
  }

  return <section className="task-bank-hub">
    <header className="task-grade-switch">
      <div><strong>Банк задач</strong><span>Выберите класс — прогресс хранится раздельно</span></div>
      <div role="tablist" aria-label="Класс банка задач">
        <button role="tab" aria-selected={grade===7} className={grade===7?'active':''} onClick={()=>chooseGrade(7)}><b>7 класс</b><small>71 задача</small></button>
        <button role="tab" aria-selected={grade===8} className={grade===8?'active':''} onClick={()=>chooseGrade(8)}><b>8 класс</b><small>319 задач</small></button>
      </div>
    </header>
    {grade===7
      ? <Grade7TaskBank onXp={onXp}/>
      : <TaskBank onXp={onXp} refreshOffline={refreshOffline} setScreen={setScreen}/>
    }
  </section>
}
