// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBkR0E-PftBKDNkdpWS1niFRMRjcK64-P4",
  authDomain: "mini-chat-app-1a2ca.firebaseapp.com",
  projectId: "mini-chat-app-1a2ca",
  storageBucket: "mini-chat-app-1a2ca.firebasestorage.app",
  messagingSenderId: "638448934198",
  appId: "1:638448934198:web:8e0dcbf8a4987642312797"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Enable Firestore offline persistence
db.enablePersistence()
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.log('Persistence failed');
    } else if (err.code === 'unimplemented') {
      console.log('Persistence not available');
    }
  });

// ImgBB API Key
const IMGBB_API_KEY = 'i bb329b6e5c824a671520a9983eb3f37c'; // Replace with your actual key

// Export Firebase services globally
window.firebase = firebase;
window.auth = auth;
window.db = db;
window.storage = storage;
window.IMGBB_API_KEY = IMGBB_API_KEY;
