import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {ogeTasks} from '../app/oge-task-data.mjs'
import {withVerifiedTextbookKey} from '../shared/verified-task-keys.mjs'
import {checkOgeAttempt,teacherAnswerLabel} from '../shared/oge-attempts.mjs'
import {checkAnswer} from '../shared/task-checker.mjs'
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)))
const ogeKeys=read('../bank/verified-oge-keys.json'),bookKeys=read('../bank/verified-textbook-keys.json')
const books=[...read('../bank/tasks.json'),...read('../bank/tasks-grade8-additions.json'),...read('../public/task-bank/grade9.json').tasks].map(withVerifiedTextbookKey)
const book=n=>books.find(t=>Number(t.ID.split('-').at(-1))===n)
const oge=id=>ogeTasks.find(t=>t.id===id)

test('All 387 formerly missing keys have verification evidence and an answer in the teacher field',()=>{
 assert.equal(Object.keys(ogeKeys).length,213)
 assert.equal(Object.keys(bookKeys).length,174)
 assert.equal(ogeTasks.filter(t=>t.answer==null).length,0)
 for(const [id,key] of Object.entries(ogeKeys)){
  assert.ok(key.verification.reason,id)
  assert.equal(checkOgeAttempt(oge(id),key.answer).correct,true,id)
  for(const alternative of key.answerAlternatives||[])assert.equal(checkOgeAttempt(oge(id),alternative).correct,true,id)
 }
 for(const [id,key] of Object.entries(bookKeys)){
  const task=books.find(t=>t.ID===id)
  assert.ok(task,id)
  assert.equal(task.ANSWER_VERIFIED,true,id)
  assert.ok(teacherAnswerLabel(task.ANSWER),id)
  assert.ok(key.verification.reason,id)
  const spec=task.ANSWER
  const response=spec.mode==='numeric'?String(spec.value):spec.mode==='parts'?spec.parts.map(p=>String(p.value??p.values[0])):'Краткий ответ ученика'
  const result=checkAnswer(task,response)
  assert.equal(result.correct,spec.mode==='manual'?null:true,id)
  assert.equal(checkAnswer(task,spec.mode==='parts'?spec.parts.map(()=> '999999999999'):'999999999999').correct,spec.mode==='manual'?null:false,id)
 }
 assert.equal(Object.values(bookKeys).filter(k=>k.answer.mode==='manual').length,20)
})

test('Independent heat balances, phase changes and efficiency calculations grade rounded answers',()=>{
 // Q = m c ΔT; kettle and water both consume heat.
 assert.equal(checkAnswer(book(758),'3109500').correct,true)
 // 0.45×4200×4 = 0.2×c×76.
 assert.equal(checkAnswer(book(771),'497,37').correct,true)
 // Ice at −4°C: heating ice, melting, heating water to 100°C.
 assert.equal(checkAnswer(book(856),'15168000').correct,true)
 // Heating water with 7 g alcohol gives 75600/189000 = 40%.
 assert.equal(checkAnswer(book(797),'40').correct,true)
 assert.equal(checkAnswer(book(865),['4032000000','149,33']).correct,true)
 // Four separate readings, not one concatenated response.
 assert.equal(checkAnswer(book(839),['80','4','2','87']).correct,true)
 assert.equal(checkAnswer(book(839),['80','4','2','100']).correct,false)
 assert.equal(checkAnswer(book(737),['920','380','1','540']).correct,true)
 assert.equal(checkAnswer(book(737),['920','380','2','540']).correct,false)
 assert.ok(book(860).TASK.includes('Начальная температура льда — 0°C'))
 assert.ok(book(893).TASK.includes('охлаждение образовавшейся воды не учитывается'))
})

test('Physics alternatives are accepted without accepting arbitrary or malformed answers',()=>{
 assert.equal(checkOgeAttempt(oge('oge-1-1182'),['5','3','4']).correct,true) // N·m = J.
 assert.equal(checkOgeAttempt(oge('oge-1-1182'),['5','4','3']).correct,false)
 assert.equal(checkOgeAttempt(oge('oge-1-1182'),['5','3','4','1']).correct,false)
 assert.equal(checkOgeAttempt(oge('oge-14-23872'),[1,5]).correct,true)
 assert.equal(checkOgeAttempt(oge('oge-14-23872'),[3,5]).correct,true)
 assert.equal(checkOgeAttempt(oge('oge-14-23872'),[1,2]).correct,false)
 assert.equal(checkOgeAttempt(oge('oge-14-23872'),[1,1]).correct,false)
 // Coordinate graph vs velocity graph: different answers despite same contour.
 assert.equal(checkOgeAttempt(oge('oge-14-534'),[1,2]).correct,true)
 assert.equal(checkOgeAttempt(oge('oge-14-561'),[4,5]).correct,true)
 assert.equal(checkOgeAttempt(oge('oge-14-561'),[1,2]).correct,false)
 assert.ok(oge('oge-14-29562').options[3].includes('t₅'))
 assert.ok(oge('oge-14-14180').options[3].includes('4 + t'))
})
