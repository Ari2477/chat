
function showMessage(elementId, message, type = 'error') {
    const messageEl = document.getElementById(elementId);
    if (!messageEl) return;
    
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

// Handle user login
function handleLogin(email, password) {
    showLoading(true);
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Signed in
            const user = userCredential.user;
            console.log('User logged in:', user.uid);
            
            // Check if user document exists, create if not
            db.collection('users').doc(user.uid).get()
                .then(doc => {
                    if (!doc.exists) {
                        // Create user document
                        db.collection('users').doc(user.uid).set({
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName || email.split('@')[0],
                            photoURL: user.photoURL || `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(email.split('@')[0])}`,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                            bio: ''
                        });
                    } else {
                        // Update last seen
                        db.collection('users').doc(user.uid).update({
                            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                    
                    // Redirect to chat page
                    window.location.href = 'index.html';
                })
                .catch(error => {
                    console.error('Error checking user document:', error);
                    // Still redirect to chat page
                    window.location.href = 'index.html';
                });
        })
        .catch((error) => {
            showLoading(false);
            const errorCode = error.code;
            const errorMessage = error.message;
            
            let userMessage = 'Login failed. Please check your credentials.';
            if (errorCode === 'auth/user-not-found') {
                userMessage = 'No user found with this email.';
            } else if (errorCode === 'auth/wrong-password') {
                userMessage = 'Incorrect password.';
            } else if (errorCode === 'auth/invalid-email') {
                userMessage = 'Invalid email address.';
            }
            
            showMessage('auth-message', userMessage, 'error');
            console.error('Login error:', errorCode, errorMessage);
        });
}

// Handle user registration
function handleRegister(name, email, password) {
    showLoading(true);
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Signed up
            const user = userCredential.user;
            
            // Update user profile
            return user.updateProfile({
                displayName: name
            }).then(() => {
                // Create user document in Firestore
                return db.collection('users').doc(user.uid).set({
                    uid: user.uid,
                    email: user.email,
                    displayName: name,
                    photoURL: `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(name)}`,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                    bio: ''
                });
            });
        })
        .then(() => {
            // Registration successful, redirect to chat
            window.location.href = 'index.html';
        })
        .catch((error) => {
            showLoading(false);
            const errorCode = error.code;
            const errorMessage = error.message;
            
            let userMessage = 'Registration failed. Please try again.';
            if (errorCode === 'auth/email-already-in-use') {
                userMessage = 'Email already in use. Please login instead.';
            } else if (errorCode === 'auth/weak-password') {
                userMessage = 'Password is too weak. Use at least 6 characters.';
            } else if (errorCode === 'auth/invalid-email') {
                userMessage = 'Invalid email address.';
            }
            
            showMessage('auth-message', userMessage, 'error');
            console.error('Registration error:', errorCode, errorMessage);
        });
}

// Handle Google authentication
function handleGoogleAuth() {
    showLoading(true);
    
    const provider = new firebase.auth.GoogleAuthProvider();
    
    auth.signInWithPopup(provider)
        .then((result) => {
            // Google authentication successful
            const user = result.user;
            
            // Check if user document exists, create if not
            db.collection('users').doc(user.uid).get()
                .then(doc => {
                    if (!doc.exists) {
                        // Create user document
                        db.collection('users').doc(user.uid).set({
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName,
                            photoURL: user.photoURL || `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(user.displayName)}`,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                            bio: ''
                        });
                    } else {
                        // Update last seen
                        db.collection('users').doc(user.uid).update({
                            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                    
                    // Redirect to chat page
                    window.location.href = 'index.html';
                })
                .catch(error => {
                    console.error('Error checking user document:', error);
                    // Still redirect to chat page
                    window.location.href = 'index.html';
                });
        })
        .catch((error) => {
            showLoading(false);
            console.error('Google auth error:', error);
            showMessage('auth-message', 'Google authentication failed. Please try again.', 'error');
        });
}

// Handle password reset
function handlePasswordReset(email) {
    showLoading(true);
    
    auth.sendPasswordResetEmail(email)
        .then(() => {
            showLoading(false);
            showMessage('auth-message', 'Password reset email sent. Check your inbox.', 'success');
        })
        .catch((error) => {
            showLoading(false);
            console.error('Password reset error:', error);
            showMessage('auth-message', 'Failed to send reset email. Please check the email address.', 'error');
        });
}

// Handle user logout
function handleLogout() {
    showLoading(true);
    
    // Update last seen before logging out
    const user = auth.currentUser;
    if (user) {
        db.collection('users').doc(user.uid).update({
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            auth.signOut().then(() => {
                window.location.href = 'login.html';
            });
        }).catch(error => {
            console.error('Error updating last seen:', error);
            auth.signOut().then(() => {
                window.location.href = 'login.html';
            });
        });
    } else {
        auth.signOut().then(() => {
            window.location.href = 'login.html';
        });
    }
}

// Show/hide loading overlay
function showLoading(show) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        if (show) {
            loadingOverlay.classList.add('active');
        } else {
            loadingOverlay.classList.remove('active');
        }
    }
}

// Initialize auth event listeners for login page
document.addEventListener('DOMContentLoaded', function() {
    // Login form submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            handleLogin(email, password);
        });
    }
    
    // Register form submission
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // Validate passwords match
            if (password !== confirmPassword) {
                showMessage('auth-message', 'Passwords do not match.', 'error');
                return;
            }
            
            handleRegister(name, email, password);
        });
    }
    
    // Google login button
    const googleLoginBtn = document.getElementById('google-login-btn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', handleGoogleAuth);
    }
    
    // Google register button
    const googleRegisterBtn = document.getElementById('google-register-btn');
    if (googleRegisterBtn) {
        googleRegisterBtn.addEventListener('click', handleGoogleAuth);
    }
    
    // Forgot password form
    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) {
        forgotForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('forgot-email').value;
            handlePasswordReset(email);
        });
    }
});
