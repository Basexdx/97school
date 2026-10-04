"""Import the user-supplied type-1 PDF without flattening its matching tables.

Run: python3 scripts/import-oge-matching.py /path/to/1_Все.pdf
Requires PyMuPDF. Source PDFs are not checked in.
"""
import json
import re
import sys
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
HEAD = re.compile(r"\d+\.\s*Тип\s+1\s+№\s+(\d+)\s*i\s*")
LEFT = re.compile(r"(?m)^\s*([АБВAB])\)\s*")
RIGHT = re.compile(r"(?m)^\s*([1-5])\)\s*")

# Mixed-topic questions belong to each relevant section, rather than being
# hidden in a catch-all category. Membership was reviewed against the PDF.
GROUPS = {
    ("Механика",): [73,208,263,532,613,667,1155,1182,1464,3303,14143,14193,14218,26075,26239,29549,29668,29691],
    ("Тепловые явления",): [46,181,505,29571,29615,29829,32454],
    ("Электродинамика",): [154,316,343,1662,559,694,748,14243,14268,14576,1519,1579,1635,29593,29736],
    ("Оптика",): [424,12415],
    ("Атомная физика",): [235,1492],
    ("Механика", "Тепловые явления"): [829,1326,1606,13129,19599,24042,25851,25876,29713,32585],
    ("Тепловые явления", "Оптика"): [478],
    ("Механика", "Электродинамика"): [802,14168,1546],
    ("Тепловые явления", "Электродинамика"): [14293],
    ("Механика", "Тепловые явления", "Электродинамика"): [14318,14550],
}
SECTIONS = {number: list(sections) for sections, numbers in GROUPS.items() for number in numbers}


def clean(value):
    value = re.sub(r"\s+", " ", value).strip()
    return value.replace("Н/м2", "Н/м²").replace("кг/м3", "кг/м³")


def split_title(value):
    lines = [line.strip() for line in value.strip().splitlines() if line.strip()]
    titles = []
    while lines and len(lines[-1]) > 5 and re.search(r"[А-ЯЁ]", lines[-1]) and lines[-1] == lines[-1].upper():
        titles.insert(0, lines.pop())
    if not titles:
        raise ValueError(f"Missing table heading in {value!r}")
    return clean("\n".join(lines)), clean(" ".join(titles)).capitalize().replace(" в си", " в СИ")


def extract(path):
    doc = fitz.open(path)
    # Reading order (not geometric sorting) keeps the two columns separate.
    raw = "\n".join(page.get_text("text") for page in doc)
    raw = re.sub(r"\u00ad[‐-]\s*\n\s*", "", raw).replace("\u00ad", "")
    raw = re.sub(r"[‐-]\s*\n\s*(?=[а-яё])", "", raw)
    raw = raw.replace("\xa0", " ").replace("\u202f", " ")
    raw = re.sub(r"(?m)^\s*(?:\d\d\.\d\d\.\d{4}.*|РЕШУ ОГЭ — физика|https?://phys-oge\.sdamgia\.ru/.*|phys-oge\.sdamgia\.ru/.*|\d+/\d+)\s*$", "", raw)
    chunks = HEAD.split(raw)
    tasks = []
    for index in range(1, len(chunks), 2):
        number, body = int(chunks[index]), chunks[index + 1]
        lm, rm = list(LEFT.finditer(body)), list(RIGHT.finditer(body))
        if len(lm) != 3 or len(rm) not in (4, 5):
            raise ValueError(f"Invalid matching table in task {number}")
        prompt, left_title = split_title(body[:lm[0].start()])
        last_left, right_title = split_title(body[lm[-1].end():rm[0].start()])
        left = [
            {"id": "АБВ"[i], "text": clean(body[match.end():lm[i + 1].start()]) if i < 2 else last_left}
            for i, match in enumerate(lm)
        ]
        right = []
        for i, match in enumerate(rm):
            item = body[match.end():rm[i + 1].start() if i + 1 < len(rm) else len(body)]
            # Exclude the printed empty answer table and trailing instruction.
            item = re.split(r"\n\s*(?:Запишите в ответ|[АA]\s*\n\s*Б\s*\n\s*[ВB])", item)[0]
            right.append({"id": match[1], "text": clean(item)})
        if number not in SECTIONS or any(not item["text"] for item in left + right):
            raise ValueError(f"Incomplete task {number}")
        # These fractions are vector paths, absent from the PDF text layer.
        if number == 29829:
            right[1]["text"] = "джоуль на килограмм (1 Дж/кг)"
            right[2]["text"] = "джоуль на килограмм–градус Цельсия (1 Дж/(кг · °C))"
            right[3]["text"] = "джоуль на градус Цельсия (1 Дж/°C)"
        if number == 748:
            for item in left:
                item["text"] = item["text"].replace("B", "В")
            right_title = "Наименование в СИ"
        tasks.append({
            "id": f"oge-1-{number}", "type": 1, "sourceNo": number,
            "label": "Задача 1 ОГЭ", "kind": "matching",
            "section": SECTIONS[number][0], "sections": SECTIONS[number],
            "text": prompt, "leftTitle": left_title, "rightTitle": right_title,
            "left": left, "right": right, "source": path.name,
        })
    if len(tasks) != 61 or len({task["id"] for task in tasks}) != 61:
        raise ValueError("Expected 61 unique tasks in the supplied PDF")
    return tasks


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Pass the type-1 PDF path")
    tasks = extract(Path(sys.argv[1]))
    (ROOT / "app" / "oge-task-data-1.mjs").write_text(
        "// Imported from the user-supplied type-1 PDF. The source contains no answer keys.\n"
        + "export const ogeMatchingTasks=" + json.dumps(tasks, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Imported {len(tasks)} matching tasks")
