const CACHE_NAME = 'fuel-control-cache-v2';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './index.tsx',
    './src/App.tsx',
    './src/types.ts',
    './src/services/geminiService.ts',
    './src/components/Icons.tsx',
    './src/components/EntryModal.tsx',
    './src/components/TripModal.tsx',
    './src/components/MaintenanceModal.tsx',
    './src/components/MonthSummary.tsx',
    './src/components/EntryDetailModal.tsx',
    './src/components/LoginScreen.tsx',
    // Assumindo que os ícones existem neste caminho
    './icons/icon-192x192.png',
    './icons/icon-512x512.png',
    // CDNs
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
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

                        // Clone the response because it's also a stream.
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                // We don't cache POST requests or chrome-extension requests
                                if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
                                    return;
                                }
                                cache.put(event.request, responseToCache);
                            });

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
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});