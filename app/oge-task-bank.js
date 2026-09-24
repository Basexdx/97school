'use client'

import {useEffect,useMemo,useState} from 'react'
import {ogeCounts,ogeTasks} from './oge-task-data.mjs'
import styles from './oge-task-bank.module.css'

const POS_KEY='genius:oge-task-position:v1'
const parseNumber=v=>{const s=String(v??'').trim().replace(',', '.');if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;const n=Number(s);return Number.isFinite(n)?n:null}
const isCorrect=(value,expected)=>{const n=parseNumber(value);return n!==null&&Math.abs(n-expected)<=Math.max(1e-6,Math.abs(expected)*1e-4)}

export default function OgeTaskBank(){
  const [filter,setFilter]=useState('all')
  const [currentId,setCurrentId]=useState(null)
  const [restoreId,setRestoreId]=useState('')
  const filtered=useMemo(()=>filter==='all'?ogeTasks:ogeTasks.filter(t=>t.type===Number(filter)),[filter])
  const current=currentId?ogeTasks.find(t=>t.id===currentId):null
  const pos=current?filtered.findIndex(t=>t.id===current.id):-1

  useEffect(()=>{try{const saved=JSON.parse(sessionStorage.getItem(POS_KEY)||'null');if(saved){setFilter(saved.filter||'all');setRestoreId(saved.taskId||'')}}catch{}},[])
  useEffect(()=>{if(current||!restoreId)return;const id=requestAnimationFrame(()=>requestAnimationFrame(()=>document.getElementById(`oge-tile-${restoreId}`)?.scrollIntoView({block:'center'})));return()=>cancelAnimationFrame(id)},[current,restoreId,filter])
  function remember(id){setRestoreId(id);try{sessionStorage.setItem(POS_KEY,JSON.stringify({filter,taskId:id}))}catch{}}
  function open(id){remember(id);setCurrentId(id)}
  function back(){remember(current?.id||restoreId);setCurrentId(null)}

  if(current)return <OgeTaskDetail task={current} position={pos+1} total={filtered.length} back={back} previous={pos>0?filtered[pos-1]:null} next={pos>=0&&pos<filtered.length-1?filtered[pos+1]:null} navigate={t=>open(t.id)}/>

  return <div className={styles.page}>
    <section className={styles.hero}>
      <div><span className={styles.kicker}>GENIUS · ПОДГОТОВКА К ОГЭ</span><h1>Задачи ОГЭ</h1><p>Отдельный банк заданий формата ОГЭ. Графики и рисунки перерисованы внутри Genius без водяных знаков и лишних элементов страницы.</p><div className={styles.pills}><span>{ogeCounts.total} задач</span><span>Задача 6 ОГЭ · {ogeCounts[6]}</span><span>Задача 7 ОГЭ · {ogeCounts[7]}</span></div></div>
      <div className={styles.heroMark} aria-hidden="true"><i/><i/><i/><b>ОГЭ</b></div>
    </section>
    <div className={styles.filterDock}><div className={styles.filters} role="tablist" aria-label="Тип задания ОГЭ">
      <button className={filter==='all'?styles.active:''} onClick={()=>setFilter('all')}>Все <b>{ogeCounts.total}</b></button>
      <button className={filter==='6'?styles.active:''} onClick={()=>setFilter('6')}>Задача 6 ОГЭ <b>{ogeCounts[6]}</b></button>
      <button className={filter==='7'?styles.active:''} onClick={()=>setFilter('7')}>Задача 7 ОГЭ <b>{ogeCounts[7]}</b></button>
    </div></div>
    <div className={styles.summary}><strong>{filtered.length}</strong> заданий в выбранном разделе</div>
    <section className={styles.grid}>{filtered.map((t,i)=><button id={`oge-tile-${t.id}`} key={t.id} className={`${styles.tile} ${restoreId===t.id?styles.last:''}`} onClick={()=>open(t.id)}><div><span>{t.label}</span><em>№ {t.sourceNo}</em></div><h2>{compact(t.text)}</h2><footer><span>{t.diagram?'График / рисунок':'Числовой ответ'}</span><b>Открыть →</b></footer></button>)}</section>
  </div>
}

function compact(text){return text.length>132?text.slice(0,129).trimEnd()+'…':text}

function OgeTaskDetail({task,position,total,back,previous,next,navigate}){
  const [answer,setAnswer]=useState(''),[state,setState]=useState(null)
  useEffect(()=>{setAnswer('');setState(null)},[task.id])
  function check(e){e.preventDefault();setState(isCorrect(answer,task.answer)?'right':'wrong')}
  return <article className={styles.detail}>
    <nav className={styles.topNav}><button onClick={back}>← К заданиям ОГЭ</button><span>{position} / {total}</span><div><button disabled={!previous} onClick={()=>previous&&navigate(previous)}>←</button><button disabled={!next} onClick={()=>next&&navigate(next)}>→</button></div></nav>
    <header className={styles.taskHead}><div><span className={styles.kicker}>{task.label}</span><h1>№ {task.sourceNo}</h1><div className={styles.pills}><span>ОГЭ по физике</span><span>{task.diagram?'График / рисунок':'Числовой ответ'}</span><span>Без подсказок</span></div></div><div className={styles.sourceBadge}>Задание {task.type}<small>формат ОГЭ</small></div></header>
    <section className={styles.question}><div className={styles.questionLabel}><span>01</span><h2>Условие</h2></div><p>{task.text}</p>{task.diagram&&<OgeDiagram spec={task.diagram}/>}<form onSubmit={check}><label className={styles.answer}><span>Ответ</span><div><input inputMode="decimal" autoComplete="off" value={answer} onChange={e=>{setAnswer(e.target.value);setState(null)}} placeholder="Введите число"/><em>{task.unit}</em></div></label><button className={styles.primary} disabled={parseNumber(answer)===null}>Проверить ответ</button></form>{state&&<div className={`${styles.feedback} ${state==='right'?styles.right:styles.wrong}`}><strong>{state==='right'?'Верно!':'Пока неверно'}</strong><p>{state==='right'?'Ответ совпадает. Можно переходить к следующему заданию.':'Проверь вычисления и ещё раз внимательно считай данные с рисунка.'}</p></div>}</section>
    <footer className={styles.bottomNav}><button disabled={!previous} onClick={()=>previous&&navigate(previous)}>← Предыдущая</button><span>{task.label} · № {task.sourceNo}</span><button disabled={!next} onClick={()=>next&&navigate(next)}>Следующая →</button></footer>
  </article>
}

function OgeDiagram({spec}){
  if(['graph','oscillation','wave','doubleOsc'].includes(spec.kind))return <GraphVisual spec={spec}/>
  if(spec.kind==='timeline')return <Timeline spec={spec}/>
  if(spec.kind==='inclineMarks')return <InclineMarks mode={spec.mode}/>
  if(spec.kind==='route')return <Route spec={spec}/>
  if(spec.kind==='rulers4')return <Rulers4/>
  if(spec.kind==='ruler')return <Ruler spec={spec}/>
  if(spec.kind==='mirror')return <Mirror/>
  if(spec.kind==='pulley')return <Pulley variant={spec.variant}/>
  if(spec.kind==='lever')return <Lever spec={spec}/>
  if(spec.kind==='leverGrid')return <LeverGrid/>
  if(spec.kind==='utube')return <UTube/>
  if(spec.kind==='energyBalls')return <EnergyBalls/>
  if(spec.kind==='buoyancy')return <Buoyancy/>
  if(spec.kind==='table')return <DataTable spec={spec}/>
  return null
}

function GraphVisual({spec}){
  if(spec.kind==='wave')return <WaveGraph spec={spec}/>
  if(spec.kind==='doubleOsc')return <DoubleOsc mode={spec.mode}/>
  if(spec.kind==='oscillation'){
    const xr=spec.xRange||[0,10],amp=spec.amplitude,period=spec.period,phase=spec.phase||0
    const pts=Array.from({length:121},(_,i)=>{const x=xr[0]+(xr[1]-xr[0])*i/120;return[x,amp*Math.sin(2*Math.PI*x/period+phase)]})
    return <GraphVisual spec={{kind:'graph',xLabel:spec.xLabel||(spec.xUnit?`t, ${spec.xUnit}`:'t, c'),yLabel:spec.yLabel||'x, см',xRange:xr,yRange:[-Math.abs(amp)*1.18,Math.abs(amp)*1.18],xTicks:spec.xTicks||[],yTicks:spec.yTicks||[],series:[{mode:'poly',points:pts}],grid:false}}/>
  }
  const W=720,H=350,p={l:82,r:34,t:30,b:62},[xmin,xmax]=spec.xRange,[ymin,ymax]=spec.yRange
  const X=x=>p.l+(x-xmin)/(xmax-xmin)*(W-p.l-p.r),Y=y=>H-p.b-(y-ymin)/(ymax-ymin)*(H-p.t-p.b)
  const poly=points=>points.map(([x,y])=>`${X(x)},${Y(y)}`).join(' ')
  return <div className={styles.visual}><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Перерисованный график к заданию">
    {spec.grid&&Array.from({length:11},(_,i)=><line key={'v'+i} className={styles.gridLine} x1={p.l+(W-p.l-p.r)*i/10} y1={p.t} x2={p.l+(W-p.l-p.r)*i/10} y2={H-p.b}/>)}
    {spec.grid&&Array.from({length:9},(_,i)=><line key={'h'+i} className={styles.gridLine} x1={p.l} y1={p.t+(H-p.t-p.b)*i/8} x2={W-p.r} y2={p.t+(H-p.t-p.b)*i/8}/>)}
    {(spec.guides||[]).map((g,i)=><line key={'g'+i} className={styles.guide} x1={X(g[0])} y1={Y(g[1])} x2={X(g[2])} y2={Y(g[3])}/>)}
    <line className={styles.axis} x1={p.l} y1={Y(Math.max(ymin,Math.min(ymax,0)))} x2={W-p.r+12} y2={Y(Math.max(ymin,Math.min(ymax,0)))} /><line className={styles.axis} x1={p.l} y1={H-p.b+6} x2={p.l} y2={p.t-10}/>
    {(spec.xTicks||[]).map(v=><g key={'x'+v}><line className={styles.tick} x1={X(v)} y1={H-p.b} x2={X(v)} y2={H-p.b+7}/><text className={styles.tickText} x={X(v)} y={H-p.b+28} textAnchor="middle">{fmt(v)}</text></g>)}
    {(spec.yTicks||[]).map(v=><g key={'y'+v}><line className={styles.tick} x1={p.l-7} y1={Y(v)} x2={p.l} y2={Y(v)}/><text className={styles.tickText} x={p.l-13} y={Y(v)+5} textAnchor="end">{fmt(v)}</text></g>)}
    {(spec.series||[]).map((s,i)=><polyline key={i} points={poly(s.points)} className={i?styles.series2:styles.series}/>) }
    {(spec.labels||[]).map(([txt,x,y],i)=><text key={i} className={styles.pointLabel} x={X(x)+8} y={Y(y)-9}>{txt}</text>)}
    <text className={styles.axisLabel} x={W-p.r} y={H-p.b+45} textAnchor="end">{spec.xLabel}</text><text className={styles.axisLabel} x={p.l+5} y={p.t-10}>{spec.yLabel}</text>
  </svg></div>
}
const fmt=v=>String(Number(v.toFixed?.(3)??v)).replace('.',',')

function WaveGraph({spec}){const pts=Array.from({length:121},(_,i)=>{const x=spec.range*i/120;return[x,Math.sin(2*Math.PI*x/spec.period+Math.PI/4)]});return <GraphVisual spec={{kind:'graph',xLabel:spec.xLabel,yLabel:'p, Па',xRange:[0,spec.range],yRange:[-1.8,1.8],xTicks:spec.xTicks,yTicks:[],series:[{mode:'poly',points:pts}],guides:[[0,0,spec.range,0]]}}/>}
function DoubleOsc({mode}){const W=720,H=330,pts=(amp,per,phase=0)=>Array.from({length:151},(_,i)=>{const x=8*i/150,y=amp*Math.sin(2*Math.PI*x/per+phase);return `${65+x/8*610},${165-y/3.5*115}`}).join(' ');return <div className={styles.visual}><svg viewBox={`0 0 ${W} ${H}`}><line className={styles.axis} x1="55" y1="165" x2="690" y2="165"/><line className={styles.axis} x1="65" y1="290" x2="65" y2="35"/>{Array.from({length:9},(_,i)=><line key={i} className={styles.gridLine} x1={65+i*76.25} y1="48" x2={65+i*76.25} y2="282"/>)}{Array.from({length:7},(_,i)=><line key={i} className={styles.gridLine} x1="65" y1={48+i*39} x2="675" y2={48+i*39}/>)}<polyline className={styles.seriesOrange} points={pts(mode==='amp'?3:2,mode==='amp'?8:4,Math.PI/2)}/><polyline className={styles.series2} points={pts(1,mode==='amp'?4:8,0)}/><text className={styles.pointLabel} x="635" y="90">2</text><text className={styles.pointLabelBlue} x="635" y="148">1</text><text className={styles.axisLabel} x="675" y="190">t</text><text className={styles.axisLabel} x="72" y="45">x</text></svg></div>}

function Timeline({spec}){const total=spec.distances.at(-1),X=v=>70+v/total*580;return <div className={styles.visual}><svg viewBox="0 0 720 220"><line className={styles.axis} x1="65" y1="105" x2="655" y2="105"/>{spec.distances.map((v,i)=><circle key={v} className={styles.dot} cx={X(v)} cy="105" r="6"/>)}{spec.times.map((t,i)=><g key={t+i}><text className={styles.segmentNo} x={(X(spec.distances[i])+X(spec.distances[i+1]))/2} y="65" textAnchor="middle">({i+1})</text><text className={styles.tickText} x={(X(spec.distances[i])+X(spec.distances[i+1]))/2} y="145" textAnchor="middle">{t}</text></g>)}</svg></div>}
function InclineMarks({mode}){const timed=mode==='timed';return <div className={styles.visual}><svg viewBox="0 0 720 260"><g transform="translate(70 55) rotate(9 280 70)"><line className={styles.rulerLine} x1="20" y1="90" x2="610" y2="90"/>{Array.from({length:13},(_,i)=><line key={i} className={styles.rulerTick} x1={35+i*43} y1="90" x2={35+i*43} y2={i%2?112:118}/>)}{timed?<><circle className={styles.ball} cx="35" cy="68" r="17"/><circle className={styles.ball} cx="78" cy="68" r="17"/><circle className={styles.ball} cx="207" cy="68" r="17"/>{[1,2,3,4].map((n,i)=><text className={styles.tickText} key={n} x={379+i*43} y="136" textAnchor="middle">{n}</text>)}</>:<><circle className={styles.ball} cx="35" cy="68" r="18"/><circle className={styles.ball} cx="78" cy="68" r="18"/><circle className={styles.ball} cx="207" cy="68" r="18"/><circle className={styles.ball} cx="422" cy="68" r="18"/><text className={styles.tickText} x="36" y="145">5 см</text></>}</g></svg></div>}
function Route({spec}){const X=x=>90+x*95,Y=y=>300-y*65;return <div className={styles.visual}><svg viewBox="0 0 720 360">{Array.from({length:7},(_,i)=><line key={'v'+i} className={styles.gridLine} x1={90+i*95} y1="40" x2={90+i*95} y2="310"/>)}{Array.from({length:5},(_,i)=><line key={'h'+i} className={styles.gridLine} x1="90" y1={310-i*65} x2="660" y2={310-i*65}/>)}<path className={styles.routePath} d={`M ${X(1)} ${Y(.5)} C ${X(1.5)} ${Y(1.5)}, ${X(2.5)} ${Y(1.4)}, ${X(3)} ${Y(1.8)} S ${X(4)} ${Y(3.4)}, ${X(4.4)} ${Y(3.2)} S ${X(4.7)} ${Y(3.1)}, ${X(5)} ${Y(3.5)}`}/><circle className={styles.dot} cx={X(1)} cy={Y(.5)} r="6"/><circle className={styles.dot} cx={X(5)} cy={Y(3.5)} r="6"/><text className={styles.pointLabel} x={X(1)-20} y={Y(.5)-12}>A</text><text className={styles.pointLabel} x={X(5)+10} y={Y(3.5)-10}>B</text><text className={styles.axisLabel} x="655" y="335">x, км</text><text className={styles.axisLabel} x="95" y="35">y, км</text></svg></div>}
function Rulers4(){const rows=[{time:'1 c',dots:[1,2,3,4,5,6,7,8,9,10]},{time:'1 c',dots:[1,3,5,7,9]},{time:'2 c',dots:[1,2,3,4,5,6,7,8,9]},{time:'2 c',dots:[1,3,5,7,9]}];return <div className={styles.visual}><svg viewBox="0 0 720 360">{rows.map((r,j)=><g key={j} transform={`translate(0 ${j*78})`}><text className={styles.tickText} x="45" y="77">{r.time}</text><line className={styles.rulerLine} x1="100" y1="66" x2="650" y2="66"/>{Array.from({length:10},(_,i)=><g key={i}><line className={styles.rulerTick} x1={110+i*55} y1="66" x2={110+i*55} y2="78"/><text className={styles.smallText} x={110+i*55} y="96" textAnchor="middle">{i+1}</text></g>)}{r.dots.map((n,i)=><circle key={i} className={styles.dot} cx={110+(n-1)*55} cy="48" r="5"/>)}<text className={styles.pointLabel} x="675" y="72">{j+1}</text></g>)}</svg></div>}
function Ruler({spec}){const X=n=>75+(n-1)/(spec.max-1)*575;return <div className={styles.visual}><svg viewBox="0 0 720 210"><line className={styles.rulerLine} x1="75" y1="105" x2="650" y2="105"/>{Array.from({length:spec.max},(_,i)=><g key={i}><line className={styles.rulerTick} x1={X(i+1)} y1="105" x2={X(i+1)} y2={i%5===0?128:120}/><text className={styles.smallText} x={X(i+1)} y="148" textAnchor="middle">{i+1}</text></g>)}{spec.points.map(n=><circle className={styles.dot} key={n} cx={X(n)} cy="82" r="6"/>)}<text className={styles.axisLabel} x="666" y="145">см</text></svg></div>}
function Mirror(){return <div className={styles.visual}><svg viewBox="0 0 720 280"><line className={styles.ground} x1="65" y1="220" x2="655" y2="220"/><line className={styles.mirror} x1="560" y1="55" x2="560" y2="220"/><text className={styles.pointLabel} x="574" y="75">З</text><g transform="translate(180 145)"><ellipse className={styles.catBody} cx="55" cy="45" rx="55" ry="27"/><circle className={styles.catBody} cx="112" cy="32" r="23"/><path className={styles.catStroke} d="M5 45 Q-35 20 -10 2"/><path className={styles.catStroke} d="M96 13 l8 -18 10 18 M116 13 l10 -18 8 20"/></g><line className={styles.arrow} x1="300" y1="120" x2="420" y2="120"/><text className={styles.tickText} x="345" y="105">V = 0,2 м/с</text><line className={styles.arrowLeft} x1="545" y1="100" x2="465" y2="100"/><text className={styles.tickText} x="472" y="83">u = 0,05 м/с</text></svg></div>}
function Pulley({variant}){return <div className={styles.visual}><svg viewBox="0 0 720 380"><line className={styles.ceiling} x1="130" y1="48" x2="590" y2="48"/>{variant==='fixed20'?<><circle className={styles.pulley} cx="360" cy="135" r="42"/><path className={styles.rope} d="M318 135 V290 M402 135 V250"/><rect className={styles.load} x="296" y="290" width="44" height="54"/><line className={styles.arrow} x1="402" y1="185" x2="402" y2="260"/><text className={styles.tickText} x="415" y="240">20 Н</text></>:variant==='movable10'||variant==='movable6'||variant==='advantage2'?<MovablePulley variant={variant}/>:<DoublePulley unknownMass={variant==='double20mass'}/>}</svg></div>}
function DoublePulley({unknownMass}){return <g><path className={styles.rope} d="M170 48 V250 A38 38 0 0 0 246 250 V115 A38 38 0 0 1 322 115 V250 A38 38 0 0 0 398 250 V115 A38 38 0 0 1 474 115 V270"/><circle className={styles.pulley} cx="208" cy="250" r="38"/><circle className={styles.pulley} cx="284" cy="115" r="38"/><circle className={styles.pulley} cx="360" cy="250" r="38"/><circle className={styles.pulley} cx="436" cy="115" r="38"/><rect className={styles.load} x="174" y="288" width="68" height="44"/><rect className={styles.load} x="326" y="288" width="68" height="44"/><text className={styles.loadText} x="208" y="317" textAnchor="middle">20 кг</text><text className={styles.loadText} x="360" y="317" textAnchor="middle">20 кг</text>{unknownMass?<><rect className={styles.load} x="448" y="270" width="54" height="44"/><text className={styles.loadText} x="475" y="299" textAnchor="middle">?</text></>:<><line className={styles.arrow} x1="474" y1="205" x2="474" y2="295"/><text className={styles.tickText} x="493" y="260">F</text></>}</g>}
function MovablePulley({variant}){const mass=variant==='movable10'?'10 кг':variant==='movable6'?'6 кг':'';return <g><path className={styles.rope} d="M230 48 V220 A55 55 0 0 0 340 220 V115 A42 42 0 0 1 424 115 V275"/><circle className={styles.pulley} cx="285" cy="220" r="55"/><circle className={styles.pulley} cx="382" cy="115" r="42"/>{variant!=='advantage2'&&<><rect className={styles.load} x="248" y="275" width="74" height="48"/><text className={styles.loadText} x="285" y="306" textAnchor="middle">{mass}</text></>}{variant==='movable6'?<><rect className={styles.load} x="400" y="275" width="50" height="48"/><text className={styles.loadText} x="425" y="306" textAnchor="middle">2</text></>:<><line className={styles.arrow} x1="424" y1="210" x2="424" y2="305"/><text className={styles.tickText} x="443" y="270">F</text></>}</g>}
function Lever({spec}){return <div className={styles.visual}><svg viewBox="0 0 720 250"><line className={styles.lever} x1="110" y1="110" x2="610" y2="110"/><path className={styles.fulcrum} d="M370 110 l-28 55 h56 z"/><line className={styles.force} x1="130" y1="110" x2="130" y2="195"/><line className={styles.force} x1="590" y1="110" x2="590" y2="195"/><text className={styles.tickText} x="95" y="92">A</text><text className={styles.tickText} x="610" y="92">B</text><text className={styles.tickText} x="145" y="185">F₁ = {spec.leftForce} Н</text><text className={styles.tickText} x="505" y="185">F₂ = {spec.rightForce} Н</text>{spec.leftArm&&<text className={styles.smallText} x="250" y="80">l₁ = {spec.leftArm} см</text>}{spec.rightArm&&<text className={styles.smallText} x="440" y="80">l₂ = {spec.rightArm} см</text>}</svg></div>}
function LeverGrid(){return <div className={styles.visual}><svg viewBox="0 0 720 250"><rect className={styles.beam} x="90" y="82" width="540" height="28"/>{Array.from({length:18},(_,i)=><line key={i} className={styles.gridDark} x1={90+i*30} y1="82" x2={90+i*30} y2="110"/>)}<path className={styles.fulcrum} d="M390 110 l-28 55 h56 z"/><line className={styles.hanger} x1="270" y1="110" x2="270" y2="160"/><rect className={styles.load} x="244" y="160" width="52" height="40"/><text className={styles.loadText} x="270" y="187" textAnchor="middle">3 кг</text><line className={styles.hanger} x1="450" y1="110" x2="450" y2="160"/><rect className={styles.load} x="424" y="160" width="52" height="40"/><text className={styles.loadText} x="450" y="187" textAnchor="middle">?</text><text className={styles.pointLabel} x="260" y="70">B</text><text className={styles.pointLabel} x="384" y="70">O</text><text className={styles.pointLabel} x="444" y="70">A</text></svg></div>}
function UTube(){return <div className={styles.visual}><svg viewBox="0 0 720 330"><path className={styles.utubeGlass} d="M250 55 V235 Q250 285 300 285 H420 Q470 285 470 235 V55"/><path className={styles.liquid2} d="M250 225 V235 Q250 285 300 285 H420 Q470 285 470 235 V145 H442 V235 Q442 257 420 257 H300 Q278 257 278 235 V225 Z"/><rect className={styles.liquid1} x="250" y="105" width="28" height="120"/><text className={styles.loadText} x="264" y="172" textAnchor="middle">1</text><text className={styles.loadText} x="456" y="210" textAnchor="middle">2</text>{Array.from({length:10},(_,i)=><line key={i} className={styles.rulerTick} x1="345" y1={78+i*18} x2={375} y2={78+i*18}/>) }<line className={styles.rulerLine} x1="360" y1="55" x2="360" y2="250"/></svg></div>}
function EnergyBalls(){return <div className={styles.visual}><svg viewBox="0 0 720 300"><line className={styles.ground} x1="100" y1="245" x2="620" y2="245"/><circle className={styles.ball} cx="250" cy="70" r="26"/><circle className={styles.ball} cx="500" cy="158" r="22"/><text className={styles.tickText} x="285" y="78">1 · 2m</text><text className={styles.tickText} x="535" y="165">2 · m</text><line className={styles.measure} x1="210" y1="70" x2="210" y2="245"/><text className={styles.pointLabel} x="170" y="165">2h</text><line className={styles.measure} x1="460" y1="158" x2="460" y2="245"/><text className={styles.pointLabel} x="430" y="210">h</text></svg></div>}
function Buoyancy(){return <div className={styles.visual}><svg viewBox="0 0 720 320"><rect className={styles.tank} x="210" y="45" width="300" height="235"/><rect className={styles.waterFill} x="214" y="49" width="292" height="227"/><circle className={styles.subBall} cx="350" cy="125" r="62"/><circle className={styles.subBall} cx="350" cy="235" r="44"/><text className={styles.pointLabel} x="430" y="130">1</text><text className={styles.pointLabel} x="415" y="240">2</text></svg></div>}
function DataTable({spec}){return <div className={styles.dataTable}>{spec.headers.map(h=><b key={h}>{h}</b>)}{spec.values.map((v,i)=><span key={i}>{v}</span>)}</div>}
