import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {checkAnswer,numericValue,publishable} from '../shared/task-checker.mjs'
import {enrichMatchingTask,matchingAnswerValues,matchingParts} from '../shared/matching-utils.mjs'
const tasks=JSON.parse(fs.readFileSync(new URL('../bank/tasks.json',import.meta.url)))
const grade8extra=JSON.parse(fs.readFileSync(new URL('../bank/tasks-grade8-additions.json',import.meta.url)))
const grade7=JSON.parse(fs.readFileSync(new URL('../bank/tasks-grade7.json',import.meta.url)))
const grade9=JSON.parse(fs.readFileSync(new URL('../bank/tasks-grade9.json',import.meta.url)))

test('319 published grade 8 base tasks imported from user-supplied sources',()=>{
  assert.equal(tasks.length,319)
  assert.equal(tasks.filter(t=>t.ORIGIN==='CURATED_SOURCE_PACK_V12_50').length,50)
  assert.equal(tasks.filter(t=>t.ORIGIN==='PERYSHKIN_COLLECTION_V13').length,169)
  assert.ok(new Set(tasks.map(t=>t.PARAGRAPH).filter(Number.isInteger)).size>=20)
  assert.ok(tasks.filter(t=>t.IMAGE_REQUIRED).length>=18)
  for(const t of tasks){assert.ok(publishable(t));assert.ok(t.CHECK.independent);assert.equal('HINT_1' in t,false);assert.equal('HINT_2' in t,false);assert.ok(Array.isArray(t.SOLUTION))}
})

test('grade 8 completes Perishkin tasks 916-947',()=>{
  assert.equal(grade8extra.length,2)
  assert.deepEqual(grade8extra.map(t=>Number(t.SOURCE.task_id)),[916,917])
  assert.equal(grade8extra.every(t=>t.CLASS===8&&t.SECTION==='extra8'&&t.PARAGRAPH===null&&publishable(t)),true)
  const all=[...tasks,...grade8extra]
  for(let n=916;n<=947;n++)assert.ok(all.some(t=>Number(t.SOURCE?.task_id)===n),`missing ${n}`)
})

test('grade 7 pack includes the selected 1-168 set and numerical tasks from 183-347',()=>{
  assert.equal(grade7.length,142)
  const original=grade7.filter(t=>t.BOOK_TASK_NUMBER<=168)
  const added=grade7.filter(t=>t.BOOK_TASK_NUMBER>=183&&t.BOOK_TASK_NUMBER<=347)
  assert.equal(original.length,71)
  assert.equal(original.every(t=>t.CLASS===7&&publishable(t)&&t.CHECK.independent&&t.SOLUTION.length===0),true)
  assert.equal(added.length,71)
  assert.equal(added.every(t=>t.CLASS===7&&t.TASK_TYPE==='calculation'&&publishable(t)&&t.CHECK.independent&&['numeric','numeric_list'].includes(t.ANSWER.mode)),true)
  assert.equal(added.some(t=>t.TASK_TYPE==='qualitative'),false)
  assert.equal(grade7.some(t=>t.TASK_TYPE==='qualitative'),false)
  const t161=grade7.find(t=>t.BOOK_TASK_NUMBER===161)
  assert.equal(t161.TASK.includes('рис'),false)
  assert.equal(t161.DIAGRAM.type,'multi-line-chart')
  assert.deepEqual(t161.DIAGRAM.series[0].points.at(-1),[2,120])
})

test('grade 9 curated numerical range and complete free-fall block are source-faithful',()=>{
  assert.equal(grade9.length,59)
  assert.equal(grade9.every(t=>t.CLASS===9&&t.SECTION==='kinematics9'&&publishable(t)&&t.CHECK.independent&&t.SOLUTION.length===0),true)
  const first=grade9.filter(t=>t.BOOK_TASK_NUMBER>=1404&&t.BOOK_TASK_NUMBER<=1513)
  assert.equal(first.length,35)
  assert.equal(first.every(t=>['numeric','numeric_list'].includes(t.ANSWER.mode)&&!t.GRAPH_REQUIRED),true)
  const second=grade9.filter(t=>t.BOOK_TASK_NUMBER>=1588&&t.BOOK_TASK_NUMBER<=1611)
  assert.deepEqual(second.map(t=>t.BOOK_TASK_NUMBER).sort((a,b)=>a-b),Array.from({length:24},(_,i)=>1588+i))
  assert.equal(checkAnswer(grade9.find(t=>t.BOOK_TASK_NUMBER===1439),4).correct,true)
  assert.equal(checkAnswer(grade9.find(t=>t.BOOK_TASK_NUMBER===1611),[9.8,39.2]).correct,true)
  assert.equal(grade9.find(t=>t.BOOK_TASK_NUMBER===1606).GRAPH_REQUIRED,true)
})

test('v12 pack contains 10 tasks from each new PDF and no published solutions',()=>{
  const fresh=tasks.filter(t=>t.ORIGIN==='CURATED_SOURCE_PACK_V12_50')
  const counts=new Map();for(const t of fresh) counts.set(t.SOURCE.file,(counts.get(t.SOURCE.file)||0)+1)
  assert.deepEqual([...counts.values()].sort((a,b)=>a-b),[10,10,10,10,10])
  assert.equal(fresh.filter(t=>t.DIFFICULTY==='ПОВЫШЕННЫЙ').length>0,true)
  assert.equal(fresh.filter(t=>t.DIFFICULTY==='ВЫСОКИЙ').length>0,true)
  assert.equal(fresh.every(t=>t.SOLUTION.length===0),true)
})

test('every matching task renders all lettered rows and clean numbered options',()=>{
  const matching=tasks.filter(t=>t.TASK_TYPE==='matching')
  assert.ok(matching.length>0)
  for(const t of matching){
    const answers=matchingAnswerValues(t),parts=matchingParts(t),fixed=enrichMatchingTask(t)
    assert.ok(answers.length>=2,t.ID)
    assert.equal(parts.left.length,answers.length,t.ID)
    assert.deepEqual(parts.left.map(x=>x.id),['А','Б','В','Г','Д','Е'].slice(0,answers.length),t.ID)
    assert.ok(parts.right.length>=answers.length,t.ID)
    assert.equal(parts.right.some(x=>/запишите\s+(?:в\s+ответ|в\s+таблицу)/iu.test(x.text)),false,t.ID)
    assert.deepEqual(fixed.ANSWER.values,answers,t.ID)
    assert.equal(checkAnswer(t,answers).correct,true,t.ID)
  }
  const sample=tasks.find(t=>t.ID==='genius-src8-19-1606')
  assert.ok(sample)
  assert.deepEqual(matchingAnswerValues(sample),['2','4','3'])
  assert.deepEqual(matchingParts(sample).left.map(x=>x.text),['давление','жесткость','абсолютная влажность'])
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
