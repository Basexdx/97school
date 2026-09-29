export const ogeSections=['Механика','Тепловые явления','Электродинамика','Оптика','Атомная физика','ОГЭ эксперимент']

export function sectionForTask(task){
  if(task.sourceNo===8903)return 'Оптика'
  // Oscillations, waves and pressure in the current bank are mechanics topics.
  return 'Механика'
}

export const normalizeOgeText=value=>String(value??'').toLocaleLowerCase('ru-RU').replaceAll('ё','е').replace(/\s+/g,' ').trim()

export function matchesOgeStatus(id,selected,viewed,solved){
  if(!selected.length)return true
  const seen=viewed.has(id),done=solved.has(id)
  const wantsSeen=selected.includes('viewed')
  const wantsSolved=selected.includes('solved'),wantsUnsolved=selected.includes('unsolved')
  if(wantsSeen&&(wantsSolved||wantsUnsolved))return seen&&((wantsSolved&&done)||(wantsUnsolved&&!done))
  return (wantsSeen&&seen)||(wantsSolved&&done)||(wantsUnsolved&&!done)
}

export function filterOgeTasks(tasks,{sections=[],types=[],statuses=[],query=''},viewed=new Set(),solved=new Set()){
  const words=normalizeOgeText(query).split(' ').filter(Boolean)
  return tasks.filter(task=>{
    if(sections.length&&!sections.includes(sectionForTask(task)))return false
    if(types.length&&!types.includes(task.type))return false
    if(!matchesOgeStatus(task.id,statuses,viewed,solved))return false
    const haystack=normalizeOgeText([task.sourceNo,task.label,task.type,sectionForTask(task),task.text].join(' '))
    return words.every(word=>haystack.includes(word))
  })
}
