import test from 'node:test'
import assert from 'node:assert/strict'
import {validateLocalBackup} from '../app/standalone-backup.mjs'
import {PROFILE_KEY,readLocalProfile,saveLocalProfile,localIdentity} from '../app/standalone-mode.mjs'

test('standalone profile persists independently of sessions and normalizes grade and nickname',()=>{
 const values=new Map();globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}
 assert.equal(readLocalProfile(),null)
 assert.deepEqual(saveLocalProfile({nickname:'  Саша  ',grade:9}),{nickname:'Саша',grade:9})
 assert.equal(localIdentity().id,'local-student');assert.equal(localIdentity().nickname,'Саша')
 assert.deepEqual(saveLocalProfile({nickname:'',grade:42}),{nickname:'Ученик',grade:8})
})
test('backup validation rejects incomplete, foreign and duplicate attempts before writing',()=>{
 const row={attemptId:'one',owner:'local-student',taskId:'oge-1-1182',createdAt:new Date().toISOString(),status:'CONFIRMED',result:{correct:true,xpAwarded:20}}
 const backup={format:'genius-standalone',version:1,storage:{[PROFILE_KEY]:JSON.stringify({nickname:'Саша',grade:8})},attempts:[row]}
 assert.equal(validateLocalBackup(backup).nickname,'Саша')
 assert.throws(()=>validateLocalBackup({...backup,attempts:[row,row]}))
 assert.throws(()=>validateLocalBackup({...backup,attempts:[{...row,owner:'someone-else'}]}))
 assert.throws(()=>validateLocalBackup({...backup,attempts:[{...row,result:{xpAwarded:Infinity}}]}))
 assert.throws(()=>validateLocalBackup({...backup,storage:{arbitrary:'bad'}}))
})
