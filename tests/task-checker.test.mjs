import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {checkAnswer,numericValue,publishable} from '../shared/task-checker.mjs'
const tasks=JSON.parse(fs.readFileSync(new URL('../bank/tasks.json',import.meta.url)))
const grade7=JSON.parse(fs.readFileSync(new URL('../bank/tasks-grade7.json',import.meta.url)))

test('319 published grade 8 tasks imported from user-supplied sources',()=>{
  assert.equal(tasks.length,319)
  assert.equal(tasks.filter(t=>t.ORIGIN==='CURATED_SOURCE_PACK_V12_50').length,50)
  assert.equal(tasks.filter(t=>t.ORIGIN==='PERYSHKIN_COLLECTION_V13').length,169)
  assert.ok(new Set(tasks.map(t=>t.PARAGRAPH).filter(Number.isInteger)).size>=20)
  assert.ok(tasks.filter(t=>t.IMAGE_REQUIRED).length>=18)
  for(const t of tasks){assert.ok(publishable(t));assert.ok(t.CHECK.independent);assert.equal('HINT_1' in t,false);assert.equal('HINT_2' in t,false);assert.ok(Array.isArray(t.SOLUTION))}
})

test('grade 7 pack keeps only selected objective/calculation tasks from 1-168',()=>{
  assert.equal(grade7.length,71)
  assert.equal(grade7.every(t=>t.CLASS===7&&t.BOOK_TASK_NUMBER>=1&&t.BOOK_TASK_NUMBER<=168),true)
  assert.equal(grade7.some(t=>t.TASK_TYPE==='qualitative'),false)
  assert.equal(grade7.every(t=>publishable(t)&&t.CHECK.independent&&t.SOLUTION.length===0),true)
  const t161=grade7.find(t=>t.BOOK_TASK_NUMBER===161)
  assert.equal(t161.TASK.includes('рис'),false)
  assert.equal(t161.DIAGRAM.type,'multi-line-chart')
  assert.deepEqual(t161.DIAGRAM.series[0].points.at(-1),[2,120])
})

test('v12 pack contains 10 tasks from each new PDF and no published solutions',()=>{
  const fresh=tasks.filter(t=>t.ORIGIN==='CURATED_SOURCE_PACK_V12_50')
  const counts=new Map();for(const t of fresh) counts.set(t.SOURCE.file,(counts.get(t.SOURCE.file)||0)+1)
  assert.deepEqual([...counts.values()].sort((a,b)=>a-b),[10,10,10,10,10])
  assert.equal(fresh.filter(t=>t.DIFFICULTY==='ПОВЫШЕННЫЙ').length>0,true)
  assert.equal(fresh.filter(t=>t.DIFFICULTY==='ВЫСОКИЙ').length>0,true)
  assert.equal(fresh.every(t=>t.SOLUTION.length===0),true)
})

test('legacy graded tasks accept correct answers and manual tasks stay ungraded',()=>{
  for(const t of tasks){
    if(t.ANSWER.mode==='manual'){const r=checkAnswer(t,'черновой ответ');assert.equal(r.correct,null,t.ID);assert.equal(r.reviewRequired,true,t.ID);continue}
    const a=t.ANSWER.mode==='numeric'?t.ANSWER.value:t.ANSWER.values[0]
    assert.equal(checkAnswer(t,a).correct,true,t.ID)
    assert.equal(checkAnswer(t,t.ANSWER.mode==='numeric'?Number(a)+100:'999').correct,false,t.ID)
  }
})

test('grade 7 numeric lists and mixed parts are checked field-by-field',()=>{
  const t20=grade7.find(t=>t.BOOK_TASK_NUMBER===20)
  assert.equal(checkAnswer(t20,[.1,1,1,.2,10]).correct,true)
  assert.equal(checkAnswer(t20,[.1,1,1,.2,11]).correct,false)
  const t161=grade7.find(t=>t.BOOK_TASK_NUMBER===161)
  assert.equal(checkAnswer(t161,[60,30,'б']).correct,true)
  assert.equal(checkAnswer(t161,[60,30,'а']).correct,false)
})

test('ordered answers accept harmless spaces and separators',()=>{
  const t=tasks.find(x=>x.ANSWER.values?.[0].length===3),a=t.ANSWER.values[0]
  assert.equal(checkAnswer(t,`${a[0]} ${a[1]} ${a[2]}`).correct,true)
  assert.equal(checkAnswer(t,`${a[0]},${a[1]},${a[2]}`).correct,true)
})

test('numeric normalization does not accept blank, units, hex or nonfinite numbers',()=>{
  assert.equal(numericValue(' −0,5 '),-.5)
  for(const value of ['', ' ',null,[],{},'0x10','Infinity','NaN','2 Дж','1,2,3','1e999'])assert.equal(numericValue(value),null,String(value))
})

test('unreviewed content never receives a grade',()=>{
  assert.throws(()=>checkAnswer({...tasks[0],STATUS:'REVIEW_REQUIRED'},'1'))
  assert.equal(publishable({...tasks[0],STATUS:'ANSWER_MISMATCH',CHECK:{resolved:false}}),false)
})
