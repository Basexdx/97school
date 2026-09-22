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
export function checkAnswer(task, answer) {
  if (!publishable(task)) throw new Error('task_unavailable')
  const spec = task.ANSWER
  if (spec.mode === 'manual') return { correct: null, reviewRequired: true }
  if (spec.mode === 'numeric') {
    const value = numericValue(answer)
    return { correct: value !== null && Math.abs(value - spec.value) <= (spec.tolerance || 0), reviewRequired: false }
  }
  const normalizeOrdered=v=>String(v??'').trim().replace(/[\s,;]+/g,'')
  const actual = Array.isArray(answer) ? answer.map(normalizeOrdered) : [normalizeOrdered(answer)]
  const expected = spec.values.map(normalizeOrdered)
  if (spec.mode === 'set') {
    return { correct: new Set(actual).size === actual.length && actual.length === expected.length && expected.every(x => actual.includes(x)), reviewRequired: false }
  }
  return { correct: actual.length === expected.length && actual.every((x,i) => x === expected[i]), reviewRequired: false }
}
