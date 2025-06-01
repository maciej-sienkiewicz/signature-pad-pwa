const CACHE_NAME = 'signature-pad-v1';
const urlsToCache = [
    '/',
    '/static/css/main.css',
    '/static/js/main.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/sounds/notification.mp3'
];

// Install event - cache resources
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Clone the request
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(response => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    // Don't cache API calls
                    if (!event.request.url.includes('/api/')) {
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                    }

                    return response;
                });
            })
            .catch(() => {
                // Offline fallback
                if (event.request.destination === 'document') {
                    return caches.match('/');
                }
            })
    );
});

// Handle background sync for offline signatures
self.addEventListener('sync', event => {
    if (event.tag === 'sync-signatures') {
        event.waitUntil(syncSignatures());
    }
});

async function syncSignatures() {
    // Get pending signatures from IndexedDB
    const pendingSignatures = await getPendingSignatures();

    for (const signature of pendingSignatures) {
        try {
            const response = await fetch('/api/signatures', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(signature)
            });

            if (response.ok) {
                await removePendingSignature(signature.id);
            }
        } catch (error) {
            console.error('Failed to sync signature:', error);
        }
    }
}

// Placeholder functions for IndexedDB operations
async function getPendingSignatures() {
    // Implementation would retrieve from IndexedDB
    return [];
}

async function removePendingSignature(id) {
    // Implementation would remove from IndexedDB
}