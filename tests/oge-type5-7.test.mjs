import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {ogeTasks,ogeCounts} from '../app/oge-task-data.mjs'
import {ogeType5Tasks} from '../app/oge-task-data-5.mjs'
import {ogeType7Tasks} from '../app/oge-task-data-7.mjs'
import {checkOgeChoiceAnswer,parseOgeChoiceInput,requiredOgeChoices,restoreOgeChoiceAnswers} from '../app/oge-choice-answer.mjs'
import {isCorrectOgeNumber} from '../app/oge-number-answer.mjs'
import {taskPreview} from '../shared/task-preview.mjs'

test('new source packs add 61 single-choice and 12 numeric tasks without duplicating 38 diagrams',()=>{
 assert.equal(ogeType5Tasks.length,61);assert.equal(ogeCounts[5],61)
 assert.equal(ogeType7Tasks.length,12);assert.equal(ogeCounts[7],50)
 assert.equal(ogeCounts.total,639);assert.equal(new Set(ogeTasks.map(t=>t.id)).size,639)
 assert.equal(ogeType5Tasks.filter(t=>t.section==='Механика').length,26)
 assert.equal(ogeType5Tasks.filter(t=>t.section==='Тепловые явления').length,35)
 for(const t of ogeType5Tasks){
  assert.equal(t.options.length,4,t.id);assert.equal(requiredOgeChoices(t),1)
  assert.deepEqual(parseOgeChoiceInput(String(t.answer[0]),t),t.answer)
  assert.equal(parseOgeChoiceInput('12',t),null)
  assert.equal(checkOgeChoiceAnswer(t,t.answer),true)
  for(let i=1;i<=4;i++)assert.equal(checkOgeChoiceAnswer(t,[i]),t.answer.includes(i),t.id)
  assert.deepEqual(restoreOgeChoiceAnswers({[t.id]:t.answer},[t]),{[t.id]:t.answer})
  assert.ok(t.text.length>40);assert.ok(t.options.every(o=>o.length>3))
  assert.doesNotMatch(t.text+t.options.join(''),/РЕШУ|https?:|\u00ad|\d+\/\d+$/)
 }
 assert.equal(ogeType5Tasks.find(t=>t.sourceNo===494).answer[0],1)
 assert.equal(ogeType5Tasks.find(t=>t.sourceNo===28250).answer[0],1)
})

test('all new numeric answers accept decimal commas, reject wrong answers and retain checked keys',()=>{
 assert.deepEqual(ogeType7Tasks.map(t=>t.answer),[17,9,325,3.5,10,.6,2,1.25,.5,1.25,15,15])
 for(const t of ogeType7Tasks){
  assert.equal(isCorrectOgeNumber(String(t.answer).replace('.',','),t.answer),true,t.id)
  assert.equal(isCorrectOgeNumber('',t.answer),false,t.id)
  assert.equal(isCorrectOgeNumber(String(t.answer+1),t.answer),false,t.id)
 }
 assert.ok(ogeTasks.every(t=>Number.isInteger(t.xp)&&t.xp>0))
})

const compile=async path=>{
 const result=await build({entryPoints:[new URL(path,import.meta.url).pathname],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.js':'jsx'},external:['react','react/jsx-runtime'],plugins:[{name:'css-stub',setup(b){b.onLoad({filter:/\.css$/},()=>({contents:'export default {}',loader:'js'}))}}]})
 const mod={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);return mod.exports
}
test('new task forms display every figure, one editable answer field and no figure captions',async()=>{
 const components=await compile('../app/oge-task-bank.js')
 for(const task of [...ogeType5Tasks,...ogeType7Tasks]){
  const html=renderToStaticMarkup(React.createElement(task.kind==='choice'?components.OgeChoiceDetail:components.OgeTaskDetail,{task,position:1,total:73,saved:[],back:()=>{},navigate:()=>{},onSave:()=>{},onSolved:()=>{}}))
  assert.equal((html.match(/<input /g)||[]).length,1,task.id)
  assert.doesNotMatch(html,/<figcaption>|NaN|Infinity/)
  for(const src of task.figures){assert.ok(fs.existsSync(new URL('../public'+src,import.meta.url)));assert.ok(html.includes(`src="${src}"`),task.id)}
  if(task.kind==='choice')assert.ok(html.includes('Выберите один вариант'))
 }
})

test('shared tiles show metadata and a bounded beginning of the condition without leaking the whole task',async()=>{
 const Tile=(await compile('../app/task-tile.js')).default
 const task=ogeType5Tasks.find(t=>t.sourceNo===28225)
 for(const status of ['Новая','Просмотрена','Ответ сохранён','Решена']){
  const html=renderToStaticMarkup(React.createElement(Tile,{type:5,section:'Механика',number:28225,status,xp:10,preview:task.text}))
  for(const text of ['ТИП 5','Механика','№ 28225',status,'10 XP'])assert.ok(html.includes(text))
  assert.ok(html.includes(taskPreview(task.text)));assert.ok(!html.includes(task.text))
 }
 assert.equal(taskPreview(' Короткое\n условие '),'Короткое условие')
 assert.ok(taskPreview('Очень длинное условие '.repeat(100)).length<=160)
})
