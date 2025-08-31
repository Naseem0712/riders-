// Notification System Module
// Handles all types of notifications for the app

const Notifications = {
  notifications: [],
  unreadCount: 0,

  // Initialize notification module
  init() {
    this.initEventListeners();
    this.requestPermission();
    this.loadNotifications();
    this.startPolling();
    console.log('🔔 Notification module initialized');
  },

  // Initialize event listeners
  initEventListeners() {
    // Notification bell click
    const notificationBell = document.getElementById('notificationBell');
    if (notificationBell) {
      notificationBell.addEventListener('click', this.toggleNotificationPanel.bind(this));
    }

    // Mark all as read
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    if (markAllReadBtn) {
      markAllReadBtn.addEventListener('click', this.markAllAsRead.bind(this));
    }

    // Clear all notifications
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', this.clearAllNotifications.bind(this));
    }
  },

  // Request notification permission
  async requestPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
      } else {
        console.log('❌ Notification permission denied');
      }
    }
  },

  // Show browser notification
  showBrowserNotification(title, body, icon = '/icons/icon-144x144.png', data = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon,
        badge: '/icons/icon-144x144.png',
        tag: data.type || 'general',
        requireInteraction: data.important || false,
        data
      });

      notification.onclick = () => {
        window.focus();
        if (data.url) {
          window.location.href = data.url;
        } else if (data.action) {
          this.handleNotificationClick(data);
        }
        notification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  },

  // Handle notification click actions
  handleNotificationClick(data) {
    switch (data.type) {
      case 'ride_request':
        App.showSection('bookings');
        break;
      case 'ride_accepted':
        App.showSection('bookings');
        break;
      case 'message':
        if (data.chatId) {
          Chat.openChat(data.chatId, data.senderId, data.senderName);
        }
        break;
      case 'ride_reminder':
        App.showSection('bookings');
        break;
      default:
        App.showSection('notifications');
    }
  },

  // Load notifications from server
  async loadNotifications() {
    if (!Auth.isAuthenticated()) return;

    try {
      const response = await Auth.apiRequest('/notifications');
      const data = await response.json();

      if (data.success) {
        this.notifications = data.data.notifications;
        this.updateNotificationUI();
        this.updateUnreadCount();
      }
    } catch (error) {
      console.error('Load notifications error:', error);
    }
  },

  // Start polling for new notifications
  startPolling() {
    setInterval(() => {
      if (Auth.isAuthenticated()) {
        this.checkForNewNotifications();
      }
    }, 30000); // Check every 30 seconds
  },

  // Check for new notifications
  async checkForNewNotifications() {
    try {
      const response = await Auth.apiRequest('/notifications/unread-count');
      const data = await response.json();

      if (data.success && data.data.count > this.unreadCount) {
        // New notifications available
        this.loadNotifications();
      }
    } catch (error) {
      console.error('Check notifications error:', error);
    }
  },

  // Update notification UI
  updateNotificationUI() {
    const container = document.getElementById('notificationsList');
    if (!container) return;

    if (this.notifications.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-bell fa-3x"></i>
          <h3>No Notifications</h3>
          <p>You're all caught up!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.notifications.map(notification => {
      const timeAgo = this.getTimeAgo(new Date(notification.createdAt));
      const isUnread = !notification.read;

      return `
        <div class="notification-item ${isUnread ? 'unread' : ''}" 
             data-notification-id="${notification._id}"
             onclick="Notifications.handleNotificationClick(${JSON.stringify(notification.data).replace(/"/g, '&quot;')})">
          <div class="notification-icon">
            <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
          </div>
          <div class="notification-content">
            <div class="notification-header">
              <h4>${notification.title}</h4>
              <span class="notification-time">${timeAgo}</span>
            </div>
            <p class="notification-message">${notification.message}</p>
            ${isUnread ? '<div class="unread-indicator"></div>' : ''}
          </div>
          <div class="notification-actions">
            ${isUnread ? `
              <button class="btn-text" onclick="event.stopPropagation(); Notifications.markAsRead('${notification._id}')">
                Mark Read
              </button>
            ` : ''}
            <button class="btn-text delete-btn" onclick="event.stopPropagation(); Notifications.deleteNotification('${notification._id}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  // Get notification icon based on type
  getNotificationIcon(type) {
    const icons = {
      ride_request: 'fa-car',
      ride_accepted: 'fa-check-circle',
      ride_cancelled: 'fa-times-circle',
      message: 'fa-comment',
      payment: 'fa-credit-card',
      ride_reminder: 'fa-clock',
      system: 'fa-info-circle'
    };
    return icons[type] || 'fa-bell';
  },

  // Get time ago string
  getTimeAgo(date) {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  },

  // Update unread count
  updateUnreadCount() {
    this.unreadCount = this.notifications.filter(n => !n.read).length;
    
    const badge = document.getElementById('notificationBadge');
    if (badge) {
      if (this.unreadCount > 0) {
        badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    }
  },

  // Toggle notification panel
  toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (panel) {
      const isVisible = panel.style.display === 'block';
      panel.style.display = isVisible ? 'none' : 'block';
      
      if (!isVisible) {
        this.loadNotifications();
      }
    }
  },

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const response = await Auth.apiRequest(`/notifications/${notificationId}/read`, {
        method: 'PUT'
      });

      if (response.ok) {
        // Update local state
        const notification = this.notifications.find(n => n._id === notificationId);
        if (notification) {
          notification.read = true;
          this.updateNotificationUI();
          this.updateUnreadCount();
        }
      }
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  },

  // Mark all as read
  async markAllAsRead() {
    try {
      const response = await Auth.apiRequest('/notifications/mark-all-read', {
        method: 'PUT'
      });

      if (response.ok) {
        this.notifications.forEach(n => n.read = true);
        this.updateNotificationUI();
        this.updateUnreadCount();
        App.showToast('All notifications marked as read', 'success');
      }
    } catch (error) {
      console.error('Mark all as read error:', error);
      App.showToast('Failed to mark all as read', 'error');
    }
  },

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      const response = await Auth.apiRequest(`/notifications/${notificationId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        this.notifications = this.notifications.filter(n => n._id !== notificationId);
        this.updateNotificationUI();
        this.updateUnreadCount();
      }
    } catch (error) {
      console.error('Delete notification error:', error);
      App.showToast('Failed to delete notification', 'error');
    }
  },

  // Clear all notifications
  async clearAllNotifications() {
    if (!confirm('Are you sure you want to clear all notifications?')) return;

    try {
      const response = await Auth.apiRequest('/notifications/clear-all', {
        method: 'DELETE'
      });

      if (response.ok) {
        this.notifications = [];
        this.updateNotificationUI();
        this.updateUnreadCount();
        App.showToast('All notifications cleared', 'success');
      }
    } catch (error) {
      console.error('Clear all notifications error:', error);
      App.showToast('Failed to clear notifications', 'error');
    }
  },

  // Create notification (for testing)
  async createTestNotification() {
    try {
      const response = await Auth.apiRequest('/notifications/test', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Notification',
          message: 'This is a test notification from the system',
          type: 'system'
        })
      });

      if (response.ok) {
        this.loadNotifications();
        App.showToast('Test notification created', 'success');
      }
    } catch (error) {
      console.error('Create test notification error:', error);
    }
  }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  Notifications.init();
});

// Export for global access
window.Notifications = Notifications;
