// Authentication Module
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }
    
    async init() {
        // Listen to auth state changes
        auth.onAuthStateChanged((user) => {
            this.handleAuthStateChange(user);
        });
    }
    
    async handleAuthStateChange(user) {
        if (user) {
            this.currentUser = user;
            await this.saveUserToFirestore(user);
            this.updateUIForLoggedInUser(user);
        } else {
            this.currentUser = null;
            window.location.href = 'login.html';
        }
    }
    
    async saveUserToFirestore(user) {
        const userRef = db.collection('users').doc(user.uid);
        const userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL || '',
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            online: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        try {
            await userRef.set(userData, { merge: true });
        } catch (error) {
            console.error('Error saving user:', error);
        }
    }
    
    updateUIForLoggedInUser(user) {
        const userNameEl = document.getElementById('userName');
        const avatarImg = document.getElementById('avatarImg');
        const avatarInitial = document.getElementById('avatarInitial');
        
        if (userNameEl) {
            userNameEl.textContent = user.displayName || user.email.split('@')[0];
        }
        
        if (user.photoURL && avatarImg) {
            avatarImg.src = user.photoURL;
            avatarImg.style.display = 'block';
            avatarInitial.style.display = 'none';
        } else if (avatarInitial) {
            avatarInitial.textContent = (user.displayName || user.email)[0].toUpperCase();
            avatarInitial.style.display = 'block';
        }
    }
    
    async logout() {
        try {
            if (this.currentUser) {
                // Update online status
                await db.collection('users').doc(this.currentUser.uid).update({
                    online: false,
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            await auth.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Logout failed: ' + error.message);
        }
    }
}

// Initialize Auth Manager
const authManager = new AuthManager();
