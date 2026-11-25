// 화면(index.html)은 먼저 네트워크에서 새로 받고(2.5초 안에 안 오면 기기에 둔 것), 아이콘 등은 기기에 둔 것을 쓴다.
// 새 버전의 서비스 워커가 자리를 잡으면 열려 있는 화면을 한 번 새로 고친다.
const CACHE = 'mb-shell-v4';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    const old = ks.filter(k => k !== CACHE);
    await Promise.all(old.map(k => caches.delete(k)));
    await self.clients.claim();
    if (old.length) (await self.clients.matchAll({ type: 'window' })).forEach(c => { try { c.navigate(c.url); } catch (err) {} });
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const net = fetch(req, { cache: 'no-store' }).then(r => { if (r.ok) c.put('index.html', r.clone()); return r; });
      const timer = new Promise(res => setTimeout(res, 2500));
      try {
        const r = await Promise.race([net, timer.then(() => null)]);
        if (r) return r;
      } catch (err) { /* 오프라인 */ }
      return (await c.match('index.html')) || net;
    })());
    return;
  }
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req);
    const fresh = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || fresh;
  }));
});
