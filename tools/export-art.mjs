// 지금 게임에 나오는 주인공과 몬스터를 그림 파일(PNG, 투명 배경)로 뽑아 art/reference/ 에 저장합니다.
// 그림을 새로 그릴 사람에게 "이 캐릭터를 다시 그려 주세요" 하고 건네는 참고 그림입니다.
//   1) 저장소 폴더에서 python3 -m http.server 8765   2) node export-art.mjs
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const ROOT = new URL('../', import.meta.url).pathname;
const monsters = JSON.parse(fs.readFileSync(`${ROOT}data/monsters.json`, 'utf8'));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 664, deviceScaleFactor: 2 });
await page.goto('http://localhost:8765/', { waitUntil: 'networkidle0' });
const shots = await page.evaluate(async (ids) => {
  const { createStage } = await import('./js/stage.js');
  const canvas = document.createElement('canvas');
  const stage = createStage(canvas);
  stage.setCalm(true);
  const out = {};
  for (const id of ids) out[id] = stage.portrait(id, true);
  return out;
}, ['hero', ...monsters.map((m) => m.id)]);
fs.mkdirSync(`${ROOT}art/reference`, { recursive: true });
for (const [id, url] of Object.entries(shots)) fs.writeFileSync(`${ROOT}art/reference/${id}.png`, Buffer.from(url.split(',')[1], 'base64'));
console.log('saved', Object.keys(shots).length, 'pictures to art/reference/');
await browser.close();
