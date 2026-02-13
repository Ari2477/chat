const firebaseConfig = {
  apiKey: "AIzaSyA4jlTUo2XlfL2-k1gzT3x2tnpqeEZIeUA",
  authDomain: "mini-messenger-000.firebaseapp.com",
  projectId: "mini-messenger-000",
  storageBucket: "mini-messenger-000.firebasestorage.app",
  messagingSenderId: "456773666595",
  appId: "1:456773666595:web:59e577a6bbd2240ed6ee96"
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
