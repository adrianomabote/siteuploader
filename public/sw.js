self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Novo Sinal!';
  const options = {
    body: data.body || 'Você tem um novo sinal de entrada',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'cashout-signal',
    requireInteraction: true,
    data: data
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
