import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import katex from 'katex'
import {importLectureLibrary,loadLectureLibraries,validateLectureLibrary} from '../app/lecture-libraries.js'

const read = name => JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'))

test('all Word formula blocks are covered once by readable, renderable lectures', () => {
  const source = read('content/lecture-formulas.json')
  const manifest = read('public/lecture-libraries/index.json')
  const deliveredEquations = []
  const ids = new Set()
  assert.deepEqual(manifest.libraries.map(item => item.grade), [7, 8, 9])
  for (const entry of manifest.libraries) {
    const library = validateLectureLibrary(read(`public/lecture-libraries/${entry.file}`))
    assert.equal(library.id, entry.id)
    assert.equal(library.grade, entry.grade)
    assert.ok(library.lessons.length >= 8)
    for (const lecture of library.lessons) {
      assert.ok(!ids.has(lecture.id), `Duplicate lecture ${lecture.id}`)
      ids.add(lecture.id)
      const words = [lecture.intro, lecture.takeaway, ...lecture.blocks.flatMap(block => [block.text, block.symbols, block.conditions])].join(' ').split(/\s+/)
      assert.ok(words.length >= 100, `Lecture too terse: ${lecture.title}`)
      for (const block of lecture.blocks) {
        assert.ok(block.source && block.symbols && block.conditions)
        for (const equation of block.equations) {
          assert.doesNotThrow(() => katex.renderToString(equation, {throwOnError:true, strict:'ignore', trust:false}), equation)
          deliveredEquations.push(equation)
        }
      }
    }
  }
  assert.deepEqual(deliveredEquations.sort(), source.flatMap(item => item.equations).sort())
})

test('a supplementary file loads alongside the built-in libraries without overwriting them', async () => {
  const {indexedDB} = await import('fake-indexeddb')
  globalThis.indexedDB = indexedDB
  const originalFetch = globalThis.fetch
  globalThis.fetch = async url => ({ok:true,json:async()=>read(`public${url}`)})
  try {
    const own = {...read('public/lecture-libraries/grade-7.json'), id:'my-extra-physics-7', title:'Дополнительные лекции'}
    const file = {size:JSON.stringify(own).length,text:async()=>JSON.stringify(own)}
    await importLectureLibrary(file)
    const libraries = await loadLectureLibraries()
    assert.equal(libraries.length, 4)
    assert.equal(libraries.at(-1).title, 'Дополнительные лекции')
    await assert.rejects(importLectureLibrary({size:file.size,text:async()=>JSON.stringify({...own,id:'genius-physics-7'})}), /занят/)
  } finally {
    globalThis.fetch = originalFetch
    delete globalThis.indexedDB
  }
})
