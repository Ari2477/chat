// ============================================
// MINI MESSENGER - COMPLETE FIXED VERSION
// REAL TIME NOTIFICATION - CROSS DEVICE!
// ============================================

// Global Variables
let currentUser = null;
let currentPMUser = null;
let unsubscribeGC = null;
let unsubscribePM = null;
let unsubscribeUsers = null;
let unsubscribeMembers = null;
let unsubscribeUnreadPMs = null;
let isUploading = false;

// GROUP CHAT ID (Fixed for demo)
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
// INITIALIZATION - FIXED WITH PROPER FALLBACK
// ============================================
async function initializeApp() {
    try {
        console.log('Initializing app for user:', currentUser.uid);
        
        // Get user's first letter for avatar fallback
        const userFirstLetter = (currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase();
        const defaultAvatar = `https://ui-avatars.com/api/?name=${userFirstLetter}&background=4f46e5&color=fff&size=200&bold=true`;
        
        // Update user info with proper fallback
        const userNameEl = document.getElementById('current-user-name');
        const userPfpEl = document.getElementById('current-user-pfp');
        
        if (userNameEl) userNameEl.textContent = currentUser.displayName || currentUser.email.split('@')[0] || 'User';
        
        // Set profile picture with multiple fallbacks
        if (userPfpEl) {
            userPfpEl.src = currentUser.photoURL || defaultAvatar;
            userPfpEl.onerror = function() {
                this.onerror = null;
                this.src = defaultAvatar;
            };
        }
        
        // Save/Update user in Firestore with fallback avatar
        await db.collection('users').doc(currentUser.uid).set({
            uid: currentUser.uid,
            name: currentUser.displayName || currentUser.email.split('@')[0] || 'Anonymous',
            email: currentUser.email || '',
            photoURL: currentUser.photoURL || defaultAvatar,
            online: true,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            lastActive: new Date().toISOString()
        }, { merge: true });
        
        // Initialize group chat
        await initializeGroupChat();
        
        // Load users for PM
        loadUsers();
        
        // ✅ LISTEN TO UNREAD MESSAGES - REAL TIME!
        listenToUnreadPMs();
        
        // Set up presence
        setupPresence();
        
        // Setup enter key listeners
        setupEnterKeyListeners();
        
        console.log('✅ App initialized successfully');
        showToast('✅ Connected to chat!', 'success');
        
    } catch (error) {
        console.error('❌ Error initializing app:', error);
        showToast('Failed to initialize. Refreshing...', 'error');
        setTimeout(() => window.location.reload(), 2000);
    }
}

// ============================================
// GROUP CHAT - FIXED WITH PROPER IMAGE HANDLING
// ============================================
async function initializeGroupChat() {
    const gcRef = db.collection('groupChats').doc(GROUP_CHAT_ID);
    const gcDoc = await gcRef.get();
    
    if (!gcDoc.exists) {
        // Create default group chat with proper avatar
        await gcRef.set({
            name: 'World Chat 🌏',
            description: 'Welcome to the group! 👋',
            photoURL: 'https://i.ibb.co/qYky078V/Screenshot-20260212-134936-1.jpg',
            createdBy: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            members: [currentUser.uid],
            memberCount: 1
        });
    } else {
        // Add current user to members if not already
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
}

// Load Group Chat Info - WITH FALLBACK
function loadGCInfo() {
    db.collection('groupChats').doc(GROUP_CHAT_ID).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            
            // Update all GC name elements
            const gcNameElements = ['gc-name', 'sidebar-gc-name', 'display-gc-name'];
            gcNameElements.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = data.name || 'World Chat 🌏';
            });
            
            // Update description
            const descEl = document.getElementById('display-gc-desc');
            if (descEl) descEl.textContent = data.description || 'Welcome to the group! 👋';
            
            // Update GC photo with fallback
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
            
            // Update member count
            const memberCount = data.members?.length || 0;
            const countElements = ['member-count', 'sidebar-member-count'];
            countElements.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = `${memberCount} members`;
            });
        }
    });
}

// Listen to Group Chat Messages - REAL TIME
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
            
            // Get all unique sender IDs
            const senderIds = new Set();
            snapshot.forEach(doc => {
                senderIds.add(doc.data().senderId);
            });
            
            // Load all sender data in parallel
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
                    appendGCMessage(message, messagesContainer, userMap);
                });
                
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            });
            
        }, (error) => {
            console.error('Message listener error:', error);
            showToast('Reconnecting to chat...', 'info');
        });
}

// Append Group Chat Message - WALANG "M" NA BROKEN IMAGE
function appendGCMessage(message, container, userMap = {}) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.senderId === currentUser?.uid ? 'sent' : 'received'}`;
    
    // Get sender info
    let senderName = message.senderName || 'Unknown';
    let senderPhoto = message.senderPhoto || '';
    let senderId = message.senderId;
    
    // Get proper sender info
    if (message.senderId !== currentUser?.uid && userMap[message.senderId]) {
        senderName = userMap[message.senderId].name || senderName;
        senderPhoto = userMap[message.senderId].photoURL || senderPhoto;
        senderId = message.senderId;
    }
    
    // Create fallback avatar using UI Avatars
    const firstLetter = senderName.charAt(0).toUpperCase();
    const fallbackAvatar = `https://ui-avatars.com/api/?name=${firstLetter}&background=${message.senderId === currentUser?.uid ? '4f46e5' : '64748b'}&color=fff&size=100&bold=true`;
    
    // Use sender photo or fallback
    const avatarUrl = senderPhoto || fallbackAvatar;
    
    const time = message.timestamp ? 
        new Date(message.timestamp.toDate()).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }) : 'Just now';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <img src="${escapeHTML(avatarUrl)}" 
                 alt="${escapeHTML(senderName)}" 
                 loading="lazy"
                 onerror="this.onerror=null; this.src='${escapeHTML(fallbackAvatar)}';">
        </div>
        <div class="message-content">
            <div class="message-sender">${escapeHTML(message.senderId === currentUser?.uid ? 'You' : senderName)}</div>
            <div class="message-text">${formatMessageText(message.text || '')}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    container.appendChild(messageDiv);
}

// Format message text
function formatMessageText(text) {
    if (!text) return '';
    
    // Convert URLs to clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    text = text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="message-link">$1</a>');
    
    // Convert line breaks
    text = text.replace(/\n/g, '<br>');
    
    // Convert emoji shortcuts
    const emojiMap = {
        ':)': '😊',
        ':(': '😢',
        ':D': '😃',
        ';)': '😉',
        '<3': '❤️',
        'lol': '😂',
        'omg': '😱',
        ':p': '😋',
        ':P': '😋'
    };
    
    Object.keys(emojiMap).forEach(key => {
        const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        text = text.replace(regex, emojiMap[key]);
    });
    
    return text;
}

// Send Group Chat Message - WITH LOADING STATE
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
    
    // Disable input
    input.disabled = true;
    const sendBtn = document.querySelector('#gc-view .send-btn');
    if (sendBtn) {
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        sendBtn.disabled = true;
    }
    
    // Clear input
    input.value = '';
    
    try {
        // Ensure group chat exists
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
                memberCount: 1
            });
        }
        
        // Send message
        await gcRef.collection('messages').add({
            text: text,
            senderId: currentUser.uid,
            senderName: currentUser.displayName || currentUser.email.split('@')[0] || 'User',
            senderPhoto: currentUser.photoURL || '',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Message sent successfully');
        
    } catch (error) {
        console.error('❌ Error sending message:', error);
        showToast('Failed to send message', 'error');
        
        // Restore text if failed
        input.value = text;
    } finally {
        // Re-enable input
        input.disabled = false;
        input.focus();
        if (sendBtn) {
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            sendBtn.disabled = false;
        }
    }
}

// Listen to Group Chat Members
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

// ============================================
// USERS & PRIVATE MESSAGES - FIXED
// ============================================

// Load Users for PM
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
            
            // Sort: online first, then alphabetically
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

// Display Users List - WALANG BROKEN IMAGE
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
        
        // Create fallback avatar
        const firstLetter = (user.name || 'User').charAt(0).toUpperCase();
        const fallbackAvatar = `https://ui-avatars.com/api/?name=${firstLetter}&background=4f46e5&color=fff&size=100&bold=true`;
        const avatarUrl = user.photoURL || fallbackAvatar;
        
        const statusClass = user.online ? 'online' : 'offline';
        const statusText = user.online ? '● Online' : '○ Offline';
        
        userDiv.innerHTML = `
            <div class="user-item-avatar">
                <img src="${escapeHTML(avatarUrl)}" 
                     alt="${escapeHTML(user.name || 'User')}"
                     loading="lazy"
                     onerror="this.onerror=null; this.src='${escapeHTML(fallbackAvatar)}';">
                <span class="status-indicator ${statusClass}"></span>
                <!-- BADGE WILL BE ADDED VIA JAVASCRIPT -->
            </div>
            <div class="user-item-info">
                <div class="user-item-name">${escapeHTML(user.name || 'User')}</div>
                <div class="user-item-status ${statusClass}">${statusText}</div>
            </div>
        `;
        
        usersList.appendChild(userDiv);
    });
}

// Display Sidebar Users
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
        const statusText = user.online ? '● Online' : '○ Offline';
        
        userDiv.innerHTML = `
            <div class="user-item-avatar">
                <img src="${escapeHTML(avatarUrl)}" 
                     alt="${escapeHTML(user.name || 'User')}"
                     loading="lazy"
                     onerror="this.onerror=null; this.src='${escapeHTML(fallbackAvatar)}';">
                <span class="status-indicator ${statusClass}"></span>
                <!-- BADGE WILL BE ADDED VIA JAVASCRIPT -->
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
// 🔔 FIXED: REAL TIME UNREAD MESSAGES - CROSS DEVICE!
// ============================================
function listenToUnreadPMs() {
    if (!currentUser) {
        console.log('❌ No current user');
        return;
    }
    
    console.log('🔔 REAL TIME Listening to unread messages for:', currentUser.uid);
    
    if (unsubscribeUnreadPMs) {
        unsubscribeUnreadPMs();
    }
    
    // ✅ REAL TIME - FIRESTORE LISTENER PARA SA LAHAT NG DEVICE!
    unsubscribeUnreadPMs = db.collectionGroup('messages')
        .where('receiverId', '==', currentUser.uid)
        .where('read', '==', false)
        .onSnapshot((snapshot) => {
            console.log(`📨 REAL TIME: ${snapshot.size} unread messages`);
            
            const unreadMap = new Map();
            
            snapshot.forEach(doc => {
                const msg = doc.data();
                const senderId = msg.senderId;
                unreadMap.set(senderId, (unreadMap.get(senderId) || 0) + 1);
                console.log(`📩 Unread from ${senderId}: ${unreadMap.get(senderId)}`);
            });
            
            // ✅ REMOVE LAHAT NG OLD BADGES
            document.querySelectorAll('.user-item-avatar .unread-badge').forEach(badge => {
                badge.remove();
            });
            
            // ✅ UPDATE BADGES - REAL TIME SA LAHAT NG DEVICE!
            if (unreadMap.size === 0) {
                document.title = 'Mini Messenger';
            } else {
                unreadMap.forEach((count, senderId) => {
                    updateUserUnreadBadge(senderId, count);
                });
                
                const totalUnread = Array.from(unreadMap.values()).reduce((a, b) => a + b, 0);
                document.title = `(${totalUnread}) Mini Messenger`;
            }
        }, (error) => {
            console.error('❌ REAL TIME Error:', error);
        });
}

// ============================================
// ✅ FIXED: UPDATE UNREAD BADGE - REAL TIME!
// ============================================
function updateUserUnreadBadge(userId, count) {
    const userItems = document.querySelectorAll(`.user-item[data-user-id="${userId}"]`);
    
    userItems.forEach(item => {
        const avatarContainer = item.querySelector('.user-item-avatar');
        if (!avatarContainer) return;
        
        // ✅ REMOVE EXISTING BADGE
        const existingBadge = avatarContainer.querySelector('.unread-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // ✅ ADD NEW BADGE KUNG MAY UNREAD
        if (count > 0) {
            const badge = document.createElement('span');
            badge.className = 'unread-badge';
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
            badge.style.position = 'absolute';
            badge.style.top = '-6px';
            badge.style.right = '-6px';
            badge.style.minWidth = '22px';
            badge.style.height = '22px';
            badge.style.background = '#ef4444';
            badge.style.color = 'white';
            badge.style.borderRadius = '22px';
            badge.style.padding = '0 6px';
            badge.style.fontSize = '12px';
            badge.style.fontWeight = '700';
            badge.style.border = '2px solid white';
            badge.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.5)';
            badge.style.zIndex = '999';
            badge.style.animation = 'pulse 2s infinite';
            
            avatarContainer.appendChild(badge);
            console.log(`✅ Badge added for ${userId}: ${count}`);
        }
    });
}

// ============================================
// ✅ FIXED: MARK AS READ - REAL TIME SA LAHAT NG DEVICE!
// ============================================
async function markMessagesAsRead(senderId) {
    if (!currentUser || !senderId) {
        console.log('❌ No current user or senderId');
        return;
    }
    
    const chatId = [currentUser.uid, senderId].sort().join('_');
    console.log(`📖 Marking messages as read for chat: ${chatId}`);
    
    try {
        // ✅ GET ALL UNREAD MESSAGES
        const messagesRef = db.collection('privateChats')
            .doc(chatId)
            .collection('messages')
            .where('receiverId', '==', currentUser.uid)
            .where('read', '==', false);
        
        const snapshot = await messagesRef.get();
        
        if (snapshot.size > 0) {
            console.log(`📖 Found ${snapshot.size} unread messages`);
            
            // ✅ BATCH UPDATE PARA MAS MABILIS!
            const batch = db.batch();
            snapshot.forEach(doc => {
                batch.update(doc.ref, { 
                    read: true,
                    readAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            
            await batch.commit();
            console.log(`✅ REAL TIME: Marked ${snapshot.size} messages as read`);
            
            // ✅ REMOVE BADGE AGAD - LAHAT NG DEVICE!
            updateUserUnreadBadge(senderId, 0);
            
            // ✅ FORCE UPDATE NG UNREAD COUNT - PARA SURE!
            const unreadSnapshot = await db.collectionGroup('messages')
                .where('receiverId', '==', currentUser.uid)
                .where('read', '==', false)
                .get();
            
            console.log(`📨 Remaining unread: ${unreadSnapshot.size}`);
            
            if (unreadSnapshot.size === 0) {
                document.title = 'Mini Messenger';
            } else {
                document.title = `(${unreadSnapshot.size}) Mini Messenger`;
            }
        } else {
            console.log('✅ No unread messages found');
        }
        
    } catch (error) {
        console.error('❌ Error marking messages as read:', error);
    }
}

// ============================================
// RESET NOTIFICATIONS
// ============================================
function resetPMNotifications(senderId) {
    updateUserUnreadBadge(senderId, 0);
    
    // Update document title
    const totalUnread = getTotalUnreadCount();
    document.title = totalUnread > 0 ? `(${totalUnread}) Mini Messenger` : 'Mini Messenger';
}

function resetGCNotifications() {
    // Update document title
    const totalUnread = getTotalUnreadCount();
    document.title = totalUnread > 0 ? `(${totalUnread}) Mini Messenger` : 'Mini Messenger';
}

function getTotalUnreadCount() {
    let total = 0;
    const badges = document.querySelectorAll('.user-item-avatar .unread-badge');
    badges.forEach(badge => {
        if (badge.style.display !== 'none') {
            const count = badge.textContent;
            if (count === '99+') {
                total += 99;
            } else {
                total += parseInt(count) || 0;
            }
        }
    });
    return total;
}

// ============================================
// OPEN PRIVATE CHAT
// ============================================
async function openPrivateChat(user) {
    if (!user) return;
    
    currentPMUser = user;
    
    // Mark messages as read when opening chat
    await markMessagesAsRead(user.id);
    
    // Reset PM notifications for this user
    resetPMNotifications(user.id);
    
    const pmNameEl = document.getElementById('pm-user-name');
    const pmPfpEl = document.getElementById('pm-user-pfp');
    
    if (pmNameEl) pmNameEl.textContent = user.name || 'User';
    
    // Set PM user avatar with fallback
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
}

// Close Private Chat
function closePM() {
    currentPMUser = null;
    
    const usersList = document.getElementById('users-list');
    const pmChatArea = document.getElementById('pm-chat-area');
    
    if (usersList) usersList.classList.remove('hidden');
    if (pmChatArea) pmChatArea.classList.add('hidden');
    
    if (unsubscribePM) unsubscribePM();
}

// Listen to Private Messages
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
                appendPMMessage(message, messagesContainer);
            });
            
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            if (currentPMUser?.id === otherUserId) {
                markMessagesAsRead(otherUserId);
            }
        });
}

// Append Private Message - WALANG BROKEN IMAGE
function appendPMMessage(message, container) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.senderId === currentUser?.uid ? 'sent' : 'received'}`;
    
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
    
    let readStatus = '';
    if (isSentByMe) {
        readStatus = message.read 
            ? '<span class="status-read"><i class="fas fa-check-double"></i></span>' 
            : '<span class="status-sent"><i class="fas fa-check"></i></span>';
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
            <div class="message-text">${formatMessageText(message.text || '')}</div>
            <div class="message-time">
                ${time}
                ${readStatus}
            </div>
        </div>
    `;
    
    container.appendChild(messageDiv);
}

// ============================================
// ✅ FIXED: SEND PRIVATE MESSAGE - REAL TIME!
// ============================================
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
        
        // ✅ ENSURE NA MAY read: false PARA MA-TRIGGER ANG NOTIFICATION SA KABILANG DEVICE!
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
                read: false // ✅ IMPORTANT: PARA LUMABAS SA KABILANG DEVICE!
            });
            
        console.log('✅ PM sent successfully - REAL TIME!');
        
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

// ============================================
// IMAGE UPLOAD - FIXED
// ============================================

// Upload image to IMGBB
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
        
        showToast('📤 Uploading image...', 'info');
        
        fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            isUploading = false;
            
            if (data.success) {
                showToast('✅ Image uploaded successfully!', 'success');
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

// Change Group Chat PFP
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

// Change User Profile Picture
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
            if (userPfpEl) {
                userPfpEl.src = imageUrl;
            }
            
            showToast('✅ Profile picture updated!', 'success');
            
        } catch (error) {
            console.error('Error updating profile:', error);
            showToast('❌ Failed to update profile picture', 'error');
        }
    };
    
    input.click();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Toast notification
function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    toast.innerHTML = `<i class="fas fa-${icon}"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Setup Enter Key Listeners
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

// Switch Tab
function switchTab(tab) {
    const gcTab = document.getElementById('gc-tab');
    const pmTab = document.getElementById('pm-tab');
    const gcView = document.getElementById('gc-view');
    const pmView = document.getElementById('pm-view');
    
    if (gcTab) gcTab.classList.toggle('active', tab === 'gc');
    if (pmTab) pmTab.classList.toggle('active', tab === 'pm');
    if (gcView) gcView.classList.toggle('active', tab === 'gc');
    if (pmView) pmView.classList.toggle('active', tab === 'pm');
    
    // Reset GC notifications when opening group chat
    if (tab === 'gc') {
        resetGCNotifications();
    }
}

// Toggle Sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('active');
}

// Show GC Info Modal
function showGCInfo() {
    const modal = document.getElementById('gc-info-modal');
    if (modal) modal.classList.add('active');
}

// Close Modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// Edit GC Name
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

// Edit GC Description
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

// Setup Presence
function setupPresence() {
    window.addEventListener('beforeunload', () => {
        if (currentUser) {
            db.collection('users').doc(currentUser.uid).update({
                online: false,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    });
    
    window.addEventListener('pagehide', () => {
        if (currentUser) {
            db.collection('users').doc(currentUser.uid).update({
                online: false,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    });
}

// Logout
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

// Escape HTML
function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Test Function
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

// Auto test on load
setTimeout(testMessenger, 3000);
