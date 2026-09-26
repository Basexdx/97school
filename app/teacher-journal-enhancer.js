'use client'

import { useEffect } from 'react'
import { ACADEMIC_YEAR, SCHOOL_BREAKS } from '../shared/academic-calendar.mjs'

const MONTH_ALIASES={янв:0,фев:1,мар:2,апр:3,май:4,мая:4,июн:5,июл:6,авг:7,сен:8,сент:8,окт:9,ноя:10,нояб:10,дек:11}
const WEEKDAYS=['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
const [START_YEAR,END_YEAR]=ACADEMIC_YEAR.split('-').map(Number)

function seasonIcon(){const season=document.documentElement.dataset.season;return season==='winter'?'❄':season==='spring'?'✿':season==='summer'?'☀':'🍂'}
function normalizeMonthToken(value=''){return value.toLowerCase().replaceAll('.','').replaceAll('ё','е')}
function parseLessonLabel(label=''){
  const match=label.trim().match(/(\d{1,2})\s+([а-яё.]+)/i);if(!match)return null
  const token=normalizeMonthToken(match[2]),key=Object.keys(MONTH_ALIASES).find(name=>token.startsWith(name));if(!key)return null
  const month=MONTH_ALIASES[key],year=month>=8?START_YEAR:END_YEAR
  return new Date(Date.UTC(year,month,Number(match[1])))
}
function iso(date){return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`}
function dateFromIso(value){const [y,m,d]=value.split('-').map(Number);return new Date(Date.UTC(y,m-1,d))}
function breakForIso(value){return SCHOOL_BREAKS.find(item=>value>=item.start&&value<=item.end)}
function breakBetween(leftDate,rightDate){const left=iso(leftDate),right=iso(rightDate);return SCHOOL_BREAKS.find(item=>item.start>left&&item.end<right)}
function monthTitle(year,month){const raw=new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month,1)));return raw.charAt(0).toUpperCase()+raw.slice(1)}
function shortRange(item){const f=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',timeZone:'UTC'});return `${f.format(dateFromIso(item.start))}–${f.format(dateFromIso(item.end))}`}
function optionDates(select){return [...select.options].map(option=>({option,date:parseLessonLabel(option.textContent)})).filter(x=>x.date)}
function dispatchSelect(select,option){if(!option)return;select.value=option.value;select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}))}

function ensureAverage(page){
  const analytics=page.querySelector('[class*="classAnalytics"]'),metrics=page.querySelector('[class*="teacherMetrics"]');if(!analytics||!metrics)return
  const avg=metrics.querySelector('article strong')?.textContent?.trim()||'—';let card=analytics.querySelector('.cg-class-average')
  if(!card){card=document.createElement('div');card.className='cg-class-average';analytics.querySelector('h2')?.insertAdjacentElement('afterend',card)}
  const html=`<span>Средний балл по классу</span><strong>${avg}</strong><small>по всем оценкам в журнале</small>`;if(card.innerHTML!==html)card.innerHTML=html
}
function ensureMedals(page){
  const analytics=page.querySelector('[class*="classAnalytics"]');if(!analytics)return
  const topGroup=[...analytics.querySelectorAll(':scope > div')].find(group=>/Лучшие результаты/i.test(group.textContent||''));if(!topGroup)return
  const medals=['🥇','🥈','🥉'];topGroup.querySelectorAll('p').forEach((row,index)=>{const badge=row.querySelector('span');if(!badge||index>2)return;badge.classList.add('cg-medal');badge.dataset.place=String(index+1);if(badge.textContent!==medals[index])badge.textContent=medals[index]})
}
function enhanceBreakColumns(page){
  const table=page.querySelector('[class*="gradebookWrap"] table');if(!table)return
  const header=table.tHead?.rows?.[0];if(!header)return
  const lessonHeaders=[...header.cells].filter(cell=>!cell.dataset.cgBreakCell&&cell.querySelector('b')).map(cell=>({cell,date:parseLessonLabel(cell.querySelector('b')?.textContent||'')})).filter(x=>x.date);if(lessonHeaders.length<2)return
  const gaps=[];for(let i=0;i<lessonHeaders.length-1;i++){const item=breakBetween(lessonHeaders[i].date,lessonHeaders[i+1].date);if(item)gaps.push({leftIndex:i,item,rightCell:lessonHeaders[i+1].cell})}
  const signature=`${document.documentElement.dataset.season||'autumn'}:${lessonHeaders.map(x=>iso(x.date)).join('|')}`
  const expected=gaps.length*(1+(table.tBodies[0]?.rows.length||0));if(table.dataset.cgBreakSignature===signature&&table.querySelectorAll('[data-cg-break-cell]').length===expected)return
  table.querySelectorAll('[data-cg-break-cell]').forEach(node=>node.remove());table.dataset.cgBreakSignature=signature
  gaps.reverse().forEach(({leftIndex,item,rightCell})=>{
    const th=document.createElement('th');th.dataset.cgBreakCell='true';th.className='cg-break-column';th.innerHTML=`<b>${shortRange(item)}</b><small>${seasonIcon()} ${item.title.replace(' каникулы','')}</small>`;header.insertBefore(th,rightCell)
    ;[...(table.tBodies[0]?.rows||[])].forEach(row=>{const td=document.createElement('td');td.dataset.cgBreakCell='true';td.className='cg-break-column cg-break-body';td.innerHTML=`<span aria-label="${item.title}" title="${item.title}">${seasonIcon()}</span>`;const targetIndex=leftIndex+2;row.insertBefore(td,row.children[targetIndex]||row.lastElementChild)})
  })
}
function createCalendar(page,editor,select){
  const card=page.querySelector('[class*="gradebookCard"]');if(!card)return
  let button=editor.querySelector('.cg-calendar-button');if(!button){button=document.createElement('button');button.type='button';button.className='cg-calendar-button';button.setAttribute('aria-label','Открыть календарь');button.innerHTML='<span aria-hidden="true">▦</span>';editor.prepend(button)}
  if(button.dataset.cgReady)return;button.dataset.cgReady='1'
  button.addEventListener('click',()=>{
    const existing=card.querySelector('.cg-calendar-popover');if(existing){existing.remove();button.setAttribute('aria-expanded','false');return}
    const parsed=parseLessonLabel(select.selectedOptions[0]?.textContent||'')||new Date(Date.UTC(START_YEAR,8,1));let viewYear=parsed.getUTCFullYear(),viewMonth=parsed.getUTCMonth()
    const popover=document.createElement('div');popover.className='cg-calendar-popover';button.setAttribute('aria-expanded','true');card.appendChild(popover)
    function render(){
      const options=optionDates(select),lessonMap=new Map(options.map(item=>[iso(item.date),item.option])),selectedDate=parseLessonLabel(select.selectedOptions[0]?.textContent||'')
      const days=new Date(Date.UTC(viewYear,viewMonth+1,0)).getUTCDate(),offset=(new Date(Date.UTC(viewYear,viewMonth,1)).getUTCDay()+6)%7
      const leading=Array.from({length:offset},(_,i)=>({date:new Date(Date.UTC(viewYear,viewMonth,1-offset+i)),outside:true})),current=Array.from({length:days},(_,i)=>({date:new Date(Date.UTC(viewYear,viewMonth,i+1)),outside:false})),tailCount=(7-((leading.length+current.length)%7))%7,trailing=Array.from({length:tailCount},(_,i)=>({date:new Date(Date.UTC(viewYear,viewMonth+1,i+1)),outside:true})),cells=[...leading,...current,...trailing]
      const monthBreaks=SCHOOL_BREAKS.filter(item=>{const start=dateFromIso(item.start),end=dateFromIso(item.end);return(start.getUTCFullYear()===viewYear&&start.getUTCMonth()===viewMonth)||(end.getUTCFullYear()===viewYear&&end.getUTCMonth()===viewMonth)})
      popover.innerHTML=`<div class="cg-calendar-head"><button type="button" data-dir="-1" aria-label="Предыдущий месяц">‹</button><strong>${monthTitle(viewYear,viewMonth)}</strong><button type="button" data-dir="1" aria-label="Следующий месяц">›</button></div>${monthBreaks.length?`<div class="cg-calendar-break">${seasonIcon()} ${monthBreaks.map(x=>`${x.title} · ${shortRange(x)}`).join(' · ')}</div>`:''}<div class="cg-calendar-week">${WEEKDAYS.map(x=>`<span>${x}</span>`).join('')}</div><div class="cg-calendar-grid">${cells.map(({date,outside})=>{const value=iso(date),lesson=lessonMap.has(value),holiday=!!breakForIso(value),selected=selectedDate&&iso(selectedDate)===value,classes=['cg-calendar-day',outside?'outside':'',lesson?'lesson':'',holiday?'holiday':'',selected?'selected':''].filter(Boolean).join(' ');return `<button type="button" class="${classes}" data-date="${value}" ${outside?'tabindex="-1"':''}><span>${date.getUTCDate()}</span>${lesson?'<i></i>':''}${holiday?`<em>${seasonIcon()}</em>`:''}</button>`}).join('')}</div><div class="cg-calendar-legend"><span><i class="lesson-dot"></i>есть уроки</span><span><i class="empty-dot"></i>нет уроков</span><span><i class="holiday-dot"></i>каникулы</span></div>`
      popover.querySelectorAll('[data-dir]').forEach(nav=>nav.addEventListener('click',()=>{viewMonth+=Number(nav.dataset.dir);if(viewMonth<0){viewMonth=11;viewYear--}if(viewMonth>11){viewMonth=0;viewYear++}render()}))
      popover.querySelectorAll('[data-date]').forEach(day=>day.addEventListener('click',()=>{const option=lessonMap.get(day.dataset.date);if(option){dispatchSelect(select,option);popover.remove();button.setAttribute('aria-expanded','false')}}))
    }
    render()
  })
}
function ensureBreakBanner(page,select){
  const card=page.querySelector('[class*="gradebookCard"]'),wrap=page.querySelector('[class*="gradebookWrap"]');if(!card||!wrap)return
  let banner=card.querySelector('.cg-break-banner');const dates=optionDates(select).map(x=>x.date).sort((a,b)=>a-b);if(dates.length<2){banner?.remove();return}
  const active=SCHOOL_BREAKS.find(item=>{const start=dateFromIso(item.start),end=dateFromIso(item.end);return start>=dates[0]&&end<=dates[dates.length-1]});if(!active){banner?.remove();return}
  if(!banner){banner=document.createElement('div');banner.className='cg-break-banner';wrap.insertAdjacentElement('beforebegin',banner)}
  const html=`<span>${seasonIcon()}</span><strong>${active.title}</strong><small>${shortRange(active)}</small>`;if(banner.innerHTML!==html)banner.innerHTML=html
}
function enhanceTeacherJournal(page){
  ensureAverage(page);ensureMedals(page)
  const editor=page.querySelector('[class*="lessonEditor"]'),select=editor?.querySelector('select');if(editor&&select){createCalendar(page,editor,select);if(!select.dataset.cgWatch){select.dataset.cgWatch='1';select.addEventListener('change',()=>requestAnimationFrame(()=>enhanceTeacherJournal(page)))}}
}
export default function TeacherJournalEnhancer(){
  useEffect(()=>{let frame=0;const run=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>document.querySelectorAll('[class*="teacherPage"]').forEach(enhanceTeacherJournal))};run();const observer=new MutationObserver(run);observer.observe(document.body,{childList:true,subtree:true});return()=>{cancelAnimationFrame(frame);observer.disconnect()}},[])
  return null
}
