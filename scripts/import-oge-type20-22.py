"""Import the nine supplied calculation PDFs using reviewed conditions and keys.

Usage: python3 scripts/import-oge-type20-22.py /path/to/upload
Requires PyMuPDF, as do the previous native-PDF importers. The content manifest
restores inline formulas lost by PDF text extraction; original figure paths are
cropped from the supplied PDFs, never redrawn. Source answers are referenced per
problem, and units in the manifest are the units expected in the answer field.
"""
import importlib.util,json,sys
from pathlib import Path
import fitz
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('native',ROOT/'scripts/import-oge-type4.py')
native=importlib.util.module_from_spec(spec);spec.loader.exec_module(native)

def main(folder):
 records=json.loads((ROOT/'scripts/oge-type20-22-content.json').read_text())
 assert len(records)==243
 seen=set();documents={};packs={20:[],21:[],22:[]}
 for record in records:
  t={k:v for k,v in record.items() if k!='clips'}
  kind=t['type'];n=t['sourceNo'];identity=(kind,n)
  assert identity not in seen;seen.add(identity)
  t.update(id=f'oge-{kind}-{n}',label=f'Задача {kind} ОГЭ',kind='calculation',difficulty='ВЫСОКИЙ',answerFormat='Развёрнутый ответ',xp=40,figures=[])
  assert isinstance(t['answer'],(float,int)) and len(t['text'])>50
  for index,clip in enumerate(record['clips'],1):
   source=clip['source'];assert source==t['source']
   if source not in documents:documents[source]=fitz.open(folder/source)
   asset=ROOT/'public/oge-figures'/f'oge-{kind}-{n}-{index}.svg'
   native.native_crop(documents[source],clip['page'],clip['rect'],asset)
   asset.write_text(asset.read_text().replace('#d1d14e','#ffc34e'))
   t['figures'].append('/oge-figures/'+asset.name)
  packs[kind].append(t)
 assert [len(packs[k]) for k in [20,21,22]]==[76,79,88]
 for kind,tasks in packs.items():
  (ROOT/f'app/oge-task-data-{kind}.mjs').write_text('// Imported calculation tasks; original figures and reviewed numerical keys.\nexport const ogeType'+str(kind)+'Tasks='+json.dumps(tasks,ensure_ascii=False,indent=2)+'\n')
 print('Imported 243 high-difficulty tasks: type 20 = 76, type 21 = 79, type 22 = 88; 41 original figures.')
if __name__=='__main__':main(Path(sys.argv[1]))
