const http=require('node:http'),https=require('node:https')
// Only the configured Genius API is reachable. HttpOnly cookies remain local to this app partition.
function createApiProxy(origin){
 const upstream=origin?new URL(origin):null
 return (req,res)=>{
  if(!upstream){res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({error:'api_not_configured'}));return}
  const ownOrigin=`http://${req.headers.host}`
  if(req.headers.origin&&req.headers.origin!==ownOrigin){res.writeHead(403);res.end();return}
  const target=new URL(req.url,upstream)
  if(target.origin!==upstream.origin||!target.pathname.startsWith('/api/')){res.writeHead(404);res.end();return}
  const transport=target.protocol==='https:'?https:http
  const headers={...req.headers,host:target.host,'x-forwarded-proto':target.protocol.slice(0,-1),'x-forwarded-host':target.host}
  delete headers.origin;delete headers.referer
  const remote=transport.request(target,{method:req.method,headers},response=>{
   const next={...response.headers,'cache-control':'no-store'}
   // The API connection uses TLS; this hop is exclusively the app's loopback listener.
   if(next['set-cookie'])next['set-cookie']=next['set-cookie'].map(cookie=>cookie.replace(/;\s*Secure/ig,'').replace(/;\s*Domain=[^;]+/ig,''))
   res.writeHead(response.statusCode,next);response.pipe(res)
  })
  remote.setTimeout(30000,()=>remote.destroy(new Error('timeout')))
  remote.on('error',()=>{if(!res.headersSent)res.writeHead(502,{'content-type':'application/json'});res.end(JSON.stringify({error:'api_unavailable'}))})
  req.pipe(remote)
 }
}
module.exports={createApiProxy}
