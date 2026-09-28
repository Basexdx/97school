'use client'

import { useEffect } from 'react'
import {seasonForMonth} from '../shared/season.mjs'
function currentSeason(){return seasonForMonth(new Date().getMonth())}

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
