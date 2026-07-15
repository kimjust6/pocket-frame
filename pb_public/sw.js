const CACHE_NAME = 'pocket-frame-image-cache-v1';

// We want to cache images (local and external)
const IMAGE_URL_PATTERNS = [
    /\/api\/files\//,       // PocketBase files
    /\/api\/assets\//,      // Immich assets
    /\.(png|jpe?g|gif|svg|webp|ico|tiff|bmp)$/i // Generic images
];

self.addEventListener('install', (event) => {
    // Force active immediately
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Claim any clients immediately
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Determine if it is an image request
    const isImageRequest = 
        request.destination === 'image' ||
        IMAGE_URL_PATTERNS.some(pattern => pattern.test(url.pathname) || pattern.test(url.href));

    if (isImageRequest && request.method === 'GET') {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    return fetch(request).then((networkResponse) => {
                        // Check if we got a valid response (status 200 or status 0 for opaque responses)
                        if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
                            cache.put(request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch((err) => {
                        console.error('Fetch failed in service worker for:', request.url, err);
                        throw err;
                    });
                });
            })
        );
    }
});
