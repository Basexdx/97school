import {writeFileSync} from 'node:fs'
if(process.env.GENIUS_STATIC_BUILD==='1'){
 const origin=(process.env.NEXT_PUBLIC_GENIUS_API_ORIGIN||'').replace(/\/$/,'')
 if(origin&&new URL(origin).protocol!=='https:')throw new Error('Native API origin must use HTTPS')
 writeFileSync('out/native-api.json',JSON.stringify({origin}))
}
