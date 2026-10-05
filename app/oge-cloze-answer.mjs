export const ogeClozeLetters=['А','Б','В','Г']
export const ogeAnswerLetters=task=>task.kind==='change'?ogeClozeLetters.slice(0,2):ogeClozeLetters

export function parseOgeClozeInput(value,task){
  const digits=String(value).replace(/[\s,;]+/g,'')
  if(digits.length>ogeAnswerLetters(task).length||!new RegExp(`^[1-${task.options.length}]*$`).test(digits))return null
  return [...digits].map(Number)
}

export function ogeClozeAnswerReady(values,task){
  return Array.isArray(values)&&values.length===ogeAnswerLetters(task).length&&values.every(value=>Number.isInteger(value)&&value>=1&&value<=task.options.length)
}

export function checkOgeClozeAnswer(task,values){
  if(!ogeClozeAnswerReady(values,task))return false
  return [task.answer,...(task.answerAlternatives||[])].some(key=>key.length===ogeAnswerLetters(task).length&&key.every((value,index)=>value===values[index]))
}

export function restoreOgeClozeAnswers(raw,tasks){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return {}
  const byId=new Map(tasks.filter(task=>task.kind==='cloze'||task.kind==='change').map(task=>[task.id,task]))
  return Object.fromEntries(Object.entries(raw).filter(([id,values])=>byId.has(id)&&ogeClozeAnswerReady(values,byId.get(id))))
}
