const firebaseConfig = {
  apiKey: "AIzaSyC825kSG-IRtXRkrQ1vhjojAAN1c4rJFkI",
  authDomain: "chat-messenger000.firebaseapp.com",
  projectId: "chat-messenger000",
  storageBucket: "chat-messenger000.firebasestorage.app",
  messagingSenderId: "773397280929",
  appId: "1:773397280929:web:c3a577c23d3d76079598e0"
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
