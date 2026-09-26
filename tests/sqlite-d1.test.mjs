import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createD1Database} from '../server/sqlite-d1.mjs'

test('SQLite adapter supports D1 prepare/bind/first/all/run/batch',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'genius-sqlite-'))
  const schemaDir=join(dir,'schema')
  const {mkdirSync}=await import('node:fs')
  mkdirSync(schemaDir)
  writeFileSync(join(schemaDir,'schema.sql'),'CREATE TABLE sample(id TEXT PRIMARY KEY,value INTEGER NOT NULL);')
  writeFileSync(join(schemaDir,'task-bank.sql'),'CREATE TABLE other(id TEXT PRIMARY KEY);')

  const db=createD1Database(join(dir,'genius.db'),{schemaDir})
  try{
    const inserted=await db.prepare('INSERT INTO sample(id,value) VALUES(?,?)').bind('a',1).run()
    assert.equal(inserted.success,true)
    assert.equal(inserted.meta.changes,1)

    const row=await db.prepare('SELECT id,value FROM sample WHERE id=?').bind('a').first()
    assert.deepEqual(row,{id:'a',value:1})

    await db.batch([
      db.prepare('INSERT INTO sample(id,value) VALUES(?,?)').bind('b',2),
      db.prepare('INSERT INTO sample(id,value) VALUES(?,?)').bind('c',3),
    ])
    const rows=await db.prepare('SELECT id,value FROM sample ORDER BY id').all()
    assert.deepEqual(rows.results,[{id:'a',value:1},{id:'b',value:2},{id:'c',value:3}])
  }finally{
    db.close()
    rmSync(dir,{recursive:true,force:true})
  }
})
