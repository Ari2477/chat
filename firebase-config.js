// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDDU4V-_QV3M8GyhC9SVieRTDM4dbiT0E4",
  authDomain: "mini-messenger-demo.firebaseapp.com",
  projectId: "mini-messenger-demo",
  storageBucket: "mini-messenger-demo.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcd1234efgh5678ijkl90"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Export Firebase services
window.firebase = firebase;
window.auth = auth;
window.db = db;
window.storage = storage;
