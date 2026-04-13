importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  projectId: "gen-lang-client-0258827102",
  appId: "1:570298452148:web:8f3225089bae70c00aefe1",
  apiKey: "AIzaSyDvDPdRauEaWjFffz5TACDwbr1FRklzoIM",
  authDomain: "gen-lang-client-0258827102.firebaseapp.com",
  messagingSenderId: "570298452148"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/manifest.json'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
