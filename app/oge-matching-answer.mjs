export function parseOgeMatchingValue(value,task){
  const text=String(value).trim()
  return text===''||task.right.some(option=>option.id===text)?text:null
}

export function ogeMatchingAnswerReady(answer,task){
  return Array.isArray(answer)&&answer.length===task.left.length&&answer.every(value=>typeof value==='string'&&value!==''&&parseOgeMatchingValue(value,task)===value)
}

export function checkOgeMatchingAnswer(task,answer){
  if(!Array.isArray(task.answer))return null
  if(!Array.isArray(answer)||answer.length!==task.left.length)return false
  const values=answer.map(String)
  if(!ogeMatchingAnswerReady(values,task))return false
  return [task.answer,...(task.answerAlternatives||[])].some(key=>values.length===key.length&&values.every((value,index)=>value===String(key[index])))
}

export function restoreOgeMatchingAnswers(raw,tasks){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return {}
  const byId=new Map(tasks.filter(task=>task.kind==='matching').map(task=>[task.id,task]))
  return Object.fromEntries(Object.entries(raw).filter(([id,answer])=>{
    const task=byId.get(id)
    return task&&ogeMatchingAnswerReady(answer,task)
  }))
}
