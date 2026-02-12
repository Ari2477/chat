const firebaseConfig = {
  apiKey: "AIzaSyClPGh1yxz6qT6iYKvuuyHVvMo-bcrv4fo",
  authDomain: "for-nothing-lastforever.firebaseapp.com",
  projectId: "for-nothing-lastforever",
  storageBucket: "for-nothing-lastforever.firebasestorage.app",
  messagingSenderId: "737440293237",
  appId: "1:737440293237:web:0acc447e43696f04a9733c"
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

// Export Firebase services globally
window.firebase = firebase;
window.auth = auth;
window.db = db;
window.storage = storage;
