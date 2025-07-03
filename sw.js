// sw.js
const CACHE_NAME = 'basketball-tracker-v1';
const urlsToCache = [
    './', // The root path, which is index.html
    './index.html',
    './manifest.json',
    './sw.js', // Cache the service worker itself
    './court.jpg', // Cache your background image
    'https://cdn.tailwindcss.com',
    // Icon paths referenced in manifest.json - ensure these match your actual paths
    './icons/icon-72x72.png',
    './icons/icon-96x96.png',
    './icons/icon-128x128.png',
    './icons/icon-144x144.png',
    './icons/icon-152x152.png',
    './icons/icon-192x192.png',
    './icons/icon-384x384.png',
    './icons/icon-512x512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css', // Font Awesome CSS
    // If you add other external resources (like more JS libraries), add them here:
    // 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
    // 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js',
    // 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'
];

self.addEventListener('install', (event) => {
    console.log('Service Worker: Install event');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .catch(err => {
                console.error('Service Worker: Cache.addAll failed', err);
            })
    );
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activate event');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                    return null;
                })
            );
        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Check if the request is for an external third-party script or data that might change frequently.
    // For these, prefer network-first strategy.
    if (event.request.url.startsWith('https://www.gstatic.com/firebasejs') || event.request.url.includes('googleapis.com')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                // If network fails for external scripts, try cache as a fallback.
                return caches.match(event.request);
            })
        );
        return;
    }

    // For other requests (app shell, local assets), try cache first, then network
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    console.log('Service Worker: Fetch from cache', event.request.url);
                    return response;
                }
                // No cache hit - fetch from network
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Check if we received a valid response
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }
                        // IMPORTANT: Clone the response. A response is a stream and
                        // can only be consumed once. We must clone it so that we can
                        // serve the browser and put a copy in the cache.
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        console.log('Service Worker: Fetch from network and cache', event.request.url);
                        return networkResponse;
                    })
                    .catch(() => {
                        // Fallback for network failures (e.g., show offline page)
                        console.log('Service Worker: Network request failed for', event.request.url);
                        // You can return a generic offline page here if the request fails
                        // return caches.match('/offline.html'); // Requires an offline.html
                    });
            })
    );
});
