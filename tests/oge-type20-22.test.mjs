import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {ogeTasks,ogeCounts} from '../app/oge-task-data.mjs'
import {filterOgeTasks} from '../app/oge-task-filters.mjs'
import {checkOgeCalculationAnswer,parseOgeCalculationNumber,restoreOgeCalculationDrafts} from '../app/oge-calculation-answer.mjs'
import {difficultySignal} from '../shared/textbook-card.mjs'

const tasks=ogeTasks.filter(t=>t.kind==='calculation')
const byNo=n=>tasks.find(t=>t.sourceNo===n)

test('all nine PDF packs are imported by type and section, at high difficulty',()=>{
 assert.equal(ogeCounts.total,882)
 assert.equal(ogeCounts[20],76);assert.equal(ogeCounts[21],79);assert.equal(ogeCounts[22],88)
 const counts={20:{Механика:28,'Тепловые явления':36,Электродинамика:12},21:{Механика:56,'Тепловые явления':20,Электродинамика:3},22:{Механика:15,'Тепловые явления':11,Электродинамика:62}}
 for(const [type,sections] of Object.entries(counts))for(const [section,count] of Object.entries(sections))assert.equal(filterOgeTasks(ogeTasks,{types:[Number(type)],sections:[section]}).length,count)
 assert.equal(new Set(ogeTasks.map(t=>`${t.type}:${t.sourceNo}`)).size,882)
 let figures=0,tables=0
 for(const task of tasks){
  assert.equal(task.difficulty,'ВЫСОКИЙ');assert.equal(difficultySignal(task.difficulty).level,3)
  assert.equal(task.xp,40);assert.equal(task.answerFormat,'Развёрнутый ответ')
  assert.ok(Number.isFinite(task.answer));assert.ok(task.text.length>80,task.id)
  assert.match(task.answerSource,/^https:\/\/phys-oge\.sdamgia\.ru\/problem\?id=\d+$/)
  assert.doesNotMatch(task.text,/\u00ad|РЕШУ ОГЭ|https?:|Рисунок задачи|дробь:|конец дроби|\\[A-Za-z]|^Рис\. \d/m,task.id)
  assert.equal(checkOgeCalculationAnswer(task,String(task.answer).replace('.',',')),true,task.id)
  assert.equal(checkOgeCalculationAnswer(task,String(task.answer+Math.max(2,Math.abs(task.answer)*.1))),false,task.id)
  for(const path of task.figures){
   const svg=fs.readFileSync(new URL(`../public${path}`,import.meta.url),'utf8')
   assert.match(svg,/viewBox=/);assert.match(svg,/#e1effd/)
   assert.doesNotMatch(svg,/<script|<foreignObject|href="https?:|(?:fill|stroke)="#(?:000000|ffffff)"/)
   figures++
  }
  for(const table of task.tables||[]){assert.equal(new Set(table.map(row=>row.length)).size,1);assert.ok(table.length>=2);tables++}
 }
 assert.equal(tasks.length,243);assert.equal(figures,41);assert.equal(tables,4)
})

test('restored formula values and independently calculated anchor answers are correct',()=>{
 assert.match(byNo(23895).text,/R₁ =2 Ом/);assert.match(byNo(23895).text,/R₄ =R₅ =10 Ом/)
 assert.match(byNo(29734).text,/20 °C/);assert.match(byNo(29569).text,/R₄/)
 assert.deepEqual(byNo(29590).tables[0][1],['vₓ, м/с','3','6','9','12','15'])
 assert.match(byNo(891).text,/\(I₁\)\/\(I₂\)/)
 const values={25285:2000*(36/3.6)**2/2/1000,25338:(72/3.6)**2/(2*2000),25343:2/(1/5+1/15),25355:2*(1+.1*10),25873:2*3**2/2,26097:.1*(2+.1*10),26102:.1*(2+.1*10),26111:.009*(800**2-200**2)/(2*.025)/1000,26114:2.5*.2,26123:1.8*2/.009+500,29590:3/(3/2),29732:(800-400)/2,29848:2/(1/2+1/6),31705:40*10*3600/(8000*10*20)*100,31724:2*10/2/.02,12437:2**2*2*4,14598:220**2/(1.1*8/.05),25143:.6**2*4*4,25378:2*1.1*.5/.1,25382:Math.sqrt(40*.4*4/.25),25898:Math.sqrt(30*.4*3/.25),26113:36/9,26258:3*6/2,29634:Math.sqrt(30*.4*6/.5),29710:.4*5/(12/2.4),29591:220/Math.sqrt(400/25)-25,23895:(120/(2+10)/2/2)**2*10,29569:(220/(10+6+4)/2)**2*12,25298:100-.8*2000*7*60/(2*4200),25327:500*2.2*600/330000,29636:.5*10*10/500,29734:((220**2/160)*1200*.75-.4*4200*80)/2300000*1000,32475:2*4200*75/(2000*360)*100,1271:(.8*20+1.2*10)/2,1298:(25+.8*70)/1.8,53:20+14**2/(2*140),1015:2*.9*100/9,14316:-(3*10-3*80/10)*(.5*80*10)/1000,25367:.25*10*46e6}
 for(const [n,value] of Object.entries(values))assert.ok(checkOgeCalculationAnswer(byNo(Number(n)),String(value)),`${n}: ${value}`)
 assert.ok(checkOgeCalculationAnswer(byNo(3328),String(600*25000/(130*300))))
 assert.ok(checkOgeCalculationAnswer(byNo(26101),String(2*Math.PI*.5*2)))
 assert.ok(checkOgeCalculationAnswer(byNo(1163),String(330000/(2.7*4200))))
})

test('numeric input accepts decimals, negative work, fractions and scientific notation safely',()=>{
 for(const [input,result] of [['1,15·10^8',115e6],['1.15e8',115e6],['1,15 × 10⁸',115e6],['115 000 000',115e6],['-2,4',-2.4],['−2.4',-2.4],['2/5',.4]])assert.equal(parseOgeCalculationNumber(input),result,input)
 for(const invalid of ['', '1 2','abc','1,2,3','2/0','Infinity','1e999','<script>','3 кг','1+2'])assert.equal(parseOgeCalculationNumber(invalid),null,invalid)
 assert.equal(checkOgeCalculationAnswer(byNo(25367),'1,15·10^8'),true)
 assert.equal(checkOgeCalculationAnswer(byNo(14316),'−2,4'),true)
 const drafts=Object.fromEntries(tasks.map(t=>[t.id,{answer:String(t.answer),solution:'Дано, формулы, перевод единиц и вычисления.',checked:true}]))
 assert.deepEqual(restoreOgeCalculationDrafts(JSON.parse(JSON.stringify(drafts)),ogeTasks),drafts)
 assert.deepEqual(restoreOgeCalculationDrafts({unknown:{answer:'1',solution:'x'}},ogeTasks),{})
 assert.deepEqual(restoreOgeCalculationDrafts({[tasks[0].id]:{answer:1,solution:'x'}},ogeTasks),{})
 assert.equal(filterOgeTasks(ogeTasks,{types:[20],statuses:['answered']},new Set(),new Set(),new Set(Object.keys(drafts))).length,76)
})

test('every imported task renders a solution field and a labelled final result, including restored feedback',async()=>{
 const result=await build({entryPoints:[new URL('../app/oge-calculation-detail.js',import.meta.url).pathname],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.js':'jsx'},external:['react','react/jsx-runtime'],plugins:[{name:'css-stub',setup(b){b.onLoad({filter:/\.css$/},()=>({contents:'export default {}',loader:'js'}))}}]})
 const mod={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports)
 for(const task of tasks){
  const props={task,position:1,total:243,back:()=>{},navigate:()=>{},onSave:()=>{}}
  const blank=renderToStaticMarkup(React.createElement(mod.exports.default,props))
  assert.equal((blank.match(/<textarea/g)||[]).length,1,task.id)
  assert.equal((blank.match(/<input /g)||[]).length,1,task.id)
  assert.ok(blank.includes('Высокая сложность'));assert.ok(blank.includes('40 XP'))
  assert.ok(blank.includes('Числовой ответ'));assert.ok(blank.includes('disabled=""'))
  const saved={answer:String(task.answer),solution:'Мой ход решения',checked:true}
  const right=renderToStaticMarkup(React.createElement(mod.exports.default,{...props,saved}))
  assert.ok(right.includes('Мой ход решения'));assert.ok(right.includes('Числовой ответ верный!'),task.id)
  const wrong=renderToStaticMarkup(React.createElement(mod.exports.default,{...props,saved:{...saved,answer:String(task.answer+Math.max(2,Math.abs(task.answer)*.1))}}))
  assert.ok(wrong.includes('Пока неверно'),task.id)
 }
})
