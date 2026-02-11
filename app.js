// Main application initialization

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication state
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            console.log('User is signed in:', user.uid);
            
            // Update UI with user info
            updateUserUI(user);
            
            // Initialize chat functionality
            initChat();
            
            // Hide loading overlay
            showLoading(false);
        } else {
            // User is signed out, redirect to login
            console.log('User is signed out');
            window.location.href = 'login.html';
        }
    });
    
    // Setup additional event listeners
    setupAppListeners();
});

// Update UI with user information
function updateUserUI(user) {
    // Update user name and avatar in sidebar
    const userNameEl = document.getElementById('user-name');
    const userAvatarEl = document.getElementById('user-avatar');
    const profileNameEl = document.getElementById('profile-name');
    const profileEmailEl = document.getElementById('profile-email');
    const profileAvatarEl = document.getElementById('profile-avatar');
    const profileJoinedEl = document.getElementById('profile-joined');
    
    if (userNameEl) userNameEl.textContent = user.displayName || user.email;
    if (profileNameEl) profileNameEl.textContent = user.displayName || user.email;
    if (profileEmailEl) profileEmailEl.textContent = user.email;
    
    const avatarUrl = user.photoURL || `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(user.displayName || user.email)}`;
    
    if (userAvatarEl) userAvatarEl.src = avatarUrl;
    if (profileAvatarEl) profileAvatarEl.src = avatarUrl;
    
    // Get user document for additional info
    db.collection('users').doc(user.uid).get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                
                // Update joined date
                if (profileJoinedEl && userData.createdAt) {
                    const joinedDate = userData.createdAt.toDate();
                    profileJoinedEl.textContent = `Joined: ${joinedDate.toLocaleDateString()}`;
                }
                
                // Update bio if available
                if (userData.bio) {
                    // Bio would be displayed in profile tab
                }
            }
        })
        .catch(error => {
            console.error('Error getting user document:', error);
        });
}

// Setup additional app event listeners
function setupAppListeners() {
    // Search functionality for users
    const searchUsersInput = document.getElementById('search-users');
    if (searchUsersInput) {
        searchUsersInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const userItems = document.querySelectorAll('#users-list .list-item');
            
            userItems.forEach(item => {
                const userName = item.querySelector('.list-item-info h4').textContent.toLowerCase();
                if (userName.includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
    
    // Search functionality for groups
    const searchGroupsInput = document.getElementById('search-groups');
    if (searchGroupsInput) {
        searchGroupsInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const groupItems = document.querySelectorAll('#groups-list .list-item');
            
            groupItems.forEach(item => {
                const groupName = item.querySelector('.list-item-info h4').textContent.toLowerCase();
                if (groupName.includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
    
    // Change avatar button (placeholder functionality)
    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    if (changeAvatarBtn) {
        changeAvatarBtn.addEventListener('click', function() {
            alert('Avatar upload functionality would be implemented here. For this demo, avatars are generated automatically.');
        });
    }
    
    // Change password button (placeholder functionality)
    const changePasswordBtn = document.getElementById('change-password-btn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function() {
            alert('Password change functionality would be implemented here. For this demo, please use the login page\'s "Forgot password" feature.');
        });
    }
    
    // Attach file button (placeholder functionality)
    const attachBtn = document.getElementById('attach-btn');
    if (attachBtn) {
        attachBtn.addEventListener('click', function() {
            alert('File attachment functionality would be implemented here.');
        });
    }
    
    // Emoji button (placeholder functionality)
    const emojiBtn = document.getElementById('emoji-btn');
    if (emojiBtn) {
        emojiBtn.addEventListener('click', function() {
            alert('Emoji picker would be implemented here.');
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

// Show error message
function showError(message) {
    // Create error message element if it doesn't exist
    let errorEl = document.getElementById('error-message');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.id = 'error-message';
        errorEl.className = 'error-message';
        document.body.appendChild(errorEl);
    }
    
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        errorEl.style.display = 'none';
    }, 5000);
}
