# 📱 Mini Messenger - Complete Setup Guide

## 🚀 Real-time Chat Application with Firebase, Google Auth, and IMGBB Integration

---

```markdown
# Mini Messenger 💬

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Firebase](https://img.shields.io/badge/Firebase-Realtime-orange)
![IMGBB](https://img.shields.io/badge/IMGBB-API-green)
![License](https://img.shields.io/badge/license-MIT-red)

**Mini Messenger** is a real-time chat application that mimics the look and feel of Telegram with premium cyber aesthetics. Built with pure HTML, CSS, JavaScript, Firebase Firestore, and IMGBB API for image uploads.

<p align="center">
  <img src="https://i.ibb.co/qYky078V/Screenshot-20260212-134936-1.jpg" alt="Mini Messenger Preview" width="300">
</p>

## ✨ Features

- ✅ **Google Authentication** - Secure login with Google
- ✅ **Real-time Group Chat** - Instant messaging with everyone
- ✅ **Real-time Private Messages (PM)** - 1-on-1 conversations
- ✅ **Online/Offline Status** - Green dot indicator
- ✅ **Unread Badges** - Red notification badges on avatars (cross-device)
- ✅ **Profile Pictures** - Change via IMGBB upload
- ✅ **Group Chat Info** - Edit name, description, photo
- ✅ **Member List** - See all group members
- ✅ **Read Receipts** - ✓ (sent) and ✓✓ (read)
- ✅ **Developer Credits** - Customizable developer section
- ✅ **Telegram Premium Theme** - Dark mode, teddy bear pattern, satisfying animations
- ✅ **Fully Responsive** - Mobile-first design

## 📸 Screenshots

| Login Screen | Chat Screen | PM Screen | GC Info |
|-------------|------------|----------|---------|
| ![Login](https://via.placeholder.com/200) | ![Chat](https://via.placeholder.com/200) | ![PM](https://via.placeholder.com/200) | ![GC](https://via.placeholder.com/200) |

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Backend:** Firebase Firestore (Realtime Database)
- **Authentication:** Firebase Auth (Google Provider)
- **Image Hosting:** IMGBB API
- **Icons:** Font Awesome 6
- **Deployment:** Render / Vercel / Netlify / Firebase Hosting

---

# 📋 COMPLETE SETUP GUIDE

## 🔥 PART 1: FIREBASE SETUP

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"**
3. Enter project name: `mini-messenger` (or any name)
4. Disable Google Analytics (optional)
5. Click **"Create Project"**

### 1.2 Register Web App

1. Click **"</>"** (Web icon)
2. App nickname: `mini-messenger-web`
3. Check **"Also set up Firebase Hosting"** (optional)
4. Click **"Register app"**
5. **COPY YOUR FIREBASE CONFIG** - you'll need this!

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBkR0E-PftBKDNkdpWS1niFRMRjcK64-P4",
  authDomain: "mini-chat-app-1a2ca.firebaseapp.com",
  projectId: "mini-chat-app-1a2ca",
  storageBucket: "mini-chat-app-1a2ca.firebasestorage.app",
  messagingSenderId: "638448934198",
  appId: "1:638448934198:web:8e0dcbf8a4987642312797"
};
```

### 1.3 Enable Google Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click **"Google"**
3. Toggle **"Enable"**
4. Add support email
5. Click **"Save"**

### 1.4 Create Firestore Database

1. Go to **Firestore Database** → **Create database**
2. Start in **"Test mode"** (for development)
3. Choose location (nearest to you)
4. Click **"Enable"**

### 1.5 Set Firestore Rules

Go to **Firestore Database** → **Rules** → Paste this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ✅ Allow all authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Click **"Publish"**

---

## 🖼️ PART 2: IMGBB API SETUP

### 2.1 Get IMGBB API Key

1. Go to [IMGBB API](https://api.imgbb.com/)
2. Click **"Get API Key"**
3. Create account or login
4. Copy your API key

```
IMGBB_API_KEY = "87b58d438e0cbe5226c1df0a8071621e"
```

### 2.2 Upload Default Images (Optional)

Upload these to IMGBB and get direct links:

1. **Default User Avatar:** `https://ui-avatars.com/api/?name=U&background=4f46e5&color=fff&size=200`
2. **Default Group Avatar:** `https://ui-avatars.com/api/?name=👥&background=4f46e5&color=fff&size=200`

---

## 📁 PART 3: PROJECT STRUCTURE

```
mini-messenger/
│
├── 📄 index.html          # Login page
├── 📄 chat.html           # Main chat application
├── 📄 firebase-config.js  # Firebase configuration
├── 📄 app.js              # Main application logic
├── 📄 style.css           # Telegram premium theme
└── 📄 README.md           # Documentation
```

---

## ⚙️ PART 4: CONFIGURATION FILES

### 4.1 `firebase-config.js`

```javascript
// ============================================
// FIREBASE CONFIGURATION - palitan mo nalang wag kang engot kailangan yan
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
```

### 4.2 Copy the Main Files

Copy the following files from the code we created:

- ✅ `login.html` - Login page with Google button
- ✅ `chat.html` - Main chat interface
- ✅ `app.js` - Complete application logic
- ✅ `style.css` - Telegram premium theme with teddy bears

---

## 🚀 PART 5: DEPLOYMENT TO RENDER

### 5.1 Prepare Your Files

1. Create a folder named `mini-messenger`
2. Add all 5 files inside
3. Make sure `index.html` is your login page

### 5.2 Push to GitHub

```bash
# Initialize git repository
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Mini Messenger"

# Create GitHub repository
# Connect and push
git remote add origin https://github.com/yourusername/mini-messenger.git
git branch -M main
git push -u origin main
```

### 5.3 Deploy to Render

1. Go to [Render.com](https://render.com/)
2. Sign up with GitHub
3. Click **"New +"** → **"Static Site"**
4. Connect your GitHub repository
5. Configure:

```
Name: mini-messenger
Branch: main
Build Command: (leave empty)
Publish Directory: . (dot)
```

6. Click **"Create Static Site"**
7. Your site will be live at: `https://mini-messenger.onrender.com`

### 5.4 Alternative: Deploy to Vercel (Faster)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts - it's free!
```

### 5.5 Alternative: Deploy to Netlify

1. Go to [Netlify.com](https://netlify.com/)
2. Drag and drop your folder
3. Done! Live URL in 10 seconds

---

## 🔧 PART 6: FIREBASE PRODUCTION RULES

After testing, update Firestore rules for security:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - read all, write own
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Group chats - authenticated users
    match /groupChats/{chatId} {
      allow read, write: if request.auth != null;
      
      match /messages/{messageId} {
        allow read, create: if request.auth != null;
        allow update, delete: if false;
      }
    }
    
    // Private chats - only participants
    match /privateChats/{chatId} {
      allow read, write: if request.auth != null && 
        (chatId.split('_')[0] == request.auth.uid || 
         chatId.split('_')[1] == request.auth.uid);
      
      match /messages/{messageId} {
        allow read, create: if request.auth != null &&
          (chatId.split('_')[0] == request.auth.uid || 
           chatId.split('_')[1] == request.auth.uid);
        allow update, delete: if false;
      }
    }
  }
}
```

---

## 🧪 PART 7: TESTING

### 7.1 Test Real-time Notifications

Open two browsers:

**Browser 1:** Login as `MOJIN`
**Browser 2:** Login as `ARI` (Incognito mode)

Send messages between them - badges should appear instantly!

### 7.2 Test Console

Press F12 and paste:

```javascript
// Check unread messages
db.collectionGroup('messages')
  .where('receiverId', '==', currentUser?.uid)
  .where('read', '==', false)
  .get()
  .then(snapshot => console.log('📨 Unread:', snapshot.size));
```

---

## 🎨 PART 8: CUSTOMIZATION

### 8.1 Change Developer Name

In `login.html` and `chat.html`:

```html
<!-- Find this and change "ARI" to your name -->
<span class="dev-name">YOUR NAME</span>
```

### 8.2 Change Default Group Avatar

In `app.js`:

```javascript
// Replace with your IMGBB direct link
photoURL: 'https://i.ibb.co/your-image/group.jpg'
```

### 8.3 Change Theme Colors

In `style.css`, find:

```css
:root {
  --primary: #4f46e5;
  --primary-dark: #4338ca;
  --primary-light: #6366f1;
  --background: #1a1b26;
  --surface: #0e0f16;
}
```

---

## ❓ PART 9: TROUBLESHOOTING

### ❌ Firebase Not Working
✅ Check if config is correct
✅ Enable Authentication → Google
✅ Firestore Rules = `allow read, write: if request.auth != null`

### ❌ Images Not Uploading
✅ Check IMGBB API key
✅ File size < 5MB
✅ Format: JPG, PNG, GIF, WEBP

### ❌ Notifications Not Showing
✅ Check `read: false` in sendPM()
✅ Check Firestore Rules
✅ Check browser console for errors

### ❌ Badge Half Cut
✅ CSS fix: `.user-item-avatar { overflow: visible !important; }`

---

## 📚 PART 10: API REFERENCE

### Firestore Collections

| Collection | Purpose |
|-----------|---------|
| `users` | User profiles, online status |
| `groupChats` | Group chat metadata |
| `groupChats/{id}/messages` | Group messages |
| `privateChats` | Private chat metadata |
| `privateChats/{id}/messages` | Private messages |

### Message Object

```javascript
{
  text: "Hello world",
  senderId: "user123",
  senderName: "ARI",
  senderPhoto: "https://...",
  receiverId: "user456", // for PM only
  timestamp: Firebase Timestamp,
  read: false, // for PM only
  readAt: Firebase Timestamp // optional
}
```

---

## 👑 PART 11: CREDITS

**Mini Messenger** was developed with ❤️ by:

```
██████╗ ███████╗██╗   ██╗
██╔══██╗██╔════╝██║   ██║
██║  ██║█████╗  ██║   ██║
██║  ██║██╔══╝  ╚██╗ ██╔╝
██████╔╝███████╗ ╚████╔╝ 
╚═════╝ ╚══════╝  ╚═══╝  
```

**Lead Developer:** ARI  
**Role:** Full Stack Developer  
**Stack:** Firebase, JavaScript, CSS, HTML
**Year:** 2026

---

## 📄 PART 12: LICENSE

MIT License © 2026 ARI

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files...

---

## ⭐ SUPPORT

If you like this project, please ⭐ star it on GitHub!

---

**🚀 Ready to deploy! Your Mini Messenger is now live!**
```

---

# 📋 QUICK SETUP CHEAT SHEET

```markdown
# ⚡ 5-MINUTE QUICK SETUP

## 1. FIREBASE (2 min)
- Go to https://console.firebase.google.com/
- Create project → Add web app → Copy config
- Enable Authentication → Google
- Create Firestore → Test mode
- Rules: allow read, write: if request.auth != null;

## 2. IMGBB (1 min)
- Go to https://api.imgbb.com/
- Get API key → Copy

## 3. CONFIG (1 min)
- Paste Firebase config in `firebase-config.js`
- Paste IMGBB key in `firebase-config.js`

## 4. DEPLOY (1 min)
- Drag folder to https://netlify.com
- OR: vercel
- OR: render.com

## ✅ DONE!
```

---

# 🎯 DEPLOYMENT COMMANDS

```bash
# Deploy to Vercel (EASIEST)
npm install -g vercel
vercel

# Deploy to Netlify (DRAG & DROP)
# 1. Go to netlify.com
# 2. Drag your folder
# 3. Done!

# Deploy to Render
# 1. Push to GitHub
# 2. Render.com → New Static Site
# 3. Connect repo
# 4. Deploy
```

---

**✨ Your Mini Messenger is ready for the world!** 🚀
