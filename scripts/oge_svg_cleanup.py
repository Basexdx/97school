"""Remove the outlined source footer, preserving scientific labels and geometry."""
import xml.etree.ElementTree as ET

def remove_source_footer(root):
    # The PDF footer is a contiguous run of 9–10 translucent outlined glyphs.
    # Single translucent shapes belong to the diagram and must remain.
    removed = 0
    for parent in list(root.iter()):
        run = []
        for child in list(parent) + [ET.Element('end')]:
            if child.tag.endswith('path') and child.get('fill-opacity') == '.4':
                run.append(child)
            else:
                if len(run) >= 9:
                    for glyph in run:
                        parent.remove(glyph)
                        removed += 1
                run = []
    return removed

if __name__ == '__main__':
    import sys
    from pathlib import Path
    ET.register_namespace('', 'http://www.w3.org/2000/svg')
    ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
    for name in sys.argv[1:]:
        path = Path(name)
        root = ET.fromstring(path.read_text())
        if remove_source_footer(root):
            path.write_text(ET.tostring(root, encoding='unicode'))
