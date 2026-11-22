// Guarda la app para abrirla sin internet. La lista (planos.json o la hoja) siempre se pide fresca.
const CACHE = "control-v71";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" }))))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
// Primero la red (para abrir siempre la versión nueva); si no hay internet o tarda más de 4 s, la copia guardada.
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.endsWith("planos.json")) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    try {
      const r = await Promise.race([fetch(e.request, { cache: "no-cache" }), new Promise((_, no) => setTimeout(no, 4000))]);
      if (r.ok) c.put(e.request, r.clone());
      return r;
    } catch (err) { return hit || fetch(e.request); }
  }));
});

// ===== Avisos (push sin contenido: el servidor "toca" y aquí se pide el texto del aviso) =====
// La app guarda el enlace del equipo en la caché «rodaje-cfg»; el texto se pide al servidor con la clave de esta suscripción.
async function textoAviso() {
  try {
    const c = await caches.open("rodaje-cfg"), r = await c.match("cfg"), cfg = r ? await r.json() : null;
    const sub = await self.registration.pushManager.getSubscription();
    if (!cfg || !cfg.url || !sub) return null;
    const ctl = new AbortController(); setTimeout(() => ctl.abort(), 7000);
    const res = await fetch(cfg.url + "?accion=aviso&ep=" + encodeURIComponent(sub.endpoint.slice(-32)) + "&pin=" + encodeURIComponent(cfg.pin || "") + "&t=" + Date.now(), { signal: ctl.signal, cache: "no-store" });
    const j = await res.json();
    return j && j.ok && j.t ? j : null;
  } catch (e) { return null; }
}
self.addEventListener("push", e => {
  e.waitUntil(textoAviso().then(m => self.registration.showNotification(m ? m.t : "Plan de rodaje", {
    body: m ? m.c : "Hay novedades. Ábrela para verlas.", icon: "icon-180.png", badge: "icon-180.png", tag: "aviso-" + Date.now() })));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
    for (const w of ws) if ("focus" in w) return w.focus();
    return clients.openWindow("./");
  }));
});
