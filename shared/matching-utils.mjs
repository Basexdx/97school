const RU_LETTERS=['А','Б','В','Г','Д','Е']
const OCR_LETTERS={A:'А',B:'В',C:'С',E:'Е',K:'К',M:'М',H:'Н',O:'О',P:'Р',T:'Т',X:'Х'}
const clean=value=>String(value??'').replace(/\s+/g,' ').trim()
const compact=value=>clean(value).replace(/[\s,;]+/g,'')

export function matchingAnswerValues(task){
  const values=task?.ANSWER?.values
  if(!Array.isArray(values))return []
  if(task?.TASK_TYPE==='matching'&&values.length===1){
    const value=compact(values[0])
    if(/^\d{2,6}$/.test(value))return [...value]
  }
  return values.map(value=>clean(value))
}

export function matchingCount(task){
  const structured=task?.MATCHING?.left||task?.LEFT||task?.STATEMENTS
  if(Array.isArray(structured)&&structured.length)return structured.length
  const answers=matchingAnswerValues(task)
  return answers.length||3
}

export function matchingResponseValues(answer,count){
  const values=Array.isArray(answer)?answer:[answer]
  if(values.length===1){
    const value=compact(values[0])
    if(/^\d{2,6}$/.test(value)&&(!count||value.length===count))return [...value]
  }
  return values.map(value=>clean(value))
}

function canonicalLetter(value,index){
  const raw=String(value||'').toUpperCase()
  const mapped=OCR_LETTERS[raw]||raw
  return RU_LETTERS.includes(mapped)?mapped:(RU_LETTERS[index]||mapped)
}
function stripTrailingInstruction(value){
  return clean(value)
    .replace(/\s+(?:запишите|впишите)\s+(?:в\s+ответ|в\s+таблицу)[\s\S]*$/iu,'')
    .replace(/\s+ответ\s*:\s*[АA]?\s*[БB]?\s*[ВB]?[\s\S]*$/iu,'')
    .trim()
}
function normalizeItems(items,prefix){
  return (items||[]).map((item,index)=>{
    if(typeof item==='string')return {id:prefix==='letter'?(RU_LETTERS[index]||String(index+1)):String(index+1),text:clean(item)}
    const fallback=prefix==='letter'?(RU_LETTERS[index]||String(index+1)):String(index+1)
    return {id:String(item.id??item.key??fallback),text:clean(item.text??item.label??item.value??'')}
  })
}

export function parseMatchingLettered(text,count=3){
  const source=String(text||'').replace(/\r?\n/g,' '),out=[]
  const re=/(?:^|\s)([АБВГДЕABCEKMHOPTХX])\)\s*([\s\S]*?)(?=(?:\s+[АБВГДЕABCEKMHOPTХX]\)|\s+\d+\)|$))/giu
  let match
  while((match=re.exec(source))){
    const id=canonicalLetter(match[1],out.length)
    const textValue=stripTrailingInstruction(match[2])
    if(textValue)out.push({id,text:textValue})
  }
  if(out.length)return out.slice(0,count).map((item,index)=>({...item,id:RU_LETTERS[index]||item.id}))
  return Array.from({length:count},(_,index)=>({id:RU_LETTERS[index]||String(index+1),text:`Понятие ${RU_LETTERS[index]||index+1}`}))
}

export function parseMatchingNumbered(text){
  const source=String(text||'').replace(/\r?\n/g,' '),out=[]
  const re=/(?:^|\s)(\d+)\)\s*([\s\S]*?)(?=(?:\s+\d+\)|$))/g
  let match
  while((match=re.exec(source))){
    const textValue=stripTrailingInstruction(match[2])
    if(textValue)out.push({id:match[1],text:textValue})
  }
  return out
}

export function matchingParts(task){
  const count=matchingCount(task)
  const structuredLeft=task?.MATCHING?.left||task?.LEFT||task?.STATEMENTS
  const structuredRight=task?.MATCHING?.right||task?.RIGHT||task?.EXAMPLES
  const left=structuredLeft?normalizeItems(structuredLeft,'letter'):parseMatchingLettered(task?.TASK,count)
  let right=structuredRight?normalizeItems(structuredRight,'number'):normalizeItems(task?.OPTIONS,'number')
  if(!right.length)right=parseMatchingNumbered(task?.TASK)
  return {left:left.slice(0,count),right}
}

export function enrichMatchingTask(task){
  if(task?.TASK_TYPE!=='matching')return task
  const {left,right}=matchingParts(task)
  return {
    ...task,
    MATCHING:{left,right},
    ANSWER:{...task.ANSWER,values:matchingAnswerValues(task)},
    ANSWER_PROMPT:'Введите номер варианта под каждой буквой'
  }
}
