// Momentum - Service Worker
// Provides offline support and background synchronization

const CACHE_NAME = 'momentum-v1.0.0';
const OFFLINE_URL = 'offline.html';

// Assets to cache on install
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/tasks.html',
    '/settings.html',
    '/summary.html',
    '/about.html',
    '/css/style.css',
    '/css/animations.css',
    '/js/app.js',
    '/js/tasks.js',
    '/js/notifications.js',
    '/js/storage.js',
    '/icons/icon-72x72.png',
    '/icons/icon-96x96.png',
    '/icons/icon-128x128.png',
    '/icons/icon-144x144.png',
    '/icons/icon-152x152.png',
    '/icons/icon-192x192.png',
    '/icons/icon-384x384.png',
    '/icons/icon-512x512.png',
    '/manifest.json'
];

// Install event - cache assets
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching app shell');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                console.log('Service Worker: Skip waiting');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Cache failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log('Service Worker: Claiming clients');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }
    
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // For HTML requests, try network first, then cache
    if (event.request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Cache the response for future use
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Network failed, try cache
                    return caches.match(event.request)
                        .then(cachedResponse => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }
                            // If not in cache, show offline page
                            return caches.match(OFFLINE_URL);
                        });
                })
        );
        return;
    }
    
    // For other assets (CSS, JS, images), try cache first, then network
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // Update cache in background
                    fetch(event.request)
                        .then(response => {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, responseClone);
                            });
                        })
                        .catch(() => {
                            // Network failed, keep using cached version
                        });
                    
                    return cachedResponse;
                }
                
                // Not in cache, fetch from network
                return fetch(event.request)
                    .then(response => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Cache the response
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseClone);
                        });
                        
                        return response;
                    })
                    .catch(() => {
                        // Network failed and not in cache
                        // For CSS/JS, return empty response rather than error
                        if (event.request.url.includes('.css')) {
                            return new Response('', {
                                headers: { 'Content-Type': 'text/css' }
                            });
                        }
                        
                        if (event.request.url.includes('.js')) {
                            return new Response('console.log("Offline mode");', {
                                headers: { 'Content-Type': 'application/javascript' }
                            });
                        }
                        
                        // For images, return a placeholder
                        if (event.request.url.includes('.png') || 
                            event.request.url.includes('.jpg') ||
                            event.request.url.includes('.svg')) {
                            return new Response(
                                '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#667eea" opacity="0.1"/><circle cx="50" cy="50" r="45" fill="#667eea" opacity="0.1"/><path d="M50 20 L50 80 M20 50 L80 50" stroke="#667eea" stroke-width="8" stroke-linecap="round"/><circle cx="50" cy="50" r="15" fill="#667eea"/></svg>',
                                {
                                    headers: { 'Content-Type': 'image/svg+xml' }
                                }
                            );
                        }
                        
                        // Default fallback
                        return new Response('Offline', {
                            status: 408,
                            headers: { 'Content-Type': 'text/plain' }
                        });
                    });
            })
    );
});

// Background sync for offline data
self.addEventListener('sync', event => {
    console.log('Service Worker: Background sync:', event.tag);
    
    if (event.tag === 'sync-tasks') {
        event.waitUntil(syncTasks());
    }
});

// Sync tasks when back online
async function syncTasks() {
    // This would sync with a backend server if you had one
    // For now, just log that sync was attempted
    console.log('Service Worker: Syncing tasks...');
    
    // Check if there's any offline data to sync
    const offlineTasks = await getOfflineTasks();
    
    if (offlineTasks.length > 0) {
        console.log(`Service Worker: ${offlineTasks.length} tasks to sync`);
        
        // In a real app, you would send these to your backend
        // For this PWA, we just clear the offline queue
        clearOfflineTasks();
        
        // Show notification
        self.registration.showNotification('Tasks Synced', {
            body: `${offlineTasks.length} tasks synchronized`,
            icon: '/icons/icon-192x192.png',
            tag: 'sync-complete'
        });
    }
}

// Helper functions for offline data management
async function getOfflineTasks() {
    // Get tasks from IndexedDB or localStorage
    // For simplicity, we'll use a custom event to get data from the page
    const clients = await self.clients.matchAll();
    
    for (const client of clients) {
        try {
            const response = await client.postMessage({
                type: 'GET_OFFLINE_TASKS'
            });
            return response || [];
        } catch (error) {
            console.error('Error getting offline tasks:', error);
        }
    }
    
    return [];
}

function clearOfflineTasks() {
    // Clear offline tasks queue
    // In a real implementation, this would clear from IndexedDB
    console.log('Service Worker: Clearing offline tasks queue');
}

// Push notification handling
self.addEventListener('push', event => {
    console.log('Service Worker: Push received');
    
    let data = {};
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (error) {
            data = {
                title: 'Momentum',
                body: event.data.text() || 'New notification',
                icon: '/icons/icon-192x192.png'
            };
        }
    }
    
    const options = {
        body: data.body || 'New notification from Momentum',
        icon: data.icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        data: data.data || {},
        tag: data.tag || 'momentum-notification',
        requireInteraction: data.requireInteraction || false,
        actions: data.actions || []
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'Momentum', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Notification clicked');
    
    event.notification.close();
    
    const notificationData = event.notification.data;
    const action = event.action;
    
    // Handle notification actions
    if (action === 'complete') {
        // Mark task as complete
        handleTaskAction('complete', notificationData.taskId);
    } else if (action === 'skip') {
        // Skip task
        handleTaskAction('skip', notificationData.taskId);
    } else if (action === 'snooze') {
        // Snooze alarm
        handleAlarmAction('snooze');
    } else if (action === 'dismiss') {
        // Dismiss alarm
        handleAlarmAction('dismiss');
    } else {
        // Default: focus or open the app
        event.waitUntil(
            clients.matchAll({
                type: 'window',
                includeUncontrolled: true
            }).then(clientList => {
                // Check if there's already a window/tab open
                for (const client of clientList) {
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                
                // If not, open a new window
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
        );
    }
});

// Handle task actions from notifications
function handleTaskAction(action, taskId) {
    console.log(`Service Worker: Handling task ${action} for task ${taskId}`);
    
    // Send message to all clients
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'TASK_ACTION',
                action: action,
                taskId: taskId
            });
        });
    });
}

// Handle alarm actions from notifications
function handleAlarmAction(action) {
    console.log(`Service Worker: Handling alarm ${action}`);
    
    // Send message to all clients
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'ALARM_ACTION',
                action: action
            });
        });
    });
}

// Message handling from the page
self.addEventListener('message', event => {
    console.log('Service Worker: Message received:', event.data);
    
    const { type, data } = event.data;
    
    switch (type) {
        case 'CACHE_ASSETS':
            cacheAdditionalAssets(data.assets);
            break;
            
        case 'GET_OFFLINE_TASKS':
            // Return offline tasks to the page
            getOfflineTasksForPage(event);
            break;
            
        case 'SYNC_NOW':
            // Trigger immediate sync
            syncTasks();
            break;
            
        case 'CLEAR_CACHE':
            // Clear specific cache entries
            clearCacheEntries(data.urls);
            break;
    }
});

// Cache additional assets on demand
async function cacheAdditionalAssets(assets) {
    try {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(assets);
        console.log(`Service Worker: Cached ${assets.length} additional assets`);
    } catch (error) {
        console.error('Service Worker: Error caching additional assets:', error);
    }
}

// Get offline tasks for the page
async function getOfflineTasksForPage(event) {
    // In a real implementation, this would get from IndexedDB
    // For now, return empty array
    event.ports[0].postMessage([]);
}

// Clear specific cache entries
async function clearCacheEntries(urls) {
    try {
        const cache = await caches.open(CACHE_NAME);
        
        for (const url of urls) {
            await cache.delete(url);
        }
        
        console.log(`Service Worker: Cleared ${urls.length} cache entries`);
    } catch (error) {
        console.error('Service Worker: Error clearing cache:', error);
    }
}

// Periodic sync (if supported)
if ('periodicSync' in self.registration) {
    self.addEventListener('periodicsync', event => {
        if (event.tag === 'daily-sync') {
            console.log('Service Worker: Periodic daily sync');
            event.waitUntil(syncTasks());
        }
    });
}

// Offline page fallback
async function getOfflinePage() {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(OFFLINE_URL);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // Create a simple offline page
    return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Momentum - Offline</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-align: center;
                    padding: 20px;
                }
                .offline-icon {
                    font-size: 4rem;
                    margin-bottom: 20px;
                }
                h1 {
                    font-size: 2rem;
                    margin-bottom: 10px;
                }
                p {
                    font-size: 1.2rem;
                    opacity: 0.9;
                    margin-bottom: 30px;
                }
                .features {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    padding: 20px;
                    margin-top: 20px;
                    max-width: 400px;
                }
                .features h3 {
                    margin-top: 0;
                }
                .features ul {
                    text-align: left;
                    padding-left: 20px;
                }
                .features li {
                    margin-bottom: 10px;
                }
            </style>
        </head>
        <body>
            <div class="offline-icon">📱</div>
            <h1>You're Offline</h1>
            <p>Momentum is working in offline mode.</p>
            
            <div class="features">
                <h3>Available Offline:</h3>
                <ul>
                    <li>View your tasks and schedule</li>
                    <li>Mark tasks as complete</li>
                    <li>Skip tasks with reasons</li>
                    <li>View your progress and streaks</li>
                    <li>Access settings</li>
                </ul>
                <p><small>Changes will sync when you're back online.</small></p>
            </div>
            
            <script>
                // Try to reconnect
                window.addEventListener('online', () => {
                    window.location.reload();
                });
                
                // Check connection every 10 seconds
                setInterval(() => {
                    if (navigator.onLine) {
                        window.location.reload();
                    }
                }, 10000);
            </script>
        </body>
        </html>
        `,
        {
            headers: {
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache'
            }
        }
    );
}

console.log('Service Worker: Loaded successfully');
