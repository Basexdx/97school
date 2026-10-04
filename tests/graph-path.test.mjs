import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {graphSeriesPath} from '../shared/graph-path.mjs'
import {ogeTasks} from '../app/oge-task-data.mjs'

const numbers=path=>path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number)
const bezier=(a,b,c,d,t)=>(1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d

test('physical parabolas are exact at anchors, peak and landing, including scaled SVG coordinates',()=>{
 for(const no of [25289,32459,25368]){
  const task=ogeTasks.find(t=>t.sourceNo===no),s=task.diagram.series[0]
  const [a,b,c]=s.quadratic,[start,end]=s.domain||[s.points[0][0],s.points.at(-1)[0]]
  const X=x=>82+94*x,Y=y=>288-4*y,path=graphSeriesPath(s,X,Y)
  assert.match(path,/ Q/);assert.doesNotMatch(path,/ L| C/)
  const [x0,y0,cx,cy,x1,y1]=numbers(path)
  for(let i=0;i<=100;i++){
   const u=i/100,x=start+(end-start)*u
   const px=(1-u)**2*x0+2*(1-u)*u*cx+u*u*x1,py=(1-u)**2*y0+2*(1-u)*u*cy+u*u*y1
   assert.ok(Math.abs(px-X(x))<1e-9)
   assert.ok(Math.abs(py-Y(a*x*x+b*x+c))<1e-9)
  }
  for(const [x,y] of s.points)assert.ok(Math.abs(y-(a*x*x+b*x+c))<1e-9)
 }
 for(const no of [25289,32459]){const s=ogeTasks.find(t=>t.sourceNo===no).diagram.series[0];assert.equal(s.points[3][1],55);assert.equal(s.points.at(-1)[1],10);assert.ok(Math.abs(-5*s.domain[1]**2+30*s.domain[1]+10)<1e-9)}
})

test('monotone curves pass through every anchor, have continuous tangents, preserve plateaus and never overshoot',()=>{
 for(const points of [[[0,0],[1,8],[2,13],[3,15],[4,16],[5,18],[6,23],[7,31],[8,40]],[[0,4],[1,2],[2,2],[4,0]],[[100,2000],[104,2800],[105,2880],[106,2900],[110,2900]],[[0,0],[.2,1],[1,0],[3,-1],[4,0]]]){
  const path=graphSeriesPath({points,smooth:true}),v=numbers(path),segments=[]
  assert.equal((path.match(/ C/g)||[]).length,points.length-1)
  for(let i=0;i<points.length-1;i++){
   const [x0,y0]=points[i],[c1x,c1y,c2x,c2y,x1,y1]=v.slice(2+i*6,8+i*6);segments.push({x0,y0,c1x,c1y,c2x,c2y,x1,y1})
   assert.deepEqual([x1,y1],points[i+1])
   for(let j=0;j<=100;j++){const t=j/100,y=bezier(y0,c1y,c2y,y1,t),x=bezier(x0,c1x,c2x,x1,t);assert.ok(y>=Math.min(y0,y1)-1e-8&&y<=Math.max(y0,y1)+1e-8);assert.ok(x>=x0&&x<=x1)}
  }
  for(let i=1;i<segments.length;i++){const l=segments[i-1],r=segments[i];assert.ok(Math.abs((l.y1-l.c2y)/(l.x1-l.c2x)-(r.c1y-r.y0)/(r.c1x-r.x0))<1e-8)}
 }
})

test('stops, constant acceleration speed graphs and phase change corners stay straight by default',()=>{
 for(const t of ogeTasks.filter(t=>t.diagram?.kind==='graph'))for(const s of t.diagram.series){if(!s.smooth&&!s.quadratic){const path=graphSeriesPath(s);assert.doesNotMatch(path,/ C| Q/);assert.equal((path.match(/ L/g)||[]).length,s.points.length-1)}}
 const graph=JSON.parse(fs.readFileSync(new URL('../bank/tasks.json',import.meta.url))).find(t=>t.ID==='genius-peryshkin-839').DIAGRAM
 const path=graphSeriesPath(graph)
 assert.match(path,/ C/);assert.match(path,/ L5,80 L6,80 L7,80/);assert.match(path,/ L14,80 L15,80 L16,80 L17,80 L18,80/)
})
