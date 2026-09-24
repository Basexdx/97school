import {matchingAnswerValues,matchingResponseValues} from './matching-utils.mjs'

export const TASK_TYPES = ['single_choice','multiple_choice','numeric','matching','sequence','qualitative','calculation','graph','table','experiment','circuit']
export function publishable(task) {
  return task.STATUS === 'VERIFIED' || (task.STATUS === 'ANSWER_MISMATCH' && task.CHECK?.resolved === true)
}
export function numericValue(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const text = String(value).trim().replace(/−/g, '-').replace(',', '.')
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) return null
  const n = Number(text)
  return Number.isFinite(n) ? n : null
}
const numericCorrect=(actual,expected,tolerance=0)=>{
  const value=numericValue(actual)
  return value!==null&&Math.abs(value-expected)<=tolerance
}
const normalizeOrdered=v=>String(v??'').trim().replace(/[\s,;]+/g,'')

export function checkAnswer(task, answer) {
  if (!publishable(task)) throw new Error('task_unavailable')
  const spec = task.ANSWER
  if (spec.mode === 'manual') return { correct: null, reviewRequired: true }
  if (spec.mode === 'numeric') return { correct:numericCorrect(answer,spec.value,spec.tolerance||0), reviewRequired:false }
  if (spec.mode === 'numeric_list') {
    const actual=Array.isArray(answer)?answer:[]
    const tolerance=spec.tolerance||0
    return {correct:actual.length===spec.values.length&&spec.values.every((v,i)=>numericCorrect(actual[i],v,tolerance)),reviewRequired:false}
  }
  if (spec.mode === 'parts') {
    const actual=Array.isArray(answer)?answer:[]
    const correct=actual.length===spec.parts.length&&spec.parts.every((part,i)=>part.type==='numeric'
      ?numericCorrect(actual[i],part.value,part.tolerance||0)
      :part.values.map(normalizeOrdered).includes(normalizeOrdered(actual[i])))
    return {correct,reviewRequired:false}
  }
  const expectedRaw=task.TASK_TYPE==='matching'?matchingAnswerValues(task):spec.values
  const actualRaw=task.TASK_TYPE==='matching'?matchingResponseValues(answer,expectedRaw.length):(Array.isArray(answer)?answer:[answer])
  const actual=actualRaw.map(normalizeOrdered)
  const expected=expectedRaw.map(normalizeOrdered)
  if (spec.mode === 'set') return { correct:new Set(actual).size===actual.length&&actual.length===expected.length&&expected.every(x=>actual.includes(x)), reviewRequired:false }
  return { correct:actual.length===expected.length&&actual.every((x,i)=>x===expected[i]), reviewRequired:false }
}
