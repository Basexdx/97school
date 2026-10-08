import {checkOgeCalculationAnswer} from '../app/oge-calculation-answer.mjs'
import {checkOgeChoiceAnswer} from '../app/oge-choice-answer.mjs'
import {checkOgeClozeAnswer} from '../app/oge-cloze-answer.mjs'
import {isCorrectOgeNumber} from '../app/oge-number-answer.mjs'
import {checkOgeMatchingAnswer} from '../app/oge-matching-answer.mjs'

export function checkOgeAttempt(task,answer){
 if(task.answer==null)return {correct:null,reviewRequired:true}
 let correct=false
 if(task.kind==='choice')correct=checkOgeChoiceAnswer(task,answer)
 else if(task.kind==='cloze'||task.kind==='change')correct=checkOgeClozeAnswer(task,answer)
 else if(task.kind==='matching')correct=checkOgeMatchingAnswer(task,answer)
 else if(task.kind==='calculation')correct=checkOgeCalculationAnswer(task,answer)
 else correct=isCorrectOgeNumber(answer,task.answer)
 return {correct,reviewRequired:correct===null}
}

export function teacherAnswerLabel(answer){
 if(!answer)return ''
 if(answer.reference)return answer.reference
 if(answer.mode==='manual')return ''
 if(answer.parts)return answer.parts.map(p=>{
  const value=p.value??p.values?.map(v=>p.options?.find(o=>String(o.id)===String(v))?.text??v).join(', ')??''
  return `${p.label?`${p.label}: `:''}${value}${p.unit?` ${p.unit}`:''}`
 }).join('; ')
 if(answer.value!=null)return `${answer.value}${answer.unit?` ${answer.unit}`:''}`
 if(answer.values)return answer.values.join(', ')
 return ''
}
