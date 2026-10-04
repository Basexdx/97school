export function taskPreview(value,maxLength=160){
  const text=String(value??'').replace(/\s+/g,' ').trim()
  if(text.length<=maxLength)return text
  const start=text.slice(0,maxLength-1)
  const boundary=start.lastIndexOf(' ')
  return `${start.slice(0,boundary>maxLength*0.6?boundary:start.length).trimEnd()}…`
}
