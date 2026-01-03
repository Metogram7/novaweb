importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Buradaki bilgiler senin Firebase Konsolundan aldığın bilgilerdir.
const firebaseConfig = {
    apiKey: "AIzaSyDqQAHCB2MizgN5Id5Ezfr3UPE1P3UlSS8",
    authDomain: "nova-329c7.firebaseapp.com",
    projectId: "nova-329c7",
    storageBucket: "nova-329c7.firebasestorage.app",
    messagingSenderId: "284547967902",
    appId: "1:284547967902:web:7dd2e64d1a643a30e5c48f"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Arka planda gelen bildirimi yakalama ve gösterme
messaging.onBackgroundMessage(function(payload) {
  console.log('[Nova SW] Arka plan mesajı alındı:', payload);
  
  // Bildirim içeriğini Service Worker'dan gösterir
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://metogram7.github.io/novaweb/icons/icons-512.png', // İkon yolu
    data: {
      url: payload.notification.link || 'https://nova-chat-d50f.onrender.com'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Bildirime tıklandığında linke gitme
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.notification.data && event.notification.data.url) {
        event.waitUntil(clients.openWindow(event.notification.data.url));
    }
});