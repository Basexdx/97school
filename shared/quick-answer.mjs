export function hasQuickAnswer(task){
 const answer=task.ANSWER||task.answer
 if(answer==null)return false
 if(['manual','text'].includes(answer.mode))return false
 if(answer.parts?.some(part=>part.type==='text'||part.mode==='manual'))return false
 return true
}
