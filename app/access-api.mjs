import {studentDestination} from '../shared/student-avatars.mjs'
const messages={invalid_code:'Код не найден или недействителен.',code_expired:'Срок действия кода истёк. Обратитесь к учителю.',code_used:'Этот код уже использован. Для нового устройства попросите учителя выдать новый код.',code_already_in_use:'По этому коду уже отправлен запрос. Продолжите на устройстве, с которого его отправили.',too_many_attempts:'Слишком много попыток. Подождите несколько минут.',invalid_credentials:'Неверный ключ учителя.',student_auth_required:'Сессия закончилась. Войдите снова.',teacher_auth_required:'Сессия учителя закончилась. Войдите снова.',invalid_avatar:'Выберите аватар из списка.',request_expired:'Время подтверждения истекло.',request_already_decided:'Запрос уже обработан.'}
export async function accessApi(path,{body,signal}={}){
 let response
 try{response=await fetch(path,{method:body===undefined?'GET':'POST',credentials:'include',cache:'no-store',signal,...(body===undefined?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)})})}
 catch(error){if(error.name==='AbortError')throw error;throw Object.assign(new Error('Нет связи с сервером. Проверьте интернет и попробуйте снова.'),{status:0})}
 const data=await response.json().catch(()=>({error:'unavailable'}))
 if(!response.ok)throw Object.assign(new Error(messages[data.error]||'Не удалось выполнить запрос. Попробуйте снова.'),{status:response.status,data})
 return data
}
export function accessRequest(data){
 const time=data.requestedAt||data.created_at
 const date=time?new Date(time.includes('T')?time:time.replace(' ','T')+'Z'):null
 return {...data,id:data.requestId||data.id,className:data.className||data.class_title,codeLabel:data.codeLabel||data.key_label,requestedAt:date&&!Number.isNaN(date.valueOf())?date.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}):'—'}
}

export const studentScreens=['home','topics','tests','oge','practice','fipi','formulas','materials','lesson8','topic','quiz','result','performance','rating','labs','achievements','offline','profile']
export async function restoreAccessView({savedScreen,requestedScreen,get}){
 if(savedScreen==='teacher'){const data=await get('/api/teacher/me');if(data.teacher)return {screen:'teacher'}}
 const me=await get('/api/student/me')
 if(me.student)return studentView(me.student,requestedScreen||savedScreen)
 const pending=await get('/api/student/access/status')
 if(pending.student)return studentView(pending.student)
 if(['PENDING','REJECTED','EXPIRED'].includes(pending.status))return {screen:'pending',request:accessRequest(pending)}
 if(savedScreen==='pending')return {screen:'pending',request:{status:'EXPIRED'}}
 const teacher=await get('/api/teacher/me')
 return {screen:teacher.teacher?'teacher':savedScreen==='student-code'?'student-code':'landing'}
}
function studentView(student,target){
 return {student,screen:studentDestination(student)==='home'?(studentScreens.includes(target)?target:'home'):'avatar-setup'}
}
