const firebaseConfig = {
  apiKey: "AIzaSyAdQT-inUvJrk6zpezYJRSOxUMZm4gAf1U",
  authDomain: "messenger-chat000.firebaseapp.com",
  projectId: "messenger-chat000",
  storageBucket: "messenger-chat000.firebasestorage.app",
  messagingSenderId: "142041302540",
  appId: "1:142041302540:web:cea9a7f6c81a9fad529029"
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
