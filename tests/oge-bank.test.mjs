import test from 'node:test'
import assert from 'node:assert/strict'
import {ogeCounts,ogeTasks} from '../app/oge-task-data.mjs'

test('OGE bank imports task 6 and task 7 source packs completely',()=>{
  assert.equal(ogeCounts[6],27)
  assert.equal(ogeCounts[7],38)
  assert.equal(ogeCounts.total,65)
  assert.equal(new Set(ogeTasks.map(t=>t.id)).size,65)
  assert.equal(ogeTasks.every(t=>t.label===`Задача ${t.type} ОГЭ`),true)
  assert.equal(ogeTasks.every(t=>Number.isFinite(t.answer)),true)
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
