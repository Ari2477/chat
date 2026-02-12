
---

💬 Mini Messenger (Firebase Real-Time Chat)

A simple real-time messenger app built with HTML, CSS, and JavaScript, powered by Firebase Authentication + Firestore Database, and deployable on Render.


---

🚀 Features

🔐 Google Login / Signup (Firebase Auth)

💬 Real-time Chat (Firestore)

🟢 Online Users Indicator

✍️ Typing Indicator

👤 Account image change

🌐 Deployable on Render (Web Service)



---

📁 Project Structure

mini-messenger/
│
├── index.html
├── style.css
├── firebase.js
├── auth.js
├── chat.js
├── app.js
├── render.yaml (optional)
└── README.md


---

🔥 Firebase Setup Guide

1️⃣ Create Firebase Project

1. Go to: https://console.firebase.google.com


2. Click Add Project


3. Enter project name


4. Disable Google Analytics (optional)


5. Click Create Project




---

2️⃣ Add Web App to Firebase

1. Click </> Web Icon


2. Register your app


3. Copy the Firebase Config



Example config:

// ============================================
// FIREBASE CONFIGURATION - Palitan mo ito syempre kailangan yan engot 
// ============================================

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// IMGBB API Key
const IMGBB_API_KEY = "YOUR_IMGBB_API_KEY";

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore with settings
const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// Firestore settings for real-time
db.settings({
    timestampsInSnapshots: true,
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

// Enable offline persistence
db.enablePersistence({
    synchronizeTabs: true
}).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.log('⚠️ Multiple tabs open - persistence disabled');
    } else if (err.code == 'unimplemented') {
        console.log('⚠️ Browser does not support persistence');
    }
});

console.log('✅ Firebase initialized!');

---

Get IMGBB API Key
Go to IMGBB API

Click "Get API Key"

Create account or login

Copy your API key

text
IMGBB_API_KEY = "YOUR_API_KEY"


---

3️⃣ Setup firebase.js

Create a file called firebase.js:

// firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "XXXX",
  appId: "XXXX"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);


---

4️⃣ Enable Authentication

1. Go to Authentication


2. Click Get Started


3. Go to Sign-in Method


4. Enable Google


5. Save




---

5️⃣ Setup Firestore Database

1. Go to Firestore Database


2. Click Create Database


3. Choose Start in Test Mode


4. Select nearest location


5. Click Done




---

6️⃣ Firestore Rules (Development Mode)

Go to Firestore → Rules and paste:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /messages/{messageId} {
      allow read, write: if request.auth != null;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
  }
}

Click Publish


---

2️⃣ Deploy on Render

1. Go to: https://render.com


2. Click New +


3. Select Web service 


4. Connect GitHub repo


5. Configure:



Build Command: npm install
Start Command: npm start

6. Click Create




---

3️⃣ Add Authorized Domain (IMPORTANT)

After deploy:

1. Go to Firebase Console


2. Authentication → Settings → Authorized Domains


3. Add your Render domain:



your-app-name.onrender.com

Save.


---

🛠 If Render Shows Blank Page

Make sure:

index.html is in root folder

All JS files use type="module"

Firebase config is correct

Authorized domain is added



---

📌 Production Firestore Rules (Optional Secure Version)

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /messages/{messageId} {
      allow read, write: if request.auth.uid != null;
    }
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}


---

📷 Screenshots


![Login Screen](screenshots/login.png)
![Chat Screen](screenshots/chat.png)


---

📦 Tech Stack

Firebase Authentication

Firebase Firestore

Render Static Hosting



---

Mini Messenger was developed with ❤️ by:

text
██████╗ ███████╗██╗   ██╗
██╔══██╗██╔════╝██║   ██║
██║  ██║█████╗  ██║   ██║
██║  ██║██╔══╝  ╚██╗ ██╔╝
██████╔╝███████╗ ╚████╔╝ 
╚═════╝ ╚══════╝  ╚═══╝  
Lead Developer: ARI
Role: Full Stack Developer
Stack: Firebase, JavaScript, CSS3, HTML5
Year: 2026

---

