import http from 'node:http'
import {resolve} from 'node:path'
import worker from '../worker/src/index.js'
import {createD1Database} from './sqlite-d1.mjs'

const PORT=Number(process.env.PORT||8787)
const HOST=process.env.HOST||'0.0.0.0'
const DB_PATH=process.env.DB_PATH||'/data/genius.db'
const SCHEMA_DIR=process.env.GENIUS_SCHEMA_DIR||resolve(process.cwd(),'cloudflare')
const MAX_BODY_BYTES=1_000_000

for(const name of ['TEACHER_ACCESS_SECRET','RATE_LIMIT_SECRET']){
  if(!process.env[name]){
    console.error(`[genius-api] Missing required environment variable: ${name}`)
    process.exit(1)
  }
}

const DB=createD1Database(DB_PATH,{schemaDir:SCHEMA_DIR})
const env={
  DB,
  TEACHER_ID:process.env.TEACHER_ID||'teacher_01',
  TEACHER_ACCESS_SECRET:process.env.TEACHER_ACCESS_SECRET,
  RATE_LIMIT_SECRET:process.env.RATE_LIMIT_SECRET,
  PENDING_TTL_MINUTES:process.env.PENDING_TTL_MINUTES||'15',
  STUDENT_SESSION_DAYS:process.env.STUDENT_SESSION_DAYS||'30',
  TEACHER_SESSION_HOURS:process.env.TEACHER_SESSION_HOURS||'12',
}

function firstHeader(value){
  if(Array.isArray(value))return value[0]||''
  return String(value||'').split(',')[0].trim()
}

function requestUrl(req){
  const forwardedProto=firstHeader(req.headers['x-forwarded-proto'])
  const protocol=forwardedProto||'http'
  const host=firstHeader(req.headers['x-forwarded-host'])||req.headers.host||'localhost'
  return `${protocol}://${host}${req.url||'/'}`
}

function requestHeaders(req){
  const headers=new Headers()
  for(const [key,value] of Object.entries(req.headers)){
    if(value===undefined)continue
    if(Array.isArray(value))for(const item of value)headers.append(key,item)
    else headers.set(key,value)
  }
  return headers
}

async function readBody(req){
  if(req.method==='GET'||req.method==='HEAD')return undefined
  const chunks=[]
  let size=0
  for await(const chunk of req){
    size+=chunk.length
    if(size>MAX_BODY_BYTES)throw Object.assign(new Error('payload_too_large'),{statusCode:413})
    chunks.push(chunk)
  }
  return chunks.length?Buffer.concat(chunks):undefined
}

async function writeResponse(res,response){
  res.statusCode=response.status
  for(const [name,value] of response.headers){
    if(name.toLowerCase()!=='set-cookie')res.setHeader(name,value)
  }
  const setCookies=response.headers.getSetCookie?.()||[]
  if(setCookies.length)res.setHeader('set-cookie',setCookies)
  else{
    const cookie=response.headers.get('set-cookie')
    if(cookie)res.setHeader('set-cookie',cookie)
  }
  if(response.body===null){res.end();return}
  res.end(Buffer.from(await response.arrayBuffer()))
}

const server=http.createServer(async(req,res)=>{
  try{
    const body=await readBody(req)
    const request=new Request(requestUrl(req),{
      method:req.method,
      headers:requestHeaders(req),
      body,
    })
    const response=await worker.fetch(request,env)
    await writeResponse(res,response)
  }catch(error){
    console.error('[genius-api]',error)
    const status=Number(error?.statusCode)||500
    res.statusCode=status
    res.setHeader('content-type','application/json; charset=utf-8')
    res.end(JSON.stringify({error:status===413?'payload_too_large':'internal_error'}))
  }
})

server.listen(PORT,HOST,()=>{
  console.log(`[genius-api] listening on http://${HOST}:${PORT}`)
  console.log(`[genius-api] sqlite: ${DB_PATH}`)
})

function shutdown(signal){
  console.log(`[genius-api] ${signal}: shutting down`)
  server.close(()=>{
    DB.close()
    process.exit(0)
  })
  setTimeout(()=>process.exit(1),10_000).unref()
}

process.on('SIGTERM',()=>shutdown('SIGTERM'))
process.on('SIGINT',()=>shutdown('SIGINT'))
