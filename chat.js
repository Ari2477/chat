/**
 * Chat Module - FULLY FIXED
 * Handles all messaging and chat functionality
 */

// ===== CHAT STATE =====
let currentChat = {
    id: 'global',
    type: 'group',
    name: 'Global Group Chat'
};

let typingTimeouts = {};
let messageListener = null;
let typingListener = null;
let onlineUsersListener = null;

// ===== GROUP CHAT FUNCTIONS =====

/**
 * Load global group chat
 */
function loadGlobalChat() {
    currentChat = {
        id: 'global',
        type: 'group',
        name: 'Global Group Chat'
    };

    updateChatHeader();
    loadMessages('groupChats', 'global');
    setupTypingIndicator('groupChats', 'global');
    loadOnlineUsers();
    
    // Mark active chat
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const globalChatItem = document.querySelector(`.chat-item[data-chat-id="global"]`);
    if (globalChatItem) {
        globalChatItem.classList.add('active');
    }
}

// ===== PRIVATE CHAT FUNCTIONS - COMPLETELY FIXED =====

/**
 * Create or get private chat - FIXED VERSION
 */
async function createPrivateChat(otherUserId) {
    const currentUser = authModule.getCurrentUser();
    
    // VALIDATION CHECKS
    if (!currentUser) {
        authModule.showNotification('Please login first', 'error');
        return;
    }
    
    if (!otherUserId || otherUserId.trim() === '') {
        authModule.showNotification('Please enter a valid User ID', 'error');
        return;
    }
    
    if (currentUser.uid === otherUserId.trim()) {
        authModule.showNotification('Cannot chat with yourself', 'error');
        return;
    }

    try {
        authModule.showNotification('Looking for user...', 'info');
        
        // CHECK IF USER EXISTS
        const otherUser = await authModule.getUserByUid(otherUserId.trim());
        if (!otherUser) {
            authModule.showNotification('User not found! Please check the UID', 'error');
            return;
        }

        authModule.showNotification(`User found! Creating chat with ${otherUser.name}...`, 'info');

        // CHECK IF CHAT ALREADY EXISTS
        const existingChat = await findExistingPrivateChat(currentUser.uid, otherUserId.trim());
        
        let chatId;
        
        if (existingChat) {
            // USE EXISTING CHAT
            chatId = existingChat.id;
            authModule.showNotification('Opening existing chat...', 'success');
            openPrivateChat(chatId, otherUser);
        } else {
            // CREATE NEW PRIVATE CHAT - FIXED VERSION
            const chatData = {
                members: [currentUser.uid, otherUserId.trim()],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: currentUser.uid,
                lastMessage: null,
                lastMessageTime: null
            };
            
            const chatRef = await db.collection('privateChats').add(chatData);
            chatId = chatRef.id;
            
            authModule.showNotification('Private chat created successfully!', 'success');
            openPrivateChat(chatId, otherUser);
        }
        
        // SWITCH TO CHATS TAB
        const chatsTab = document.querySelector('.tab-btn[data-tab="chats"]');
        if (chatsTab) {
            chatsTab.click();
        }
        
        // CLOSE MOBILE SIDEBAR IF OPEN
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            const mobileToggle = document.getElementById('mobileMenuToggle');
            if (sidebar && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                const icon = mobileToggle?.querySelector('i');
                if (icon) icon.className = 'fas fa-bars';
            }
        }
        
    } catch (error) {
        console.error('Error creating private chat:', error);
        authModule.showNotification('Failed to create private chat: ' + error.message, 'error');
    }
}

/**
 * Find existing private chat between two users - FIXED VERSION
 */
async function findExistingPrivateChat(uid1, uid2) {
    try {
        console.log('Searching for existing chat between:', uid1, 'and', uid2);
        
        // QUERY 1: Find chats where uid1 is a member
        const chatsRef = db.collection('privateChats');
        const snapshot1 = await chatsRef
            .where('members', 'array-contains', uid1)
            .get();

        // Check each chat if it contains uid2
        for (const doc of snapshot1.docs) {
            const data = doc.data();
            if (data.members && Array.isArray(data.members)) {
                if (data.members.includes(uid2)) {
                    console.log('Found existing chat:', doc.id);
                    return { id: doc.id, ...data };
                }
            }
        }
        
        // QUERY 2: Try the other way around just to be sure
        const snapshot2 = await chatsRef
            .where('members', 'array-contains', uid2)
            .get();
            
        for (const doc of snapshot2.docs) {
            const data = doc.data();
            if (data.members && Array.isArray(data.members)) {
                if (data.members.includes(uid1)) {
                    console.log('Found existing chat (reverse):', doc.id);
                    return { id: doc.id, ...data };
                }
            }
        }
        
        console.log('No existing chat found');
        return null;
    } catch (error) {
        console.error('Error finding private chat:', error);
        return null;
    }
}

/**
 * Open private chat - FIXED VERSION
 */
function openPrivateChat(chatId, otherUser) {
    if (!otherUser) {
        console.error('No user data provided');
        return;
    }
    
    currentChat = {
        id: chatId,
        type: 'private',
        name: otherUser.name || 'User',
        otherUserId: otherUser.uid,
        otherUserPhoto: otherUser.photo || 'https://via.placeholder.com/150'
    };

    // UPDATE UI
    updateChatHeader();
    loadMessages('privateChats', chatId);
    setupTypingIndicator('privateChats', chatId);
    addPrivateChatToList(chatId, otherUser);
    
    // MARK ACTIVE CHAT
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const chatItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
    if (chatItem) {
        chatItem.classList.add('active');
    }
    
    // CLEAR MESSAGE INPUT
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.value = '';
        messageInput.focus();
    }
}

/**
 * Add private chat to sidebar list - FIXED VERSION
 */
function addPrivateChatToList(chatId, user) {
    const chatsList = document.getElementById('chatsList');
    if (!chatsList) return;

    // CHECK IF ALREADY EXISTS
    if (document.querySelector(`.chat-item[data-chat-id="${chatId}"]`)) {
        return;
    }

    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.dataset.chatId = chatId;
    chatItem.dataset.chatType = 'private';
    chatItem.dataset.userId = user.uid;

    chatItem.innerHTML = `
        <div class="chat-avatar">
            <img src="${user.photo || 'https://via.placeholder.com/150'}" 
                 alt="${escapeHtml(user.name)}" 
                 onerror="this.src='https://via.placeholder.com/150'">
        </div>
        <div class="chat-info">
            <h4>${escapeHtml(user.name)}</h4>
            <p>${user.email ? escapeHtml(user.email) : 'Private chat'}</p>
        </div>
        <div class="chat-badge">PM</div>
    `;

    chatItem.addEventListener('click', (e) => {
        e.preventDefault();
        openPrivateChat(chatId, user);
        
        // CLOSE SIDEBAR ON MOBILE
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            const mobileToggle = document.getElementById('mobileMenuToggle');
            if (sidebar) {
                sidebar.classList.remove('active');
                const icon = mobileToggle?.querySelector('i');
                if (icon) icon.className = 'fas fa-bars';
            }
        }
    });

    chatsList.appendChild(chatItem);
}

// ===== MESSAGE FUNCTIONS =====

/**
 * Load messages for current chat
 */
function loadMessages(collection, chatId) {
    if (messageListener) {
        messageListener();
    }

    const messagesRef = db.collection(collection)
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .limit(100);

    messageListener = messagesRef.onSnapshot((snapshot) => {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;

        if (snapshot.empty) {
            messagesContainer.innerHTML = '<div class="no-messages">No messages yet. Start the conversation!</div>';
            return;
        }

        // CLEAR AND REBUILD FOR SIMPLICITY
        if (snapshot.docChanges().length > 0) {
            messagesContainer.innerHTML = '';
            
            snapshot.forEach((doc) => {
                const message = doc.data();
                message.id = doc.id;
                displayMessage(message);
            });
        }

        scrollToBottom();
    }, (error) => {
        console.error('Error loading messages:', error);
        authModule.showNotification('Failed to load messages', 'error');
    });
}

/**
 * Display a message - FIXED VERSION
 */
async function displayMessage(message) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;

    const currentUser = authModule.getCurrentUser();
    if (!currentUser) return;

    const isOwnMessage = message.userId === currentUser.uid;

    // GET USER DATA
    let userData = message.userData;
    if (!userData) {
        userData = await authModule.getUserByUid(message.userId) || {
            name: 'Unknown User',
            photo: 'https://via.placeholder.com/150'
        };
    }

    // CHECK FOR DUPLICATES
    if (document.querySelector(`.message[data-message-id="${message.id}"]`)) {
        return;
    }

    const messageElement = document.createElement('div');
    messageElement.className = `message ${isOwnMessage ? 'message-own' : ''}`;
    messageElement.dataset.messageId = message.id;

    // FORMAT TIMESTAMP
    let timeString = 'Just now';
    if (message.timestamp) {
        const timestamp = message.timestamp.toDate ? message.timestamp.toDate() : new Date(message.timestamp);
        timeString = formatTimestamp(timestamp);
    }

    messageElement.innerHTML = `
        <img src="${userData.photo}" 
             alt="${escapeHtml(userData.name)}" 
             class="message-avatar" 
             onerror="this.src='https://via.placeholder.com/150'">
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${escapeHtml(userData.name)}</span>
                <span class="message-time">${timeString}</span>
            </div>
            <div class="message-text">${escapeHtml(message.text)}</div>
        </div>
    `;

    messagesContainer.appendChild(messageElement);
}

/**
 * Send a message - FIXED VERSION
 */
async function sendMessage(text) {
    if (!text || !text.trim()) {
        authModule.showNotification('Cannot send empty message', 'error');
        return;
    }

    const currentUser = authModule.getCurrentUser();
    if (!currentUser) {
        authModule.showNotification('Please login first', 'error');
        return;
    }

    const messageText = text.trim();

    const message = {
        text: messageText,
        userId: currentUser.uid,
        userData: {
            name: currentUser.displayName || 'Anonymous',
            photo: currentUser.photoURL || 'https://via.placeholder.com/150'
        },
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        seen: false
    };

    try {
        if (currentChat.type === 'group') {
            await db.collection('groupChats')
                .doc(currentChat.id)
                .collection('messages')
                .add(message);
        } else {
            await db.collection('privateChats')
                .doc(currentChat.id)
                .collection('messages')
                .add(message);
            
            // UPDATE LAST MESSAGE IN PRIVATE CHAT
            await db.collection('privateChats')
                .doc(currentChat.id)
                .update({
                    lastMessage: messageText,
                    lastMessageTime: firebase.firestore.FieldValue.serverTimestamp()
                });
        }

        // STOP TYPING
        await setTyping(false);
        
    } catch (error) {
        console.error('Error sending message:', error);
        authModule.showNotification('Failed to send message', 'error');
    }
}

// ===== TYPING INDICATOR =====

/**
 * Set typing status
 */
async function setTyping(isTyping) {
    const currentUser = authModule.getCurrentUser();
    if (!currentUser || !currentChat) return;

    const collection = currentChat.type === 'group' ? 'groupChats' : 'privateChats';
    const typingRef = db.collection(collection)
        .doc(currentChat.id)
        .collection('typing')
        .doc(currentUser.uid);

    try {
        await typingRef.set({
            userId: currentUser.uid,
            userName: currentUser.displayName || 'Anonymous',
            typing: isTyping,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error setting typing status:', error);
    }
}

/**
 * Setup typing indicator listener
 */
function setupTypingIndicator(collection, chatId) {
    if (typingListener) {
        typingListener();
    }

    const typingRef = db.collection(collection)
        .doc(chatId)
        .collection('typing');

    typingListener = typingRef.onSnapshot((snapshot) => {
        const typingUsers = [];
        const currentUser = authModule.getCurrentUser();

        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.userId && data.userId !== currentUser?.uid && data.typing === true) {
                typingUsers.push(data.userName || 'Someone');
            }
        });

        updateTypingIndicator(typingUsers);
    });
}

/**
 * Update typing indicator
 */
function updateTypingIndicator(users) {
    const indicator = document.getElementById('typingIndicator');
    if (!indicator) return;

    if (users.length === 0) {
        indicator.innerHTML = '';
        return;
    }

    let text = '';
    if (users.length === 1) {
        text = `${users[0]} is typing`;
    } else if (users.length === 2) {
        text = `${users[0]} and ${users[1]} are typing`;
    } else {
        text = `${users.length} people are typing`;
    }

    indicator.innerHTML = `
        <div class="typing-indicator">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <span>${text}</span>
        </div>
    `;
}

// ===== ONLINE USERS =====

/**
 * Load online users list
 */
function loadOnlineUsers() {
    if (onlineUsersListener) {
        onlineUsersListener();
    }

    const usersRef = db.collection('users').where('online', '==', true);
    
    onlineUsersListener = usersRef.onSnapshot((snapshot) => {
        const usersList = document.getElementById('usersList');
        if (!usersList) return;

        usersList.innerHTML = '<h3 class="list-header">Online Users</h3>';
        const currentUser = authModule.getCurrentUser();
        let onlineCount = 0;

        snapshot.forEach((doc) => {
            const user = doc.data();
            if (user.uid !== currentUser?.uid) {
                usersList.appendChild(createOnlineUserElement(user));
                onlineCount++;
            }
        });

        if (onlineCount === 0) {
            const noUsers = document.createElement('p');
            noUsers.className = 'no-users';
            noUsers.textContent = 'No other users online';
            usersList.appendChild(noUsers);
        }

        updateOnlineCount(snapshot.size);
    });
}

/**
 * Create online user element
 */
function createOnlineUserElement(user) {
    const element = document.createElement('div');
    element.className = 'chat-item online-user';
    element.dataset.userId = user.uid;

    element.innerHTML = `
        <div class="chat-avatar">
            <img src="${user.photo || 'https://via.placeholder.com/150'}" 
                 alt="${escapeHtml(user.name)}" 
                 onerror="this.src='https://via.placeholder.com/150'">
        </div>
        <div class="chat-info">
            <h4>${escapeHtml(user.name)}</h4>
            <p>${user.email ? escapeHtml(user.email) : 'Online'}</p>
        </div>
        <span class="status-dot online"></span>
    `;

    element.addEventListener('click', () => {
        createPrivateChat(user.uid);
    });

    return element;
}

/**
 * Update online count
 */
function updateOnlineCount(count) {
    const onlineCount = document.getElementById('onlineCount');
    if (onlineCount) {
        const currentUser = authModule.getCurrentUser();
        const otherUsers = count - (currentUser ? 1 : 0);
        onlineCount.textContent = `${otherUsers} online`;
    }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Update chat header
 */
function updateChatHeader() {
    const nameElement = document.getElementById('currentChatName');
    const avatarElement = document.getElementById('currentChatAvatar');
    const statusElement = document.getElementById('currentChatStatus');

    if (nameElement) {
        nameElement.textContent = currentChat.name || 'Global Group Chat';
    }

    if (avatarElement) {
        if (currentChat.type === 'private' && currentChat.otherUserPhoto) {
            avatarElement.innerHTML = `<img src="${currentChat.otherUserPhoto}" 
                                           alt="${escapeHtml(currentChat.name)}" 
                                           style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;"
                                           onerror="this.src='https://via.placeholder.com/150'">`;
        } else {
            avatarElement.innerHTML = '<i class="fas fa-globe"></i>';
        }
    }

    if (statusElement) {
        if (currentChat.type === 'private') {
            statusElement.innerHTML = '<span class="status-text">Private Chat</span>';
        } else {
            statusElement.innerHTML = '<span class="status-text">Group Chat</span>';
        }
    }
}

/**
 * Format timestamp
 */
function formatTimestamp(date) {
    if (!date) return 'Just now';
    
    const now = new Date();
    const diff = now - date;
    const diffMinutes = Math.floor(diff / 60000);
    const diffHours = Math.floor(diff / 3600000);
    const diffDays = Math.floor(diff / 86400000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

/**
 * Escape HTML
 */
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Scroll to bottom
 */
function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    if (container) {
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    }
}

/**
 * Load chat info
 */
async function loadChatInfo() {
    const content = document.getElementById('chatInfoContent');
    if (!content) return;

    if (currentChat.type === 'group') {
        try {
            const usersSnapshot = await db.collection('users')
                .where('online', '==', true)
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
                            <i class="fas fa-calendar"></i>
                            <span>Created: ${new Date().toLocaleDateString()}</span>
                        </div>
                    </div>
                    <h5>Active Users</h5>
                    <div class="active-users-list" id="activeUsersList"></div>
                </div>
            `;

            const activeUsersList = document.getElementById('activeUsersList');
            if (activeUsersList) {
                const currentUser = authModule.getCurrentUser();
                usersSnapshot.forEach((doc) => {
                    const user = doc.data();
                    if (user.uid !== currentUser?.uid) {
                        const userElement = document.createElement('div');
                        userElement.className = 'active-user';
                        userElement.innerHTML = `
                            <img src="${user.photo || 'https://via.placeholder.com/150'}" 
                                 alt="${escapeHtml(user.name)}"
                                 onerror="this.src='https://via.placeholder.com/150'">
                            <span>${escapeHtml(user.name)}</span>
                            <span class="status-dot online"></span>
                        `;
                        activeUsersList.appendChild(userElement);
                    }
                });
            }
        } catch (error) {
            console.error('Error loading chat info:', error);
            content.innerHTML = '<p>Failed to load chat information</p>';
        }
    } else {
        try {
            const otherUser = await authModule.getUserByUid(currentChat.otherUserId);
            
            content.innerHTML = `
                <div class="chat-info-section">
                    <h4><i class="fas fa-user"></i> Private Chat</h4>
                    <div class="user-profile-info">
                        <img src="${otherUser.photo || 'https://via.placeholder.com/150'}" 
                             alt="${escapeHtml(otherUser.name)}" 
                             class="profile-image"
                             onerror="this.src='https://via.placeholder.com/150'">
                        <h5>${escapeHtml(otherUser.name)}</h5>
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

// ===== EVENT LISTENERS =====

document.addEventListener('DOMContentLoaded', () => {
    // LOAD GLOBAL CHAT
    setTimeout(() => {
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            loadGlobalChat();
        }
    }, 1000);

    // MESSAGE FORM
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');

    if (messageForm) {
        messageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (messageInput && messageInput.value.trim()) {
                await sendMessage(messageInput.value);
                messageInput.value = '';
            }
        });
    }

    // TYPING DETECTION
    if (messageInput) {
        let typingTimeout;
        
        messageInput.addEventListener('input', () => {
            setTyping(true);
            
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                setTyping(false);
            }, 2000);
        });

        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                messageForm?.dispatchEvent(new Event('submit'));
            }
        });
    }

    // ADD USER BUTTON - FIXED
    const addUserBtn = document.getElementById('addUserBtn');
    const userSearchInput = document.getElementById('userSearchInput');

    if (addUserBtn && userSearchInput) {
        addUserBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const uid = userSearchInput.value.trim();
            if (uid) {
                createPrivateChat(uid);
                userSearchInput.value = '';
            } else {
                authModule.showNotification('Please enter a User ID', 'error');
            }
        });

        userSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const uid = userSearchInput.value.trim();
                if (uid) {
                    createPrivateChat(uid);
                    userSearchInput.value = '';
                }
            }
        });
    }

    // TAB SWITCHING
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.chats-list, .users-list').forEach(list => {
                list.classList.remove('active');
            });
            
            if (tab === 'chats') {
                document.getElementById('chatsList')?.classList.add('active');
            } else {
                document.getElementById('usersList')?.classList.add('active');
            }
        });
    });

    // CHAT INFO BUTTON
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
});

// EXPORT MODULE
window.chatModule = {
    loadGlobalChat,
    sendMessage,
    createPrivateChat,
    openPrivateChat,
    setTyping,
    loadChatInfo,
    getCurrentChat: () => currentChat
};
