'use client'
import {useEffect,useMemo,useState} from 'react'
import katex from 'katex'
import {importLectureLibrary,loadLectureLibraries} from './lecture-libraries'
import {readLocalProfile,saveLocalProfile} from './standalone-mode.mjs'

const normalize=value=>String(value||'').toLocaleLowerCase('ru').replaceAll('ё','е')

function Formula({value}){
 const html=useMemo(()=>{try{return katex.renderToString(value,{displayMode:true,throwOnError:true,strict:'ignore',trust:false})}catch{return ''}},[value])
 return html?<div className="lecture-formula" role="math" aria-label={value} dangerouslySetInnerHTML={{__html:html}}/>:<p className="lecture-formula-fallback">{value}</p>
}

export default function LectureCourse({grade,setGrade,query,selected,setSelected}){
 const [libraries,setLibraries]=useState([]),[libraryId,setLibraryId]=useState(''),[section,setSection]=useState(''),[viewed,setViewed]=useState(new Set()),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{
  let live=true
  loadLectureLibraries().then(result=>{if(live){setLibraries(result);setLoading(false);setError('')}}).catch(cause=>{if(live){setLoading(false);setError(cause.message)}})
  try{setSelected(sessionStorage.getItem('genius:lecture:v1')||'')}catch{}
  return()=>{live=false}
 },[setSelected])
 useEffect(()=>{try{setViewed(new Set(JSON.parse(localStorage.getItem('genius:lesson-views:v1')||'[]')))}catch{}},[grade,selected])
 const available=libraries.filter(library=>library.grade===grade)
 const library=available.find(item=>item.id===libraryId)||available[0]
 const lecture=library?.lessons.find(item=>item.id===selected)
 const index=library?.lessons.findIndex(item=>item.id===selected)??-1
 const sections=[...new Set(library?.lessons.map(item=>item.section)||[])]
 const visible=(library?.lessons||[]).filter(item=>(!section||item.section===section)&&normalize(query).split(/\s+/).filter(Boolean).every(word=>normalize([item.title,item.section,item.summary,...item.blocks.flatMap(block=>[block.heading,block.text,block.symbols])].join(' ')).includes(word)))

 function open(id){
  setSelected(id)
  try{sessionStorage.setItem('genius:lecture:v1',id);const seen=new Set(JSON.parse(localStorage.getItem('genius:lesson-views:v1')||'[]'));seen.add(id);localStorage.setItem('genius:lesson-views:v1',JSON.stringify([...seen]));window.dispatchEvent(new Event('genius-local-progress'))}catch{}
  window.scrollTo(0,0)
 }
 function close(){setSelected('');try{sessionStorage.removeItem('genius:lecture:v1')}catch{};window.scrollTo(0,0)}
 async function importFile(event){
  const file=event.target.files?.[0]
  if(!file)return
  try{
   const imported=await importLectureLibrary(file)
   setLibraries(previous=>[...previous.filter(item=>item.id!==imported.id),imported]);setGrade(imported.grade);saveLocalProfile({...readLocalProfile(),grade:imported.grade});setLibraryId(imported.id);setSection('');setSelected('');setError('')
  }catch(cause){setError(cause.message)}
  event.target.value=''
 }
 if(lecture)return <article className="lecture-reader"><div className="lecture-reader-meta"><span>{lecture.section}</span><span>{index+1} из {library.lessons.length}</span></div><h2>{lecture.title}</h2><p className="lecture-lead">{lecture.intro}</p>{lecture.blocks.map((block,i)=><section className="lecture-block" key={`${lecture.id}-${i}`}><div className="lecture-block-heading"><h3>{block.heading}</h3>{block.source&&<small>{block.source}</small>}</div><p>{block.text}</p>{block.equations.map((value,j)=><Formula key={`${i}-${j}`} value={value}/>)}{block.symbols&&<p className="lecture-explanation"><strong>Обозначения.</strong> {block.symbols}</p>}{block.conditions&&<p className="lecture-condition"><strong>Когда применять.</strong> {block.conditions}</p>}</section>)}<aside className="lecture-takeaway"><strong>Как использовать формулы</strong><p>{lecture.takeaway}</p></aside><footer className="lecture-reader-footer"><button type="button" onClick={close}>← К списку лекций</button><div><button type="button" disabled={index<1} onClick={()=>open(library.lessons[index-1].id)}>← Предыдущая</button><button type="button" disabled={index>=library.lessons.length-1} onClick={()=>open(library.lessons[index+1].id)}>Следующая →</button></div></footer></article>
 return <div className="lecture-course"><div className="lecture-library-picker"><label>Библиотека <select aria-label="Библиотека лекций" value={library?.id||''} onChange={event=>{setLibraryId(event.target.value);setSection('')}}>{available.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="lecture-import">＋ Подключить библиотеку <input type="file" accept=".json,application/json" onChange={importFile}/></label><span>Подключённые файлы хранятся на этом устройстве. Прогресс ученика сохраняется отдельно.</span></div>{error&&<p className="lecture-error" role="alert">{error}</p>}{loading&&<p className="catalog-result-count">Загружаем библиотеки лекций…</p>}<nav className="book-areas textbook-sections" aria-label="Разделы лекций">{['',...sections].map(name=><button type="button" key={name} aria-pressed={section===name} onClick={()=>setSection(name)}>{name||'Все разделы'}</button>)}</nav><p className="catalog-result-count" role="status">Найдено тем: {visible.length} · просмотрено: {(library?.lessons||[]).filter(item=>viewed.has(item.id)).length} из {library?.lessons.length||0}</p><div className="textbook-grid">{visible.map(item=><button type="button" key={item.id} className="textbook-topic-card" onClick={()=>open(item.id)}><small>{item.section}</small><h2>{item.title}</h2><p>{item.summary}</p><span>{viewed.has(item.id)?'✓ Просмотрено':'Читать лекцию →'}</span></button>)}</div>{!visible.length&&!loading&&<p className="catalog-empty">Темы не найдены. Попробуй другой раздел, слово или библиотеку.</p>}</div>
}
