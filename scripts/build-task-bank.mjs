import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {publishable,TASK_TYPES} from '../shared/task-checker.mjs'
import {TASK_BANK_ORIGIN,TASK_BANK_TITLE,TASK_BANK_VERSION,TASK_BANK_ORIGIN_7,TASK_BANK_TITLE_7,TASK_BANK_VERSION_7} from '../shared/task-bank-meta.mjs'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'))
const write=(p,v)=>fs.writeFileSync(path.join(root,p),JSON.stringify(v,null,2)+'\n')
const xpByDifficulty={БАЗОВЫЙ:10,ПОВЫШЕННЫЙ:20,ВЫСОКИЙ:30}
const required=['ID','CLASS','SECTION','PARAGRAPH','TOPIC','DIFFICULTY','TASK_TYPE','TASK','OPTIONS','ANSWER','STATUS','SOLUTION','FORMULAS','UNITS','SKILLS','IMAGE_REQUIRED','IMAGE_DESCRIPTION','XP','OFFLINE_READY','SOURCE','CHECK']

function validateCommon(t,ids){
  for(const key of required) if(t[key]===undefined) throw Error(`${t.ID}: missing ${key}`)
  if(ids.has(t.ID)||!/^[a-zA-Z0-9_-]+$/.test(t.ID)) throw Error(`${t.ID}: duplicate or unsafe ID`)
  ids.add(t.ID)
  if(!TASK_TYPES.includes(t.TASK_TYPE)) throw Error(`${t.ID}: unknown task type`)
  if(t.XP!==xpByDifficulty[t.DIFFICULTY]) throw Error(`${t.ID}: invalid XP`)
  if(!['VERIFIED','ANSWER_MISMATCH','REVIEW_REQUIRED'].includes(t.STATUS)) throw Error(`${t.ID}: invalid status`)
  if(publishable(t)&&!t.CHECK.independent) throw Error(`${t.ID}: verification incomplete`)
  if(t.IMAGE_REQUIRED&&!(t.ASSETS?.length||t.TABLE||t.DIAGRAM)) throw Error(`${t.ID}: missing figure`)
  if(t.ANSWER.mode==='numeric'&&(!Number.isFinite(t.ANSWER.value)||!t.ANSWER.unit)) throw Error(`${t.ID}: invalid numeric answer`)
  for(const asset of t.ASSETS||[]) if(!/^\/task-bank\/assets\/[\w.-]+$/.test(asset.url)||!fs.existsSync(path.join(root,'public',asset.url))) throw Error(`${t.ID}: missing/unsafe asset`)
}

function buildGrade8(){
  const tasks=read('bank/tasks.json'),paragraphs=read('bank/paragraphs.json'),ids=new Set()
  for(const t of tasks){
    validateCommon(t,ids)
    if(t.CLASS!==8) throw Error(`${t.ID}: wrong class`)
    if(t.SECTION==='thermal'&&!(Number.isInteger(t.PARAGRAPH)&&t.PARAGRAPH>=1&&t.PARAGRAPH<=26)) throw Error(`${t.ID}: thermal paragraph mismatch`)
    if(t.SECTION==='electric'&&!(Number.isInteger(t.PARAGRAPH)&&t.PARAGRAPH>=27&&t.PARAGRAPH<=40)) throw Error(`${t.ID}: electric paragraph mismatch`)
    if(t.SECTION==='extra8'&&t.PARAGRAPH!==null) throw Error(`${t.ID}: extra8 tasks must not invent paragraph numbers`)
    if(!['thermal','electric','extra8'].includes(t.SECTION)) throw Error(`${t.ID}: unknown section`)
    if(!['РЕШУ ОГЭ — физика','А. В. Перышкин — Сборник задач по физике 7–9 классы'].includes(t.SOURCE.organization)||t.SOURCE.supplied_by_user!==true||!t.SOURCE.file||!t.SOURCE.task_id) throw Error(`${t.ID}: invalid supplied source metadata`)
  }
  const live=tasks.filter(publishable),publicDir=path.join(root,'public/task-bank')
  fs.mkdirSync(publicDir,{recursive:true})
  for(const f of fs.readdirSync(publicDir)) if(f.endsWith('.json')&&!f.startsWith('grade7')&&!f.startsWith('index-grade7')) fs.unlinkSync(path.join(publicDir,f))
  for(const t of live){const {SOURCE,CHECK,SOLUTION,FORMULAS,...publicTask}=t;write(`public/task-bank/${t.ID}.json`,{...publicTask,VERSION:TASK_BANK_VERSION})}
  const coverage=paragraphs.map(p=>({...p,count:live.filter(t=>t.PARAGRAPH===p.paragraph).length,reviewRequired:tasks.filter(t=>t.PARAGRAPH===p.paragraph&&t.STATUS==='REVIEW_REQUIRED').length,searchStatus:'SOURCE_PDF_RELEASE'}))
  write('bank/coverage.json',coverage);write('bank/answer-mismatch.json',tasks.filter(t=>t.STATUS==='ANSWER_MISMATCH'));write('bank/review-required.json',tasks.filter(t=>t.STATUS==='REVIEW_REQUIRED'))
  write('public/task-bank/index.json',{version:TASK_BANK_VERSION,grade:8,complete:true,origin:TASK_BANK_ORIGIN,title:TASK_BANK_TITLE,paragraphs:coverage,tasks:live.map(t=>({id:t.ID,paragraph:t.PARAGRAPH,section:t.SECTION,topic:t.TOPIC,difficulty:t.DIFFICULTY,type:t.TASK_TYPE,xp:t.XP,bytes:fs.statSync(path.join(publicDir,t.ID+'.json')).size}))})
  return live.length
}

function buildGrade7(){
  const tasks=read('bank/tasks-grade7.json'),paragraphs=read('bank/paragraphs-grade7.json'),ids=new Set()
  for(const t of tasks){
    validateCommon(t,ids)
    if(t.CLASS!==7) throw Error(`${t.ID}: wrong class`)
    if(!(Number.isInteger(t.PARAGRAPH)&&t.PARAGRAPH>=1&&t.PARAGRAPH<=7)) throw Error(`${t.ID}: paragraph mismatch`)
    if(!['intro7','matter7','motion7'].includes(t.SECTION)) throw Error(`${t.ID}: unknown grade 7 section`)
    if(t.SOURCE.organization!=='А. В. Перышкин — Сборник задач по физике 7–9 классы'||t.SOURCE.supplied_by_user!==true||!t.SOURCE.file||!t.SOURCE.task_id) throw Error(`${t.ID}: invalid supplied source metadata`)
    if(t.TASK_TYPE==='qualitative') throw Error(`${t.ID}: qualitative task must not be published in grade 7 pack`)
  }
  const live=tasks.filter(publishable),publicDir=path.join(root,'public/task-bank')
  fs.mkdirSync(publicDir,{recursive:true})
  const publicTasks=[]
  for(const t of live){
    const {SOURCE,CHECK,SOLUTION,FORMULAS,...publicTask}=t
    const item={...publicTask,VERSION:TASK_BANK_VERSION_7}
    publicTasks.push(item)
  }
  const coverage=paragraphs.map(p=>({...p,count:live.filter(t=>t.PARAGRAPH===p.paragraph).length,reviewRequired:0,searchStatus:'SOURCE_PDF_RELEASE'}))
  write('public/task-bank/grade7.json',{version:TASK_BANK_VERSION_7,grade:7,origin:TASK_BANK_ORIGIN_7,title:TASK_BANK_TITLE_7,tasks:publicTasks})
  write('public/task-bank/index-grade7.json',{version:TASK_BANK_VERSION_7,grade:7,complete:true,origin:TASK_BANK_ORIGIN_7,title:TASK_BANK_TITLE_7,sourceRange:'1–168',excludedQualitative:168-live.length,paragraphs:coverage,tasks:publicTasks.map(t=>({id:t.ID,bookNumber:t.BOOK_TASK_NUMBER,paragraph:t.PARAGRAPH,section:t.SECTION,topic:t.TOPIC,difficulty:t.DIFFICULTY,type:t.TASK_TYPE,xp:t.XP}))})
  return live.length
}

const count8=buildGrade8(),count7=buildGrade7()
console.log(`Built ${count8} grade 8 tasks and ${count7} grade 7 tasks from user-supplied sources.`)
