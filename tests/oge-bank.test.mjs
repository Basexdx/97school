import test from 'node:test'
import assert from 'node:assert/strict'
import {ogeCounts,ogeTasks} from '../app/oge-task-data.mjs'

test('OGE bank imports task 6 and task 7 source packs completely',()=>{
  assert.equal(ogeCounts[6],83)
  assert.equal(ogeCounts[7],50)
  assert.equal(ogeCounts[1],61)
  assert.equal(ogeCounts[3],60)
  assert.equal(ogeCounts.total,513)
  assert.equal(new Set(ogeTasks.map(t=>t.id)).size,ogeTasks.length)
  assert.equal(ogeTasks.every(t=>t.label===`Задача ${t.type} ОГЭ`),true)
  assert.equal(ogeTasks.filter(t=>t.kind!=='choice'&&t.kind!=='matching'&&t.kind!=='cloze').every(t=>Number.isFinite(t.answer)),true)
})

test('OGE graph-heavy tasks keep redraw specs and checked anchor answers',()=>{
  const graphTasks=ogeTasks.filter(t=>t.diagram)
  assert.ok(graphTasks.length>=45)
  assert.equal(ogeTasks.find(t=>t.sourceNo===25218).answer,150)
  assert.equal(ogeTasks.find(t=>t.sourceNo===25284).answer,3)
  assert.equal(ogeTasks.find(t=>t.sourceNo===8886).answer,.8)
  assert.equal(ogeTasks.find(t=>t.sourceNo===9120).answer,125)
  assert.equal(ogeTasks.find(t=>t.sourceNo===29697).answer,50)
})
