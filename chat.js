// Chat Module - ULTIMATE UPGRADED VERSION
// Perfect for real-time conversations, smooth UI, walang palya!
class ChatManager {
    constructor() {
        this.currentChat = null;
        this.currentChatType = null;
        this.currentChatData = null;
        this.messagesListener = null;
        this.chatsListener = null;
        this.groupsListener = null;
        this.messageCache = new Map();
        this.userCache = new Map();
        this.pendingMessages = new Set();
        this.init();
    }
    
    init() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.setupChatListeners();
                this.loadUserCache();
            } else {
                this.cleanupListeners();
                this.clearCache();
            }
        });
    }
    
    // ============ CACHE MANAGEMENT ============
    async loadUserCache() {
        const user = auth.currentUser;
        if (!user) return;
        
        try {
            // Cache current user
            this.userCache.set(user.uid, {
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                online: true
            });
            
            // Cache all friends for faster loading
            const snapshot = await db.collection('friendRequests')
                .where('status', '==', 'accepted')
                .where('participants', 'array-contains', user.uid)
                .get();
            
            for (const doc of snapshot.docs) {
                const request = doc.data();
                const friendId = request.from === user.uid ? request.to : request.from;
                
                const friendDoc = await db.collection('users').doc(friendId).get();
                if (friendDoc.exists) {
                    this.userCache.set(friendId, friendDoc.data());
                }
            }
            
            console.log('✅ User cache loaded:', this.userCache.size, 'users');
        } catch (error) {
            console.error('❌ Error loading user cache:', error);
        }
    }
    
    clearCache() {
        this.messageCache.clear();
        this.userCache.clear();
        this.pendingMessages.clear();
    }
    
    async getUserData(userId) {
        // Check cache first
        if (this.userCache.has(userId)) {
            return this.userCache.get(userId);
        }
        
        // If not in cache, fetch from Firestore
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                this.userCache.set(userId, userData);
                return userData;
            }
        } catch (error) {
            console.error('Error getting user data:', error);
        }
        return null;
    }
    
    cleanupListeners() {
        if (this.messagesListener) {
            this.messagesListener();
            this.messagesListener = null;
        }
        if (this.chatsListener) {
            this.chatsListener();
            this.chatsListener = null;
        }
        if (this.groupsListener) {
            this.groupsListener();
            this.groupsListener = null;
        }
    }
    
    // ============ CHAT LISTENERS ============
    setupChatListeners() {
        this.loadChats();
        this.listenToChats();
        this.setupTypingIndicator();
    }
    
    async loadChats() {
        const user = auth.currentUser;
        if (!user) return;
        
        try {
            // Show loading state
            const chatsList = document.getElementById('chatsList');
            if (chatsList) {
                chatsList.innerHTML = '<div class="loading-chats"><i class="fas fa-spinner fa-spin"></i> Loading chats...</div>';
            }
            
            // Load private chats with better error handling
            const privateChatsSnapshot = await db.collection('privateChats')
                .where('participants', 'array-contains', user.uid)
                .orderBy('lastMessageTime', 'desc')
                .get()
                .catch(error => {
                    console.error('Error loading private chats:', error);
                    return { empty: true, forEach: () => {} };
                });
            
            await this.displayChats(privateChatsSnapshot, 'private');
            
            // Load group chats
            const groupChatsSnapshot = await db.collection('groupChats')
                .where('members', 'array-contains', user.uid)
                .orderBy('lastMessageTime', 'desc')
                .get()
                .catch(error => {
                    console.error('Error loading group chats:', error);
                    return { empty: true, forEach: () => {} };
                });
            
            await this.displayChats(groupChatsSnapshot, 'group');
            
        } catch (error) {
            console.error('❌ Error loading chats:', error);
        }
    }
    
    async displayChats(snapshot, type) {
        const chatsList = document.getElementById('chatsList');
        if (!chatsList) return;
        
        // Remove loading state
        const loadingEl = chatsList.querySelector('.loading-chats');
        if (loadingEl) loadingEl.remove();
        
        const fragment = document.createDocumentFragment();
        const promises = [];
        
        snapshot.forEach((doc) => {
            const chatData = doc.data();
            const chatId = doc.id;
            
            if (!document.querySelector(`[data-chat-id="${chatId}"]`)) {
                promises.push(
                    this.createChatElement(chatData, chatId, type)
                        .then(element => fragment.appendChild(element))
                );
            }
        });
        
        if (promises.length > 0) {
            await Promise.all(promises);
            chatsList.appendChild(fragment);
        }
    }
    
    async createChatElement(chatData, chatId, type) {
        const div = document.createElement('div');
        div.className = 'chat-item';
        div.dataset.chatId = chatId;
        div.dataset.chatType = type;
        
        const isGroup = type === 'group';
        let name, avatar, lastMessage, time, unreadCount = 0;
        let lastMessageSnippet = '';
        
        if (isGroup) {
            name = chatData.name || 'Unnamed Group';
            avatar = chatData.avatar || null;
            lastMessage = chatData.lastMessage || 'No messages yet';
        } else {
            const otherParticipant = await this.getOtherParticipant(chatData.participants);
            name = otherParticipant?.displayName || otherParticipant?.email?.split('@')[0] || 'User';
            avatar = otherParticipant?.photoURL || null;
            lastMessage = chatData.lastMessage || 'No messages yet';
            
            // Add online status
            const isOnline = otherParticipant?.online || false;
            div.dataset.online = isOnline;
        }
        
        time = chatData.lastMessageTime ? this.formatTime(chatData.lastMessageTime.toDate()) : '';
        
        // Truncate last message
        lastMessageSnippet = lastMessage.length > 35 ? lastMessage.substring(0, 35) + '...' : lastMessage;
        
        let avatarHtml = '';
        if (avatar) {
            avatarHtml = `<img src="${avatar}" alt="${this.escapeHtml(name)}" loading="lazy">`;
        } else {
            avatarHtml = `<i class="fas ${isGroup ? 'fa-users' : 'fa-user'}"></i>`;
        }
        
        div.innerHTML = `
            <div class="chat-avatar">
                ${avatarHtml}
                ${!isGroup ? `<span class="status-indicator ${chatData.online ? 'online' : 'offline'}"></span>` : ''}
            </div>
            <div class="chat-info">
                <div class="chat-name">${this.escapeHtml(name)}</div>
                <div class="chat-last-message">${this.escapeHtml(lastMessageSnippet)}</div>
            </div>
            <div class="chat-meta">
                <div class="chat-time">${time}</div>
                ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ''}
            </div>
        `;
        
        // Use debounced click event
        div.addEventListener('click', this.debounce(() => this.openChat(chatId, chatData, type), 300));
        
        return div;
    }
    
    // ============ REAL-TIME UPDATES ============
    listenToChats() {
        const user = auth.currentUser;
        if (!user) return;
        
        // Clean up existing listeners
        if (this.chatsListener) this.chatsListener();
        if (this.groupsListener) this.groupsListener();
        
        // Listen to private chats with optimized query
        this.chatsListener = db.collection('privateChats')
            .where('participants', 'array-contains', user.uid)
            .orderBy('lastMessageTime', 'desc')
            .onSnapshot((snapshot) => {
                this.handleChatUpdates(snapshot, 'private');
            }, (error) => {
                console.error('❌ Error listening to private chats:', error);
                // Retry after 3 seconds
                setTimeout(() => this.listenToChats(), 3000);
            });
        
        // Listen to group chats
        this.groupsListener = db.collection('groupChats')
            .where('members', 'array-contains', user.uid)
            .orderBy('lastMessageTime', 'desc')
            .onSnapshot((snapshot) => {
                this.handleChatUpdates(snapshot, 'group');
                // Update groups list in app controller
                if (window.appController) {
                    window.appController.loadGroupsList();
                }
            }, (error) => {
                console.error('❌ Error listening to group chats:', error);
                setTimeout(() => this.listenToChats(), 3000);
            });
    }
    
    async handleChatUpdates(snapshot, type) {
        const chatsList = document.getElementById('chatsList');
        if (!chatsList) return;
        
        const promises = [];
        
        snapshot.docChanges().forEach((change) => {
            const chatData = change.doc.data();
            const chatId = change.doc.id;
            
            if (change.type === 'added') {
                if (!document.querySelector(`[data-chat-id="${chatId}"]`)) {
                    promises.push(
                        this.createChatElement(chatData, chatId, type)
                            .then(element => {
                                chatsList.appendChild(element);
                            })
                    );
                }
            } else if (change.type === 'modified') {
                const oldElement = document.querySelector(`[data-chat-id="${chatId}"]`);
                if (oldElement) {
                    promises.push(
                        this.createChatElement(chatData, chatId, type)
                            .then(newElement => {
                                oldElement.replaceWith(newElement);
                            })
                    );
                }
            } else if (change.type === 'removed') {
                const element = document.querySelector(`[data-chat-id="${chatId}"]`);
                if (element) {
                    element.remove();
                }
            }
        });
        
        await Promise.all(promises);
        this.sortChats();
    }
    
    sortChats() {
        const chatsList = document.getElementById('chatsList');
        if (!chatsList) return;
        
        const items = Array.from(chatsList.children);
        items.sort((a, b) => {
            const timeA = a.querySelector('.chat-time')?.textContent || '';
            const timeB = b.querySelector('.chat-time')?.textContent || '';
            return timeB.localeCompare(timeA);
        });
        
        items.forEach(item => chatsList.appendChild(item));
    }
    
    // ============ CHAT OPENING & MESSAGES ============
    async openChat(chatId, chatData, type) {
        // Prevent double opening
        if (this.currentChat === chatId && this.currentChatType === type) {
            return;
        }
        
        this.currentChat = chatId;
        this.currentChatType = type;
        this.currentChatData = chatData;
        
        // Update UI
        document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
        const activeChat = document.querySelector(`[data-chat-id="${chatId}"]`);
        if (activeChat) activeChat.classList.add('active');
        
        // Show message input with animation
        const welcomeMessage = document.getElementById('welcomeMessage');
        const messageInputContainer = document.getElementById('messageInputContainer');
        
        if (welcomeMessage) {
            welcomeMessage.style.opacity = '0';
            setTimeout(() => {
                welcomeMessage.style.display = 'none';
            }, 200);
        }
        
        if (messageInputContainer) {
            messageInputContainer.style.display = 'flex';
            messageInputContainer.style.opacity = '0';
            setTimeout(() => {
                messageInputContainer.style.opacity = '1';
            }, 50);
        }
        
        // Show group menu if applicable
        if (window.appController) {
            window.appController.showGroupMenu(type === 'group');
        }
        
        // Update chat header
        await this.updateChatHeader(chatData, type);
        
        // Load messages with loading indicator
        await this.loadMessages(chatId, type);
        
        // Listen for new messages
        this.listenToMessages(chatId, type);
        
        // Focus on message input
        setTimeout(() => {
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.focus();
                messageInput.disabled = false;
            }
        }, 400);
    }
    
    async updateChatHeader(chatData, type) {
        const chatTitle = document.getElementById('chatTitle');
        const chatStatus = document.getElementById('chatStatus');
        const chatAvatar = document.querySelector('.chat-header .chat-avatar');
        
        if (!chatTitle || !chatStatus) return;
        
        if (type === 'group') {
            chatTitle.textContent = chatData.name || 'Unnamed Group';
            chatStatus.textContent = `${chatData.members?.length || 0} members`;
            
            if (chatAvatar) {
                chatAvatar.style.display = 'flex';
                chatAvatar.innerHTML = chatData.avatar ? 
                    `<img src="${chatData.avatar}" alt="${this.escapeHtml(chatData.name)}" loading="lazy">` :
                    '<i class="fas fa-users"></i>';
            }
        } else {
            const otherParticipant = await this.getOtherParticipant(chatData.participants);
            const displayName = otherParticipant?.displayName || 
                              otherParticipant?.email?.split('@')[0] || 
                              'User';
            
            chatTitle.textContent = displayName;
            
            const status = otherParticipant?.online ? 'Online' : 'Offline';
            const statusColor = otherParticipant?.online ? '#4caf50' : '#9e9e9e';
            chatStatus.innerHTML = `<span style="color: ${statusColor}">●</span> ${status}`;
            
            if (chatAvatar) {
                chatAvatar.style.display = 'flex';
                chatAvatar.innerHTML = otherParticipant?.photoURL ?
                    `<img src="${otherParticipant.photoURL}" alt="${this.escapeHtml(displayName)}" loading="lazy">` :
                    `<span>${displayName[0].toUpperCase()}</span>`;
            }
        }
    }
    
    async loadMessages(chatId, type, limit = 50) {
        const messagesList = document.getElementById('messagesList');
        if (!messagesList) return;
        
        // Show loading indicator
        messagesList.innerHTML = '<div class="loading-messages"><i class="fas fa-spinner fa-spin"></i> Loading messages...</div>';
        
        const collection = type === 'group' ? 'groupMessages' : 'privateMessages';
        
        try {
            const snapshot = await db.collection(collection)
                .where('chatId', '==', chatId)
                .orderBy('timestamp', 'asc')
                .limit(limit)
                .get();
            
            messagesList.innerHTML = '';
            
            if (snapshot.empty) {
                this.showEmptyState(messagesList, type);
                return;
            }
            
            const fragment = document.createDocumentFragment();
            const promises = [];
            
            snapshot.forEach((doc) => {
                const message = doc.data();
                // Cache message
                this.messageCache.set(doc.id, message);
                promises.push(
                    this.createMessageElement(message)
                        .then(element => fragment.appendChild(element))
                );
            });
            
            await Promise.all(promises);
            messagesList.appendChild(fragment);
            
            // Smooth scroll to bottom
            this.scrollToBottom(true);
            
        } catch (error) {
            console.error('❌ Error loading messages:', error);
            messagesList.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-circle"></i><p>Failed to load messages</p><button onclick="chatManager.loadMessages(\'' + chatId + '\', \'' + type + '\')">Retry</button></div>';
        }
    }
    
    showEmptyState(messagesList, type) {
        messagesList.innerHTML = `
            <div class="empty-state">
                <i class="fas ${type === 'group' ? 'fa-users' : 'fa-user'}"></i>
                <p>No messages yet</p>
                <small>Say hello to start the conversation!</small>
            </div>
        `;
    }
    
    // ============ REAL-TIME MESSAGES ============
    listenToMessages(chatId, type) {
        // Remove existing listener
        if (this.messagesListener) {
            this.messagesListener();
            this.messagesListener = null;
        }
        
        const collection = type === 'group' ? 'groupMessages' : 'privateMessages';
        
        this.messagesListener = db.collection(collection)
            .where('chatId', '==', chatId)
            .orderBy('timestamp', 'asc')
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach(async (change) => {
                    if (change.type === 'added') {
                        const message = change.doc.data();
                        const messageId = change.doc.id;
                        
                        // Check if message already exists in DOM
                        if (document.querySelector(`[data-message-id="${messageId}"]`)) {
                            return;
                        }
                        
                        const messageElement = await this.createMessageElement(message);
                        messageElement.dataset.messageId = messageId;
                        
                        const messagesList = document.getElementById('messagesList');
                        const emptyState = messagesList.querySelector('.empty-state');
                        const loadingState = messagesList.querySelector('.loading-messages');
                        
                        if (emptyState || loadingState) {
                            messagesList.innerHTML = '';
                        }
                        
                        messagesList.appendChild(messageElement);
                        
                        // Smooth scroll for new messages
                        if (message.senderId !== auth.currentUser?.uid) {
                            this.scrollToBottom(true);
                        } else {
                            this.scrollToBottom(false);
                        }
                        
                        // Update last message in chat list
                        this.updateLastMessage(chatId, message.text);
                    }
                });
            }, (error) => {
                console.error('❌ Error listening to messages:', error);
                // Auto reconnect after 3 seconds
                setTimeout(() => this.listenToMessages(chatId, type), 3000);
            });
    }
    
    async createMessageElement(message) {
        const user = auth.currentUser;
        const isSentByMe = message.senderId === user.uid;
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isSentByMe ? 'sent' : 'received'}`;
        
        let senderAvatar = '';
        let senderName = '';
        
        if (!isSentByMe && message.senderId !== 'system') {
            try {
                const senderData = await this.getUserData(message.senderId);
                const displayName = senderData?.displayName || senderData?.email?.split('@')[0] || 'User';
                senderName = displayName;
                
                senderAvatar = senderData?.photoURL ?
                    `<img src="${senderData.photoURL}" alt="${this.escapeHtml(displayName)}" loading="lazy">` :
                    `<span>${displayName[0].toUpperCase()}</span>`;
            } catch (error) {
                console.error('Error getting sender info:', error);
            }
        }
        
        const time = message.timestamp ? this.formatTime(message.timestamp.toDate()) : '';
        const messageId = message.messageId || Date.now() + Math.random();
        
        if (message.senderId === 'system') {
            messageElement.innerHTML = `
                <div class="message-content system-message">
                    <div class="message-text">${this.escapeHtml(message.text)}</div>
                    <div class="message-time">${time}</div>
                </div>
            `;
        } else {
            messageElement.innerHTML = `
                ${!isSentByMe ? `
                    <div class="message-avatar">
                        ${senderAvatar}
                    </div>
                    <div class="message-wrapper">
                        <div class="message-sender">${this.escapeHtml(senderName)}</div>
                ` : ''}
                <div class="message-content">
                    <div class="message-text">${this.escapeHtml(message.text)}</div>
                    <div class="message-time">${time}</div>
                </div>
                ${!isSentByMe ? '</div>' : ''}
            `;
        }
        
        // Add animation
        messageElement.style.animation = 'slideIn 0.3s ease';
        
        return messageElement;
    }
    
    updateLastMessage(chatId, text) {
        const chatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
        if (chatItem) {
            const lastMessageEl = chatItem.querySelector('.chat-last-message');
            if (lastMessageEl) {
                const snippet = text.length > 35 ? text.substring(0, 35) + '...' : text;
                lastMessageEl.textContent = this.escapeHtml(snippet);
            }
            
            // Move to top
            const chatsList = document.getElementById('chatsList');
            if (chatsList && chatItem.parentNode === chatsList) {
                chatsList.insertBefore(chatItem, chatsList.firstChild);
            }
        }
    }
    
    // ============ MESSAGE ACTIONS ============
    async sendMessage(text) {
        if (!this.currentChat || !text.trim()) return;
        
        // Prevent duplicate sends
        const messageKey = `${this.currentChat}_${text}_${Date.now()}`;
        if (this.pendingMessages.has(messageKey)) {
            return;
        }
        
        this.pendingMessages.add(messageKey);
        
        const user = auth.currentUser;
        if (!user) {
            alert('You must be logged in');
            this.pendingMessages.delete(messageKey);
            return;
        }
        
        const message = {
            chatId: this.currentChat,
            senderId: user.uid,
            senderName: user.displayName || user.email,
            text: text.trim(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            type: 'text',
            messageId: `${user.uid}_${Date.now()}`
        };
        
        const collection = this.currentChatType === 'group' ? 'groupMessages' : 'privateMessages';
        const chatCollection = this.currentChatType === 'group' ? 'groupChats' : 'privateChats';
        
        try {
            // Optimistic update - show message immediately
            const tempMessage = { ...message, timestamp: new Date() };
            const tempElement = await this.createMessageElement(tempMessage);
            tempElement.classList.add('temp-message');
            
            const messagesList = document.getElementById('messagesList');
            const emptyState = messagesList.querySelector('.empty-state');
            if (emptyState) {
                messagesList.innerHTML = '';
            }
            messagesList.appendChild(tempElement);
            this.scrollToBottom(true);
            
            // Actual send to Firestore
            await db.collection(collection).add(message);
            
            await db.collection(chatCollection).doc(this.currentChat).update({
                lastMessage: text.trim(),
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                lastSenderId: user.uid
            });
            
            // Remove temp class
            tempElement.classList.remove('temp-message');
            
        } catch (error) {
            console.error('❌ Error sending message:', error);
            
            // Show error on the temp message
            const lastMessage = messagesList.lastChild;
            if (lastMessage && lastMessage.classList.contains('temp-message')) {
                lastMessage.classList.add('error');
                lastMessage.querySelector('.message-content').innerHTML += '<span class="error-icon"><i class="fas fa-exclamation-circle"></i></span>';
            }
            
            alert('Failed to send message: ' + error.message);
        } finally {
            // Remove from pending after 1 second
            setTimeout(() => {
                this.pendingMessages.delete(messageKey);
            }, 1000);
        }
    }
    
    // ============ GROUP MANAGEMENT ============
    async createGroup(name, members = [], avatar = null) {
        const user = auth.currentUser;
        if (!user) throw new Error('Not authenticated');
        
        if (!name || !name.trim()) {
            throw new Error('Group name is required');
        }
        
        const allMembers = [user.uid];
        
        if (members && members.length > 0) {
            const validMembers = members.filter(id => id && id !== user.uid);
            allMembers.push(...validMembers);
        }
        
        const uniqueMembers = [...new Set(allMembers)];
        
        const groupData = {
            name: name.trim(),
            members: uniqueMembers,
            admins: [user.uid],
            createdBy: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessage: 'Group created',
            avatar: avatar || null,
            memberCount: uniqueMembers.length
        };
        
        try {
            const docRef = await db.collection('groupChats').add(groupData);
            
            // Add system message
            await db.collection('groupMessages').add({
                chatId: docRef.id,
                senderId: 'system',
                senderName: 'System',
                text: `${user.displayName || user.email} created the group`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                type: 'system'
            });
            
            // Open the group immediately
            await this.openChat(docRef.id, groupData, 'group');
            
            return docRef.id;
            
        } catch (error) {
            console.error('❌ Error creating group:', error);
            throw new Error(error.message || 'Failed to create group');
        }
    }
    
    // ============ PRIVATE CHAT ============
    async startPrivateChat(friendId) {
        const user = auth.currentUser;
        if (!user) return;
        
        try {
            // Show loading state
            const activeChat = document.querySelector(`[data-chat-id="${friendId}"]`);
            if (activeChat) {
                activeChat.classList.add('loading');
            }
            
            // Check for existing chat
            const snapshot = await db.collection('privateChats')
                .where('participants', 'array-contains', user.uid)
                .get();
            
            let existingChat = null;
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.participants && data.participants.includes(friendId)) {
                    existingChat = { id: doc.id, data };
                }
            });
            
            if (existingChat) {
                await this.openChat(existingChat.id, existingChat.data, 'private');
            } else {
                // Get friend data
                const friendData = await this.getUserData(friendId);
                
                const chatData = {
                    participants: [user.uid, friendId],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                    lastMessage: 'Start a conversation'
                };
                
                const docRef = await db.collection('privateChats').add(chatData);
                await this.openChat(docRef.id, chatData, 'private');
            }
            
            // Remove loading state
            if (activeChat) {
                activeChat.classList.remove('loading');
            }
            
        } catch (error) {
            console.error('❌ Error starting private chat:', error);
            alert('Failed to start chat: ' + error.message);
        }
    }
    
    // ============ FRIEND MANAGEMENT ============
    async addFriend(email) {
        const user = auth.currentUser;
        if (!user) throw new Error('Not authenticated');
        
        if (!email || !email.includes('@')) {
            throw new Error('Please enter a valid email address');
        }
        
        try {
            // Find user by email
            const userSnapshot = await db.collection('users')
                .where('email', '==', email)
                .limit(1)
                .get();
            
            if (userSnapshot.empty) {
                throw new Error('User not found');
            }
            
            const friendDoc = userSnapshot.docs[0];
            const friendId = friendDoc.id;
            const friendData = friendDoc.data();
            
            if (friendId === user.uid) {
                throw new Error('You cannot add yourself as a friend');
            }
            
            // Check if already friends
            const acceptedSnapshot = await db.collection('friendRequests')
                .where('status', '==', 'accepted')
                .where('participants', 'array-contains', user.uid)
                .get();
            
            let alreadyFriends = false;
            acceptedSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.participants?.includes(friendId)) {
                    alreadyFriends = true;
                }
            });
            
            if (alreadyFriends) {
                throw new Error('You are already friends');
            }
            
            // Check for pending request
            const pendingSnapshot = await db.collection('friendRequests')
                .where('status', '==', 'pending')
                .where('from', 'in', [user.uid, friendId])
                .where('to', 'in', [user.uid, friendId])
                .get();
            
            if (!pendingSnapshot.empty) {
                throw new Error('Friend request already sent');
            }
            
            // Create friend request
            const friendRequest = {
                from: user.uid,
                to: friendId,
                status: 'pending',
                participants: [user.uid, friendId],
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                fromName: user.displayName || user.email,
                toName: friendData.displayName || friendData.email,
                fromPhoto: user.photoURL || null,
                toPhoto: friendData.photoURL || null
            };
            
            await db.collection('friendRequests').add(friendRequest);
            
            // Cache friend data
            this.userCache.set(friendId, friendData);
            
            return true;
            
        } catch (error) {
            console.error('❌ Error adding friend:', error);
            throw error;
        }
    }
    
    // ============ UTILITY FUNCTIONS ============
    async getOtherParticipant(participants) {
        const user = auth.currentUser;
        if (!user) return null;
        
        const otherUid = participants.find(id => id !== user.uid);
        if (!otherUid) return null;
        
        return await this.getUserData(otherUid);
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    formatTime(date) {
        if (!date) return '';
        
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days > 7) {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else if (days > 0) {
            return `${days}d ago`;
        } else {
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const hour12 = hours % 12 || 12;
            return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
        }
    }
    
    scrollToBottom(smooth = true) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            setTimeout(() => {
                messagesContainer.scrollTo({
                    top: messagesContainer.scrollHeight,
                    behavior: smooth ? 'smooth' : 'auto'
                });
            }, 50);
        }
    }

    setupTypingIndicator() {
        // To be implemented - shows when someone is typing
    }
}

// Initialize Chat Manager
let chatManager;
if (typeof window !== 'undefined') {
    // Prevent multiple instances
    if (!window.chatManagerInstance) {
        chatManager = new ChatManager();
        window.chatManager = chatManager;
        window.chatManagerInstance = chatManager;
    } else {
        chatManager = window.chatManagerInstance;
    }
}
