class ChatManager {
    constructor() {
        this.currentChat = null;
        this.currentChatType = null;
        this.messagesListener = null;
        this.init();
    }
    
    init() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.setupChatListeners();
            }
        });
    }
    
    setupChatListeners() {
        this.loadChats();
        this.listenToChats();
    }
    
    async loadChats() {
        const user = auth.currentUser;
        if (!user) return;
        
        try {
            // Load private chats
            const privateChatsSnapshot = await db.collection('privateChats')
                .where('participants', 'array-contains', user.uid)
                .orderBy('lastMessageTime', 'desc')
                .get();
            
            this.displayChats(privateChatsSnapshot, 'private');
            
            // Load group chats
            const groupChatsSnapshot = await db.collection('groupChats')
                .where('members', 'array-contains', user.uid)
                .orderBy('lastMessageTime', 'desc')
                .get();
            
            this.displayChats(groupChatsSnapshot, 'group');
            
        } catch (error) {
            console.error('Error loading chats:', error);
        }
    }
    
    displayChats(snapshot, type) {
        const chatsList = document.getElementById('chatsList');
        if (!chatsList) return;
        
        snapshot.forEach((doc) => {
            const chatData = doc.data();
            const chatId = doc.id;
            
            // Check if chat already exists
            if (!document.querySelector(`[data-chat-id="${chatId}"]`)) {
                const chatElement = this.createChatElement(chatData, chatId, type);
                chatsList.appendChild(chatElement);
            }
        });
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
            // Get other participant data
            const otherParticipant = await this.getOtherParticipant(chatData.participants);
            name = otherParticipant?.displayName || otherParticipant?.email?.split('@')[0] || 'User';
            avatar = otherParticipant?.photoURL || null;
            lastMessage = chatData.lastMessage || 'No messages yet';
        }
        
        time = chatData.lastMessageTime ? this.formatTime(chatData.lastMessageTime.toDate()) : '';
        
        // Create avatar HTML
        let avatarHtml = '';
        if (avatar) {
            avatarHtml = `<img src="${avatar}" alt="${this.escapeHtml(name)}">`;
        } else {
            avatarHtml = `<i class="fas ${isGroup ? 'fa-users' : 'fa-user'}"></i>`;
        }
        
        div.innerHTML = `
            <div class="chat-avatar">
                ${avatarHtml}
            </div>
            <div class="chat-info">
                <div class="chat-name">${this.escapeHtml(name)}</div>
                <div class="chat-last-message">${this.escapeHtml(lastMessage)}</div>
            </div>
            <div class="chat-time">${time}</div>
        `;
        
        div.addEventListener('click', () => this.openChat(chatId, chatData, type));
        
        return div;
    }
    
    async getOtherParticipant(participants) {
        const user = auth.currentUser;
        if (!user) return null;
        
        const otherUid = participants.find(id => id !== user.uid);
        if (!otherUid) return null;
        
        try {
            const userDoc = await db.collection('users').doc(otherUid).get();
            return userDoc.data();
        } catch (error) {
            console.error('Error getting participant:', error);
            return null;
        }
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    listenToChats() {
        const user = auth.currentUser;
        if (!user) return;
        
        // Listen to private chats
        db.collection('privateChats')
            .where('participants', 'array-contains', user.uid)
            .orderBy('lastMessageTime', 'desc')
            .onSnapshot((snapshot) => {
                this.handleChatUpdates(snapshot, 'private');
            }, (error) => {
                console.error('Error listening to private chats:', error);
            });
        
        // Listen to group chats
        db.collection('groupChats')
            .where('members', 'array-contains', user.uid)
            .orderBy('lastMessageTime', 'desc')
            .onSnapshot((snapshot) => {
                this.handleChatUpdates(snapshot, 'group');
            }, (error) => {
                console.error('Error listening to group chats:', error);
            });
    }
    
    async handleChatUpdates(snapshot, type) {
        const chatsList = document.getElementById('chatsList');
        if (!chatsList) return;
        
        for (const change of snapshot.docChanges()) {
            const chatData = change.doc.data();
            const chatId = change.doc.id;
            
            if (change.type === 'added') {
                if (!document.querySelector(`[data-chat-id="${chatId}"]`)) {
                    const chatElement = await this.createChatElement(chatData, chatId, type);
                    chatsList.appendChild(chatElement);
                }
            } else if (change.type === 'modified') {
                const oldElement = document.querySelector(`[data-chat-id="${chatId}"]`);
                if (oldElement) {
                    const newElement = await this.createChatElement(chatData, chatId, type);
                    oldElement.replaceWith(newElement);
                }
            } else if (change.type === 'removed') {
                const element = document.querySelector(`[data-chat-id="${chatId}"]`);
                if (element) {
                    element.remove();
                }
            }
        }
    }
    
    async openChat(chatId, chatData, type) {
        this.currentChat = chatId;
        this.currentChatType = type;
        
        // Update UI
        document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
        const activeChat = document.querySelector(`[data-chat-id="${chatId}"]`);
        if (activeChat) activeChat.classList.add('active');
        
        // Show message input
        const welcomeMessage = document.getElementById('welcomeMessage');
        const messageInputContainer = document.getElementById('messageInputContainer');
        if (welcomeMessage) welcomeMessage.style.display = 'none';
        if (messageInputContainer) messageInputContainer.style.display = 'flex';
        
        // Update chat header
        await this.updateChatHeader(chatData, type);
        
        // Load messages
        await this.loadMessages(chatId, type);
        
        // Listen for new messages
        this.listenToMessages(chatId, type);
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
            chatTitle.textContent = otherParticipant?.displayName || 
                                  otherParticipant?.email?.split('@')[0] || 
                                  'User';
            
            // Show online status
            const status = otherParticipant?.online ? 'Online' : 'Offline';
            const statusColor = otherParticipant?.online ? '#4caf50' : '#9e9e9e';
            chatStatus.innerHTML = `<span style="color: ${statusColor}">●</span> ${status}`;
        }
    }
    
    async loadMessages(chatId, type) {
        const messagesList = document.getElementById('messagesList');
        if (!messagesList) return;
        
        messagesList.innerHTML = '';
        
        const collection = type === 'group' ? 'groupMessages' : 'privateMessages';
        
        try {
            const snapshot = await db.collection(collection)
                .where('chatId', '==', chatId)
                .orderBy('timestamp', 'asc')
                .limit(50)
                .get();
            
            const promises = [];
            snapshot.forEach((doc) => {
                const message = doc.data();
                promises.push(this.displayMessage(message));
            });
            
            await Promise.all(promises);
            this.scrollToBottom();
            
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }
    
    listenToMessages(chatId, type) {
        if (this.messagesListener) {
            this.messagesListener();
        }
        
        const collection = type === 'group' ? 'groupMessages' : 'privateMessages';
        
        this.messagesListener = db.collection(collection)
            .where('chatId', '==', chatId)
            .orderBy('timestamp', 'asc')
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach(async (change) => {
                    if (change.type === 'added') {
                        const message = change.doc.data();
                        await this.displayMessage(message);
                        this.scrollToBottom();
                    }
                });
            }, (error) => {
                console.error('Error listening to messages:', error);
            });
    }
    
    async displayMessage(message) {
        const messagesList = document.getElementById('messagesList');
        if (!messagesList) return;
        
        const user = auth.currentUser;
        const isSentByMe = message.senderId === user.uid;
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isSentByMe ? 'sent' : 'received'}`;
        
        let senderAvatar = '';
        let senderName = '';
        
        if (!isSentByMe && message.senderId !== 'system') {
            try {
                const senderDoc = await db.collection('users').doc(message.senderId).get();
                const senderData = senderDoc.data();
                const displayName = senderData?.displayName || senderData?.email?.split('@')[0] || 'User';
                senderName = displayName;
                
                if (senderData?.photoURL) {
                    senderAvatar = `<img src="${senderData.photoURL}" alt="${this.escapeHtml(displayName)}">`;
                } else {
                    senderAvatar = `<span>${displayName[0].toUpperCase()}</span>`;
                }
            } catch (error) {
                console.error('Error getting sender info:', error);
            }
        }
        
        const time = message.timestamp ? this.formatTime(message.timestamp.toDate()) : '';
        
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
                    <div class="message-info">
                        <div class="message-sender">${this.escapeHtml(senderName)}</div>
                ` : ''}
                <div class="message-content">
                    <div class="message-text">${this.escapeHtml(message.text)}</div>
                    <div class="message-time">${time}</div>
                </div>
                ${!isSentByMe ? '</div>' : ''}
            `;
        }
        
        messagesList.appendChild(messageElement);
    }
    
    async sendMessage(text) {
        if (!this.currentChat || !text.trim()) return;
        
        const user = auth.currentUser;
        if (!user) {
            alert('You must be logged in');
            return;
        }
        
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
            await db.collection(collection).add(message);
            
            await db.collection(chatCollection).doc(this.currentChat).update({
                lastMessage: text.trim(),
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                lastSenderId: user.uid
            });
            
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message: ' + error.message);
        }
    }

    async createGroup(name, members, avatar = null) {
        const user = auth.currentUser;
        if (!user) throw new Error('Not authenticated');
        
        // Filter out empty or invalid members
        const validMembers = members.filter(id => id && id !== user.uid);
        const allMembers = [user.uid, ...validMembers];
        
        // Remove duplicates
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
            console.log('Creating group with data:', groupData);
            
            const docRef = await db.collection('groupChats').add(groupData);
            console.log('Group created with ID:', docRef.id);
            
            // Add system message
            await db.collection('groupMessages').add({
                chatId: docRef.id,
                senderId: 'system',
                senderName: 'System',
                text: `${user.displayName || user.email} created the group`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                type: 'system'
            });
            
            return docRef.id;
            
        } catch (error) {
            console.error('Error creating group:', error);
            throw new Error(error.message || 'Failed to create group');
        }
    }

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
                if (data.participants.includes(friendId)) {
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
            console.log('Friend request sent to:', email);
            
            return true;
            
        } catch (error) {
            console.error('Error adding friend:', error);
            throw error;
        }
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
    
    scrollToBottom() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }
    }
}

// Initialize Chat Manager
let chatManager;
if (typeof window !== 'undefined') {
    chatManager = new ChatManager();
    window.chatManager = chatManager;
}
