// Global Variables
let currentUser = null;
let currentPMUser = null;
let unsubscribeGC = null;
let unsubscribePM = null;
let unsubscribeUsers = null;
let unsubscribeMembers = null;

// GROUP CHAT ID (Fixed for demo)
const GROUP_CHAT_ID = "general_chat";

// Check Authentication
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = user;
    await initializeApp();
});

// Initialize App
async function initializeApp() {
    // Update user info
    document.getElementById('current-user-name').textContent = currentUser.displayName;
    document.getElementById('current-user-pfp').src = currentUser.photoURL || 'https://i.ibb.co/4T7YQcD/default-user.png';
    
    // Update user online status
    await db.collection('users').doc(currentUser.uid).update({
        online: true,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Initialize group chat
    await initializeGroupChat();
    
    // Load users for PM
    loadUsers();
    
    // Set up presence
    setupPresence();
}

// Initialize Group Chat
async function initializeGroupChat() {
    const gcRef = db.collection('groupChats').doc(GROUP_CHAT_ID);
    const gcDoc = await gcRef.get();
    
    if (!gcDoc.exists) {
        // Create default group chat
        await gcRef.set({
            name: 'General Chat',
            description: 'Welcome to the group!',
            photoURL: 'https://i.ibb.co/4T7YQcD/default-group.png',
            createdBy: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            members: [currentUser.uid]
        });
    } else {
        // Add current user to members if not already
        const members = gcDoc.data().members || [];
        if (!members.includes(currentUser.uid)) {
            await gcRef.update({
                members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
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
            document.getElementById('gc-name').textContent = data.name || 'General Chat';
            document.getElementById('sidebar-gc-name').textContent = data.name || 'General Chat';
            document.getElementById('display-gc-name').textContent = data.name || 'General Chat';
            document.getElementById('display-gc-desc').textContent = data.description || 'Welcome to the group!';
            
            const gcPFP = data.photoURL || 'https://i.ibb.co/4T7YQcD/default-group.png';
            document.getElementById('gc-pfp').src = gcPFP;
            document.getElementById('sidebar-gc-pfp').src = gcPFP;
            document.getElementById('modal-gc-pfp').src = gcPFP;
            
            document.getElementById('member-count').textContent = `${data.members?.length || 0} members`;
            document.getElementById('sidebar-member-count').textContent = `${data.members?.length || 0} members`;
        }
    });
}

// Listen to Group Chat Messages
function listenToGCMessages() {
    if (unsubscribeGC) unsubscribeGC();
    
    unsubscribeGC = db.collection('groupChats')
        .doc(GROUP_CHAT_ID)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            const messagesContainer = document.getElementById('gc-messages');
            messagesContainer.innerHTML = '';
            
            snapshot.forEach((doc) => {
                const message = doc.data();
                appendGCMessage(message, messagesContainer);
            });
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
}

// Append Group Chat Message
async function appendGCMessage(message, container) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;
    
    // Get sender info
    let senderName = message.senderName || 'Unknown';
    let senderPhoto = message.senderPhoto || 'https://i.ibb.co/4T7YQcD/default-user.png';
    
    if (message.senderId !== currentUser.uid) {
        const userDoc = await db.collection('users').doc(message.senderId).get();
        if (userDoc.exists) {
            senderName = userDoc.data().name || senderName;
            senderPhoto = userDoc.data().photoURL || senderPhoto;
        }
    }
    
    const time = message.timestamp ? new Date(message.timestamp.toDate()).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }) : '';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <img src="${senderPhoto}" alt="${senderName}">
        </div>
        <div class="message-content">
            <div class="message-sender">${senderName}</div>
            <div class="message-text">${escapeHTML(message.text || '')}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    container.appendChild(messageDiv);
}

// Send Group Chat Message
async function sendGCMessage() {
    const input = document.getElementById('gc-message-input');
    const text = input.value.trim();
    
    if (!text) return;
    
    input.value = '';
    
    await db.collection('groupChats').doc(GROUP_CHAT_ID)
        .collection('messages')
        .add({
            text: text,
            senderId: currentUser.uid,
            senderName: currentUser.displayName,
            senderPhoto: currentUser.photoURL,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
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
                membersList.innerHTML = '';
                
                for (const memberId of members) {
                    const userDoc = await db.collection('users').doc(memberId).get();
                    if (userDoc.exists) {
                        const user = userDoc.data();
                        const memberDiv = document.createElement('div');
                        memberDiv.className = 'user-item';
                        memberDiv.innerHTML = `
                            <div class="user-item-avatar">
                                <img src="${user.photoURL || 'https://i.ibb.co/4T7YQcD/default-user.png'}" alt="${user.name}">
                            </div>
                            <div class="user-item-info">
                                <div class="user-item-name">${user.name}</div>
                                <div class="user-item-status">${memberId === currentUser.uid ? 'You' : 'Member'}</div>
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
                if (doc.id !== currentUser.uid) {
                    users.push({ id: doc.id, ...doc.data() });
                }
            });
            
            displayUsers(users);
            displaySidebarUsers(users);
            document.getElementById('online-count').textContent = users.length;
        });
}

// Display Users List
function displayUsers(users) {
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = '';
    
    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';
        userDiv.onclick = () => openPrivateChat(user);
        userDiv.innerHTML = `
            <div class="user-item-avatar">
                <img src="${user.photoURL || 'https://i.ibb.co/4T7YQcD/default-user.png'}" alt="${user.name}">
            </div>
            <div class="user-item-info">
                <div class="user-item-name">${user.name}</div>
                <div class="user-item-status">${user.online ? '● Online' : '○ Offline'}</div>
            </div>
        `;
        usersList.appendChild(userDiv);
    });
}

// Display Sidebar Users
function displaySidebarUsers(users) {
    const sidebarUsers = document.getElementById('sidebar-users-list');
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
                <img src="${user.photoURL || 'https://i.ibb.co/4T7YQcD/default-user.png'}" alt="${user.name}">
            </div>
            <div class="user-item-info">
                <div class="user-item-name">${user.name}</div>
                <div class="user-item-status">${user.online ? '● Online' : '○ Offline'}</div>
            </div>
        `;
        sidebarUsers.appendChild(userDiv);
    });
}

// Open Private Chat
async function openPrivateChat(user) {
    currentPMUser = user;
    
    document.getElementById('pm-user-name').textContent = user.name;
    document.getElementById('pm-user-pfp').src = user.photoURL || 'https://i.ibb.co/4T7YQcD/default-user.png';
    
    document.getElementById('users-list').classList.add('hidden');
    document.getElementById('pm-chat-area').classList.remove('hidden');
    
    // Listen to PM messages
    listenToPMMessages(user.id);
}

// Close Private Chat
function closePM() {
    currentPMUser = null;
    document.getElementById('users-list').classList.remove('hidden');
    document.getElementById('pm-chat-area').classList.add('hidden');
    
    if (unsubscribePM) unsubscribePM();
}

// Listen to Private Messages
function listenToPMMessages(otherUserId) {
    if (unsubscribePM) unsubscribePM();
    
    const chatId = [currentUser.uid, otherUserId].sort().join('_');
    
    unsubscribePM = db.collection('privateChats')
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            const messagesContainer = document.getElementById('pm-messages');
            messagesContainer.innerHTML = '';
            
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
    messageDiv.className = `message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;
    
    const senderName = message.senderId === currentUser.uid ? 'You' : (currentPMUser?.name || 'User');
    const senderPhoto = message.senderId === currentUser.uid ? 
        currentUser.photoURL : 
        (currentPMUser?.photoURL || 'https://i.ibb.co/4T7YQcD/default-user.png');
    
    const time = message.timestamp ? new Date(message.timestamp.toDate()).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }) : '';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <img src="${senderPhoto}" alt="${senderName}">
        </div>
        <div class="message-content">
            <div class="message-sender">${senderName}</div>
            <div class="message-text">${escapeHTML(message.text || '')}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    container.appendChild(messageDiv);
}

// Send Private Message
async function sendPM() {
    if (!currentPMUser) return;
    
    const input = document.getElementById('pm-message-input');
    const text = input.value.trim();
    
    if (!text) return;
    
    input.value = '';
    
    const chatId = [currentUser.uid, currentPMUser.id].sort().join('_');
    
    await db.collection('privateChats')
        .doc(chatId)
        .collection('messages')
        .add({
            text: text,
            senderId: currentUser.uid,
            senderName: currentUser.displayName,
            senderPhoto: currentUser.photoURL,
            receiverId: currentPMUser.id,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
}

// Switch Tab (GC or PM)
function switchTab(tab) {
    document.getElementById('gc-tab').classList.toggle('active', tab === 'gc');
    document.getElementById('pm-tab').classList.toggle('active', tab === 'pm');
    document.getElementById('gc-view').classList.toggle('active', tab === 'gc');
    document.getElementById('pm-view').classList.toggle('active', tab === 'pm');
}

// Toggle Sidebar
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// Show GC Info Modal
function showGCInfo() {
    document.getElementById('gc-info-modal').classList.add('active');
}

// Close Modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Edit GC Name
async function editGCName() {
    const newName = prompt('Enter new group name:');
    if (newName && newName.trim()) {
        await db.collection('groupChats').doc(GROUP_CHAT_ID).update({
            name: newName.trim()
        });
    }
}

// Edit GC Description
async function editGCDesc() {
    const newDesc = prompt('Enter new group description:');
    if (newDesc && newDesc.trim()) {
        await db.collection('groupChats').doc(GROUP_CHAT_ID).update({
            description: newDesc.trim()
        });
    }
}

// Change Group Chat PFP
async function changeGCPFP() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('image', file);
        
        try {
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                await db.collection('groupChats').doc(GROUP_CHAT_ID).update({
                    photoURL: data.data.url
                });
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload image');
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
        
        const formData = new FormData();
        formData.append('image', file);
        
        try {
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                await db.collection('users').doc(currentUser.uid).update({
                    photoURL: data.data.url
                });
                
                // Update profile in Firebase Auth (optional)
                currentUser.updateProfile({
                    photoURL: data.data.url
                });
                
                document.getElementById('current-user-pfp').src = data.data.url;
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload image');
        }
    };
    
    input.click();
}

// Setup Presence
function setupPresence() {
    window.addEventListener('beforeunload', () => {
        db.collection('users').doc(currentUser.uid).update({
            online: false,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
    });
}

// Logout
async function logout() {
    await db.collection('users').doc(currentUser.uid).update({
        online: false,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    await firebase.auth().signOut();
    window.location.href = 'login.html';
}

// Helper: Escape HTML
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
