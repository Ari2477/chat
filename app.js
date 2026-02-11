// Main Application Controller
class AppController {
    constructor() {
        this.init();
    }
    
    async init() {
        await this.waitForFirebase();
        this.setupEventListeners();
        this.setupSidebar();
        this.setupModals();
        this.setupProfileFeatures();
        this.checkAuth();
    }
    
    waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.auth && window.db && window.storage) {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }
    
    checkAuth() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.initializeApp();
                document.body.style.display = 'block';
            } else {
                window.location.href = 'login.html';
            }
        });
    }
    
    initializeApp() {
        console.log('App initialized');
        this.loadUserData();
    }
    
    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => authManager.logout());
        }
        
        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                sidebar.classList.toggle('active');
                if (overlay) overlay.classList.toggle('active');
            });
        }
        
        if (overlay) {
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });
        }
        
        // Profile info button
        const profileInfoBtn = document.getElementById('profileInfoBtn');
        if (profileInfoBtn) {
            profileInfoBtn.addEventListener('click', () => {
                this.openProfileModal();
            });
        }
        
        // User avatar click
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar) {
            userAvatar.addEventListener('click', () => {
                this.openProfileModal();
            });
        }
        
        // Profile avatar upload click
        const profileAvatarUpload = document.getElementById('profileAvatarUpload');
        if (profileAvatarUpload) {
            profileAvatarUpload.addEventListener('click', () => {
                document.getElementById('avatarUploadInput').click();
            });
        }
        
        // Upload photo button
        const uploadProfilePhoto = document.getElementById('uploadProfilePhoto');
        if (uploadProfilePhoto) {
            uploadProfilePhoto.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('avatarUploadInput').click();
            });
        }
        
        // Avatar file input change - IMGBB VERSION
        const avatarUploadInput = document.getElementById('avatarUploadInput');
        if (avatarUploadInput) {
            avatarUploadInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.uploadProfileAvatar(file);
                }
            });
        }
        
        // Send message
        const sendBtn = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');
        
        if (sendBtn && messageInput) {
            sendBtn.addEventListener('click', () => {
                chatManager.sendMessage(messageInput.value);
                messageInput.value = '';
            });
            
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    chatManager.sendMessage(messageInput.value);
                    messageInput.value = '';
                }
            });
        }
        
        // Tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const tabName = btn.dataset.tab;
                document.querySelectorAll('.tab-pane').forEach(pane => {
                    pane.classList.remove('active');
                });
                
                if (tabName === 'chats') {
                    document.getElementById('chatsTab').classList.add('active');
                } else if (tabName === 'groups') {
                    document.getElementById('groupsTab').classList.add('active');
                    this.loadGroupsList();
                } else if (tabName === 'friends') {
                    document.getElementById('friendsTab').classList.add('active');
                    this.loadFriendsList();
                }
            });
        });
        
        // Create group button
        const createGroupBtn = document.getElementById('createGroupBtn');
        if (createGroupBtn) {
            createGroupBtn.addEventListener('click', () => {
                this.openModal('createGroupModal');
                this.loadFriendsForGroup();
            });
        }
        
        // Add friend button
        const addFriendBtn = document.getElementById('addFriendBtn');
        if (addFriendBtn) {
            addFriendBtn.addEventListener('click', () => {
                this.openModal('addFriendModal');
            });
        }
        
        // Modal close buttons
        document.querySelectorAll('.close-modal, .cancel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeAllModals();
            });
        });
        
        // Create group submit
        const createGroupSubmit = document.getElementById('createGroupSubmit');
        if (createGroupSubmit) {
            createGroupSubmit.addEventListener('click', async () => {
                const groupName = document.getElementById('groupNameInput').value;
                if (!groupName) {
                    alert('Please enter a group name');
                    return;
                }
                
                const selectedMembers = Array.from(document.querySelectorAll('.member-item input:checked'))
                    .map(input => input.value);
                
                try {
                    await chatManager.createGroup(groupName, selectedMembers);
                    this.closeAllModals();
                    alert('Group created successfully!');
                    document.querySelector('[data-tab="groups"]').click();
                } catch (error) {
                    alert('Failed to create group: ' + error.message);
                }
            });
        }
        
        // Add friend submit
        const addFriendSubmit = document.getElementById('addFriendSubmit');
        if (addFriendSubmit) {
            addFriendSubmit.addEventListener('click', async () => {
                const email = document.getElementById('friendEmailInput').value;
                if (!email) {
                    alert('Please enter an email address');
                    return;
                }
                
                try {
                    await chatManager.addFriend(email);
                    this.closeAllModals();
                    alert('Friend request sent successfully!');
                    document.getElementById('friendEmailInput').value = '';
                } catch (error) {
                    alert('Failed to add friend: ' + error.message);
                }
            });
        }
    }
    
    setupSidebar() {
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebarOverlay');
                sidebar.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
            }
        });
        
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('sidebar');
                const mobileMenuBtn = document.getElementById('mobileMenuBtn');
                
                if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                    sidebar.classList.remove('active');
                    document.getElementById('sidebarOverlay').classList.remove('active');
                }
            }
        });
    }
    
    setupModals() {
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });
    }
    
    setupProfileFeatures() {
        this.loadUserStats();
    }
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
    
    async openProfileModal() {
        const user = auth.currentUser;
        if (!user) return;
        
        document.getElementById('profileName').textContent = user.displayName || user.email.split('@')[0];
        document.getElementById('profileEmail').textContent = user.email;
        
        const profileImg = document.getElementById('profileAvatarImg');
        const profileIcon = document.getElementById('profileAvatarIcon');
        
        if (user.photoURL) {
            profileImg.src = user.photoURL;
            profileImg.style.display = 'block';
            profileIcon.style.display = 'none';
        } else {
            profileImg.style.display = 'none';
            profileIcon.style.display = 'block';
        }
        
        await this.loadUserStats();
        this.openModal('profileModal');
    }

    async uploadProfileAvatar(file) {
        const user = auth.currentUser;
        if (!user) {
            alert('You must be logged in');
            return;
        }
        
        // Check file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }
        
        // Check file size (max 32MB for ImgBB)
        if (file.size > 32 * 1024 * 1024) {
            alert('File is too large. Maximum size is 32MB');
            return;
        }
        
        // Show progress
        const progressDiv = document.createElement('div');
        progressDiv.className = 'upload-progress';
        progressDiv.id = 'uploadProgress';
        progressDiv.innerHTML = `
            <div><i class="fas fa-cloud-upload-alt"></i> Uploading to ImgBB...</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: 50%"></div>
            </div>
        `;
        document.body.appendChild(progressDiv);
        
        try {
            const formData = new FormData();
            formData.append('image', file);
         
            const IMGBB_API_KEY = '87b58d438e0cbe5226c1df0a8071621e'; 
            
            console.log('Uploading to ImgBB...');

            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to upload to ImgBB');
            }
            
            // Get the image URL from ImgBB
            const downloadURL = result.data.url;
            console.log('ImgBB URL:', downloadURL);
            
            // Update progress
            const progressFill = document.querySelector('#uploadProgress .progress-fill');
            if (progressFill) {
                progressFill.style.width = '100%';
            }
            
            // Update Firebase Auth profile
            await user.updateProfile({
                photoURL: downloadURL
            });
            
            // Update Firestore user document
            await db.collection('users').doc(user.uid).update({
                photoURL: downloadURL,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Force refresh user
            await user.reload();
            
            // Remove progress
            this.removeUploadProgress();
            
            // Update all UI elements
            this.updateAllAvatars(downloadURL);
            
            alert('Profile picture updated successfully!');
            
            // Refresh profile modal
            const profileImg = document.getElementById('profileAvatarImg');
            const profileIcon = document.getElementById('profileAvatarIcon');
            profileImg.src = downloadURL;
            profileImg.style.display = 'block';
            profileIcon.style.display = 'none';
            
        } catch (error) {
            console.error('Error uploading to ImgBB:', error);
            this.removeUploadProgress();
            alert('Failed to upload image: ' + error.message);
        }
    }
    
    // Update all avatars in the UI
    updateAllAvatars(photoURL) {
        // Update sidebar avatar
        const avatarImg = document.getElementById('avatarImg');
        const avatarInitial = document.getElementById('avatarInitial');
        
        if (avatarImg) {
            avatarImg.src = photoURL;
            avatarImg.style.display = 'block';
            avatarInitial.style.display = 'none';
        }
        
        // Update profile modal avatar
        const profileAvatarImg = document.getElementById('profileAvatarImg');
        const profileAvatarIcon = document.getElementById('profileAvatarIcon');
        
        if (profileAvatarImg) {
            profileAvatarImg.src = photoURL;
            profileAvatarImg.style.display = 'block';
            profileAvatarIcon.style.display = 'none';
        }
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('avatarUpdated', { 
            detail: { photoURL: photoURL } 
        }));
    }
    
    // Remove upload progress
    removeUploadProgress() {
        const progressDiv = document.getElementById('uploadProgress');
        if (progressDiv) {
            progressDiv.remove();
        }
        
        // Reset file input
        const fileInput = document.getElementById('avatarUploadInput');
        if (fileInput) {
            fileInput.value = '';
        }
    }
    
    async loadUserData() {
        const user = auth.currentUser;
        if (!user) return;
        
        await this.loadFriendsList();
        await this.loadGroupsList();
        await this.loadUserStats();
        
        // Load user avatar
        if (user.photoURL) {
            this.updateAllAvatars(user.photoURL);
        }
    }
    
    async loadFriendsList() {
        const user = auth.currentUser;
        if (!user) return;
        
        const friendsList = document.getElementById('friendsList');
        if (!friendsList) return;
        
        try {
            const snapshot = await db.collection('friendRequests')
                .where('status', '==', 'accepted')
                .where('participants', 'array-contains', user.uid)
                .get();
            
            friendsList.innerHTML = '';
            
            for (const doc of snapshot.docs) {
                const request = doc.data();
                const friendId = request.from === user.uid ? request.to : request.from;
                
                const friendDoc = await db.collection('users').doc(friendId).get();
                const friendData = friendDoc.data();
                
                const friendElement = this.createFriendElement(friendData, friendId);
                friendsList.appendChild(friendElement);
            }
        } catch (error) {
            console.error('Error loading friends:', error);
        }
    }
    
    createFriendElement(friendData, friendId) {
        const div = document.createElement('div');
        div.className = 'friend-item';
        div.dataset.friendId = friendId;
        
        const displayName = friendData.displayName || friendData.email.split('@')[0];
        const initial = displayName[0].toUpperCase();
        
        div.innerHTML = `
            <div class="friend-avatar">
                ${friendData.photoURL ? 
                    `<img src="${friendData.photoURL}" alt="${this.escapeHtml(displayName)}">` : 
                    `<span>${initial}</span>`
                }
            </div>
            <div class="friend-info">
                <div class="friend-name">${this.escapeHtml(displayName)}</div>
                <div class="friend-status ${friendData.online ? 'online' : 'offline'}">
                    <i class="fas fa-circle"></i> ${friendData.online ? 'Online' : 'Offline'}
                </div>
            </div>
            <button class="chat-btn" onclick="startPrivateChat('${friendId}')">
                <i class="fas fa-comment"></i>
            </button>
        `;
        
        return div;
    }
    
    async loadGroupsList() {
        const user = auth.currentUser;
        if (!user) return;
        
        const groupsList = document.getElementById('groupsList');
        if (!groupsList) return;
        
        try {
            const snapshot = await db.collection('groupChats')
                .where('members', 'array-contains', user.uid)
                .orderBy('lastMessageTime', 'desc')
                .get();
            
            groupsList.innerHTML = '';
            
            snapshot.forEach(doc => {
                const group = doc.data();
                const groupElement = this.createGroupElement(group, doc.id);
                groupsList.appendChild(groupElement);
            });
        } catch (error) {
            console.error('Error loading groups:', error);
        }
    }
    
    createGroupElement(groupData, groupId) {
        const div = document.createElement('div');
        div.className = 'group-item';
        div.dataset.groupId = groupId;
        div.onclick = () => chatManager.openChat(groupId, groupData, 'group');
        
        div.innerHTML = `
            <div class="chat-avatar">
                ${groupData.avatar ? 
                    `<img src="${groupData.avatar}" alt="${this.escapeHtml(groupData.name)}">` : 
                    `<i class="fas fa-users"></i>`
                }
            </div>
            <div class="chat-info">
                <div class="chat-name">${this.escapeHtml(groupData.name)}</div>
                <div class="chat-last-message">${this.escapeHtml(groupData.lastMessage || 'No messages yet')}</div>
            </div>
            <div class="chat-time">${groupData.members?.length || 0} members</div>
        `;
        
        return div;
    }
    
    async loadFriendsForGroup() {
        const user = auth.currentUser;
        if (!user) return;
        
        const membersList = document.getElementById('membersList');
        if (!membersList) return;
        
        try {
            const snapshot = await db.collection('friendRequests')
                .where('status', '==', 'accepted')
                .where('participants', 'array-contains', user.uid)
                .get();
            
            membersList.innerHTML = '';
            
            for (const doc of snapshot.docs) {
                const request = doc.data();
                const friendId = request.from === user.uid ? request.to : request.from;
                
                const friendDoc = await db.collection('users').doc(friendId).get();
                const friendData = friendDoc.data();
                
                const memberElement = document.createElement('div');
                memberElement.className = 'member-item';
                memberElement.innerHTML = `
                    <label>
                        <input type="checkbox" value="${friendId}">
                        <span>${this.escapeHtml(friendData.displayName || friendData.email)}</span>
                    </label>
                `;
                
                membersList.appendChild(memberElement);
            }
        } catch (error) {
            console.error('Error loading friends for group:', error);
        }
    }
    
    async loadUserStats() {
        const user = auth.currentUser;
        if (!user) return;
        
        try {
            const friendsSnapshot = await db.collection('friendRequests')
                .where('status', '==', 'accepted')
                .where('participants', 'array-contains', user.uid)
                .get();
            
            const groupsSnapshot = await db.collection('groupChats')
                .where('members', 'array-contains', user.uid)
                .get();
            
            const chatsSnapshot = await db.collection('privateChats')
                .where('participants', 'array-contains', user.uid)
                .get();
            
            const friendsCount = document.getElementById('profileFriendsCount');
            const groupsCount = document.getElementById('profileGroupsCount');
            const chatsCount = document.getElementById('profileChatsCount');
            
            if (friendsCount) friendsCount.textContent = friendsSnapshot.size;
            if (groupsCount) groupsCount.textContent = groupsSnapshot.size;
            if (chatsCount) chatsCount.textContent = chatsSnapshot.size;
            
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global functions
window.startPrivateChat = async function(friendId) {
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
            chatManager.openChat(existingChat.id, existingChat.data, 'private');
        } else {
            const friendDoc = await db.collection('users').doc(friendId).get();
            const friendData = friendDoc.data();
            
            const chatData = {
                participants: [user.uid, friendId],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessage: 'Start a conversation'
            };
            
            const docRef = await db.collection('privateChats').add(chatData);
            chatManager.openChat(docRef.id, chatData, 'private');
        }
        
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('active');
            document.getElementById('sidebarOverlay').classList.remove('active');
        }
    } catch (error) {
        console.error('Error starting private chat:', error);
        alert('Failed to start chat: ' + error.message);
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.appController = new AppController();
});
