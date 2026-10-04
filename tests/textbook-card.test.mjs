import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {textbookAnswerFormat,difficultySignal} from '../shared/textbook-card.mjs'
const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url)))
test('answer labels follow actual entry mode rather than calculation or diagram type',()=>{
 assert.equal(textbookAnswerFormat({TASK_TYPE:'matching',ANSWER:{mode:'ordered'}}),'Соответствие')
 for(const mode of ['numeric','numeric_list','ordered','set'])assert.equal(textbookAnswerFormat({TASK_TYPE:'calculation',ANSWER:{mode}}),'Краткий ответ')
 for(const type of ['calculation','graph','qualitative'])assert.equal(textbookAnswerFormat({TASK_TYPE:type,ANSWER:{mode:'manual'}}),'Развёрнутый ответ')
 assert.equal(textbookAnswerFormat({ANSWER:{mode:'parts',parts:[{type:'numeric'},{type:'text'}]}}),'Развёрнутый ответ')
})
test('all published textbook indexes preserve the source answer format without publishing answers',()=>{
 for(const grade of [7,8,9]){
  const index=read(grade===8?'../public/task-bank/index.json':`../public/task-bank/index-grade${grade}.json`)
  const pack=grade===8?null:read(`../public/task-bank/grade${grade}.json`)
  for(const entry of index.tasks){const task=pack?pack.tasks.find(t=>t.ID===entry.id):read(`../public/task-bank/${entry.id}.json`);assert.equal(entry.answerFormat,textbookAnswerFormat(task),entry.id);assert.equal(Object.hasOwn(entry,'ANSWER'),false)}
 }
})
test('difficulty uses three ordered signal levels and does not invent unknown levels',()=>{
 assert.deepEqual(['БАЗОВЫЙ','ПОВЫШЕННЫЙ','ВЫСОКИЙ'].map(v=>difficultySignal(v).level),[1,2,3]);assert.equal(difficultySignal(''),null)
})
test('textbook tiles omit the OGE type prefix and expose difficulty without hiding status or XP',async()=>{
 const {build}=await import('esbuild'),{createRequire}=await import('node:module'),React=(await import('react')).default,{renderToStaticMarkup}=await import('react-dom/server')
 const result=await build({entryPoints:[new URL('../app/task-tile.js',import.meta.url).pathname],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.js':'jsx'},external:['react','react/jsx-runtime'],plugins:[{name:'css-stub',setup(b){b.onLoad({filter:/\.css$/},()=>({contents:'export default {}',loader:'js'}))}}]})
 const mod={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports)
 for(const difficulty of ['БАЗОВЫЙ','ПОВЫШЕННЫЙ','ВЫСОКИЙ']){
  const html=renderToStaticMarkup(React.createElement(mod.exports.default,{answerFormat:'Соответствие',difficulty,section:'Механика',number:46,status:'Просмотрена',xp:20,preview:'Установите соответствие.'}))
  assert.doesNotMatch(html,/ТИП/);for(const label of ['Соответствие','№ 46','Просмотрена','20 XP',`Сложность: ${difficultySignal(difficulty).label}`])assert.ok(html.includes(label))
  assert.equal((html.match(/fill="#ffc34e"/g)||[]).length,difficultySignal(difficulty).level)
 }
})
