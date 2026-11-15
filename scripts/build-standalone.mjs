import {spawnSync} from 'node:child_process'
const npm=process.platform==='win32'?'npm.cmd':'npm'
const result=spawnSync(npm,['run','build'],{stdio:'inherit',shell:process.platform==='win32',env:{...process.env,GENIUS_STATIC_BUILD:'1',NEXT_PUBLIC_GENIUS_STANDALONE:'1',NEXT_PUBLIC_GENIUS_API_ORIGIN:''}})
process.exit(result.status??1)
