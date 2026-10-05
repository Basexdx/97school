// Original approved artwork: six portraits per sheet, ordered left to right, top to bottom.
const centers={boys:[[301,300],[720,300],[1147,300],[297,727],[724,727],[1148,727]],girls:[[267,284],[723,284],[1183,284],[264,748],[723,748],[1185,748]]}
export const studentAvatars=Array.from({length:12},(_,index)=>{
 const group=index<6?'boys':'girls',number=index%6+1
 const id=`avatar_${group==='boys'?'boy':'girl'}_${String(number).padStart(2,'0')}`
 const [x,y]=centers[group][number-1],radius=group==='boys'?207:210
 return {id,group,src:`/avatars/${group}.png`,label:`Аватар ${number}`,viewBox:`${x-radius} ${y-radius} ${radius*2} ${radius*2}`}
})
export const studentAvatar=id=>studentAvatars.find(avatar=>avatar.id===id)||null
export function studentDestination(student){return student?.profileSetupCompleted&&studentAvatar(student.avatarId)?'home':'avatar-setup'}
