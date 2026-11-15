import test from 'node:test'
import assert from 'node:assert/strict'
import 'fake-indexeddb/auto'
import {build} from 'esbuild'

test('offline attempts award XP once, retain manual answers and never call an API',async()=>{
 const storage=new Map([['genius:local-profile:v1',JSON.stringify({nickname:'Саша',grade:8})]])
 globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)}
 globalThis.window=new EventTarget();window.indexedDB=globalThis.indexedDB
 Object.defineProperty(globalThis,'navigator',{value:{onLine:false},configurable:true})
 globalThis.fetch=()=>{throw Error('Offline attempts must not use network')}
 const bundled=await build({entryPoints:['app/task-store.js'],bundle:true,format:'esm',platform:'node',write:false,define:{'process.env.NEXT_PUBLIC_GENIUS_STANDALONE':'"1"'}})
 const store=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'))
 const student=await store.bankIdentity();assert.equal(student.id,'local-student')
 const task={ID:'test-local',VERSION:'one',XP:10}
 await store.saveBankAttempt(student.id,task,'wrong',{correct:false})
 const right=await store.saveBankAttempt(student.id,task,'right',{correct:true})
 assert.equal(right.result.xpAwarded,7)
 const repeat=await store.saveBankAttempt(student.id,task,'right',{correct:true})
 assert.equal(repeat.result.xpAwarded,0)
 const manual=await store.saveBankAttempt(student.id,{...task,ID:'manual'},'Краткий ответ',{correct:null})
 assert.equal(manual.status,'PENDING_REVIEW');assert.equal(manual.result.xpAwarded,0)
 const progress=await store.syncBankAttempts();assert.equal(progress.totalXp,7)
 assert.equal((await store.bankAttempts(student.id)).length,4)
})
