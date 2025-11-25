importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

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

messaging.onBackgroundMessage(function(payload) {
  console.log('[Nova SW] Mesaj alındı:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/novaweb/icons/icon-192.png' // İkon yolunun doğruluğundan emin ol
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});