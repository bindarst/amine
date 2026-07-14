importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Configuration Firebase (valeurs publiques)
const firebaseConfig = {
    projectId: "studio-9486387229-bb4f7",
    appId: "1:623398842041:web:cef9dc42f6063202f2b568",
    apiKey: "AIzaSyDfm5PF-4roYtEI_gIWkRNWeL1_UqYWc2E",
    authDomain: "studio-9486387229-bb4f7.firebaseapp.com",
    messagingSenderId: "623398842041",
    storageBucket: "studio-9486387229-bb4f7.appspot.com",
    measurementId: "G-5G01G2T745"
};

// Initialiser Firebase dans le Service Worker
firebase.initializeApp(firebaseConfig);

// Récupérer l'instance de messaging
const messaging = firebase.messaging();

// Gérer les messages en arrière-plan
messaging.onBackgroundMessage(function (payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icons/icon-192x192.png', // Assurez-vous d'avoir cette icône
        badge: '/icons/icon-192x192.png',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
