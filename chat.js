
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

    // Update UI
    updateChatHeader();
    loadMessages('groupChats', 'global');
    setupTypingIndicator('groupChats', 'global');
    loadOnlineUsers();
    
    // Mark active chat in sidebar
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.chat-item[data-chat-id="global"]`)?.classList.add('active');
}

/**
 * Load messages for current chat
 */
function loadMessages(collection, chatId) {
    // Clear existing listener
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

        // Clear container if no messages
        if (snapshot.empty) {
            messagesContainer.innerHTML = '<div class="no-messages">No messages yet. Start the conversation!</div>';
            return;
        }

        // Process each message change
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const message = change.doc.data();
                message.id = change.doc.id;
                displayMessage(message);
            }
        });

        // Scroll to bottom
        scrollToBottom();
    }, (error) => {
        console.error('Error loading messages:', error);
        showNotification('Failed to load messages', 'error');
    });
}

/**
 * Display a message in the chat
 */
async function displayMessage(message) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;

    const currentUser = authModule.getCurrentUser();
    const isOwnMessage = message.userId === currentUser?.uid;

    // Get user data
    let userData = message.userData;
    if (!userData) {
        userData = await authModule.getUserByUid(message.userId) || {
            name: 'Unknown User',
            photo: 'https://via.placeholder.com/150'
        };
    }

    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isOwnMessage ? 'message-own' : ''}`;
    messageElement.dataset.messageId = message.id;

    // Format timestamp
    const timestamp = message.timestamp?.toDate() || new Date();
    const timeString = formatTimestamp(timestamp);

    messageElement.innerHTML = `
        <img src="${userData.photo}" alt="${userData.name}" class="message-avatar">
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${userData.name}</span>
                <span class="message-time">${timeString}</span>
            </div>
            <div class="message-text">${escapeHtml(message.text)}</div>
            ${message.seen ? '<span class="message-seen"><i class="fas fa-check-double"></i></span>' : ''}
        </div>
    `;

    messagesContainer.appendChild(messageElement);
}

/**
 * Send a message
 */
async function sendMessage(text) {
    if (!text.trim()) return;

    const currentUser = authModule.getCurrentUser();
    if (!currentUser) return;

    const message = {
        text: text.trim(),
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

            // Update seen status for private messages
            updateSeenStatus(currentChat.id);
        }

        // Clear typing status
        stopTyping();
    } catch (error) {
        console.error('Error sending message:', error);
        showNotification('Failed to send message', 'error');
    }
}

// ===== PRIVATE CHAT FUNCTIONS =====

/**
 * Create or get private chat
 */
async function createPrivateChat(otherUserId) {
    const currentUser = authModule.getCurrentUser();
    if (!currentUser || currentUser.uid === otherUserId) {
        showNotification('Invalid user ID', 'error');
        return;
    }

    try {
        // Check if user exists
        const otherUser = await authModule.getUserByUid(otherUserId);
        if (!otherUser) {
            showNotification('User not found', 'error');
            return;
        }

        // Check if chat already exists
        const existingChat = await findExistingPrivateChat(currentUser.uid, otherUserId);
        
        if (existingChat) {
            // Load existing chat
            openPrivateChat(existingChat.id, otherUser);
        } else {
            // Create new private chat
            const chatRef = await db.collection('privateChats').add({
                members: [currentUser.uid, otherUserId],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: currentUser.uid
            });

            openPrivateChat(chatRef.id, otherUser);
        }
    } catch (error) {
        console.error('Error creating private chat:', error);
        showNotification('Failed to create private chat', 'error');
    }
}

/**
 * Find existing private chat between two users
 */
async function findExistingPrivateChat(uid1, uid2) {
    try {
        const chatsRef = db.collection('privateChats');
        const snapshot = await chatsRef
            .where('members', 'array-contains', uid1)
            .get();

        for (const doc of snapshot.docs) {
            const data = doc.data();
            if (data.members.includes(uid2)) {
                return { id: doc.id, ...data };
            }
        }
        return null;
    } catch (error) {
        console.error('Error finding private chat:', error);
        return null;
    }
}

/**
 * Open private chat
 */
function openPrivateChat(chatId, otherUser) {
    currentChat = {
        id: chatId,
        type: 'private',
        name: otherUser.name,
        otherUserId: otherUser.uid,
        otherUserPhoto: otherUser.photo
    };

    // Update UI
    updateChatHeader();
    loadMessages('privateChats', chatId);
    setupTypingIndicator('privateChats', chatId);
    addPrivateChatToList(chatId, otherUser);
}

/**
 * Add private chat to sidebar list
 */
function addPrivateChatToList(chatId, user) {
    const chatsList = document.getElementById('chatsList');
    if (!chatsList) return;

    // Check if chat already exists in list
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
            <img src="${user.photo}" alt="${user.name}">
        </div>
        <div class="chat-info">
            <h4>${user.name}</h4>
            <p>${user.email || 'Private chat'}</p>
        </div>
        <div class="chat-badge">PM</div>
    `;

    chatItem.addEventListener('click', () => {
        openPrivateChat(chatId, user);
    });

    chatsList.appendChild(chatItem);
}

// ===== TYPING INDICATOR =====

/**
 * Setup typing indicator listener
 */
function setupTypingIndicator(collection, chatId) {
    // Clear existing listener
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
            if (data.userId !== currentUser?.uid && data.typing) {
                typingUsers.push(data.userName);
            }
        });

        updateTypingIndicator(typingUsers);
    });
}

/**
 * Update typing indicator in UI
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

/**
 * Set typing status
 */
async function setTyping(isTyping) {
    const currentUser = authModule.getCurrentUser();
    if (!currentUser) return;

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
 * Stop typing (clear timeout)
 */
function stopTyping() {
    if (typingTimeouts[currentChat.id]) {
        clearTimeout(typingTimeouts[currentChat.id]);
    }

    typingTimeouts[currentChat.id] = setTimeout(() => {
        setTyping(false);
    }, 1000);
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

        usersList.innerHTML = '';
        const currentUser = authModule.getCurrentUser();

        snapshot.forEach((doc) => {
            const user = doc.data();
            if (user.uid !== currentUser?.uid) {
                usersList.appendChild(createOnlineUserElement(user));
            }
        });

        // Update online count in GC info
        updateOnlineCount(snapshot.size);
    });
}

/**
 * Create online user element
 */
function createOnlineUserElement(user) {
    const element = document.createElement('div');
    element.className = 'chat-item';
    element.dataset.userId = user.uid;

    element.innerHTML = `
        <div class="chat-avatar">
            <img src="${user.photo}" alt="${user.name}">
        </div>
        <div class="chat-info">
            <h4>${user.name}</h4>
            <p>${user.email || 'Online'}</p>
        </div>
        <span class="status-dot online"></span>
    `;

    element.addEventListener('click', () => {
        createPrivateChat(user.uid);
    });

    return element;
}

/**
 * Update online users count
 */
function updateOnlineCount(count) {
    const onlineCount = document.getElementById('onlineCount');
    if (onlineCount) {
        onlineCount.textContent = `${count - 1} online`; // Subtract current user
    }
}

// ===== SEEN INDICATOR =====

/**
 * Update seen status for private chat
 */
async function updateSeenStatus(chatId) {
    const currentUser = authModule.getCurrentUser();
    if (!currentUser) return;

    try {
        await db.collection('privateChats')
            .doc(chatId)
            .update({
                lastSeen: {
                    [currentUser.uid]: firebase.firestore.FieldValue.serverTimestamp()
                }
            });
    } catch (error) {
        console.error('Error updating seen status:', error);
    }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Update chat header UI
 */
function updateChatHeader() {
    const nameElement = document.getElementById('currentChatName');
    const avatarElement = document.getElementById('currentChatAvatar');
    const modalChatName = document.getElementById('modalChatName');

    if (nameElement) {
        nameElement.textContent = currentChat.name;
    }

    if (avatarElement) {
        if (currentChat.type === 'private' && currentChat.otherUserPhoto) {
            avatarElement.innerHTML = `<img src="${currentChat.otherUserPhoto}" alt="${currentChat.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            avatarElement.innerHTML = '<i class="fas fa-globe"></i>';
        }
    }

    if (modalChatName) {
        modalChatName.textContent = currentChat.name;
    }
}

/**
 * Format timestamp
 */
function formatTimestamp(date) {
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
 * Escape HTML to prevent XSS
 */
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Scroll messages to bottom
 */
function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    if (window.authModule) {
        authModule.showNotification(message, type);
    }
}

// ===== EVENT LISTENERS =====

// Initialize chat functionality
document.addEventListener('DOMContentLoaded', () => {
    // Load global chat by default
    loadGlobalChat();

    // Setup message form
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');

    if (messageForm) {
        messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (messageInput) {
                sendMessage(messageInput.value);
                messageInput.value = '';
            }
        });
    }

    // Setup typing detection
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

    // Setup add user button
    const addUserBtn = document.getElementById('addUserBtn');
    const userSearchInput = document.getElementById('userSearchInput');

    if (addUserBtn && userSearchInput) {
        addUserBtn.addEventListener('click', () => {
            const uid = userSearchInput.value.trim();
            if (uid) {
                createPrivateChat(uid);
                userSearchInput.value = '';
            }
        });
    }

    // Setup tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            // Update active tab
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show corresponding list
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

    // Setup chat info button
    const chatInfoBtn = document.getElementById('chatInfoBtn');
    if (chatInfoBtn) {
        chatInfoBtn.addEventListener('click', () => {
            // Show chat info modal
            const modal = document.getElementById('chatInfoModal');
            if (modal) {
                modal.classList.add('active');
            }
        });
    }
});

// Export functions for use in other modules
window.chatModule = {
    loadGlobalChat,
    sendMessage,
    createPrivateChat,
    openPrivateChat,
    setTyping,
    stopTyping
};
