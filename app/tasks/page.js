'use client'
import {useState} from 'react'
import UnifiedTaskBank from '../unified-task-bank'

export default function TasksPage(){
  const [xp,setXp]=useState(null)
  return <main style={{minHeight:'100vh',background:'#061326'}}>
    {xp!==null&&<div className="tasks-xp-status">Подтверждено сервером: {xp} XP</div>}
    <UnifiedTaskBank onXp={setXp} refreshOffline={async()=>{}} setScreen={()=>{window.location.href='/?screen=offline'}}/>
  </main>
}
