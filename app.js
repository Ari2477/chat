
let currentUser = null;
let currentPMUser = null;
let unsubscribeGC = null;
let unsubscribePM = null;
let unsubscribeUsers = null;
let unsubscribeMembers = null;
let unsubscribeUnreadPMs = null;
let unsubscribeTyping = null;
let isUploading = false;
let currentTheme = 'dark';
let searchTimeout = null;
let currentPinnedMessageId = null;
let currentMessageForReaction = null;
let currentMessageForForward = null;
let recognition = null;
let isRecording = false;

// GROUP CHAT ID
const GROUP_CHAT_ID = "general_chat";

// ============================================
// AUTHENTICATION
// ============================================
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = user;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initializeApp());
    } else {
        await initializeApp();
    }
});

// ============================================
// INITIALIZATION
// ============================================
async function initializeApp() {
    try {
        console.log('Initializing app for user:', currentUser.uid);
        
        const userFirstLetter = (currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase();
        const defaultAvatar = `https://ui-avatars.com/api/?name=${userFirstLetter}&background=4f46e5&color=fff&size=200&bold=true`;

        const userNameEl = document.getElementById('current-user-name');
        const userPfpEl = document.getElementById('current-user-pfp');
        
        if (userNameEl) userNameEl.textContent = currentUser.displayName || currentUser.email.split('@')[0] || 'User';

        if (userPfpEl) {
            userPfpEl.src = currentUser.photoURL || defaultAvatar;
            userPfpEl.onerror = function() {
                this.onerror = null;
                this.src = defaultAvatar;
            };
        }

        // Save user to Firestore with lastSeen
        await db.collection('users').doc(currentUser.uid).set({
            uid: currentUser.uid,
            name: currentUser.displayName || currentUser.email.split('@')[0] || 'Anonymous',
            email: currentUser.email || '',
            photoURL: currentUser.photoURL || defaultAvatar,
            online: true,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            lastActive: new Date().toISOString()
        }, { merge: true });

        await initializeGroupChat();
        loadUsers();
        listenToUnreadPMs();
        setupPresence();
        setupEnterKeyListeners();
        loadTheme();
        
        console.log('✅ App initialized successfully');
        showToast('✅ Connected to chat!', 'success');
        
    } catch (error) {
        console.error('❌ Error initializing app:', error);
        showToast('Failed to initialize. Refreshing...', 'error');
        setTimeout(() => window.location.reload(), 2000);
    }
}

// ============================================
// GROUP CHAT
// ============================================
async function initializeGroupChat() {
    const gcRef = db.collection('groupChats').doc(GROUP_CHAT_ID);
    const gcDoc = await gcRef.get();
    
    if (!gcDoc.exists) {
        await gcRef.set({
            name: 'World Chat 🌏',
            description: 'Welcome to the group! 👋',
            photoURL: 'https://i.ibb.co/qYky078V/Screenshot-20260212-134936-1.jpg',
            createdBy: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            members: [currentUser.uid],
            memberCount: 1,
            pinnedMessage: null
        });
    } else {
        const members = gcDoc.data().members || [];
        if (!members.includes(currentUser.uid)) {
            await gcRef.update({
                members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
                memberCount: firebase.firestore.FieldValue.increment(1)
            });
        }
    }
    
    loadGCInfo();
    listenToGCMessages();
    listenToGCMembers();
    listenToPinnedMessage();
}

function loadGCInfo() {
    db.collection('groupChats').doc(GROUP_CHAT_ID).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();

            const gcNameElements = ['gc-name', 'sidebar-gc-name', 'display-gc-name'];
            gcNameElements.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = data.name || 'World Chat 🌏';
            });

            const descEl = document.getElementById('display-gc-desc');
            if (descEl) descEl.textContent = data.description || 'Welcome to the group! 👋';

            const gcPFP = data.photoURL || 'https://i.ibb.co/qYky078V/Screenshot-20260212-134936-1.jpg';
            const pfpElements = ['gc-pfp', 'sidebar-gc-pfp', 'modal-gc-pfp'];
            
            pfpElements.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.src = gcPFP;
                    el.onerror = function() {
                        this.onerror = null;
                        this.src = 'https://i.ibb.co/qYky078V/Screenshot-20260212-134936-1.jpg';
                    };
                }
            });

            const memberCount = data.members?.length || 0;
            const countElements = ['member-count', 'sidebar-member-count'];
            countElements.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = `${memberCount} members`;
            });

            // Created date
            if (data.createdAt) {
                const date = data.createdAt.toDate();
                const createdEl = document.getElementById('gc-created');
                if (createdEl) {
                    createdEl.textContent = date.toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                    });
                }
            }
        }
    });
}

// ============================================
// PINNED MESSAGES
// ============================================
function listenToPinnedMessage() {
    db.collection('groupChats').doc(GROUP_CHAT_ID).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const pinnedId = data.pinnedMessage;
            const pinnedEl = document.getElementById('pinned-message');
            const pinnedContent = document.getElementById('pinned-content');
            const pinnedModal = document.getElementById('pinned-text');
            
            if (pinnedId) {
                // Fetch the pinned message
                db.collection('groupChats').doc(GROUP_CHAT_ID)
                    .collection('messages').doc(pinnedId)
                    .get().then((msgDoc) => {
                        if (msgDoc.exists) {
                            const msg = msgDoc.data();
                            if (pinnedEl) {
                                pinnedEl.classList.remove('hidden');
                                pinnedContent.innerHTML = `<span>📌 ${escapeHTML(msg.text || 'Image message')}</span>`;
                            }
                            if (pinnedModal) {
                                pinnedModal.textContent = msg.text || 'Image message';
                            }
                            currentPinnedMessageId = pinnedId;
                        }
                    });
            } else {
                if (pinnedEl) pinnedEl.classList.add('hidden');
                if (pinnedModal) pinnedModal.textContent = 'No pinned message';
                currentPinnedMessageId = null;
            }
        }
    });
}

async function pinMessage(messageId, messageText) {
    if (!currentUser) return;
    
    try {
        await db.collection('groupChats').doc(GROUP_CHAT_ID).update({
            pinnedMessage: messageId,
            pinnedAt: firebase.firestore.FieldValue.serverTimestamp(),
            pinnedBy: currentUser.uid
        });
        showToast('📌 Message pinned!', 'success');
    } catch (error) {
        console.error('Error pinning message:', error);
        showToast('Failed to pin message', 'error');
    }
}

async function unpinMessage() {
    try {
        await db.collection('groupChats').doc(GROUP_CHAT_ID).update({
            pinnedMessage: null
        });
        showToast('📌 Message unpinned', 'info');
    } catch (error) {
        console.error('Error unpinning message:', error);
    }
}

// ============================================
// GROUP CHAT MESSAGES WITH IMAGES & REACTIONS
// ============================================
function listenToGCMessages() {
    if (unsubscribeGC) unsubscribeGC();
    
    const messagesContainer = document.getElementById('gc-messages');
    if (!messagesContainer) return;
    
    unsubscribeGC = db.collection('groupChats')
        .doc(GROUP_CHAT_ID)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            messagesContainer.innerHTML = '';
            
            if (snapshot.empty) {
                messagesContainer.innerHTML = '<div class="no-messages">👋 No messages yet. Say hello!</div>';
                return;
            }

            const senderIds = new Set();
            snapshot.forEach(doc => {
                senderIds.add(doc.data().senderId);
            });

            Promise.all(Array.from(senderIds).map(async (senderId) => {
                if (senderId === currentUser?.uid) return null;
                const userDoc = await db.collection('users').doc(senderId).get();
                return { id: senderId, data: userDoc.data() };
            })).then((usersData) => {
                const userMap = {};
                usersData.filter(Boolean).forEach(user => {
                    if (user) userMap[user.id] = user.data;
                });
                
                snapshot.forEach((doc) => {
                    const message = doc.data();
                    appendGCMessage(message, messagesContainer, userMap, doc.id);
                });
                
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            });
            
        }, (error) => {
            console.error('Message listener error:', error);
            showToast('Reconnecting to chat...', 'info');
        });
}

function appendGCMessage(message, container, userMap = {}, messageId) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.senderId === currentUser?.uid ? 'sent' : 'received'}`;
    messageDiv.id = `msg-${messageId}`;

    let senderName = message.senderName || 'Unknown';
    let senderPhoto = message.senderPhoto || '';
    let senderId = message.senderId;

    if (message.senderId !== currentUser?.uid && userMap[message.senderId]) {
        senderName = userMap[message.senderId].name || senderName;
        senderPhoto = userMap[message.senderId].photoURL || senderPhoto;
        senderId = message.senderId;
    }

    const firstLetter = senderName.charAt(0).toUpperCase();
    const fallbackAvatar = `https://ui-avatars.com/api/?name=${firstLetter}&background=${message.senderId === currentUser?.uid ? '4f46e5' : '64748b'}&color=fff&size=100&bold=true`;

    const avatarUrl = senderPhoto || fallbackAvatar;
    
    const time = message.timestamp ? 
        new Date(message.timestamp.toDate()).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }) : 'Just now';

    // Handle image messages
    let contentHtml = '';
    if (message.type === 'image') {
        contentHtml = `<img src="${escapeHTML(message.imageUrl)}" class="message-image" alt="Shared image" onclick="openImage('${escapeHTML(message.imageUrl)}')">`;
    } else {
        contentHtml = `<div class="message-text">${formatMessageText(message.text || '')}</div>`;
    }

    // Handle reactions
    let reactionsHtml = '';
    if (message.reactions) {
        const reactionCounts = {};
        Object.values(message.reactions).forEach(r => {
            reactionCounts[r] = (reactionCounts[r] || 0) + 1;
        });
        
        reactionsHtml = '<div class="message-reactions">';
        Object.entries(reactionCounts).forEach(([reaction, count]) => {
            reactionsHtml += `<span class="reaction-badge" onclick="addReaction('${messageId}', '${reaction}', true)">${reaction} ${count}</span>`;
        });
        reactionsHtml += '</div>';
    }
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <img src="${escapeHTML(avatarUrl)}" 
                 alt="${escapeHTML(senderName)}" 
                 loading="lazy"
                 onerror="this.onerror=null; this.src='${escapeHTML(fallbackAvatar)}';">
        </div>
        <div class="message-content">
            <div class="message-sender">${escapeHTML(message.senderId === currentUser?.uid ? 'You' : senderName)}</div>
            ${contentHtml}
            ${reactionsHtml}
            <div class="message-footer">
                <span class="message-time">${time}</span>
                <div class="message-actions">
                    <button onclick="showReactionPicker('${messageId}', true)" class="action-btn" title="React">
                        <i class="fas fa-smile"></i>
                    </button>
                    <button onclick="showForwardModal('${messageId}', '${message.text || ''}', '${message.type || 'text'}', '${message.imageUrl || ''}')" class="action-btn" title="Forward">
                        <i class="fas fa-share"></i>
                    </button>
                    ${message.senderId === currentUser?.uid ? `
                        <button onclick="pinMessage('${messageId}', '${escapeHTML(message.text || '')}')" class="action-btn" title="Pin">
                            <i class="fas fa-thumbtack"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    container.appendChild(messageDiv);
}

// ============================================
// IMAGE SHARING
// ============================================
async function uploadImageMessage(isGC = true) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            showToast('📤 Uploading image...', 'info');
            const imageUrl = await uploadImageToIMGBB(file);
            
            if (isGC) {
                await db.collection('groupChats').doc(GROUP_CHAT_ID)
                    .collection('messages').add({
                        type: 'image',
                        imageUrl: imageUrl,
                        senderId: currentUser.uid,
                        senderName: currentUser.displayName || 'User',
                        senderPhoto: currentUser.photoURL || '',
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
            } else {
                if (!currentPMUser) {
                    showToast('Select a user first', 'error');
                    return;
                }
                const chatId = [currentUser.uid, currentPMUser.id].sort().join('_');
                await db.collection('privateChats').doc(chatId)
                    .collection('messages').add({
                        type: 'image',
                        imageUrl: imageUrl,
                        senderId: currentUser.uid,
                        senderName: currentUser.displayName || 'You',
                        senderPhoto: currentUser.photoURL || '',
                        receiverId: currentPMUser.id,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        read: false
                    });
            }
            showToast('✅ Image sent!', 'success');
        } catch (error) {
            console.error('Error uploading image:', error);
            showToast('Failed to upload image', 'error');
        }
    };
    input.click();
}

function openImage(url) {
    window.open(url, '_blank');
}

// ============================================
// VOICE MESSAGES (Speech to Text)
// ============================================
function startVoiceRecording(isGC = true) {
    if (!('webkitSpeechRecognition' in window)) {
        showToast('Voice not supported in this browser', 'error');
        return;
    }
    
    if (isRecording) return;
    
    recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    const indicator = document.getElementById('voice-recording-indicator');
    if (indicator) indicator.classList.remove('hidden');
    
    recognition.start();
    isRecording = true;
    
    recognition.onresult = (e) => {
        const text = e.results[0][0].transcript;
        if (isGC) {
            const input = document.getElementById('gc-message-input');
            if (input) {
                input.value = text;
                sendGCMessage();
            }
        } else {
            const input = document.getElementById('pm-message-input');
            if (input) {
                input.value = text;
                sendPM();
            }
        }
        stopVoiceRecording();
    };
    
    recognition.onerror = (e) => {
        console.error('Voice error:', e);
        showToast('Voice recognition failed', 'error');
        stopVoiceRecording();
    };
    
    recognition.onend = () => {
        stopVoiceRecording();
    };
}

function stopVoiceRecording() {
    if (recognition) {
        recognition.stop();
        recognition = null;
    }
    isRecording = false;
    const indicator = document.getElementById('voice-recording-indicator');
    if (indicator) indicator.classList.add('hidden');
}

// ============================================
// MESSAGE REACTIONS
// ============================================
function showReactionPicker(messageId, isGC = true) {
    currentMessageForReaction = { messageId, isGC };
    const modal = document.getElementById('reaction-modal');
    if (modal) modal.classList.add('active');
}

async function addReaction(reaction) {
    if (!currentMessageForReaction) return;
    
    const { messageId, isGC } = currentMessageForReaction;
    
    try {
        const collection = isGC ?
            db.collection('groupChats').doc(GROUP_CHAT_ID).collection('messages') :
            db.collection('privateChats').doc(chatId).collection('messages');
        
        await collection.doc(messageId).update({
            [`reactions.${currentUser.uid}`]: reaction
        }, { merge: true });
        
        showToast(`Reacted ${reaction}`, 'success');
    } catch (error) {
        console.error('Error adding reaction:', error);
        showToast('Failed to add reaction', 'error');
    }
    
    closeModal('reaction-modal');
    currentMessageForReaction = null;
}

// ============================================
// MESSAGE FORWARDING
// ============================================
async function showForwardModal(messageId, text, type, imageUrl) {
    currentMessageForForward = { messageId, text, type, imageUrl };
    
    // Load users list
    const usersList = document.getElementById('forward-users-list');
    if (!usersList) return;
    
    const snapshot = await db.collection('users').get();
    usersList.innerHTML = '';
    
    snapshot.forEach(doc => {
        if (doc.id !== currentUser.uid) {
            const user = doc.data();
            const userDiv = document.createElement('div');
            userDiv.className = 'user-item';
            userDiv.onclick = () => forwardMessageToUser(doc.id, user.name);
            userDiv.innerHTML = `
                <div class="user-item-avatar">
                    <img src="${user.photoURL || `https://ui-avatars.com/api/?name=${user.name?.charAt(0) || 'U'}&background=4f46e5&color=fff&size=100`}">
                </div>
                <div class="user-item-info">
                    <div class="user-item-name">${escapeHTML(user.name || 'User')}</div>
                </div>
            `;
            usersList.appendChild(userDiv);
        }
    });
    
    // Show preview
    const preview = document.getElementById('forward-message-preview');
    if (preview) {
        if (type === 'image') {
            preview.innerHTML = `<img src="${imageUrl}" class="forward-preview-image">`;
        } else {
            preview.innerHTML = `<p>${escapeHTML(text)}</p>`;
        }
    }
    
    const modal = document.getElementById('forward-modal');
    if (modal) modal.classList.add('active');
}

async function forwardMessageToUser(userId, userName) {
    if (!currentMessageForForward) return;
    
    const { text, type, imageUrl } = currentMessageForForward;
    const chatId = [currentUser.uid, userId].sort().join('_');
    
    try {
        await db.collection('privateChats').doc(chatId)
            .collection('messages').add({
                text: type === 'image' ? '📷 Image' : text,
                type: type,
                imageUrl: imageUrl,
                senderId: currentUser.uid,
                senderName: currentUser.displayName || 'You',
                senderPhoto: currentUser.photoURL || '',
                receiverId: userId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                read: false,
                forwarded: true,
                forwardedFrom: currentPMUser?.name || 'Unknown'
            });
        
        showToast(`✅ Forwarded to ${userName}`, 'success');
        closeModal('forward-modal');
    } catch (error) {
        console.error('Error forwarding message:', error);
        showToast('Failed to forward message', 'error');
    }
}

// ============================================
// SEARCH MESSAGES
// ============================================
function toggleSearch() {
    const searchBar = document.getElementById('search-bar');
    if (searchBar) {
        searchBar.classList.toggle('hidden');
        if (!searchBar.classList.contains('hidden')) {
            document.getElementById('search-input')?.focus();
        } else {
            document.getElementById('search-results')?.classList.add('hidden');
        }
    }
}

function closeSearch() {
    const searchBar = document.getElementById('search-bar');
    const searchResults = document.getElementById('search-results');
    if (searchBar) searchBar.classList.add('hidden');
    if (searchResults) searchResults.classList.add('hidden');
}

function setupSearchListener() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            document.getElementById('search-results')?.classList.add('hidden');
            return;
        }
        
        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 500);
    });
}

async function performSearch(query) {
    if (!currentUser) return;
    
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = '<div class="search-loading">Searching...</div>';
    resultsContainer.classList.remove('hidden');
    
    try {
        // Search in group chat
        const gcSnapshot = await db.collection('groupChats').doc(GROUP_CHAT_ID)
            .collection('messages')
            .where('text', '>=', query)
            .where('text', '<=', query + '\uf8ff')
            .orderBy('text')
            .limit(10)
            .get();
        
        let results = [];
        gcSnapshot.forEach(doc => {
            results.push({
                ...doc.data(),
                id: doc.id,
                chatType: 'Group Chat'
            });
        });
        
        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">No messages found</div>';
        } else {
            resultsContainer.innerHTML = '<h4>Search Results</h4>';
            results.forEach(msg => {
                const resultDiv = document.createElement('div');
                resultDiv.className = 'search-result-item';
                resultDiv.onclick = () => scrollToMessage(msg.id);
                resultDiv.innerHTML = `
                    <div class="search-result-sender">${escapeHTML(msg.senderName || 'User')}</div>
                    <div class="search-result-text">${escapeHTML(msg.text || '')}</div>
                    <div class="search-result-time">${msg.chatType}</div>
                `;
                resultsContainer.appendChild(resultDiv);
            });
        }
    } catch (error) {
        console.error('Search error:', error);
        resultsContainer.innerHTML = '<div class="search-error">Search failed</div>';
    }
}

// ============================================
// THEME TOGGLE (DARK/LIGHT MODE)
// ============================================
function toggleTheme() {
    const body = document.body;
    const themeBtn = document.querySelector('.theme-btn i');
    
    if (body.classList.contains('light-mode')) {
        body.classList.remove('light-mode');
        localStorage.setItem('messenger-theme', 'dark');
        if (themeBtn) {
            themeBtn.classList.remove('fa-sun');
            themeBtn.classList.add('fa-moon');
        }
    } else {
        body.classList.add('light-mode');
        localStorage.setItem('messenger-theme', 'light');
        if (themeBtn) {
            themeBtn.classList.remove('fa-moon');
            themeBtn.classList.add('fa-sun');
        }
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('messenger-theme') || 'dark';
    const body = document.body;
    const themeBtn = document.querySelector('.theme-btn i');
    
    if (savedTheme === 'light') {
        body.classList.add('light-mode');
        if (themeBtn) {
            themeBtn.classList.remove('fa-moon');
            themeBtn.classList.add('fa-sun');
        }
    }
}

// ============================================
// TYPING INDICATOR
// ============================================
let typingTimeout = null;
let typingListener = null;

function setupTypingListener() {
    const pmInput = document.getElementById('pm-message-input');
    if (!pmInput) return;
    
    pmInput.addEventListener('input', () => {
        if (!currentPMUser) return;
        sendTypingIndicator();
    });
}

async function sendTypingIndicator() {
    if (!currentPMUser) return;
    
    const chatId = [currentUser.uid, currentPMUser.id].sort().join('_');
    
    try {
        await db.collection('privateChats').doc(chatId).update({
            [`typing.${currentUser.uid}`]: true,
            [`typingTimestamp.${currentUser.uid}`]: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(async () => {
            await db.collection('privateChats').doc(chatId).update({
                [`typing.${currentUser.uid}`]: false
            });
        }, 2000);
    } catch (error) {
        console.error('Error sending typing indicator:', error);
    }
}

function listenToTypingIndicator(userId) {
    if (typingListener) typingListener();
    
    const chatId = [currentUser.uid, userId].sort().join('_');
    
    typingListener = db.collection('privateChats').doc(chatId)
        .onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                const isTyping = data.typing?.[userId] || false;
                const typingEl = document.getElementById('typing-indicator');
                
                if (typingEl) {
                    if (isTyping) {
                        typingEl.classList.remove('hidden');
                    } else {
                        typingEl.classList.add('hidden');
                    }
                }
            }
        });
}

// ============================================
// USERS & PRIVATE MESSAGES
// ============================================
function loadUsers() {
    if (unsubscribeUsers) unsubscribeUsers();
    
    unsubscribeUsers = db.collection('users')
        .onSnapshot((snapshot) => {
            const users = [];
            snapshot.forEach((doc) => {
                if (doc.id !== currentUser?.uid) {
                    users.push({ 
                        id: doc.id, 
                        ...doc.data(),
                        unreadCount: 0 
                    });
                }
            });

            users.sort((a, b) => {
                if (a.online && !b.online) return -1;
                if (!a.online && b.online) return 1;
                return (a.name || '').localeCompare(b.name || '');
            });
            
            displayUsers(users);
            displaySidebarUsers(users);
            
            const onlineCount = document.getElementById('online-count');
            if (onlineCount) {
                const onlineUsers = users.filter(u => u.online).length;
                onlineCount.textContent = onlineUsers;
            }
        });
}

function displayUsers(users) {
    const usersList = document.getElementById('users-list');
    if (!usersList) return;
    
    usersList.innerHTML = '';
    
    if (users.length === 0) {
        usersList.innerHTML = '<div class="no-users">No other users online</div>';
        return;
    }
    
    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';
        userDiv.setAttribute('data-user-id', user.id);
        userDiv.onclick = () => openPrivateChat(user);

        const firstLetter = (user.name || 'User').charAt(0).toUpperCase();
        const fallbackAvatar = `https://ui-avatars.com/api/?name=${firstLetter}&background=4f46e5&color=fff&size=100&bold=true`;
        const avatarUrl = user.photoURL || fallbackAvatar;
        
        const statusClass = user.online ? 'online' : 'offline';
        const statusText = user.online ? '● Online' : formatLastSeen(user.lastSeen);
        
        userDiv.innerHTML = `
            <div class="user-item-avatar">
                <img src="${escapeHTML(avatarUrl)}" 
                     alt="${escapeHTML(user.name || 'User')}"
                     loading="lazy"
                     onerror="this.onerror=null; this.src='${escapeHTML(fallbackAvatar)}';">
                <span class="status-indicator ${statusClass}"></span>
            </div>
            <div class="user-item-info">
                <div class="user-item-name">${escapeHTML(user.name || 'User')}</div>
                <div class="user-item-status ${statusClass}">${statusText}</div>
            </div>
        `;
        
        usersList.appendChild(userDiv);
    });
}

function displaySidebarUsers(users) {
    const sidebarUsers = document.getElementById('sidebar-users-list');
    if (!sidebarUsers) return;
    
    sidebarUsers.innerHTML = '';
    
    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'sidebar-user-item user-item';
        userDiv.setAttribute('data-user-id', user.id);
        userDiv.onclick = () => {
            openPrivateChat(user);
            toggleSidebar();
        };
        
        const firstLetter = (user.name || 'User').charAt(0).toUpperCase();
        const fallbackAvatar = `https://ui-avatars.com/api/?name=${firstLetter}&background=4f46e5&color=fff&size=100&bold=true`;
        const avatarUrl = user.photoURL || fallbackAvatar;
        
        const statusClass = user.online ? 'online' : 'offline';
        const statusText = user.online ? '● Online' : formatLastSeen(user.lastSeen);
        
        userDiv.innerHTML = `
            <div class="user-item-avatar">
                <img src="${escapeHTML(avatarUrl)}" 
                     alt="${escapeHTML(user.name || 'User')}"
                     loading="lazy"
                     onerror="this.onerror=null; this.src='${escapeHTML(fallbackAvatar)}';">
                <span class="status-indicator ${statusClass}"></span>
            </div>
            <div class="user-item-info">
                <div class="user-item-name">${escapeHTML(user.name || 'User')}</div>
                <div class="user-item-status ${statusClass}">${statusText}</div>
            </div>
        `;
        
        sidebarUsers.appendChild(userDiv);
    });
}

// ============================================
// LAST SEEN FORMATTER
// ============================================
function formatLastSeen(timestamp) {
    if (!timestamp) return '○ Offline';
    if (!timestamp.toDate) return '○ Offline';
    
    const lastSeen = timestamp.toDate();
    const now = new Date();
    const diffSeconds = Math.floor((now - lastSeen) / 1000);
    
    if (diffSeconds < 60) return '○ Just now';
    if (diffSeconds < 3600) return `○ ${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `○ ${Math.floor(diffSeconds / 3600)}h ago`;
    if (diffSeconds < 604800) return `○ ${Math.floor(diffSeconds / 86400)}d ago`;
    
    return '○ Offline';
}

// ============================================
// UNREAD MESSAGES & BADGES
// ============================================
function listenToUnreadPMs() {
    if (!currentUser) return;
    
    if (unsubscribeUnreadPMs) unsubscribeUnreadPMs();

    unsubscribeUnreadPMs = db.collectionGroup('messages')
        .where('receiverId', '==', currentUser.uid)
        .where('read', '==', false)
        .onSnapshot((snapshot) => {
            const unreadMap = new Map();
            
            snapshot.forEach(doc => {
                const msg = doc.data();
                const senderId = msg.senderId;
                unreadMap.set(senderId, (unreadMap.get(senderId) || 0) + 1);
            });

            document.querySelectorAll('.user-item-avatar .unread-badge').forEach(badge => {
                badge.remove();
            });

            if (unreadMap.size === 0) {
                document.title = 'Mini Messenger';
            } else {
                unreadMap.forEach((count, senderId) => {
                    updateUserUnreadBadge(senderId, count);
                });
                
                const totalUnread = Array.from(unreadMap.values()).reduce((a, b) => a + b, 0);
                document.title = `(${totalUnread}) Mini Messenger`;
            }
        });
}

function updateUserUnreadBadge(userId, count) {
    const userItems = document.querySelectorAll(`.user-item[data-user-id="${userId}"]`);
    
    userItems.forEach(item => {
        const avatarContainer = item.querySelector('.user-item-avatar');
        if (!avatarContainer) return;

        const existingBadge = avatarContainer.querySelector('.unread-badge');
        if (existingBadge) existingBadge.remove();

        if (count > 0) {
            const badge = document.createElement('span');
            badge.className = 'unread-badge';
            badge.textContent = count > 99 ? '99+' : count;
            avatarContainer.appendChild(badge);
        }
    });
}

// ============================================
// PRIVATE CHAT FUNCTIONS
// ============================================
async function openPrivateChat(user) {
    if (!user) return;
    
    currentPMUser = user;
    await markMessagesAsRead(user.id);
    resetPMNotifications(user.id);
    
    const pmNameEl = document.getElementById('pm-user-name');
    const pmPfpEl = document.getElementById('pm-user-pfp');
    
    if (pmNameEl) pmNameEl.textContent = user.name || 'User';

    if (pmPfpEl) {
        const firstLetter = (user.name || 'User').charAt(0).toUpperCase();
        const fallbackAvatar = `https://ui-avatars.com/api/?name=${firstLetter}&background=4f46e5&color=fff&size=100&bold=true`;
        const avatarUrl = user.photoURL || fallbackAvatar;
        
        pmPfpEl.src = avatarUrl;
        pmPfpEl.onerror = function() {
            this.onerror = null;
            this.src = fallbackAvatar;
        };
    }
    
    const usersList = document.getElementById('users-list');
    const pmChatArea = document.getElementById('pm-chat-area');
    
    if (usersList) usersList.classList.add('hidden');
    if (pmChatArea) pmChatArea.classList.remove('hidden');
    
    listenToPMMessages(user.id);
    listenToTypingIndicator(user.id);
}

function closePM() {
    currentPMUser = null;
    
    const usersList = document.getElementById('users-list');
    const pmChatArea = document.getElementById('pm-chat-area');
    
    if (usersList) usersList.classList.remove('hidden');
    if (pmChatArea) pmChatArea.classList.add('hidden');
    
    if (unsubscribePM) unsubscribePM();
    if (typingListener) typingListener();
}

function listenToPMMessages(otherUserId) {
    if (unsubscribePM) unsubscribePM();
    
    const messagesContainer = document.getElementById('pm-messages');
    if (!messagesContainer) return;
    
    const chatId = [currentUser.uid, otherUserId].sort().join('_');
    
    unsubscribePM = db.collection('privateChats')
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            messagesContainer.innerHTML = '';
            
            if (snapshot.empty) {
                messagesContainer.innerHTML = '<div class="no-messages">💬 No messages yet. Say hi!</div>';
                return;
            }
            
            snapshot.forEach((doc) => {
                const message = doc.data();
                appendPMMessage(message, messagesContainer, doc.id);
            });
            
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            if (currentPMUser?.id === otherUserId) {
                markMessagesAsRead(otherUserId);
            }
        });
}

function appendPMMessage(message, container, messageId) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.senderId === currentUser?.uid ? 'sent' : 'received'}`;
    messageDiv.id = `pm-msg-${messageId}`;
    
    const isSentByMe = message.senderId === currentUser?.uid;
    
    let senderName, senderPhoto, senderFirstLetter;
    
    if (isSentByMe) {
        senderName = 'You';
        senderFirstLetter = (currentUser?.displayName || 'U').charAt(0).toUpperCase();
        senderPhoto = currentUser?.photoURL || '';
    } else {
        senderName = currentPMUser?.name || 'User';
        senderFirstLetter = (currentPMUser?.name || 'U').charAt(0).toUpperCase();
        senderPhoto = currentPMUser?.photoURL || '';
    }
    
    const fallbackAvatar = `https://ui-avatars.com/api/?name=${senderFirstLetter}&background=${isSentByMe ? '4f46e5' : '64748b'}&color=fff&size=100&bold=true`;
    const avatarUrl = senderPhoto || fallbackAvatar;
    
    const time = message.timestamp ? 
        new Date(message.timestamp.toDate()).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }) : 'Just now';

    // Handle forwarded messages
    let forwardIndicator = '';
    if (message.forwarded) {
        forwardIndicator = '<span class="forward-indicator"><i class="fas fa-share"></i> Forwarded</span>';
    }

    // Handle image messages
    let contentHtml = '';
    if (message.type === 'image') {
        contentHtml = `<img src="${escapeHTML(message.imageUrl)}" class="message-image" alt="Shared image" onclick="openImage('${escapeHTML(message.imageUrl)}')">`;
    } else {
        contentHtml = `<div class="message-text">${formatMessageText(message.text || '')}</div>`;
    }

    // Handle reactions
    let reactionsHtml = '';
    if (message.reactions) {
        const reactionCounts = {};
        Object.values(message.reactions).forEach(r => {
            reactionCounts[r] = (reactionCounts[r] || 0) + 1;
        });
        
        reactionsHtml = '<div class="message-reactions">';
        Object.entries(reactionCounts).forEach(([reaction, count]) => {
            reactionsHtml += `<span class="reaction-badge" onclick="addReaction('${messageId}', '${reaction}', false)">${reaction} ${count}</span>`;
        });
        reactionsHtml += '</div>';
    }
    
    let readStatus = '';
    if (isSentByMe) {
        readStatus = message.read 
            ? '<span class="status-read" title="Read"><i class="fas fa-check-double"></i></span>' 
            : '<span class="status-sent" title="Sent"><i class="fas fa-check"></i></span>';
    }
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <img src="${escapeHTML(avatarUrl)}" 
                 alt="${escapeHTML(senderName)}"
                 loading="lazy"
                 onerror="this.onerror=null; this.src='${escapeHTML(fallbackAvatar)}';">
        </div>
        <div class="message-content">
            <div class="message-sender">${escapeHTML(senderName)}</div>
            ${forwardIndicator}
            ${contentHtml}
            ${reactionsHtml}
            <div class="message-footer">
                <span class="message-time">${time}</span>
                ${readStatus}
                ${!isSentByMe ? `
                    <div class="message-actions">
                        <button onclick="showReactionPicker('${messageId}', false)" class="action-btn" title="React">
                            <i class="fas fa-smile"></i>
                        </button>
                        <button onclick="showForwardModal('${messageId}', '${escapeHTML(message.text || '')}', '${message.type || 'text'}', '${message.imageUrl || ''}')" class="action-btn" title="Forward">
                            <i class="fas fa-share"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    container.appendChild(messageDiv);
}

async function sendPM() {
    if (!currentPMUser) {
        showToast('Select a user first', 'error');
        return;
    }
    
    const input = document.getElementById('pm-message-input');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) {
        showToast('Please type a message', 'error');
        return;
    }
    
    input.disabled = true;
    const sendBtn = document.querySelector('#pm-view .send-btn');
    if (sendBtn) {
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        sendBtn.disabled = true;
    }
    
    const messageText = input.value;
    input.value = '';
    
    try {
        const chatId = [currentUser.uid, currentPMUser.id].sort().join('_');

        await db.collection('privateChats')
            .doc(chatId)
            .collection('messages')
            .add({
                text: messageText,
                senderId: currentUser.uid,
                senderName: currentUser.displayName || 'You',
                senderPhoto: currentUser.photoURL || '',
                receiverId: currentPMUser.id,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                read: false 
            });
        
    } catch (error) {
        console.error('❌ Error sending PM:', error);
        showToast('Failed to send message', 'error');
        input.value = messageText;
    } finally {
        input.disabled = false;
        input.focus();
        if (sendBtn) {
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            sendBtn.disabled = false;
        }
    }
}

async function markMessagesAsRead(senderId) {
    if (!currentUser || !senderId) return;
    
    const chatId = [currentUser.uid, senderId].sort().join('_');
    
    try {
        const messagesRef = db.collection('privateChats')
            .doc(chatId)
            .collection('messages')
            .where('receiverId', '==', currentUser.uid)
            .where('read', '==', false);
        
        const snapshot = await messagesRef.get();
        
        if (snapshot.size > 0) {
            const batch = db.batch();
            snapshot.forEach(doc => {
                batch.update(doc.ref, { 
                    read: true,
                    readAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            
            await batch.commit();
            updateUserUnreadBadge(senderId, 0);
        }
        
    } catch (error) {
        console.error('❌ Error marking messages as read:', error);
    }
}

function resetPMNotifications(senderId) {
    updateUserUnreadBadge(senderId, 0);
    const totalUnread = getTotalUnreadCount();
    document.title = totalUnread > 0 ? `(${totalUnread}) Mini Messenger` : 'Mini Messenger';
}

function resetGCNotifications() {
    const totalUnread = getTotalUnreadCount();
    document.title = totalUnread > 0 ? `(${totalUnread}) Mini Messenger` : 'Mini Messenger';
}

function getTotalUnreadCount() {
    let total = 0;
    const badges = document.querySelectorAll('.user-item-avatar .unread-badge');
    badges.forEach(badge => {
        const count = badge.textContent;
        if (count === '99+') {
            total += 99;
        } else {
            total += parseInt(count) || 0;
        }
    });
    return total;
}

// ============================================
// IMAGE UPLOAD
// ============================================
async function uploadImageToIMGBB(file) {
    return new Promise((resolve, reject) => {
        if (isUploading) {
            reject('Upload already in progress');
            return;
        }
        
        isUploading = true;
        
        if (!file) {
            isUploading = false;
            reject('No file selected');
            return;
        }
        
        if (!file.type.match('image.*')) {
            isUploading = false;
            showToast('Please select an image file', 'error');
            reject('Invalid file type');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            isUploading = false;
            showToast('File too large. Max 5MB', 'error');
            reject('File too large');
            return;
        }
        
        const formData = new FormData();
        formData.append('image', file);
        
        fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            isUploading = false;
            
            if (data.success) {
                resolve(data.data.url);
            } else {
                showToast('❌ Upload failed', 'error');
                reject(data.error);
            }
        })
        .catch(error => {
            isUploading = false;
            console.error('Upload error:', error);
            showToast('❌ Upload failed', 'error');
            reject(error);
        });
    });
}

// ============================================
// GROUP CHAT SETTINGS
// ============================================
async function changeGCPFP() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const imageUrl = await uploadImageToIMGBB(file);
            await db.collection('groupChats').doc(GROUP_CHAT_ID).update({
                photoURL: imageUrl,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('✅ Group photo updated!', 'success');
        } catch (error) {
            console.error('Error updating GC photo:', error);
            showToast('❌ Failed to update group photo', 'error');
        }
    };
    input.click();
}

async function changeProfilePicture() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const imageUrl = await uploadImageToIMGBB(file);
            
            await db.collection('users').doc(currentUser.uid).update({
                photoURL: imageUrl,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await currentUser.updateProfile({
                photoURL: imageUrl
            });
            
            const userPfpEl = document.getElementById('current-user-pfp');
            if (userPfpEl) userPfpEl.src = imageUrl;
            
            showToast('✅ Profile picture updated!', 'success');
        } catch (error) {
            console.error('Error updating profile:', error);
            showToast('❌ Failed to update profile picture', 'error');
        }
    };
    input.click();
}

function listenToGCMembers() {
    if (unsubscribeMembers) unsubscribeMembers();
    
    unsubscribeMembers = db.collection('groupChats')
        .doc(GROUP_CHAT_ID)
        .onSnapshot(async (doc) => {
            if (doc.exists) {
                const members = doc.data().members || [];
                const membersList = document.getElementById('members-list');
                if (!membersList) return;
                
                membersList.innerHTML = '';
                
                for (const memberId of members) {
                    const userDoc = await db.collection('users').doc(memberId).get();
                    if (userDoc.exists) {
                        const user = userDoc.data();
                        const firstLetter = (user.name || 'User').charAt(0).toUpperCase();
                        const fallbackAvatar = `https://ui-avatars.com/api/?name=${firstLetter}&background=4f46e5&color=fff&size=100&bold=true`;
                        const avatarUrl = user.photoURL || fallbackAvatar;
                        
                        const memberDiv = document.createElement('div');
                        memberDiv.className = 'member-item';
                        memberDiv.innerHTML = `
                            <div class="member-avatar">
                                <img src="${escapeHTML(avatarUrl)}" 
                                     alt="${escapeHTML(user.name || 'User')}"
                                     loading="lazy"
                                     onerror="this.onerror=null; this.src='${escapeHTML(fallbackAvatar)}';">
                            </div>
                            <div class="member-info">
                                <div class="member-name">${escapeHTML(user.name || 'User')}</div>
                                <div class="member-role">${memberId === currentUser?.uid ? '👑 You' : '👤 Member'}</div>
                            </div>
                        `;
                        membersList.appendChild(memberDiv);
                    }
                }
            }
        });
}

async function editGCName() {
    const currentName = document.getElementById('display-gc-name')?.textContent || 'World Chat 🌏';
    const newName = prompt('Enter new group name:', currentName);
    if (newName?.trim()) {
        await db.collection('groupChats').doc(GROUP_CHAT_ID).update({
            name: newName.trim()
        });
        showToast('✅ Group name updated!', 'success');
    }
}

async function editGCDesc() {
    const currentDesc = document.getElementById('display-gc-desc')?.textContent || 'Welcome to the group! 👋';
    const newDesc = prompt('Enter new group description:', currentDesc);
    if (newDesc?.trim()) {
        await db.collection('groupChats').doc(GROUP_CHAT_ID).update({
            description: newDesc.trim()
        });
        showToast('✅ Description updated!', 'success');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    
    toast.innerHTML = `<i class="fas fa-${icon}"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatMessageText(text) {
    if (!text) return '';
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    text = text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="message-link">$1</a>');
    text = text.replace(/\n/g, '<br>');
    
    const emojiMap = {
        ':)': '😊', ':(': '😢', ':D': '😃', ';)': '😉',
        '<3': '❤️', 'lol': '😂', 'omg': '😱', ':p': '😋'
    };
    
    Object.keys(emojiMap).forEach(key => {
        const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        text = text.replace(regex, emojiMap[key]);
    });
    
    return text;
}

function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setupEnterKeyListeners() {
    const gcInput = document.getElementById('gc-message-input');
    if (gcInput) {
        gcInput.removeEventListener('keypress', handleGCEnterKey);
        gcInput.addEventListener('keypress', handleGCEnterKey);
    }
    
    const pmInput = document.getElementById('pm-message-input');
    if (pmInput) {
        pmInput.removeEventListener('keypress', handlePMEnterKey);
        pmInput.addEventListener('keypress', handlePMEnterKey);
    }
}

function handleGCEnterKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendGCMessage();
    }
}

function handlePMEnterKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendPM();
    }
}

function switchTab(tab) {
    const gcTab = document.getElementById('gc-tab');
    const pmTab = document.getElementById('pm-tab');
    const gcView = document.getElementById('gc-view');
    const pmView = document.getElementById('pm-view');
    
    if (gcTab) gcTab.classList.toggle('active', tab === 'gc');
    if (pmTab) pmTab.classList.toggle('active', tab === 'pm');
    if (gcView) gcView.classList.toggle('active', tab === 'gc');
    if (pmView) pmView.classList.toggle('active', tab === 'pm');

    if (tab === 'gc') resetGCNotifications();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('active');
}

function showGCInfo() {
    const modal = document.getElementById('gc-info-modal');
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

function setupPresence() {
    window.addEventListener('beforeunload', () => {
        if (currentUser) {
            db.collection('users').doc(currentUser.uid).update({
                online: false,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    });
}

async function logout() {
    try {
        if (currentUser) {
            await db.collection('users').doc(currentUser.uid).update({
                online: false,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        await firebase.auth().signOut();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = 'login.html';
    }
}

// ============================================
// SEND GROUP CHAT MESSAGE
// ============================================
async function sendGCMessage() {
    const input = document.getElementById('gc-message-input');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) {
        showToast('Please type a message', 'error');
        return;
    }
    
    if (!currentUser) {
        showToast('You are not logged in', 'error');
        return;
    }

    input.disabled = true;
    const sendBtn = document.querySelector('#gc-view .send-btn');
    if (sendBtn) {
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        sendBtn.disabled = true;
    }

    input.value = '';
    
    try {
        const gcRef = db.collection('groupChats').doc(GROUP_CHAT_ID);
        
        await gcRef.collection('messages').add({
            text: text,
            senderId: currentUser.uid,
            senderName: currentUser.displayName || currentUser.email.split('@')[0] || 'User',
            senderPhoto: currentUser.photoURL || '',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
    } catch (error) {
        console.error('❌ Error sending message:', error);
        showToast('Failed to send message', 'error');
        input.value = text;
    } finally {
        input.disabled = false;
        input.focus();
        if (sendBtn) {
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            sendBtn.disabled = false;
        }
    }
}

// ============================================
// INITIALIZE SEARCH LISTENER
// ============================================
setTimeout(() => {
    setupSearchListener();
    setupTypingListener();
}, 2000);

// ============================================
// TEST FUNCTION
// ============================================
async function testMessenger() {
    console.log('🔍 TESTING MINI MESSENGER...');
    console.log('User:', currentUser?.email);
    console.log('Firebase:', !!db);
    console.log('IMGBB Key:', IMGBB_API_KEY ? '✅' : '❌');
    
    try {
        await db.collection('test').doc('test').set({ test: Date.now() });
        console.log('✅ Firestore write OK');
        const testDoc = await db.collection('test').doc('test').get();
        console.log('✅ Firestore read OK');
        showToast('✅ Messenger is working!', 'success');
    } catch (error) {
        console.error('❌ Firestore error:', error);
        showToast('❌ Connection error', 'error');
    }
}

setTimeout(testMessenger, 3000);
