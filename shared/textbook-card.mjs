export function textbookAnswerFormat(task){
 const type=task.TASK_TYPE||task.type,answer=task.ANSWER||task.answer
 if(type==='matching')return 'Соответствие'
 if(task.answerFormat)return task.answerFormat
 if(answer?.mode==='manual'||answer?.mode==='text'||answer?.mode==='parts'&&answer.parts?.some(part=>part.type==='text'))return 'Развёрнутый ответ'
 if(!answer&&['qualitative','experiment'].includes(type))return 'Развёрнутый ответ'
 return 'Краткий ответ'
}
export function difficultySignal(difficulty){
 return {БАЗОВЫЙ:{level:1,label:'Базовая'},ПОВЫШЕННЫЙ:{level:2,label:'Повышенная'},ВЫСОКИЙ:{level:3,label:'Высокая'}}[difficulty]||null
}
