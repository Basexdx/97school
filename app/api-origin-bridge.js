'use client'

import {useEffect} from 'react'

const configuredOrigin=(process.env.NEXT_PUBLIC_GENIUS_API_ORIGIN||'').replace(/\/$/,'')

export default function ApiOriginBridge(){
  useEffect(()=>{
    if(!configuredOrigin||typeof window==='undefined')return
    const originalFetch=window.fetch.bind(window)
    window.fetch=(input,init)=>{
      if(typeof input==='string'&&input.startsWith('/api/'))return originalFetch(`${configuredOrigin}${input}`,init)
      if(input instanceof Request){
        const url=new URL(input.url)
        if(url.origin===window.location.origin&&url.pathname.startsWith('/api/')){
          const next=new Request(`${configuredOrigin}${url.pathname}${url.search}`,input)
          return originalFetch(next,init)
        }
      }
      return originalFetch(input,init)
    }
    return()=>{window.fetch=originalFetch}
  },[])
  return null
}
