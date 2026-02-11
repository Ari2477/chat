// Chat Module
class ChatManager {
    constructor() {
        this.currentChat = null;
        this.currentChatType = null; // 'private' or 'group'
        this.messagesListener = null;
        this.init();
    }
    
    init() {
        // Listen for auth state
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.setupChatListeners();
            }
        });
    }
    
    setupChatListeners() {
        // Load user's chats
        this.loadChats();
        
        // Setup real-time listeners for chats
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
            
            const chatElement = this.createChatElement(chatData, chatId, type);
            chatsList.appendChild(chatElement);
        });
    }
    
    createChatElement(chatData, chatId, type) {
        const div = document.createElement('div');
        div.className = 'chat-item';
        div.dataset.chatId = chatId;
        div.dataset.chatType = type;
        
        const isGroup = type === 'group';
        const name = isGroup ? chatData.name : this.getOtherParticipantName(chatData.participants);
        const avatar = isGroup ? chatData.avatar : this.getOtherParticipantAvatar(chatData.participants);
        const lastMessage = chatData.lastMessage || 'No messages yet';
        const time = chatData.lastMessageTime ? this.formatTime(chatData.lastMessageTime.toDate()) : '';
        
        div.innerHTML = `
            <div class="chat-avatar">
                ${avatar ? `<img src="${avatar}" alt="${name}">` : `<i class="fas ${isGroup ? 'fa-users' : 'fa-user'}"></i>`}
            </div>
            <div class="chat-info">
                <div class="chat-name">${name}</div>
                <div class="chat-last-message">${lastMessage}</div>
            </div>
            <div class="chat-time">${time}</div>
        `;
        
        div.addEventListener('click', () => this.openChat(chatId, chatData, type));
        
        return div;
    }
    
    getOtherParticipantName(participants) {
        const user = auth.currentUser;
        const otherUid = participants.find(id => id !== user.uid);
        // You might want to fetch the user's name from Firestore
        return otherUid ? otherUid.slice(0, 6) : 'Unknown User';
    }
    
    getOtherParticipantAvatar(participants) {
        // Implement avatar fetching logic
        return null;
    }
    
    async openChat(chatId, chatData, type) {
        this.currentChat = chatId;
        this.currentChatType = type;
        
        // Update UI
        document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
        document.querySelector(`[data-chat-id="${chatId}"]`).classList.add('active');
        
        // Show message input
        document.getElementById('welcomeMessage').style.display = 'none';
        document.getElementById('messageInputContainer').style.display = 'flex';
        
        // Update chat header
        this.updateChatHeader(chatData, type);
        
        // Load messages
        await this.loadMessages(chatId, type);
        
        // Listen for new messages
        this.listenToMessages(chatId, type);
    }
    
    updateChatHeader(chatData, type) {
        const chatTitle = document.getElementById('chatTitle');
        const chatStatus = document.getElementById('chatStatus');
        
        if (type === 'group') {
            chatTitle.textContent = chatData.name;
            chatStatus.textContent = `${chatData.members.length} members`;
        } else {
            const otherParticipantName = this.getOtherParticipantName(chatData.participants);
            chatTitle.textContent = otherParticipantName;
            chatStatus.textContent = 'Online'; // You can implement real-time status
        }
    }
    
    async loadMessages(chatId, type) {
        const messagesList = document.getElementById('messagesList');
        messagesList.innerHTML = '';
        
        const collection = type === 'group' ? 'groupMessages' : 'privateMessages';
        
        try {
            const snapshot = await db.collection(collection)
                .where('chatId', '==', chatId)
                .orderBy('timestamp', 'asc')
                .limit(50)
                .get();
            
            snapshot.forEach((doc) => {
                const message = doc.data();
                this.displayMessage(message);
            });
            
            // Scroll to bottom
            this.scrollToBottom();
            
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }
    
    listenToMessages(chatId, type) {
        // Remove previous listener
        if (this.messagesListener) {
            this.messagesListener();
        }
        
        const collection = type === 'group' ? 'groupMessages' : 'privateMessages';
        
        this.messagesListener = db.collection(collection)
            .where('chatId', '==', chatId)
            .orderBy('timestamp', 'asc')
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const message = change.doc.data();
                        this.displayMessage(message);
                        this.scrollToBottom();
                    }
                });
            });
    }
    
    displayMessage(message) {
        const messagesList = document.getElementById('messagesList');
        const user = auth.currentUser;
        const isSentByMe = message.senderId === user.uid;
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isSentByMe ? 'sent' : 'received'}`;
        
        const time = message.timestamp ? this.formatTime(message.timestamp.toDate()) : '';
        
        messageElement.innerHTML = `
            ${!isSentByMe ? `
                <div class="message-avatar">
                    ${message.senderName ? message.senderName[0].toUpperCase() : '?'}
                </div>
            ` : ''}
            <div class="message-content">
                <div class="message-text">${message.text}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
        
        messagesList.appendChild(messageElement);
    }
    
    async sendMessage(text) {
        if (!this.currentChat || !text.trim()) return;
        
        const user = auth.currentUser;
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
            // Add message
            await db.collection(collection).add(message);
            
            // Update last message in chat
            await db.collection(chatCollection).doc(this.currentChat).update({
                lastMessage: text.trim(),
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                lastSenderId: user.uid
            });
            
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        }
    }
    
    async createGroup(name, members, avatar = null) {
        const user = auth.currentUser;
        
        const groupData = {
            name: name,
            members: [user.uid, ...members],
            admins: [user.uid],
            createdBy: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
            avatar: avatar || null
        };
        
        try {
            const docRef = await db.collection('groupChats').add(groupData);
            
            // Send system message
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
            throw error;
        }
    }
    
    async addFriend(email) {
        const user = auth.currentUser;
        
        try {
            // Find user by email
            const userSnapshot = await db.collection('users')
                .where('email', '==', email)
                .get();
            
            if (userSnapshot.empty) {
                throw new Error('User not found');
            }
            
            const friendDoc = userSnapshot.docs[0];
            const friendId = friendDoc.id;
            
            if (friendId === user.uid) {
                throw new Error('You cannot add yourself as a friend');
            }
            
            // Check if already friends
            const friendRequestRef = db.collection('friendRequests').doc();
            
            await friendRequestRef.set({
                from: user.uid,
                to: friendId,
                status: 'pending',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return true;
            
        } catch (error) {
            console.error('Error adding friend:', error);
            throw error;
        }
    }
    
    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days > 7) {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else if (days > 0) {
            return `${days}d ago`;
        } else {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }
    }
    
    scrollToBottom() {
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
            });
        
        // Listen to group chats
        db.collection('groupChats')
            .where('members', 'array-contains', user.uid)
            .orderBy('lastMessageTime', 'desc')
            .onSnapshot((snapshot) => {
                this.handleChatUpdates(snapshot, 'group');
            });
    }
    
    handleChatUpdates(snapshot, type) {
        const chatsList = document.getElementById('chatsList');
        if (!chatsList) return;
        
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const chatData = change.doc.data();
                const chatId = change.doc.id;
                
                // Check if chat already exists
                if (!document.querySelector(`[data-chat-id="${chatId}"]`)) {
                    const chatElement = this.createChatElement(chatData, chatId, type);
                    chatsList.appendChild(chatElement);
                }
            } else if (change.type === 'modified') {
                // Update chat element
                const chatElement = document.querySelector(`[data-chat-id="${change.doc.id}"]`);
                if (chatElement) {
                    const chatData = change.doc.data();
                    const newChatElement = this.createChatElement(chatData, change.doc.id, type);
                    chatElement.replaceWith(newChatElement);
                }
            }
        });
    }
}

// Initialize Chat Manager
const chatManager = new ChatManager();
