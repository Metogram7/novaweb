importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDqQAHCB2MizgN5Id5Ezfr3UPE1P3UlSS8",
    authDomain: "nova-329c7.firebaseapp.com",
    projectId: "nova-329c7",
    storageBucket: "nova-329c7.appspot.com",
    messagingSenderId: "284547967902",
    appId: "1:284547967902:web:7dd2e64d1a643a30e5c48f"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[Service Worker] Background Message:', payload);
    self.registration.showNotification(payload.notification.title, {
        body: payload.notification.body,
        icon: ''
    });
});
