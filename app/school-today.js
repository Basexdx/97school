'use client'
import {useEffect,useState} from 'react'
import {schoolToday} from '../shared/academic-calendar.mjs'
export function useSchoolToday(){
 const [today,setToday]=useState(schoolToday)
 useEffect(()=>{const refresh=()=>setToday(schoolToday()),timer=setInterval(refresh,30000);document.addEventListener('visibilitychange',refresh);refresh();return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh)}},[])
 return today
}
