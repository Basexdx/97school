'use client'
import {openOfflineDb} from './offline-db'
const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})
const done=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})
async function meta(key,value) {
  const db=await openOfflineDb(), tx=db.transaction('meta',value===undefined?'readonly':'readwrite'), wait=done(tx)
  const result=await request(value===undefined?tx.objectStore('meta').get(key):tx.objectStore('meta').put({key,value}))
  await wait;return value===undefined?result?.value:value
}
export async function bankIdentity() {
  if(!navigator.onLine) return (await meta('bank-student'))||null
  const r=await fetch('/api/student/me',{credentials:'include',cache:'no-store'})
  if(r.status===401) {await meta('bank-student',null);return null}
  if(!r.ok) throw Error('Не удалось проверить сессию ученика. Попробуйте позже.')
  const {student}=await r.json();await meta('bank-student',student);return student
}
export async function bankPendingLocal() {
  const student=await meta('bank-student')
  if(!student)return []
  return (await bankAttempts(student.id)).filter(a=>a.status==='PENDING_SYNC')
}
export async function bankIndex() {
  if(navigator.onLine) {
    try {const r=await fetch('/task-bank/index.json',{cache:'no-store'});if(r.ok){const data=await r.json();await meta('bank-index',data);return data}} catch {}
  }
  const saved=await meta('bank-index');if(saved)return saved
  throw Error('Подключитесь к интернету, чтобы открыть список задач.')
}
async function savedTasks() {
  const db=await openOfflineDb(),tx=db.transaction('content','readonly'),wait=done(tx)
  const rows=await request(tx.objectStore('content').getAll());await wait
  return rows.filter(x=>x.kind==='task-bank').flatMap(x=>x.tasks||[])
}
export async function loadBankTask(id,version) {
  if(navigator.onLine) {
    try {const r=await fetch(`/task-bank/${encodeURIComponent(id)}.json`,{cache:'no-store'});if(r.ok){const t=await r.json();if(t.VERSION!==version)throw Error('Версия банка обновилась. Обновите страницу.');return t}} catch(e) {if(e.message.includes('Версия'))throw e}
  }
  const task=(await savedTasks()).find(t=>t.ID===id&&t.VERSION===version)
  if(!task)throw Error('Эта задача ещё не скачана. Подключитесь к интернету и скачайте тему или раздел.')
  return task
}
export async function downloadBankPackage(index,kind,value) {
  if(!navigator.onLine)throw Error('Для скачивания нужен интернет.')
  const selection=index.tasks.filter(t=>kind==='section'?t.section===value:t.paragraph===Number(value))
  if(!selection.length)throw Error('В этом пакете пока нет задач.')
  const tasks=[]
  for(const item of selection) tasks.push(await loadBankTask(item.id,index.version))
  // Inline diagrams live inside task JSON and therefore work offline. External assets would need a separate cache step.
  if(tasks.some(t=>t.ASSETS?.length))throw Error('Для этой темы есть внешние материалы, которые пока нельзя сохранить офлайн.')
  const id=`task-bank:${kind}:${value}`
  const sectionTitle=value==='thermal'?'Тепловые явления':value==='electric'?'Электрические явления':'Электромагнитные и световые явления'
  const title=kind==='section'?`Задачи: ${sectionTitle}`:`Задачи §${value}`
  const content={id:id+':content',packageId:id,kind:'task-bank',tasks}
  const sizeBytes=new Blob([JSON.stringify(content)]).size
  const db=await openOfflineDb(),tx=db.transaction(['packages','content'],'readwrite'),wait=done(tx)
  tx.objectStore('content').put(content)
  tx.objectStore('packages').put({id,grade:8,kind:'task-bank',title,contentVersion:index.version,sizeBytes,downloadedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),status:'READY',itemCount:tasks.length})
  await wait;return {count:tasks.length,sizeBytes}
}
async function attemptDb() {
  return new Promise((resolve,reject)=>{const r=indexedDB.open('genius-task-attempts',1);r.onupgradeneeded=()=>r.result.createObjectStore('attempts',{keyPath:'attemptId'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})
}
async function putAttempt(value) {const db=await attemptDb(),tx=db.transaction('attempts','readwrite'),wait=done(tx);tx.objectStore('attempts').put(value);await wait;return value}
export async function bankAttempts(owner) {
  const db=await attemptDb(),tx=db.transaction('attempts','readonly'),wait=done(tx),rows=await request(tx.objectStore('attempts').getAll());await wait
  return rows.filter(x=>x.owner===(owner||'guest')).sort((a,b)=>a.createdAt.localeCompare(b.createdAt))
}
export async function saveBankAttempt(owner,task,answer,localResult) {
  const id=crypto.randomUUID()
  return putAttempt({attemptId:id,eventId:id,owner:owner||'guest',taskId:task.ID,version:task.VERSION,answer,createdAt:new Date().toISOString(),status:owner?'PENDING_SYNC':'LOCAL_PRACTICE',localResult})
}
let syncing=null
export function syncBankAttempts() {
  if(syncing)return syncing
  syncing=syncInner().finally(()=>{syncing=null});return syncing
}
async function syncInner() {
  if(!navigator.onLine)return {offline:true}
  const student=await bankIdentity();if(!student)return {authRequired:true}
  const rows=(await bankAttempts(student.id)).filter(x=>x.status==='PENDING_SYNC')
  let totalXp
  for(let start=0;start<rows.length;start+=50) {
    const batch=rows.slice(start,start+50)
    const r=await fetch('/api/student/task-attempts',{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:student.id,attempts:batch.map(({attemptId,eventId,taskId,version,answer})=>({attemptId,eventId,taskId,version,answer}))})})
    if(!r.ok)throw Error(r.status===401?'Нужно войти по коду ученика.':'Синхронизация пока недоступна. Попытки сохранены.')
    const data=await r.json();if(data.studentId!==student.id)throw Error('Сессия ученика изменилась.')
    totalXp=data.totalXp
    for(const row of batch) {const result=data.results.find(x=>x.attemptId===row.attemptId);if(result)await putAttempt({...row,status:result.status,result})}
  }
  const response=await fetch('/api/student/task-attempts',{credentials:'include',cache:'no-store'})
  if(response.ok) {
    const data=await response.json();if(data.studentId!==student.id)throw Error('Сессия ученика изменилась.')
    totalXp=data.totalXp
    const local=new Map((await bankAttempts(student.id)).map(x=>[x.attemptId,x]))
    for(const row of data.attempts) {
      const old=local.get(row.attempt_id)
      await putAttempt({...old,attemptId:row.attempt_id,eventId:row.event_id,taskId:row.task_id,owner:student.id,createdAt:row.received_at,status:row.status,result:{correct:row.correct===null?null:Boolean(row.correct),xpAwarded:row.xp_awarded,status:row.status}})
    }
  }
  return {student,totalXp}
}
