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

test('40 XP migration preserves old attempts, awards, progress and foreign keys across repeated startup',async()=>{
 const {DatabaseSync}=await import('node:sqlite'),{readFileSync}=await import('node:fs')
 const dir=mkdtempSync(join(tmpdir(),'genius-xp-migration-')),file=join(dir,'genius.db')
 const old=new DatabaseSync(file)
 old.exec(readFileSync('cloudflare/schema.sql','utf8'))
 old.exec(readFileSync('cloudflare/task-bank.sql','utf8').replace('CHECK(max_xp IN (10,20,30,40))','CHECK(max_xp IN (10,20,30))'))
 old.exec("INSERT INTO students(id,class_id,current_grade) VALUES('migration-pupil','class_9A',9)")
 old.exec("INSERT INTO task_attempts VALUES('migration-pupil','old-attempt','old-event','genius-peryshkin9-1','v','hash','1',1,'CONFIRMED',30,'2026-10-01 12:00:00')")
 old.close()
 for(let i=0;i<2;i++){
  const db=createD1Database(file)
  try{
   assert.equal((await db.prepare("SELECT count(*) AS n FROM task_attempts WHERE attempt_id='old-attempt'").first()).n,1)
   assert.equal((await db.prepare("SELECT amount FROM task_awards WHERE attempt_id='old-attempt'").first()).amount,30)
   assert.equal((await db.prepare("SELECT total_xp FROM class_progress WHERE student_id='migration-pupil' AND grade=9").first()).total_xp,i?70:30)
   assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[])
   if(!i){await db.prepare("INSERT INTO task_attempts VALUES('migration-pupil','new-attempt','new-event','oge-20-12437','v','hash','32',1,'CONFIRMED',40,'2026-10-08 12:00:00')").run();assert.equal((await db.prepare("SELECT amount FROM task_awards WHERE attempt_id='new-attempt'").first()).amount,40)}
  }finally{db.close()}
 }
 rmSync(dir,{recursive:true,force:true})
})
