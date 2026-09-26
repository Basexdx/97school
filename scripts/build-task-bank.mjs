import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {publishable,TASK_TYPES} from '../shared/task-checker.mjs'
import {enrichMatchingTask,matchingAnswerValues,matchingParts} from '../shared/matching-utils.mjs'
import {grade7Additions,grade8Additions,grade9Additions} from '../bank/peryshkin-additions.mjs'
import {TASK_BANK_ORIGIN,TASK_BANK_TITLE,TASK_BANK_VERSION,TASK_BANK_ORIGIN_7,TASK_BANK_TITLE_7,TASK_BANK_VERSION_7,TASK_BANK_ORIGIN_9,TASK_BANK_TITLE_9,TASK_BANK_VERSION_9} from '../shared/task-bank-meta.mjs'
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
  if(t.TASK_TYPE==='matching'){
    const answers=matchingAnswerValues(t),{left,right}=matchingParts(t)
    if(answers.length<2||left.length!==answers.length||right.length<answers.length) throw Error(`${t.ID}: malformed matching columns`)
    if(t.SOURCE?.theme==='19'&&left.length!==3) throw Error(`${t.ID}: OGE matching task must contain А, Б, В`)
    if(right.some(item=>/запишите\s+(?:в\s+ответ|в\s+таблицу)/iu.test(item.text))) throw Error(`${t.ID}: answer instruction leaked into matching option`)
  }
  for(const asset of t.ASSETS||[]) if(!/^\/task-bank\/assets\/[\w.-]+$/.test(asset.url)||!fs.existsSync(path.join(root,'public',asset.url))) throw Error(`${t.ID}: missing/unsafe asset`)
}

function toPublicTask(t,version){
  const {SOURCE,CHECK,SOLUTION,FORMULAS,...publicTask}=t
  return {...enrichMatchingTask(publicTask),VERSION:version}
}

function buildGrade8(){
  const tasks=[...read('bank/tasks.json'),...read('bank/tasks-grade8-additions.json'),...grade8Additions],paragraphs=read('bank/paragraphs.json'),ids=new Set()
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
  for(const f of fs.readdirSync(publicDir)) if(f.endsWith('.json')&&!f.startsWith('grade7')&&!f.startsWith('index-grade7')&&!f.startsWith('grade9')&&!f.startsWith('index-grade9')) fs.unlinkSync(path.join(publicDir,f))
  for(const t of live)write(`public/task-bank/${t.ID}.json`,toPublicTask(t,TASK_BANK_VERSION))
  const coverage=paragraphs.map(p=>({...p,count:live.filter(t=>t.PARAGRAPH===p.paragraph).length,reviewRequired:tasks.filter(t=>t.PARAGRAPH===p.paragraph&&t.STATUS==='REVIEW_REQUIRED').length,searchStatus:'SOURCE_PDF_RELEASE'}))
  write('bank/coverage.json',coverage);write('bank/answer-mismatch.json',tasks.filter(t=>t.STATUS==='ANSWER_MISMATCH'));write('bank/review-required.json',tasks.filter(t=>t.STATUS==='REVIEW_REQUIRED'))
  write('public/task-bank/index.json',{version:TASK_BANK_VERSION,grade:8,complete:true,origin:TASK_BANK_ORIGIN,title:TASK_BANK_TITLE,paragraphs:coverage,tasks:live.map(t=>({id:t.ID,paragraph:t.PARAGRAPH,section:t.SECTION,topic:t.TOPIC,difficulty:t.DIFFICULTY,type:t.TASK_TYPE,xp:t.XP,bytes:fs.statSync(path.join(publicDir,t.ID+'.json')).size}))})
  return live.length
}

function buildGrade7(){
  const tasks=[...read('bank/tasks-grade7.json'),...grade7Additions],paragraphs=[...read('bank/paragraphs-grade7.json'),{paragraph:20,title:'Вес воздуха. Атмосферное давление',section:'pressure7'}],ids=new Set()
  for(const t of tasks){
    validateCommon(t,ids)
    if(t.CLASS!==7) throw Error(`${t.ID}: wrong class`)
    if(!(Number.isInteger(t.PARAGRAPH)&&((t.PARAGRAPH>=1&&t.PARAGRAPH<=14)||t.PARAGRAPH===20))) throw Error(`${t.ID}: paragraph mismatch`)
    if(!['intro7','matter7','motion7','interaction7','density7','gravity7','elasticity7','forces7','pressure7'].includes(t.SECTION)) throw Error(`${t.ID}: unknown grade 7 section`)
    if(t.SOURCE.organization!=='А. В. Перышкин — Сборник задач по физике 7–9 классы'||t.SOURCE.supplied_by_user!==true||!t.SOURCE.file||!t.SOURCE.task_id) throw Error(`${t.ID}: invalid supplied source metadata`)
    if(t.TASK_TYPE==='qualitative') throw Error(`${t.ID}: qualitative task must not be published in grade 7 pack`)
  }
  const live=tasks.filter(publishable),publicDir=path.join(root,'public/task-bank')
  fs.mkdirSync(publicDir,{recursive:true})
  const publicTasks=live.map(t=>toPublicTask(t,TASK_BANK_VERSION_7))
  const coverage=paragraphs.map(p=>({...p,count:live.filter(t=>t.PARAGRAPH===p.paragraph).length,reviewRequired:0,searchStatus:'SOURCE_PDF_RELEASE'}))
  write('public/task-bank/grade7.json',{version:TASK_BANK_VERSION_7,grade:7,origin:TASK_BANK_ORIGIN_7,title:TASK_BANK_TITLE_7,tasks:publicTasks})
  write('public/task-bank/index-grade7.json',{version:TASK_BANK_VERSION_7,grade:7,complete:true,origin:TASK_BANK_ORIGIN_7,title:TASK_BANK_TITLE_7,sourceRange:'1–168; 183–347; 439–441',sourceRanges:[[1,168],[183,347],[439,441]],excludedQualitative:97,excludedAdditionalRange:94,paragraphs:coverage,tasks:publicTasks.map(t=>({id:t.ID,bookNumber:t.BOOK_TASK_NUMBER,paragraph:t.PARAGRAPH,section:t.SECTION,topic:t.TOPIC,difficulty:t.DIFFICULTY,type:t.TASK_TYPE,xp:t.XP}))})
  return live.length
}

function buildGrade9(){
  const tasks=[...read('bank/tasks-grade9.json'),...grade9Additions],ids=new Set(),allowedParagraphs=new Set([51,52,53,54,57,61])
  for(const t of tasks){
    validateCommon(t,ids)
    if(t.CLASS!==9) throw Error(`${t.ID}: wrong class`)
    if(!['kinematics9','oscillations9'].includes(t.SECTION)) throw Error(`${t.ID}: unknown grade 9 section`)
    if(!allowedParagraphs.has(t.PARAGRAPH)) throw Error(`${t.ID}: paragraph mismatch`)
    if(!Number.isInteger(t.BOOK_TASK_NUMBER)) throw Error(`${t.ID}: missing book number`)
    if(t.SOURCE.organization!=='А. В. Перышкин — Сборник задач по физике 7–9 классы'||t.SOURCE.supplied_by_user!==true||!t.SOURCE.file||!t.SOURCE.task_id) throw Error(`${t.ID}: invalid supplied source metadata`)
  }
  const first=tasks.filter(t=>t.BOOK_TASK_NUMBER>=1404&&t.BOOK_TASK_NUMBER<=1513)
  if(first.some(t=>!['numeric','numeric_list'].includes(t.ANSWER.mode)||t.GRAPH_REQUIRED)) throw Error('Grade 9 range 1404–1513 must contain only direct numeric tasks without graph construction')
  const second=tasks.filter(t=>t.BOOK_TASK_NUMBER>=1588&&t.BOOK_TASK_NUMBER<=1611)
  if(second.length!==24||new Set(second.map(t=>t.BOOK_TASK_NUMBER)).size!==24) throw Error('Grade 9 range 1588–1611 must be complete')
  const live=tasks.filter(publishable),publicTasks=live.map(t=>toPublicTask(t,TASK_BANK_VERSION_9))
  const paragraphs=[...new Map(live.map(t=>[t.PARAGRAPH,{paragraph:t.PARAGRAPH,title:t.TOPIC,section:t.SECTION}])).values()].sort((a,b)=>a.paragraph-b.paragraph).map(p=>({...p,count:live.filter(t=>t.PARAGRAPH===p.paragraph).length,reviewRequired:0,searchStatus:'SOURCE_PDF_RELEASE'}))
  write('public/task-bank/grade9.json',{version:TASK_BANK_VERSION_9,grade:9,origin:TASK_BANK_ORIGIN_9,title:TASK_BANK_TITLE_9,tasks:publicTasks})
  write('public/task-bank/index-grade9.json',{version:TASK_BANK_VERSION_9,grade:9,complete:true,origin:TASK_BANK_ORIGIN_9,title:TASK_BANK_TITLE_9,sourceRanges:['1404–1513: числовой отбор без построения графиков','1588–1611: полный блок','1717–1720: период и частота колебаний'],paragraphs,tasks:publicTasks.map(t=>({id:t.ID,bookNumber:t.BOOK_TASK_NUMBER,paragraph:t.PARAGRAPH,section:t.SECTION,topic:t.TOPIC,difficulty:t.DIFFICULTY,type:t.TASK_TYPE,xp:t.XP}))})
  return live.length
}

const count8=buildGrade8(),count7=buildGrade7(),count9=buildGrade9()
console.log(`Built ${count8} grade 8 tasks, ${count7} grade 7 tasks and ${count9} grade 9 tasks from user-supplied sources.`)
