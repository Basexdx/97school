import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {ogeTasks} from '../app/oge-task-data.mjs'
import {checkOgeAttempt} from '../shared/oge-attempts.mjs'
import {checkAnswer} from '../shared/task-checker.mjs'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const read=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'))
const failures=[]
const fail=(scope,message)=>failures.push(`${scope}: ${message}`)
const assert=(condition,scope,message)=>{if(!condition)fail(scope,message)}

function canonicalTextbookAnswer(task){
  const answer=task.ANSWER
  if(answer.mode==='numeric')return String(answer.value)
  if(answer.mode==='numeric_list')return answer.values.map(String)
  if(answer.mode==='parts')return answer.parts.map(part=>String(part.type==='numeric'?part.value:part.values?.[0]??''))
  return answer.values
}

function loadTextbookBanks(){
  const grade7=read('public/task-bank/grade7.json')
  const grade8Index=read('public/task-bank/index.json')
  const grade8={version:grade8Index.version,grade:8,tasks:grade8Index.tasks.map(entry=>read(`public/task-bank/${entry.id}.json`))}
  const grade9=read('public/task-bank/grade9.json')
  return [grade7,grade8,grade9]
}

const textbookBanks=loadTextbookBanks()
const textbookIds=new Set()
const textbookDiagrams=new Map()
for(const bank of textbookBanks){
  const scope=`Задачник ${bank.grade} класса`
  assert(Array.isArray(bank.tasks)&&bank.tasks.length>0,scope,'банк пуст')
  for(const task of bank.tasks){
    const taskScope=`${scope}, ${task.ID}`
    assert(!textbookIds.has(task.ID),taskScope,'повторяющийся ID')
    textbookIds.add(task.ID)
    assert(task.CLASS===bank.grade,taskScope,'неверно указан класс')
    assert(String(task.TASK??'').trim().length>10,taskScope,'пустое или слишком короткое условие')
    assert(Number.isFinite(task.XP)&&task.XP>0,taskScope,'некорректный XP')
    assert(task.ANSWER&&task.ANSWER.mode!=='manual'&&task.ANSWER.mode!=='text',taskScope,'в автономную сборку попал развёрнутый ответ')
    try{
      const checked=checkAnswer(task,canonicalTextbookAnswer(task))
      assert(checked.correct===true&&!checked.reviewRequired,taskScope,'эталонный ответ не принимается проверяющим модулем')
    }catch(error){fail(taskScope,`ошибка проверки ответа: ${error.message}`)}
    if(task.IMAGE_REQUIRED)assert(Boolean(task.DIAGRAM||(task.ASSETS||[]).length||task.TABLE),taskScope,'для условия требуется рисунок, но его нет')
    if(task.DIAGRAM)textbookDiagrams.set(task.DIAGRAM.type,(textbookDiagrams.get(task.DIAGRAM.type)||0)+1)
  }
}

const allowedTextbookDiagrams=new Set(['scale-collection','ruler-block','graduated-cylinder','liquid-levels','stopwatch-pair','ruler-pair','line-chart','blank-grid','multi-line-chart','peryshkin-schematic','pipe-compensator','wet-glass','coil-induction','comb-water','balloon-pepper','coil-magnet','comb-foil','bar-chart','data-table','ice-calorimeter'])
for(const type of textbookDiagrams.keys())assert(allowedTextbookDiagrams.has(type),'Рисунки задачника',`неподдерживаемый тип ${type}`)

const ogeIds=new Set()
const ogeFigureRefs=new Set()
const ogeInlineDiagrams=new Map()
const allowedOgeDiagrams=new Set(['timeline','graph','inclineMarks','route','rulers4','ruler','wave','oscillation','doubleOsc','mirror','pulley','lever','utube','leverGrid','energyBalls','table','buoyancy'])
for(const task of ogeTasks){
  const scope=`ФИПИ ${task.id}`
  assert(!ogeIds.has(task.id),scope,'повторяющийся ID')
  ogeIds.add(task.id)
  assert(Number.isInteger(task.type)&&task.type>=1&&task.type<=22,scope,'неверный тип задания')
  assert(String(task.text??'').trim().length>10,scope,'пустое или слишком короткое условие')
  assert(task.answer!=null,scope,'нет ключа ответа')
  assert(Boolean(task.answerVerified||task.answerSource),scope,'нет источника или отметки проверки ключа')
  assert(Number.isFinite(task.xp)&&task.xp>0,scope,'некорректный XP')
  const canonical=task.kind==='calculation'||(!task.kind&&typeof task.answer==='number')?String(task.answer):task.answer
  try{assert(checkOgeAttempt(task,canonical).correct===true,scope,'эталонный ответ не принимается проверяющим модулем')}
  catch(error){fail(scope,`ошибка проверки ответа: ${error.message}`)}
  for(const figure of task.figures||[]){
    assert(/^\/oge-figures\/[\w.-]+$/.test(figure),scope,`небезопасный путь рисунка ${figure}`)
    assert(fs.existsSync(path.join(root,'public',figure)),scope,`рисунок не найден: ${figure}`)
    ogeFigureRefs.add(figure)
  }
  if(task.diagram){
    assert(allowedOgeDiagrams.has(task.diagram.kind),scope,`неподдерживаемый встроенный рисунок ${task.diagram.kind}`)
    ogeInlineDiagrams.set(task.diagram.kind,(ogeInlineDiagrams.get(task.diagram.kind)||0)+1)
  }
  const joined=[task.text,task.explanation].filter(Boolean).join(' ')
  assert(!/рисунок\s+задачи\s+к\s*№|решу\s+огэ/iu.test(joined),scope,'в тексте осталась служебная подпись источника')
}

const figureDir=path.join(root,'public/oge-figures')
const figureFiles=fs.readdirSync(figureDir).filter(name=>fs.statSync(path.join(figureDir,name)).isFile())
for(const name of figureFiles){
  const scope=`Рисунок ${name}`
  const file=path.join(figureDir,name)
  const extension=path.extname(name).toLowerCase()
  assert(extension==='.svg'||extension==='.webp',scope,`неподдерживаемый формат ${extension}`)
  if(extension==='.svg'){
    const svg=fs.readFileSync(file,'utf8')
    assert(/<svg\b/iu.test(svg),scope,'файл не содержит SVG')
    assert(/\bviewBox\s*=|(?:\bwidth\s*=.*\bheight\s*=)|(?:\bheight\s*=.*\bwidth\s*=)/isu.test(svg),scope,'не заданы размеры или viewBox')
    assert(!/рисунок\s+задачи\s+к\s*№|решу\s+огэ/iu.test(svg),scope,'в рисунке осталась служебная подпись источника')
  }else{
    const bytes=fs.readFileSync(file)
    assert(bytes.length>100,scope,'файл слишком мал')
    assert(bytes.subarray(0,4).toString('ascii')==='RIFF'&&bytes.subarray(8,12).toString('ascii')==='WEBP',scope,'повреждённый заголовок WebP')
  }
}

const search=read('public/task-bank/search-all.json')
const expectedTextbook=textbookBanks.reduce((sum,bank)=>sum+bank.tasks.length,0)
assert(Array.isArray(search.tasks)&&search.tasks.length===expectedTextbook,'Поисковый индекс',`ожидалось ${expectedTextbook}, найдено ${search.tasks?.length??0}`)
assert(new Set(search.tasks.map(task=>task.id)).size===search.tasks.length,'Поисковый индекс','есть повторяющиеся задачи')

const result={
  checkedAt:new Date().toISOString(),
  textbook:Object.fromEntries(textbookBanks.map(bank=>[`grade${bank.grade}`,bank.tasks.length])),
  textbookTotal:expectedTextbook,
  ogeTotal:ogeTasks.length,
  ogeExternalFigures:ogeFigureRefs.size,
  ogeFigureFilesChecked:figureFiles.length,
  ogeInlineFigures:[...ogeInlineDiagrams.values()].reduce((sum,count)=>sum+count,0),
  textbookFigures:[...textbookDiagrams.values()].reduce((sum,count)=>sum+count,0),
  failures,
}
fs.mkdirSync(path.join(root,'release'),{recursive:true})
fs.writeFileSync(path.join(root,'release/content-audit.json'),JSON.stringify(result,null,2)+'\n')
if(failures.length){
  console.error(JSON.stringify(result,null,2))
  process.exit(1)
}
console.log(JSON.stringify(result,null,2))
