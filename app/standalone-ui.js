'use client'
import {useEffect,useState} from 'react'
import {readLocalProfile,saveLocalProfile,localIdentity} from './standalone-mode.mjs'
import {bankAttempts} from './task-store'
import './standalone.css'

function GradePicker({value,onChange}){return <label>Класс<select aria-label="Класс обучения" value={value} onChange={e=>onChange(Number(e.target.value))}>{[7,8,9].map(n=><option key={n} value={n}>{n} класс</option>)}</select></label>}
export function StandaloneWelcome({Brand,onStart}){
 const [nickname,setNickname]=useState(''),[grade,setGrade]=useState(8)
 useEffect(()=>{const p=readLocalProfile();if(p){setNickname(p.nickname);setGrade(p.grade)}},[])
 return <main className="standalone-welcome"><section className="standalone-card"><Brand dark/><p className="standalone-eyebrow">ФИЗИКА · 7–9 КЛАСС</p><h1>Понимай физику.<br/>Решай уверенно.</h1><p>Учебник, задачник, задания ОГЭ и справочные материалы уже в приложении. Можно заниматься без интернета.</p><form onSubmit={e=>{e.preventDefault();onStart({nickname,grade})}}><label>Как к тебе обращаться<input aria-label="Имя или никнейм" maxLength={40} value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="Имя или никнейм" required autoComplete="nickname"/></label><GradePicker value={grade} onChange={setGrade}/><button className="standalone-primary">Начать обучение →</button></form><small>Результаты хранятся только на этом устройстве. Сохраняй резервную копию в профиле.</small></section></main>
}
function useProgress(){
 const [rows,setRows]=useState([])
 useEffect(()=>{let live=true;const load=()=>bankAttempts(localIdentity().id).then(r=>{if(live)setRows(r)});load();window.addEventListener('genius-local-progress',load);return()=>{live=false;window.removeEventListener('genius-local-progress',load)}},[])
 const solved=new Set(rows.filter(a=>a.result?.correct===true).map(a=>a.taskId)).size
 return {rows,solved,xp:rows.reduce((sum,a)=>sum+(a.result?.xpAwarded||0),0)}
}
export function StandaloneDashboard({grade,setScreen}){
 const {solved,xp}=useProgress(),[name,setName]=useState('Ученик')
 useEffect(()=>setName(localIdentity().nickname),[])
 return <section className="standalone-dashboard"><header><span className="standalone-eyebrow">GENIUS · НА ТВОЁМ УСТРОЙСТВЕ</span><h1>Привет, {name}!</h1><p>Продолжай изучать физику в своём темпе.</p></header><div className="standalone-metrics"><article><span>Класс</span><strong>{grade}</strong></article><article><span>Решено задач</span><strong>{solved}</strong></article><article><span>Заработано XP</span><strong>{xp}</strong></article></div><div className="standalone-actions">{[['practice','◇','Задачник','Задачи за 7, 8 и 9 класс'],['fipi','Φ','Банк заданий ФИПИ','Тренировка по типам и разделам ОГЭ'],['topics','▦','Учебник','Теория и интерактивные материалы'],['materials','▤','Справочные материалы','Таблицы и физические величины'],['formulas','Σ','Основные формулы','Формулы по разделам физики'],['profile','◉','Мой профиль','Прогресс и резервная копия']].map(([id,icon,title,text])=><button key={id} onClick={()=>setScreen(id)}><span>{icon}</span><h2>{title}</h2><p>{text}</p><small>Открыть →</small></button>)}</div><p className="standalone-local-note">Все материалы включены в приложение. Ответы и прогресс сохраняются локально.</p></section>
}
export function StandaloneProfile({grade,setGrade}){
 const {solved,xp}=useProgress(),[nickname,setNickname]=useState(''),[message,setMessage]=useState('')
 useEffect(()=>setNickname(localIdentity().nickname),[])
 async function backup(){
  try{const {exportLocalBackup,saveBackupFile}=await import('./standalone-backup.mjs');await saveBackupFile(await exportLocalBackup());setMessage('Резервная копия подготовлена.')}catch{setMessage('Не удалось сохранить копию. Попробуй ещё раз.')}
 }
 async function restore(event){
  const file=event.target.files?.[0];if(!file)return
  try{if(file.size>15000000)throw Error('Файл копии слишком большой.');const {importLocalBackup}=await import('./standalone-backup.mjs');await importLocalBackup(JSON.parse(await file.text()));setMessage('Копия восстановлена. Приложение перезапускается.');window.location.reload()}catch(e){setMessage(e.message||'Не удалось прочитать копию.')}event.target.value=''
 }
 return <section className="standalone-card standalone-profile"><h2>Мой профиль</h2><p>{solved} задач решено · {xp} XP</p><form onSubmit={e=>{e.preventDefault();saveLocalProfile({nickname,grade});setMessage('Профиль сохранён.')}}><label>Имя или никнейм<input aria-label="Имя или никнейм" value={nickname} maxLength={40} onChange={e=>setNickname(e.target.value)} required/></label><GradePicker value={grade} onChange={value=>{setGrade(value);saveLocalProfile({nickname,grade:value})}}/><button className="standalone-primary">Сохранить профиль</button></form><h3>Резервная копия</h3><p>Сохраняет профиль, ответы, XP и настройки разделов. Используй для переноса на другое устройство.</p><button className="standalone-primary" onClick={backup}>Сохранить копию прогресса</button><label className="standalone-import">Восстановить копию<input type="file" accept="application/json,.json" onChange={restore}/></label><p role="status">{message}</p><small>Общего кабинета класса и синхронизации между устройствами в автономной версии нет. Перед удалением приложения сохрани копию прогресса.</small></section>
}
