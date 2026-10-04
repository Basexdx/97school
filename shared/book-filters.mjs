export const bookAreas=[['','Все разделы'],['mechanics','Механика'],['thermal','Тепловые явления'],['electric','Электродинамика'],['optics','Оптика'],['atomic','Атомная физика'],['experiment','ОГЭ эксперимент']]
const normalize=value=>String(value??'').toLocaleLowerCase('ru-RU').replaceAll('ё','е')
export function bookArea(task){
  const text=normalize(`${task.topic} ${task.section}`)
  if(task.type==='experiment')return 'experiment'
  if(/атом|ядр|радиоактив/.test(text))return 'atomic'
  if(/оптик|свет|линз|зеркал/.test(text))return 'optics'
  if(task.section==='thermal'||/теплов|температур|нагрев|плавлен/.test(text))return 'thermal'
  if(['electric','extra8'].includes(task.section)||/электр|магнит/.test(text))return 'electric'
  return 'mechanics'
}
export function matchesBookFilters(task,filters,state={},viewed=false,paragraphs=[]){
  const {section='',paragraph='',topic='',difficulty='',type='',progress='',query=''}=filters
  const p=normalize(paragraph).replace(/^§/,'').trim(), title=paragraphs.find(item=>item.paragraph===task.paragraph)?.title||''
  const paragraphMatch=!p||( /^\d+$/.test(p)?task.paragraph===Number(p):normalize(`${task.paragraph}. ${title}`).includes(p))
  const progressMatch=!progress||(progress==='solved'?state.solved:progress==='unsolved'?!state.solved:progress==='viewed'?viewed:progress==='repeat'?(!state.solved&&(state.repeat||state.wrong>0)):progress==='pending'?state.pending:false)
  return (!section||bookArea(task)===section||task.section===section)&&paragraphMatch&&(!topic||normalize(task.topic).includes(normalize(topic)))&&(!difficulty||task.difficulty===difficulty)&&(!type||task.type===type)&&progressMatch&&(!query||normalize(`${task.bookNumber} ${task.topic} ${task.preview||''}`).includes(normalize(query)))
}
