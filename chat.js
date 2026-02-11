// Chat Module - ULTIMATE UPGRADED VERSION - 100% FIXED!
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
            this.userCache.set(user.uid, {
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                online: true
            });
            
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
        if (this.userCache.has(userId)) {
            return this.userCache.get(userId);
        }
        
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
    }
    
    async loadChats() {
        const user = auth.currentUser;
        if (!user) return;
        
        try {
            const chatsList = document.getElementById('chatsList');
            if (chatsList) {
                chatsList.innerHTML = '<div class="loading-chats"><i class="fas fa-spinner fa-spin"></i> Loading chats...</div>';
            }
            
            const privateChatsSnapshot = await db.collection('privateChats')
                .where('participants', 'array-contains', user.uid)
                .orderBy('lastMessageTime', 'desc')
                .get()
                .catch(error => {
                    console.error('Error loading private chats:', error);
                    return { empty: true, forEach: () => {} };
                });
            
            await this.displayChats(privateChatsSnapshot, 'private');
            
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
        let name, avatar, lastMessage, time;
        
        if (isGroup) {
            name = chatData.name || 'Unnamed Group';
            avatar = chatData.avatar || null;
            lastMessage = chatData.lastMessage || 'No messages yet';
        } else {
            const otherParticipant = await this.getOtherParticipant(chatData.participants);
            name = otherParticipant?.displayName || otherParticipant?.email?.split('@')[0] || 'User';
            avatar = otherParticipant?.photoURL || null;
            lastMessage = chatData.lastMessage || 'No messages yet';
        }
        
        // ✅ FIX: Use formatTime directly, no .toDate()
        time = chatData.lastMessageTime ? this.formatTime(chatData.lastMessageTime) : '';
        
        let avatarHtml = '';
        if (avatar) {
            avatarHtml = `<img src="${avatar}" alt="${this.escapeHtml(name)}" loading="lazy">`;
        } else {
            avatarHtml = `<i class="fas ${isGroup ? 'fa-users' : 'fa-user'}"></i>`;
        }
        
        div.innerHTML = `
            <div class="chat-avatar">
                ${avatarHtml}
                ${!isGroup ? `<span class="status-indicator"></span>` : ''}
            </div>
            <div class="chat-info">
                <div class="chat-name">${this.escapeHtml(name)}</div>
                <div class="chat-last-message">${this.escapeHtml(lastMessage.substring(0, 35))}${lastMessage.length > 35 ? '...' : ''}</div>
            </div>
            <div class="chat-meta">
                <div class="chat-time">${time}</div>
            </div>
        `;
        
        div.addEventListener('click', (e) => {
            e.preventDefault();
            this.openChat(chatId, chatData, type);
        });
        
        return div;
    }
    
    // ============ REAL-TIME UPDATES ============
    listenToChats() {
        const user = auth.currentUser;
        if (!user) return;
        
        if (this.chatsListener) this.chatsListener();
        if (this.groupsListener) this.groupsListener();
        
        this.chatsListener = db.collection('privateChats')
            .where('participants', 'array-contains', user.uid)
            .orderBy('lastMessageTime', 'desc')
            .onSnapshot((snapshot) => {
                this.handleChatUpdates(snapshot, 'private');
            }, (error) => {
                console.error('❌ Error listening to private chats:', error);
                setTimeout(() => this.listenToChats(), 3000);
            });
        
        this.groupsListener = db.collection('groupChats')
            .where('members', 'array-contains', user.uid)
            .orderBy('lastMessageTime', 'desc')
            .onSnapshot((snapshot) => {
                this.handleChatUpdates(snapshot, 'group');
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
                if (element) element.remove();
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
        if (this.currentChat === chatId && this.currentChatType === type) {
            return;
        }
        
        this.currentChat = chatId;
        this.currentChatType = type;
        this.currentChatData = chatData;
        
        document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
        const activeChat = document.querySelector(`[data-chat-id="${chatId}"]`);
        if (activeChat) activeChat.classList.add('active');
        
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
        
        if (window.appController) {
            window.appController.showGroupMenu(type === 'group');
        }
        
        await this.updateChatHeader(chatData, type);
        await this.loadMessages(chatId, type);
        this.listenToMessages(chatId, type);
        
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
        
        if (!chatTitle || !chatStatus) return;
        
        if (type === 'group') {
            chatTitle.textContent = chatData.name || 'Unnamed Group';
            chatStatus.textContent = `${chatData.members?.length || 0} members`;
        } else {
            const otherParticipant = await this.getOtherParticipant(chatData.participants);
            const displayName = otherParticipant?.displayName || 
                              otherParticipant?.email?.split('@')[0] || 
                              'User';
            
            chatTitle.textContent = displayName;
            
            const status = otherParticipant?.online ? 'Online' : 'Offline';
            const statusColor = otherParticipant?.online ? '#4caf50' : '#9e9e9e';
            chatStatus.innerHTML = `<span style="color: ${statusColor}">●</span> ${status}`;
        }
    }
    
    async loadMessages(chatId, type, limit = 50) {
        const messagesList = document.getElementById('messagesList');
        if (!messagesList) return;
        
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
            
            snapshot.forEach((doc) => {
                const message = doc.data();
                const messageElement = this.createMessageElement(message);
                fragment.appendChild(messageElement);
            });
            
            messagesList.appendChild(fragment);
            this.scrollToBottom(false);
            
        } catch (error) {
            console.error('❌ Error loading messages:', error);
            messagesList.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-circle"></i><p>Failed to load messages</p><button onclick="location.reload()">Retry</button></div>';
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
        if (this.messagesListener) {
            this.messagesListener();
            this.messagesListener = null;
        }
        
        const collection = type === 'group' ? 'groupMessages' : 'privateMessages';
        
        this.messagesListener = db.collection(collection)
            .where('chatId', '==', chatId)
            .orderBy('timestamp', 'asc')
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const message = change.doc.data();
                        const messageId = change.doc.id;
                        
                        if (document.querySelector(`[data-message-id="${messageId}"]`)) {
                            return;
                        }
                        
                        const messageElement = this.createMessageElement(message);
                        messageElement.dataset.messageId = messageId;
                        
                        const messagesList = document.getElementById('messagesList');
                        const emptyState = messagesList.querySelector('.empty-state');
                        
                        if (emptyState) {
                            messagesList.innerHTML = '';
                        }
                        
                        messagesList.appendChild(messageElement);
                        
                        // Auto scroll para sa bagong messages
                        if (message.senderId !== auth.currentUser?.uid) {
                            this.scrollToBottom(true);
                        }
                        
                        this.updateLastMessage(chatId, message.text);
                    }
                });
            }, (error) => {
                console.error('❌ Error listening to messages:', error);
                setTimeout(() => this.listenToMessages(chatId, type), 3000);
            });
    }
    
    createMessageElement(message) {
        const user = auth.currentUser;
        const isSentByMe = message.senderId === user.uid;
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isSentByMe ? 'sent' : 'received'}`;
        
        let senderAvatar = '';
        let senderName = '';
        
        if (!isSentByMe && message.senderId !== 'system') {
            const senderData = this.userCache.get(message.senderId);
            const displayName = senderData?.displayName || senderData?.email?.split('@')[0] || 'User';
            senderName = displayName;
            
            senderAvatar = senderData?.photoURL ?
                `<img src="${senderData.photoURL}" alt="${this.escapeHtml(displayName)}" loading="lazy">` :
                `<span>${displayName[0].toUpperCase()}</span>`;
        }
        
        // ✅ FIX: Use formatTime directly, no .toDate()
        const time = message.timestamp ? this.formatTime(message.timestamp) : '';
        
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
            
            const chatsList = document.getElementById('chatsList');
            if (chatsList && chatItem.parentNode === chatsList) {
                chatsList.insertBefore(chatItem, chatsList.firstChild);
            }
        }
    }
    
    // ============ MESSAGE ACTIONS ============
    async sendMessage(text) {
        if (!this.currentChat || !text.trim()) return;
        
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
        
        // ✅ FIX: Gumamit ng Date object para sa optimistic update
        const optimisticTimestamp = new Date();
        
        const message = {
            chatId: this.currentChat,
            senderId: user.uid,
            senderName: user.displayName || user.email,
            text: text.trim(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            type: 'text'
        };
        
        const collection = this.currentChatType === 'group' ? 'groupMessages' : 'privateMessages';
        const chatCollection = this.currentChatType === 'group' ? 'groupChats' : 'privateChats';
        
        try {
            // Optimistic update - Date object ang timestamp
            const tempMessage = { 
                ...message, 
                timestamp: optimisticTimestamp
            };
            
            const tempElement = this.createMessageElement(tempMessage);
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
            
            tempElement.classList.remove('temp-message');
            
        } catch (error) {
            console.error('❌ Error sending message:', error);
            
            const messagesList = document.getElementById('messagesList');
            const lastMessage = messagesList.lastChild;
            if (lastMessage && lastMessage.classList.contains('temp-message')) {
                lastMessage.classList.add('error');
                const contentDiv = lastMessage.querySelector('.message-content');
                if (contentDiv) {
                    contentDiv.innerHTML += '<span class="error-icon"><i class="fas fa-exclamation-circle"></i></span>';
                }
            }
            
            alert('Failed to send message: ' + error.message);
        } finally {
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
            
            await db.collection('groupMessages').add({
                chatId: docRef.id,
                senderId: 'system',
                senderName: 'System',
                text: `${user.displayName || user.email} created the group`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                type: 'system'
            });
            
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
            
            const pendingSnapshot = await db.collection('friendRequests')
                .where('status', '==', 'pending')
                .where('from', 'in', [user.uid, friendId])
                .where('to', 'in', [user.uid, friendId])
                .get();
            
            if (!pendingSnapshot.empty) {
                throw new Error('Friend request already sent');
            }
            
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
    
    // ✅ SUPER FIXED: Format Time - handles ALL timestamp formats!
    formatTime(timestamp) {
        if (!timestamp) return '';
        
        try {
            let date;
            
            // Case 1: Firebase Timestamp (may toDate function)
            if (timestamp && typeof timestamp.toDate === 'function') {
                date = timestamp.toDate();
            }
            // Case 2: Date object
            else if (timestamp instanceof Date) {
                date = timestamp;
            }
            // Case 3: Milliseconds number
            else if (typeof timestamp === 'number') {
                date = new Date(timestamp);
            }
            // Case 4: ISO string
            else if (typeof timestamp === 'string') {
                date = new Date(timestamp);
            }
            // Case 5: Firestore server timestamp {seconds, nanoseconds}
            else if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
                date = new Date(timestamp.seconds * 1000);
            }
            // Case 6: Invalid
            else {
                return '';
            }
            
            // Validate date
            if (!date || isNaN(date.getTime())) {
                return '';
            }
            
            const now = new Date();
            const diff = now - date;
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 7) {
                return date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                });
            } else if (days > 0) {
                return `${days}d ago`;
            } else if (hours > 0) {
                return `${hours}h ago`;
            } else if (minutes > 0) {
                return `${minutes}m ago`;
            } else {
                return 'Just now';
            }
        } catch (error) {
            console.error('❌ Error formatting time:', error);
            return '';
        }
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    scrollToBottom(smooth = false) {
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
}

// ============ INITIALIZATION ============
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
