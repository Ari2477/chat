// Main Application Controller
class AppController {
    constructor() {
        this.init();
    }
    
    async init() {
        // Wait for Firebase to be ready
        await this.waitForFirebase();
        
        // Initialize components
        this.setupEventListeners();
        this.setupSidebar();
        this.setupModals();
        
        // Check authentication
        this.checkAuth();
    }
    
    waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.auth && window.db) {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }
    
    checkAuth() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.initializeApp();
            } else {
                window.location.href = 'login.html';
            }
        });
    }
    
    initializeApp() {
        console.log('App initialized');
        this.loadUserData();
    }
    
    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => authManager.logout());
        }
        
        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const sidebar = document.getElementById('sidebar');
        
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
        }
        
        // Sidebar toggle
        const toggleBtn = document.getElementById('toggleSidebar');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
            });
        }
        
        // Send message
        const sendBtn = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');
        
        if (sendBtn && messageInput) {
            sendBtn.addEventListener('click', () => {
                chatManager.sendMessage(messageInput.value);
                messageInput.value = '';
            });
            
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    chatManager.sendMessage(messageInput.value);
                    messageInput.value = '';
                }
            });
        }
        
        // Tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all tabs
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Show corresponding tab pane
                const tabName = btn.dataset.tab;
                document.querySelectorAll('.tab-pane').forEach(pane => {
                    pane.classList.remove('active');
                });
                
                if (tabName === 'chats') {
                    document.getElementById('chatsTab').classList.add('active');
                } else if (tabName === 'groups') {
                    document.getElementById('groupsTab').classList.add('active');
                    this.loadFriendsList();
                } else if (tabName === 'friends') {
                    document.getElementById('friendsTab').classList.add('active');
                    this.loadFriendsList();
                }
            });
        });
        
        // Create group button
        const createGroupBtn = document.getElementById('createGroupBtn');
        if (createGroupBtn) {
            createGroupBtn.addEventListener('click', () => {
                this.openModal('createGroupModal');
                this.loadFriendsForGroup();
            });
        }
        
        // Add friend button
        const addFriendBtn = document.getElementById('addFriendBtn');
        if (addFriendBtn) {
            addFriendBtn.addEventListener('click', () => {
                this.openModal('addFriendModal');
            });
        }
        
        // Modal close buttons
        document.querySelectorAll('.close-modal, .cancel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeAllModals();
            });
        });
        
        // Create group submit
        const createGroupSubmit = document.getElementById('createGroupSubmit');
        if (createGroupSubmit) {
            createGroupSubmit.addEventListener('click', async () => {
                const groupName = document.getElementById('groupNameInput').value;
                if (!groupName) {
                    alert('Please enter a group name');
                    return;
                }
                
                // Get selected members
                const selectedMembers = Array.from(document.querySelectorAll('.member-item input:checked'))
                    .map(input => input.value);
                
                try {
                    await chatManager.createGroup(groupName, selectedMembers);
                    this.closeAllModals();
                    alert('Group created successfully!');
                    
                    // Switch to groups tab
                    document.querySelector('[data-tab="groups"]').click();
                    
                } catch (error) {
                    alert('Failed to create group: ' + error.message);
                }
            });
        }
        
        // Add friend submit
        const addFriendSubmit = document.getElementById('addFriendSubmit');
        if (addFriendSubmit) {
            addFriendSubmit.addEventListener('click', async () => {
                const email = document.getElementById('friendEmailInput').value;
                if (!email) {
                    alert('Please enter an email address');
                    return;
                }
                
                try {
                    await chatManager.addFriend(email);
                    this.closeAllModals();
                    alert('Friend request sent successfully!');
                    document.getElementById('friendEmailInput').value = '';
                    
                } catch (error) {
                    alert('Failed to add friend: ' + error.message);
                }
            });
        }
    }
    
    setupSidebar() {
        // Check if mobile
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.remove('active');
            
            // Close sidebar when clicking outside
            document.addEventListener('click', (e) => {
                if (!sidebar.contains(e.target) && !e.target.classList.contains('mobile-menu-btn')) {
                    sidebar.classList.remove('active');
                }
            });
        }
    }
    
    setupModals() {
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });
    }
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
    
    async loadUserData() {
        const user = auth.currentUser;
        if (!user) return;
        
        // Load user's friends
        await this.loadFriendsList();
    }
    
    async loadFriendsList() {
        const user = auth.currentUser;
        if (!user) return;
        
        const friendsList = document.getElementById('friendsList');
        if (!friendsList) return;
        
        try {
            // Get accepted friend requests
            const snapshot = await db.collection('friendRequests')
                .where('status', '==', 'accepted')
                .where('participants', 'array-contains', user.uid)
                .get();
            
            friendsList.innerHTML = '';
            
            for (const doc of snapshot.docs) {
                const request = doc.data();
                const friendId = request.from === user.uid ? request.to : request.from;
                
                // Get friend details
                const friendDoc = await db.collection('users').doc(friendId).get();
                const friendData = friendDoc.data();
                
                const friendElement = this.createFriendElement(friendData, friendId);
                friendsList.appendChild(friendElement);
            }
            
        } catch (error) {
            console.error('Error loading friends:', error);
        }
    }
    
    createFriendElement(friendData, friendId) {
        const div = document.createElement('div');
        div.className = 'friend-item';
        div.dataset.friendId = friendId;
        
        div.innerHTML = `
            <div class="chat-avatar">
                ${friendData.photoURL ? `<img src="${friendData.photoURL}" alt="${friendData.displayName}">` : 
                    `<span>${friendData.displayName ? friendData.displayName[0].toUpperCase() : '?'}</span>`}
            </div>
            <div class="chat-info">
                <div class="chat-name">${friendData.displayName || friendData.email}</div>
                <div class="chat-status">
                    <span class="status ${friendData.online ? 'online' : 'offline'}">
                        <i class="fas fa-circle"></i> ${friendData.online ? 'Online' : 'Offline'}
                    </span>
                </div>
            </div>
            <button class="action-btn" onclick="startPrivateChat('${friendId}')">
                <i class="fas fa-comment"></i>
            </button>
        `;
        
        return div;
    }
    
    async loadFriendsForGroup() {
        const user = auth.currentUser;
        if (!user) return;
        
        const membersList = document.getElementById('membersList');
        if (!membersList) return;
        
        try {
            const snapshot = await db.collection('friendRequests')
                .where('status', '==', 'accepted')
                .where('participants', 'array-contains', user.uid)
                .get();
            
            membersList.innerHTML = '';
            
            for (const doc of snapshot.docs) {
                const request = doc.data();
                const friendId = request.from === user.uid ? request.to : request.from;
                
                const friendDoc = await db.collection('users').doc(friendId).get();
                const friendData = friendDoc.data();
                
                const memberElement = document.createElement('div');
                memberElement.className = 'member-item';
                memberElement.innerHTML = `
                    <label>
                        <input type="checkbox" value="${friendId}">
                        <span>${friendData.displayName || friendData.email}</span>
                    </label>
                `;
                
                membersList.appendChild(memberElement);
            }
            
        } catch (error) {
            console.error('Error loading friends for group:', error);
        }
    }
}

// Global functions
window.startPrivateChat = async function(friendId) {
    const user = auth.currentUser;
    
    // Check if chat already exists
    const snapshot = await db.collection('privateChats')
        .where('participants', 'array-contains', user.uid)
        .get();
    
    let existingChat = null;
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.participants.includes(friendId)) {
            existingChat = { id: doc.id, data };
        }
    });
    
    if (existingChat) {
        chatManager.openChat(existingChat.id, existingChat.data, 'private');
    } else {
        // Create new private chat
        const chatData = {
            participants: [user.uid, friendId],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessageTime: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await db.collection('privateChats').add(chatData);
        chatManager.openChat(docRef.id, chatData, 'private');
    }
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('active');
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.appController = new AppController();
});
