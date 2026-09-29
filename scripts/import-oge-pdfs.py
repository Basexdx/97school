"""Import the user supplied type 14–16 OGE print PDFs and recolor their figures.

Run: python3 scripts/import-oge-pdfs.py /path/to/14_Механика.pdf ...
Requires PyMuPDF, Pillow and NumPy. The PDFs are source material, not checked in.
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

import fitz
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "oge-figures"
OUTPUT = ROOT / "app" / "oge-task-data-14-16.mjs"
HEADING = re.compile(r"(?m)^\s*\d+\.\s+Тип\s+(14|15|16)\s+№\s+(\d+)\s+i\s*$")
BLOCK_HEADING = re.compile(r"Тип\s+(14|15|16)\s+№\s+(\d+)")
CHOICE = re.compile(r"(?m)^\s*([1-5])\)\s*")


def clean_text(value):
    value = value.replace("\u00ad", "").replace("\u202f", " ").replace("\xa0", " ")
    value = re.sub(r"(?<=[А-Яа-яЁё]) {2,}(?=[а-яё])", "", value)
    return re.sub(r"\s+", " ", value).strip()


def extract_text(doc, filename):
    raw = "\n".join(page.get_text("text", sort=True) for page in doc)
    raw = re.sub(r"\u00ad[‐-]\s*\n\s*", "", raw).replace("\u00ad", "")
    raw = re.sub(r"[‐-]\s*\n\s*(?=[а-яё])", "", raw)
    raw = raw.replace("\xa0", " ").replace("\u202f", " ")
    raw = re.sub(
        r"(?m)^\s*(?:\d\d\.\d\d\.\d{4}.*|РЕШУ ОГЭ — физика|https?://phys-oge\.sdamgia\.ru/.*|\d+/\d+)\s*$",
        "",
        raw,
    )
    chunks = HEADING.split(raw)
    if len(chunks) % 3 != 1:
        raise ValueError(f"Cannot split tasks in {filename}")
    tasks = []
    for index in range(1, len(chunks), 3):
        kind, number = int(chunks[index]), int(chunks[index + 1])
        body = chunks[index + 2]
        matches = list(CHOICE.finditer(body))
        if [int(match[1]) for match in matches] == list(range(1, len(matches) + 1)) and len(matches) in (4, 5):
            prompt = clean_text(body[: matches[0].start()])
            options = [
                clean_text(body[match.end(): matches[option + 1].start() if option + 1 < len(matches) else len(body)])
                for option, match in enumerate(matches)
            ]
        else:
            prompt, options = clean_text(body), []
        tasks.append({
            "id": f"oge-{kind}-{number}",
            "type": kind,
            "sourceNo": number,
            "label": f"Задача {kind} ОГЭ",
            "section": "Механика" if "Механик" in filename else "Тепловые явления",
            "text": prompt,
            "options": options,
            "figures": [],
            "kind": "choice",
            "source": filename,
        })
    return tasks


def repair_vector_options(tasks):
    by_id = {task["id"]: task for task in tasks}
    by_id["oge-14-5140"]["text"] = "На рисунке представлены графики зависимости проекции скорости Vₓ от времени t для четырёх тел, движущихся вдоль оси Ox. Используя рисунок, выберите два верных утверждения."
    by_id["oge-14-5140"]["options"] = [
        "Тело 2 движется с постоянным ускорением.",
        "Тело 4 находится в состоянии покоя.",
        "От начала отсчёта до момента времени, соответствующего точке А на графике, тело 3 по сравнению с телом 1 прошло больший путь.",
        "Точка В на графике соответствует встрече тел 2 и 3.",
        "Тело 1 начало своё движение из начала координат.",
    ]
    # Four mathematical choice labels are drawn as vector outlines in the PDFs.
    by_id["oge-15-25100"]["options"] = ["(17 ± 1) см", "(18 ± 5) см", "(9 ± 5) см", "(80 ± 5) см"]
    by_id["oge-15-29750"]["options"] = ["60 мл", "(60 ± 15) мл", "(60 ± 5) мл", "(70 ± 15) мл"]
    by_id["oge-15-29629"]["options"] = ["(39 ± 1) °C", "(39,0 ± 0,5) °C", "(39,3 ± 0,1) °C", "(39,30 ± 1) °C"]
    by_id["oge-15-29705"]["options"] = ["(50 ± 2) °C", "(45 ± 5) °C", "(10 ± 2) °C", "(10 ± 1) °C"]
    by_id["oge-16-1638"]["options"][3] = "За первые 10 минут наблюдения вода в алюминиевом стакане остыла на 55 °C."


def themed_image(page, clip, dest):
    pix = page.get_pixmap(matrix=fitz.Matrix(3, 3), clip=clip, alpha=False)
    rgb = np.asarray(Image.frombytes("RGB", (pix.width, pix.height), pix.samples)).astype(np.float32)
    light = np.min(rgb, axis=2) / 255
    ink = (1 - light) ** 0.8
    base = np.array([5, 22, 41], dtype=np.float32)
    foreground = np.broadcast_to(np.array([225, 239, 253], dtype=np.float32), rgb.shape).copy()
    orange = (rgb[:, :, 0] > rgb[:, :, 2] * 1.27) & (rgb[:, :, 0] > rgb[:, :, 1] * 1.09)
    blue = (rgb[:, :, 2] > rgb[:, :, 0] * 1.2) & (rgb[:, :, 2] > rgb[:, :, 1] * 1.07)
    foreground[orange] = [255, 181, 72]
    foreground[blue] = [84, 196, 255]
    recolored = np.clip(base + (foreground - base) * ink[:, :, None], 0, 255).astype("uint8")
    result = Image.fromarray(recolored)
    result.save(dest, "WEBP", quality=88, method=5)
    if not dest.stat().st_size:
        result.save(dest, "WEBP", quality=88, method=4)
    if not dest.stat().st_size:
        raise ValueError(f"Could not render figure {dest}")


def extract_figures(doc, tasks):
    by_id = {task["id"]: task for task in tasks}
    current = None
    for page_number, page in enumerate(doc):
        headings = []
        blocks = page.get_text("dict")["blocks"]
        for block in blocks:
            if block["type"] != 0:
                continue
            text = " ".join(span["text"] for line in block["lines"] for span in line["spans"])
            text = text.replace("\xa0", " ").replace("\u202f", " ")
            match = BLOCK_HEADING.search(text)
            if match:
                headings.append((block["bbox"][1], f"oge-{match[1]}-{match[2]}"))
        headings.sort()
        regions = []
        if current:
            regions.append((current, 55, headings[0][0] if headings else 790))
        regions += [
            (task_id, y + 21, headings[i + 1][0] if i + 1 < len(headings) else 790)
            for i, (y, task_id) in enumerate(headings)
        ]
        if headings:
            current = headings[-1][1]
        drawings = page.get_drawings()
        images = [block for block in blocks if block["type"] == 1]
        for task_id, top, bottom in regions:
            rects = [
                item["rect"] for item in drawings
                if item["rect"].x0 > 75 and item["rect"].x1 > 80
                and top <= item["rect"].y0 < bottom and item["rect"].y1 <= bottom + 1
                and item["rect"].width < 500
                and max(item["rect"].width, item["rect"].height) >= 12
            ]
            rects += [
                fitz.Rect(block["bbox"]) for block in images
                if block["bbox"][2] - block["bbox"][0] > 25
                and block["bbox"][0] > 75 and top <= block["bbox"][1] < bottom
            ]
            if not rects:
                continue
            union = fitz.Rect(
                min(rect.x0 for rect in rects), min(rect.y0 for rect in rects),
                max(rect.x1 for rect in rects), max(rect.y1 for rect in rects),
            )
            if union.width < 9 or union.height < 9:
                continue
            clip = (union + (-5, -10, 8, 8)) & page.rect
            if task_id == "oge-15-25100":
                clip = fitz.Rect(145, 322, 455, 422)
            if task_id == "oge-16-1638":
                clip = fitz.Rect(180, 92, 440, 230)
            if task_id == "oge-16-238":
                clip = fitz.Rect(205, 425, 395, 603)
            if task_id == "oge-16-31669":
                clip = fitz.Rect(205, 91, 395, 260)
            if task_id == "oge-16-31683":
                clip = fitz.Rect(90, 450, 525, 628)
            name = f"{task_id}-{page_number + 1}.webp"
            themed_image(page, clip, ASSETS / name)
            by_id[task_id]["figures"].append(f"/oge-figures/{name}")


def main(paths):
    ASSETS.mkdir(exist_ok=True)
    tasks = []
    for path in paths:
        doc = fitz.open(path)
        imported = extract_text(doc, path.name)
        extract_figures(doc, imported)
        tasks += imported
        print(path.name, len(imported), "tasks,", sum(len(task["figures"]) for task in imported), "figures")
    if len({task["id"] for task in tasks}) != len(tasks):
        raise ValueError("Duplicate task IDs")
    repair_vector_options(tasks)
    bad = [task["id"] for task in tasks if len(task["options"]) != (4 if task["type"] == 15 else 5)]
    if bad:
        raise ValueError(f"Missing choice labels: {bad}")
    OUTPUT.write_text(
        "// Imported from six user supplied OGE print PDFs. Answers are not present in the source.\n"
        + "export const ogeImportedTasks=" + json.dumps(tasks, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    print(len(tasks), "tasks in all,", sum(len(task["figures"]) for task in tasks), "figures")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("Pass the PDF paths to import")
    main([Path(item) for item in sys.argv[1:]])
