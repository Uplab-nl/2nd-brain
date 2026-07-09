// Bewust minimaal: Second Brain praat live met Supabase, dus we cachen niets agressiefs.
// Deze worker bestaat vooral om Android/Chrome de app als "installeerbaar" te laten zien
// en om het delen-naar-app te laten werken. Alles gaat gewoon rechtstreeks over het netwerk.
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request).catch(() => new Response('Je bent offline — Second Brain heeft internet nodig.', { status: 503 })));
});

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
