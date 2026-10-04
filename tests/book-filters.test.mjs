import test from 'node:test'
import assert from 'node:assert/strict'
import {bookArea,matchesBookFilters} from '../shared/book-filters.mjs'
const task={id:'a',paragraph:1,topic:'Количество теплоты',section:'thermal',type:'calculation',difficulty:'БАЗОВЫЙ',bookNumber:23}
const paragraphs=[{paragraph:1,title:'Тепловое движение'}]
test('paragraph accepts exact number, title and datalist label without confusing 1 and 10',()=>{
 for(const paragraph of ['1','§1','тепловое движение','§1. Тепловое движение'])assert.equal(matchesBookFilters(task,{paragraph},{},false,paragraphs),true)
 assert.equal(matchesBookFilters({...task,paragraph:10},{paragraph:'1'},{},false,paragraphs),false)
})
test('section, topic, difficulty and type combine rather than replacing one another',()=>{
 const filters={section:'thermal',topic:'ТЕПЛОТЫ',difficulty:'БАЗОВЫЙ',type:'calculation'}
 assert.equal(matchesBookFilters(task,filters),true)
 for(const patch of [{section:'optics'},{topic:'давление'},{difficulty:'ВЫСОКИЙ'},{type:'graph'}])assert.equal(matchesBookFilters(task,{...filters,...patch}),false)
})
test('progress distinguishes viewed, solved, repeat and pending synchronization',()=>{
 assert.equal(matchesBookFilters(task,{progress:'viewed'},{},true),true)
 assert.equal(matchesBookFilters(task,{progress:'viewed'},{},false),false)
 assert.equal(matchesBookFilters(task,{progress:'solved'},{solved:true}),true)
 assert.equal(matchesBookFilters(task,{progress:'unsolved'},{solved:true}),false)
 assert.equal(matchesBookFilters(task,{progress:'repeat'},{wrong:1}),true)
 assert.equal(matchesBookFilters(task,{progress:'repeat'},{wrong:1,solved:true}),false)
 assert.equal(matchesBookFilters(task,{progress:'pending'},{pending:true}),true)
})
test('additional physical areas classify optics, atomic physics and experimental tasks',()=>{
 assert.equal(bookArea({section:'extra8',topic:'Собирающая линза'}),'optics')
 assert.equal(bookArea({topic:'Строение атома'}),'atomic')
 assert.equal(bookArea({section:'thermal',type:'experiment'}),'experiment')
 assert.equal(bookArea({section:'electric',topic:'Сила тока'}),'electric')
 assert.equal(bookArea({section:'motion7',topic:'Движение'}),'mechanics')
 assert.equal(matchesBookFilters({section:'extra8'},{section:'extra8'}),true)
})
