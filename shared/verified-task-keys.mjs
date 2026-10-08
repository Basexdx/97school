import ogeKeys from '../bank/verified-oge-keys.json' with {type:'json'}
import textbookKeys from '../bank/verified-textbook-keys.json' with {type:'json'}

export function withVerifiedOgeKey(task){
  const key=ogeKeys[task.id]
  if(!key)return task
  return {...task,answer:key.answer,answerAlternatives:key.answerAlternatives||[],
    text:(key.textCorrection||task.text)+(key.assumption?`\n\n${key.assumption}`:''),
    figures:key.tablesCorrection?[]:task.figures,tables:key.tablesCorrection||task.tables,
    options:task.options?.map((option,index)=>key.optionCorrections?.[index+1]||option),
    answerVerified:true}
}

export function withVerifiedTextbookKey(task){
  const key=textbookKeys[task.ID]
  if(!key)return task
  const notes=[key.assumption,key.constants?.length?`Для расчёта используйте: ${key.constants.join('; ')}.`:''].filter(Boolean).join(' ')
  const text=notes&&!task.TASK.endsWith(notes)?`${task.TASK}\n\n${notes}`:task.TASK
  return {...task,TASK:text,ANSWER:key.answer,ANSWER_PROMPT:key.answerPrompt||task.ANSWER_PROMPT,
    ANSWER_VERIFIED:true,CHECK:{...task.CHECK,method:key.verification.method,
      independent:key.verification.reason,CALCULATED_ANSWER:key.answer,
      CHECK_COMMENT:'Ключ независимо проверен по условию; эталон качественного ответа предназначен для учителя.',resolved:true}}
}
