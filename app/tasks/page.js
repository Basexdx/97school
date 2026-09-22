'use client'
import {useState} from 'react'
import TaskBank from '../task-bank'
import Grade7TaskBank from '../grade7-task-bank'

export default function TasksPage(){
  const [xp,setXp]=useState(null),[grade,setGrade]=useState(7)
  return <main style={{minHeight:'100vh',background:'#061326'}}>
    <div style={{position:'sticky',top:0,zIndex:30,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'10px clamp(18px,4vw,64px)',background:'rgba(4,16,32,.92)',borderBottom:'1px solid rgba(52,145,235,.2)',backdropFilter:'blur(14px)'}}>
      <div style={{display:'flex',gap:8}}>{[7,8].map(g=><button key={g} onClick={()=>setGrade(g)} style={{border:'1px solid '+(grade===g?'#168cff':'rgba(85,156,224,.25)'),background:grade===g?'rgba(13,121,235,.22)':'#071a31',color:grade===g?'#eaf6ff':'#8aa8c6',borderRadius:999,padding:'8px 15px',cursor:'pointer',fontWeight:800}}>{g} класс</button>)}</div>
      {xp!==null&&<div style={{color:'#b8d8ff',fontSize:13}}>Подтверждено сервером: {xp} XP</div>}
    </div>
    {grade===7?<Grade7TaskBank onXp={setXp}/>:<TaskBank onXp={setXp} refreshOffline={async()=>{}} setScreen={()=>{window.location.href='/?screen=offline'}}/>}
  </main>
}
