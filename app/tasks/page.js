'use client'
import {useState} from 'react'
import TaskBank from '../task-bank'
export default function TasksPage(){const [xp,setXp]=useState(null);return <main style={{minHeight:'100vh',background:'#071224'}}>{xp!==null&&<div style={{padding:'12px 28px',color:'#b8d8ff'}}>Подтверждено сервером: {xp} XP</div>}<TaskBank onXp={setXp} refreshOffline={async()=>{}} setScreen={()=>{window.location.href='/?screen=offline'}}/></main>}
