'use client'
import {useState} from 'react'
import {accessApi} from './access-api.mjs'
// The existing landing form is a demo entry. It never creates a teacher session.
// Keep it intact and connect the authenticated workspace explicitly here.
export default function TeacherSessionConnect({onConnected}){
 const [secret,setSecret]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function connect(event){event.preventDefault();setBusy(true);setError('');try{await accessApi('/api/teacher/login',{body:{secret}});setSecret('');onConnected()}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <form className="teacher-session-connect" onSubmit={connect}><div><h2>Подключить кабинет учителя</h2><p>Введите ключ учителя, чтобы работать с классами, запросами и статистикой.</p></div><label>Ключ учителя<input type="password" autoComplete="current-password" value={secret} onChange={e=>setSecret(e.target.value)} required/></label><button disabled={busy}>{busy?'Подключаем…':'Подключить'}</button>{error&&<p role="alert">{error}</p>}</form>
}
