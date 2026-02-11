class AppController {
    constructor() {
        this.currentUser = null;
        this.activeTab = 'chats';
        this.friendRequestListener = null;
        this.userStatusListener = null;
        this.init();
    }
    
    async init() {
        await this.waitForFirebase();
        this.setupEventListeners();
        this.setupSidebar();
        this.setupModals();
        this.setupProfileFeatures();
        this.setupGroupDropdown();
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
                this.currentUser = user;
                this.initializeApp();
                document.body.style.display = 'block';
            } else {
                window.location.href = 'login.html';
            }
        });
    }
    
    initializeApp() {
        console.log('✅ App initialized for:', this.currentUser?.email);
        this.loadUserData();
        this.setupRealtimeListeners();
        this.updateUserOnlineStatus(true);

        window.addEventListener('beforeunload', () => {
            this.updateUserOnlineStatus(false);
        });
    }
    
    async updateUserOnlineStatus(isOnline) {
        const user = auth.currentUser;
        if (!user) return;
        
        try {
            await db.collection('users').doc(user.uid).update({
                online: isOnline,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating online status:', error);
        }
    }
    
    setupRealtimeListeners() {
        this.listenForFriendRequests();
        this.listenForUserStatus();
        this.listenForFriendRequestResponses();
        this.listenForGroupUpdates();
    }
    
    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await this.updateUserOnlineStatus(false);
                authManager.logout();
            });
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
        
        // Avatar file input change
        const avatarUploadInput = document.getElementById('avatarUploadInput');
        if (avatarUploadInput) {
            avatarUploadInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.uploadProfileAvatar(file);
                }
            });
        }
        
        // Group avatar upload
        const uploadGroupAvatarBtn = document.getElementById('uploadGroupAvatarBtn');
        const groupAvatarInput = document.getElementById('groupAvatarInput');
        
        if (uploadGroupAvatarBtn && groupAvatarInput) {
            uploadGroupAvatarBtn.addEventListener('click', () => {
                groupAvatarInput.click();
            });
            
            groupAvatarInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.previewGroupAvatar(file);
                }
            });
        }
        
        // ============ 📸 IMAGE UPLOAD BUTTON - ADDED! ============
        const attachBtn = document.getElementById('attachBtn');
        const imageUploadInput = document.getElementById('imageUploadInput');
        
        if (attachBtn && imageUploadInput) {
            attachBtn.addEventListener('click', () => {
                imageUploadInput.click();
            });
            
            imageUploadInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    chatManager.sendImageMessage(file);
                }
            });
        }

        // ============ 📸 IMAGE VIEWER CLOSE - ADDED! ============
        const closeImageViewerBtns = document.querySelectorAll('#imageViewerModal .close-modal');
        closeImageViewerBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('imageViewerModal').classList.remove('active');
                document.body.style.overflow = '';
            });
        });

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('imageViewerModal');
            if (e.target === modal) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
        
        // Send message
        const sendBtn = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');
        
        if (sendBtn && messageInput) {
            sendBtn.addEventListener('click', () => {
                if (messageInput.value.trim()) {
                    chatManager.sendMessage(messageInput.value);
                    messageInput.value = '';
                }
            });
            
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && messageInput.value.trim()) {
                    chatManager.sendMessage(messageInput.value);
                    messageInput.value = '';
                }
            });
        }
        
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchConversations(e.target.value);
            });
        }
        
        // Tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const tabName = btn.dataset.tab;
                this.activeTab = tabName;
                
                document.querySelectorAll('.tab-pane').forEach(pane => {
                    pane.classList.remove('active');
                });
                
                if (tabName === 'chats') {
                    document.getElementById('chatsTab').classList.add('active');
                    chatManager.loadChats();
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
                    createGroupSubmit.disabled = true;
                    createGroupSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
                    
                    let groupAvatar = null;
                    if (window.selectedGroupAvatar) {
                        groupAvatar = await this.uploadGroupAvatar(window.selectedGroupAvatar);
                    }
                    
                    const groupId = await chatManager.createGroup(groupName, selectedMembers, groupAvatar);
                    console.log('✅ Group created:', groupId);
                    
                    window.selectedGroupAvatar = null;
                    this.closeAllModals();
                    
                    document.getElementById('groupNameInput').value = '';
                    const preview = document.getElementById('groupAvatarPreview');
                    if (preview) preview.innerHTML = '<i class="fas fa-users"></i>';
                    
                    document.querySelector('[data-tab="groups"]').click();
                    await this.loadGroupsList();
                    
                    alert('Group created successfully!');
                    
                } catch (error) {
                    console.error('❌ Group creation error:', error);
                    alert('Failed to create group: ' + error.message);
                } finally {
                    createGroupSubmit.disabled = false;
                    createGroupSubmit.innerHTML = 'Create Group';
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
                    addFriendSubmit.disabled = true;
                    addFriendSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                    
                    await chatManager.addFriend(email);
                    
                    this.closeAllModals();
                    document.getElementById('friendEmailInput').value = '';
                    
                    alert('✅ Friend request sent successfully!');
                    
                } catch (error) {
                    console.error('❌ Add friend error:', error);
                    alert('Failed to add friend: ' + error.message);
                } finally {
                    addFriendSubmit.disabled = false;
                    addFriendSubmit.innerHTML = 'Add Friend';
                }
            });
        }
        
        // Add Members Submit
        const addMembersSubmit = document.getElementById('addMembersSubmit');
        if (addMembersSubmit) {
            addMembersSubmit.addEventListener('click', () => {
                this.addMembersToGroup();
            });
        }
        
        // Add Members Search
        const addMembersSearch = document.getElementById('addMembersSearch');
        if (addMembersSearch) {
            addMembersSearch.addEventListener('input', (e) => {
                this.searchAddMembers(e.target.value);
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
                
                if (sidebar && mobileMenuBtn && !sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                    sidebar.classList.remove('active');
                    const overlay = document.getElementById('sidebarOverlay');
                    if (overlay) overlay.classList.remove('active');
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
    
    setupGroupDropdown() {
        const groupMenuBtn = document.getElementById('groupMenuBtn');
        const groupDropdown = document.getElementById('groupDropdown');
        
        if (groupMenuBtn) {
            groupMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                groupDropdown.classList.toggle('show');
            });
        }
        
        // Close dropdown when clicking outside
        window.addEventListener('click', () => {
            if (groupDropdown) {
                groupDropdown.classList.remove('show');
            }
        });
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
        
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        
        if (profileName) profileName.textContent = user.displayName || user.email.split('@')[0];
        if (profileEmail) profileEmail.textContent = user.email;
        
        const profileImg = document.getElementById('profileAvatarImg');
        const profileIcon = document.getElementById('profileAvatarIcon');
        
        if (user.photoURL && profileImg && profileIcon) {
            profileImg.src = user.photoURL;
            profileImg.style.display = 'block';
            profileIcon.style.display = 'none';
        } else {
            if (profileImg) profileImg.style.display = 'none';
            if (profileIcon) profileIcon.style.display = 'block';
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
        
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }
        
        if (file.size > 32 * 1024 * 1024) {
            alert('File is too large. Maximum size is 32MB');
            return;
        }
        
        const progressDiv = this.showUploadProgress('Uploading profile picture...');
        
        try {
            const formData = new FormData();
            formData.append('image', file);
            
            const IMGBB_API_KEY = '87b58d438e0cbe5226c1df0a8071621e';
            
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to upload');
            }
            
            const downloadURL = result.data.url;
            console.log('✅ ImgBB upload success:', downloadURL);
            
            await user.updateProfile({
                photoURL: downloadURL
            });
            
            await db.collection('users').doc(user.uid).update({
                photoURL: downloadURL,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await user.reload();
            
            this.updateAllAvatars(downloadURL);
            this.removeUploadProgress(progressDiv.id);
            
            alert('✅ Profile picture updated successfully!');
            
            const profileImg = document.getElementById('profileAvatarImg');
            const profileIcon = document.getElementById('profileAvatarIcon');
            if (profileImg && profileIcon) {
                profileImg.src = downloadURL;
                profileImg.style.display = 'block';
                profileIcon.style.display = 'none';
            }
            
        } catch (error) {
            console.error('❌ Error uploading:', error);
            this.removeUploadProgress(progressDiv.id);
            alert('Failed to upload image: ' + error.message);
        }
    }
    
    async uploadGroupAvatar(file) {
        if (!file) return null;
        
        const progressDiv = this.showUploadProgress('Uploading group avatar...');
        
        try {
            const formData = new FormData();
            formData.append('image', file);
            
            const IMGBB_API_KEY = '87b58d438e0cbe5226c1df0a8071621e';
            
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to upload');
            }
            
            const downloadURL = result.data.url;
            console.log('✅ Group avatar uploaded:', downloadURL);
            
            this.removeUploadProgress(progressDiv.id);
            return downloadURL;
            
        } catch (error) {
            console.error('❌ Error uploading group avatar:', error);
            this.removeUploadProgress(progressDiv.id);
            return null;
        }
    }
    
    previewGroupAvatar(file) {
        const preview = document.getElementById('groupAvatarPreview');
        if (preview) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            };
            reader.readAsDataURL(file);
            window.selectedGroupAvatar = file;
        }
    }
    
    showUploadProgress(message) {
        const id = 'uploadProgress_' + Date.now();
        const progressDiv = document.createElement('div');
        progressDiv.className = 'upload-progress';
        progressDiv.id = id;
        progressDiv.innerHTML = `
            <div><i class="fas fa-cloud-upload-alt"></i> ${message}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: 50%"></div>
            </div>
        `;
        document.body.appendChild(progressDiv);
        return { id, element: progressDiv };
    }
    
    removeUploadProgress(id) {
        const element = document.getElementById(id);
        if (element) element.remove();
        
        const fileInput = document.getElementById('avatarUploadInput');
        if (fileInput) fileInput.value = '';
    }
    
    updateAllAvatars(photoURL) {
        const avatarImg = document.getElementById('avatarImg');
        const avatarInitial = document.getElementById('avatarInitial');
        
        if (avatarImg && avatarInitial) {
            avatarImg.src = photoURL;
            avatarImg.style.display = 'block';
            avatarInitial.style.display = 'none';
        }
        
        const profileAvatarImg = document.getElementById('profileAvatarImg');
        const profileAvatarIcon = document.getElementById('profileAvatarIcon');
        
        if (profileAvatarImg && profileAvatarIcon) {
            profileAvatarImg.src = photoURL;
            profileAvatarImg.style.display = 'block';
            profileAvatarIcon.style.display = 'none';
        }
        
        window.dispatchEvent(new CustomEvent('avatarUpdated', { 
            detail: { photoURL } 
        }));
    }
    
    async loadUserData() {
        const user = auth.currentUser;
        if (!user) return;
        
        await this.loadFriendsList();
        await this.loadGroupsList();
        await this.loadUserStats();
        
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
                .orderBy('timestamp', 'desc')
                .get();
            
            friendsList.innerHTML = '';
            
            if (snapshot.empty) {
                friendsList.innerHTML = '<div class="no-data"><i class="fas fa-user-friends"></i><p>No friends yet</p><small>Add friends to start chatting!</small></div>';
                return;
            }
            
            for (const doc of snapshot.docs) {
                const request = doc.data();
                const friendId = request.from === user.uid ? request.to : request.from;
                
                const friendDoc = await db.collection('users').doc(friendId).get();
                const friendData = friendDoc.data();
                
                if (friendData) {
                    const friendElement = this.createFriendElement(friendData, friendId);
                    friendsList.appendChild(friendElement);
                }
            }
        } catch (error) {
            console.error('❌ Error loading friends:', error);
        }
    }
    
    createFriendElement(friendData, friendId) {
        const div = document.createElement('div');
        div.className = 'friend-item';
        div.dataset.friendId = friendId;
        
        const displayName = friendData.displayName || friendData.email?.split('@')[0] || 'User';
        const initial = displayName[0].toUpperCase();
        const isOnline = friendData.online || false;
        
        div.innerHTML = `
            <div class="friend-avatar">
                ${friendData.photoURL ? 
                    `<img src="${friendData.photoURL}" alt="${this.escapeHtml(displayName)}">` : 
                    `<span>${initial}</span>`
                }
                <span class="status-indicator ${isOnline ? 'online' : 'offline'}"></span>
            </div>
            <div class="friend-info">
                <div class="friend-name">${this.escapeHtml(displayName)}</div>
                <div class="friend-status ${isOnline ? 'online' : 'offline'}">
                    <i class="fas fa-circle"></i> ${isOnline ? 'Online' : 'Offline'}
                </div>
            </div>
            <button class="chat-btn" onclick="appController.startPrivateChat('${friendId}')">
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
            
            if (snapshot.empty) {
                groupsList.innerHTML = '<div class="no-data"><i class="fas fa-users"></i><p>No groups yet</p><small>Create a group to start chatting!</small></div>';
                return;
            }
            
            snapshot.forEach(doc => {
                const group = doc.data();
                const groupId = doc.id;
                const groupElement = this.createGroupElement(group, groupId);
                groupsList.appendChild(groupElement);
            });
        } catch (error) {
            console.error('❌ Error loading groups:', error);
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
            
            if (snapshot.empty) {
                membersList.innerHTML = '<div class="no-data"><p>No friends yet</p><small>Add friends first to invite them to groups!</small></div>';
                return;
            }
            
            for (const doc of snapshot.docs) {
                const request = doc.data();
                const friendId = request.from === user.uid ? request.to : request.from;
                
                const friendDoc = await db.collection('users').doc(friendId).get();
                const friendData = friendDoc.data();
                
                if (friendData) {
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
            }
        } catch (error) {
            console.error('❌ Error loading friends for group:', error);
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
            console.error('❌ Error loading stats:', error);
        }
    }

    listenForFriendRequests() {
        const user = auth.currentUser;
        if (!user) return;
        
        if (this.friendRequestListener) {
            this.friendRequestListener();
        }
        
        this.friendRequestListener = db.collection('friendRequests')
            .where('to', '==', user.uid)
            .where('status', '==', 'pending')
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        this.showFriendRequestNotification(change.doc.data());
                    }
                });
            }, (error) => {
                console.error('❌ Error listening to friend requests:', error);
            });
    }
    
    listenForFriendRequestResponses() {
        const user = auth.currentUser;
        if (!user) return;
        
        db.collection('friendRequests')
            .where('from', '==', user.uid)
            .where('status', 'in', ['accepted', 'declined'])
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'modified') {
                        const data = change.doc.data();
                        if (data.status === 'accepted') {
                            this.showNotification(`${data.toName} accepted your friend request!`, 'success');
                            this.loadFriendsList();
                        } else if (data.status === 'declined') {
                            this.showNotification(`${data.toName} declined your friend request`, 'info');
                        }
                    }
                });
            });
    }

    listenForUserStatus() {
        const user = auth.currentUser;
        if (!user) return;
        
        if (this.userStatusListener) {
            this.userStatusListener();
        }
        
        this.userStatusListener = db.collection('users')
            .onSnapshot(() => {
                if (this.activeTab === 'friends') {
                    this.loadFriendsList();
                }
            }, (error) => {
                console.error('❌ Error listening to user status:', error);
            });
    }
    
    listenForGroupUpdates() {
        const user = auth.currentUser;
        if (!user) return;
        
        db.collection('groupChats')
            .where('members', 'array-contains', user.uid)
            .onSnapshot(() => {
                if (this.activeTab === 'groups') {
                    this.loadGroupsList();
                }
            });
    }

    showFriendRequestNotification(request) {
        const fromName = request.fromName || 'Someone';
        
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-user-friends"></i>
                <span><strong>${this.escapeHtml(fromName)}</strong> sent you a friend request</span>
            </div>
            <div class="notification-actions">
                <button onclick="appController.respondToFriendRequest('${request.from}', 'accepted')" class="accept-btn">
                    <i class="fas fa-check"></i> Accept
                </button>
                <button onclick="appController.respondToFriendRequest('${request.from}', 'declined')" class="decline-btn">
                    <i class="fas fa-times"></i> Decline
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }
    
    async respondToFriendRequest(fromUserId, status) {
        const user = auth.currentUser;
        if (!user) return;
        
        try {
            const snapshot = await db.collection('friendRequests')
                .where('from', '==', fromUserId)
                .where('to', '==', user.uid)
                .where('status', '==', 'pending')
                .limit(1)
                .get();
            
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                await doc.ref.update({
                    status: status,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                if (status === 'accepted') {
                    this.showNotification('Friend request accepted!', 'success');
                    this.loadFriendsList();
                } else {
                    this.showNotification('Friend request declined', 'info');
                }
            }
        } catch (error) {
            console.error('❌ Error responding to friend request:', error);
            this.showNotification('Failed to respond to friend request', 'error');
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${this.escapeHtml(message)}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    // ============ GROUP CHAT MANAGEMENT ============
    
    showGroupMenu(isGroup) {
        const menuContainer = document.getElementById('groupMenuContainer');
        if (menuContainer) {
            menuContainer.style.display = isGroup ? 'block' : 'none';
        }
    }
    
    async showAddMembersModal() {
        if (!chatManager.currentChat || chatManager.currentChatType !== 'group') {
            alert('No group selected');
            return;
        }
        
        const groupId = chatManager.currentChat;
        const groupData = chatManager.currentChatData;
        
        await this.loadAvailableFriendsForGroup(groupId, groupData.members || []);
        this.openModal('addMembersModal');
    }
    
    async loadAvailableFriendsForGroup(groupId, existingMembers) {
        const user = auth.currentUser;
        if (!user) return;
        
        const membersList = document.getElementById('addMembersList');
        if (!membersList) return;
        
        try {
            const snapshot = await db.collection('friendRequests')
                .where('status', '==', 'accepted')
                .where('participants', 'array-contains', user.uid)
                .get();
            
            membersList.innerHTML = '';
            
            if (snapshot.empty) {
                membersList.innerHTML = '<div class="no-data"><p>No friends available</p></div>';
                return;
            }
            
            for (const doc of snapshot.docs) {
                const request = doc.data();
                const friendId = request.from === user.uid ? request.to : request.from;
                
                if (existingMembers.includes(friendId)) {
                    continue;
                }
                
                const friendDoc = await db.collection('users').doc(friendId).get();
                const friendData = friendDoc.data();
                
                if (friendData) {
                    const memberElement = document.createElement('div');
                    memberElement.className = 'member-item';
                    memberElement.dataset.friendId = friendId;
                    memberElement.dataset.friendName = friendData.displayName || friendData.email;
                    memberElement.innerHTML = `
                        <label>
                            <input type="checkbox" value="${friendId}">
                            <span>${this.escapeHtml(friendData.displayName || friendData.email)}</span>
                        </label>
                    `;
                    membersList.appendChild(memberElement);
                }
            }
            
            window.currentGroupId = groupId;
            
        } catch (error) {
            console.error('❌ Error loading friends for group:', error);
        }
    }
    
    searchAddMembers(query) {
        const membersList = document.getElementById('addMembersList');
        if (!membersList) return;
        
        const items = membersList.querySelectorAll('.member-item');
        const searchTerm = query.toLowerCase();
        
        items.forEach(item => {
            const name = item.dataset.friendName?.toLowerCase() || '';
            if (name.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    async addMembersToGroup() {
        const groupId = window.currentGroupId;
        if (!groupId) {
            alert('No group selected');
            return;
        }
        
        const selectedMembers = Array.from(document.querySelectorAll('#addMembersList input:checked'))
            .map(input => input.value);
        
        if (selectedMembers.length === 0) {
            alert('Please select at least one member');
            return;
        }
        
        const submitBtn = document.getElementById('addMembersSubmit');
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
            
            const groupRef = db.collection('groupChats').doc(groupId);
            const groupDoc = await groupRef.get();
            const groupData = groupDoc.data();
            
            const currentMembers = groupData.members || [];
            const newMembers = [...new Set([...currentMembers, ...selectedMembers])];
            
            await groupRef.update({
                members: newMembers,
                memberCount: newMembers.length,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            const user = auth.currentUser;
            const addedNames = selectedMembers.map(id => {
                const element = document.querySelector(`#addMembersList .member-item[data-friend-id="${id}"]`);
                return element?.dataset?.friendName || id;
            }).join(', ');
            
            await db.collection('groupMessages').add({
                chatId: groupId,
                senderId: 'system',
                senderName: 'System',
                text: `${user.displayName || user.email} added ${addedNames} to the group`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                type: 'system'
            });
            
            this.closeAllModals();
            this.showNotification('Members added successfully!', 'success');
            
            if (chatManager.currentChat === groupId) {
                await chatManager.loadMessages(groupId, 'group');
            }
            
            window.currentGroupId = null;
            
        } catch (error) {
            console.error('❌ Error adding members:', error);
            alert('Failed to add members: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Add Members';
        }
    }
    
    async showGroupInfo() {
        if (!chatManager.currentChat || chatManager.currentChatType !== 'group') {
            return;
        }
        
        const groupId = chatManager.currentChat;
        const groupData = chatManager.currentChatData;
        
        let membersList = '';
        
        for (const memberId of groupData.members || []) {
            try {
                const userDoc = await db.collection('users').doc(memberId).get();
                const userData = userDoc.data();
                const isAdmin = groupData.admins?.includes(memberId);
                const isCreator = groupData.createdBy === memberId;
                
                membersList += `
                    <div class="member-info">
                        <div class="member-avatar">
                            ${userData?.photoURL ? 
                                `<img src="${userData.photoURL}" alt="${userData.displayName || 'User'}">` : 
                                `<span>${(userData?.displayName || 'U')[0].toUpperCase()}</span>`
                            }
                        </div>
                        <div class="member-details">
                            <span class="member-name">${this.escapeHtml(userData?.displayName || userData?.email || 'User')}</span>
                            ${isCreator ? '<span class="member-badge creator">Creator</span>' : ''}
                            ${isAdmin && !isCreator ? '<span class="member-badge admin">Admin</span>' : ''}
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error('Error loading member:', error);
            }
        }
        
        const existingModal = document.getElementById('groupInfoModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const infoModal = document.createElement('div');
        infoModal.className = 'modal';
        infoModal.id = 'groupInfoModal';
        infoModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${this.escapeHtml(groupData.name)}</h3>
                    <button class="close-modal"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="group-info-header">
                        <div class="group-avatar-large">
                            ${groupData.avatar ? 
                                `<img src="${groupData.avatar}" alt="${this.escapeHtml(groupData.name)}">` : 
                                `<i class="fas fa-users"></i>`
                            }
                        </div>
                        <div class="group-stats">
                            <div class="stat-item">
                                <div class="stat-value">${groupData.members?.length || 0}</div>
                                <div class="stat-label">Members</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${groupData.admins?.length || 1}</div>
                                <div class="stat-label">Admins</div>
                            </div>
                        </div>
                    </div>
                    <div class="group-members-section">
                        <h4>Members</h4>
                        <div class="members-list-detailed">
                            ${membersList}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="cancel-btn">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(infoModal);
        this.openModal('groupInfoModal');
    }
    
    async leaveGroup() {
        if (!chatManager.currentChat || chatManager.currentChatType !== 'group') {
            return;
        }
        
        if (!confirm('Are you sure you want to leave this group?')) {
            return;
        }
        
        const groupId = chatManager.currentChat;
        const user = auth.currentUser;
        
        try {
            const groupRef = db.collection('groupChats').doc(groupId);
            const groupDoc = await groupRef.get();
            const groupData = groupDoc.data();
            
            const updatedMembers = (groupData.members || []).filter(id => id !== user.uid);
            const updatedAdmins = (groupData.admins || []).filter(id => id !== user.uid);
            
            await groupRef.update({
                members: updatedMembers,
                admins: updatedAdmins,
                memberCount: updatedMembers.length
            });
            
            await db.collection('groupMessages').add({
                chatId: groupId,
                senderId: 'system',
                senderName: 'System',
                text: `${user.displayName || user.email} left the group`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                type: 'system'
            });
            
            this.showNotification('You left the group', 'info');
            
            document.getElementById('welcomeMessage').style.display = 'block';
            document.getElementById('messageInputContainer').style.display = 'none';
            document.getElementById('chatTitle').textContent = 'Welcome to ChatBuddy';
            document.getElementById('chatStatus').textContent = 'Select a conversation to start chatting';
            this.showGroupMenu(false);
            
            chatManager.currentChat = null;
            chatManager.currentChatType = null;
            
            this.loadGroupsList();
            chatManager.loadChats();
            
        } catch (error) {
            console.error('❌ Error leaving group:', error);
            alert('Failed to leave group: ' + error.message);
        }
    }

    searchConversations(query) {
        if (!query.trim()) {
            chatManager.loadChats();
            return;
        }
        
        const items = document.querySelectorAll('.chat-item, .group-item');
        const searchTerm = query.toLowerCase();
        
        items.forEach(item => {
            const name = item.querySelector('.chat-name')?.textContent.toLowerCase() || '';
            const message = item.querySelector('.chat-last-message')?.textContent.toLowerCase() || '';
            
            if (name.includes(searchTerm) || message.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    async startPrivateChat(friendId) {
        if (!chatManager) {
            console.error('❌ ChatManager not initialized');
            return;
        }
        
        try {
            await chatManager.startPrivateChat(friendId);
            
            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebarOverlay');
                if (sidebar) sidebar.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
            }
        } catch (error) {
            console.error('❌ Error starting private chat:', error);
            this.showNotification('Failed to start chat: ' + error.message, 'error');
        }
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

let appController;
if (typeof window !== 'undefined') {
    appController = new AppController();
    window.appController = appController;
    window.startPrivateChat = (friendId) => appController.startPrivateChat(friendId);
    window.respondToFriendRequest = (fromUserId, status) => appController.respondToFriendRequest(fromUserId, status);
}
