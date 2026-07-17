// Bewust minimaal: Second Brain praat live met Supabase, dus we cachen niets agressiefs.
// Deze worker bestaat vooral om Android/Chrome de app als "installeerbaar" te laten zien
// en om het delen-naar-app te laten werken. Alles gaat gewoon rechtstreeks over het netwerk.
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Android's "Delen" (share) stuurt foto's/bestanden als POST-multipart naar index.html.
  // GitHub Pages is statische hosting en kan geen POST verwerken, dus vangen we 'm hier op:
  // we lezen de gedeelde data uit, parkeren 'm tijdelijk in de Cache API, en sturen de
  // gebruiker met een gewone GET door naar de app zelf.
  if (req.method === 'POST' && new URL(req.url).pathname.endsWith('/index.html')) {
    event.respondWith(handleShareTargetPost(req));
    return;
  }
  event.respondWith(fetch(req).catch(() => new Response('Je bent offline — Second Brain heeft internet nodig.', { status: 503 })));
});

async function handleShareTargetPost(req) {
  try {
    const formData = await req.formData();
    const title = formData.get('shared_title') || '';
    const text = formData.get('shared_text') || '';
    const url = formData.get('shared_url') || '';
    const files = formData.getAll('shared_files').filter((f) => f && typeof f.size === 'number' && f.size > 0);
    const cache = await caches.open('share-target-v1');
    await cache.put(
      'share-meta',
      new Response(JSON.stringify({ title, text, url, fileCount: files.length, fileTypes: files.map((f) => f.type) }))
    );
    for (let i = 0; i < files.length; i++) {
      await cache.put(`share-file-${i}`, new Response(files[i]));
    }
    return Response.redirect('./index.html?shared=1', 303);
  } catch (_e) {
    return Response.redirect('./index.html', 303);
  }
}

// ================= PUSHMELDINGEN =================
// Toont een binnenkomende melding (verstuurd via de 'send-push' edge function).
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = { title: 'Second Brain', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Second Brain';
  const options = {
    body: data.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Tik je op de melding: bestaand tabblad naar voren halen (en naar de juiste plek navigeren),
// of anders een nieuw tabblad met de app openen.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(targetUrl);
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
