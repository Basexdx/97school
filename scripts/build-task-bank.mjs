import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {publishable,TASK_TYPES} from '../shared/task-checker.mjs'
import {TASK_BANK_ORIGIN,TASK_BANK_TITLE,TASK_BANK_VERSION} from '../shared/task-bank-meta.mjs'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'))
const write=(p,v)=>fs.writeFileSync(path.join(root,p),JSON.stringify(v,null,2)+'\n')
const tasks=read('bank/tasks.json'), paragraphs=read('bank/paragraphs.json')
const ids=new Set()
for(const t of tasks) {
  for(const key of ['ID','CLASS','SECTION','PARAGRAPH','TOPIC','DIFFICULTY','TASK_TYPE','TASK','OPTIONS','ANSWER','STATUS','SOLUTION','FORMULAS','UNITS','SKILLS','IMAGE_REQUIRED','IMAGE_DESCRIPTION','XP','OFFLINE_READY','SOURCE','CHECK']) if(t[key]===undefined) throw Error(`${t.ID}: missing ${key}`)
  if(ids.has(t.ID) || !/^[a-zA-Z0-9_-]+$/.test(t.ID)) throw Error('Duplicate or unsafe ID')
  ids.add(t.ID)
  if(t.CLASS!==8) throw Error('Wrong class')
  if(t.SECTION==='thermal' && !(Number.isInteger(t.PARAGRAPH)&&t.PARAGRAPH>=1&&t.PARAGRAPH<=26)) throw Error(`${t.ID}: thermal paragraph mismatch`)
  if(t.SECTION==='electric' && !(Number.isInteger(t.PARAGRAPH)&&t.PARAGRAPH>=27&&t.PARAGRAPH<=40)) throw Error(`${t.ID}: electric paragraph mismatch`)
  if(t.SECTION==='extra8' && t.PARAGRAPH!==null) throw Error(`${t.ID}: extra8 tasks must not invent paragraph numbers`)
  if(!['thermal','electric','extra8'].includes(t.SECTION)) throw Error('Unknown section')
  if(!['РЕШУ ОГЭ — физика','А. В. Перышкин — Сборник задач по физике 7–9 классы'].includes(t.SOURCE.organization)||t.SOURCE.supplied_by_user!==true||!t.SOURCE.file||!t.SOURCE.task_id) throw Error(`${t.ID}: invalid supplied source metadata`)
  if(!TASK_TYPES.includes(t.TASK_TYPE)) throw Error('Unknown task type')
  if(t.XP!==({'БАЗОВЫЙ':10,'ПОВЫШЕННЫЙ':20,'ВЫСОКИЙ':30})[t.DIFFICULTY]) throw Error(`${t.ID}: invalid XP`)
  if(!['VERIFIED','ANSWER_MISMATCH','REVIEW_REQUIRED'].includes(t.STATUS)) throw Error('Invalid status')
  if(publishable(t) && !t.CHECK.independent) throw Error(`${t.ID}: verification incomplete`)
  for(const asset of t.ASSETS||[]) {
    if(!/^\/task-bank\/assets\/[\w.-]+$/.test(asset.url)||!fs.existsSync(path.join(root,'public',asset.url))) throw Error('Missing/unsafe asset')
  }
  if(t.IMAGE_REQUIRED && !(t.ASSETS?.length || t.TABLE || t.DIAGRAM)) throw Error(`${t.ID}: missing figure`)
  if(t.ANSWER.mode==='numeric' && (!Number.isFinite(t.ANSWER.value)||!t.ANSWER.unit)) throw Error('Invalid numeric answer')
}
const live=tasks.filter(publishable)
const version=TASK_BANK_VERSION
const publicDir=path.join(root,'public/task-bank')
fs.mkdirSync(publicDir,{recursive:true})
for(const f of fs.readdirSync(publicDir)) if(f.endsWith('.json')) fs.unlinkSync(path.join(publicDir,f))
for(const t of live) {
  const {SOURCE,CHECK,SOLUTION,FORMULAS,...publicTask}=t
  write(`public/task-bank/${t.ID}.json`,{...publicTask,VERSION:version})
}
const coverage=paragraphs.map(p=>({...p,count:live.filter(t=>t.PARAGRAPH===p.paragraph).length,reviewRequired:tasks.filter(t=>t.PARAGRAPH===p.paragraph&&t.STATUS==='REVIEW_REQUIRED').length,searchStatus:'SOURCE_PDF_RELEASE'}))
write('bank/coverage.json',coverage)
write('bank/answer-mismatch.json',tasks.filter(t=>t.STATUS==='ANSWER_MISMATCH'))
write('bank/review-required.json',tasks.filter(t=>t.STATUS==='REVIEW_REQUIRED'))
write('public/task-bank/index.json',{version,complete:true,origin:TASK_BANK_ORIGIN,title:TASK_BANK_TITLE,paragraphs:coverage,tasks:live.map(t=>({id:t.ID,paragraph:t.PARAGRAPH,section:t.SECTION,topic:t.TOPIC,difficulty:t.DIFFICULTY,type:t.TASK_TYPE,xp:t.XP,bytes:fs.statSync(path.join(publicDir,t.ID+'.json')).size}))})
console.log(`Built ${live.length} published tasks from user-supplied sources.`)
