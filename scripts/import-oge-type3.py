"""Import the three supplied type-3 PDFs, preserving original figure geometry.

Run: python3 scripts/import-oge-type3.py /path/to/3_*.pdf
Requires PyMuPDF and Pillow. Diagrams are cropped as native SVG; photographs
are retained in their original colours. Keys were independently reviewed and
cross-checked against overlapping, verified tasks in the textbook bank.
"""
import io
import json
import re
import sys
from collections import Counter
from pathlib import Path
import xml.etree.ElementTree as ET

import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "oge-figures"
HEAD = re.compile(r"\d+\.\s*Тип\s+3\s+№\s+(\d+)\s*i\s*")
CHOICE = re.compile(r"(?m)^\s*([1-4])\)\s*")

INERTIA = "Тело сохраняет свою скорость по инерции, когда движение окружающих предметов или опоры резко изменяется."
REACTION = "При выбрасывании воды или пара в одну сторону тело получает движение в противоположную сторону: это реактивное движение."
EXPANSION = "Размеры тела меняются при изменении температуры: при нагревании оно расширяется, при охлаждении сжимается."
DIFFUSION = "Частицы одного вещества проникают между частицами другого вследствие их теплового движения. Это диффузия."
BROWNIAN = "Хаотическое движение взвешенных частиц возникает из-за ударов молекул жидкости. Это броуновское движение."
INDUCTION = "При изменении магнитного потока через катушку в ней возникает индукционный электрический ток."
POLARIZATION = "Заряженное тело перераспределяет заряды в другом теле без контакта. Это электризация через влияние; ближайшие разноимённые заряды обеспечивают притяжение."
REFRACTION = "На границе воды и воздуха свет меняет направление. Из-за преломления видимое положение предмета отличается от действительного."
RADIATION = "Земля теряет энергию преимущественно посредством теплового излучения. Облака уменьшают эти потери, поэтому ночь становится теплее."

ANSWERS = {
    25853:(2,INERTIA), 26127:(2,INERTIA), 26128:(3,REACTION), 26129:(3,INERTIA),
    26130:(3,"На границе воздуха и стекла звуковые волны частично отражаются. Поэтому закрытое окно пропускает меньше уличного шума."),
    26131:(1,"Эхолокация основана на приёме звуковой волны, отражённой от препятствия."),
    26132:(2,INERTIA),
    26133:(3,"Атмосферное давление снаружи удерживает бумагу у перевёрнутого стакана и препятствует вытеканию воды."),
    26134:(1,"Эхолокация основана на отражении звуковых волн от препятствий и объектов."),
    26135:(1,INERTIA), 26136:(1,INERTIA), 26137:(2,INERTIA), 26138:(3,REACTION),
    26139:(2,"При свободном падении вода и пакет движутся с одинаковым ускорением. Вода не давит на стенки пакета своим весом: наблюдается невесомость."),
    26140:(2,INERTIA), 28227:(3,REACTION), 31526:(1,INERTIA),
    32434:(4,"При резком ударе воздух не успевает проникнуть под газету. Атмосферное давление, действующее на её большую площадь, удерживает газету и линейку."),
    19601:(4,BROWNIAN), 23867:(1,RADIATION), 24044:(2,EXPANSION),
    25066:(1,"Охлаждённая сверху жидкость становится плотнее и опускается, а тёплая поднимается. Конвекция ускоряет охлаждение компота."),
    25878:(2,"Песок получает энергию солнечного излучения; контакт с Солнцем и конвекция между ними отсутствуют."),
    26141:(4,DIFFUSION), 26142:(2,EXPANSION), 26143:(2,EXPANSION),
    26144:(4,DIFFUSION), 26145:(4,DIFFUSION), 26146:(2,EXPANSION),
    26147:(3,"Испарение воды с мокрой бумаги требует энергии. Бумага и стакан охлаждаются, поэтому вода в нём остывает быстрее."),
    26148:(1,"Вода выходит через поры и испаряется с поверхности сосуда. На испарение расходуется энергия, и оставшаяся вода охлаждается."),
    26149:(1,BROWNIAN),
    26150:(1,"Силы сопротивления воздуха совершают работу. При торможении часть механической энергии корабля переходит во внутреннюю."),
    26151:(3,"При охлаждении водяной пар превращается в капли жидкой воды. Это конденсация."),
    26152:(3,"Из-за неодинакового нагрева суши и моря возникают потоки тёплого и холодного воздуха. Перенос тепла воздушными потоками — конвекция."),
    26153:(2,EXPANSION), 26155:(1,BROWNIAN), 28255:(2,EXPANSION),
    29595:(1,"При торможении работа сил сопротивления воздуха приводит к увеличению внутренней энергии корабля."),
    29693:(1,"Энергия передаётся от горячего чая к металлической ложке и вдоль неё благодаря теплопроводности."),
    29738:(3,"Роса образуется при конденсации водяного пара на охлаждённых листьях."),
    31527:(2,"При нагревании вода расширяется. Расширительный бак принимает дополнительный объём воды."),
    26077:(4,INDUCTION), 26157:(1,RADIATION),
    26158:(4,"Магнитная стрелка — постоянный магнит. Она взаимодействует с магнитным полем проводника с током, из которого сделана катушка электромагнита."),
    26159:(1,"Тепловизор регистрирует инфракрасное излучение тел."),
    26160:(1,REFRACTION),
    26161:(3,"Для получения изображений костей и поиска инородных тел используют рентгеновское излучение."),
    26162:(1,POLARIZATION), 26163:(1,POLARIZATION),
    26164:(3,"Разные цвета света преломляются в призме по-разному. Разложение света на цвета называется дисперсией."),
    26165:(4,"Образование загара вызывается действием ультрафиолетового излучения на кожу."),
    26166:(3,"Гамма-излучение имеет очень малую длину волны и используется для радиационной стерилизации."),
    26167:(2,"Капли тумана рассеивают свет прожектора в сторону наблюдателя, поэтому луч становится заметным."),
    26168:(4,INDUCTION),
    26169:(2,"Атмосфера сильнее рассеивает коротковолновую, голубую часть видимого солнечного света."),
    26170:(1,POLARIZATION),
    26171:(1,"Гладкая поверхность спокойной воды зеркально отражает свет и образует чёткое изображение берегов."),
    26172:(4,INDUCTION), 26173:(1,REFRACTION),
}


def clean(value):
    return re.sub(r"\s+", " ", value).strip().replace("теплороводность", "теплопроводность").replace("вызывает образования росы", "вызывает образование росы")


def text_tasks(doc, path):
    raw = "\n".join(page.get_text("text") for page in doc)
    raw = re.sub(r"\u00ad[‐-]\s*\n\s*", "", raw).replace("\u00ad", "")
    raw = re.sub(r"[‐-]\s*\n\s*(?=[а-яё])", "", raw).replace("\xa0", " ").replace("\u202f", " ")
    raw = re.sub(r"(?m)^\s*(?:\d\d\.\d\d\.\d{4}.*|РЕШУ ОГЭ — физика|https?://phys-oge\.sdamgia\.ru/.*|phys-oge\.sdamgia\.ru/.*|\d+/\d+)\s*$", "", raw)
    section = "Механика" if "Механические" in path.name else "Тепловые явления" if "Тепловые" in path.name else "Электродинамика"
    chunks = HEAD.split(raw)
    tasks = []
    for index in range(1, len(chunks), 2):
        number, body = int(chunks[index]), chunks[index + 1]
        choices = list(CHOICE.finditer(body))
        if [match[1] for match in choices] != ["1", "2", "3", "4"]:
            raise ValueError(f"Missing choices in {number}")
        key, explanation = ANSWERS[number]
        sections = [section]
        if number in [26160,26164,26167,26169,26171,26173,26159,26165]:
            sections.append("Оптика")
        if number in [26157,26159]:
            sections.append("Тепловые явления")
        if number in [26161,26166]:
            sections.append("Атомная физика")
        tasks.append({
            "id": f"oge-3-{number}", "type": 3, "sourceNo": number,
            "label": "Задача 3 ОГЭ", "kind": "choice", "section": section,
            "sections": sections, "text": clean(body[:choices[0].start()]),
            "options": [clean(body[match.end():choices[i+1].start() if i+1<len(choices) else len(body)]) for i,match in enumerate(choices)],
            "figures": [], "answer": [key], "explanation": explanation,
            "answerSource": "independent-physics-review", "source": path.name,
        })
    return tasks


def palette(value):
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", value):
        return value
    r, g, b = [int(value[i:i+2], 16) for i in [1,3,5]]
    if min(r,g,b)>245:
        return "#051629"
    if max(r,g,b)<45:
        return "#e1effd"
    if r>b*1.27 and r>g*1.09:
        return "#ffc34e"
    if b>r*1.2 and b>g*1.07:
        return "#54c4ff"
    if max(r,g,b)-min(r,g,b)<25:
        return "#688aa7"
    return value


def vector_crop(doc, page_index, clip, destination):
    cropped = fitz.open()
    cropped.insert_pdf(doc, from_page=page_index, to_page=page_index)
    page = cropped[0]
    # Diagram lettering is already part of the original vector paths. Remove
    # the PDF's ordinary question/option text so a nearby line cannot enter
    # the crop where the source places a figure beside its prompt.
    for block in page.get_text("dict")["blocks"]:
        if block["type"] == 0:
            page.add_redact_annot(fitz.Rect(block["bbox"]), fill=False)
    page.apply_redactions(images=0, graphics=0, text=0)
    # Remove page content outside the figure before exporting its exact paths.
    outside = [fitz.Rect(0,0,page.rect.width,clip.y0),fitz.Rect(0,clip.y1,page.rect.width,page.rect.height),fitz.Rect(0,clip.y0,clip.x0,clip.y1),fitz.Rect(clip.x1,clip.y0,page.rect.width,clip.y1)]
    for rect in outside:
        if not rect.is_empty:
            page.add_redact_annot(rect, fill=False)
    page.apply_redactions(images=2, graphics=1, text=0)
    page.set_cropbox(clip)
    ET.register_namespace("", "http://www.w3.org/2000/svg")
    ET.register_namespace("xlink", "http://www.w3.org/1999/xlink")
    root = ET.fromstring(page.get_svg_image())
    root.set("fill", "#e1effd")
    for element in root.iter():
        for attribute in ["fill", "stroke"]:
            if attribute in element.attrib:
                element.set(attribute, palette(element.get(attribute)))
    root.set("width", str(round(clip.width*3)))
    root.set("height", str(round(clip.height*3)))
    destination.write_text(ET.tostring(root, encoding="unicode"), encoding="utf-8")


def figures(doc, tasks):
    by_id = {task["id"]:task for task in tasks}
    current = None
    for pi, page in enumerate(doc):
        blocks = page.get_text("dict")["blocks"]
        heads = []
        for block in blocks:
            if block["type"] != 0:
                continue
            text = " ".join(span["text"] for line in block["lines"] for span in line["spans"]).replace("\xa0", " ")
            match = re.search(r"Тип\s+3\s*№\s*(\d+)", text)
            if match:
                heads.append((block["bbox"][1], f"oge-3-{match[1]}"))
        heads.sort()
        regions = [(current,30,heads[0][0])] if current and heads else []
        regions += [(task_id,y+16,heads[i+1][0] if i+1<len(heads) else 790) for i,(y,task_id) in enumerate(heads)]
        if heads:
            current = heads[-1][1]
        drawings = page.get_drawings()
        for task_id, top, bottom in regions:
            image_rects = [fitz.Rect(block["bbox"]) for block in blocks if block["type"]==1 and block["bbox"][2]-block["bbox"][0]>25 and block["bbox"][3]-block["bbox"][1]>25 and top<=block["bbox"][1]<bottom]
            rects = [item["rect"] for item in drawings if item["rect"].x0>160 and top<=item["rect"].y0<bottom and item["rect"].y1<=bottom and item["rect"].width<500]
            rects += image_rects
            if not rects:
                continue
            union = fitz.Rect(min(r.x0 for r in rects),min(r.y0 for r in rects),max(r.x1 for r in rects),max(r.y1 for r in rects))
            if union.width<25 or union.height<25:
                continue
            clip = (union+(-5,-5,5,5)) & page.rect
            extension = "webp" if image_rects else "svg"
            name = f"{task_id}-{pi+1}.{extension}"
            if image_rects:
                pix = page.get_pixmap(matrix=fitz.Matrix(3,3),clip=clip,alpha=False)
                Image.open(io.BytesIO(pix.tobytes("png"))).save(ASSETS/name,"WEBP",quality=92)
            else:
                vector_crop(doc, pi, clip, ASSETS/name)
            by_id[task_id]["figures"].append(f"/oge-figures/{name}")


def main(paths):
    ASSETS.mkdir(exist_ok=True)
    tasks = []
    verified = {int(task["SOURCE"]["task_id"]):task for task in json.loads((ROOT/"bank/tasks.json").read_text()) if str(task.get("SOURCE",{}).get("task_id", "")).isdigit()}
    for path in paths:
        doc = fitz.open(path)
        batch = text_tasks(doc,path)
        figures(doc,batch)
        tasks.extend(batch)
        print(path.name,len(batch),"tasks",sum(len(t["figures"]) for t in batch),"figures")
    if len(tasks)!=60 or len({t["id"] for t in tasks})!=60 or {t["sourceNo"] for t in tasks}!=set(ANSWERS):
        raise ValueError("Expected all 60 unique type-3 tasks")
    for task in tasks:
        existing = verified.get(task["sourceNo"])
        if existing and existing["ANSWER"]["mode"]=="ordered" and [str(x) for x in task["answer"]]!=existing["ANSWER"]["values"]:
            raise ValueError(f"Key disagrees with verified bank: {task['id']}")
        if re.search(r"см\.\s*(?:рис|рисунок)", task["text"]) and not task["figures"]:
            raise ValueError(f"Missing figure: {task['id']}")
    (ROOT/"app/oge-task-data-3.mjs").write_text("// User-supplied type-3 PDFs; independently reviewed answer keys.\nexport const ogeType3Tasks="+json.dumps(tasks,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Total",len(tasks),"tasks",sum(len(t["figures"]) for t in tasks),"figures",dict(Counter(t["section"] for t in tasks)))


if __name__=="__main__":
    main([Path(path) for path in sys.argv[1:]])
