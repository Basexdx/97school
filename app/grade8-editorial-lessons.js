'use client'

import {useEffect} from 'react'

const FIRST_EDITORIAL_PARAGRAPH = 1
const LAST_EDITORIAL_PARAGRAPH = 10

export default function Grade8EditorialLessons(){
  useEffect(()=>{
    let queued=false

    const sync=()=>{
      queued=false
      for(const page of document.querySelectorAll('.g8-textbook-page')){
        const mark=page.querySelector('.g8-hero-copy > span')?.textContent||''
        const paragraph=Number(mark.replace(/\D/g,''))
        const editorial=Number.isInteger(paragraph)&&paragraph>=FIRST_EDITORIAL_PARAGRAPH&&paragraph<=LAST_EDITORIAL_PARAGRAPH
        page.classList.toggle('g8-editorial-first10',editorial)
        if(editorial)page.dataset.editorialParagraph=String(paragraph)
        else delete page.dataset.editorialParagraph
      }
    }

    const schedule=()=>{
      if(queued)return
      queued=true
      requestAnimationFrame(sync)
    }

    sync()
    const observer=new MutationObserver(schedule)
    observer.observe(document.body,{childList:true,subtree:true,characterData:true})
    return()=>observer.disconnect()
  },[])

  return null
}
