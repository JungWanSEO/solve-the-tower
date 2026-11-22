// 느린 통신에서 첫 화면이 뜨기까지 걸리는 시간과 요청의 흐름을 잽니다.
import puppeteer from 'puppeteer-core';
const NET = { '4G 보통': { latency: 150, down: 1.6e6 / 8, up: 750e3 / 8 }, '3G 느림': { latency: 400, down: 400e3 / 8, up: 400e3 / 8 } };
const b = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
for (const [name, n] of Object.entries(NET)) {
  for (const pass of ['첫 방문', '다시 방문']) {
    const ctx = pass === '첫 방문' ? await b.createBrowserContext() : globalThis.ctx; globalThis.ctx = ctx;
    const p = await ctx.newPage();
    const cdp = await p.createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: n.latency, downloadThroughput: n.down, uploadThroughput: n.up });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    let reqs = 0; let bytes = 0; const ends = [];
    cdp.on('Network.requestWillBeSent', () => { reqs++; });
    cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; ends.push(e.timestamp); });
    const t0 = Date.now();
    await p.setViewport({ width: 390, height: 664, isMobile: true });
    p.goto('http://localhost:8765/', { waitUntil: 'domcontentloaded' }).catch(() => {});
    let firstText = 0;
    while (Date.now() - t0 < 60000) {
      const st = await p.evaluate(() => ({ ready: !!document.querySelector('#titleNew b') && document.querySelector('#titleNew b').textContent.length > 0, splash: document.body.innerText.trim().length })).catch(() => ({ ready: false, splash: 0 }));
      if (!firstText && st.splash > 0) firstText = Date.now() - t0;
      if (st.ready) break;
      await new Promise((r) => setTimeout(r, 40));
    }
    console.log(`${name.padEnd(8)} ${pass.padEnd(6)} 무언가 보임 ${String(firstText).padStart(5)}ms · 누를 수 있음 ${String(Date.now() - t0).padStart(5)}ms · 요청 ${reqs}개 · ${Math.round(bytes / 1024)}KB`);
    await p.close();
  }
}
await b.close();
