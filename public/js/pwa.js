// PWA Module
// Handles Progressive Web App functionality, service worker, and offline capabilities

const PWA = {
  // State
  state: {
    isInstalled: false,
    isOnline: navigator.onLine,
    updateAvailable: false,
    deferredPrompt: null,
    swRegistration: null
  },
  
  // Initialize PWA features
  init() {
    this.registerServiceWorker();
    this.initInstallPrompt();
    this.initOnlineStatus();
    this.initUpdateHandler();
    this.initShortcuts();
    console.log('📱 PWA module initialized');
  },
  
  // Register service worker
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return;
    }
    
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      this.state.swRegistration = registration;
      console.log('✅ Service Worker registered successfully');
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        this.handleServiceWorkerUpdate(registration);
      });
      
      // Check if service worker is controlling the page
      if (navigator.serviceWorker.controller) {
        console.log('🔄 Service Worker is controlling the page');
      }
      
      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event);
      });
      
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  },
  
  // Handle service worker updates
  handleServiceWorkerUpdate(registration) {
    const newWorker = registration.installing;
    
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // New update available
        this.state.updateAvailable = true;
        this.showUpdateNotification();
      }
    });
  },
  
  // Handle service worker messages
  handleServiceWorkerMessage(event) {
    if (event.data && event.data.type) {
      switch (event.data.type) {
        case 'CACHE_UPDATED':
          console.log('📦 Cache updated');
          break;
        case 'OFFLINE_FALLBACK':
          this.showOfflineMessage();
          break;
        default:
          console.log('📨 SW Message:', event.data);
      }
    }
  },
  
  // Show update notification
  showUpdateNotification() {
    const updateBanner = document.createElement('div');
    updateBanner.className = 'update-banner glass-card';
    updateBanner.innerHTML = `
      <div class="update-content">
        <div class="update-icon">
          <i class="fas fa-download"></i>
        </div>
        <div class="update-text">
          <h4>Update Available</h4>
          <p>A new version of Riders Luxury is available</p>
        </div>
        <div class="update-actions">
          <button class="btn btn-primary btn-small" onclick="PWA.applyUpdate()">
            Update Now
          </button>
          <button class="btn btn-ghost btn-small" onclick="PWA.dismissUpdate()">
            Later
          </button>
        </div>
      </div>
    `;
    
    updateBanner.style.cssText = `
      position: fixed;
      top: 90px;
      left: 1rem;
      right: 1rem;
      z-index: 2000;
      padding: 1rem;
      border-radius: 12px;
      animation: slideDown 0.3s ease-out;
    `;
    
    document.body.appendChild(updateBanner);
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (document.body.contains(updateBanner)) {
        this.dismissUpdate();
      }
    }, 10000);
  },
  
  // Apply service worker update
  applyUpdate() {
    if (this.state.swRegistration && this.state.swRegistration.waiting) {
      // Tell the waiting service worker to skip waiting
      this.state.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload the page to let the new service worker take control
      window.location.reload();
    }
  },
  
  // Dismiss update notification
  dismissUpdate() {
    const updateBanner = document.querySelector('.update-banner');
    if (updateBanner) {
      updateBanner.style.animation = 'slideUp 0.3s ease-out';
      setTimeout(() => {
        if (document.body.contains(updateBanner)) {
          document.body.removeChild(updateBanner);
        }
      }, 300);
    }
  },
  
  // Initialize install prompt
  initInstallPrompt() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('💾 Install prompt available');
      
      // Prevent the default mini-infobar from appearing
      e.preventDefault();
      
      // Store the event for later use
      this.state.deferredPrompt = e;
      
      // Show custom install prompt
      this.showInstallPrompt();
    });
    
    // Listen for app installation
    window.addEventListener('appinstalled', () => {
      console.log('✅ App was installed');
      this.state.isInstalled = true;
      this.hideInstallPrompt();
      App.showToast('Riders Luxury installed successfully!', 'success');
      
      // Clean up
      this.state.deferredPrompt = null;
    });
    
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone || 
        document.referrer.includes('android-app://')) {
      this.state.isInstalled = true;
      console.log('📱 App is already installed');
    }
  },
  
  // Show install prompt
  showInstallPrompt() {
    if (this.state.isInstalled) return;
    
    const installPrompt = document.getElementById('installPrompt');
    if (installPrompt) {
      installPrompt.classList.add('show');
      
      // Auto-hide after 15 seconds
      setTimeout(() => {
        this.hideInstallPrompt();
      }, 15000);
    }
  },
  
  // Hide install prompt
  hideInstallPrompt() {
    const installPrompt = document.getElementById('installPrompt');
    if (installPrompt) {
      installPrompt.classList.remove('show');
    }
  },
  
  // Install PWA
  async installPWA() {
    if (!this.state.deferredPrompt) {
      App.showToast('Installation not available', 'error');
      return;
    }
    
    try {
      // Show the install prompt
      this.state.deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await this.state.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('👍 User accepted the install prompt');
        App.showToast('Installing Riders Luxury...', 'info');
      } else {
        console.log('👎 User dismissed the install prompt');
      }
      
      // Clear the deferredPrompt
      this.state.deferredPrompt = null;
      this.hideInstallPrompt();
      
    } catch (error) {
      console.error('Install failed:', error);
      App.showToast('Installation failed', 'error');
    }
  },
  
  // Dismiss install prompt
  dismissInstall() {
    this.hideInstallPrompt();
    
    // Don't show again for 7 days
    localStorage.setItem('installPromptDismissed', Date.now() + (7 * 24 * 60 * 60 * 1000));
  },
  
  // Check if install prompt should be shown
  shouldShowInstallPrompt() {
    if (this.state.isInstalled) return false;
    
    const dismissedUntil = localStorage.getItem('installPromptDismissed');
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) {
      return false;
    }
    
    return true;
  },
  
  // Initialize online/offline status
  initOnlineStatus() {
    window.addEventListener('online', () => {
      this.state.isOnline = true;
      this.showOnlineStatus();
      this.syncOfflineData();
    });
    
    window.addEventListener('offline', () => {
      this.state.isOnline = false;
      this.showOfflineStatus();
    });
    
    // Initial status
    if (!this.state.isOnline) {
      this.showOfflineStatus();
    }
  },
  
  // Show online status
  showOnlineStatus() {
    App.showToast('You\'re back online!', 'success', 3000);
    
    // Remove offline indicator
    const offlineIndicator = document.querySelector('.offline-indicator');
    if (offlineIndicator) {
      offlineIndicator.remove();
    }
  },
  
  // Show offline status
  showOfflineStatus() {
    // Create offline indicator
    const offlineIndicator = document.createElement('div');
    offlineIndicator.className = 'offline-indicator';
    offlineIndicator.innerHTML = `
      <div class="offline-content">
        <i class="fas fa-wifi-slash"></i>
        <span>You're offline</span>
      </div>
    `;
    
    offlineIndicator.style.cssText = `
      position: fixed;
      top: 80px;
      left: 0;
      right: 0;
      background: rgba(239, 68, 68, 0.9);
      color: white;
      padding: 0.75rem;
      text-align: center;
      z-index: 1500;
      font-size: 0.875rem;
      backdrop-filter: blur(10px);
    `;
    
    document.body.appendChild(offlineIndicator);
    
    App.showToast('You\'re offline. Some features may be limited.', 'warning', 5000);
  },
  
  // Show offline message
  showOfflineMessage() {
    App.showToast('This feature requires an internet connection', 'warning');
  },
  
  // Sync offline data when back online
  async syncOfflineData() {
    if (!this.state.swRegistration) return;
    
    try {
      // Trigger background sync
      await this.state.swRegistration.sync.register('background-sync-bookings');
      await this.state.swRegistration.sync.register('background-sync-rides');
      
      console.log('🔄 Background sync registered');
      
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  },
  
  // Initialize update handler
  initUpdateHandler() {
    // Check for updates every 30 minutes
    setInterval(() => {
      if (this.state.swRegistration) {
        this.state.swRegistration.update();
      }
    }, 30 * 60 * 1000);
    
    // Check for updates when page becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.state.swRegistration) {
        this.state.swRegistration.update();
      }
    });
  },
  
  // Initialize app shortcuts
  initShortcuts() {
    // Handle shortcut navigation
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.has('search')) {
      App.showSection('search');
    } else if (urlParams.has('offer')) {
      App.showSection('offer');
    } else if (urlParams.has('bookings')) {
      App.showSection('bookings');
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Only handle shortcuts when no input is focused
      if (document.activeElement.tagName === 'INPUT' || 
          document.activeElement.tagName === 'TEXTAREA' ||
          document.activeElement.tagName === 'SELECT') {
        return;
      }
      
      // Alt + number shortcuts
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            App.showSection('home');
            break;
          case '2':
            e.preventDefault();
            App.showSection('search');
            break;
          case '3':
            e.preventDefault();
            App.showSection('offer');
            break;
          case '4':
            e.preventDefault();
            App.showSection('bookings');
            break;
          case '5':
            e.preventDefault();
            App.showSection('profile');
            break;
        }
      }
      
      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        App.showSection('search');
        setTimeout(() => {
          const searchInput = document.getElementById('searchPickup');
          if (searchInput) searchInput.focus();
        }, 100);
      }
    });
  },
  
  // Enable push notifications
  async enableNotifications() {
    if (!('Notification' in window)) {
      App.showToast('Notifications not supported', 'error');
      return false;
    }
    
    if (Notification.permission === 'denied') {
      App.showToast('Notifications are blocked. Please enable them in browser settings.', 'error');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      await this.subscribeToPush();
      return true;
    }
    
    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      App.showToast('Notifications enabled!', 'success');
      await this.subscribeToPush();
      return true;
    } else {
      App.showToast('Notifications permission denied', 'error');
      return false;
    }
  },
  
  // Subscribe to push notifications
  async subscribeToPush() {
    if (!this.state.swRegistration) {
      console.error('Service Worker not registered');
      return;
    }
    
    try {
      // Check if already subscribed
      const existingSubscription = await this.state.swRegistration.pushManager.getSubscription();
      
      if (existingSubscription) {
        console.log('Already subscribed to push notifications');
        return existingSubscription;
      }
      
      // Subscribe to push notifications
      const subscription = await this.state.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          'BEl62iUYgUivxIkv69yViEuiBIa40HI80NklpJMVTqZSWOMpq2g9WbY1v_n47oEhzwZu5zKfYELHkKj2DGWPOxo' // Replace with your VAPID public key
        )
      });
      
      console.log('✅ Subscribed to push notifications');
      
      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
      
      return subscription;
      
    } catch (error) {
      console.error('Push subscription failed:', error);
      App.showToast('Failed to enable notifications', 'error');
    }
  },
  
  // Send subscription to server
  async sendSubscriptionToServer(subscription) {
    try {
      if (!App.state.isAuthenticated) return;
      
      await Auth.apiRequest('/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription)
      });
      
      console.log('📤 Subscription sent to server');
      
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
    }
  },
  
  // Convert VAPID key
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  },
  
  // Share content
  async shareContent(data) {
    if (navigator.share) {
      try {
        await navigator.share(data);
        console.log('✅ Content shared successfully');
        return true;
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error);
          App.showToast('Sharing failed', 'error');
        }
        return false;
      }
    } else {
      // Fallback: copy to clipboard
      const shareText = `${data.title}\n${data.text}\n${data.url}`;
      await UI.copyToClipboard(shareText);
      return true;
    }
  },
  
  // Add to home screen (for iOS)
  showIOSInstallPrompt() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone;
    
    if (isIOS && !isStandalone) {
      const prompt = document.createElement('div');
      prompt.className = 'ios-install-prompt glass-card';
      prompt.innerHTML = `
        <div class="ios-prompt-content">
          <h3>Install Riders Luxury</h3>
          <p>Add this app to your home screen for quick access</p>
          <div class="ios-instructions">
            <div class="ios-step">
              <i class="fas fa-share"></i>
              <span>Tap the share button</span>
            </div>
            <div class="ios-step">
              <i class="fas fa-plus-square"></i>
              <span>Then "Add to Home Screen"</span>
            </div>
          </div>
          <button class="btn btn-ghost" onclick="this.closest('.ios-install-prompt').remove()">
            Got it
          </button>
        </div>
      `;
      
      prompt.style.cssText = `
        position: fixed;
        bottom: 1rem;
        left: 1rem;
        right: 1rem;
        padding: 1rem;
        z-index: 2000;
        border-radius: 12px;
        animation: slideUp 0.3s ease-out;
      `;
      
      document.body.appendChild(prompt);
      
      // Auto-remove after 15 seconds
      setTimeout(() => {
        if (document.body.contains(prompt)) {
          prompt.remove();
        }
      }, 15000);
    }
  },
  
  // Cache important resources
  async cacheResources(resources) {
    if (!this.state.swRegistration) return;
    
    try {
      // Send message to service worker to cache resources
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CACHE_RESOURCES',
          resources
        });
      }
    } catch (error) {
      console.error('Failed to cache resources:', error);
    }
  },
  
  // Get app info
  getAppInfo() {
    return {
      isInstalled: this.state.isInstalled,
      isOnline: this.state.isOnline,
      updateAvailable: this.state.updateAvailable,
      swRegistered: !!this.state.swRegistration,
      notificationsEnabled: Notification.permission === 'granted'
    };
  }
};

// Add CSS for PWA elements
const pwaStyle = document.createElement('style');
pwaStyle.textContent = `
  @keyframes slideDown {
    from {
      transform: translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  .update-content,
  .ios-prompt-content {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .update-text,
  .ios-prompt-content {
    flex: 1;
  }
  
  .update-text h4 {
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
  }
  
  .update-text p {
    margin: 0;
    font-size: 0.875rem;
    opacity: 0.8;
  }
  
  .update-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .ios-instructions {
    margin: 1rem 0;
  }
  
  .ios-step {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0.5rem 0;
    font-size: 0.875rem;
  }
  
  .offline-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
`;

document.head.appendChild(pwaStyle);

// Initialize PWA when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  PWA.init();
  
  // Show iOS install prompt after 5 seconds if applicable
  setTimeout(() => {
    PWA.showIOSInstallPrompt();
  }, 5000);
});

// Global functions for PWA
window.installPWA = PWA.installPWA.bind(PWA);
window.dismissInstall = PWA.dismissInstall.bind(PWA);

// Export for global access
window.PWA = PWA;

console.log('📱 PWA module loaded');
