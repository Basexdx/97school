// Curves are opt-in: straight and piecewise-linear physics graphs keep their corners.
const point=(x,y,X,Y)=>`${X(x)},${Y(y)}`

function monotoneSlopes(points){
  const h=points.slice(1).map((p,i)=>p[0]-points[i][0])
  if(h.some(v=>v<=0))throw Error('A smooth graph requires increasing x coordinates')
  const d=h.map((v,i)=>(points[i+1][1]-points[i][1])/v)
  if(points.length===2)return [d[0],d[0]]
  const endpoint=(a,b,u,v)=>{const m=((2*a+b)*u-a*v)/(a+b);return m*u<=0?0:u*v<0&&Math.abs(m)>3*Math.abs(u)?3*u:m}
  return [endpoint(h[0],h[1],d[0],d[1]),...points.slice(1,-1).map((_,j)=>{
    const i=j+1
    if(d[i-1]*d[i]<=0)return 0
    const w1=2*h[i]+h[i-1],w2=h[i]+2*h[i-1]
    return (w1+w2)/(w1/d[i-1]+w2/d[i])
  }),endpoint(h.at(-1),h.at(-2),d.at(-1),d.at(-2))]
}

export function graphSeriesPath(series,X=x=>x,Y=y=>y){
  const points=series.points||[]
  if(!points.length)return ''
  if(series.quadratic){
    const [a,b,c]=series.quadratic,[start,end]=series.domain||[points[0][0],points.at(-1)[0]]
    const value=x=>a*x*x+b*x+c
    // A quadratic Bézier represents the physical parabola exactly at every t.
    const cx=(start+end)/2,cy=value(start)+(2*a*start+b)*(end-start)/2
    return `M${point(start,value(start),X,Y)} Q${point(cx,cy,X,Y)} ${point(end,value(end),X,Y)}`
  }
  const slopes=series.smooth&&points.length>1?monotoneSlopes(points):null
  const ranges=(series.smoothRanges||[]).map(([start,end])=>{
    const subset=points.filter(([x])=>x>=start&&x<=end)
    return {start,end,subset,slopes:monotoneSlopes(subset)}
  })
  return `M${point(...points[0],X,Y)}`+points.slice(1).map(([x,y],j)=>{
    const [px,py]=points[j],range=ranges.find(r=>px>=r.start&&x<=r.end)
    let m0=slopes?.[j],m1=slopes?.[j+1]
    if(range){const k=range.subset.findIndex(p=>p[0]===px);m0=range.slopes[k];m1=range.slopes[k+1]}
    if(m0===undefined)return ` L${point(x,y,X,Y)}`
    const dx=(x-px)/3
    return ` C${point(px+dx,py+m0*dx,X,Y)} ${point(x-dx,y-m1*dx,X,Y)} ${point(x,y,X,Y)}`
  }).join('')
}
