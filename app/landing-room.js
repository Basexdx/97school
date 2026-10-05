'use client'

import {useEffect,useState} from 'react'
import LandingRoomArt from './landing-room-art'

function EntryIcon({teacher=false}){return teacher?<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="7" r="3"/><path d="M4.5 20v-2.5a7.5 7.5 0 0 1 15 0V20z"/></svg>:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m2 9 10-5 10 5-10 5zM6 11v5c3 2.7 9 2.7 12 0v-5M22 9v7"/></svg>}

export default function LandingRoom({Brand,role,setRole,onStudentStart,onTeacherSubmit}){
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [showPassword,setShowPassword]=useState(false)

  useEffect(()=>{
    if(!role)return
    const previous=document.body.style.overflow
    document.body.style.overflow='hidden'
    return ()=>{document.body.style.overflow=previous}
  },[role])

  async function submitTeacher(event){
    event.preventDefault()
    if(busy)return
    const credentials=new FormData(event.currentTarget)
    setBusy(true);setError('')
    try{await onTeacherSubmit({secret:String(credentials.get('secret')||'')})}catch(e){setError(e.message)}finally{setBusy(false)}
  }

  function selectRole(next){setError('');setBusy(false);next==='student'?onStudentStart():setRole(next)}

  return <main className="landing-page genius-room-landing">
    <section className={`genius-room-shell${role?' genius-room-shell--form':''}`}>
      <header className="genius-room-header"><Brand dark onClick={()=>selectRole(null)}/></header>
      <div className="genius-room-layout">
        <div className="genius-room-copy">
          <span className="genius-room-kicker">ФИЗИКА · 7–9 КЛАСС</span>
          <h1><span>Понимай<br/>физику.</span><span>Решай<br/>уверенно.</span></h1>
          <p>Учебник, задачи и справочные материалы по физике — в одной системе.</p>
        </div>
        <div className="genius-room-scene" aria-hidden="true">
          <LandingRoomArt/><LandingRoomArt mobile/>
          <div className="genius-room-effects">
            {Array.from({length:7},(_,i)=><i className="genius-room-leaf" style={{left:`${52+i*6.1}%`,animationDuration:`${9+i*.9}s`,animationDelay:`-${i*2}s`}} key={`leaf-${i}`}/>) }
            {Array.from({length:19},(_,i)=><i className="genius-room-snow" style={{left:`${51+i*2.35}%`,animationDuration:`${9+i*.3}s`,animationDelay:`-${i}s`}} key={`snow-${i}`}/>) }
            {Array.from({length:5},(_,i)=><i className="genius-room-petal" style={{left:`${68+i*5}%`,animationDuration:`${12+i}s`,animationDelay:`-${i*2}s`}} key={`petal-${i}`}/>) }
            <i className="genius-room-star"/>
          </div>
        </div>
        <div className="genius-room-front-leaves" aria-hidden="true">
          {Array.from({length:5},(_,i)=><i style={{left:`${48+i*11}%`,animationDuration:`${12+i*1.5}s`,animationDelay:`-${i*3.2}s`}} key={i}/>)}
        </div>
        <div className="genius-room-entry" aria-live="polite">
          {!role?<div className="genius-room-choices">
            <button type="button" className="genius-room-primary" onClick={()=>selectRole('student')}><EntryIcon/>Войти как ученик</button>
            <button type="button" className="genius-room-secondary" onClick={()=>selectRole('teacher')}><EntryIcon teacher/>Войти как учитель</button>
          </div>:<div className="genius-room-login" key={role}>
            <div className="genius-room-tabs" role="tablist" aria-label="Тип входа">
              <button type="button" role="tab" aria-selected={role==='student'} className={role==='student'?'active':''} onClick={()=>selectRole('student')} disabled={busy}>Ученик</button>
              <button type="button" role="tab" aria-selected={role==='teacher'} className={role==='teacher'?'active':''} onClick={()=>selectRole('teacher')} disabled={busy}>Учитель</button>
            </div>
            {<form onSubmit={submitTeacher}>
              <label htmlFor="room-teacher-secret">Ключ учителя</label>
              <div className="genius-room-password"><input id="room-teacher-secret" name="secret" type={showPassword?'text':'password'} onChange={()=>setError('')} autoComplete="current-password" required/><button type="button" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword?'Скрыть ключ':'Показать ключ'}>{showPassword?'Скрыть':'Показать'}</button></div>
              {error&&<p className="genius-room-error" role="alert">{error}</p>}
              <button className="genius-room-primary" type="submit" disabled={busy}>{busy?'Входим…':'Войти →'}</button>
            </form>}
          </div>}
        </div>
      </div>
    </section>
  </main>
}
