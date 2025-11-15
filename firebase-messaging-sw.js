// Firebase Messaging Service Worker (Arka Plan Bildirimleri İçin)

// 1. Firebase SDK'larını İçe Aktar (ZORUNLU)
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// 2. 🔥 Firebase Yapılandırmasını Tanımla (ZORUNLU)
// Bu config nesnesi, ana HTML dosyanızdaki ile AYNI olmalıdır.
const firebaseConfig = {
    apiKey: "AIzaSyDqQAHCB2MizgN5Id5Ezfr3UPE1P3UlSS8",
    authDomain: "nova-329c7.firebaseapp.com",
    projectId: "nova-329c7",
    storageBucket: "nova-329c7.firebasestorage.app",
    messagingSenderId: "284547967902",
    appId: "1:284547967902:web:7dd2e64d1a643a30e5c48f"
};

// 3. Firebase Uygulamasını ve Messaging Servisini Başlat
const app = firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 4. 🔥 Firebase Arka Plan Mesaj İşleyicisi
// Bu işleyici, tarayıcı kapalıyken Firebase'den gelen verileri alır.
messaging.onBackgroundMessage(function(payload) {
    console.log('[firebase-messaging-sw.js] Arka plan bildirimi alındı.', payload);

    // Bildirim verilerini payload'dan al
    const notificationTitle = payload.notification.title || "Nova Web";
    const notificationOptions = {
        body: payload.notification.body || "Yeni mesaj var!",
        icon: payload.notification.icon || "/icon.png", // Uygulamanızın ikon yolu
        data: payload.data // Bildirimle gelen ek veriler
    };

    // Bildirimi göster
    return self.registration.showNotification(notificationTitle, notificationOptions);
});


// 5. Bildirim Tıklama İşleyicisi (Sizin kodunuzdan alınmıştır, geçerlidir)
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    // Tıklamada uygulamayı aç veya aktif pencereye odaklan
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/'); // Yeni pencerede aç
            }
        })
    );
});