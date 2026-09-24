'use client'

import styles from './matching-task.module.css'
import {matchingCount,matchingParts} from '../shared/matching-utils.mjs'

const ruLetters=['А','Б','В','Г','Д','Е']

export {matchingCount}
export function emptyMatchingAnswer(task){return Array.from({length:matchingCount(task)},()=> '')}
export function matchingAnswerReady(value){return Array.isArray(value)&&value.length>0&&value.every(v=>String(v).trim())}

export default function MatchingTaskFields({task,value,onChange}){
  const {left,right}=matchingParts(task),answers=Array.isArray(value)?value:emptyMatchingAnswer(task)
  return <div className={styles.matching}>
    <div className={styles.instruction}>Для каждого элемента слева выбери соответствующий вариант справа.</div>
    <div className={styles.columns}>
      <section><h3>Физические понятия</h3>{left.map(item=><div className={styles.item} key={item.id}><b>{item.id}</b><span>{item.text}</span></div>)}</section>
      <section><h3>Варианты</h3>{right.length?right.map(item=><div className={styles.item} key={item.id}><b>{item.id}</b><span>{item.text}</span></div>):<div className={styles.empty}>Варианты указаны в условии задачи.</div>}</section>
    </div>
    <div className={styles.answerTitle}>Ответ</div>
    <div className={styles.answerTable} style={{gridTemplateColumns:`repeat(${left.length||answers.length},minmax(72px,1fr))`}}>
      {(left.length?left:answers.map((_,i)=>({id:ruLetters[i]||String(i+1)}))).map((item,i)=><label key={item.id}><strong>{item.id}</strong><input inputMode="numeric" autoComplete="off" value={answers[i]??''} onChange={e=>{const next=[...answers];next[i]=e.target.value.replace(/[^0-9]/g,'').slice(0,2);onChange(next)}} aria-label={`Ответ для ${item.id}`} placeholder="№"/></label>)}
    </div>
  </div>
}
