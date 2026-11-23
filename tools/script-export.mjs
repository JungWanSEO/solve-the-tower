// 게임에 들어 있는 일본어 문장을 모두 모아 검수용 목록(script/ja-script.json)으로 내보냅니다.
// 쓰는 법: node tools/script-export.mjs   →   script/ja-script.json
// 표 파일(xlsx)은 이 JSON 으로 만듭니다. 고친 내용은 tools/script-import.mjs 로 다시 넣습니다.
import fs from 'node:fs';
const ROOT = new URL('../', import.meta.url).pathname;
const read = (p) => JSON.parse(fs.readFileSync(ROOT + p, 'utf8'));
globalThis.document = { documentElement: {} };
const { GENERATORS, CHAINS } = await import(ROOT + 'js/generators.js');
const { calcFill } = await import(ROOT + 'js/calc.js');
const rows = []; // { key, area, kind, ko, ja, sample }
// sample: {a} 같은 자리에 실제 숫자를 넣어 본 예. 검수하는 사람이 화면에 어떻게 나오는지 볼 수 있게 합니다.
const fillWith = (s, item) => String(calcFill(s, item)).replace(/\{(\w+)\}/g, (m, k) => (k in item ? item[k] : m));
const add = (key, area, kind, text, item) => { if (text && text.ja) rows.push({ key, area, kind, ko: text.ko || '', ja: text.ja, sample: item && /\{\w+\}/.test(text.ja) ? fillWith(text.ja, item) : '' }); };

// 1) 화면 글 (lang/ja.json)
const UI_AREA = { ui: '共通', msg: 'メッセージ', map: 'マップ', node: 'マップのマス', ev: 'イベント', up: '強化', codex: '図鑑', tut: 'チュートリアル', mystery: '? マス', title: 'タイトル', scope: '範囲えらび', menu: 'メニュー', opt: '設定', data: 'データ管理', bless: '塔守りの贈り物', ascend: '挑戦段階', cheer: 'はげまし', set: '設定', tip: 'はじめての案内' };
const ja = read('lang/ja.json');
const ko = read('lang/ko.json');
const walk = (a, b, path) => {
  for (const [k, v] of Object.entries(a)) {
    const p = path ? `${path}.${k}` : k;
    if (v && typeof v === 'object') walk(v, (b && b[k]) || {}, p);
    else rows.push({ key: `ui:${p}`, area: `画面 / ${UI_AREA[p.split('.')[0]] || p.split('.')[0]}`, kind: '画面の文', ko: (b && b[k]) || '', ja: v, sample: '' });
  }
};
walk(ja, ko, '');

// 2) 科目·単元·問題
const cat = read('data/catalog.json');
const off = new Set(cat.off || []);
for (const subject of cat.subjects) {
  add(`subject:${subject.id}`, '科目', '科目名', subject.name);
  for (const id of subject.units) {
    if (off.has(id)) continue;
    const unit = read(`data/units/${id}.json`);
    const area = `${subject.name.ja} / ${unit.name.ja}`;
    add(`unit:${id}:name`, area, '単元名', unit.name);
    unit.groups.forEach((g, n) => add(`unit:${id}:group:${n}`, area, 'まとまりの名前', g.name));
    for (const [t, names] of Object.entries(unit.types)) add(`unit:${id}:type:${t}`, area, '問題タイプの名前', names);
    for (const tpl of unit.templates) {
      const where = `${area} / ${unit.types[tpl.type].ja}`;
      const item = tpl.gen ? GENERATORS[tpl.gen](tpl.params || {}) : (tpl.items ? { ...tpl.items[0] } : {});
      add(`unit:${id}:tpl:${tpl.id}:text`, where, '問題文', tpl.text, item);
      add(`unit:${id}:tpl:${tpl.id}:explain`, where, '解説', tpl.explain, item);
      add(`unit:${id}:tpl:${tpl.id}:note`, where, '注意書き', tpl.note, item);
    }
    for (const ch of unit.chains || []) {
      const where = `${area} / 連続技`;
      const made = CHAINS[ch.gen] ? CHAINS[ch.gen]() : { steps: [] };
      const item = { ...made };
      made.steps.forEach((s, n) => { item[`a${n + 1}`] = s.answer; });
      add(`unit:${id}:chain:${ch.id}:intro`, where, '連続技の前文', ch.intro, item);
      ch.steps.forEach((st, n) => {
        const mine = { ...item, answer: made.steps[n]?.answer };
        add(`unit:${id}:chain:${ch.id}:step${n + 1}:sum`, where, `連続技 ${n + 1}問目の見出し`, st.sum, mine);
        add(`unit:${id}:chain:${ch.id}:step${n + 1}:text`, where, `連続技 ${n + 1}問目`, st.text, mine);
        add(`unit:${id}:chain:${ch.id}:step${n + 1}:explain`, where, `連続技 ${n + 1}問目の解説`, st.explain, mine);
      });
    }
  }
}
// 3) モンスター (꺼 둔 단원의 몬스터는 뺍니다)
for (const m of read('data/monsters.json')) {
  if (off.has(m.weak.split('/')[0])) continue;
  add(`monster:${m.id}:name`, 'モンスター', 'モンスターの名前', m.name);
  add(`monster:${m.id}:mistake`, 'モンスター', 'モンスターが表すミス', m.mistake);
}
fs.mkdirSync(ROOT + 'script', { recursive: true });
fs.writeFileSync(ROOT + 'script/ja-script.json', JSON.stringify(rows, null, 1));
const count = {}; for (const r of rows) count[r.kind.replace(/ \d問目/, '')] = (count[r.kind.replace(/ \d問目/, '')] || 0) + 1;
console.log('rows', rows.length, JSON.stringify(count));
