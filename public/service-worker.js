const CACHE_NAME = 'fuel-control-cache-v6'; // Incremented cache version
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/index.tsx', // The single, monolithic app file
    // Google Fonts CDN is usually safe to cache
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

self.addEventListener('install', event => {
    self.skipWaiting(); // Force the waiting service worker to become the active service worker.
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache and caching files');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Failed to cache files during install:', error);
            })
    );
});

self.addEventListener('fetch', event => {
    // For navigation requests, always try network first to get the latest version,
    // falling back to cache if offline.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Clone the request because it's a stream and can only be consumed once.
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(
                    response => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
                            return response;
                        }

                        // We don't cache everything, only what's needed.
                        // The initial cache list is the source of truth for offline assets.
                        // Dynamic caching can be added here if needed but can be risky.

                        return response;
                    }
                );
            })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});