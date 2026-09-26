import http from 'node:http'
import {createHash,createHmac,timingSafeEqual} from 'node:crypto'

const HOST=process.env.HOST||'0.0.0.0'
const PORT=Number(process.env.PORT||8790)
const ACCESS_SECRET=String(process.env.PREVIEW_ACCESS_SECRET||'')
const COOKIE_SECRET=String(process.env.PREVIEW_COOKIE_SECRET||'')
const MAX_ATTEMPTS=Math.max(1,Number(process.env.PREVIEW_MAX_ATTEMPTS||5))
const WINDOW_MS=Math.max(1,Number(process.env.PREVIEW_WINDOW_MINUTES||15))*60_000
const BLOCK_MS=Math.max(1,Number(process.env.PREVIEW_BLOCK_MINUTES||30))*60_000
const SESSION_MS=Math.max(1,Number(process.env.PREVIEW_SESSION_HOURS||12))*3_600_000
const COOKIE='genius_preview'
const attempts=new Map()

if(!ACCESS_SECRET||!COOKIE_SECRET){
  console.error('[preview-gate] PREVIEW_ACCESS_SECRET and PREVIEW_COOKIE_SECRET are required')
  process.exit(1)
}

const page=(message='')=>`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Genius — закрытый тест</title><style>body{margin:0;background:#071525;color:#f7f8fa;font-family:system-ui,-apple-system,Segoe UI,sans-serif;display:grid;place-items:center;min-height:100vh}.card{width:min(420px,calc(100% - 40px));background:#0d2033;border:1px solid #284158;border-radius:20px;padding:28px;box-shadow:0 22px 70px #0008}h1{margin:0 0 8px;font-size:28px}p{color:#a9bbcc;line-height:1.45}.err{color:#ff9c9c}input{box-sizing:border-box;width:100%;padding:14px 15px;border-radius:12px;border:1px solid #38546d;background:#071525;color:white;font-size:16px;margin:12px 0}button{width:100%;padding:13px;border:0;border-radius:12px;background:#ffb02e;color:#15110a;font-weight:750;font-size:16px;cursor:pointer}.small{font-size:13px}</style></head><body><main class="card"><h1>Genius</h1><p>Платформа пока находится в закрытом тестировании.</p>${message?`<p class="err">${message}</p>`:''}<form method="post" action="/_preview/login"><input type="password" name="password" autocomplete="current-password" placeholder="Временный пароль" required autofocus><button type="submit">Войти</button></form><p class="small">Доступ только для участников тестирования.</p></main></body></html>`

function sha(value){return createHash('sha256').update(String(value)).digest()}
function sameSecret(a,b){return timingSafeEqual(sha(a),sha(b))}
function sign(payload){return createHmac('sha256',COOKIE_SECRET).update(payload).digest('base64url')}
function makeToken(){const payload=Buffer.from(JSON.stringify({exp:Date.now()+SESSION_MS})).toString('base64url');return `${payload}.${sign(payload)}`}
function validToken(token){
  if(!token||!token.includes('.'))return false
  const [payload,signature]=token.split('.',2)
  const expected=sign(payload)
  if(signature.length!==expected.length)return false
  if(!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return false
  try{return Number(JSON.parse(Buffer.from(payload,'base64url').toString('utf8')).exp)>Date.now()}catch{return false}
}
function getCookie(req,name){
  for(const part of String(req.headers.cookie||'').split(';')){
    const [key,...rest]=part.trim().split('=')
    if(key===name)return decodeURIComponent(rest.join('='))
  }
  return ''
}
function sourceIp(req){return String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim()}
function isHttps(req){return String(req.headers['x-forwarded-proto']||'').split(',')[0].trim()==='https'}
function authCookie(req){return `${COOKIE}=${encodeURIComponent(makeToken())}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(SESSION_MS/1000)}${isHttps(req)?'; Secure':''}`}
function responseHeaders(extra={}){return {'cache-control':'no-store','x-robots-tag':'noindex, nofollow, noarchive, nosnippet, noimageindex',...extra}}
function sendHtml(res,status,body){res.writeHead(status,responseHeaders({'content-type':'text/html; charset=utf-8'}));res.end(body)}
function stateFor(ip){
  const now=Date.now(),state=attempts.get(ip)
  if(!state)return {count:0,windowStart:now,blockedUntil:0}
  if(state.blockedUntil>now)return state
  if(now-state.windowStart>=WINDOW_MS){attempts.delete(ip);return {count:0,windowStart:now,blockedUntil:0}}
  return state
}
function failed(ip){
  const now=Date.now(),state=stateFor(ip)
  state.count+=1
  if(state.count>=MAX_ATTEMPTS)state.blockedUntil=now+BLOCK_MS
  attempts.set(ip,state)
  return state
}
function minutes(ms){return Math.max(1,Math.ceil(ms/60_000))}

const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`)
    const ip=sourceIp(req)

    if(url.pathname==='/_preview/health'){
      res.writeHead(204,responseHeaders())
      res.end()
      return
    }

    if(url.pathname==='/_preview/check'){
      if(validToken(getCookie(req,COOKIE))){
        res.writeHead(204,responseHeaders())
      }else{
        res.writeHead(302,responseHeaders({location:'/_preview/login'}))
      }
      res.end()
      return
    }

    if(url.pathname==='/_preview/login'&&req.method==='GET'){
      const state=stateFor(ip)
      const message=state.blockedUntil>Date.now()?`Слишком много попыток. Повторите примерно через ${minutes(state.blockedUntil-Date.now())} мин.`:''
      sendHtml(res,200,page(message))
      return
    }

    if(url.pathname==='/_preview/login'&&req.method==='POST'){
      const state=stateFor(ip)
      if(state.blockedUntil>Date.now()){
        sendHtml(res,429,page(`Слишком много попыток. Повторите примерно через ${minutes(state.blockedUntil-Date.now())} мин.`))
        return
      }
      const chunks=[]
      let size=0
      for await(const chunk of req){
        size+=chunk.length
        if(size>8192){res.writeHead(413,responseHeaders());res.end();return}
        chunks.push(chunk)
      }
      const form=new URLSearchParams(Buffer.concat(chunks).toString('utf8'))
      const provided=String(form.get('password')||'')
      if(!sameSecret(provided,ACCESS_SECRET)){
        const next=failed(ip)
        const left=Math.max(0,MAX_ATTEMPTS-next.count)
        const message=next.blockedUntil>Date.now()?`Слишком много попыток. Вход заблокирован на ${minutes(BLOCK_MS)} мин.`:`Неверный пароль. Осталось попыток: ${left}.`
        sendHtml(res,next.blockedUntil>Date.now()?429:401,page(message))
        return
      }
      attempts.delete(ip)
      res.writeHead(303,responseHeaders({'set-cookie':authCookie(req),location:'/'}))
      res.end()
      return
    }

    res.writeHead(404,responseHeaders({'content-type':'text/plain; charset=utf-8'}))
    res.end('Not found')
  }catch(error){
    console.error('[preview-gate]',error)
    res.writeHead(500,responseHeaders({'content-type':'text/plain; charset=utf-8'}))
    res.end('Internal error')
  }
})

server.listen(PORT,HOST,()=>console.log(`[preview-gate] listening on http://${HOST}:${PORT}`))
