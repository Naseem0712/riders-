// Profile Management Module
// Handles profile editing, photo upload, and user data management

const Profile = {
  currentUser: null,
  profileImage: null,
  contactWindows: new Map(), // Store 12-hour contact windows
  
  // Initialize profile module
  init() {
    this.initEventListeners();
    this.initImageUpload();
    this.loadUserProfile();
    this.checkContactWindows();
    console.log('👤 Profile module initialized');
  },

  // Initialize event listeners
  initEventListeners() {
    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
      profileForm.addEventListener('submit', this.handleProfileUpdate.bind(this));
    }

    // Message input enter key
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendMessage();
        }
      });
    }
  },

  // Initialize image upload
  initImageUpload() {
    const imageInput = document.getElementById('profileImageInput');
    if (imageInput) {
      imageInput.addEventListener('change', this.handleImageUpload.bind(this));
    }
  },

  // Handle image upload
  async handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      App.showToast('Please select a valid image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      App.showToast('Image size should be less than 5MB', 'error');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const profileImage = document.getElementById('profileImage');
        if (profileImage) {
          profileImage.src = e.target.result;
        }
      };
      reader.readAsDataURL(file);
      this.profileImage = file;
      App.showToast('Image selected. Click Save to upload.', 'success');
    } catch (error) {
      console.error('Image upload error:', error);
      App.showToast('Failed to process image', 'error');
    }
  },

  // Load user profile
  async loadUserProfile() {
    if (!Auth.isAuthenticated()) return;
    try {
      const user = Auth.getCurrentUser();
      if (user) {
        this.currentUser = user;
        this.updateProfileDisplay(user);
      }
    } catch (error) {
      console.error('Load profile error:', error);
    }
  },

  // Update profile display
  updateProfileDisplay(user) {
    const elements = {
      profileName: user.name || 'User Name',
      profileMobile: user.mobile || '+91 XXXXX XXXXX',
      totalRides: user.totalRides || 0,
      avgRating: user.rating || '4.8',
      totalEarnings: `₹${user.earnings || 0}`
    };

    Object.keys(elements).forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = elements[id];
      }
    });

    if (user.profileImage) {
      const profileImage = document.getElementById('profileImage');
      if (profileImage) {
        profileImage.src = user.profileImage;
      }
    }
  },

  // Check contact windows
  checkContactWindows() {
    const now = Date.now();
    for (const [rideId, window] of this.contactWindows) {
      if (now > window.expiresAt) {
        this.contactWindows.delete(rideId);
      }
    }
  },

  // Start contact window after ride completion
  startContactWindow(rideId, otherUserId, otherUserName) {
    const window = {
      rideId,
      otherUserId,
      otherUserName,
      startedAt: Date.now(),
      expiresAt: Date.now() + (12 * 60 * 60 * 1000) // 12 hours
    };
    
    this.contactWindows.set(rideId, window);
    App.showToast(`Contact window opened with ${otherUserName} for 12 hours`, 'info');
    this.updateRideHistoryWithChat(rideId);
  },

  // Open chat window
  openChatWindow(rideId) {
    const window = this.contactWindows.get(rideId);
    if (!window) {
      App.showToast('Contact window has expired', 'error');
      return;
    }

    document.getElementById('chatUserName').textContent = window.otherUserName;
    document.getElementById('chatUserStatus').textContent = 'Available for contact';
    this.startChatTimer(window.expiresAt);
    document.getElementById('chatModal').style.display = 'flex';
  },

  // Start chat timer
  startChatTimer(expiresAt) {
    const timerElement = document.getElementById('chatTimer');
    
    const updateTimer = () => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        timerElement.textContent = 'Contact window expired';
        return;
      }
      
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      
      timerElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} remaining`;
    };
    
    updateTimer();
    setInterval(updateTimer, 1000);
  },

  // Send message
  sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    this.addMessageToChat('sent', message);
    input.value = '';
    console.log('Message sent:', message);
  },

  // Send quick message
  sendQuickMessage(message) {
    this.addMessageToChat('sent', message);
    console.log('Quick message sent:', message);
  },

  // Add message to chat
  addMessageToChat(type, content) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;
    
    messageDiv.innerHTML = `
      <div class="message-content">
        <p>${content}</p>
        <span class="message-time">${new Date().toLocaleTimeString()}</span>
      </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  },

  // Make voice call
  makeVoiceCall() {
    document.getElementById('callModal').style.display = 'flex';
    document.getElementById('callStatus').textContent = 'Connecting...';
    
    setTimeout(() => {
      document.getElementById('callStatus').textContent = 'Connected';
      document.getElementById('callTimer').style.display = 'block';
      this.startCallTimer();
    }, 3000);
  },

  // Start call timer
  startCallTimer() {
    let seconds = 0;
    const timerElement = document.getElementById('callDuration');
    
    const updateTimer = () => {
      seconds++;
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      timerElement.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    this.callInterval = setInterval(updateTimer, 1000);
  },

  // End call
  endCall() {
    if (this.callInterval) {
      clearInterval(this.callInterval);
    }
    document.getElementById('callModal').style.display = 'none';
  },

  // Handle profile update
  async handleProfileUpdate(e) {
    e.preventDefault();
    
    if (!Auth.isAuthenticated()) {
      App.showToast('Please login first', 'error');
      return;
    }

    const formData = new FormData();
    
    // Add form fields
    const fields = ['name', 'email', 'bio', 'location'];
    fields.forEach(field => {
      const element = document.getElementById(field);
      if (element && element.value) {
        formData.append(field, element.value);
      }
    });

    // Add profile image if selected
    if (this.profileImage) {
      formData.append('profileImage', this.profileImage);
    }

    try {
      App.setLoading(true);
      
      // Simulate API call for demo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      App.showToast('Profile updated successfully!', 'success');
      this.profileImage = null; // Reset
      
    } catch (error) {
      console.error('Profile update error:', error);
      App.showToast('Failed to update profile', 'error');
    } finally {
      App.setLoading(false);
    }
  }
};

// Global functions for HTML onclick events
window.showEditProfile = () => {
  document.getElementById('profileDashboard').style.display = 'none';
  document.getElementById('editProfileForm').style.display = 'block';
};

window.hideEditProfile = () => {
  document.getElementById('profileDashboard').style.display = 'block';
  document.getElementById('editProfileForm').style.display = 'none';
};

window.saveProfile = () => {
  Profile.handleProfileUpdate({ preventDefault: () => {} });
};

window.showPersonalInfo = () => {
  App.showToast('Personal Information feature coming soon!', 'info');
};

window.showVehicleManagement = () => {
  App.showSection('vehicle');
};

window.showRideHistory = () => {
  App.showToast('Ride History feature coming soon!', 'info');
};

window.showPaymentMethods = () => {
  App.showToast('Payment Methods feature coming soon!', 'info');
};

window.showNotificationSettings = () => {
  App.showToast('Notification Settings feature coming soon!', 'info');
};

window.showPrivacySettings = () => {
  App.showToast('Privacy Settings feature coming soon!', 'info');
};

window.showHelpSupport = () => {
  App.showToast('Help & Support feature coming soon!', 'info');
};

window.sendMessage = () => Profile.sendMessage();
window.sendQuickMessage = (msg) => Profile.sendQuickMessage(msg);
window.makeVoiceCall = () => Profile.makeVoiceCall();
window.makeVideoCall = () => Profile.makeVoiceCall(); // Same as voice for now
window.endCall = () => Profile.endCall();
window.toggleMute = () => App.showToast('Mute toggled', 'info');
window.toggleSpeaker = () => App.showToast('Speaker toggled', 'info');
window.selectAttachment = () => document.getElementById('attachmentInput').click();

window.hideChatModal = () => {
  document.getElementById('chatModal').style.display = 'none';
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Profile.init());
} else {
  Profile.init();
}