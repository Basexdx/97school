import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import {createRequire} from 'node:module'
const {createApiProxy}=createRequire(import.meta.url)('../desktop/api-proxy.cjs')
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(`http://127.0.0.1:${server.address().port}`)))
test('desktop proxy forwards real API cookies, rejects foreign origin and keeps non-API URLs out',async()=>{
 const upstream=http.createServer((req,res)=>{res.setHeader('set-cookie','genius_student=test; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000');res.setHeader('content-type','application/json');res.end(JSON.stringify({cookie:req.headers.cookie||'',path:req.url}))});const upstreamOrigin=await listen(upstream)
 const proxy=http.createServer(createApiProxy(upstreamOrigin)),origin=await listen(proxy)
 try{const response=await fetch(origin+'/api/student/me',{headers:{cookie:'genius_student=test',origin}});assert.equal(response.status,200);assert.equal((await response.json()).cookie,'genius_student=test');assert.match(response.headers.get('set-cookie'),/HttpOnly/);assert.match(response.headers.get('set-cookie'),/Max-Age=2592000/);assert.equal((await fetch(origin+'/api/student/profile',{method:'POST',headers:{origin:'https://foreign.example'}})).status,403);assert.equal((await fetch(origin+'/not-an-api')).status,404)}finally{proxy.close();upstream.close()}
})
