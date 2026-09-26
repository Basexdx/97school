import {mkdirSync,readFileSync} from 'node:fs'
import {dirname,resolve} from 'node:path'
import {DatabaseSync} from 'node:sqlite'

function normalize(value){
  if(value===undefined)return null
  if(typeof value==='boolean')return value?1:0
  return value
}

function toNumber(value){
  return typeof value==='bigint'&&value<=BigInt(Number.MAX_SAFE_INTEGER)?Number(value):value
}

class D1PreparedStatement{
  constructor(db,sql,params=[]){this.db=db;this.sql=sql;this.params=params.map(normalize)}
  bind(...params){return new D1PreparedStatement(this.db,this.sql,params)}
  _statement(){return this.db.prepare(this.sql)}
  async first(column){
    const row=this._statement().get(...this.params)
    if(row===undefined)return null
    return column===undefined?row:row[column]
  }
  async all(){
    const results=this._statement().all(...this.params)
    return {success:true,results,meta:{rows_read:results.length}}
  }
  async run(){return this._run()}
  _run(){
    const result=this._statement().run(...this.params)
    return {success:true,meta:{changes:toNumber(result.changes),last_row_id:toNumber(result.lastInsertRowid)}}
  }
}

export function createD1Database(databasePath,{schemaDir=resolve(process.cwd(),'cloudflare')}={}){
  mkdirSync(dirname(databasePath),{recursive:true})
  const sqlite=new DatabaseSync(databasePath)
  sqlite.exec('PRAGMA foreign_keys=ON;')
  sqlite.exec('PRAGMA journal_mode=WAL;')
  sqlite.exec('PRAGMA synchronous=NORMAL;')
  sqlite.exec('PRAGMA busy_timeout=5000;')

  for(const file of ['schema.sql','task-bank.sql']){
    sqlite.exec(readFileSync(resolve(schemaDir,file),'utf8'))
  }

  return {
    prepare(sql){return new D1PreparedStatement(sqlite,sql)},
    async batch(statements){
      sqlite.exec('BEGIN IMMEDIATE;')
      try{
        const results=statements.map(statement=>statement._run())
        sqlite.exec('COMMIT;')
        return results
      }catch(error){
        try{sqlite.exec('ROLLBACK;')}catch{}
        throw error
      }
    },
    close(){sqlite.close()},
  }
}
