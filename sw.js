// 오프라인 실행과 빠른 재방문을 위한 서비스 워커.
// 한 번 열면 아래 파일들을 기기에 저장해 두고, 다음부터는 통신 없이 바로 엽니다.
//
// ★ 게임을 고쳐서 올릴 때마다 VERSION 을 바꿔야 합니다. ★
//   VERSION 이 바뀌면 브라우저가 새 파일을 통째로 다시 받고, 화면에 "새 버전이 준비됐습니다" 가 나옵니다.
//   바꾸지 않으면 이미 열어 본 사람에게는 예전 화면이 계속 나옵니다.
// 파일을 새로 만들면 FILES 에도 추가합니다. (빠뜨려도 처음 쓸 때 저장되지만, 오프라인 첫 실행에서 빠집니다)
const VERSION = '0.4.0-dev.12';
const CACHE = `solve-the-tower-${VERSION}`;
const FILES = [
  './',
  './index.html',
  './css/style.css',
  './manifest.webmanifest',
  './js/battle.js',
  './js/codex.js',
  './js/art.js',
  './js/calc.js',
  './js/config.js',
  './js/data.js',
  './js/events.js',
  './js/figures.js',
  './js/fit.js',
  './js/generators.js',
  './js/guide.js',
  './js/i18n.js',
  './js/main.js',
  './js/map.js',
  './js/questions.js',
  './js/qview.js',
  './js/run.js',
  './js/relics.js',
  './js/heroes.js',
  './js/news.js',
  './js/save.js',
  './js/scope.js',
  './js/settings.js',
  './js/sound.js',
  './js/stage.js',
  './js/title.js',
  './js/tutorial.js',
  './js/ui.js',
  './data/catalog.json',
  './data/news.json',
  './data/monsters.json',
  './data/units/math1-expr.json',
  './data/units/math1-quad.json',
  './data/units/math1-trig.json',
  './data/units/math2-calc.json',
  './data/units/math2-complex.json',
  './data/units/math2-coord.json',
  './data/units/math2-explog.json',
  './data/units/math2-expr.json',
  './data/units/math2-trig.json',
  './data/units/matha-count.json',
  './data/units/matha-geom.json',
  './data/units/matha-int.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon.svg',
  './lang/en.json',
  './lang/ja.json',
  './lang/ko.json',
];

// 설치: 모든 파일을 새로 받아 한 묶음으로 저장합니다. (하나라도 실패하면 예전 버전을 그대로 씁니다)
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES.map((url) => new Request(url, { cache: 'reload' })))));
});

// 켜질 때: 예전 버전의 저장분을 지웁니다.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('solve-the-tower-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// 화면에서 "새로 고침" 을 누르면 기다리던 새 버전이 바로 켜집니다.
self.addEventListener('message', (event) => {
  if (event.data === 'skip') self.skipWaiting();
});

// 요청: 저장해 둔 것이 있으면 그것을, 없으면 통신으로 받아 저장합니다.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then((cache) => cache.match(request, { ignoreSearch: true }).then((hit) => hit || fetch(request).then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    }))),
  );
});
