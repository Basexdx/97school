'use client'

import { useEffect } from 'react'
import {IS_STANDALONE} from './standalone-mode.mjs'

export default function PwaRegister() {
  useEffect(() => {
    if(IS_STANDALONE)return
    if (!('serviceWorker' in navigator)) return
    const register = () => navigator.serviceWorker.register('/sw.js').catch(() => {})
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])
  return null
}
