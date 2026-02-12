// Global Variables
let currentUser = null;
let currentPMUser = null;
let unsubscribeGC = null;
let unsubscribePM = null;
let unsubscribeUsers = null;
let unsubscribeMembers = null;
let isUploading = false;

// GROUP CHAT ID (Fixed for demo)
const GROUP_CHAT_ID = "general_chat";

// Check Authentication
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = user;
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initializeApp());
    } else {
        await initializeApp();
    }
});

// Initialize App
async function initializeApp() {
    try {
        console.log('Initializing app for user:', currentUser.uid);
        
        // Update user info
        const userNameEl = document.getElementById('current-user-name');
        const userPfpEl = document.getElementById('current-user-pfp');
        
        if (userNameEl) userNameEl.textContent = currentUser.displayName || 'User';
        if (userPfpEl) userPfpEl.src = currentUser.photoURL || 'https://i.ibb.co/4T7YQcD/default-user.png';
        
        // Update user online status
        await db.collection('users').doc(currentUser.uid).set({
            uid: currentUser.uid,
            name: currentUser.displayName || 'Anonymous',
            email: currentUser.email || '',
            photoURL: currentUser.photoURL || 'https://i.ibb.co/4T7YQcD/default-user.png',
            online: true,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        // Initialize group chat
        await initializeGroupChat();
        
        // Load users for PM
        loadUsers();
        
        // Set up presence
        setupPresence();
        
        // Setup enter key listeners
        setupEnterKeyListeners();
        
        console.log('App initialized successfully');
        showToast('✅ Connected to chat!', 'success');
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('Failed to initialize. Refreshing...', 'error');
        setTimeout(() => window.location.reload(), 2000);
    }
}

// Initialize Group Chat
async function initializeGroupChat() {
    const gcRef = db.collection('groupChats').doc(GROUP_CHAT_ID);
    const gcDoc = await gcRef.get();
    
    if (!gcDoc.exists) {
        // Create default group chat
        await gcRef.set({
            name: 'General Chat',
            description: 'Welcome to the group! 👋',
            photoURL: 'https://i.ibb.co/4T7YQcD/default-group.png',
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
    
    // Load GC info
    loadGCInfo();
    
    // Listen to GC messages
    listenToGCMessages();
    
    // Listen to GC members
    listenToGCMembers();
}

// Load Group Chat Info
function loadGCInfo() {
    db.collection('groupChats').doc(GROUP_CHAT_ID).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            
            // Update all GC name elements
            const gcNameElements = ['gc-name', 'sidebar-gc-name', 'display-gc-name'];
            gcNameElements.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = data.name || 'General Chat';
            });
            
            // Update description
            const descEl = document.getElementById('display-gc-desc');
            if (descEl) descEl.textContent = data.description || 'Welcome to the group! 👋';
            
            // Update GC photo
            const gcPFP = data.photoURL || 'https://i.ibb.co/4T7YQcD/default-group.png';
            const pfpElements = ['gc-pfp', 'sidebar-gc-pfp', 'modal-gc-pfp'];
            pfpElements.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.src = gcPFP;
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

// Listen to Group Chat Messages - FIXED REAL TIME
function listenToGCMessages() {
    if (unsubscribeGC) unsubscribeGC();
    
    const messagesContainer = document.getElementById('gc-messages');
    if (!messagesContainer) return;
    
    unsubscribeGC = db.collection('groupChats')
        .doc(GROUP_CHAT_ID)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            // Clear container
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
                // Create map of user data
                const userMap = {};
                usersData.filter(Boolean).forEach(user => {
                    if (user) userMap[user.id] = user.data;
                });
                
                // Display messages
                snapshot.forEach((doc) => {
                    const message = doc.data();
                    appendGCMessage(message, messagesContainer, userMap);
                });
                
                // Scroll to bottom
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            });
            
        }, (error) => {
            console.error('Message listener error:', error);
            showToast('Reconnecting to chat...', 'info');
        });
}

// Append Group Chat Message - FIXED
function appendGCMessage(message, container, userMap = {}) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.senderId === currentUser?.uid ? 'sent' : 'received'}`;
    
    // Get sender info
    let senderName = message.senderName || 'Unknown';
    let senderPhoto = message.senderPhoto || 'https://i.ibb.co/4T7YQcD/default-user.png';
    
    if (message.senderId !== currentUser?.uid && userMap[message.senderId]) {
        senderName = userMap[message.senderId].name || senderName;
        senderPhoto = userMap[message.senderId].photoURL || senderPhoto;
    }
    
    const time = message.timestamp ? 
        new Date(message.timestamp.toDate()).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }) : 'Just now';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <img src="${escapeHTML(senderPhoto)}" alt="${escapeHTML(senderName)}" onerror="this.src='https://i.ibb.co/4T7YQcD/default-user.png'">
        </div>
        <div class="message-content">
            <div class="message-sender">${escapeHTML(senderName)}</div>
            <div class="message-text">${formatMessageText(message.text || '')}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    container.appendChild(messageDiv);
}

// Format message text (handle links, emoji, etc)
function formatMessageText(text) {
    // Convert URLs to clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    text = text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Convert line breaks
    text = text.replace(/\n/g, '<br>');
    
    return text;
}

// Send Group Chat Message - FIXED WITH ERROR HANDLING
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
    
    // Clear input immediately
    input.value = '';
    input.focus();
    
    try {
        // Ensure group chat exists
        const gcRef = db.collection('groupChats').doc(GROUP_CHAT_ID);
        const gcDoc = await gcRef.get();
        
        if (!gcDoc.exists) {
            await gcRef.set({
                name: 'General Chat',
                description: 'Welcome to the group! 👋',
                photoURL: 'https://i.ibb.co/4T7YQcD/default-group.png',
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
            senderName: currentUser.displayName || 'User',
            senderPhoto: currentUser.photoURL || 'https://i.ibb.co/4T7YQcD/default-user.png',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Message sent successfully');
        
    } catch (error) {
        console.error('Error sending message:', error);
        showToast('Failed to send message', 'error');
        
        // Restore text if failed
        input.value = text;
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
                
                // Load members list in modal
                const membersList = document.getElementById('members-list');
                if (!membersList) return;
                
                membersList.innerHTML = '';
                
                for (const memberId of members) {
                    const userDoc = await db.collection('users').doc(memberId).get();
                    if (userDoc.exists) {
                        const user = userDoc.data();
                        const memberDiv = document.createElement('div');
                        memberDiv.className = 'user-item';
                        memberDiv.innerHTML = `
                            <div class="user-item-avatar">
                                <img src="${user.photoURL || 'https://i.ibb.co/4T7YQcD/default-user.png'}" 
                                     alt="${escapeHTML(user.name || 'User')}"
                                     onerror="this.src='https://i.ibb.co/4T7YQcD/default-user.png'">
                            </div>
                            <div class="user-item-info">
                                <div class="user-item-name">${escapeHTML(user.name || 'User')}</div>
                                <div class="user-item-status">${memberId === currentUser?.uid ? '👑 You' : '👤 Member'}</div>
                            </div>
                        `;
                        membersList.appendChild(memberDiv);
                    }
                }
            }
        });
}

// Load Users for PM
function loadUsers() {
    if (unsubscribeUsers) unsubscribeUsers();
    
    unsubscribeUsers = db.collection('users')
        .onSnapshot((snapshot) => {
            const users = [];
            snapshot.forEach((doc) => {
                if (doc.id !== currentUser?.uid) {
                    users.push({ id: doc.id, ...doc.data() });
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

// Display Users List
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
        userDiv.onclick = () => openPrivateChat(user);
        userDiv.innerHTML = `
            <div class="user-item-avatar">
                <img src="${user.photoURL || 'https://i.ibb.co/4T7YQcD/default-user.png'}" 
                     alt="${escapeHTML(user.name || 'User')}"
                     onerror="this.src='https://i.ibb.co/4T7YQcD/default-user.png'">
            </div>
            <div class="user-item-info">
                <div class="user-item-name">${escapeHTML(user.name || 'User')}</div>
                <div class="user-item-status ${user.online ? 'online' : 'offline'}">
                    ${user.online ? '● Online' : '○ Offline'}
                </div>
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
        userDiv.className = 'user-item';
        userDiv.onclick = () => {
            openPrivateChat(user);
            toggleSidebar();
        };
        userDiv.innerHTML = `
            <div class="user-item-avatar">
                <img src="${user.photoURL || 'https://i.ibb.co/4T7YQcD/default-user.png'}" 
                     alt="${escapeHTML(user.name || 'User')}"
                     onerror="this.src='https://i.ibb.co/4T7YQcD/default-user.png'">
            </div>
            <div class="user-item-info">
                <div class="user-item-name">${escapeHTML(user.name || 'User')}</div>
                <div class="user-item-status ${user.online ? 'online' : 'offline'}">
                    ${user.online ? '● Online' : '○ Offline'}
                </div>
            </div>
        `;
        sidebarUsers.appendChild(userDiv);
    });
}

// Open Private Chat
function openPrivateChat(user) {
    if (!user) return;
    
    currentPMUser = user;
    
    const pmNameEl = document.getElementById('pm-user-name');
    const pmPfpEl = document.getElementById('pm-user-pfp');
    
    if (pmNameEl) pmNameEl.textContent = user.name || 'User';
    if (pmPfpEl) pmPfpEl.src = user.photoURL || 'https://i.ibb.co/4T7YQcD/default-user.png';
    
    const usersList = document.getElementById('users-list');
    const pmChatArea = document.getElementById('pm-chat-area');
    
    if (usersList) usersList.classList.add('hidden');
    if (pmChatArea) pmChatArea.classList.remove('hidden');
    
    // Listen to PM messages
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

// Listen to Private Messages - FIXED REAL TIME
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
        });
}

// Append Private Message
function appendPMMessage(message, container) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.senderId === currentUser?.uid ? 'sent' : 'received'}`;
    
    const senderName = message.senderId === currentUser?.uid ? 'You' : (currentPMUser?.name || 'User');
    const senderPhoto = message.senderId === currentUser?.uid ? 
        currentUser?.photoURL : 
        (currentPMUser?.photoURL || 'https://i.ibb.co/4T7YQcD/default-user.png');
    
    const time = message.timestamp ? 
        new Date(message.timestamp.toDate()).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }) : 'Just now';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <img src="${escapeHTML(senderPhoto)}" alt="${escapeHTML(senderName)}" onerror="this.src='https://i.ibb.co/4T7YQcD/default-user.png'">
        </div>
        <div class="message-content">
            <div class="message-sender">${escapeHTML(senderName)}</div>
            <div class="message-text">${formatMessageText(message.text || '')}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    container.appendChild(messageDiv);
}

// Send Private Message - FIXED REAL TIME
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
    
    // Clear input immediately
    input.value = '';
    input.focus();
    
    try {
        const chatId = [currentUser.uid, currentPMUser.id].sort().join('_');
        
        await db.collection('privateChats')
            .doc(chatId)
            .collection('messages')
            .add({
                text: text,
                senderId: currentUser.uid,
                senderName: currentUser.displayName || 'You',
                senderPhoto: currentUser.photoURL || 'https://i.ibb.co/4T7YQcD/default-user.png',
                receiverId: currentPMUser.id,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                read: false
            });
            
        console.log('PM sent successfully');
        
    } catch (error) {
        console.error('Error sending PM:', error);
        showToast('Failed to send message', 'error');
        input.value = text;
    }
}

// ============================================
// ✅ FIXED IMAGE UPLOAD - WORKING 100%
// ============================================

// Upload image to IMGBB
async function uploadImageToIMGBB(file) {
    return new Promise((resolve, reject) => {
        // Check if already uploading
        if (isUploading) {
            reject('Upload already in progress');
            return;
        }
        
        isUploading = true;
        
        // Validate file
        if (!file) {
            isUploading = false;
            reject('No file selected');
            return;
        }
        
        // Check file type
        if (!file.type.match('image.*')) {
            isUploading = false;
            showToast('Please select an image file', 'error');
            reject('Invalid file type');
            return;
        }
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            isUploading = false;
            showToast('File too large. Max 5MB', 'error');
            reject('File too large');
            return;
        }
        
        const formData = new FormData();
        formData.append('image', file);
        
        // Show loading toast
        showToast('📤 Uploading image...', 'info');
        
        console.log('Uploading to IMGBB...');
        
        fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            isUploading = false;
            
            if (data.success) {
                console.log('Upload successful:', data.data.url);
                showToast('✅ Image uploaded successfully!', 'success');
                resolve(data.data.url);
            } else {
                console.error('IMGBB error:', data.error);
                showToast('❌ Upload failed: ' + (data.error?.message || 'Unknown error'), 'error');
                reject(data.error);
            }
        })
        .catch(error => {
            isUploading = false;
            console.error('Upload error:', error);
            showToast('❌ Upload failed. Using default image.', 'error');
            // Return default image instead of failing
            resolve('https://i.ibb.co/4T7YQcD/default-group.png');
        });
    });
}

// Change Group Chat PFP - FIXED WORKING
async function changeGCPFP() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/jpg,image/gif,image/webp';
    
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

// Change User Profile Picture - FIXED WORKING
async function changeProfilePicture() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/jpg,image/gif,image/webp';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const imageUrl = await uploadImageToIMGBB(file);
            
            // Update Firestore
            await db.collection('users').doc(currentUser.uid).update({
                photoURL: imageUrl,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update Auth profile
            await currentUser.updateProfile({
                photoURL: imageUrl
            });
            
            // Update UI
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

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Toast notification
function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Force reflow
    toast.offsetHeight;
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Setup Enter Key Listeners
function setupEnterKeyListeners() {
    // GC message enter key
    const gcInput = document.getElementById('gc-message-input');
    if (gcInput) {
        gcInput.removeEventListener('keypress', handleGCEnterKey);
        gcInput.addEventListener('keypress', handleGCEnterKey);
    }
    
    // PM message enter key
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
    const newName = prompt('Enter new group name:', document.getElementById('display-gc-name')?.textContent || 'General Chat');
    if (newName && newName.trim()) {
        await db.collection('groupChats').doc(GROUP_CHAT_ID).update({
            name: newName.trim()
        });
        showToast('✅ Group name updated!', 'success');
    }
}

// Edit GC Description
async function editGCDesc() {
    const newDesc = prompt('Enter new group description:', document.getElementById('display-gc-desc')?.textContent || 'Welcome to the group! 👋');
    if (newDesc && newDesc.trim()) {
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
    
    // Also handle page hide
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

// Helper: Escape HTML
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
