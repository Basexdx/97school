import test from 'node:test'
import assert from 'node:assert/strict'
import {ogeFormulas,ogeQuantities,searchOgeReference} from '../app/oge-reference-data.mjs'

test('mass search finds related formulas and the mass measurement entry',()=>{
  const results=searchOgeReference('масса')
  assert.ok(results.formulas.some(item=>item.id==='density'))
  assert.ok(results.formulas.some(item=>item.id==='newton-second'))
  assert.ok(results.quantities.some(item=>item.id==='mass'))
})

test('search is case-insensitive, normalizes ё, and matches units and symbols',()=>{
  assert.ok(searchOgeReference('ЖЁСТКОСТЬ').formulas.some(item=>item.id==='hooke'))
  assert.ok(searchOgeReference('кг/м³').quantities.some(item=>item.id==='density'))
  assert.ok(searchOgeReference('I = q / t','formulas').formulas.some(item=>item.id==='current'))
})

test('reference scope filters formulas and quantities independently',()=>{
  assert.equal(searchOgeReference('масса','formulas').quantities.length,0)
  assert.equal(searchOgeReference('масса','units').formulas.length,0)
  assert.ok(searchOgeReference('масса','formulas').formulas.length>0)
  assert.ok(searchOgeReference('масса','units').quantities.length>0)
})

test('all reference entries have unique ids and required source fields',()=>{
  assert.equal(new Set(ogeFormulas.map(item=>item.id)).size,ogeFormulas.length)
  assert.equal(new Set(ogeQuantities.map(item=>item.id)).size,ogeQuantities.length)
  assert.ok(ogeFormulas.every(item=>item.title&&item.formula&&item.source))
  assert.ok(ogeQuantities.every(item=>item.name&&item.symbols&&item.si))
})
