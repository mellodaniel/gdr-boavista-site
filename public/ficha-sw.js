/* Replaced with the hashed asset inventory after the production build. */
const VERSION='gdrb-match-shell-dev';
const ASSETS=['/ficha-de-jogo','/logo-gdr-boavista-clean-1024.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(ASSETS)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('gdrb-match-shell-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  // Only the empty application shell and immutable public assets. Never cache APIs, sessions or player data here.
  if(request.mode==='navigate'&&url.pathname==='/ficha-de-jogo'){
    event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(VERSION).then(cache=>cache.put('/ficha-de-jogo',copy)));}return response;}).catch(()=>caches.match('/ficha-de-jogo')));return;
  }
  if(ASSETS.includes(url.pathname))event.respondWith(caches.open(VERSION).then(async cache=>(await cache.match(request))||fetch(request)));
});
