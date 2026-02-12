
let currentUser = null;

function initAuth() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await saveUserToFirestore(user);
            await setUserOnline(true);
            
            // Redirect to index if on login page
            if (window.location.pathname.includes('login.html')) {
                window.location.href = 'index.html';
            }
        } else {
            currentUser = null;
            // Redirect to login if on index page
            if (window.location.pathname.includes('index.html')) {
                window.location.href = 'login.html';
            }
        }
    });
}

// ===== AUTHENTICATION METHODS =====

/**
 * Sign in with Google
 */
async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        
        const result = await auth.signInWithPopup(provider);
        return result.user;
    } catch (error) {
        console.error('Google sign in error:', error);
        showNotification('Failed to sign in. Please try again.', 'error');
        throw error;
    }
}

/**
 * Sign out current user
 */
async function signOut() {
    try {
        await setUserOnline(false);
        await auth.signOut();
    } catch (error) {
        console.error('Sign out error:', error);
        showNotification('Failed to sign out. Please try again.', 'error');
        throw error;
    }
}

// ===== USER MANAGEMENT =====

/**
 * Save user to Firestore after authentication
 */
async function saveUserToFirestore(user) {
    const userRef = db.collection('users').doc(user.uid);
    const userData = {
        uid: user.uid,
        name: user.displayName || 'Anonymous User',
        email: user.email,
        photo: user.photoURL || 'https://via.placeholder.com/150',
        online: true,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: user.metadata.creationTime || new Date().toISOString()
    };

    try {
        await userRef.set(userData, { merge: true });
        console.log('User saved to Firestore:', user.uid);
    } catch (error) {
        console.error('Error saving user to Firestore:', error);
    }
}

/**
 * Set user online/offline status
 */
async function setUserOnline(status) {
    if (!currentUser) return;

    try {
        await db.collection('users').doc(currentUser.uid).update({
            online: status,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating user status:', error);
    }
}

/**
 * Get current user data
 */
function getCurrentUser() {
    return currentUser;
}

/**
 * Get user by UID
 */
async function getUserByUid(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        return userDoc.exists ? userDoc.data() : null;
    } catch (error) {
        console.error('Error fetching user:', error);
        return null;
    }
}

// ===== ACCOUNT INFO MODAL =====

/**
 * Show account information modal
 */
async function showAccountModal() {
    if (!currentUser) return;

    const modal = document.getElementById('accountModal');
    if (!modal) return;

    // Get user data from Firestore
    const userData = await getUserByUid(currentUser.uid);

    // Update modal content
    document.getElementById('modalAvatar').src = currentUser.photoURL || 'https://via.placeholder.com/150';
    document.getElementById('modalDisplayName').textContent = currentUser.displayName || 'Anonymous User';
    document.getElementById('modalEmail').textContent = currentUser.email;
    document.getElementById('modalUid').textContent = currentUser.uid;
    document.getElementById('modalCreatedAt').textContent = userData?.createdAt || currentUser.metadata.creationTime || 'N/A';

    modal.classList.add('active');
}

/**
 * Hide account modal
 */
function hideAccountModal() {
    const modal = document.getElementById('accountModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type} glass-effect slide-up`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    // Add to body
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('slide-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== EVENT LISTENERS =====

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initAuth();

    // Setup login button
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', signInWithGoogle);
    }

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', signOut);
    }

    // Setup account info button
    const accountInfoBtn = document.getElementById('accountInfoBtn');
    if (accountInfoBtn) {
        accountInfoBtn.addEventListener('click', showAccountModal);
    }

    // Setup modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
});

// Handle online/offline detection
window.addEventListener('online', () => setUserOnline(true));
window.addEventListener('offline', () => setUserOnline(false));

// Set offline status on page unload
window.addEventListener('beforeunload', () => {
    setUserOnline(false);
});

// Export functions for use in other modules
window.authModule = {
    initAuth,
    signInWithGoogle,
    signOut,
    getCurrentUser,
    getUserByUid,
    showAccountModal,
    hideAccountModal,
    showNotification
};
