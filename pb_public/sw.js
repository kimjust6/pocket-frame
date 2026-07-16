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

let settingsCacheTtl = null;

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.mode === 'navigate') {
        settingsCacheTtl = null; // Clear cached TTL on page navigation/reload
    }

    // Determine if it is an image request
    const isImageRequest = 
        request.destination === 'image' ||
        IMAGE_URL_PATTERNS.some(pattern => pattern.test(url.pathname) || pattern.test(url.href));

    if (isImageRequest && request.method === 'GET') {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(request).then((cachedResponse) => {
                    if (cachedResponse) {
                        const checkExpiration = (ttl) => {
                            const dateHeader = cachedResponse.headers.get('date');
                            if (dateHeader && ttl) {
                                const age = Date.now() - new Date(dateHeader).getTime();
                                if (age > ttl) {
                                    // Cache expired! Fetch from network and update cache.
                                    // Fallback to cached version if network fails.
                                    return fetch(request).then((networkResponse) => {
                                        if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
                                            cache.put(request, networkResponse.clone());
                                            return networkResponse;
                                        }
                                        return cachedResponse;
                                    }).catch(() => {
                                        return cachedResponse;
                                    });
                                }
                            }
                            return cachedResponse;
                        };

                        if (settingsCacheTtl !== null) {
                            return checkExpiration(settingsCacheTtl);
                        }

                        return caches.open('pocket-frame-settings-cache').then((settingsCache) => {
                            return settingsCache.match('/settings.json').then((settingsResponse) => {
                                if (settingsResponse) {
                                    return settingsResponse.json().then((settings) => {
                                        settingsCacheTtl = (settings.cache_ttl || 604800) * 1000;
                                        return checkExpiration(settingsCacheTtl);
                                    }).catch(() => checkExpiration(604800000));
                                }
                                return checkExpiration(604800000);
                            });
                        }).catch(() => checkExpiration(604800000));
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
