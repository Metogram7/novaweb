// service-worker.js
self.addEventListener("push", function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Nova Web";
  const body = data.body || "Yeni mesaj var!";
  const icon = "ChatGPT Image 1 Kas 2025 12_57_42.png";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
    })
  );
});


self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : { title: 'Nova', body: 'Yeni bildirim!' };
    
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icon.png',
        })
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});
