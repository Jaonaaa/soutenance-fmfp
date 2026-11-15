"""Build the local 29-page revision while preserving existing native slide artwork.

Run from soutenance with:
uv run --with python-pptx --with python-docx --python 3.12 python scripts/export-reserves-deck.py
Then convert the resulting PPTX to PDF with LibreOffice and render with the Swift helper.
"""

from pathlib import Path
import json
import re
import argparse
import shutil
from html import escape

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches as DocxInches, Pt as DocxPt
from docx.shared import RGBColor as DocxColor
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.text import PP_ALIGN
from pptx.oxml.xmlchemy import OxmlElement
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / 'output/canva-style-v1-refined/Soutenance_FMFP_29_diapos_illustree.pptx'
OUT = ROOT.parent / 'output/soutenance-reserves-20261107'
SLIDES = json.loads((ROOT / 'src/data/slides.json').read_text())
BG, BLUE, INK, MUTED = 'F8F6F0', '2D5AA6', '202224', '70716B'
WHITE, PALE, LINE, WARM = 'FFFEFB', 'E6ECF5', 'DEDCD4', 'FAEFE0'
SVG_COMMANDS = None


def svg(command):
    if SVG_COMMANDS is not None:
        SVG_COMMANDS.append(command)


def text(slide, value, x, y, w, h, size=14, color=INK, font='Nunito', bold=False, italic=False, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    for i, line in enumerate(value.split('\n')):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text, p.alignment, p.line_spacing = line, align, 1.08
        p.space_after = Pt(2)
        for run in p.runs:
            run.font.name, run.font.size = font, Pt(size)
            run.font.color.rgb = RGBColor.from_string(color)
            run.font.bold, run.font.italic = bold, italic
        anchor = 'middle' if align == PP_ALIGN.CENTER else 'end' if align == PP_ALIGN.RIGHT else 'start'
        xx = x + (w / 2 if anchor == 'middle' else w if anchor == 'end' else 0)
        yy = y * 120 + size * 120 / 72 * .94 + i * (size * 1.08 + 2) * 120 / 72
        svg(f'<text x="{xx*120:.2f}" y="{yy:.2f}" fill="#{color}" font-family="{font}, Arial, sans-serif" font-size="{size*120/72:.2f}" font-weight="{700 if bold else 400}" font-style="{"italic" if italic else "normal"}" text-anchor="{anchor}">{escape(line)}</text>')
    return box


def rect(slide, x, y, w, h, fill, border=LINE, rounded=True):
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE,
        Inches(x), Inches(y), Inches(w), Inches(h),
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = RGBColor.from_string(fill)
    shape.line.color.rgb = RGBColor.from_string(border)
    shape.line.width = Pt(.7)
    shape._element.spPr.append(OxmlElement('a:effectLst'))
    for reference in shape._element.xpath('.//a:effectRef'):
        reference.set('idx', '0')
    if rounded:
        shape.adjustments[0] = .08
    svg(f'<rect x="{x*120:.2f}" y="{y*120:.2f}" width="{w*120:.2f}" height="{h*120:.2f}" rx="{min(w,h)*.12*120 if rounded else 0:.2f}" fill="#{fill}" stroke="#{border}" stroke-width="1.17"/>')
    return shape


def line(slide, x1, y1, x2, y2, color=LINE, width=.7):
    shape = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(x1), Inches(y1), Inches(x2), Inches(y2))
    shape.line.color.rgb, shape.line.width = RGBColor.from_string(color), Pt(width)
    shape._element.spPr.append(OxmlElement('a:effectLst'))
    for reference in shape._element.xpath('.//a:effectRef'):
        reference.set('idx', '0')
    svg(f'<path d="M{x1*120:.2f} {y1*120:.2f}L{x2*120:.2f} {y2*120:.2f}" fill="none" stroke="#{color}" stroke-width="{width*120/72:.2f}" stroke-linecap="round"/>')


def circle(slide, x, y, r, fill=WHITE, edge=BLUE, width=1.5):
    shape = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x-r), Inches(y-r), Inches(r*2), Inches(r*2))
    shape.fill.solid()
    shape.fill.fore_color.rgb = RGBColor.from_string(fill)
    shape.line.color.rgb, shape.line.width = RGBColor.from_string(edge), Pt(width)
    shape._element.spPr.append(OxmlElement('a:effectLst'))
    for reference in shape._element.xpath('.//a:effectRef'):
        reference.set('idx', '0')
    svg(f'<circle cx="{x*120:.2f}" cy="{y*120:.2f}" r="{r*120:.2f}" fill="#{fill}" stroke="#{edge}" stroke-width="{width*120/72:.2f}"/>')


def document_icon(slide, x, y, w=.62, h=.8):
    rect(slide, x, y, w, h, WHITE, BLUE)
    for i, fraction in enumerate([.62, .62, .40]):
        yy = y+h*(.30+i*.21)
        line(slide, x+w*.20, yy, x+w*(.20+fraction), yy, '8DA8CF', 1.3)


def arrow(slide, points, color=BLUE, width=1.5):
    for a, b in zip(points, points[1:]):
        line(slide, *a, *b, color, width)
    x, y = points[-1]
    dx, dy = points[-1][0]-points[-2][0], points[-1][1]-points[-2][1]
    norm = (dx*dx+dy*dy)**.5
    ux, uy = dx/norm, dy/norm
    for side in [-1, 1]:
        line(slide, x, y, x-.1*ux+side*.065*uy, y-.1*uy-side*.065*ux, color, width)


def bubble(slide, x, y, w, h, fill=WHITE, label=None, edge=BLUE):
    rect(slide, x, y, w, h, fill, edge)
    line(slide, x+.18, y+h, x+.1, y+h+.12, edge, 1.2)
    line(slide, x+.1, y+h+.12, x+.35, y+h, edge, 1.2)
    if label:
        text(slide, label, x+.05, y+.12, w-.10, h-.12, 10.5, edge, bold=True, align=PP_ALIGN.CENTER)
    else:
        for i in range(2):
            line(slide, x+.13, y+.12+i*.12, x+w-.13-(.13 if i else 0), y+.12+i*.12, '8DA8CF', 1.1)


def polygon(slide, points, fill=WHITE, edge=BLUE, width=1.4):
    coordinates = [(round(x*914400), round(y*914400)) for x, y in points]
    builder = slide.shapes.build_freeform(*coordinates[0])
    builder.add_line_segments(coordinates[1:], close=True)
    shape = builder.convert_to_shape()
    shape.fill.solid()
    shape.fill.fore_color.rgb = RGBColor.from_string(fill)
    shape.line.color.rgb, shape.line.width = RGBColor.from_string(edge), Pt(width)
    shape._element.spPr.append(OxmlElement('a:effectLst'))
    for reference in shape._element.xpath('.//a:effectRef'):
        reference.set('idx', '0')
    points_string = ' '.join(f'{x*120:.2f},{y*120:.2f}' for x, y in points)
    svg(f'<polygon points="{points_string}" fill="#{fill}" stroke="#{edge}" stroke-width="{width*120/72:.2f}" stroke-linejoin="round"/>')


def rounded_stroke(slide, points, color='FFFFFF', width=2.7):
    """One continuous editable path, with identical rounded joins in SVG and PPTX."""
    coordinates = [(round(x*914400), round(y*914400)) for x, y in points]
    builder = slide.shapes.build_freeform(*coordinates[0])
    builder.add_line_segments(coordinates[1:], close=False)
    shape = builder.convert_to_shape()
    shape.fill.background()
    shape.line.color.rgb, shape.line.width = RGBColor.from_string(color), Pt(width)
    shape._element.spPr.ln.set('cap', 'rnd')
    shape._element.spPr.ln.append(OxmlElement('a:round'))
    shape._element.spPr.append(OxmlElement('a:effectLst'))
    for reference in shape._element.xpath('.//a:effectRef'):
        reference.set('idx', '0')
    points_string = ' '.join(f'{x*120:.2f},{y*120:.2f}' for x, y in points)
    svg(f'<polyline points="{points_string}" fill="none" stroke="#{color}" stroke-width="{width*120/72:.2f}" stroke-linecap="round" stroke-linejoin="round"/>')


def status_badge(slide, x, y, ink, reserve):
    # A white rim keeps the symbol separate from the folder outline and return arrow.
    circle(slide, x, y, .36, 'FFFFFF', 'FFFFFF', .3)
    circle(slide, x, y, .315, ink, ink, .6)
    if reserve:
        rounded_stroke(slide, [(x,y-.15),(x,y+.035)], width=2.6)
        circle(slide, x, y+.155, .024, 'FFFFFF', 'FFFFFF', .1)
    else:
        rounded_stroke(slide, [(x-.145,y),(x-.045,y+.10),(x+.16,y-.13)], width=2.7)


def curved_arrow(slide, p0, p1, p2, p3, color=BLUE, width=1.5):
    points = []
    for i in range(33):
        t = i/32
        points.append(tuple((1-t)**3*p0[k]+3*(1-t)**2*t*p1[k]+3*(1-t)*t*t*p2[k]+t**3*p3[k] for k in range(2)))
    arrow(slide, points, color, width)


def replace_text(shape, value):
    """Keep the source typography, positions and native illustration shapes."""
    p = shape.text_frame.paragraphs[0]
    if not p.runs:
        p.add_run()
    p.runs[0].text = value
    for run in p.runs[1:]:
        run.text = ''
    for extra in list(shape.text_frame.paragraphs)[1:]:
        extra._p.getparent().remove(extra._p)


def comparison_slide(prs):
    global SVG_COMMANDS
    SVG_COMMANDS = []
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = RGBColor.from_string(BG)
    svg(f'<rect width="1600" height="900" fill="#{BG}"/>')
    text(slide, '01 · UN DOSSIER, DEUX UTILISATEURS', .83, .43, 11.5, .25, 9.5, MUTED)
    text(slide, 'Réserves et délais', .83, .86, 11.9, .48, 22, font='Playfair Display', italic=True)
    text(slide, 'Aucun commentaire de réserve', .85, 1.75, 5.10, .38, 13, BLUE, bold=True, align=PP_ALIGN.CENTER)
    text(slide, '2 commentaires de réserve ou plus', 7.45, 1.75, 5.02, .38, 13, 'A96C36', bold=True, align=PP_ALIGN.CENTER)

    def dossier(cx, cy, reserve=False):
        pale = WARM if reserve else 'EDF2FA'
        ink = 'B8793E' if reserve else BLUE
        row_ink = 'C49B72' if reserve else '8DA8CF'
        circle(slide, cx, cy+.07, 1.22, pale, pale, .5)
        # Folder tab, generous white page and folded corner: one readable hero illustration.
        polygon(slide, [(cx-1.00,cy-.32),(cx-.48,cy-.32),(cx-.28,cy-.13),
                        (cx+1.00,cy-.13),(cx+1.00,cy+1.0),(cx-1.00,cy+1.0)], pale, ink)
        if reserve:
            polygon(slide, [(cx-.82,cy-1.16),(cx+.34,cy-1.16),(cx+.58,cy-.92),
                            (cx+.58,cy+.60),(cx-.82,cy+.60)], WHITE, 'CBA982', .9)
        polygon(slide, [(cx-.69,cy-1.05),(cx+.45,cy-1.05),(cx+.71,cy-.79),
                        (cx+.71,cy+.65),(cx-.69,cy+.65)], WHITE, ink)
        line(slide, cx+.45, cy-1.05, cx+.45, cy-.79, ink, 1.3)
        line(slide, cx+.45, cy-.79, cx+.71, cy-.79, ink, 1.3)
        rect(slide, cx-.45, cy-.59, .84, .12, pale, ink if reserve else pale, False)
        line(slide, cx-.45, cy-.27, cx+.37, cy-.27, row_ink, 1.8)
        line(slide, cx-.45, cy-.02, cx+.14, cy-.02, row_ink, 1.8)
        polygon(slide, [(cx-1.06,cy+.30),(cx-.10,cy+.30),(cx+.05,cy+.15),
                        (cx+1.03,cy+.15),(cx+.87,cy+1.00),(cx-.96,cy+1.00)], pale, ink)
        line(slide, cx-.64, cy+.64, cx+.39, cy+.64, row_ink, 1.4)
        # Matching, prominent state badges distinguish the two groups at a glance.
        status_badge(slide, cx+.78, cy+.70, ink, reserve)
        if reserve:
            bubble(slide, cx+.45, cy-.96, 1.08, .53, WHITE, label='Réserve', edge=ink)
            bubble(slide, cx+.88, cy-.12, .94, .44, 'FFF9F0', label='À préciser', edge=ink)
            curved_arrow(slide, (cx+.35,cy+1.02), (cx-1.54,cy+1.54),
                         (cx-1.86,cy-.29), (cx-1.08,cy-.70), 'B8793E', 1.8)

    dossier(3.37, 3.28)
    dossier(9.50, 3.28, reserve=True)
    # The comparison is read in three figures, without a second chart or detailed table.
    text(slide, '7,95', .85, 4.84, 5.10, .75, 42, BLUE, font='Playfair Display', align=PP_ALIGN.CENTER)
    text(slide, '18,81', 7.45, 4.84, 5.02, .75, 42, 'B8793E', font='Playfair Display', align=PP_ALIGN.CENTER)
    text(slide, 'jours', .85, 5.60, 5.10, .28, 12, MUTED, align=PP_ALIGN.CENTER)
    text(slide, 'jours', 7.45, 5.60, 5.02, .28, 12, MUTED, align=PP_ALIGN.CENTER)
    text(slide, '+10,86 j', 5.45, 2.91, 2.1, .45, 22, 'A96C36', font='Playfair Display', italic=True, align=PP_ALIGN.CENTER)
    arrow(slide, [(5.40,3.48),(7.45,3.48)], 'B8793E', 1.1)
    arrow(slide, [(7.45,3.48),(5.40,3.48)], 'B8793E', 1.1)
    text(slide, 'écart moyen observé', 5.36, 3.68, 2.2, .24, 9.1, MUTED, align=PP_ALIGN.CENTER)

    text(slide, 'OBJECTIF DE L’ASSISTANCE', .85, 6.02, 11.62, .25, 9, BLUE, bold=True, align=PP_ALIGN.CENTER)
    text(slide, 'Limiter les réserves évitables', .85, 6.36, 11.62, .45, 22, BLUE, font='Caveat', align=PP_ALIGN.CENTER)
    text(slide, 'Moyennes calendaires observées · Effet de l’IA à mesurer · Mémoire, § 9.5', .85, 7.06, 10.7, .22, 8.2, MUTED)
    line(slide, 11.44, 7.19, 11.8, 7.19, BLUE, 2)
    text(slide, '06', 11.81, 6.98, .6, .3, 13, bold=True)
    artwork = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" aria-labelledby="title desc">'
               '<title id="title">Réserves et délais</title>'
               '<desc id="desc">77 dossiers sans commentaire de réserve : 7,95 jours en moyenne. '
               '51 dossiers avec au moins deux commentaires : 18,81 jours. Écart : 10,86 jours. '
               'Les durées sont des moyennes calendaires, attentes comprises. '
               'Les dessins illustrent les échanges de correction; ils ne reconstituent pas des cycles mesurés.</desc>'
               + ''.join(SVG_COMMANDS) + '</svg>')
    for destination in [ROOT/'public/img/reserves-delais.svg', ROOT/'img/reserves-delais.svg']:
        destination.write_text(artwork+'\n')
    SVG_COMMANDS = None
    return slide


def update_pilot(slide):
    replacements = {
        'Erreurs évitables': 'Omissions à corriger',
        'Cycles de correction': 'Réserves évitables',
        'Références valides': 'Problèmes importants manqués',
        'Problèmes importants détectés': 'Pertinence des comparables',
        'Effort total': 'Effort de traitement',
        'Temps de préparation': 'Temps actif hors attentes',
        'Temps de vérification': 'Cycles de correction',
        'Coût par dossier': 'Délais de correction',
        'Pilote proposé : dossiers annotés, avec et sans assistance.':
            'Pilote : dossiers similaires (difficulté, guichet), avec et sans assistance.',
    }
    # The nine original pills remain native editable shapes, with enough width for the revised labels.
    for index in [16, 17, 18, 19, 20, 21, 33, 34, 35, 36, 37, 38, 49, 50, 51, 52, 53, 54]:
        slide.shapes[index].width = Inches(3.04)
    for shape in slide.shapes:
        if shape.has_text_frame and shape.text in replacements:
            replace_text(shape, replacements[shape.text])
        if shape.has_text_frame and shape.text in ['Problèmes importants manqués', 'Pertinence des comparables', 'Temps actif hors attentes']:
            for run in shape.text_frame.paragraphs[0].runs:
                run.font.size = Pt(10.2)


def compact_word_styles(doc):
    """Use readable document-sized headings consistently in the handout."""
    for name, size, color, before, after in [
        ('Normal', 11, INK, 0, 5),
        ('Title', 18, BLUE, 0, 9),
        ('Heading 1', 14, BLUE, 9, 5),
        ('Heading 2', 11.5, BLUE, 7, 3),
        ('Heading 3', 11, INK, 6, 3),
        ('List Bullet', 11, INK, 0, 3),
        ('Caption', 8.5, MUTED, 0, 4),
        ('Header', 9, MUTED, 0, 0),
        ('Footer', 8.5, MUTED, 0, 0),
    ]:
        style = doc.styles[name]
        style.font.name, style.font.size = 'Inter', DocxPt(size)
        style.font.color.rgb = DocxColor.from_string(color)
        fmt = style.paragraph_format
        fmt.space_before, fmt.space_after = DocxPt(before), DocxPt(after)
        fmt.line_spacing, fmt.widow_control = 1.15, True
        if name == 'Title' or name.startswith('Heading'):
            style.font.bold = True
            fmt.keep_with_next = True
    doc.styles['List Bullet'].paragraph_format.left_indent = DocxInches(.16)
    doc.styles['List Bullet'].paragraph_format.first_line_indent = DocxInches(-.10)


def save_word(doc, path):
    temporary = path.with_name(path.stem + '.tmp.docx')
    doc.save(temporary)
    temporary.replace(path)


def export_handout():
    path = ROOT / 'Soutenance_FMFP_complete.docx'
    source = (ROOT / 'Contenu_soutenance_par_diapositive.md').read_text()
    sections = list(re.finditer(r'^## (\d{2}) \| ([^\n]+)', source, re.M))
    if len(sections) != len(SLIDES):
        raise ValueError('The Word source must contain all 29 numbered slide sections')
    # Fail before touching the existing Word file if a preview is missing or misplaced.
    for i, (section, slide) in enumerate(zip(sections, SLIDES)):
        if int(section[1]) != slide['number'] or section[2] != slide['title']:
            raise ValueError(f"Word heading does not match slide {slide['number']}")
        block = source[section.end():sections[i+1].start() if i+1 < len(sections) else len(source)]
        images = re.findall(r'^!\[.*?\]\((.*?)\)$', block, re.M)
        expected = f"public/slides-hifi/slide-{slide['number']:02}.jpg"
        if images != [expected] or not (ROOT / expected).is_file():
            raise ValueError(f"Missing or duplicated preview for slide {slide['number']}")
    template = path if path.exists() else ROOT / 'Contenu_soutenance_par_diapositive.docx'
    doc = Document(template) if template.exists() else Document()
    for child in list(doc._element.body):
        if not child.tag.endswith('sectPr'):
            doc._element.body.remove(child)
    compact_word_styles(doc)
    for row in source.splitlines():
        if not row.strip():
            continue
        image = re.fullmatch(r'!\[(.*?)\]\((.*?)\)', row)
        if image:
            section = doc.sections[-1]
            available_width = section.page_width - section.left_margin - section.right_margin
            picture = doc.add_picture(str(ROOT / image[2]), width=min(available_width, DocxInches(5.4)))
            picture._inline.docPr.set('descr', image[1])
            paragraph = doc.paragraphs[-1]
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            paragraph.paragraph_format.space_after = DocxPt(8)
            paragraph.paragraph_format.keep_with_next = True
            continue
        heading = re.match(r'^(#{1,3}) (.*)', row)
        if heading:
            paragraph = doc.add_heading(heading[2], level=len(heading[1]) - 1)
            numbered = re.match(r'^(\d{2}) \| ', heading[2])
            if numbered and int(numbered[1]) > 1:
                paragraph.paragraph_format.page_break_before = True
            if heading[2] == 'Scénario de démonstration':
                paragraph.paragraph_format.page_break_before = True
        else:
            doc.add_paragraph(row[2:] if row.startswith('- ') else row, style='List Bullet' if row.startswith('- ') else None)
    if len(doc.inline_shapes) != 29:
        raise ValueError('Refusing to save a presentation document without its 29 slide images')
    save_word(doc, path)
    for alias in ['Contenu_soutenance_par_diapositive.docx', 'Contenu_soutenance_par_diapositive_illustre.docx']:
        shutil.copyfile(path, ROOT / alias)


def export_word_documents():
    export_handout()


def main():
    if len(SLIDES) != 29 or len({s['id'] for s in SLIDES}) != 29:
        raise ValueError('Expected 29 unique source slides')
    prs = Presentation(SOURCE)
    originals = {f'slide-{i:02}': slide for i, slide in enumerate(prs.slides, 1)}
    original_ids = {f'slide-{i:02}': element for i, element in enumerate(prs.slides._sldIdLst, 1)}
    new = comparison_slide(prs)
    new_id = prs.slides._sldIdLst[-1]
    update_pilot(originals['slide-27'])
    # Carry forward the current retombées heading, already revised in the local source.
    retombees = next(s for s in SLIDES if s['id'] == 'slide-19')
    for shape in originals['slide-19'].shapes:
        if shape.has_text_frame and shape.text == 'Je transforme le conseil en cible vérifiable':
            replace_text(shape, retombees['title'])
    for s in SLIDES:
        native = new if s['id'] == 'slide-reserves-delais' else originals[s['id']]
        if s['id'] != 'slide-reserves-delais':
            old_number = int(s['id'].split('-')[-1])
            for shape in native.shapes:
                if (shape.has_text_frame and shape.text.strip() in [str(old_number), f'{old_number:02}']
                        and shape.left > Inches(10) and shape.top > Inches(6.8)):
                    replace_text(shape, f"{s['number']:02}")
        native.notes_slide.notes_text_frame.text = (
            s['title'] + '\n\n' + s['narration']
            + '\n\nTransition : ' + s['transition']
            + '\n\nRepère orateur : ' + s['reminder']
        )
    removed = original_ids['slide-17']
    prs.part.drop_rel(removed.rId)
    for element in list(prs.slides._sldIdLst):
        prs.slides._sldIdLst.remove(element)
    for s in SLIDES:
        prs.slides._sldIdLst.append(new_id if s['id'] == 'slide-reserves-delais' else original_ids[s['id']])
    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / 'Soutenance_FMFP_29_diapos_reserves.pptx'
    prs.save(target)
    export_word_documents()
    print(target)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--handout-only', action='store_true', help='Refresh the teacher-facing Word handout with all 29 illustrated slides and a concise demo scenario.')
    args = parser.parse_args()
    if args.handout_only:
        export_word_documents()
        print(ROOT / 'Soutenance_FMFP_complete.docx')
    else:
        main()
