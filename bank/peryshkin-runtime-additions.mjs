const source=number=>({organization:'А. В. Перышкин — Сборник задач по физике 7–9 классы',file:'А_В_Перышкин_Сборник_задач_7-9_класс(1).pdf',task_id:String(number),supplied_by_user:true})
function calculation({number,task,answer,unit,prompt,difficulty='БАЗОВЫЙ'}){
  return {ID:`genius-peryshkin8-${number}`,BOOK_TASK_NUMBER:number,CLASS:8,SECTION:'electric',PARAGRAPH:40,TOPIC:'Электрическое сопротивление проводника',DIFFICULTY:difficulty,TASK_TYPE:'calculation',TASK:task,OPTIONS:[],ANSWER:{mode:'numeric',value:answer,unit,tolerance:Math.max(.01,Math.abs(answer)*.005)},ANSWER_PROMPT:prompt,STATUS:'VERIFIED',SOLUTION:[],FORMULAS:[],UNITS:[unit],SKILLS:['Электрическое сопротивление проводника'],IMAGE_REQUIRED:false,IMAGE_DESCRIPTION:'',XP:difficulty==='ПОВЫШЕННЫЙ'?20:10,OFFLINE_READY:true,SOURCE:source(number),CHECK:{independent:true,method:'source_scan_and_independent_calculation'}}
}
export const grade8RuntimeAdditions=[
  calculation({number:1044,task:'Две проволоки одинаковой длины и из одного материала имеют сечения 0,2 см² и 4 мм². Во сколько раз сопротивление второй проволоки больше сопротивления первой?',answer:5,unit:'раз',prompt:'Отношение сопротивлений'}),
  calculation({number:1045,task:'Две проволоки из одного материала: длины 5 м и 0,5 м, сечения соответственно 0,15 см² и 3 мм². Во сколько раз сопротивление первой проволоки больше сопротивления второй?',answer:2,unit:'раз',prompt:'Отношение сопротивлений',difficulty:'ПОВЫШЕННЫЙ'}),
  calculation({number:1046,task:'Два алюминиевых провода одинаковой длины имеют сечения 0,1 см² и 2 мм². Сопротивление первого провода 2 Ом. Найдите сопротивление второго.',answer:10,unit:'Ом',prompt:'Сопротивление второго провода, Ом'}),
]
