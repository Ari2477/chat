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

// Initialize mobile menu with smooth touch
function initMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (!menuToggle || !sidebar) return;
    
    // Remove existing listeners to prevent duplicates
    menuToggle.replaceWith(menuToggle.cloneNode(true));
    const newMenuToggle = document.getElementById('menu-toggle');
    
    newMenuToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Toggle sidebar with smooth animation
        sidebar.classList.toggle('active');
        
        // Update menu icon
        const icon = this.querySelector('i');
        if (sidebar.classList.contains('active')) {
            icon.className = 'fas fa-times';
            document.body.style.overflow = 'hidden'; // Prevent background scroll
        } else {
            icon.className = 'fas fa-bars';
            document.body.style.overflow = ''; // Restore scroll
        }
    });
    
    // Close sidebar when clicking on main content (mobile)
    if (mainContent) {
        mainContent.addEventListener('click', function(e) {
            if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
                // Don't close if clicking inside modal or info panel
                if (!e.target.closest('.modal') && !e.target.closest('.info-panel')) {
                    sidebar.classList.remove('active');
                    document.body.style.overflow = '';
                    const icon = newMenuToggle.querySelector('i');
                    if (icon) icon.className = 'fas fa-bars';
                }
            }
        });
    }
    
    // Handle swipe to close sidebar (mobile)
    let touchStartX = 0;
    let touchEndX = 0;
    
    sidebar.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    sidebar.addEventListener('touchend', function(e) {
        if (window.innerWidth <= 768) {
            touchEndX = e.changedTouches[0].screenX;
            const swipeDistance = touchEndX - touchStartX;
            
            // Swipe left to close sidebar
            if (swipeDistance < -50 && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                document.body.style.overflow = '';
                const icon = newMenuToggle.querySelector('i');
                if (icon) icon.className = 'fas fa-bars';
            }
        }
    }, { passive: true });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
            document.body.style.overflow = '';
            const icon = newMenuToggle.querySelector('i');
            if (icon) icon.className = 'fas fa-bars';
        }
    });
}

// Update UI with user information
function updateUserUI(user) {
    // Update user name and avatar in sidebar
    const userNameEl = document.getElementById('user-name');
    const userAvatarEl = document.getElementById('user-avatar');
    const profileNameEl = document.getElementById('profile-name');
    const profileEmailEl = document.getElementById('profile-email');
    const profileAvatarEl = document.getElementById('profile-avatar');
    const profileJoinedEl = document.getElementById('profile-joined');
    const userEmailEl = document.getElementById('user-email');
    
    if (userNameEl) userNameEl.textContent = user.displayName || user.email.split('@')[0];
    if (userEmailEl) userEmailEl.textContent = user.email;
    if (profileNameEl) profileNameEl.textContent = user.displayName || user.email.split('@')[0];
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
                    profileJoinedEl.textContent = `Joined: ${joinedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
                }
                
                // Update bio if available
                const profileBioEl = document.getElementById('profile-bio');
                if (profileBioEl && userData.bio) {
                    profileBioEl.textContent = userData.bio;
                    profileBioEl.style.display = 'block';
                }
            }
        })
        .catch(error => {
            console.error('Error getting user document:', error);
        });
}

// Setup additional app event listeners
function setupAppListeners() {
    // Search functionality for users - with debounce for performance
    const searchUsersInput = document.getElementById('search-users');
    if (searchUsersInput) {
        let searchTimeout;
        searchUsersInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const searchTerm = this.value.toLowerCase().trim();
                const userItems = document.querySelectorAll('#users-list .list-item');
                
                userItems.forEach(item => {
                    const userName = item.querySelector('.list-item-info h4')?.textContent.toLowerCase() || '';
                    const userEmail = item.querySelector('.list-item-info p')?.textContent.toLowerCase() || '';
                    
                    if (userName.includes(searchTerm) || userEmail.includes(searchTerm)) {
                        item.style.display = 'flex';
                        item.style.opacity = '1';
                        item.style.transform = 'translateX(0)';
                    } else {
                        item.style.display = 'none';
                    }
                });
            }, 300); // Debounce for better performance
        });
    }
    
    // Search functionality for groups - with debounce
    const searchGroupsInput = document.getElementById('search-groups');
    if (searchGroupsInput) {
        let searchTimeout;
        searchGroupsInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const searchTerm = this.value.toLowerCase().trim();
                const groupItems = document.querySelectorAll('#groups-list .list-item');
                
                groupItems.forEach(item => {
                    const groupName = item.querySelector('.list-item-info h4')?.textContent.toLowerCase() || '';
                    
                    if (groupName.includes(searchTerm)) {
                        item.style.display = 'flex';
                        item.style.opacity = '1';
                    } else {
                        item.style.display = 'none';
                    }
                });
            }, 300);
        });
    }
    
    // Tab switching with smooth animation
    const tabBtns = document.querySelectorAll('.sidebar .tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const tabId = this.getAttribute('data-tab');
            
            // Update active tab button with animation
            tabBtns.forEach(b => {
                b.classList.remove('active');
                b.style.transform = 'scale(1)';
            });
            this.classList.add('active');
            this.style.transform = 'scale(0.98)';
            setTimeout(() => { this.style.transform = 'scale(1)'; }, 100);
            
            // Show selected tab content with fade effect
            document.querySelectorAll('.sidebar .tab-content').forEach(content => {
                content.style.opacity = '0';
                content.style.transition = 'opacity 0.2s ease';
                setTimeout(() => {
                    content.classList.remove('active');
                    if (content.id === `${tabId}-tab`) {
                        content.classList.add('active');
                        setTimeout(() => { content.style.opacity = '1'; }, 50);
                    }
                }, 150);
            });
        });
    });
    
    // Logout button with confirmation
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            this.style.transform = 'scale(0.95)';
            setTimeout(() => { this.style.transform = 'scale(1)'; }, 100);
            
            // Show confirmation
            if (confirm('Are you sure you want to logout?')) {
                showLoading(true);
                handleLogout();
            }
        });
    }
    
    // Create group button
    const createGroupBtn = document.getElementById('create-group-btn');
    if (createGroupBtn) {
        createGroupBtn.addEventListener('click', function() {
            this.style.transform = 'scale(0.9)';
            setTimeout(() => { this.style.transform = 'scale(1)'; }, 100);
            openModal('create-group-modal');
            loadAvailableUsersForGroup();
        });
    }
    
    // Create group submit
    const createGroupSubmit = document.getElementById('create-group-submit');
    if (createGroupSubmit) {
        createGroupSubmit.addEventListener('click', function() {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => { this.style.transform = 'scale(1)'; }, 100);
            
            const groupName = document.getElementById('group-name').value.trim();
            const description = document.getElementById('group-description').value.trim();
            
            if (!groupName) {
                showToast('Please enter a group name', 'warning');
                return;
            }
            
            // Get selected members
            const selectedCheckboxes = document.querySelectorAll('#available-users-list input[type="checkbox"]:checked');
            const selectedMembers = Array.from(selectedCheckboxes).map(cb => cb.value);
            
            if (selectedMembers.length === 0) {
                showToast('Please select at least one member', 'warning');
                return;
            }
            
            createGroup(groupName, description, selectedMembers);
        });
    }
    
    // Update profile button
    const updateProfileBtn = document.getElementById('update-profile-btn');
    if (updateProfileBtn) {
        updateProfileBtn.addEventListener('click', function() {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => { this.style.transform = 'scale(1)'; }, 100);
            openModal('profile-modal');
            
            // Load current profile data
            const currentUser = auth.currentUser;
            if (currentUser) {
                db.collection('users').doc(currentUser.uid).get()
                    .then(doc => {
                        if (doc.exists) {
                            const user = doc.data();
                            document.getElementById('edit-name').value = user.displayName || '';
                            document.getElementById('edit-bio').value = user.bio || '';
                        }
                    });
            }
        });
    }
    
    // Update profile submit
    const updateProfileSubmit = document.getElementById('update-profile-submit');
    if (updateProfileSubmit) {
        updateProfileSubmit.addEventListener('click', function() {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => { this.style.transform = 'scale(1)'; }, 100);
            
            const name = document.getElementById('edit-name').value.trim();
            const bio = document.getElementById('edit-bio').value.trim();
            
            if (!name) {
                showToast('Please enter your name', 'warning');
                return;
            }
            
            updateUserProfile(name, bio);
        });
    }
    
    // Chat info button
    const chatInfoBtn = document.getElementById('chat-info-btn');
    if (chatInfoBtn) {
        chatInfoBtn.addEventListener('click', function() {
            this.style.transform = 'scale(0.9)';
            setTimeout(() => { this.style.transform = 'scale(1)'; }, 100);
            document.getElementById('info-panel').classList.add('active');
        });
    }
    
    // Close info panel button
    const closeInfoBtn = document.getElementById('close-info-btn');
    if (closeInfoBtn) {
        closeInfoBtn.addEventListener('click', function() {
            this.style.transform = 'scale(0.9)';
            setTimeout(() => { this.style.transform = 'scale(1)'; }, 100);
            document.getElementById('info-panel').classList.remove('active');
        });
    }
    
    // Close modal buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            this.style.transform = 'scale(0.9)';
            setTimeout(() => { this.style.transform = 'scale(1)'; }, 100);
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
                document.body.style.overflow = ''; // Restore scrolling
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
    
    // Change avatar button
    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    if (changeAvatarBtn) {
        changeAvatarBtn.addEventListener('click', function() {
            this.style.transform = 'scale(0.9)';
            setTimeout(() => { this.style.transform = 'scale(1)'; }, 100);
            showToast('Avatar upload coming soon!', 'info');
        });
    }
    
    // Change password button
    const changePasswordBtn = document.getElementById('change-password-btn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function() {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => { this.style.transform = 'scale(1)'; }, 100);
            showToast('Password reset link will be sent to your email', 'info');
            
            // Send password reset email
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
    
    // Attach file button
    const attachBtn = document.getElementById('attach-btn');
    if (attachBtn) {
        attachBtn.addEventListener('click', function() {
            this.style.transform = 'scale(0.9)';
            setTimeout(() => { this.style.transform = 'scale(1)'; }, 100);
            showToast('File attachment coming soon!', 'info');
        });
    }
    
    // Emoji button
    const emojiBtn = document.getElementById('emoji-btn');
    if (emojiBtn) {
        emojiBtn.addEventListener('click', function() {
            this.style.transform = 'scale(0.9)';
            setTimeout(() => { this.style.transform = 'scale(1)'; }, 100);
            showToast('Emoji picker coming soon!', 'info');
        });
    }
    
    // Prevent zoom on input focus for iOS
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.style.fontSize = '16px';
        });
    });
}

// Show toast notification (replacement for alert)
function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add styles dynamically
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: ${type === 'success' ? '#34c759' : type === 'error' ? '#ff3b30' : '#0084ff'};
        color: white;
        padding: 12px 24px;
        border-radius: 30px;
        font-size: 14px;
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
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Show/hide loading overlay
function showLoading(show) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        if (show) {
            loadingOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            loadingOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
}

// Show error message
function showError(message) {
    showToast(message, 'error');
}

// Add CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            transform: translate(-50%, 100%);
            opacity: 0;
        }
        to {
            transform: translate(-50%, 0);
            opacity: 1;
        }
    }
    
    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }
    
    .toast-notification {
        pointer-events: none;
        backdrop-filter: blur(10px);
    }
    
    @media (max-width: 768px) {
        .toast-notification {
            bottom: 80px;
            font-size: 15px;
            padding: 14px 28px;
        }
    }
    
    .list-item {
        transition: opacity 0.2s ease, transform 0.2s ease;
    }
    
    .sidebar {
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .icon-btn, .send-btn, .logout-btn, .action-btn, .submit-btn, .tab-btn {
        transition: transform 0.1s ease, background-color 0.2s ease;
    }
    
    button {
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
    }
    
    input, textarea, select {
        -webkit-appearance: none;
        appearance: none;
        border-radius: 8px;
    }
`;
document.head.appendChild(style);
