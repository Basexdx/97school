export function requiredOgeChoices(task){
  return task.type===15?1:2
}

export function parseOgeChoiceInput(value,task){
  const digits=String(value).replace(/[\s,;]+/g,'')
  const count=requiredOgeChoices(task)
  if(digits.length>count||!new RegExp(`^[1-${task.options.length}]*$`).test(digits))return null
  const choices=[...digits].map(Number)
  if(new Set(choices).size!==choices.length)return null
  return choices.sort((a,b)=>a-b)
}

export function toggleOgeChoice(previous,value,task){
  if(previous.includes(value))return previous.filter(item=>item!==value)
  const count=requiredOgeChoices(task)
  if(count===1)return [value]
  if(previous.length>=count)return previous
  return [...previous,value].sort((a,b)=>a-b)
}

export function restoreOgeChoiceAnswers(raw,tasks){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return {}
  const byId=new Map(tasks.filter(task=>task.kind==='choice').map(task=>[task.id,task]))
  return Object.fromEntries(Object.entries(raw).flatMap(([id,values])=>{
    const task=byId.get(id)
    if(!task||!Array.isArray(values)||values.length!==requiredOgeChoices(task))return []
    const parsed=parseOgeChoiceInput(values.join(''),task)
    return parsed&&parsed.length===values.length?[[id,parsed]]:[]
  }))
}
