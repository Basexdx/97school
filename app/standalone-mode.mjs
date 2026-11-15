import {studentAvatar} from '../shared/student-avatars.mjs'
export const IS_STANDALONE=process.env.NEXT_PUBLIC_GENIUS_STANDALONE==='1'
export const PROFILE_KEY='genius:local-profile:v1'
export function readLocalProfile(){
 if(typeof localStorage==='undefined')return null
 try{const value=JSON.parse(localStorage.getItem(PROFILE_KEY)||'null');return value&&typeof value.nickname==='string'&&[7,8,9].includes(value.grade)?value:null}catch{return null}
}
export function saveLocalProfile(profile){
 const value={nickname:String(profile.nickname||'Ученик').trim().slice(0,40)||'Ученик',grade:[7,8,9].includes(Number(profile.grade))?Number(profile.grade):8,avatarId:studentAvatar(profile.avatarId)?.id||readLocalProfile()?.avatarId||null}
 localStorage.setItem(PROFILE_KEY,JSON.stringify(value));return value
}
export function localIdentity(){const profile=readLocalProfile()||{nickname:'Ученик',grade:8};return {id:'local-student',...profile,className:'Самостоятельное обучение',status:'ACTIVE'}}
