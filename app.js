/**
 * Main Application Module - FIXED Mobile Toggle
 * Ang problema lang: yung sidebar toggle hindi mapindot at hindi smooth
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
    setupMobileSidebar(); // FIXED VERSION
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
 * Setup mobile sidebar toggle - COMPLETELY FIXED VERSION
 * Hindi na mahirap pindutin, smooth na ang animation
 */
function setupMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mobileToggle = document.getElementById('mobileMenuToggle');
    
    // KUNG WALA NAMAN MOBILE TOGGLE, 'WAG NA MAG-PROCEED
    if (!mobileToggle || !sidebar) return;
    
    // REMOVE OLD EVENT LISTENERS - para hindi mag-doble
    const newMobileToggle = mobileToggle.cloneNode(true);
    mobileToggle.parentNode.replaceChild(newMobileToggle, mobileToggle);
    
    // I-UPDATE ANG VARIABLE
    const updatedMobileToggle = document.getElementById('mobileMenuToggle');
    const updatedSidebar = document.getElementById('sidebar');
    
    // MAG-ADD NG OVERLAY PARA SA MOBILE (para maganda ang pagsara)
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(3px);
            z-index: 98;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        `;
        document.body.appendChild(overlay);
    }

    // TOGGLE SIDEBAR - SMOOTH NA 'TO!
    updatedMobileToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation(); // PARA HINAG MAG-BUBBLE ANG EVENT
        
        console.log('Mobile toggle clicked'); // PARA malaman kung gumagana
        
        updatedSidebar.classList.toggle('active');
        
        const icon = updatedMobileToggle.querySelector('i');
        if (icon) {
            if (updatedSidebar.classList.contains('active')) {
                // OPEN SIDEBAR
                icon.className = 'fas fa-times';
                updatedMobileToggle.style.background = 'linear-gradient(135deg, #764ba2, #667eea)';
                overlay.style.opacity = '1';
                overlay.style.visibility = 'visible';
                document.body.style.overflow = 'hidden'; // PREVENT SCROLL
            } else {
                // CLOSE SIDEBAR
                icon.className = 'fas fa-bars';
                updatedMobileToggle.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
                overlay.style.opacity = '0';
                overlay.style.visibility = 'hidden';
                document.body.style.overflow = ''; // ENABLE SCROLL
            }
        }
    });

    // CLOSE SIDEBAR KAPAG NAG-CLICK SA OVERLAY
    overlay.addEventListener('click', function() {
        updatedSidebar.classList.remove('active');
        
        const icon = updatedMobileToggle.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-bars';
            updatedMobileToggle.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
        }
        
        overlay.style.opacity = '0';
        overlay.style.visibility = 'hidden';
        document.body.style.overflow = '';
    });

    // CLOSE SIDEBAR KAPAG NAG-CLICK SA CHAT ITEM (MOBILE LANG)
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            const chatItem = e.target.closest('.chat-item');
            const isToggle = e.target.closest('#mobileMenuToggle');
            
            if (chatItem && !isToggle && updatedSidebar.classList.contains('active')) {
                // MAG-DELAY PARA MAKITA ANG TRANSITION
                setTimeout(() => {
                    updatedSidebar.classList.remove('active');
                    
                    const icon = updatedMobileToggle.querySelector('i');
                    if (icon) {
                        icon.className = 'fas fa-bars';
                        updatedMobileToggle.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
                    }
                    
                    overlay.style.opacity = '0';
                    overlay.style.visibility = 'hidden';
                    document.body.style.overflow = '';
                }, 200);
            }
        }
    });

    // CLOSE SIDEBAR KAPAG NAG-CLICK SA LABAS (MALIBAN SA TOGGLE AT SIDEBAR)
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            const isClickInsideSidebar = updatedSidebar.contains(e.target);
            const isClickOnToggle = updatedMobileToggle.contains(e.target);
            
            if (!isClickInsideSidebar && !isClickOnToggle && updatedSidebar.classList.contains('active')) {
                updatedSidebar.classList.remove('active');
                
                const icon = updatedMobileToggle.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-bars';
                    updatedMobileToggle.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
                }
                
                overlay.style.opacity = '0';
                overlay.style.visibility = 'hidden';
                document.body.style.overflow = '';
            }
        }
    });

    // RESET KAPAG NAG-RESIZE NG WINDOW
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            updatedSidebar.classList.remove('active');
            updatedSidebar.style.transform = '';
            
            const icon = updatedMobileToggle.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-bars';
                updatedMobileToggle.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
            }
            
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
            document.body.style.overflow = '';
        }
    });
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
            ripple.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
            ripple.style.transform = 'translate(-50%, -50%)';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.style.animation = 'ripple 0.6s ease-out';
            ripple.style.pointerEvents = 'none';
            ripple.style.zIndex = '1000';
            
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
            opacity: 0.6;
        }
        100% {
            width: 500px;
            height: 500px;
            opacity: 0;
        }
    }
    
    /* FIXED MOBILE SIDEBAR STYLES */
    @media (max-width: 768px) {
        .sidebar {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 85% !important;
            max-width: 320px !important;
            height: 100vh !important;
            z-index: 99 !important;
            transform: translateX(-100%) !important;
            transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
            border-radius: 0 20px 20px 0 !important;
            box-shadow: none !important;
        }
        
        .sidebar.active {
            transform: translateX(0) !important;
            box-shadow: 5px 0 30px rgba(0, 0, 0, 0.3) !important;
        }
        
        .mobile-menu-btn {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: fixed !important;
            top: 15px !important;
            left: 15px !important;
            width: 48px !important;
            height: 48px !important;
            border: none !important;
            border-radius: 50% !important;
            background: linear-gradient(135deg, #667eea, #764ba2) !important;
            color: white !important;
            font-size: 1.2rem !important;
            cursor: pointer !important;
            z-index: 100 !important;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4) !important;
            transition: all 0.3s ease !important;
            border: 2px solid rgba(255, 255, 255, 0.2) !important;
        }
        
        .mobile-menu-btn:hover {
            transform: scale(1.1) !important;
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6) !important;
        }
        
        .mobile-menu-btn:active {
            transform: scale(0.95) !important;
        }
        
        .chat-area {
            width: 100% !important;
            border-radius: 0 !important;
        }
        
        .chat-header {
            padding-left: 70px !important;
        }
        
        .message {
            max-width: 85% !important;
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
            mobileToggle.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
        }
        
        // REMOVE OVERLAY KUNG NASA DESKTOP
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
        }
        
        document.body.style.overflow = '';
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

// CLOSE SIDEBAR KAPAG NAG-PRESS NG ESCAPE KEY
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const sidebar = document.getElementById('sidebar');
        const mobileToggle = document.getElementById('mobileMenuToggle');
        const overlay = document.querySelector('.sidebar-overlay');
        
        if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            
            if (mobileToggle) {
                const icon = mobileToggle.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-bars';
                    mobileToggle.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
                }
            }
            
            if (overlay) {
                overlay.style.opacity = '0';
                overlay.style.visibility = 'hidden';
            }
            
            document.body.style.overflow = '';
        }
    }
});

// Export app functions
window.appModule = {
    initApp,
    loadUserData,
    setupMobileSidebar
};
