const firebaseConfig = {
  apiKey: "AIzaSyBkR0E-PftBKDNkdpWS1niFRMRjcK64-P4",
  authDomain: "mini-chat-app-1a2ca.firebaseapp.com",
  projectId: "mini-chat-app-1a2ca",
  storageBucket: "mini-chat-app-1a2ca.firebasestorage.app",
  messagingSenderId: "638448934198",
  appId: "1:638448934198:web:8e0dcbf8a4987642312797"
};

const IMGBB_API_KEY = "87b58d438e0cbe5226c1df0a8071621e"; 

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

db.settings({
    timestampsInSnapshots: true,
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

db.enablePersistence({
    synchronizeTabs: true
}).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.log('Persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
        console.log('Persistence not supported');
    }
});

provider.setCustomParameters({
    prompt: 'select_account'
});

console.log('✅ Firebase initialized successfully!');
console.log('📁 Project:', firebaseConfig.projectId);
