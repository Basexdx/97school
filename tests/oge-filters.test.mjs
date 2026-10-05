import test from 'node:test'
import assert from 'node:assert/strict'
import {ogeTasks} from '../app/oge-task-data.mjs'
import {filterOgeTasks,matchesOgeStatus,ogeSections,sectionForTask} from '../app/oge-task-filters.mjs'

test('all OGE sections are available and combine with task types',()=>{
  assert.deepEqual(ogeSections,['Механика','Тепловые явления','Электродинамика','Оптика','Атомная физика','ОГЭ эксперимент'])
  assert.equal(sectionForTask(ogeTasks.find(task=>task.sourceNo===8903)),'Оптика')
  assert.equal(sectionForTask(ogeTasks.find(task=>task.sourceNo===8886)),'Механика')
  assert.equal(filterOgeTasks(ogeTasks,{sections:['Механика'],types:[6],statuses:['unsolved']}).length,ogeTasks.filter(task=>task.type===6).length)
  const mixed=filterOgeTasks(ogeTasks,{sections:['Механика','Оптика'],types:[6,7]})
  assert(mixed.some(task=>task.sourceNo===8903))
  assert(mixed.some(task=>task.sourceNo===12419))
  assert(mixed.some(task=>task.sourceNo===8886))
  assert.equal(filterOgeTasks(ogeTasks,{sections:['Атомная физика'],types:[1]}).length,2)
  assert.equal(filterOgeTasks(ogeTasks,{types:[1,2,3]}).length,121)
})

test('viewed intersects solved or unsolved, including with a search query',()=>{
  const viewed=new Set(['oge-6-12419','oge-6-23873','oge-7-8903'])
  const solved=new Set(['oge-6-23873','oge-7-8903'])
  assert(matchesOgeStatus('oge-6-12419',['unsolved','viewed'],viewed,solved))
  assert(!matchesOgeStatus('oge-6-23873',['unsolved','viewed'],viewed,solved))
  assert(matchesOgeStatus('oge-6-23873',['solved','viewed'],viewed,solved))
  assert.deepEqual(filterOgeTasks(ogeTasks,{sections:['Механика','Оптика'],types:[6,7,10],statuses:['unsolved','viewed'],query:'скорость'},viewed,solved).map(task=>task.sourceNo),[12419])
  assert.deepEqual(filterOgeTasks(ogeTasks,{statuses:['viewed']},viewed,solved).map(task=>task.sourceNo),[12419,23873,8903])
})

test('six PDF batches expose the expected task types, sections and answer state',()=>{
  const imported=ogeTasks.filter(task=>[14,15,16].includes(task.type))
  assert.equal(imported.length,152)
  assert.equal(imported.reduce((count,task)=>count+task.figures.length,0),150)
  assert.deepEqual(imported.reduce((counts,task)=>(counts[task.type]=(counts[task.type]||0)+1,counts),{}),{14:56,15:41,16:55})
  assert(imported.every(task=>task.options.length===(task.type===15?4:5)))
  assert.equal(filterOgeTasks(ogeTasks,{sections:['Тепловые явления'],types:[14]}).length,28)
  const answered=new Set(['oge-14-48'])
  assert.deepEqual(filterOgeTasks(ogeTasks,{types:[14],statuses:['answered']},new Set(),new Set(),answered).map(task=>task.sourceNo),[48])
  assert(!filterOgeTasks(ogeTasks,{types:[14],statuses:['unsolved']},new Set(),new Set(),answered).some(task=>task.sourceNo===48))
})
