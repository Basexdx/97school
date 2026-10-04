import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {ogeTasks,ogeCounts} from '../app/oge-task-data.mjs'
import {ogeType6Tasks as tasks} from '../app/oge-task-data-6.mjs'
import {isCorrectOgeNumber} from '../app/oge-number-answer.mjs'
import {requiredOgeChoices,checkOgeChoiceAnswer,restoreOgeChoiceAnswers} from '../app/oge-choice-answer.mjs'

test('all three type-6 packs are represented once, with 56 new keyed tasks and original figures',()=>{
 assert.equal(ogeCounts[6],83);assert.equal(ogeCounts.total,440)
 assert.equal(tasks.length,56);assert.equal(tasks.filter(t=>t.topic==='Динамика').length,43);assert.equal(tasks.filter(t=>t.topic==='Гидростатика').length,13)
 assert.equal(new Set(ogeTasks.filter(t=>t.type===6).map(t=>t.sourceNo)).size,83)
 let figures=0
 for(const t of tasks){
  assert.ok(t.text.length>70&&t.explanation.length>30,t.id)
  assert.doesNotMatch(t.text,/\u00ad|https?:|РЕШУ ОГЭ|3 · 105/)
  if(/рисунк|рис\.|диаграмм|мензурк/.test(t.text))assert.ok(t.figures.length,t.id)
  if(t.kind==='numeric'){assert.ok(isCorrectOgeNumber(String(t.answer).replace('.',','),t.answer));assert.ok(!isCorrectOgeNumber(String(t.answer+1),t.answer))}
  else{assert.equal(requiredOgeChoices(t),1);for(let i=1;i<=4;i++)assert.equal(checkOgeChoiceAnswer(t,[i]),i===t.answer[0]);assert.deepEqual(restoreOgeChoiceAnswers({[t.id]:t.answer},ogeTasks),{[t.id]:t.answer})}
  for(const file of t.figures){const svg=fs.readFileSync(new URL('../public'+file,import.meta.url),'utf8');assert.match(svg,/viewBox=/);assert.doesNotMatch(svg,/<script|<foreignObject|href="https?:/);figures++}
 }
 assert.equal(figures,31)
 assert.match(tasks.find(t=>t.sourceNo===14322).text,/отношение потенциальной энергии/)
 assert.match(tasks.find(t=>t.sourceNo===8760).text,/400 кг\/м³/)
 const expected=[2,3,2,3,499,.3,.4,2,44,2000,6,2,2,2,15,9,2.5,.25,.8,16,5,1,.4,4,1,1200,24,3,5,50,2,40,4,30,9000,1,50,300,2.25,1000,162,3,3]
 assert.deepEqual(tasks.filter(t=>t.topic==='Динамика').map(t=>Array.isArray(t.answer)?t.answer[0]:t.answer),expected)
 assert.deepEqual(tasks.filter(t=>t.topic==='Гидростатика').map(t=>t.answer),[500,998,80,960,2994,4,4,12,.001,20,9,.08,800])
})

test('rendered numeric forms display source figures and proper units; choice forms preserve their single-choice key',async()=>{
 const bundle=await build({entryPoints:[new URL('../app/oge-task-bank.js',import.meta.url).pathname],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.js':'jsx'},external:['react','react/jsx-runtime'],plugins:[{name:'css-module-stub',setup(builder){builder.onLoad({filter:/\.css$/},()=>({contents:'export default {}',loader:'js'}))}}]})
 const mod={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports)
 for(const task of tasks){const choice=task.kind==='choice',Detail=choice?mod.exports.OgeChoiceDetail:mod.exports.OgeTaskDetail,html=renderToStaticMarkup(React.createElement(Detail,{task,position:1,total:56,back:()=>{},navigate:()=>{},onSolved:()=>{},saved:[],onSave:()=>{}}));assert.equal((html.match(/<input /g)||[]).length,1,task.id);for(const src of task.figures)assert.ok(html.includes(`src="${src}"`),task.id);assert.ok(html.includes(choice?'inputMode="numeric"':'inputMode="decimal"'));assert.ok(!html.includes(task.explanation));if(choice){const solved=renderToStaticMarkup(React.createElement(Detail,{task,position:1,total:56,saved:task.answer}));assert.ok(solved.includes('Верно!'))}}
 for(const task of ogeTasks.filter(t=>t.diagram&&['graph','wave','oscillation','doubleOsc'].includes(t.diagram.kind))){const svg=renderToStaticMarkup(React.createElement(mod.exports.OgeDiagram,{spec:task.diagram}));assert.doesNotMatch(svg,/NaN|Infinity|<polyline/);assert.match(svg,/viewBox="0 0 720 (?:350|330)"/);assert.match(svg,/<path/)}
})
