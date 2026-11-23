"""일본어 검수용 표 파일(xlsx)을 만들고, 고친 내용을 다시 읽습니다.

  python3 tools/script-xlsx.py make                     script/ja-script.json → script/ja-script.xlsx
  python3 tools/script-xlsx.py read <고친 파일.xlsx>     "直した日本語" 칸에 적힌 것만 → script/ja-fixes.json

순서: node tools/script-export.mjs → make → (검수) → read → node tools/script-import.mjs script/ja-fixes.json --write
"""
import json, sys, os
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
HEAD = ['キー', '場所', '種類', '韓国語(参考)', '日本語(いま)', '表示の例', '直した日本語', 'メモ']
WIDTH = [16, 26, 16, 34, 46, 46, 46, 24]
FIX_COL = HEAD.index('直した日本語') + 1
FONT = 'Arial'

def tab_of(row):
    area = row['area']
    if area.startswith('画面'): return '画面の文'
    if area.startswith('モンスター'): return 'モンスター'
    if area.startswith('科目'): return '画面の文'
    return area.split(' / ')[0]  # 数学I, 数学A, 数学II

def make():
    rows = json.load(open(os.path.join(ROOT, 'script/ja-script.json'), encoding='utf8'))
    wb = Workbook()
    guide = wb.active
    guide.title = 'はじめに'
    yellow = PatternFill('solid', fgColor='FFF2A8')
    grey = PatternFill('solid', fgColor='EDEDED')
    head_fill = PatternFill('solid', fgColor='1F3864')
    thin = Side(style='thin', color='BFBFBF')
    box = Border(left=thin, right=thin, top=thin, bottom=thin)
    tabs = []
    for r in rows:
        t = tab_of(r)
        if t not in tabs: tabs.append(t)
    counts = {t: sum(1 for r in rows if tab_of(r) == t) for t in tabs}
    lines = [
        ('Solve the Tower 日本語チェック表', 'title'),
        ('ゲームに出てくる日本語の文をすべて集めた表です。不自然な日本語、教科書とちがう用語、まちがいを直してください。', ''),
        ('', ''),
        ('直し方', 'h'),
        ('1. 下のタブ(画面の文・数学I・数学A・数学II・モンスター)を開きます。', ''),
        ('2. 「日本語(いま)」を読み、直したい行だけ、黄色い「直した日本語」の列に正しい文を書きます。', ''),
        ('3. 直さない行は空のままにします。全部を書き写す必要はありません。', ''),
        ('4. 気になることは「メモ」の列に書きます(例: この用語は学校では習わない)。', ''),
        ('', ''),
        ('気をつけること', 'h'),
        ('・{a} や {answer} のような { } の記号は、ゲームが数字や式を入れる場所です。消さずにそのまま残してください。', ''),
        ('・「表示の例」は { } に実際の数字を入れたときの見え方です。読みやすさはこの列で確かめてください。', ''),
        ('・「キー」「場所」「種類」「日本語(いま)」の列は書きかえないでください。ゲームに戻すときの目印です。', ''),
        ('・「韓国語(参考)」は元の文です。意味を確かめるときに使ってください。', ''),
        ('', ''),
        ('書き方の例', 'h'),
    ]
    for n, (text, kind) in enumerate(lines, 1):
        c = guide.cell(row=n, column=1, value=text)
        c.font = Font(name=FONT, size=16 if kind == 'title' else 11, bold=kind in ('title', 'h'))
        c.alignment = Alignment(wrap_text=True, vertical='top')
    ex = len(lines) + 1
    for col, text in enumerate(['日本語(いま)', '表示の例', '直した日本語', 'メモ'], 1):
        c = guide.cell(row=ex, column=col, value=text); c.font = Font(name=FONT, bold=True, color='FFFFFF'); c.fill = head_fill; c.border = box
    sample = ['{a} と {b} の最大公約数は?', '12 と 18 の最大公約数は?', '{a} と {b} の最大公約数を求めよ。', '教科書の言い方に合わせました']
    for col, text in enumerate(sample, 1):
        c = guide.cell(row=ex + 1, column=col, value=text); c.font = Font(name=FONT); c.border = box; c.alignment = Alignment(wrap_text=True, vertical='top')
        if col == 3: c.fill = yellow
    guide.cell(row=ex + 3, column=1, value='タブごとの行数').font = Font(name=FONT, bold=True)
    for n, t in enumerate(tabs):
        guide.cell(row=ex + 4 + n, column=1, value=t).font = Font(name=FONT)
        guide.cell(row=ex + 4 + n, column=2, value=counts[t]).font = Font(name=FONT)
    guide.cell(row=ex + 4 + len(tabs), column=1, value='合計').font = Font(name=FONT, bold=True)
    guide.cell(row=ex + 4 + len(tabs), column=2, value=f'=SUM(B{ex + 4}:B{ex + 3 + len(tabs)})').font = Font(name=FONT, bold=True)
    for col, w in zip('ABCD', [70, 34, 40, 34]): guide.column_dimensions[col].width = w
    for t in tabs:
        ws = wb.create_sheet(t[:31])
        for col, (text, w) in enumerate(zip(HEAD, WIDTH), 1):
            c = ws.cell(row=1, column=col, value=text)
            c.font = Font(name=FONT, bold=True, color='FFFFFF'); c.fill = head_fill; c.border = box
            c.alignment = Alignment(horizontal='center', vertical='center')
            ws.column_dimensions[get_column_letter(col)].width = w
        n = 1
        for r in rows:
            if tab_of(r) != t: continue
            n += 1
            values = [r['key'], r['area'], r['kind'], r['ko'], r['ja'], r.get('sample', ''), '', '']
            for col, v in enumerate(values, 1):
                c = ws.cell(row=n, column=col, value=v)
                c.font = Font(name=FONT, size=10, color='808080' if col == 1 else '000000')
                c.alignment = Alignment(wrap_text=True, vertical='top')
                c.border = box
                if col == FIX_COL: c.fill = yellow
                elif col <= 3: c.fill = grey
        ws.freeze_panes = 'E2'
        ws.auto_filter.ref = f'A1:{get_column_letter(len(HEAD))}{n}'
        ws.row_dimensions[1].height = 22
    out = os.path.join(ROOT, 'script/ja-script.xlsx')
    wb.save(out)
    print('saved', out, counts)

def read(path):
    wb = load_workbook(path)
    fixes = []
    for ws in wb.worksheets:
        head = [c.value for c in ws[1]]
        if 'キー' not in head or '直した日本語' not in head: continue
        k, f = head.index('キー'), head.index('直した日本語')
        m = head.index('メモ') if 'メモ' in head else None
        for row in ws.iter_rows(min_row=2, values_only=True):
            fixed = row[f]
            memo = row[m] if m is not None else None
            if row[k] and ((fixed and str(fixed).strip()) or (memo and str(memo).strip())):
                fixes.append({'key': row[k], 'ja': str(fixed).strip() if fixed else '', 'memo': str(memo).strip() if memo else ''})
    out = os.path.join(ROOT, 'script/ja-fixes.json')
    json.dump(fixes, open(out, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print('fixes', sum(1 for x in fixes if x['ja']), '| memo only', sum(1 for x in fixes if not x['ja']), '→', out)
    for x in fixes:
        if x['memo']: print('  メモ', x['key'], ':', x['memo'])

if __name__ == '__main__':
    if len(sys.argv) >= 2 and sys.argv[1] == 'make': make()
    elif len(sys.argv) >= 3 and sys.argv[1] == 'read': read(sys.argv[2])
    else: print(__doc__)
