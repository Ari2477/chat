/**
 * Main Application Module
 * Initializes the app and handles global UI state
 */

// ===== APP INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('Mini Messenger App initialized');
    
    // Check if we're on the main app page
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        // Wait for auth to initialize
        setTimeout(() => {
            const currentUser = authModule.getCurrentUser();
            if (currentUser) {
                initApp();
            }
        }, 1000);
    }
});

/**
 * Initialize the main application
 */
function initApp() {
    console.log('Initializing app...');
    loadUserData();
    setupMobileSidebar();
    setupRippleEffect();
}

/**
 * Load current user data into UI
 */
function loadUserData() {
    const currentUser = authModule.getCurrentUser();
    if (currentUser) {
        authModule.updateUserUI(currentUser);
    }
}

/**
 * Setup mobile sidebar toggle
 */
function setupMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mobileToggle = document.getElementById('mobileMenuToggle');

    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            
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

/**
 * Setup ripple effect on buttons
 */
function setupRippleEffect() {
    document.querySelectorAll('.ripple').forEach(button => {
        button.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const ripple = document.createElement('span');
            ripple.style.position = 'absolute';
            ripple.style.width = '0';
            ripple.style.height = '0';
            ripple.style.borderRadius = '50%';
            ripple.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            ripple.style.transform = 'translate(-50%, -50%)';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.style.animation = 'ripple 0.6s linear';
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// Add ripple animation to styles
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    @keyframes ripple {
        0% {
            width: 0;
            height: 0;
            opacity: 0.5;
        }
        100% {
            width: 500px;
            height: 500px;
            opacity: 0;
        }
    }
`;
document.head.appendChild(rippleStyle);

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
document.addEventListener('DOMContentLoaded', () => {
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
    setupMobileSidebar
};
