import test from 'node:test'
import assert from 'node:assert/strict'
import {hasQuickAnswer} from '../shared/quick-answer.mjs'
import {summarizeProgress} from '../shared/progress-summary.mjs'
import {setLocalPassword,unlockLocalProfile,lockLocalProfile,localSessionOpen,hasLocalPassword,AUTH_KEY} from '../app/local-auth.mjs'

test('free-form tasks are excluded while numeric parts, choice and matching remain',()=>{
 for(const mode of ['manual','text'])assert.equal(hasQuickAnswer({ANSWER:{mode}}),false)
 for(const mode of ['numeric','numeric_list','matching','set'])assert.equal(hasQuickAnswer({ANSWER:{mode}}),true)
 assert.equal(hasQuickAnswer({ANSWER:{mode:'parts',parts:[{type:'text'}]}}),false)
 assert.equal(hasQuickAnswer({ANSWER:{mode:'parts',parts:[{type:'numeric'},{type:'set'}]}}),true)
})
test('statistics deduplicate tasks, include attempts as views and retain historical XP',()=>{
 const catalog=[{id:'a',source:'Задачник',grade:8,section:'Тепловые явления',topic:'Нагрев'},{id:'b',source:'Задачник',grade:8,section:'Тепловые явления',topic:'Нагрев'},{id:'c',source:'ФИПИ',grade:9,section:'Механика',topic:'ФИПИ · Тип 1'}]
 const attempts=[{taskId:'a',result:{correct:false,xpAwarded:0}},{taskId:'a',result:{correct:true,xpAwarded:7}},{taskId:'hidden-old-task',result:{correct:true,xpAwarded:10}}]
 const stats=summarizeProgress([...catalog,catalog[0]],attempts,['b'],['c'])
 assert.deepEqual([stats.total,stats.viewed,stats.solved,stats.remaining,stats.xp,stats.topicsTotal,stats.topicsComplete,stats.topicsRemaining],[3,3,2,1,17,2,1,1])
 assert.equal(stats.sections[0].remaining,1)
})
test('local password is salted and hashed, wrong password never unlocks the profile',async()=>{
 const local=new Map(),session=new Map();globalThis.localStorage={getItem:k=>local.get(k),setItem:(k,v)=>local.set(k,v)};globalThis.sessionStorage={getItem:k=>session.get(k),setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)}
 await setLocalPassword('school-pass');assert.equal(hasLocalPassword(),true);assert.equal(localSessionOpen(),true)
 assert.ok(!local.get(AUTH_KEY).includes('school-pass'));lockLocalProfile();assert.equal(localSessionOpen(),false)
 assert.equal(await unlockLocalProfile('wrong'),false);assert.equal(localSessionOpen(),false)
 assert.equal(await unlockLocalProfile('school-pass'),true);assert.equal(localSessionOpen(),true)
})
