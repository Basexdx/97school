export const AUTH_KEY='genius:local-auth:v1',SESSION_KEY='genius:local-auth-session:v1'
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')
function bytes(value){return new Uint8Array(value.match(/.{2}/g).map(v=>parseInt(v,16)))}
async function derive(password,salt,iterations){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations},key,256))}
export function hasLocalPassword(){try{const auth=JSON.parse(localStorage.getItem(AUTH_KEY)||'null');return !!(auth?.salt&&auth?.hash&&auth.iterations===120000)}catch{return false}}
export function localSessionOpen(){return typeof sessionStorage!=='undefined'&&sessionStorage.getItem(SESSION_KEY)==='1'}
// Password entry is temporarily disabled in the standalone UI. Keep any
// existing hash intact so it can be used again if password entry returns.
export function beginPasswordlessSession(){sessionStorage.setItem(SESSION_KEY,'1')}
export async function setLocalPassword(password){if(password.length<4)throw Error('Пароль должен содержать не менее 4 символов.');const salt=crypto.getRandomValues(new Uint8Array(16)),iterations=120000,hash=await derive(password,salt,iterations);localStorage.setItem(AUTH_KEY,JSON.stringify({salt:hex(salt),hash,iterations}));sessionStorage.setItem(SESSION_KEY,'1')}
export async function unlockLocalProfile(password){const auth=JSON.parse(localStorage.getItem(AUTH_KEY)||'null');if(!auth||await derive(password,bytes(auth.salt),auth.iterations)!==auth.hash)return false;sessionStorage.setItem(SESSION_KEY,'1');return true}
export function lockLocalProfile(){sessionStorage.removeItem(SESSION_KEY)}
