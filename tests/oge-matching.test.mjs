import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {build} from 'esbuild'
import {ogeMatchingTasks as tasks} from '../app/oge-task-data-1.mjs'
import {ogeTasks} from '../app/oge-task-data.mjs'
import {filterOgeTasks,ogeSections,sectionsForTask} from '../app/oge-task-filters.mjs'
import {ogeMatchingAnswerReady,parseOgeMatchingValue,restoreOgeMatchingAnswers} from '../app/oge-matching-answer.mjs'

test('the complete type-1 pack retains two labelled columns without print artefacts',()=>{
  assert.equal(tasks.length,61)
  assert.equal(tasks.filter(task=>task.right.length===4).length,1)
  for(const task of tasks){
    assert.equal(task.type,1)
    assert.equal(task.kind,'matching')
    assert.ok(ogeTasks.some(item=>item.id===task.id))
    assert.deepEqual(task.left.map(item=>item.id),['А','Б','В'])
    assert.deepEqual(task.right.map(item=>item.id),Array.from({length:task.right.length},(_,i)=>String(i+1)))
    assert.ok(task.leftTitle&&task.rightTitle&&task.text,task.id)
    const text=[task.text,...task.left.map(item=>item.text),...task.right.map(item=>item.text)].join(' ')
    assert.doesNotMatch(text,/\u00ad|https?:|sdamgia|Запишите в ответ|РЕШУ ОГЭ|А Б В/,task.id)
    assert.ok(sectionsForTask(task).every(section=>ogeSections.includes(section)),task.id)
  }
  const units=tasks.find(task=>task.sourceNo===29829).right
  assert.match(units[1].text,/Дж\/кг/)
  assert.match(units[2].text,/Дж\/\(кг · °C\)/)
  assert.match(tasks.find(task=>task.sourceNo===1606).right[2].text,/кг\/м³/)
  assert.match(tasks.find(task=>task.sourceNo===14576).right[1].text,/средах$/)
})

test('matching responses retain order and repeated digits across a storage round trip',()=>{
  const stored={}
  for(const task of tasks){
    const answer=['2','2','1']
    assert.equal(ogeMatchingAnswerReady(answer,task),true,task.id)
    assert.equal(ogeMatchingAnswerReady(['2','','1'],task),false,task.id)
    assert.equal(ogeMatchingAnswerReady(['2','1'],task),false,task.id)
    assert.equal(ogeMatchingAnswerReady(['2','1','6'],task),false,task.id)
    assert.equal(parseOgeMatchingValue('12',task),null,task.id)
    assert.equal(parseOgeMatchingValue('x',task),null,task.id)
    assert.equal(parseOgeMatchingValue('',task),'',task.id)
    stored[task.id]=answer
  }
  const restored=restoreOgeMatchingAnswers(JSON.parse(JSON.stringify(stored)),ogeTasks)
  assert.deepEqual(restored,stored)
  assert.deepEqual(restoreOgeMatchingAnswers({'oge-1-1464':['2','','1'],'oge-1-73':['1','2','9'],'oge-6-12419':['1','2','3']},ogeTasks),{})
})

test('mixed topics appear in each relevant section and search includes both table columns',()=>{
  for(const section of ogeSections.slice(0,5))assert.ok(filterOgeTasks(ogeTasks,{types:[1],sections:[section]}).length>0,section)
  for(const section of ['Механика','Электродинамика'])assert.ok(filterOgeTasks(ogeTasks,{types:[1],sections:[section]}).some(task=>task.sourceNo===802))
  const combined=filterOgeTasks(ogeTasks,{types:[1],sections:['Механика','Электродинамика']})
  assert.equal(new Set(combined.map(task=>task.id)).size,combined.length)
  assert.ok(filterOgeTasks(ogeTasks,{types:[1],query:'омметр'}).some(task=>task.sourceNo===1635))
  const answered=new Set(['oge-1-1464'])
  assert.deepEqual(filterOgeTasks(ogeTasks,{types:[1],statuses:['answered']},new Set(),new Set(),answered).map(task=>task.id),['oge-1-1464'])
})

test('every new task renders all options, three accessible fields and a save action',async()=>{
  const bundled=await build({entryPoints:[new URL('../app/oge-matching-detail.js',import.meta.url).pathname],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.js':'jsx'},external:['react','react/jsx-runtime'],plugins:[{name:'css-module-stub',setup(builder){builder.onLoad({filter:/\.css$/},()=>({contents:'export default {}',loader:'js'}))}}]})
  const mod={exports:{}}
  new Function('require','module','exports',bundled.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports)
  const Detail=mod.exports.default
  for(const task of tasks){
    const props={task,position:1,total:61,back:()=>{},navigate:()=>{},onSave:()=>{}}
    const blank=renderToStaticMarkup(React.createElement(Detail,props))
    assert.equal((blank.match(/<input /g)||[]).length,3,task.id)
    for(const letter of ['А','Б','В'])assert.ok(blank.includes(`aria-label="Ответ для ${letter}"`),task.id)
    assert.ok(blank.includes('disabled="">Сохранить ответ'),task.id)
    const saved=renderToStaticMarkup(React.createElement(Detail,{...props,saved:['2','2','1']}))
    assert.ok(saved.includes('Ответ сохранён'),task.id)
    assert.equal((saved.match(/value="2"/g)||[]).length,2,task.id)
    for(const option of task.right)assert.ok(saved.includes(`>${option.id}</b>`),task.id)
  }
})
