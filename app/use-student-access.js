'use client'
import {useEffect,useRef,useState} from 'react'
import {accessApi,accessRequest,restoreAccessView,studentScreens} from './access-api.mjs'
import {studentDestination} from '../shared/student-avatars.mjs'
export default function useStudentAccess(){
 const [screen,setCurrentScreen]=useState('loading'),[student,setStudent]=useState(null),[request,setRequest]=useState(null),[error,setError]=useState(''),[entryRole,setEntryRole]=useState(null),[boot,setBoot]=useState(0),[ready,setReady]=useState(false)
 const history=useRef([]),current=useRef('loading')
 function navigate(target,{reset=false}={}){if(reset)history.current=[];else if(current.current!==target)history.current.push({screen:current.current,scrollY:window.scrollY});current.current=target;setCurrentScreen(target);window.scrollTo(0,0)}
 function accept(data,target){setStudent(data);navigate(studentDestination(data)==='home'?(studentScreens.includes(target)?target:'home'):'avatar-setup',{reset:true})}
 useEffect(()=>{
  const controller=new AbortController();let active=true;setReady(false);setError('')
  const get=async path=>{try{return await accessApi(path,{signal:controller.signal})}catch(e){if(e.status===401)return e.data;throw e}}
  async function restore(){
   let saved=null;try{saved=JSON.parse(sessionStorage.getItem('genius:view:v1')||'null')}catch{}
   const view=await restoreAccessView({savedScreen:saved?.screen,requestedScreen:new URLSearchParams(window.location.search).get('screen'),get})
   if(!active)return
   setStudent(view.student||null);setRequest(view.request||null);navigate(view.screen,{reset:true})
  }
  restore().catch(e=>{if(active&&e.name!=='AbortError'){setError(e.message);navigate('loading',{reset:true})}}).finally(()=>{if(active)setReady(true)})
  return()=>{active=false;controller.abort()}
 },[boot])
 useEffect(()=>{if(!ready||screen==='loading')return;try{sessionStorage.setItem('genius:view:v1',JSON.stringify({screen}))}catch{}},[ready,screen])
 useEffect(()=>{
  if(screen!=='pending'||request?.status!=='PENDING')return
  let active=true,timer;const controller=new AbortController()
  async function poll(){try{const data=await accessApi('/api/student/access/status',{signal:controller.signal});if(!active)return;setError('');if(data.student){accept(data.student);return}setRequest(previous=>({...previous,...data,...(data.requestId?accessRequest(data):{})}))}catch(e){if(!active)return;if(e.status===401){setRequest(previous=>({...previous,status:'EXPIRED'}));return}if(e.name!=='AbortError')setError(e.message)}if(active)timer=setTimeout(poll,3000)}
  poll();return()=>{active=false;clearTimeout(timer);controller.abort()}
 },[screen,request?.status])
 async function startStudent(){setError('');navigate('loading',{reset:true});try{const me=await accessApi('/api/student/me').catch(e=>{if(e.status===401)return {};throw e});if(me.student){accept(me.student);return}const pending=await accessApi('/api/student/access/status').catch(e=>{if(e.status===401)return {};throw e});if(pending.student){accept(pending.student);return}if(pending.status==='PENDING'){setRequest(accessRequest(pending));navigate('pending',{reset:true});return}navigate('student-code',{reset:true})}catch(e){setError(e.message);navigate('student-code',{reset:true})}}
 async function submitCode(code){const data=await accessApi('/api/student/access/request',{body:{code:code.trim().toUpperCase()}});setRequest(accessRequest(data));setError('');navigate('pending',{reset:true})}
 async function teacherLogin({secret}){await accessApi('/api/teacher/login',{body:{secret}});setEntryRole(null);navigate('teacher',{reset:true})}
 async function saveAvatar(avatarId){try{const data=await accessApi('/api/student/profile',{body:{avatarId}});setStudent(data.student);navigate(screen==='avatar-edit'?'profile':'avatar-done',{reset:true})}catch(e){if(e.status===401){setStudent(null);setError(e.message);navigate('student-code',{reset:true})}throw e}}
 async function logout(){try{await accessApi(screen==='teacher'?'/api/teacher/logout':'/api/student/logout',{body:{}});setStudent(null);setRequest(null);setEntryRole(null);setError('');navigate('landing',{reset:true})}catch(e){setError(e.message)}}
 function goBack(){const previous=history.current.pop();if(!previous||!studentScreens.includes(previous.screen)){navigate('home',{reset:true});return}current.current=previous.screen;setCurrentScreen(previous.screen);requestAnimationFrame(()=>window.scrollTo(0,previous.scrollY))}
 return {screen,student,request,error,entryRole,setEntryRole,ready,navigate,goBack,startStudent,submitCode,teacherLogin,saveAvatar,logout,retry:()=>setBoot(value=>value+1)}
}
