'use client'
import {useEffect,useMemo,useRef,useState} from 'react'
import Grade7TaskBank from './grade7-task-bank'
import TaskBank from './task-bank'
import Grade9TaskBank from './grade9-task-bank'
const GRADE_KEY='genius:task-bank-grade:v3'
export default function UnifiedTaskBank({initialGrade=7,onXp=()=>{},refreshOffline=async()=>{},setScreen=()=>{},onBack=()=>{}}){
 const hub=useRef(null)
 function back(){const button=hub.current?.querySelector('.bank-detail .bank-back, article[class*="detail"] nav button:first-child');if(button)button.click();else onBack()}
 const [grade,setGrade]=useState([7,8,9].includes(initialGrade)?initialGrade:7),[search,setSearch]=useState(''),[data,setData]=useState(null)
 useEffect(()=>{try{const saved=Number(sessionStorage.getItem(GRADE_KEY));if([7,8,9].includes(saved))setGrade(saved);setSearch(sessionStorage.getItem('genius:task-bank-search:v1')||'')}catch{};let live=true;fetch('/task-bank/search-all.json').then(r=>r.ok?r.json():Promise.reject()).then(value=>{if(live)setData(value)}).catch(()=>{});return()=>{live=false}},[])
 const searchIds=useMemo(()=>{const q=search.trim().toLocaleLowerCase('ru-RU').replaceAll('ё','е');return q&&data?new Set(data.tasks.filter(t=>t.grade===grade&&t.searchText.includes(q)).map(t=>t.id)):null},[search,data,grade])
 const props={onXp,searchIds,clearSearch:()=>{setSearch('');try{sessionStorage.removeItem('genius:task-bank-search:v1')}catch{}}}
 return <section ref={hub} className="task-bank-hub" data-native-layout="true"><header className="book-bank-header"><div className="book-heading"><span aria-hidden="true">◇</span><div><h1>Задачник</h1><p>Задачи по физике для практики</p></div></div><div className="book-header-controls"><label className="task-bank-grade"><span className="sr-only">Класс</span><select aria-label="Класс задачника" value={grade} onChange={e=>{const value=Number(e.target.value);setGrade(value);try{sessionStorage.setItem(GRADE_KEY,String(value))}catch{}}}>{[7,8,9].map(value=><option key={value} value={value}>{value} класс</option>)}</select></label><label className="book-search"><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={e=>{setSearch(e.target.value);try{sessionStorage.setItem('genius:task-bank-search:v1',e.target.value)}catch{}}} placeholder="Поиск по номеру, теме или ключевому слову…" aria-label="Поиск задачи"/></label><button type="button" onClick={back}>← Назад</button><button type="button" onClick={()=>setScreen('home')}>⌂ Домой</button></div></header>{search.trim()&&!data&&<p role="status">Загружаем поиск…</p>}{grade===7?<Grade7TaskBank {...props}/>:grade===8?<TaskBank {...props} refreshOffline={refreshOffline} setScreen={setScreen}/>:<Grade9TaskBank {...props}/>}</section>
}
