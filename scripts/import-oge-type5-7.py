"""Import supplied type-5 and text type-7 PDFs. Keep original PDF figures.
Answers independently reviewed; ambiguous 494, 25296 and 28250 verified at
https://phys-oge.sdamgia.ru/problem?id=SOURCE_NUMBER (source answer keys).
The graph pack contains only existing type-7 IDs and is deliberately skipped.
Usage: python3 scripts/import-oge-type5-7.py /path/to/5_*.pdf /path/to/7_*.pdf
"""
import importlib.util, json, re, sys
from pathlib import Path
import fitz
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('type4', ROOT/'scripts/import-oge-type4.py')
old = importlib.util.module_from_spec(spec); spec.loader.exec_module(old)
CHOICE_KEYS = {
59:3,221:2,248:3,329:3,356:4,518:1,653:3,678:1,707:4,734:2,
167:3,14145:3,26243:4,28222:4,28223:1,28224:1,28225:3,28226:1,
28228:2,28229:1,28230:2,28231:3,28236:3,28237:4,28238:2,29619:2,
35:3,250:3,413:2,467:4,494:1,682:3,871:1,969:1,996:3,1059:3,
1086:1,1378:2,1405:3,14195:4,14270:1,28239:2,28240:3,28241:2,
28242:4,28243:2,28244:1,28245:3,28246:2,28247:2,28248:1,28249:2,
28250:1,28251:2,28252:1,28253:1,28254:2,28256:2,28257:3,28258:3,29575:2,
}
NUMERIC_KEYS = {
8890:(17,'кГц','Частота ν = v/λ = 340/0,02 = 17 000 Гц = 17 кГц.'),
8891:(9,'кГц','Частота ν = v/λ = 270/0,03 = 9000 Гц = 9 кГц.'),
25069:(325,'Н','По закону Гука F = kΔx = 6500 · 0,05 = 325 Н.'),
25173:(3.5,'м/с','По закону сохранения импульса v = 7 · 5/(7 + 3) = 3,5 м/с.'),
25216:(10,'м/с','Центростремительное ускорение a = v²/R. Скорость v = √(aR) = √100 = 10 м/с.'),
25219:(0.6,'м','Минимальной длине волны соответствует максимальная частота: λ = 330/520 ≈ 0,635 м. После округления до десятых: 0,6 м.'),
25238:(2,'м/с²','Масса 300 г = 0,3 кг. По второму закону Ньютона a = F/m = 0,6/0,3 = 2 м/с².'),
25290:(1.25,'Гц','Переход между крайними положениями занимает половину периода. T = 2 · 0,4 = 0,8 с; ν = 1/T = 1,25 Гц.'),
25296:(0.5,'','При свободном падении v = √(2gh). Отношение новой скорости к прежней v₂/v₁ = √(h₂/h₁) = √(1/4) = 0,5. Скорость уменьшится вдвое.'),
25320:(1.25,'раз','При полном погружении Fₐ = ρgV. Отношение сил равно отношению плотностей воды и спирта: 1000/800 = 1,25.'),
25856:(15,'Дж','Высота падения до стола 4 − 1 = 3 м. Работа A = mgΔh = 0,5 · 10 · 3 = 15 Дж.'),
26186:(15,'м','Путь за вторую секунду: s(2) − s(1) = g · (2² − 1²)/2 = 10 · 3/2 = 15 м.'),
}
REASONS = {
494:'В школьной таблице удельные теплоёмкости меди и цинка одинаковы. При равном объёме медный шар тяжелее, поэтому Q = cmΔT больше.',
28250:'Смачивание позволяет сблизить волокна соприкасающихся листов: становится заметно межмолекулярное притяжение.',
}
MECH = [(59,1,(425,94,557,190)),(248,1,(425,360,557,459)),(329,1,(425,515,557,614)),(356,1,(430,660,557,773)),(518,2,(425,60,557,176)),(653,2,(425,228,557,324)),(167,3,(480,57,557,141)),(29619,6,(450,200,557,276))]
THERM = [(1378,3,(448,230,557,429)),(1405,3,(449,479,557,611)),(28245,5,(502,192,557,249)),(28246,5,(448,398,557,465)),(28257,7,(497,500,557,592))]

def source_chunks(path, kind):
    doc = fitz.open(path)
    raw = '\n'.join(p.get_text('text') for p in doc)
    raw = re.sub(r'\u00ad[‐-]\s*\n\s*','',raw).replace('\u00ad','')
    raw = re.sub(r'[‐-]\s*\n\s*(?=[а-яё])','',raw)
    raw = re.sub(r'(?m)^.*(?:phys-oge.sdamgia.ru|РЕШУ ОГЭ|\d\d\.\d\d\.\d{4}).*$','',raw)
    raw = re.sub(r'(?m)^\s*\d+/\d+\s*$','',raw)
    chunks = re.split(r'\d+\.\s*Тип\s+'+str(kind)+r'\s*№\s*(\d+)\s*i\s*',raw)
    return doc, [(int(chunks[i]),chunks[i+1]) for i in range(1,len(chunks),2)]

def main(paths):
    tasks5, tasks7 = [], []
    for path in paths:
        if 'Графики' in path.name: continue
        kind = int(path.name[0]); doc, chunks = source_chunks(path,kind)
        for n, body in chunks:
            options = list(re.finditer(r'(?m)^\s*([1-4])\)\s*',body))
            text = old.clean(body[:options[0].start()] if options else body).replace('м/с2','м/с²')
            t = dict(id=f'oge-{kind}-{n}',type=kind,sourceNo=n,label=f'Задача {kind} ОГЭ',section='Тепловые явления' if 'Тепловые' in path.name else 'Механика',topic='Объяснение физических явлений' if kind==5 else 'Текстовые задачи',kind='choice' if kind==5 else 'numeric',text=text,figures=[],source=path.name,answerSource='independent-physics-review-and-source-catalogue')
            if kind==5:
                assert len(options)==4, n
                t['options']=[old.clean(body[m.end():options[i+1].start() if i+1<len(options) else len(body)]) for i,m in enumerate(options)]
                t.update(answer=[CHOICE_KEYS[n]],unit='',explanation=REASONS.get(n,t['options'][CHOICE_KEYS[n]-1]))
                for number,page,rect in THERM if 'Тепловые' in path.name else MECH:
                    if number==n:
                        filename=f'oge-5-{n}.svg'; destination=ROOT/'public/oge-figures'/filename
                        if not destination.exists() or 'data-figure-adapted="true"' not in destination.read_text(): old.native_crop(doc,page,rect,destination)
                        t['figures'].append('/oge-figures/'+filename)
                tasks5.append(t)
            else:
                answer,unit,reason=NUMERIC_KEYS[n];t.update(answer=answer,unit=unit,explanation=reason);tasks7.append(t)
    assert len(tasks5)==61 and {t['sourceNo'] for t in tasks5}==set(CHOICE_KEYS)
    assert len(tasks7)==12 and {t['sourceNo'] for t in tasks7}==set(NUMERIC_KEYS)
    for kind,tasks in [(5,tasks5),(7,tasks7)]:
        (ROOT/f'app/oge-task-data-{kind}.mjs').write_text('// Original supplied tasks, checked keys and original PDF figures.\nexport const ogeType'+str(kind)+'Tasks='+json.dumps(tasks,ensure_ascii=False,indent=2)+'\n')
    print(f'{len(tasks5)} type-5 tasks, {len(tasks7)} type-7 tasks, '+str(sum(len(t['figures']) for t in tasks5))+' original figures')
if __name__=='__main__':main([Path(p) for p in sys.argv[1:]])
