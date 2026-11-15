import {PROFILE_KEY,saveLocalProfile} from './standalone-mode.mjs'
const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})
const done=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})
async function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open('genius-task-attempts',1);r.onupgradeneeded=()=>r.result.createObjectStore('attempts',{keyPath:'attemptId'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
export async function exportLocalBackup(){
 const database=await db(),tx=database.transaction('attempts','readonly'),wait=done(tx),attempts=await request(tx.objectStore('attempts').getAll());await wait;database.close()
 const storage={};for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key.startsWith('genius:'))storage[key]=localStorage.getItem(key)}
 return {format:'genius-standalone',version:1,createdAt:new Date().toISOString(),storage,attempts:attempts.filter(a=>a.owner==='local-student')}
}
export function validateLocalBackup(data){
 if(data?.format!=='genius-standalone'||data.version!==1||!Array.isArray(data.attempts)||data.attempts.length>50000||!data.storage||typeof data.storage!=='object')throw Error('Это не резервная копия Genius.')
 let profile;try{profile=JSON.parse(data.storage[PROFILE_KEY])}catch{throw Error('В копии не найден профиль.')}
 if(typeof profile?.nickname!=='string'||![7,8,9].includes(profile.grade))throw Error('Профиль в копии повреждён.')
 const ids=new Set()
 for(const row of data.attempts){if(typeof row?.attemptId!=='string'||ids.has(row.attemptId)||row.owner!=='local-student'||typeof row.taskId!=='string'||!Number.isFinite(Date.parse(row.createdAt))||!['CONFIRMED','PENDING_REVIEW'].includes(row.status)||!Number.isInteger(row.result?.xpAwarded)||row.result.xpAwarded<0||row.result.xpAwarded>1000)throw Error('Копия содержит некорректные попытки.');ids.add(row.attemptId)}
 const storage=Object.entries(data.storage);if(storage.some(([key,value])=>!key.startsWith('genius:')||typeof value!=='string'||value.length>500000))throw Error('Настройки в копии повреждены.')
 return profile
}
export async function importLocalBackup(data){
 const profile=validateLocalBackup(data)
 const database=await db(),tx=database.transaction('attempts','readwrite'),wait=done(tx),store=tx.objectStore('attempts');store.clear();for(const row of data.attempts)store.put(row);await wait;database.close()
 for(const [key,value] of Object.entries(data.storage))localStorage.setItem(key,value)
 saveLocalProfile(profile);sessionStorage.clear();window.dispatchEvent(new Event('genius-local-progress'))
}
export async function saveBackupFile(data){
 const name=`Genius-progress-${new Date().toISOString().slice(0,10)}.json`,text=JSON.stringify(data)
 const {Capacitor}=await import('@capacitor/core')
 if(Capacitor.isNativePlatform()){
  const {Filesystem,Directory,Encoding}=await import('@capacitor/filesystem'),{Share}=await import('@capacitor/share')
  const file=await Filesystem.writeFile({path:name,data:text,directory:Directory.Cache,encoding:Encoding.UTF8})
  await Share.share({title:'Резервная копия Genius',url:file.uri,dialogTitle:'Сохранить копию прогресса'});return
 }
 const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)
}
