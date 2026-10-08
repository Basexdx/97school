import {checkOgeCalculationAnswer} from '../app/oge-calculation-answer.mjs'
import {checkOgeChoiceAnswer} from '../app/oge-choice-answer.mjs'
import {checkOgeClozeAnswer} from '../app/oge-cloze-answer.mjs'
import {isCorrectOgeNumber} from '../app/oge-number-answer.mjs'

export function checkOgeAttempt(task,answer){
 if(task.answer==null)return {correct:null,reviewRequired:true}
 let correct=false
 if(task.kind==='choice')correct=checkOgeChoiceAnswer(task,answer)
 else if(task.kind==='cloze'||task.kind==='change')correct=checkOgeClozeAnswer(task,answer)
 else if(task.kind==='matching')correct=Array.isArray(answer)&&answer.length===task.answer.length&&answer.every((v,i)=>String(v)===String(task.answer[i]))
 else if(task.kind==='calculation')correct=checkOgeCalculationAnswer(task,answer)
 else correct=isCorrectOgeNumber(answer,task.answer)
 return {correct,reviewRequired:correct===null}
}

export function teacherAnswerLabel(answer){
 if(!answer||answer.mode==='manual')return ''
 if(answer.parts)return answer.parts.map(p=>p.value??p.values?.join(', ')??'').join('; ')
 if(answer.value!=null)return String(answer.value)
 if(answer.values)return answer.values.join(', ')
 return ''
}
