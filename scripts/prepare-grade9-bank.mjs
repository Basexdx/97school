import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import {fileURLToPath} from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source=JSON.parse(fs.readFileSync(path.join(root,'bank/grade9-source.b64.json'),'utf8'))
if(source.encoding!=='gzip+base64'||typeof source.data!=='string')throw Error('Invalid grade 9 source pack')
const tasks=JSON.parse(zlib.gunzipSync(Buffer.from(source.data,'base64')).toString('utf8'))
if(!Array.isArray(tasks)||tasks.length!==source.taskCount||tasks.length!==59)throw Error(`Grade 9 source pack mismatch: ${tasks?.length}`)
fs.writeFileSync(path.join(root,'bank/tasks-grade9.json'),JSON.stringify(tasks,null,2)+'\n')
console.log(`Prepared curated grade 9 bank: ${tasks.length} tasks.`)
