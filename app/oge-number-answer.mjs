export function parseOgeNumber(value){
  const normalized=String(value??'').trim().replace(',', '.')
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized))return null
  const number=Number(normalized)
  return Number.isFinite(number)?number:null
}

export function isCorrectOgeNumber(value,expected){
  const number=parseOgeNumber(value)
  return number!==null&&Number.isFinite(expected)&&Math.abs(number-expected)<=Math.max(1e-6,Math.abs(expected)*1e-4)
}
