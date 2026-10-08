import test from 'node:test'
import assert from 'node:assert/strict'
import {checkOgeAttempt,teacherAnswerLabel} from '../shared/oge-attempts.mjs'
import {schoolToday} from '../shared/academic-calendar.mjs'
import {ogeTasks} from '../app/oge-task-data.mjs'

test('Known OGE keys are accepted by the same server checker for every answer kind',()=>{
 for(const task of ogeTasks){
  if(task.answer==null){assert.deepEqual(checkOgeAttempt(task,[]),{correct:null,reviewRequired:true});continue}
  const answer=Array.isArray(task.answer)?task.answer:String(task.answer)
  assert.equal(checkOgeAttempt(task,answer).correct,true,task.id)
  assert.equal(checkOgeAttempt(task,Array.isArray(answer)?[]:'999999999').correct,false,task.id)
 }
})
test('Teacher correct-answer field supports numeric, ordered, matching, and multipart keys',()=>{
 assert.equal(teacherAnswerLabel({mode:'numeric',value:0}),'0')
 assert.equal(teacherAnswerLabel({mode:'sequence',values:[1,3,2]}),'1, 3, 2')
 assert.equal(teacherAnswerLabel({mode:'parts',parts:[{type:'numeric',value:12},{type:'sequence',values:[2,3]}]}),'12; 2, 3')
 assert.equal(teacherAnswerLabel({mode:'manual'}),'')
})
test('Today rolls over at Moscow midnight, including the year boundary',()=>{
 assert.equal(schoolToday(new Date('2026-10-08T20:59:59Z')),'2026-10-08')
 assert.equal(schoolToday(new Date('2026-10-08T21:00:00Z')),'2026-10-09')
 assert.equal(schoolToday(new Date('2026-12-31T21:00:00Z')),'2027-01-01')
})
