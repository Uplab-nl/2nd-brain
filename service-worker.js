// Bewust minimaal: Second Brain praat live met Supabase, dus we cachen niets agressiefs.
// Deze worker bestaat vooral om Android/Chrome de app als "installeerbaar" te laten zien
// en om het delen-naar-app te laten werken. Alles gaat gewoon rechtstreeks over het netwerk.
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request).catch(() => new Response('Je bent offline \u2014 Second Brain heeft internet nodig.', { status: 503 })));
});
