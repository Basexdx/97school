// Numeric calculation answers support fractions and scientific notation.
export function parseOgeCalculationNumber(value){
 let text=String(value??'').trim().replace(/,/g,'.').replace(/[−–]/g,'-')
 // Spaces may group thousands, but must not join unrelated numbers.
 text=text.replace(/(?<=\d)[\s\u00a0\u202f]+(?=\d{3}(?:\D|$))/g,'')
 text=text.replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+)/g,(_,power)=>'^'+[...power].map(c=>'0123456789-+'['⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺'.indexOf(c)]).join(''))
 text=text.replace(/\s*[·×*]\s*10\s*\^\s*([+-]?\d+)$/,'e$1')
 const fraction=text.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*\/\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/)
 if(fraction){const result=Number(fraction[1])/Number(fraction[2]);return Number.isFinite(result)?result:null}
 if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text))return null
 const result=Number(text)
 return Number.isFinite(result)?result:null
}

export function checkOgeCalculationAnswer(task,value){
 const number=parseOgeCalculationNumber(value)
 const tolerance=task.answerTolerance??Math.max(1e-6,Math.abs(task.answer)*1e-4)
 return number!==null&&Number.isFinite(task.answer)&&Math.abs(number-task.answer)<=tolerance+1e-10
}

export function restoreOgeCalculationDrafts(saved,tasks){
 if(!saved||typeof saved!=='object'||Array.isArray(saved))return {}
 const validIds=new Set(tasks.filter(task=>task.kind==='calculation').map(task=>task.id))
 return Object.fromEntries(Object.entries(saved).filter(([id,draft])=>validIds.has(id)&&draft&&typeof draft.answer==='string'&&draft.answer.length<=100).map(([id,draft])=>[id,{answer:draft.answer,checked:draft.checked===true}]))
}
