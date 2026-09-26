'use client'

import {useCallback,useEffect,useState} from 'react'

const KEY='genius:task-views:v1'

export function useTaskViews(owner){
  const scope=owner||'guest'
  const [viewed,setViewed]=useState(()=>new Set())

  useEffect(()=>{
    try{setViewed(new Set(JSON.parse(localStorage.getItem(`${KEY}:${scope}`)||'[]')))}
    catch{setViewed(new Set())}
  },[scope])

  const markViewed=useCallback(id=>{
    setViewed(previous=>{
      if(previous.has(id))return previous
      const next=new Set(previous);next.add(id)
      try{localStorage.setItem(`${KEY}:${scope}`,JSON.stringify([...next]))}catch{}
      return next
    })
  },[scope])

  return {viewed,markViewed}
}
