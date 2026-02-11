// Chat functionality for Firebase

// Global variables for current chat
let currentChatId = null;
let currentChatType = null; // 'user' or 'group'
let currentChatName = null;
let currentChatAvatar = null;

// Initialize chat functionality
function initChat() {
    // Load users and groups
    loadUsers();
    loadGroups();
    
    // Set up event listeners
    setupChatListeners();
    
    // Update user online status
    updateUserStatus();
}

// Load all users from Firestore
function loadUsers() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    const usersList = document.getElementById('users-list');
    if (!usersList) return;
    
    // Clear loading message if exists
    usersList.innerHTML = '<div class="list-item">Loading users...</div>';
    
    // Query all users except current user
    db.collection('users')
        .where('uid', '!=', currentUser.uid)
        .orderBy('displayName')
        .onSnapshot(snapshot => {
            usersList.innerHTML = '';
            
            if (snapshot.empty) {
                usersList.innerHTML = '<div class="list-item">No other users found.</div>';
                return;
            }
            
            snapshot.forEach(doc => {
                const user = doc.data();
                createUserListItem(user, usersList);
            });
        }, error => {
            console.error('Error loading users:', error);
            usersList.innerHTML = '<div class="list-item">Error loading users.</div>';
        });
}

// Create a user list item
function createUserListItem(user, container) {
    const userItem = document.createElement('div');
    userItem.className = 'list-item';
    userItem.dataset.userId = user.uid;
    userItem.dataset.type = 'user';
    
    // Format last seen
    let lastSeenText = 'Offline';
    let isOnline = false;
    
    if (user.lastSeen) {
        const lastSeen = user.lastSeen.toDate();
        const now = new Date();
        const diffMs = now - lastSeen;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 5) {
            lastSeenText = 'Online';
            isOnline = true;
        } else if (diffMins < 60) {
            lastSeenText = `${diffMins}m ago`;
        } else if (diffMins < 1440) {
            lastSeenText = `${Math.floor(diffMins / 60)}h ago`;
        } else {
            lastSeenText = lastSeen.toLocaleDateString();
        }
    }
    
    userItem.innerHTML = `
        <img src="${user.photoURL || 'https://ui-avatars.com/api/?background=random&name=User'}" alt="${user.displayName}">
        <div class="list-item-info">
            <h4>${user.displayName || 'Unknown User'}</h4>
            <p>${isOnline ? '<span style="color: #34c759;">● Online</span>' : lastSeenText}</p>
        </div>
        <div class="list-item-time"></div>
    `;
    
    // Add click event to start chat with this user
    userItem.addEventListener('click', () => {
        startChatWithUser(user.uid, user.displayName, user.photoURL);
    });
    
    container.appendChild(userItem);
}

// Load all groups from Firestore
function loadGroups() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    const groupsList = document.getElementById('groups-list');
    if (!groupsList) return;
    
    // Clear loading message if exists
    groupsList.innerHTML = '<div class="list-item">Loading groups...</div>';
    
    // Query groups where current user is a member
    db.collection('groups')
        .where('members', 'array-contains', currentUser.uid)
        .orderBy('lastActivity', 'desc')
        .onSnapshot(snapshot => {
            groupsList.innerHTML = '';
            
            if (snapshot.empty) {
                groupsList.innerHTML = '<div class="list-item">No groups yet. Create one!</div>';
                return;
            }
            
            snapshot.forEach(doc => {
                const group = doc.data();
                group.id = doc.id;
                createGroupListItem(group, groupsList);
            });
        }, error => {
            console.error('Error loading groups:', error);
            groupsList.innerHTML = '<div class="list-item">Error loading groups.</div>';
        });
}

// Create a group list item
function createGroupListItem(group, container) {
    const groupItem = document.createElement('div');
    groupItem.className = 'list-item';
    groupItem.dataset.groupId = group.id;
    groupItem.dataset.type = 'group';
    
    // Format last activity
    let lastActivityText = 'No activity';
    if (group.lastActivity) {
        const lastActivity = group.lastActivity.toDate();
        const now = new Date();
        const diffMs = now - lastActivity;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 60) {
            lastActivityText = `${diffMins}m ago`;
        } else if (diffMins < 1440) {
            lastActivityText = `${Math.floor(diffMins / 60)}h ago`;
        } else {
            lastActivityText = lastActivity.toLocaleDateString();
        }
    }
    
    groupItem.innerHTML = `
        <img src="${group.photoURL || 'https://ui-avatars.com/api/?background=random&name=' + encodeURIComponent(group.name)}" alt="${group.name}">
        <div class="list-item-info">
            <h4>${group.name}</h4>
            <p>${group.description || 'Group chat'}</p>
        </div>
        <div class="list-item-time">${lastActivityText}</div>
    `;
    
    // Add click event to open this group chat
    groupItem.addEventListener('click', () => {
        startChatWithGroup(group.id, group.name, group.photoURL);
    });
    
    container.appendChild(groupItem);
}

// Start a chat with a user
function startChatWithUser(userId, userName, userAvatar) {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    // Generate a unique chat ID for the two users
    const chatId = [currentUser.uid, userId].sort().join('_');
    
    currentChatId = chatId;
    currentChatType = 'user';
    currentChatName = userName;
    currentChatAvatar = userAvatar || `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(userName)}`;
    
    // Update UI
    updateChatHeader();
    
    // Enable message input
    document.getElementById('message-input').disabled = false;
    document.getElementById('send-btn').disabled = false;
    
    // Load messages for this chat
    loadMessages();
    
    // Update chat info panel
    updateChatInfo();
    
    // Mark active chat in sidebar
    markActiveChat('user', userId);
}

// Start a chat with a group
function startChatWithGroup(groupId, groupName, groupAvatar) {
    currentChatId = groupId;
    currentChatType = 'group';
    currentChatName = groupName;
    currentChatAvatar = groupAvatar || `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(groupName)}`;
    
    // Update UI
    updateChatHeader();
    
    // Enable message input
    document.getElementById('message-input').disabled = false;
    document.getElementById('send-btn').disabled = false;
    
    // Load messages for this group
    loadMessages();
    
    // Update chat info panel
    updateChatInfo();
    
    // Mark active chat in sidebar
    markActiveChat('group', groupId);
}

// Update chat header with current chat info
function updateChatHeader() {
    document.getElementById('chat-name').textContent = currentChatName;
    document.getElementById('chat-avatar').src = currentChatAvatar;
    
    if (currentChatType === 'user') {
        document.getElementById('chat-status').textContent = 'Click for user info';
    } else {
        document.getElementById('chat-status').textContent = 'Group chat • Click for group info';
    }
}

// Mark active chat in sidebar
function markActiveChat(type, id) {
    // Remove active class from all list items
    document.querySelectorAll('.list-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to current chat
    const activeItem = document.querySelector(`.list-item[data-${type}-id="${id}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
}

// Load messages for current chat
function loadMessages() {
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;
    
    // Clear welcome message
    messagesContainer.innerHTML = '';
    
    // Set up real-time listener for messages
    db.collection('messages')
        .where('chatId', '==', currentChatId)
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            messagesContainer.innerHTML = '';
            
            if (snapshot.empty) {
                messagesContainer.innerHTML = `
                    <div class="welcome-message">
                        <i class="fas fa-comments fa-3x"></i>
                        <h2>No messages yet</h2>
                        <p>Send a message to start the conversation</p>
                    </div>
                `;
                return;
            }
            
            snapshot.forEach(doc => {
                const message = doc.data();
                displayMessage(message);
            });
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, error => {
            console.error('Error loading messages:', error);
            messagesContainer.innerHTML = '<div class="message-item"><div class="message-content">Error loading messages.</div></div>';
        });
}

// Display a message in the chat
function displayMessage(message) {
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;
    
    const currentUser = auth.currentUser;
    const isSentByMe = message.senderId === currentUser.uid;
    
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message-item ${isSentByMe ? 'sent' : 'received'}`;
    
    // Format timestamp
    let timeText = '';
    if (message.timestamp) {
        const time = message.timestamp.toDate();
        timeText = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Message content
    let messageContent = '';
    if (currentChatType === 'group' && !isSentByMe) {
        messageContent = `
            <div class="message-sender">${message.senderName}</div>
            <div class="message-text">${message.text}</div>
            <div class="message-time">${timeText}</div>
        `;
    } else {
        messageContent = `
            <div class="message-text">${message.text}</div>
            <div class="message-time">${timeText}</div>
        `;
    }
    
    messageEl.innerHTML = `
        ${!isSentByMe && currentChatType === 'group' ? 
            `<img src="${message.senderAvatar || 'https://ui-avatars.com/api/?background=random&name=User'}" class="message-avatar" alt="${message.senderName}">` : ''}
        <div class="message-content">
            ${messageContent}
        </div>
        ${isSentByMe && currentChatType === 'group' ? 
            `<img src="${message.senderAvatar || 'https://ui-avatars.com/api/?background=random&name=User'}" class="message-avatar" alt="${message.senderName}">` : ''}
    `;
    
    messagesContainer.appendChild(messageEl);
}

// Send a message
function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const messageText = messageInput.value.trim();
    
    if (!messageText || !currentChatId || !auth.currentUser) return;
    
    const currentUser = auth.currentUser;
    
    // Create message object
    const message = {
        text: messageText,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        senderAvatar: currentUser.photoURL || `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(currentUser.displayName || 'User')}`,
        chatId: currentChatId,
        chatType: currentChatType,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Add message to Firestore
    db.collection('messages').add(message)
        .then(() => {
            // Clear input
            messageInput.value = '';
            
            // Update last activity
            if (currentChatType === 'group') {
                db.collection('groups').doc(currentChatId).update({
                    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            console.log('Message sent');
        })
        .catch(error => {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        });
}

// Update chat info panel
function updateChatInfo() {
    const infoContent = document.getElementById('info-content');
    if (!infoContent) return;
    
    if (currentChatType === 'user') {
        // Get user info
        const userId = currentChatId.split('_').find(id => id !== auth.currentUser.uid);
        
        db.collection('users').doc(userId).get()
            .then(doc => {
                if (doc.exists) {
                    const user = doc.data();
                    
                    let lastSeenText = 'Offline';
                    if (user.lastSeen) {
                        const lastSeen = user.lastSeen.toDate();
                        const now = new Date();
                        const diffMs = now - lastSeen;
                        const diffMins = Math.floor(diffMs / 60000);
                        
                        if (diffMins < 5) {
                            lastSeenText = 'Online now';
                        } else if (diffMins < 60) {
                            lastSeenText = `Last seen ${diffMins} minutes ago`;
                        } else if (diffMins < 1440) {
                            lastSeenText = `Last seen ${Math.floor(diffMins / 60)} hours ago`;
                        } else {
                            lastSeenText = `Last seen ${lastSeen.toLocaleDateString()}`;
                        }
                    }
                    
                    infoContent.innerHTML = `
                        <div class="info-section">
                            <h4>User Information</h4>
                            <div class="info-item">
                                <img src="${user.photoURL || 'https://ui-avatars.com/api/?background=random&name=User'}" alt="${user.displayName}">
                                <div>
                                    <h5>${user.displayName || 'Unknown User'}</h5>
                                    <p>${user.email}</p>
                                    <p>${lastSeenText}</p>
                                </div>
                            </div>
                        </div>
                        ${user.bio ? `
                        <div class="info-section">
                            <h4>Bio</h4>
                            <p>${user.bio}</p>
                        </div>
                        ` : ''}
                        <div class="info-section">
                            <h4>Chat Details</h4>
                            <p>Direct message conversation</p>
                        </div>
                    `;
                }
            })
            .catch(error => {
                console.error('Error loading user info:', error);
                infoContent.innerHTML = '<p>Error loading user information.</p>';
            });
    } else if (currentChatType === 'group') {
        // Get group info
        db.collection('groups').doc(currentChatId).get()
            .then(doc => {
                if (doc.exists) {
                    const group = doc.data();
                    
                    // Get group members
                    const memberPromises = group.members.map(memberId => 
                        db.collection('users').doc(memberId).get()
                    );
                    
                    Promise.all(memberPromises)
                        .then(memberDocs => {
                            const members = memberDocs.map(doc => doc.exists ? doc.data() : null).filter(Boolean);
                            
                            infoContent.innerHTML = `
                                <div class="info-section">
                                    <h4>Group Information</h4>
                                    <div class="info-item">
                                        <img src="${group.photoURL || 'https://ui-avatars.com/api/?background=random&name=' + encodeURIComponent(group.name)}" alt="${group.name}">
                                        <div>
                                            <h5>${group.name}</h5>
                                            <p>${group.description || 'Group chat'}</p>
                                            <p>${members.length} members</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="info-section">
                                    <h4>Members</h4>
                                    ${members.map(member => `
                                        <div class="info-item">
                                            <img src="${member.photoURL || 'https://ui-avatars.com/api/?background=random&name=User'}" alt="${member.displayName}">
                                            <div>
                                                <h5>${member.displayName || 'Unknown User'}</h5>
                                                <p>${member.email}</p>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="info-section">
                                    <h4>Group Details</h4>
                                    <p>Created by: ${group.createdBy || 'Unknown'}</p>
                                    <p>Created on: ${group.createdAt ? group.createdAt.toDate().toLocaleDateString() : 'Unknown'}</p>
                                </div>
                            `;
                        });
                }
            })
            .catch(error => {
                console.error('Error loading group info:', error);
                infoContent.innerHTML = '<p>Error loading group information.</p>';
            });
    }
}

// Create a new group
function createGroup(groupName, description, selectedMembers) {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    // Add current user to members
    const members = [currentUser.uid, ...selectedMembers];
    
    const groupData = {
        name: groupName,
        description: description || '',
        members: members,
        createdBy: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
        photoURL: `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(groupName)}`
    };
    
    db.collection('groups').add(groupData)
        .then(docRef => {
            console.log('Group created with ID:', docRef.id);
            closeModal('create-group-modal');
            
            // Clear form
            document.getElementById('group-name').value = '';
            document.getElementById('group-description').value = '';
            
            // Start chat with the new group
            startChatWithGroup(docRef.id, groupName, groupData.photoURL);
        })
        .catch(error => {
            console.error('Error creating group:', error);
            alert('Failed to create group. Please try again.');
        });
}

// Update user profile
function updateUserProfile(name, bio) {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    // Update in Firestore
    db.collection('users').doc(currentUser.uid).update({
        displayName: name,
        bio: bio || '',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        // Update in Firebase Auth
        return currentUser.updateProfile({
            displayName: name
        });
    })
    .then(() => {
        console.log('Profile updated');
        closeModal('profile-modal');
        
        // Update UI
        document.getElementById('user-name').textContent = name;
        document.getElementById('profile-name').textContent = name;
        if (bio) {
            // Bio would be displayed in profile tab
        }
    })
    .catch(error => {
        console.error('Error updating profile:', error);
        alert('Failed to update profile. Please try again.');
    });
}

// Update user online status
function updateUserStatus() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    // Update last seen timestamp
    db.collection('users').doc(currentUser.uid).update({
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Update every 30 seconds
    setInterval(() => {
        if (auth.currentUser) {
            db.collection('users').doc(auth.currentUser.uid).update({
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }, 30000);
}

// Set up chat event listeners
function setupChatListeners() {
    // Send message on button click
    const sendBtn = document.getElementById('send-btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
    
    // Send message on Enter key
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Chat info button
    const chatInfoBtn = document.getElementById('chat-info-btn');
    if (chatInfoBtn) {
        chatInfoBtn.addEventListener('click', function() {
            document.getElementById('info-panel').classList.add('active');
        });
    }
    
    // Close info panel button
    const closeInfoBtn = document.getElementById('close-info-btn');
    if (closeInfoBtn) {
        closeInfoBtn.addEventListener('click', function() {
            document.getElementById('info-panel').classList.remove('active');
        });
    }
    
    // Tab switching in sidebar
    const tabBtns = document.querySelectorAll('.sidebar .tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Show selected tab content
            document.querySelectorAll('.sidebar .tab-content').forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabId}-tab`) {
                    content.classList.add('active');
                }
            });
        });
    });
    
    // Create group button
    const createGroupBtn = document.getElementById('create-group-btn');
    if (createGroupBtn) {
        createGroupBtn.addEventListener('click', function() {
            openModal('create-group-modal');
            loadAvailableUsersForGroup();
        });
    }
    
    // Create group submit
    const createGroupSubmit = document.getElementById('create-group-submit');
    if (createGroupSubmit) {
        createGroupSubmit.addEventListener('click', function() {
            const groupName = document.getElementById('group-name').value.trim();
            const description = document.getElementById('group-description').value.trim();
            
            if (!groupName) {
                alert('Please enter a group name');
                return;
            }
            
            // Get selected members
            const selectedCheckboxes = document.querySelectorAll('#available-users-list input[type="checkbox"]:checked');
            const selectedMembers = Array.from(selectedCheckboxes).map(cb => cb.value);
            
            createGroup(groupName, description, selectedMembers);
        });
    }
    
    // Update profile button
    const updateProfileBtn = document.getElementById('update-profile-btn');
    if (updateProfileBtn) {
        updateProfileBtn.addEventListener('click', function() {
            openModal('profile-modal');
            
            // Load current profile data
            const currentUser = auth.currentUser;
            if (currentUser) {
                db.collection('users').doc(currentUser.uid).get()
                    .then(doc => {
                        if (doc.exists) {
                            const user = doc.data();
                            document.getElementById('edit-name').value = user.displayName || '';
                            document.getElementById('edit-bio').value = user.bio || '';
                        }
                    });
            }
        });
    }
    
    // Update profile submit
    const updateProfileSubmit = document.getElementById('update-profile-submit');
    if (updateProfileSubmit) {
        updateProfileSubmit.addEventListener('click', function() {
            const name = document.getElementById('edit-name').value.trim();
            const bio = document.getElementById('edit-bio').value.trim();
            
            if (!name) {
                alert('Please enter your name');
                return;
            }
            
            updateUserProfile(name, bio);
        });
    }
    
    // Close modal buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
}

// Load available users for group creation
function loadAvailableUsersForGroup() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    const availableUsersList = document.getElementById('available-users-list');
    if (!availableUsersList) return;
    
    availableUsersList.innerHTML = '<p>Loading users...</p>';
    
    // Query all users except current user
    db.collection('users')
        .where('uid', '!=', currentUser.uid)
        .orderBy('displayName')
        .get()
        .then(snapshot => {
            availableUsersList.innerHTML = '';
            
            if (snapshot.empty) {
                availableUsersList.innerHTML = '<p>No other users found.</p>';
                return;
            }
            
            snapshot.forEach(doc => {
                const user = doc.data();
                
                const userItem = document.createElement('div');
                userItem.className = 'checkbox-item';
                userItem.innerHTML = `
                    <input type="checkbox" id="user-${user.uid}" value="${user.uid}">
                    <label for="user-${user.uid}">
                        <img src="${user.photoURL || 'https://ui-avatars.com/api/?background=random&name=User'}" alt="${user.displayName}">
                        <span>${user.displayName}</span>
                    </label>
                `;
                
                availableUsersList.appendChild(userItem);
            });
        })
        .catch(error => {
            console.error('Error loading users for group:', error);
            availableUsersList.innerHTML = '<p>Error loading users.</p>';
        });
}

// Open modal
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}
