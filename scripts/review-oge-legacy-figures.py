"""Restore reviewed legacy figure bounds from the six supplied type 14–16 PDFs.

Run: python3 scripts/review-oge-legacy-figures.py /path/to/upload
Only figure URLs change; conditions, choices, answer keys and statuses stay intact.
Disconnected panels retain their original relative scale. Tables and diagrams
separated by source prose get separate figures. Reviewed bounds include all labels.
"""
import importlib.util
import json
import sys
from collections import defaultdict
from pathlib import Path
import xml.etree.ElementTree as ET
import fitz

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('native', ROOT / 'scripts/import-oge-type4.py')
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)


def remove_clipped_footer(root):
    # Reviewed crops can retain a fragment of the translucent source watermark.
    # Individual translucent shapes belong to the diagram and must remain.
    for parent in list(root.iter()):
        run = []
        for child in list(parent) + [ET.Element('end')]:
            if child.tag.endswith('path') and child.get('fill-opacity') == '.4':
                run.append(child)
            else:
                if len(run) >= 4:
                    for glyph in run:
                        parent.remove(glyph)
                run = []


def main(folder):
    records = json.loads((ROOT / 'scripts/oge-reviewed-legacy-figures.json').read_text())
    documents, figures = {}, defaultdict(list)
    for record in records:
        source = record['source']
        if source not in documents:
            documents[source] = fitz.open(folder / source)
        name = f"{record['id']}-reviewed-{record['page']}-{record['index']}.svg"
        destination = ROOT / 'public/oge-figures' / name
        native.native_crop(documents[source], record['page'], record['rect'], destination)
        svg = ET.fromstring(destination.read_text())
        remove_clipped_footer(svg)
        destination.write_text(ET.tostring(svg, encoding='unicode').replace('#d1d14e', '#ffc34e'))
        figures[record['id']].append('/oge-figures/' + name)
    data_file = ROOT / 'app/oge-task-data-14-16.mjs'
    source = data_file.read_text()
    start = source.index('[')
    tasks = json.loads(source[start:])
    for task in tasks:
        if task['id'] in figures:
            task['figures'] = figures[task['id']]
    data_file.write_text(source[:start] + json.dumps(tasks, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'{len(records)} restored vector figures across {len(figures)} tasks; answer keys unchanged.')


if __name__ == '__main__':
    main(Path(sys.argv[1]))
