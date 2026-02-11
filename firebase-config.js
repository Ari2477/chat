// Firebase configuration - YOUR ACTUAL CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyClPGh1yxz6qT6iYKvuuyHVvMo-bcrv4fo",
  authDomain: "for-nothing-lastforever.firebaseapp.com",
  projectId: "for-nothing-lastforever",
  storageBucket: "for-nothing-lastforever.firebasestorage.app",
  messagingSenderId: "737440293237",
  appId: "1:737440293237:web:3daf7b3ae2e2bbeba9733c",
  measurementId: "G-T651SFSVWK"
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
