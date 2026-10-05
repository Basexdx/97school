'use client'

import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import styles from './task-figure-viewer.module.css'

export default function TaskFigureViewer({children,label='Рисунок к задаче'}){
 const [open,setOpen]=useState(false),[zoom,setZoom]=useState(1)
 const dialog=useRef(null),trigger=useRef(null)
 useEffect(()=>{
  if(!open)return
  const element=dialog.current
  element.showModal()
  return()=>{if(element.open)element.close();trigger.current?.focus({preventScroll:true})}
 },[open])
 function show(){setZoom(window.innerWidth<640?2:1);setOpen(true)}
 function close(){setOpen(false)}
 return <div className={styles.frame}>
  <div className={styles.tools}><button ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={show}>⤢ Увеличить</button></div>
  <div className={styles.inline}>{children}</div>
  {open&&createPortal(<dialog ref={dialog} className={styles.dialog} aria-label={label} onCancel={close} onClose={close} onClick={event=>{if(event.target===event.currentTarget)close()}}>
   <header className={styles.header}><strong>{label}</strong><button type="button" autoFocus onClick={close} aria-label="Закрыть рисунок">×</button></header>
   <nav className={styles.zoom} aria-label="Масштаб рисунка"><button type="button" disabled={zoom<=1} onClick={()=>setZoom(value=>Math.max(1,value-.5))} aria-label="Уменьшить рисунок">−</button><output aria-live="polite">{Math.round(zoom*100)}%</output><button type="button" disabled={zoom>=3} onClick={()=>setZoom(value=>Math.min(3,value+.5))} aria-label="Увеличить рисунок">+</button><button type="button" onClick={()=>setZoom(1)}>Вписать в экран</button></nav>
   <div className={styles.scroll} tabIndex={0} aria-label="Рисунок; увеличенное изображение можно прокручивать"><div className={styles.canvas} style={{width:`${zoom*100}%`}}>{children}</div></div>
  </dialog>,document.body)}
 </div>
}
