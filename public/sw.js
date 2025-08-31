// Service Worker for Riders Luxury PWA
// Provides offline functionality, caching, and background sync

const CACHE_NAME = 'riders-luxury-v1.0.0';
const STATIC_CACHE = 'riders-static-v1.0.0';
const DYNAMIC_CACHE = 'riders-dynamic-v1.0.0';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/rides.js',
  '/js/bookings.js',
  '/js/ui.js',
  '/js/pwa.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32x32.png',
  '/icons/favicon-16x16.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  '/api/rides/search',
  '/api/users/profile',
  '/api/auth/me'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker: Static assets cached');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('❌ Service Worker: Failed to cache static assets', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        const deletePromises = cacheNames
          .filter((cacheName) => {
            return cacheName !== STATIC_CACHE && 
                   cacheName !== DYNAMIC_CACHE &&
                   cacheName.startsWith('riders-');
          })
          .map((cacheName) => {
            console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          });
        
        return Promise.all(deletePromises);
      })
      .then(() => {
        console.log('✅ Service Worker: Activated and ready');
        return self.clients.claim(); // Take control of all pages
      })
  );
});

// Fetch event - serve cached content and implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    handleFetch(request)
  );
});

async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // Strategy 1: Cache First for static assets
    if (isStaticAsset(url)) {
      return await cacheFirst(request);
    }
    
    // Strategy 2: Network First for API calls
    if (isAPICall(url)) {
      return await networkFirst(request);
    }
    
    // Strategy 3: Stale While Revalidate for other resources
    return await staleWhileRevalidate(request);
    
  } catch (error) {
    console.error('🚫 Service Worker: Fetch failed:', error);
    
    // Return offline fallback if available
    return await getOfflineFallback(request);
  }
}

// Cache First Strategy - for static assets
async function cacheFirst(request) {
  const cached = await caches.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('🚫 Cache First failed:', error);
    throw error;
  }
}

// Network First Strategy - for API calls and dynamic content
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('🌐 Network failed, trying cache:', request.url);
    
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    throw error;
  }
}

// Stale While Revalidate Strategy - for other resources
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);
  
  // Fetch in background to update cache
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch((error) => {
    console.log('🔄 Background fetch failed:', error);
  });
  
  // Return cached version immediately if available
  if (cached) {
    return cached;
  }
  
  // Wait for network if no cache
  return await fetchPromise;
}

// Helper function to determine if URL is a static asset
function isStaticAsset(url) {
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2'];
  const pathname = url.pathname.toLowerCase();
  
  return staticExtensions.some(ext => pathname.endsWith(ext)) ||
         pathname === '/' ||
         pathname === '/index.html' ||
         pathname === '/manifest.json' ||
         url.hostname === 'fonts.googleapis.com' ||
         url.hostname === 'fonts.gstatic.com' ||
         url.hostname === 'cdnjs.cloudflare.com';
}

// Helper function to determine if URL is an API call
function isAPICall(url) {
  return url.pathname.startsWith('/api/') ||
         API_CACHE_PATTERNS.some(pattern => url.pathname.includes(pattern));
}

// Get offline fallback page
async function getOfflineFallback(request) {
  const url = new URL(request.url);
  
  // Return cached main page for navigation requests
  if (request.mode === 'navigate') {
    const cached = await caches.match('/');
    if (cached) {
      return cached;
    }
  }
  
  // Return generic offline response
  return new Response(
    JSON.stringify({
      success: false,
      message: 'You are currently offline. Please check your internet connection.',
      offline: true
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    }
  );
}

// Background Sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-bookings') {
    event.waitUntil(syncBookings());
  }
  
  if (event.tag === 'background-sync-rides') {
    event.waitUntil(syncRides());
  }
});

// Sync offline bookings when back online
async function syncBookings() {
  try {
    console.log('🔄 Syncing offline bookings...');
    
    // Get offline bookings from IndexedDB or localStorage
    const offlineBookings = await getOfflineBookings();
    
    for (const booking of offlineBookings) {
      try {
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${booking.token}`
          },
          body: JSON.stringify(booking.data)
        });
        
        if (response.ok) {
          console.log('✅ Booking synced successfully:', booking.id);
          await removeOfflineBooking(booking.id);
        }
      } catch (error) {
        console.error('❌ Failed to sync booking:', booking.id, error);
      }
    }
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// Sync offline ride offers when back online
async function syncRides() {
  try {
    console.log('🔄 Syncing offline ride offers...');
    
    const offlineRides = await getOfflineRides();
    
    for (const ride of offlineRides) {
      try {
        const response = await fetch('/api/rides', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ride.token}`
          },
          body: JSON.stringify(ride.data)
        });
        
        if (response.ok) {
          console.log('✅ Ride offer synced successfully:', ride.id);
          await removeOfflineRide(ride.id);
        }
      } catch (error) {
        console.error('❌ Failed to sync ride offer:', ride.id, error);
      }
    }
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// Push notifications for ride updates
self.addEventListener('push', (event) => {
  console.log('📱 Service Worker: Push notification received');
  
  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (error) {
      data = { title: 'Riders Luxury', body: event.data.text() };
    }
  }
  
  const options = {
    title: data.title || 'Riders Luxury',
    body: data.body || 'You have a new update',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    image: data.image,
    data: data.data || {},
    actions: [
      {
        action: 'view',
        title: 'View Details',
        icon: '/icons/action-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/action-dismiss.png'
      }
    ],
    tag: data.tag || 'general',
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    vibrate: data.vibrate || [200, 100, 200],
    timestamp: Date.now()
  };
  
  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Service Worker: Notification clicked');
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  if (action === 'dismiss') {
    return;
  }
  
  let url = '/';
  
  if (action === 'view' && data.url) {
    url = data.url;
  } else if (data.type === 'booking') {
    url = '/?bookings=true';
  } else if (data.type === 'ride') {
    url = '/?search=true';
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(url.split('?')[0]) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Helper functions for offline storage (to be implemented with IndexedDB)
async function getOfflineBookings() {
  // Implementation would use IndexedDB to store offline bookings
  return [];
}

async function removeOfflineBooking(id) {
  // Implementation would remove booking from IndexedDB
  console.log('Removing offline booking:', id);
}

async function getOfflineRides() {
  // Implementation would use IndexedDB to store offline ride offers
  return [];
}

async function removeOfflineRide(id) {
  // Implementation would remove ride offer from IndexedDB
  console.log('Removing offline ride:', id);
}

// Cache size management
async function cleanupOldCache() {
  const cache = await caches.open(DYNAMIC_CACHE);
  const requests = await cache.keys();
  
  // Remove old entries if cache is too large (keep last 50 entries)
  if (requests.length > 50) {
    const toDelete = requests.slice(0, requests.length - 50);
    await Promise.all(toDelete.map(request => cache.delete(request)));
  }
}

// Periodic cache cleanup
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEANUP_CACHE') {
    event.waitUntil(cleanupOldCache());
  }
});

// Skip waiting when new service worker is installed
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('🚗 Riders Luxury Service Worker loaded successfully');
