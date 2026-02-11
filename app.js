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
            
            // Initialize mobile menu
            initMobileMenu();
            
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

// ============ MOBILE MENU TOGGLE - FIXED ============
function initMobileMenu() {
    setTimeout(() => {
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        
        if (!menuToggle) {
            // Create menu toggle if not exists
            const header = document.querySelector('.chat-header');
            if (header) {
                const newToggle = document.createElement('button');
                newToggle.id = 'menu-toggle';
                newToggle.className = 'menu-toggle';
                newToggle.innerHTML = '<i class="fas fa-bars"></i>';
                header.prepend(newToggle);
            }
            return;
        }
        
        if (!sidebar) return;
        
        // Remove existing listeners
        const newToggle = menuToggle.cloneNode(true);
        menuToggle.parentNode.replaceChild(newToggle, menuToggle);
        
        newToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            sidebar.classList.toggle('active');
            
            const icon = this.querySelector('i');
            if (icon) {
                icon.className = sidebar.classList.contains('active') ? 'fas fa-times' : 'fas fa-bars';
                document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
            }
        });
        
        // Close when clicking outside
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
                if (!sidebar.contains(e.target) && !newToggle.contains(e.target)) {
                    sidebar.classList.remove('active');
                    document.body.style.overflow = '';
                    const icon = newToggle.querySelector('i');
                    if (icon) icon.className = 'fas fa-bars';
                }
            }
        });
    }, 100);
}

// ============ UPDATE USER UI WITH COMPLETE INFO ============
function updateUserUI(user) {
    const userNameEl = document.getElementById('user-name');
    const userAvatarEl = document.getElementById('user-avatar');
    const profileNameEl = document.getElementById('profile-name');
    const profileEmailEl = document.getElementById('profile-email');
    const profileAvatarEl = document.getElementById('profile-avatar');
    const profileJoinedEl = document.getElementById('profile-joined');
    const profileBioEl = document.getElementById('profile-bio');
    
    const displayName = user.displayName || user.email.split('@')[0];
    const avatarUrl = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0084ff&color=fff&size=128`;
    
    if (userNameEl) userNameEl.textContent = displayName;
    if (userAvatarEl) userAvatarEl.src = avatarUrl;
    if (profileNameEl) profileNameEl.textContent = displayName;
    if (profileEmailEl) profileEmailEl.textContent = user.email;
    if (profileAvatarEl) profileAvatarEl.src = avatarUrl;
    
    // Get user document from Firestore
    db.collection('users').doc(user.uid).get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                
                // Update joined date
                if (profileJoinedEl && userData.createdAt) {
                    const date = userData.createdAt.toDate();
                    profileJoinedEl.textContent = `Joined: ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
                }
                
                // Update bio
                if (profileBioEl) {
                    profileBioEl.textContent = userData.bio || 'No bio yet. Click edit to add one!';
                    profileBioEl.style.display = 'block';
                }
            } else {
                // Create user document if not exists
                db.collection('users').doc(user.uid).set({
                    uid: user.uid,
                    email: user.email,
                    displayName: displayName,
                    photoURL: avatarUrl,
                    bio: '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        })
        .catch(error => {
            console.error('Error getting user document:', error);
        });
}

// ============ UPDATE USER PROFILE - WORKING! ============
function updateUserProfile(name, bio, photoFile = null) {
    const user = auth.currentUser;
    if (!user) return;
    
    showLoading(true);
    
    // Update Firestore first
    const updateData = {
        displayName: name,
        bio: bio || '',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // If there's a photo file, upload it
    if (photoFile) {
        const storageRef = storage.ref();
        const avatarRef = storageRef.child(`avatars/${user.uid}/${Date.now()}_${photoFile.name}`);
        
        avatarRef.put(photoFile)
            .then(snapshot => snapshot.ref.getDownloadURL())
            .then(photoURL => {
                updateData.photoURL = photoURL;
                return db.collection('users').doc(user.uid).update(updateData);
            })
            .then(() => {
                return user.updateProfile({
                    displayName: name,
                    photoURL: updateData.photoURL
                });
            })
            .then(() => {
                showToast('Profile updated successfully!', 'success');
                updateUserUI(user);
                closeModal('profile-modal');
                showLoading(false);
            })
            .catch(error => {
                console.error('Error updating profile with photo:', error);
                showToast('Failed to update profile', 'error');
                showLoading(false);
            });
    } else {
        // No photo, just update name and bio
        db.collection('users').doc(user.uid).update(updateData)
            .then(() => {
                return user.updateProfile({
                    displayName: name
                });
            })
            .then(() => {
                showToast('Profile updated successfully!', 'success');
                updateUserUI(user);
                closeModal('profile-modal');
                showLoading(false);
            })
            .catch(error => {
                console.error('Error updating profile:', error);
                showToast('Failed to update profile', 'error');
                showLoading(false);
            });
    }
}

// ============ AVATAR UPLOAD - WORKING! ============
function setupAvatarUpload() {
    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    if (!changeAvatarBtn) return;
    
    // Create file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.id = 'avatar-upload-input';
    document.body.appendChild(fileInput);
    
    // Remove old listener
    const newBtn = changeAvatarBtn.cloneNode(true);
    changeAvatarBtn.parentNode.replaceChild(newBtn, changeAvatarBtn);
    
    newBtn.addEventListener('click', function(e) {
        e.preventDefault();
        fileInput.click();
    });
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image size must be less than 5MB', 'error');
            return;
        }
        
        // Show preview
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewUrl = e.target.result;
            const profileAvatar = document.getElementById('profile-avatar');
            const userAvatar = document.getElementById('user-avatar');
            
            if (profileAvatar) profileAvatar.src = previewUrl;
            if (userAvatar) userAvatar.src = previewUrl;
        };
        reader.readAsDataURL(file);
        
        // Get current profile data
        const name = document.getElementById('edit-name')?.value || auth.currentUser.displayName;
        const bio = document.getElementById('edit-bio')?.value || '';
        
        // Update profile with photo
        updateUserProfile(name, bio, file);
    });
}

// ============ SETUP APP LISTENERS - COMPLETE ============
function setupAppListeners() {
    // Search users with debounce
    const searchUsersInput = document.getElementById('search-users');
    if (searchUsersInput) {
        let timeout;
        searchUsersInput.addEventListener('input', function() {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                const term = this.value.toLowerCase();
                document.querySelectorAll('#users-list .list-item').forEach(item => {
                    const name = item.querySelector('.list-item-info h4')?.textContent.toLowerCase() || '';
                    item.style.display = name.includes(term) ? 'flex' : 'none';
                });
            }, 300);
        });
    }
    
    // Search groups with debounce
    const searchGroupsInput = document.getElementById('search-groups');
    if (searchGroupsInput) {
        let timeout;
        searchGroupsInput.addEventListener('input', function() {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                const term = this.value.toLowerCase();
                document.querySelectorAll('#groups-list .list-item').forEach(item => {
                    const name = item.querySelector('.list-item-info h4')?.textContent.toLowerCase() || '';
                    item.style.display = name.includes(term) ? 'flex' : 'none';
                });
            }, 300);
        });
    }
    
    // Tab switching
    document.querySelectorAll('.sidebar .tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            document.querySelectorAll('.sidebar .tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.sidebar .tab-content').forEach(c => {
                c.classList.remove('active');
                if (c.id === `${tabId}-tab`) c.classList.add('active');
            });
        });
    });
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                showLoading(true);
                handleLogout();
            }
        });
    }
    
    // ============ PROFILE EDIT - FULLY WORKING! ============
    const updateProfileBtn = document.getElementById('update-profile-btn');
    if (updateProfileBtn) {
        updateProfileBtn.addEventListener('click', function() {
            const user = auth.currentUser;
            if (!user) return;
            
            // Open modal
            const modal = document.getElementById('profile-modal');
            if (modal) modal.classList.add('active');
            
            // Load current data
            db.collection('users').doc(user.uid).get()
                .then(doc => {
                    if (doc.exists) {
                        const data = doc.data();
                        document.getElementById('edit-name').value = data.displayName || '';
                        document.getElementById('edit-bio').value = data.bio || '';
                    }
                });
        });
    }
    
    // Setup avatar upload
    setupAvatarUpload();
    
    // ============ UPDATE PROFILE SUBMIT - WORKING! ============
    const updateProfileSubmit = document.getElementById('update-profile-submit');
    if (updateProfileSubmit) {
        const newSubmit = updateProfileSubmit.cloneNode(true);
        updateProfileSubmit.parentNode.replaceChild(newSubmit, updateProfileSubmit);
        
        newSubmit.addEventListener('click', function() {
            const name = document.getElementById('edit-name')?.value.trim();
            const bio = document.getElementById('edit-bio')?.value.trim();
            
            if (!name) {
                showToast('Please enter your name', 'warning');
                return;
            }
            
            // Update without photo
            updateUserProfile(name, bio || '');
        });
    }
    
    // ============ CREATE GROUP - WORKING! ============
    const createGroupBtn = document.getElementById('create-group-btn');
    if (createGroupBtn) {
        createGroupBtn.addEventListener('click', function() {
            const modal = document.getElementById('create-group-modal');
            if (modal) {
                modal.classList.add('active');
                loadAvailableUsersForGroup();
            }
        });
    }
    
    const createGroupSubmit = document.getElementById('create-group-submit');
    if (createGroupSubmit) {
        createGroupSubmit.addEventListener('click', function() {
            const name = document.getElementById('group-name')?.value.trim();
            const desc = document.getElementById('group-description')?.value.trim();
            const selected = document.querySelectorAll('#available-users-list input[type="checkbox"]:checked');
            
            if (!name) {
                showToast('Please enter group name', 'warning');
                return;
            }
            
            if (selected.length === 0) {
                showToast('Please select at least one member', 'warning');
                return;
            }
            
            const members = Array.from(selected).map(cb => cb.value);
            createGroup(name, desc || '', members);
        });
    }
    
    // ============ CHAT INFO PANEL ============
    const chatInfoBtn = document.getElementById('chat-info-btn');
    if (chatInfoBtn) {
        chatInfoBtn.addEventListener('click', function() {
            document.getElementById('info-panel')?.classList.add('active');
        });
    }
    
    const closeInfoBtn = document.getElementById('close-info-btn');
    if (closeInfoBtn) {
        closeInfoBtn.addEventListener('click', function() {
            document.getElementById('info-panel')?.classList.remove('active');
        });
    }
    
    // ============ MODAL CLOSE BUTTONS ============
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
    
    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
    
    // ============ PASSWORD CHANGE - WORKING! ============
    const changePasswordBtn = document.getElementById('change-password-btn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function() {
            const user = auth.currentUser;
            if (user && user.email) {
                auth.sendPasswordResetEmail(user.email)
                    .then(() => {
                        showToast('Password reset email sent! Check your inbox.', 'success');
                    })
                    .catch(error => {
                        showToast('Failed to send reset email. Please try again.', 'error');
                    });
            }
        });
    }
}

// ============ TOAST NOTIFICATION ============
function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-circle' : 
                 type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    
    toast.innerHTML = `<i class="fas fa-${icon}"></i><span>${message}</span>`;
    
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#34c759' : type === 'error' ? '#ff3b30' : type === 'warning' ? '#ff9500' : '#0084ff'};
        color: white;
        padding: 12px 24px;
        border-radius: 30px;
        font-size: 15px;
        font-weight: 500;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideUp 0.3s ease;
        max-width: 90%;
        word-break: break-word;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============ LOADING OVERLAY ============
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        if (show) {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
}

// ============ ADD ANIMATIONS ============
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from { transform: translate(-50%, 100%); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    .sidebar {
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .menu-toggle {
        display: none;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: #0084ff;
        color: white;
        border: none;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
    }
    @media (max-width: 768px) {
        .menu-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
        }
    }
    button {
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
    }
`;
document.head.appendChild(style);
