// Chat System Module
// Handles messaging between riders and drivers

const Chat = {
  currentChatId: null,
  currentRecipient: null,
  messages: new Map(),
  
  // Initialize chat module
  init() {
    this.initEventListeners();
    this.setupWebSocket();
    console.log('💬 Chat module initialized');
  },

  // Initialize event listeners
  initEventListeners() {
    // Send message form
    const messageForm = document.getElementById('messageForm');
    if (messageForm) {
      messageForm.addEventListener('submit', this.sendMessage.bind(this));
    }

    // Chat input
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage(e);
        }
      });
    }

    // File attachment
    const attachmentInput = document.getElementById('attachmentInput');
    if (attachmentInput) {
      attachmentInput.addEventListener('change', this.handleFileAttachment.bind(this));
    }
  },

  // Setup WebSocket for real-time messaging
  setupWebSocket() {
    // For now, simulate real-time with polling
    // In production, use Socket.IO or WebSocket
    this.messagePollingInterval = setInterval(() => {
      if (this.currentChatId) {
        this.loadMessages(this.currentChatId);
      }
    }, 3000);
  },

  // Start chat with user
  async startChat(recipientId, recipientName, rideId = null) {
    if (!Auth.isAuthenticated()) {
      App.showToast('Please login first', 'error');
      return;
    }

    try {
      App.setLoading(true);

      const response = await Auth.apiRequest('/chat/start', {
        method: 'POST',
        body: JSON.stringify({
          recipientId,
          rideId,
          message: `Hi ${recipientName}! I'm interested in this ride.`
        })
      });

      const data = await response.json();

      if (data.success) {
        this.currentChatId = data.data.chatId;
        this.currentRecipient = { id: recipientId, name: recipientName };
        
        this.showChatModal();
        this.loadMessages(this.currentChatId);
        
        App.showToast(`Chat started with ${recipientName}`, 'success');
      } else {
        App.showToast(data.message || 'Failed to start chat', 'error');
      }
    } catch (error) {
      console.error('Start chat error:', error);
      App.showToast('Failed to start chat. Please try again.', 'error');
    } finally {
      App.setLoading(false);
    }
  },

  // Show chat modal
  showChatModal() {
    const modal = document.getElementById('chatModal');
    if (modal) {
      modal.style.display = 'block';
      
      // Update chat header
      const chatHeader = document.getElementById('chatHeader');
      if (chatHeader && this.currentRecipient) {
        chatHeader.innerHTML = `
          <div class="chat-user-info">
            <img src="/icons/default-avatar.png" alt="Avatar" class="chat-avatar">
            <div class="chat-user-details">
              <h3>${this.currentRecipient.name}</h3>
              <span class="online-status">🟢 Online</span>
            </div>
          </div>
          <div class="chat-actions">
            <button class="btn-secondary" onclick="Chat.makeCall('${this.currentRecipient.id}')">
              <i class="fas fa-phone"></i>
            </button>
            <button class="btn-secondary" onclick="Chat.hideChatModal()">
              <i class="fas fa-times"></i>
            </button>
          </div>
        `;
      }
    }
  },

  // Hide chat modal
  hideChatModal() {
    const modal = document.getElementById('chatModal');
    if (modal) {
      modal.style.display = 'none';
    }
    this.currentChatId = null;
    this.currentRecipient = null;
  },

  // Load messages for chat
  async loadMessages(chatId) {
    try {
      const response = await Auth.apiRequest(`/chat/${chatId}/messages`);
      const data = await response.json();

      if (data.success) {
        this.displayMessages(data.data.messages);
      }
    } catch (error) {
      console.error('Load messages error:', error);
    }
  },

  // Display messages in chat
  displayMessages(messages) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;

    const currentUserId = App.state.user?._id;

    container.innerHTML = messages.map(message => {
      const isOwn = message.sender._id === currentUserId;
      const timestamp = new Date(message.createdAt).toLocaleTimeString();

      return `
        <div class="message ${isOwn ? 'own-message' : 'other-message'}">
          <div class="message-content">
            <p>${message.content}</p>
            ${message.attachment ? `
              <div class="attachment">
                <i class="fas fa-paperclip"></i>
                <a href="${message.attachment.url}" target="_blank">${message.attachment.name}</a>
              </div>
            ` : ''}
          </div>
          <div class="message-meta">
            <span class="message-time">${timestamp}</span>
            ${isOwn ? '<i class="fas fa-check message-status"></i>' : ''}
          </div>
        </div>
      `;
    }).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  },

  // Send message
  async sendMessage(e) {
    if (e) e.preventDefault();
    
    const input = document.getElementById('messageInput');
    const content = input?.value?.trim();
    
    if (!content) return;

    try {
      // Show message immediately (optimistic update)
      this.addMessageToUI(content, true);
      input.value = '';

      // Simulate realistic driver responses
      setTimeout(() => {
        const responses = [
          'Sure, I can help with that! 👍',
          'On my way! ETA 5 minutes 🚗',
          'Thanks for booking with me! 😊',
          'I found your item, will return after drop 📱',
          'Traffic is heavy, might be 10 mins late ⏰',
          'Reached pickup point, please come 📍',
          'Thanks for choosing Riders Luxury! ⭐',
          'Drive safely! See you again 🚗💨'
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        this.addMessageToUI(randomResponse, false);
      }, Math.random() * 2000 + 1000); // 1-3 seconds delay

    } catch (error) {
      console.error('Send message error:', error);
      App.showToast('Failed to send message. Please try again.', 'error');
      this.loadMessages(this.currentChatId);
    }
  },

  // Add message to UI (optimistic update)
  addMessageToUI(content, isOwn) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own-message' : 'other-message'}`;
    messageDiv.innerHTML = `
      <div class="message-content">
        <p>${content}</p>
      </div>
      <div class="message-meta">
        <span class="message-time">${new Date().toLocaleTimeString()}</span>
        ${isOwn ? '<i class="fas fa-clock message-status"></i>' : ''}
      </div>
    `;

    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
  },

  // Handle file attachment
  async handleFileAttachment(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      App.showToast('File size should be less than 10MB', 'error');
      return;
    }

    try {
      App.setLoading(true);
      
      // Upload file (simplified - in production use proper file upload)
      const attachment = {
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file) // Temporary URL
      };

      // Send message with attachment
      const response = await Auth.apiRequest(`/chat/${this.currentChatId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: `📎 Shared ${file.name}`,
          attachment
        })
      });

      if (response.ok) {
        this.loadMessages(this.currentChatId);
      }
    } catch (error) {
      console.error('File attachment error:', error);
      App.showToast('Failed to send attachment', 'error');
    } finally {
      App.setLoading(false);
    }
  },

  // Make call
  makeCall(recipientId) {
    // Open call modal with enhanced functionality
    Profile.makeVoiceCall();
    App.showToast('📞 Connecting to driver...', 'info');
    
    // Simulate call connection
    setTimeout(() => {
      App.showToast('📞 Call connected! You can now talk to your driver', 'success');
    }, 2000);
  },

  // Make video call
  makeVideoCall(recipientId) {
    Profile.makeVideoCall();
    App.showToast('📹 Starting video call...', 'info');
    
    // Simulate video call
    setTimeout(() => {
      App.showToast('📹 Video call active! Perfect for ride coordination', 'success');
    }, 2000);
  },

  // Load user chats
  async loadUserChats() {
    if (!Auth.isAuthenticated()) return;

    try {
      const response = await Auth.apiRequest('/chat/my-chats');
      const data = await response.json();

      if (data.success) {
        this.displayChatList(data.data.chats);
      }
    } catch (error) {
      console.error('Load chats error:', error);
    }
  },

  // Display chat list
  displayChatList(chats) {
    const container = document.getElementById('chatListContainer');
    if (!container) return;

    if (chats.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-comments fa-3x"></i>
          <h3>No Chats Yet</h3>
          <p>Start a conversation by booking a ride</p>
        </div>
      `;
      return;
    }

    container.innerHTML = chats.map(chat => {
      const otherParticipant = chat.participants.find(p => p._id !== App.state.user?._id);
      const lastMessage = chat.lastMessage;
      const lastMessageTime = lastMessage ? new Date(lastMessage.createdAt).toLocaleString() : '';

      return `
        <div class="chat-item" onclick="Chat.openChat('${chat._id}', '${otherParticipant._id}', '${otherParticipant.name}')">
          <div class="chat-avatar">
            <img src="${otherParticipant.profilePicture || '/icons/default-avatar.png'}" alt="Avatar">
          </div>
          <div class="chat-details">
            <div class="chat-header">
              <h4>${otherParticipant.name}</h4>
              <span class="chat-time">${lastMessageTime}</span>
            </div>
            <div class="chat-preview">
              <p>${lastMessage?.content || 'No messages yet'}</p>
              ${chat.unreadCount > 0 ? `<span class="unread-badge">${chat.unreadCount}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  // Open existing chat
  openChat(chatId, recipientId, recipientName) {
    this.currentChatId = chatId;
    this.currentRecipient = { id: recipientId, name: recipientName };
    this.showChatModal();
    this.loadMessages(chatId);
  }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  Chat.init();
});

// Export for global access
window.Chat = Chat;
