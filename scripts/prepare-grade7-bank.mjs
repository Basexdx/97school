import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import {fileURLToPath} from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const source=JSON.parse(fs.readFileSync(path.join(root,'bank/grade7-source.b64.json'),'utf8'))
const decode=value=>zlib.gunzipSync(Buffer.from(value,'base64')).toString('utf8')
for(const [key,file] of [['tasks','tasks-grade7.json'],['paragraphs','paragraphs-grade7.json'],['analysis','grade7-source-analysis.json']]){
  const out=decode(source[key])
  JSON.parse(out)
  fs.writeFileSync(path.join(root,'bank',file),out.endsWith('\n')?out:out+'\n')
}
console.log('Prepared curated grade 7 bank sources.')
