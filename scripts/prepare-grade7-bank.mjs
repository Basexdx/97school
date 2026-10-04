import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import {fileURLToPath} from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const source=JSON.parse(fs.readFileSync(path.join(root,'bank/grade7-source.b64.json'),'utf8'))
const decode=value=>zlib.gunzipSync(Buffer.from(value,'base64')).toString('utf8')
for(const [key,file] of [['tasks','tasks-grade7.json'],['paragraphs','paragraphs-grade7.json'],['analysis','grade7-source-analysis.json']]){
  const out=decode(source[key])
  const data=JSON.parse(out)
  if(key==='tasks'){
    for(const task of data)if(['genius-peryshkin7-158','genius-peryshkin7-160'].includes(task.ID))task.DIAGRAM.smooth=true
    fs.writeFileSync(path.join(root,'bank',file),JSON.stringify(data,null,2)+'\n')
    continue
  }
  fs.writeFileSync(path.join(root,'bank',file),out.endsWith('\n')?out:out+'\n')
}
console.log('Prepared curated grade 7 bank sources.')
