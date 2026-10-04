import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {ogeTasks,ogeCounts} from '../app/oge-task-data.mjs'
import {filterOgeTasks} from '../app/oge-task-filters.mjs'
import {checkOgeClozeAnswer,ogeClozeAnswerReady,parseOgeClozeInput,restoreOgeClozeAnswers} from '../app/oge-cloze-answer.mjs'

const tasks=ogeTasks.filter(task=>task.type===4)

test('both supplied type-4 PDFs retain all passages, options, restored formulas and original figures',()=>{
  assert.equal(ogeCounts[4],46)
  assert.equal(filterOgeTasks(ogeTasks,{types:[4],sections:['Механика']}).length,26)
  assert.equal(filterOgeTasks(ogeTasks,{types:[4],sections:['Тепловые явления']}).length,20)
  assert.equal(new Set(tasks.map(task=>task.sourceNo)).size,46)
  let figures=0
  for(const task of tasks){
    assert.equal(task.kind,'cloze')
    assert.ok(task.explanation?.length>30,task.id)
    assert.ok(task.options.length>=7&&task.options.length<=9,task.id)
    assert.ok(task.options.every(option=>option.trim()),task.id)
    assert.doesNotMatch([task.text,...task.options].join(' '),/\u00ad|Список слов|Запишите|https?:|РЕШУ ОГЭ|А Б В Г/,task.id)
    for(const letter of 'АБВГ')assert.ok(task.text.includes(`(${letter}) ___`),`${task.id}: ${letter}`)
    if(/рисун|рис\./.test(task.text))assert.ok(task.figures.length,task.id)
    for(const figure of task.figures){
      const svg=fs.readFileSync(new URL(`../public${figure}`,import.meta.url),'utf8')
      assert.match(svg,/viewBox=/)
      assert.doesNotMatch(svg,/<script|<foreignObject|href="https?:/)
      figures++
    }
  }
  assert.equal(figures,43)
  assert.match(tasks.find(task=>task.sourceNo===8897).text,/ρgh \+ ρv²\/2 \+ p = const/)
  assert.match(tasks.find(task=>task.sourceNo===29739).text,/10 °C/)
  assert.deepEqual(tasks.filter(task=>task.section==='Механика').map(task=>task.answer.join('')),['5417','1568','1246','3175','1254','2475','2568','2654','7156','1254','2475','3576','5246','4137','3825','2457','2457','1468','3516','5823','4761','7615','7615','5723','2845','2516'])
})

test('ordered answers allow repeats, reject incomplete entries and preserve every checked result across reload',()=>{
  const saved={}
  for(const task of tasks){
    assert.deepEqual(parseOgeClozeInput(task.answer.join(' ; '),task),task.answer)
    assert.equal(checkOgeClozeAnswer(task,task.answer),true,task.id)
    assert.equal(ogeClozeAnswerReady([1,1,1,1],task),true)
    assert.deepEqual(parseOgeClozeInput('1111',task),[1,1,1,1])
    assert.equal(parseOgeClozeInput('0123',task),null)
    assert.equal(parseOgeClozeInput('12345',task),null)
    assert.equal(parseOgeClozeInput('1.234',task),null)
    assert.equal(checkOgeClozeAnswer(task,[]),false)
    assert.equal(checkOgeClozeAnswer(task,task.answer.slice(0,3)),false)
    for(let index=0;index<4;index++){
      for(let option=1;option<=task.options.length;option++){
        const entered=task.answer.map((value,i)=>i===index?option:value)
        const expected=[task.answer,...(task.answerAlternatives||[])].some(key=>key.every((v,i)=>v===entered[i]))
        assert.equal(checkOgeClozeAnswer(task,entered),expected,`${task.id}: ${index}, ${option}`)
      }
    }
    saved[task.id]=task.answer
  }
  assert.deepEqual(restoreOgeClozeAnswers(JSON.parse(JSON.stringify(saved)),ogeTasks),saved)
  assert.deepEqual(restoreOgeClozeAnswers({'unknown':[1,2,3,4],[tasks[0].id]:[1,2,0,4]},ogeTasks),{})
  assert.deepEqual(restoreOgeClozeAnswers([] ,ogeTasks),{})
  for(const sourceNo of [9174,14171])assert.equal(checkOgeClozeAnswer(tasks.find(task=>task.sourceNo===sourceNo),[2,1,7,5]),true)
  const solved=new Set(Object.keys(saved))
  assert.equal(filterOgeTasks(ogeTasks,{types:[4],statuses:['solved']},new Set(),solved).length,46)
  assert.equal(filterOgeTasks(ogeTasks,{types:[4],statuses:['answered']},new Set(),new Set(),solved).length,46)
})

test('all 46 rendered forms expose four labelled numeric fields and recover correct and incorrect feedback',async()=>{
  const bundle=await build({entryPoints:[new URL('../app/oge-cloze-detail.js',import.meta.url).pathname],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.js':'jsx'},external:['react','react/jsx-runtime'],plugins:[{name:'css-module-stub',setup(builder){builder.onLoad({filter:/\.css$/},()=>({contents:'export default {}',loader:'js'}))}}]})
  const mod={exports:{}}
  new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports)
  const Detail=mod.exports.default
  for(const task of tasks){
    const props={task,position:1,total:46,back:()=>{},navigate:()=>{},onSave:()=>{}}
    const blank=renderToStaticMarkup(React.createElement(Detail,{...props,saved:[]}))
    assert.equal((blank.match(/<input /g)||[]).length,4,task.id)
    for(const letter of 'АБВГ')assert.ok(blank.includes(`aria-label="Номер слова для пропуска ${letter}"`),task.id)
    assert.ok(blank.includes('Проверить ответ'),task.id)
    assert.ok(!blank.includes(task.explanation),task.id)
    const right=renderToStaticMarkup(React.createElement(Detail,{...props,saved:task.answer}))
    assert.ok(right.includes('Верно!')&&right.includes(task.explanation),task.id)
    const wrong=renderToStaticMarkup(React.createElement(Detail,{...props,saved:[1,1,1,1]}))
    assert.ok(wrong.includes('Пока неверно')&&!wrong.includes(task.explanation),task.id)
  }
})
