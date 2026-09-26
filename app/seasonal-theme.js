'use client'

import { useEffect } from 'react'

const SEASONS=['winter','spring','summer','autumn']

function currentSeason(){
  const month=new Date().getMonth()
  return SEASONS[Math.floor(((month+1)%12)/3)]
}

export default function SeasonalTheme(){
  useEffect(()=>{
    const apply=()=>{document.documentElement.dataset.season=currentSeason()}
    apply()
    const timer=window.setInterval(apply,60*60*1000)
    const onVisibility=()=>{if(document.visibilityState==='visible')apply()}
    document.addEventListener('visibilitychange',onVisibility)
    return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisibility)}
  },[])
  return null
}
