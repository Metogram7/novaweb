self.addEventListener("push", function(event) {
  const data = event.data ? event.data.json() : {title:"Nova", body:"Yeni mesaj!"};
  const title = data.title;
  const options = { body:data.body, icon:'/icon.png' };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function(event){
    event.notification.close();
    event.waitUntil(clients.openWindow('/'));
});
