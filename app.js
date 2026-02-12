/**
 * Main Application Module
 * Initializes the app and handles global UI state
 */

// ===== APP INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('Mini Messenger App initialized');
    
    // Check if we're on the main app page
    if (window.location.pathname.includes('index.html')) {
        initApp();
    }
});

/**
 * Initialize the main application
 */
async function initApp() {
    // Wait for user to be loaded
    const checkUser = setInterval(() => {
        const currentUser = authModule.getCurrentUser();
        if (currentUser) {
            clearInterval(checkUser);
            loadUserData();
        }
    }, 100);
}

/**
 * Load current user data into UI
 */
function loadUserData() {
    const currentUser = authModule.getCurrentUser();
    if (!currentUser) return;

    // Update UI with user data
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');

    if (userAvatar) {
        userAvatar.src = currentUser.photoURL || 'https://via.placeholder.com/150';
        userAvatar.alt = currentUser.displayName || 'User';
    }

    if (userName) {
        userName.textContent = currentUser.displayName || 'Anonymous User';
    }
}

// ===== MOBILE RESPONSIVENESS =====

/**
 * Setup mobile sidebar toggle
 */
function setupMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mobileToggle = document.getElementById('mobileMenuToggle');

    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            
            // Toggle icon
            const icon = mobileToggle.querySelector('i');
            if (icon) {
                if (sidebar.classList.contains('active')) {
                    icon.className = 'fas fa-times';
                } else {
                    icon.className = 'fas fa-bars';
                }
            }
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
                    sidebar.classList.remove('active');
                    const icon = mobileToggle.querySelector('i');
                    if (icon) {
                        icon.className = 'fas fa-bars';
                    }
                }
            }
        });
    }
}

// ===== CHAT INFO MODAL =====

/**
 * Load chat information into modal
 */
async function loadChatInfo() {
    const currentChat = window.chatModule?.currentChat || { id: 'global', type: 'group' };
    const content = document.getElementById('chatInfoContent');
    if (!content) return;

    if (currentChat.type === 'group') {
        // Load group chat info
        try {
            // Get total members (online users)
            const usersSnapshot = await db.collection('users')
                .where('online', '==', true)
                .get();

            // Get total messages
            const messagesSnapshot = await db.collection('groupChats')
                .doc('global')
                .collection('messages')
                .count()
                .get();

            content.innerHTML = `
                <div class="chat-info-section">
                    <h4><i class="fas fa-globe"></i> Global Group Chat</h4>
                    <div class="info-stats">
                        <div class="stat-item">
                            <i class="fas fa-users"></i>
                            <span>${usersSnapshot.size} members online</span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-comment"></i>
                            <span>${messagesSnapshot.data().count || 0} messages</span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-calendar"></i>
                            <span>Created: ${new Date().toLocaleDateString()}</span>
                        </div>
                    </div>
                    <h5>Active Users</h5>
                    <div class="active-users-list">
                        ${Array.from(usersSnapshot.docs).map(doc => {
                            const user = doc.data();
                            return `
                                <div class="active-user">
                                    <img src="${user.photo}" alt="${user.name}">
                                    <span>${user.name}</span>
                                    <span class="status-dot online"></span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading chat info:', error);
            content.innerHTML = '<p>Failed to load chat information</p>';
        }
    } else {
        // Load private chat info
        try {
            const otherUser = await authModule.getUserByUid(currentChat.otherUserId);
            
            content.innerHTML = `
                <div class="chat-info-section">
                    <h4><i class="fas fa-user"></i> Private Chat</h4>
                    <div class="user-profile-info">
                        <img src="${otherUser.photo}" alt="${otherUser.name}" class="profile-image">
                        <h5>${otherUser.name}</h5>
                        <p>${otherUser.email || 'No email'}</p>
                        <div class="info-item">
                            <label>User ID</label>
                            <code>${otherUser.uid}</code>
                        </div>
                        <div class="info-item">
                            <label>Status</label>
                            <span class="${otherUser.online ? 'online' : 'offline'}">
                                ${otherUser.online ? 'Online' : 'Offline'}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading private chat info:', error);
            content.innerHTML = '<p>Failed to load user information</p>';
        }
    }
}

// ===== NOTIFICATION SYSTEM =====

/**
 * Create and show toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type} glass-effect slide-up`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.add('slide-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== ADDITIONAL STYLES =====

// Inject additional dynamic styles
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    /* Notification Styles */
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: rgba(26, 26, 46, 0.95);
        border-left: 4px solid var(--accent-purple);
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 9999;
        animation: slideInRight 0.3s ease;
    }

    .notification.error {
        border-left-color: #ff4444;
    }

    .notification.success {
        border-left-color: #4caf50;
    }

    .notification.slide-out {
        animation: slideOutRight 0.3s ease forwards;
    }

    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    /* No Messages Placeholder */
    .no-messages {
        text-align: center;
        color: var(--text-dim);
        padding: 40px;
        font-style: italic;
    }

    /* Chat Info Modal Styles */
    .chat-info-section {
        padding: 10px;
    }

    .info-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 15px;
        margin: 20px 0;
    }

    .stat-item {
        background: rgba(255, 255, 255, 0.05);
        padding: 15px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .stat-item i {
        color: var(--accent-purple);
        font-size: 1.2rem;
    }

    .active-users-list {
        max-height: 300px;
        overflow-y: auto;
        margin-top: 15px;
    }

    .active-user {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        margin-bottom: 8px;
    }

    .active-user img {
        width: 35px;
        height: 35px;
        border-radius: 50%;
        object-fit: cover;
    }

    .profile-image {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
        margin-bottom: 15px;
        border: 3px solid var(--accent-purple);
    }

    .user-profile-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 20px;
    }

    .user-profile-info h5 {
        font-size: 1.2rem;
        margin-bottom: 5px;
    }

    .user-profile-info p {
        color: var(--text-dim);
        margin-bottom: 20px;
    }

    /* Toast Notifications */
    .toast-notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 24px;
        background: rgba(26, 26, 46, 0.95);
        border-radius: 30px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 9999;
        animation: slideInUp 0.3s ease;
    }

    .toast-notification.slide-out {
        animation: slideOutDown 0.3s ease forwards;
    }

    @keyframes slideInUp {
        from {
            transform: translateY(100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    @keyframes slideOutDown {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(100%);
            opacity: 0;
        }
    }

    /* Message Seen Indicator */
    .message-seen {
        position: absolute;
        bottom: -15px;
        right: 5px;
        font-size: 0.7rem;
        color: var(--accent-purple);
    }

    /* Ripple Effect Enhancement */
    .ripple {
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
    }

    .ripple:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }

    /* Hover Glow Effects */
    .chat-item:hover {
        box-shadow: 0 0 15px rgba(102, 126, 234, 0.3);
    }

    .icon-btn:hover {
        box-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
    }

    /* Floating Send Button for Mobile */
    @media (max-width: 768px) {
        .message-input-container {
            position: sticky;
            bottom: 0;
            background: rgba(26, 26, 46, 0.95);
            backdrop-filter: blur(20px);
            border-top: 1px solid var(--glass-border);
            padding: 15px;
        }

        .btn-send {
            width: 45px;
            height: 45px;
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        .chat-item.active {
            background: rgba(102, 126, 234, 0.3);
        }
    }

    /* Custom Scrollbar Enhancement */
    ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
    }

    ::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
    }

    ::-webkit-scrollbar-thumb {
        background: rgba(102, 126, 234, 0.5);
        border-radius: 10px;
    }

    ::-webkit-scrollbar-thumb:hover {
        background: rgba(102, 126, 234, 0.8);
    }

    /* Smooth Transitions */
    * {
        transition: background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
    }

    /* Glass Effect Enhancement */
    .glass-effect {
        background: rgba(26, 26, 46, 0.6);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    /* Animation for new messages */
    @keyframes messagePop {
        0% {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
        }
        100% {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }

    .message {
        animation: messagePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
`;

document.head.appendChild(additionalStyles);

// ===== EVENT LISTENERS =====

// Setup additional event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Setup mobile sidebar
    setupMobileSidebar();

    // Setup chat info modal
    const chatInfoBtn = document.getElementById('chatInfoBtn');
    if (chatInfoBtn) {
        chatInfoBtn.addEventListener('click', async () => {
            await loadChatInfo();
            const modal = document.getElementById('chatInfoModal');
            if (modal) {
                modal.classList.add('active');
            }
        });
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        const sidebar = document.getElementById('sidebar');
        const mobileToggle = document.getElementById('mobileMenuToggle');
        
        if (window.innerWidth > 768 && sidebar && mobileToggle) {
            sidebar.classList.remove('active');
            const icon = mobileToggle.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-bars';
            }
        }
    });

    // Prevent body scroll when modal is open
    document.querySelectorAll('.modal').forEach(modal => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (modal.classList.contains('active')) {
                        document.body.style.overflow = 'hidden';
                    } else {
                        document.body.style.overflow = '';
                    }
                }
            });
        });

        observer.observe(modal, { attributes: true });
    });
});

// Export app functions
window.appModule = {
    initApp,
    loadUserData,
    showToast,
    loadChatInfo
};
