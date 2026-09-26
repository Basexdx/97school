'use client'

import {useEffect} from 'react'

function replaceTrailingText(button, from, to){
  if(!button)return
  for(const node of button.childNodes){
    if(node.nodeType===Node.TEXT_NODE && node.nodeValue?.includes(from)){
      node.nodeValue=node.nodeValue.replace(from,to)
      return
    }
  }
}

export default function CosmoUiCleanup(){
  useEffect(()=>{
    let frame=0
    const apply=()=>{
      frame=0

      document.documentElement.classList.add('cosmo-genius-restored')

      for(const sidebar of document.querySelectorAll('.sidebar-light')){
        const nav=sidebar.querySelector('nav')
        if(!nav)continue
        const text=nav.textContent||''
        const teacher=/Мои классы|Дневник и ДЗ|Ключи доступа|Запросы/.test(text)
        sidebar.classList.toggle('genius-teacher-sidebar',teacher)
        sidebar.classList.toggle('genius-student-sidebar',!teacher&&/Главная|Задачник|Учебник/.test(text))

        for(const button of nav.querySelectorAll('.genius-ref-nav')){
          if(teacher){
            button.hidden=true
            button.setAttribute('aria-hidden','true')
            button.tabIndex=-1
          }else{
            button.hidden=false
            button.removeAttribute('aria-hidden')
            button.removeAttribute('tabindex')
            replaceTrailingText(button,'Постоянные величины','Справочные величины')
          }
        }
      }

      for(const heading of document.querySelectorAll('.genius-reference-page .genius-reference-hero h1')){
        if(heading.textContent?.trim()==='Постоянные величины')heading.textContent='Справочные величины'
      }
    }

    const schedule=()=>{
      if(frame)return
      frame=requestAnimationFrame(apply)
    }
    const observer=new MutationObserver(schedule)
    observer.observe(document.body,{childList:true,subtree:true})
    schedule()
    return()=>{observer.disconnect();if(frame)cancelAnimationFrame(frame)}
  },[])
  return null
}
