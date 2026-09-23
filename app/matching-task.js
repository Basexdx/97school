'use client'

import styles from './matching-task.module.css'

const ruLetters=['А','Б','В','Г','Д','Е']
const clean=s=>String(s||'').replace(/\s+/g,' ').trim()

export function matchingCount(task){
  return task?.ANSWER?.values?.length||task?.MATCHING?.left?.length||task?.LEFT?.length||3
}
export function emptyMatchingAnswer(task){return Array.from({length:matchingCount(task)},()=> '')}
export function matchingAnswerReady(value){return Array.isArray(value)&&value.length>0&&value.every(v=>String(v).trim())}

function parseNumbered(text){
  const source=String(text||'').replace(/\n/g,' '),out=[]
  const re=/(?:^|\s)(\d+)\)\s*([\s\S]*?)(?=(?:\s+\d+\)|$))/g
  let m
  while((m=re.exec(source)))out.push({id:m[1],text:clean(m[2])})
  return out
}
function parseLettered(text,count){
  const source=String(text||'').replace(/\n/g,' '),out=[]
  const re=/(?:^|\s)([АБВГДЕ])\)\s*([\s\S]*?)(?=(?:\s+[АБВГДЕ]\)|\s+\d+\)|$))/g
  let m
  while((m=re.exec(source)))out.push({id:m[1],text:clean(m[2])})
  if(out.length)return out.slice(0,count)
  return Array.from({length:count},(_,i)=>({id:ruLetters[i]||String(i+1),text:`Понятие ${ruLetters[i]||i+1}`}))
}
function normalizeItems(items,prefix){return (items||[]).map((item,i)=>typeof item==='string'?{id:prefix==='letter'?(ruLetters[i]||String(i+1)):String(i+1),text:item}:{id:String(item.id??item.key??(prefix==='letter'?(ruLetters[i]||i+1):i+1)),text:item.text??item.label??item.value??''})}

function parts(task){
  const count=matchingCount(task)
  const structuredLeft=task.MATCHING?.left||task.LEFT||task.STATEMENTS
  const structuredRight=task.MATCHING?.right||task.RIGHT||task.EXAMPLES
  const left=structuredLeft?normalizeItems(structuredLeft,'letter'):parseLettered(task.TASK,count)
  let right=structuredRight?normalizeItems(structuredRight,'number'):normalizeItems(task.OPTIONS,'number')
  if(!right.length)right=parseNumbered(task.TASK)
  return {left:left.slice(0,count),right}
}

export default function MatchingTaskFields({task,value,onChange}){
  const {left,right}=parts(task),answers=Array.isArray(value)?value:emptyMatchingAnswer(task)
  return <div className={styles.matching}>
    <div className={styles.instruction}>Для каждого элемента слева выбери соответствующий вариант справа.</div>
    <div className={styles.columns}>
      <section><h3>Физические понятия</h3>{left.map((item,i)=><div className={styles.item} key={item.id}><b>{item.id}</b><span>{item.text}</span></div>)}</section>
      <section><h3>Варианты</h3>{right.length?right.map(item=><div className={styles.item} key={item.id}><b>{item.id}</b><span>{item.text}</span></div>):<div className={styles.empty}>Варианты указаны в условии задачи.</div>}</section>
    </div>
    <div className={styles.answerTitle}>Ответ</div>
    <div className={styles.answerTable} style={{gridTemplateColumns:`repeat(${left.length||answers.length},minmax(72px,1fr))`}}>
      {(left.length?left:answers.map((_,i)=>({id:ruLetters[i]||String(i+1)}))).map((item,i)=><label key={item.id}><strong>{item.id}</strong><input inputMode="numeric" autoComplete="off" value={answers[i]??''} onChange={e=>{const next=[...answers];next[i]=e.target.value.replace(/[^0-9]/g,'').slice(0,2);onChange(next)}} aria-label={`Ответ для ${item.id}`} placeholder="№"/></label>)}
    </div>
  </div>
}
