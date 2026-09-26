import fs from 'node:fs'
import zlib from 'node:zlib'
import {fileURLToPath} from 'node:url'

// Calculation tasks transcribed from user-supplied scans of the Peryshkin collection.
const source=number=>({
  organization:'А. В. Перышкин — Сборник задач по физике 7–9 классы',
  file:'А_В_Перышкин_Сборник_задач_7-9_класс(1).pdf',
  task_id:String(number),supplied_by_user:true,
})

const packedPath=fileURLToPath(new URL('./peryshkin-calculations-2017.b64.json',import.meta.url))
const packed=JSON.parse(fs.readFileSync(packedPath,'utf8'))
if(packed.encoding!=='gzip+base64'||typeof packed.data!=='string'||packed.taskCount!==120)throw Error('Invalid Peryshkin calculation pack')
const peryshkin2017=JSON.parse(zlib.gunzipSync(Buffer.from(packed.data,'base64')).toString('utf8'))
if(!Array.isArray(peryshkin2017)||peryshkin2017.length!==packed.taskCount)throw Error('Peryshkin calculation pack count mismatch')

function calculation({grade,number,section,paragraph,topic,task,answer,unit,prompt,difficulty='БАЗОВЫЙ',tolerance}){
  const resolvedTolerance=tolerance??Math.max(.01,Math.abs(answer)*.005)
  return {
    ID:`genius-peryshkin${grade}-${number}`,BOOK_TASK_NUMBER:number,CLASS:grade,
    SECTION:section,PARAGRAPH:paragraph,TOPIC:topic,DIFFICULTY:difficulty,
    TASK_TYPE:'calculation',TASK:task,OPTIONS:[],
    ANSWER:{mode:'numeric',value:answer,unit,tolerance:resolvedTolerance},
    ANSWER_PROMPT:prompt||`Введите ответ, ${unit}`,STATUS:'VERIFIED',SOLUTION:[],FORMULAS:[],
    UNITS:[unit],SKILLS:[topic],IMAGE_REQUIRED:false,IMAGE_DESCRIPTION:'',
    XP:difficulty==='ПОВЫШЕННЫЙ'?20:10,OFFLINE_READY:true,
    SOURCE:source(number),CHECK:{independent:true,method:'source_scan_and_independent_calculation'},
  }
}

export const grade7Additions=[
  calculation({grade:7,number:439,section:'pressure7',paragraph:20,topic:'Атмосферное давление',
    task:'Выразите нормальное атмосферное давление 101 325 Па в гектопаскалях.',
    answer:1013.25,unit:'гПа',prompt:'Давление, гПа'}),
  calculation({grade:7,number:440,section:'pressure7',paragraph:20,topic:'Атмосферное давление',
    task:'На какую высоту может подняться столб воды при нормальном атмосферном давлении? Примите атмосферное давление равным 101 300 Па, плотность воды — 1000 кг/м³, g = 10 Н/кг.',
    answer:10.13,unit:'м',prompt:'Высота столба воды, м',difficulty:'ПОВЫШЕННЫЙ'}),
  calculation({grade:7,number:441,section:'pressure7',paragraph:20,topic:'Атмосферное давление',
    task:'С какой силой воздух давит на поверхность стола длиной 1 м и шириной 60 см? Примите атмосферное давление равным 100 000 Па.',
    answer:60000,unit:'Н',prompt:'Сила давления, Н',tolerance:1}),
  ...peryshkin2017.filter(task=>task.CLASS===7),
]

export const grade8Additions=[
  calculation({grade:8,number:1044,section:'electric',paragraph:40,topic:'Электрическое сопротивление проводника',
    task:'Две проволоки одинаковой длины и из одного материала имеют сечения 0,2 см² и 4 мм². Во сколько раз сопротивление второй проволоки больше сопротивления первой?',
    answer:5,unit:'раз',prompt:'Отношение сопротивлений'}),
  calculation({grade:8,number:1045,section:'electric',paragraph:40,topic:'Электрическое сопротивление проводника',
    task:'Две проволоки из одного материала: длины 5 м и 0,5 м, сечения соответственно 0,15 см² и 3 мм². Во сколько раз сопротивление первой проволоки больше сопротивления второй?',
    answer:2,unit:'раз',prompt:'Отношение сопротивлений',difficulty:'ПОВЫШЕННЫЙ'}),
  calculation({grade:8,number:1046,section:'electric',paragraph:40,topic:'Электрическое сопротивление проводника',
    task:'Два алюминиевых провода одинаковой длины имеют сечения 0,1 см² и 2 мм². Сопротивление первого провода 2 Ом. Найдите сопротивление второго.',
    answer:10,unit:'Ом',prompt:'Сопротивление второго провода, Ом'}),
  ...peryshkin2017.filter(task=>task.CLASS===8),
]

export const grade9Additions=[
  calculation({grade:9,number:1459,section:'kinematics9',paragraph:53,topic:'Равноускоренное движение',
    task:'Товарняк начал торможение перед шлагбаумом и остановился за 3 мин. Какой была его скорость перед торможением, если тормозной путь составил 1,8 км? Считайте замедление постоянным.',
    answer:20,unit:'м/с',prompt:'Начальная скорость, м/с',difficulty:'ПОВЫШЕННЫЙ'}),
  calculation({grade:9,number:1460,section:'kinematics9',paragraph:53,topic:'Равноускоренное движение',
    task:'Тормозной путь поезда 150 м, время торможения 30 с. Найдите начальную скорость поезда при постоянном замедлении.',
    answer:10,unit:'м/с',prompt:'Начальная скорость, м/с'}),
  calculation({grade:9,number:1462,section:'kinematics9',paragraph:53,topic:'Равноускоренное движение',
    task:'Аэроплан летел со скоростью 360 км/ч, затем 10 с двигался равноускоренно, увеличивая скорость на 9 м/с за каждую секунду. Какой путь он прошёл за эти 10 с?',
    answer:1450,unit:'м',prompt:'Путь за 10 с, м',difficulty:'ПОВЫШЕННЫЙ',tolerance:1}),
  calculation({grade:9,number:1717,section:'oscillations9',paragraph:61,topic:'Период и частота колебаний',
    task:'Груз на пружине за 10 с совершил 35 колебаний. Найдите период одного колебания.',
    answer:10/35,unit:'с',prompt:'Период, с',tolerance:.005}),
  calculation({grade:9,number:1718,section:'oscillations9',paragraph:61,topic:'Период и частота колебаний',
    task:'Маятник за 1 мин совершил 300 колебаний. Какова частота его колебаний?',
    answer:5,unit:'Гц',prompt:'Частота, Гц'}),
  calculation({grade:9,number:1720,section:'oscillations9',paragraph:61,topic:'Период и частота колебаний',
    task:'Период колебаний крыльев стрекозы 5 мс, а муха машет крыльями с частотой 600 Гц. На сколько больше взмахов за 1 мин делает муха?',
    answer:24000,unit:'взмахов',prompt:'Разница за 1 мин',difficulty:'ПОВЫШЕННЫЙ',tolerance:1}),
  ...peryshkin2017.filter(task=>task.CLASS===9),
]
