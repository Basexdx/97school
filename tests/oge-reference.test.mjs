import test from 'node:test'
import assert from 'node:assert/strict'
import {ogeFormulas,ogeQuantities,ogeUnits,searchOgeReference} from '../app/oge-reference-data.mjs'

test('OGE reference contains the main 2026 formula blocks',()=>{
  assert.ok(ogeFormulas.length>=40)
  for(const id of ['density','newton2','heat-capacity','ohm','joule-lenz','optical-power']){
    assert.ok(ogeFormulas.some(item=>item.id===id),`missing formula ${id}`)
  }
})

test('word search links a quantity to formulas that use it',()=>{
  const mass=searchOgeReference('масса',ogeFormulas)
  const ids=new Set(mass.map(item=>item.id))
  assert.ok(ids.has('density'))
  assert.ok(ids.has('newton2'))
  assert.ok(ids.has('kinetic-energy'))
  assert.ok(ids.has('heat-capacity'))
})

test('reference search works for quantities and units',()=>{
  assert.equal(searchOgeReference('масса',ogeQuantities)[0]?.symbol,'m')
  assert.ok(searchOgeReference('масса',ogeUnits).some(item=>item.symbol==='кг'))
  assert.ok(searchOgeReference('Ом',ogeUnits).some(item=>item.symbol==='Ом'))
  assert.ok(searchOgeReference('давление',ogeFormulas).some(item=>item.id==='pressure'))
})
