import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {publishable} from '../shared/task-checker.mjs'
import {grade7Additions,grade8Additions,grade9Additions} from '../bank/peryshkin-additions.mjs'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'))
const normalize=value=>String(value||'').toLocaleLowerCase('ru-RU').replaceAll('ё','е').replace(/\s+/g,' ').trim()

function area(task){
  if(task.CLASS===7||task.CLASS===9)return 'Механические явления'
  if(task.SECTION==='thermal')return 'Тепловые явления'
  const text=normalize(`${task.TOPIC} ${task.TASK}`)
  if(/свет|линз|зеркал|оптик|луч|изображен/.test(text))return 'Оптика'
  if(task.SECTION==='electric'||/ток|напряж|сопротив|электр|заряд|магнит|ампер|вольт|цеп/.test(text))return 'Электрические явления'
  return 'Электрические явления'
}
function compact(text){const value=String(text||'').replace(/\s+/g,' ').trim();return value.length>220?value.slice(0,217).trimEnd()+'…':value}
function toSearch(task){
  const bookNumber=Number.isInteger(task.BOOK_TASK_NUMBER)?task.BOOK_TASK_NUMBER:null
  const text=[task.TOPIC,task.TASK,task.ANSWER_PROMPT,(task.OPTIONS||[]).map(x=>x.text).join(' ')].filter(Boolean).join(' ')
  return {grade:task.CLASS,id:task.ID,bookNumber,paragraph:task.PARAGRAPH,section:task.SECTION,topic:task.TOPIC,area:area(task),excerpt:compact(task.TASK),searchText:normalize(`${bookNumber||''} ${text}`)}
}

const grade7=[...read('bank/tasks-grade7.json'),...grade7Additions].filter(publishable)
const grade8=[...read('bank/tasks.json'),...read('bank/tasks-grade8-additions.json'),...grade8Additions].filter(publishable)
const grade9=[...read('bank/tasks-grade9.json'),...grade9Additions].filter(publishable)
const tasks=[...grade7,...grade8,...grade9].map(toSearch)
const out={version:1,generatedAt:new Date().toISOString(),counts:{7:grade7.length,8:grade8.length,9:grade9.length,total:tasks.length},tasks}
fs.mkdirSync(path.join(root,'public/task-bank'),{recursive:true})
fs.writeFileSync(path.join(root,'public/task-bank/search-all.json'),JSON.stringify(out,null,2)+'\n')
console.log(`Built global task search index: ${tasks.length} tasks.`)
