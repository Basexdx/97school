import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createRequire} from 'node:module'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {build} from 'esbuild'
import {ogeType3Tasks as tasks} from '../app/oge-task-data-3.mjs'
import {ogeTasks,ogeCounts} from '../app/oge-task-data.mjs'
import {filterOgeTasks} from '../app/oge-task-filters.mjs'
import {checkOgeChoiceAnswer,parseOgeChoiceInput,requiredOgeChoices,restoreOgeChoiceAnswers} from '../app/oge-choice-answer.mjs'

test('all three type-3 PDFs are imported with reviewed keys and intact original figures',()=>{
  assert.equal(tasks.length,60)
  assert.equal(ogeCounts[3],60)
  assert.deepEqual(tasks.reduce((counts,task)=>(counts[task.section]=(counts[task.section]||0)+1,counts),{}),{'Механика':18,'Тепловые явления':24,'Электродинамика':18})
  assert.equal(new Set(ogeTasks.map(task=>task.id)).size,ogeTasks.length)
  const references=JSON.parse(fs.readFileSync(new URL('../bank/tasks.json',import.meta.url)))
  let checkedAgainstBank=0,figures=0
  for(const task of tasks){
    assert.equal(task.type,3)
    assert.equal(task.options.length,4,task.id)
    assert.ok(task.options.every(option=>option.trim()),task.id)
    assert.ok(task.explanation?.length>30,task.id)
    assert.equal(task.answerSource,'independent-physics-review')
    assert.doesNotMatch([task.text,...task.options].join(' '),/\u00ad|sdamgia|РЕШУ ОГЭ|https?:|\d+\/\d+/,task.id)
    const existing=references.find(item=>String(item.SOURCE?.task_id)===String(task.sourceNo))
    if(existing){assert.deepEqual(task.answer.map(String),existing.ANSWER.values,task.id);checkedAgainstBank++}
    if(/см\.\s*(?:рис|рисунок)/.test(task.text))assert.ok(task.figures.length,task.id)
    for(const figure of task.figures){
      figures++
      const path=new URL(`../public${figure}`,import.meta.url)
      assert.ok(fs.statSync(path).size>100,figure)
      if(figure.endsWith('.svg')){
        const svg=fs.readFileSync(path,'utf8')
        assert.match(svg,/viewBox=/,figure)
        assert.doesNotMatch(svg,/<script|<foreignObject|<text/,figure)
      }
    }
  }
  assert.equal(checkedAgainstBank,39)
  assert.equal(figures,22)
  // Independently solved mechanical questions, including the close distractors.
  assert.deepEqual(tasks.filter(task=>task.section==='Механика').map(task=>[task.sourceNo,task.answer[0]]),[[25853,2],[26127,2],[26128,3],[26129,3],[26130,3],[26131,1],[26132,2],[26133,3],[26134,1],[26135,1],[26136,1],[26137,2],[26138,3],[26139,2],[26140,2],[28227,3],[31526,1],[32434,4]])
})

test('every type-3 key accepts its answer and rejects each distractor before and after reload',()=>{
  const stored={}
  for(const task of tasks){
    assert.equal(requiredOgeChoices(task),1)
    for(let option=1;option<=4;option++){
      const entered=parseOgeChoiceInput(String(option),task)
      assert.deepEqual(entered,[option])
      assert.equal(checkOgeChoiceAnswer(task,entered),task.answer[0]===option,`${task.id}: option ${option}`)
    }
    assert.equal(checkOgeChoiceAnswer(task,[]),false)
    assert.equal(checkOgeChoiceAnswer(task,[1,2]),false)
    assert.equal(parseOgeChoiceInput('12',task),null)
    stored[task.id]=task.answer
  }
  const restored=restoreOgeChoiceAnswers(JSON.parse(JSON.stringify(stored)),ogeTasks)
  assert.deepEqual(restored,stored)
  const solved=new Set(Object.entries(restored).filter(([id,answer])=>checkOgeChoiceAnswer(tasks.find(task=>task.id===id),answer)).map(([id])=>id))
  assert.equal(filterOgeTasks(ogeTasks,{types:[3],statuses:['solved']},new Set(),solved).length,60)
  const unkeyed=ogeTasks.find(task=>task.type===14)
  assert.equal(checkOgeChoiceAnswer(unkeyed,[1,2]),null)
})

test('source file sections remain available alongside the actual optical and thermal topics',()=>{
  assert.equal(filterOgeTasks(ogeTasks,{types:[3],sections:['Электродинамика']}).length,18)
  assert.ok(filterOgeTasks(ogeTasks,{types:[3],sections:['Оптика']}).some(task=>task.sourceNo===26160))
  assert.ok(filterOgeTasks(ogeTasks,{types:[3],sections:['Тепловые явления']}).some(task=>task.sourceNo===26157))
})

test('the rendered choice form restores correct and incorrect feedback without revealing a key early',async()=>{
  const bundle=await build({entryPoints:[new URL('../app/oge-task-bank.js',import.meta.url).pathname],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.js':'jsx'},external:['react','react/jsx-runtime'],plugins:[{name:'css-module-stub',setup(builder){builder.onLoad({filter:/\.css$/},()=>({contents:'export default {}',loader:'js'}))}}]})
  const mod={exports:{}}
  new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports)
  const Detail=mod.exports.OgeChoiceDetail
  for(const task of tasks){
    const props={task,position:1,total:60,back:()=>{},navigate:()=>{},onSave:()=>{}}
    const blank=renderToStaticMarkup(React.createElement(Detail,{...props,saved:[]}))
    assert.ok(blank.includes('Проверить ответ'),task.id)
    assert.ok(!blank.includes(task.explanation),task.id)
    const right=renderToStaticMarkup(React.createElement(Detail,{...props,saved:task.answer}))
    assert.ok(right.includes('Верно!'),task.id)
    assert.ok(right.includes(task.explanation),task.id)
    assert.ok(!right.includes('Ключа в предоставленном PDF нет'),task.id)
    const incorrect=[task.answer[0]===1?2:1]
    const wrong=renderToStaticMarkup(React.createElement(Detail,{...props,saved:incorrect}))
    assert.ok(wrong.includes('Пока неверно'),task.id)
    assert.ok(!wrong.includes(task.explanation),task.id)
  }
})
