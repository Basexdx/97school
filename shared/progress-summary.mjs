export function summarizeProgress(catalog,attempts,viewedIds=[],legacySolved=[]){
 const viewed=new Set(viewedIds),solved=new Set(legacySolved)
 for(const a of attempts){viewed.add(a.taskId);if(a.result?.correct===true||a.localResult?.correct===true)solved.add(a.taskId)}
 const groups=new Map(),topics=new Map(),sourceGroups=new Map()
 function add(map,key,label,task){if(!map.has(key))map.set(key,{key,label,total:0,viewed:0,solved:0});const row=map.get(key);row.total++;if(viewed.has(task.id)||solved.has(task.id))row.viewed++;if(solved.has(task.id))row.solved++}
 const unique=[...new Map(catalog.map(task=>[task.id,task])).values()]
 for(const task of unique){add(groups,task.section,task.section,task);add(topics,`${task.source}:${task.grade}:${task.section}:${task.topic}`,task.topic,task);add(sourceGroups,task.source,task.source,task)}
 const finish=row=>({...row,remaining:row.total-row.solved,unseen:row.total-row.viewed,percent:row.total?Math.round(100*row.solved/row.total):0})
 const all=finish({total:unique.length,viewed:unique.filter(t=>viewed.has(t.id)||solved.has(t.id)).length,solved:unique.filter(t=>solved.has(t.id)).length})
 const topicRows=[...topics.values()].map(finish)
 return {...all,xp:attempts.reduce((sum,a)=>sum+(a.result?.xpAwarded||0),0),attempts:attempts.length,topicsTotal:topics.size,topicsComplete:topicRows.filter(t=>t.solved===t.total).length,topicsRemaining:topicRows.filter(t=>t.solved<t.total).length,sections:[...groups.values()].map(finish),sources:[...sourceGroups.values()].map(finish),topics:topicRows}
}
