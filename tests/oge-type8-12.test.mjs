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
import {isCorrectOgeNumber} from '../app/oge-number-answer.mjs'

const imported=ogeTasks.filter(t=>[8,12].includes(t.type))
const changes=imported.filter(t=>t.type===12)
const keys=JSON.parse(fs.readFileSync(new URL('../scripts/oge-type8-12-keys.json',import.meta.url)))
const byNo=n=>imported.find(t=>t.sourceNo===n)

test('all four new PDFs are imported completely by type and section without duplicating existing packs',()=>{
 assert.equal(ogeCounts.total,882)
 assert.equal(ogeCounts[8],56);assert.equal(ogeCounts[12],70)
 assert.equal(filterOgeTasks(ogeTasks,{types:[12],sections:['Механика']}).length,47)
 assert.equal(filterOgeTasks(ogeTasks,{types:[12],sections:['Тепловые явления']}).length,23)
 assert.equal(filterOgeTasks(ogeTasks,{types:[8],sections:['Тепловые явления']}).length,56)
 assert.equal(ogeCounts[5],61);assert.equal(ogeCounts[7],50)
 assert.equal(new Set(ogeTasks.map(t=>`${t.type}:${t.sourceNo}`)).size,882)
 assert.equal(new Set(imported.map(t=>t.sourceNo)).size,Object.keys(keys).length)
 let figures=0
 for(const task of imported){
  assert.equal(task.label,`Задача ${task.type} ОГЭ`)
  assert.ok(task.text.length>60,task.id)
  assert.ok(task.explanation.length>40,task.id)
  assert.equal(task.xp,10)
  assert.doesNotMatch(task.text,/\u00ad|РЕШУ ОГЭ|https?:|Рисунок задачи|(?:составляют|равной|на)\s+(?:от|передает|Ответ)|—\s*\)/,task.id)
  if(task.type===12){assert.equal(task.kind,'change');assert.equal(task.quantities.length,2);assert.ok(task.quantities.every(v=>v.length>3));assert.equal(task.answer.join(''),keys[task.sourceNo])}
  else{assert.equal(task.answer,Number(keys[task.sourceNo].replace(',','.')));assert.equal(isCorrectOgeNumber(String(task.answer).replace('.',','),task.answer),true)}
  for(const figure of task.figures){
   const svg=fs.readFileSync(new URL(`../public${figure}`,import.meta.url),'utf8')
   const box=svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number)
   assert.ok(box[2]>35&&box[3]>30,task.id)
   assert.doesNotMatch(svg,/<script|<foreignObject|href="https?:|(?:fill|stroke)="#(?:000000|ffffff)"/,task.id)
   assert.match(svg,/#e1effd/)
   figures++
  }
 }
 assert.equal(figures,57)
})

test('lost PDF fractions and units are restored and numerical keys match independent calculations',()=>{
 assert.match(byNo(9115).text,/2\/5/);assert.match(byNo(9116).text,/3\/5/)
 assert.match(byNo(8815).text,/920 Дж/);assert.match(byNo(8786).text,/130 Дж/)
 assert.match(byNo(14299).text,/на 1 °C/);assert.match(byNo(29698).text,/150 °C/)
 assert.match(byNo(8809).text,/10⁷/)
 assert.equal(byNo(8812).unit,'Дж');assert.equal(byNo(29836).unit,'кДж/кг')
 const calculations={1689:3*20/60,8799:4*45/18,8806:2*(2300+4.2*60),8808:(4200+920*.2)*80/1000,8809:4200*2*29/2.9e7*1000,8810:2*(130*300+25000)/1000,8811:Math.round((2.1*5+330)/(4.2*40)*100)/100,8813:4.2*10+330,8815:(4200*2+920*.7)*80/1000,9112:2400/(.2*40),9115:1-2/5,9116:(1-3/5)*100,9117:23/(46*2)*100,9118:10*5/2500,13135:8000/(400*10),14199:.5*(330+2.1*10),14224:.5*(4.2*100+2300),14274:4200*2/(5*4),14299:2100/5,14324:50400/(4200*2),14556:230*10,19605:4200/(2100*10),24048:1e6/(500*200),25070:.34*50,25174:630000/(4200*75),26246:230*10*10/1000,29675:10*(1-.25),32461:66000/330000,3312:50000/(2*50),8783:64000/(2*20),8784:64000/(4*20),8786:130*1*200/1000,8789:130*1*300/1000,8812:300000/(5*30),8814:330+2.1*20,9114:(128-78)/2,12421:300000/(2*300),14149:300000/(2*300),14174:200000/(500*100),14582:15*1,25282:9/3,25302:4/2,25310:1600/(.08*40),25321:130*2*200/1000,25364:130*2*100/1000,25857:9/3,26081:6/3,29556:120000/(2*30),29578:10*50,29600:6/3,29622:(1050-300)/5,29698:300/2,29720:8400*40,29743:2400/(.1*100),29836:(4-1)*1e5/.5/1000,32592:200000/(4*200)}
 assert.equal(Object.keys(calculations).length,56)
 for(const [n,value] of Object.entries(calculations))assert.ok(Math.abs(byNo(Number(n)).answer-value)<1e-8,n)
 assert.deepEqual(byNo(13139).quantities,['Средняя скорость теплового движения молекул спирта','Плотность спирта'])
})

test('two-field answers accept repeats, preserve order and restore correct or incorrect attempts',()=>{
 const saved={}
 for(const task of changes){
  assert.equal(ogeClozeAnswerReady(task.answer,task),true)
  assert.deepEqual(parseOgeClozeInput(task.answer.join(' ; '),task),task.answer)
  assert.deepEqual(parseOgeClozeInput('11',task),[1,1])
  for(const invalid of ['01','44','123','1.2','-1','abc'])assert.equal(parseOgeClozeInput(invalid,task),null)
  assert.equal(checkOgeClozeAnswer(task,[]),false);assert.equal(checkOgeClozeAnswer(task,[1]),false)
  for(let a=1;a<=3;a++)for(let b=1;b<=3;b++)assert.equal(checkOgeClozeAnswer(task,[a,b]),a===task.answer[0]&&b===task.answer[1],task.id)
  saved[task.id]=task.answer
 }
 assert.deepEqual(restoreOgeClozeAnswers(JSON.parse(JSON.stringify(saved)),ogeTasks),saved)
 const wrong={[changes[0].id]:[1,1]}
 assert.deepEqual(restoreOgeClozeAnswers(wrong,ogeTasks),wrong)
 assert.deepEqual(restoreOgeClozeAnswers({unknown:[1,2],[changes[0].id]:[0,2]},ogeTasks),{})
 assert.equal(filterOgeTasks(ogeTasks,{types:[12],statuses:['answered']},new Set(),new Set(),new Set(Object.keys(saved))).length,70)
 assert.equal(filterOgeTasks(ogeTasks,{types:[12],statuses:['solved']},new Set(),new Set(Object.keys(saved))).length,70)
})

test('all 70 forms render two named input fields and restore checked feedback',async()=>{
 const result=await build({entryPoints:[new URL('../app/oge-cloze-detail.js',import.meta.url).pathname],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.js':'jsx'},external:['react','react/jsx-runtime'],plugins:[{name:'css-stub',setup(b){b.onLoad({filter:/\.css$/},()=>({contents:'export default {}',loader:'js'}))}}]})
 const mod={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports)
 for(const task of changes){
  const props={task,position:1,total:70,back:()=>{},navigate:()=>{},onSave:()=>{}}
  const blank=renderToStaticMarkup(React.createElement(mod.exports.default,{...props,saved:[]}))
  assert.equal((blank.match(/<input /g)||[]).length,2,task.id)
  assert.equal((blank.match(/inputMode="numeric"/g)||[]).length,2,task.id)
  for(const name of task.quantities)assert.ok(blank.includes(name),task.id)
  assert.ok(blank.includes('Ответ из двух цифр'))
  assert.doesNotMatch(blank,/Пропуски в тексте|Задание 4|Слова и словосочетания/)
  const right=renderToStaticMarkup(React.createElement(mod.exports.default,{...props,saved:task.answer}))
  assert.ok(right.includes('Верно!')&&right.includes(task.explanation),task.id)
  const wrong=task.answer.map((v,i)=>i===0?v%3+1:v)
  const retry=renderToStaticMarkup(React.createElement(mod.exports.default,{...props,saved:wrong}))
  assert.ok(retry.includes('Пока неверно')&&!retry.includes(task.explanation),task.id)
 }
})
