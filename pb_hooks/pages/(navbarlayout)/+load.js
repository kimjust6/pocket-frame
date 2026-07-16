/**
 * Loader for the homepage startpage dashboard.
 * @type {import('pocketpages').PageDataLoaderFunc}
 */

// Caches are stored in PocketBase's Go-native $app.store() to avoid memory leaks.

function getCacheTtlMs(settings) {
    let cacheTtlSec = 7 * 24 * 60 * 60; // 1 week default (604800 seconds)
    
    // Check environment variable
    const envTtl = $os.getenv("CACHE_TTL_SECONDS");
    if (envTtl) {
        const parsed = parseInt(envTtl, 10);
        if (!isNaN(parsed) && parsed > 0) {
            cacheTtlSec = parsed;
        }
    } else if (settings && typeof settings.cache_ttl !== 'undefined') {
        const parsed = parseInt(settings.cache_ttl, 10);
        if (!isNaN(parsed) && parsed > 0) {
            cacheTtlSec = parsed;
        }
    }
    return cacheTtlSec * 1000;
}

module.exports = function (context) {
    // Evict expired entries from Go-native store to optimize memory usage
    const nowTime = Date.now();
    let lastEviction = 0;
    try {
        lastEviction = parseInt($app.store().get("flame_cache_last_eviction") || "0", 10);
    } catch (e) {}

    if (nowTime - lastEviction > 300000) { // Only run cache eviction check every 5 minutes
        let cacheKeys = [];
        try {
            const rawKeys = $app.store().get("flame_cache_keys");
            if (rawKeys) {
                cacheKeys = JSON.parse(rawKeys);
            }
        } catch (e) {}

        const nextCacheKeys = [];
        let cacheKeysChanged = false;
        for (let i = 0; i < cacheKeys.length; i++) {
            const key = cacheKeys[i];
            try {
                const rawCache = $app.store().get("flame_cache_" + key);
                if (rawCache) {
                    const cached = JSON.parse(rawCache);
                    if (cached.expiresAt < nowTime) {
                        $app.store().remove("flame_cache_" + key);
                        cacheKeysChanged = true;
                    } else {
                        nextCacheKeys.push(key);
                    }
                } else {
                    cacheKeysChanged = true;
                }
            } catch (e) {
                $app.store().remove("flame_cache_" + key);
                cacheKeysChanged = true;
            }
        }
        if (cacheKeysChanged) {
            $app.store().set("flame_cache_keys", JSON.stringify(nextCacheKeys));
        }
        try {
            $app.store().set("flame_cache_last_eviction", nowTime.toString());
        } catch (e) {}
    }

    const logs = [];
    const log = (msg) => {
        logs.push("[" + new Date().toISOString() + "] " + msg);
    };
    const flushLogs = (hasError = false) => {
        try {
            const isDev = $os.getenv("DEBUG") === "true" ||
                          $os.getenv("DEBUG_LOG") === "true" ||
                          (typeof $app !== 'undefined' && typeof $app.isDev === 'function' && $app.isDev());
            if (isDev || hasError) {
                $os.writeFile("./loader_log.txt", logs.join("\n"), 0o644);
            }
        } catch (e) { }
    };

    try {
        log("Homepage loader started.");
        const user = context.request.auth
        if (!user) {
            log("No authenticated user, redirecting to /login.");
            context.response.redirect('/login')
            flushLogs();
            return
        }
        log("Authenticated user found: " + user.id);

        const userFilter = "user = {:user}"
        const filterParams = { user: user.id }
        let settings = {
            id: 'defaultsettings',
            color_primary: "#d9d9d9",
            color_accent: "#50fbc2",
            color_background: "#282525",
            search_engine: "https://www.google.com/search?q=",
            fallback_url: "",
            randomize: false,
            prioritize_videos: false,
            latest_pin_count: 6,
            slide_interval: 7,
            video_repeat_threshold: 5,
            video_repeat_count: 3,
            autoplay_fullscreen: false,
            cache_ttl: 604800
        };

        if (context.locals && context.locals.settings) {
            settings = context.locals.settings;
            log("Loaded settings from context.locals. settings: " + settings.id);
        } else {
            try {
                const records = $app.findRecordsByFilter("flame_settings", userFilter, "", 1, 0, filterParams);
                let record = records && records.length ? records[0] : null;
                if (record) {
                    settings = {
                        id: record.id,
                        user: record.getString("user") || user.id,
                        color_primary: record.getString("color_primary") || settings.color_primary,
                        color_accent: record.getString("color_accent") || settings.color_accent,
                        color_background: record.getString("color_background") || settings.color_background,
                        search_engine: record.getString("search_engine") || settings.search_engine,
                        fallback_url: record.getString("fallback_url") || settings.fallback_url,
                        randomize: record.getBool("randomize"),
                        prioritize_videos: record.getBool("prioritize_videos"),
                        latest_pin_count: record.getInt("latest_pin_count") || 6,
                        slide_interval: record.getInt("slide_interval") || 7,
                        video_repeat_threshold: record.getInt("video_repeat_threshold") || 5,
                        video_repeat_count: record.getInt("video_repeat_count") || 3,
                        autoplay_fullscreen: record.getBool("autoplay_fullscreen"),
                        cache_ttl: record.getInt("cache_ttl") || 604800
                    };
                    log("Loaded settings from DB. search_engine: " + settings.search_engine);
                } else {
                    log("No flame_settings record found in DB for user, using defaults.");
                }
            } catch (e) {
                log("Failed to load settings from DB: " + e.message);
            }
        }

        // Fetch Immich share payload on backend to bypass CORS
        let rawAssets = [];
        let images = [];
        let statusText = 'Loading slideshow...';
        let albumName = '';
        const shareUrl = settings.search_engine || '';

        if (shareUrl) {
            log("Parsing share URL: " + shareUrl);
            const info = parseShareInfo(shareUrl);
            if (info) {
                const cacheKey = info.shareKey;
                let cached = null;
                try {
                    const rawCache = $app.store().get("flame_cache_" + cacheKey);
                    if (rawCache) {
                        cached = JSON.parse(rawCache);
                    }
                } catch (e) {
                    log("Failed to parse cached Immich data: " + e.message);
                }
                const now = Date.now();
                const CACHE_TTL_MS = getCacheTtlMs(settings);

                if (cached && cached.expiresAt > now && cached.assets && cached.assets.length > 0) {
                    rawAssets = cached.assets;
                    albumName = cached.albumName || "";
                    statusText = `Loaded ${rawAssets.length} items from Immich (cached).`;
                    log("Using fresh cached Immich data (" + rawAssets.length + " items, expires " + new Date(cached.expiresAt).toISOString() + ")");
                } else {
                    log("Parsed Share Info successfully: " + JSON.stringify(info));
                    const payload = fetchSharePayload(info.origin, info.shareKey, info.atToken, log);
                    let assetIds = [];

                    if (payload) {
                        log("Payload fetched. Keys: " + Object.keys(payload).join(", "));
                        if (payload.album && payload.album.albumName) {
                            albumName = payload.album.albumName;
                        }
                        // 1. Try to load direct assets if it's an individual share link
                        const directAssetIds = [];
                        collectAssetIds(payload.assets || [], directAssetIds);
                        log("Direct asset IDs found: " + directAssetIds.length);

                        if (directAssetIds.length > 0) {
                            assetIds = directAssetIds;
                        } else if (payload.album && payload.album.id) {
                            // 2. It's a shared album! Fetch buckets and then bucket contents
                            const albumId = payload.album.id;
                            const encodedKey = encodeURIComponent(info.shareKey);
                            const atQuery = info.atToken ? `&at=${encodeURIComponent(info.atToken)}` : '';

                            try {
                                const bucketsUrl = `${info.origin}/api/timeline/buckets?key=${encodedKey}&albumId=${albumId}${atQuery}`;
                                log("Fetching buckets from url: " + bucketsUrl);
                                const bucketsRes = $http.send({
                                    url: bucketsUrl,
                                    method: "GET",
                                    headers: { "accept": "application/json" },
                                    timeout: 10
                                });

                                log("Buckets response status: " + bucketsRes.statusCode);
                                if (bucketsRes.statusCode === 200 && bucketsRes.json) {
                                    const buckets = bucketsRes.json;
                                    log("Found " + buckets.length + " buckets.");
                                    let totalCount = 0;
                                    for (const bucket of buckets) {
                                        if (totalCount >= 5000) break; // Limit to 5000 images for slideshow
                                        try {
                                            const bucketUrl = `${info.origin}/api/timeline/bucket?key=${encodedKey}&albumId=${albumId}&timeBucket=${encodeURIComponent(bucket.timeBucket)}${atQuery}`;
                                            log("Fetching bucket: " + bucket.timeBucket + " from " + bucketUrl);
                                            const bucketRes = $http.send({
                                                url: bucketUrl,
                                                method: "GET",
                                                headers: { "accept": "application/json" },
                                                timeout: 10
                                            });
                                            log("Bucket " + bucket.timeBucket + " status: " + bucketRes.statusCode);
                                            if (bucketRes.statusCode === 200 && bucketRes.json && Array.isArray(bucketRes.json.id)) {
                                                const ids = bucketRes.json.id;
                                                const isImageArray = bucketRes.json.isImage || [];
                                                const durationArray = bucketRes.json.duration || [];
                                                const newAssets = [];
                                                for (let i = 0; i < ids.length; i++) {
                                                    const isImg = isImageArray[i] !== false;
                                                    const durMs = durationArray[i] || 0;
                                                    newAssets.push({
                                                        id: ids[i],
                                                        type: isImg ? 'IMAGE' : 'VIDEO',
                                                        duration: durMs ? Math.round(durMs / 1000) : 0
                                                    });
                                                }
                                                assetIds = assetIds.concat(newAssets);
                                                totalCount += ids.length;
                                                log("Bucket " + bucket.timeBucket + " added " + ids.length + " assets. Total so far: " + totalCount);
                                            } else {
                                                log("Bucket " + bucket.timeBucket + " returned invalid response: " + bucketRes.statusCode + " " + bucketRes.raw);
                                            }
                                        } catch (e) {
                                            log("Exception fetching bucket " + bucket.timeBucket + ": " + e.message);
                                        }
                                    }
                                } else {
                                    log("Buckets response error. Status: " + bucketsRes.statusCode + ", raw: " + bucketsRes.raw);
                                }
                            } catch (e) {
                                log("Failed to fetch shared album buckets: " + e.message);
                            }
                        } else {
                            log("Payload does not contain assets or album.");
                        }
                    } else {
                        log("Payload fetch returned null.");
                    }

                    if (assetIds.length > 0) {
                        rawAssets = assetIds.map(asset => {
                            return {
                                id: asset.id,
                                type: asset.type,
                                duration: asset.duration || 0
                            };
                        });
                        statusText = `Loaded ${rawAssets.length} item${rawAssets.length === 1 ? '' : 's'} from Immich.`;
                        log("Successfully loaded " + rawAssets.length + " items from Immich. Caching result.");

                        const newCache = {
                            assets: rawAssets,
                            albumName: albumName,
                            expiresAt: now + CACHE_TTL_MS
                        };
                        try {
                            $app.store().set("flame_cache_" + cacheKey, JSON.stringify(newCache));
                            let keysList = [];
                            try {
                                const rawKeys = $app.store().get("flame_cache_keys");
                                if (rawKeys) keysList = JSON.parse(rawKeys);
                            } catch (e) {}
                            if (!keysList.includes(cacheKey)) {
                                keysList.push(cacheKey);
                                $app.store().set("flame_cache_keys", JSON.stringify(keysList));
                            }
                        } catch (e) {
                            log("Failed to save Immich cache: " + e.message);
                        }
                    } else if (cached && cached.assets && cached.assets.length > 0) {
                        rawAssets = cached.assets;
                        albumName = cached.albumName || "";
                        statusText = `Loaded ${rawAssets.length} items from Immich (stale cache - API temporarily unavailable).`;
                        log("Live fetch failed, using stale cached Immich data (" + rawAssets.length + " items)");
                        try {
                            cached.expiresAt = now + 300000; // Extend expired cache by 5 minutes to avoid rapid retries
                            $app.store().set("flame_cache_" + cacheKey, JSON.stringify(cached));
                        } catch (e) {
                            log("Failed to extend stale cache: " + e.message);
                        }
                    } else {
                        log("No Immich assets found.");
                    }
                }
            } else {
                log("parseShareInfo returned null for Immich URL: " + shareUrl);
            }
        } else {
            log("search_engine settings value is empty.");
        }

        // Amazon Photos Fallback if Immich failed or was empty
        if (rawAssets.length === 0 && settings.fallback_url) {
            log("Attempting to load from fallback Amazon Photos URL: " + settings.fallback_url);
            const amazonInfo = parseAmazonShare(settings.fallback_url);
            if (amazonInfo) {
                log("Parsed Amazon Share Info successfully: " + JSON.stringify(amazonInfo));

                const cacheKey = amazonInfo.shareId;
                let cached = null;
                try {
                    const rawCache = $app.store().get("flame_cache_" + cacheKey);
                    if (rawCache) {
                        cached = JSON.parse(rawCache);
                    }
                } catch (e) {
                    log("Failed to parse cached Amazon Photos data: " + e.message);
                }
                const now = Date.now();
                const CACHE_TTL_MS = getCacheTtlMs(settings);

                // Use fresh cache if available
                if (cached && cached.expiresAt > now && cached.images && cached.images.length > 0) {
                    rawAssets = cached.images;
                    albumName = cached.albumName || "Amazon Photos";
                    statusText = `Loaded ${rawAssets.length} items from Amazon Photos (cached).`;
                    log("Using fresh cached Amazon Photos data (" + rawAssets.length + " items, expires " + new Date(cached.expiresAt).toISOString() + ")");
                } else {
                    // Attempt live fetch from Amazon Photos API
                    const amazonPayload = fetchAmazonPhotos(amazonInfo.origin, amazonInfo.shareId, log);
                    if (amazonPayload && amazonPayload.images && amazonPayload.images.length > 0) {
                        rawAssets = amazonPayload.images;
                        albumName = amazonPayload.albumName;
                        statusText = `Loaded ${rawAssets.length} item${rawAssets.length === 1 ? '' : 's'} from Amazon Photos.`;
                        log("Successfully loaded " + rawAssets.length + " items from Amazon Photos. Caching result.");
                        // Store in cache
                        const newCache = {
                            images: rawAssets,
                            albumName: albumName,
                            expiresAt: now + CACHE_TTL_MS
                        };
                        try {
                            $app.store().set("flame_cache_" + cacheKey, JSON.stringify(newCache));
                            let keysList = [];
                            try {
                                const rawKeys = $app.store().get("flame_cache_keys");
                                if (rawKeys) keysList = JSON.parse(rawKeys);
                            } catch (e) {}
                            if (!keysList.includes(cacheKey)) {
                                keysList.push(cacheKey);
                                $app.store().set("flame_cache_keys", JSON.stringify(keysList));
                            }
                        } catch (e) {
                            log("Failed to save Amazon Photos cache: " + e.message);
                        }
                    } else if (cached && cached.images && cached.images.length > 0) {
                        // Live fetch failed - use stale cache as last resort
                        rawAssets = cached.images;
                        albumName = cached.albumName || "Amazon Photos";
                        statusText = `Loaded ${rawAssets.length} items from Amazon Photos (stale cache - API temporarily unavailable).`;
                        log("Live fetch failed, using stale cached Amazon Photos data (" + rawAssets.length + " items)");
                        try {
                            cached.expiresAt = now + 300000; // Extend expired cache by 5 minutes to avoid rapid retries
                            $app.store().set("flame_cache_" + cacheKey, JSON.stringify(cached));
                        } catch (e) {
                            log("Failed to extend stale Amazon Photos cache: " + e.message);
                        }
                    } else {
                        statusText = 'Unable to load images from Amazon Photos fallback.';
                        log("fetchAmazonPhotos returned empty or null and no cache available.");
                    }
                }
            } else {
                statusText = 'Invalid Amazon Photos fallback URL configured.';
                log("parseAmazonShare returned null for fallback_url: " + settings.fallback_url);
            }
        }

        if (rawAssets.length === 0 && !statusText.includes('fallback')) {
            statusText = 'No valid Immich share URL configured.';
        }

        // Post-processing: pin count / shuffling / prioritizing videos
        if (rawAssets.length > 0) {
            function biasedShuffle(array) {
                const len = array.length;
                if (len <= 1) return;
                const itemsWithScore = array.map((item, index) => {
                    const score = Math.random() + (1 - index / len) * 0.5;
                    return { item, score };
                });
                itemsWithScore.sort((a, b) => b.score - a.score);
                for (let i = 0; i < len; i++) {
                    array[i] = itemsWithScore[i].item;
                }
            }

            const pinCount = settings.latest_pin_count;
            if (rawAssets.length > pinCount) {
                const pinned = rawAssets.slice(0, pinCount);
                const rest = rawAssets.slice(pinCount);

                if (settings.prioritize_videos) {
                    let restVideos = rest.filter(x => x.type === 'VIDEO');
                    let restPhotos = rest.filter(x => x.type !== 'VIDEO');
                    if (settings.randomize) {
                        biasedShuffle(restVideos);
                        biasedShuffle(restPhotos);
                    }
                    images = pinned.concat(restVideos.concat(restPhotos));
                } else if (settings.randomize) {
                    biasedShuffle(rest);
                    images = pinned.concat(rest);
                } else {
                    images = rawAssets;
                }
            } else {
                if (settings.prioritize_videos) {
                    let videos = rawAssets.filter(x => x.type === 'VIDEO');
                    let photos = rawAssets.filter(x => x.type !== 'VIDEO');
                    images = videos.concat(photos);
                } else {
                    images = rawAssets;
                }
            }
        } else {
            // Try og:image fallback on Immich shareUrl if config is present and we haven't loaded anything else
            if (shareUrl) {
                log("No assets found. Trying OG image fallback...");
                const fallback = fetchOgImageFallback(shareUrl, log);
                if (fallback && fallback.length > 0) {
                    images = fallback.map(u => ({ url: u, type: 'IMAGE', duration: 0 }));
                    statusText = 'Loaded preview image from Immich.';
                    log("OG image fallback returned: " + JSON.stringify(fallback));
                } else {
                    statusText = 'Unable to load images from Immich.';
                    log("OG image fallback returned empty.");
                }
            }
        }

        flushLogs(false);
        let shareInfo = null;
        if (shareUrl) {
            const info = parseShareInfo(shareUrl);
            if (info) {
                shareInfo = {
                    origin: info.origin,
                    shareKey: info.shareKey,
                    atToken: info.atToken
                };
            }
        }

        return {
            isHome: true,
            settings,
            images,
            shareInfo,
            statusText,
            albumName
        };
    } catch (e) {
        log('Failed to load startpage data exception: ' + e.message);
        flushLogs(true);
        return {
            isHome: true,
            settings: {},
            images: [],
            shareInfo: null,
            statusText: 'Failed to load settings.'
        };
    }
}

// Helpers for Immich API fetching

function extractUrlCandidate(rawValue) {
    if (typeof rawValue !== 'string') return ''
    const trimmed = rawValue.trim()
    if (!trimmed) return ''

    const markdown = trimmed.match(
        /^\[[^\]]+\]\((https?:\/\/[^\s)]+)\)$/i
    )
    if (markdown && markdown[1]) return markdown[1].trim()

    return trimmed
}

function normalizeHttpUrl(rawValue) {
    const candidate = extractUrlCandidate(rawValue)
    if (!candidate) return ''

    const withScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(
        candidate
    )
        ? candidate
        : `https://${candidate}`

    const match = withScheme.match(/^(https?:\/\/)?([a-zA-Z0-9.-]+)(:\d+)?(\/.*)?$/);
    if (!match) return '';
    return withScheme;
}

function parseShareInfo(urlValue) {
    const normalized = normalizeHttpUrl(urlValue)
    if (!normalized) return null

    const match = normalized.match(/^(https?:\/\/[^\/]+)\/share\/([^\/\?]+)(?:\?.*)?$/);
    if (!match) return null;
    const origin = match[1];
    const shareKey = match[2];

    let atToken = '';
    const atMatch = normalized.match(/[?&]at=([^&]+)/);
    if (atMatch) {
        atToken = decodeURIComponent(atMatch[1]);
    }

    return {
        origin,
        shareKey,
        atToken
    }
}

function collectAssetIds(value, bucket) {
    if (!value || typeof value !== 'object') return

    if (Array.isArray(value)) {
        value.forEach((item) => collectAssetIds(item, bucket))
        return
    }

    if (typeof value.id === 'string') {
        const type =
            typeof value.type === 'string'
                ? value.type.toUpperCase()
                : ''
        if (!type || type === 'IMAGE' || type === 'VIDEO') {
            bucket.push({
                id: value.id,
                type: type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
                duration: value.duration ? Math.round(value.duration) : 0
            })
        }
    }

    for (const key of Object.keys(value)) {
        collectAssetIds(value[key], bucket)
    }
}

function fetchSharePayload(origin, shareKey, atToken, log) {
    const encodedKey = encodeURIComponent(shareKey)
    const atQuery = atToken
        ? `&at=${encodeURIComponent(atToken)}`
        : ''

    const urls = [
        `${origin}/api/shared-links/me?key=${encodedKey}${atQuery}`,
        `${origin}/api/shared-links/${encodedKey}${atToken ? `?at=${encodeURIComponent(atToken)}` : ''}`
    ];

    for (const url of urls) {
        try {
            log("fetchSharePayload trying url: " + url);
            const res = $http.send({
                url,
                method: "GET",
                headers: { "accept": "application/json" },
                timeout: 10
            });
            log("fetchSharePayload url: " + url + " returned status: " + res.statusCode);
            if (res.statusCode === 200 && res.json) {
                return res.json;
            }
        } catch (err) {
            log("fetchSharePayload url: " + url + " exception: " + err.message);
        }
    }

    const urlsWithHeaders = [
        `${origin}/api/shared-links/me`,
        `${origin}/api/shared-links`
    ];

    for (const url of urlsWithHeaders) {
        try {
            log("fetchSharePayload trying header url: " + url);
            const res = $http.send({
                url,
                method: "GET",
                headers: {
                    "accept": "application/json",
                    "x-share-key": shareKey
                },
                timeout: 10
            });
            log("fetchSharePayload header url: " + url + " returned status: " + res.statusCode);
            if (res.statusCode === 200 && res.json) {
                return res.json;
            }
        } catch (err) {
            log("fetchSharePayload header url: " + url + " exception: " + err.message);
        }
    }

    return null
}

function fetchOgImageFallback(urlValue, log) {
    try {
        log("fetchOgImageFallback trying: " + urlValue);
        const res = $http.send({
            url: urlValue,
            method: "GET",
            timeout: 10
        });
        log("fetchOgImageFallback returned status: " + res.statusCode);
        if (res.statusCode === 200 && res.raw) {
            const html = res.raw;
            const match =
                html.match(
                    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
                ) ||
                html.match(
                    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
                )
            if (match && match[1]) {
                return [match[1]];
            }
        }
    } catch (err) {
        log("fetchOgImageFallback exception: " + err.message);
    }
    return [];
}

// Helpers for Amazon Photos API fetching

function parseAmazonShare(urlValue) {
    if (!urlValue) return null;
    const trimmed = urlValue.trim();
    const match = trimmed.match(/^(https?:\/\/[^\/]+)\/photos\/share\/([^\/\?]+)/);
    if (!match) return null;
    return {
        origin: match[1],
        shareId: match[2]
    };
}

function fetchAmazonPhotos(origin, shareId, log) {
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const baseHeaders = {
        "accept": "application/json",
        "user-agent": userAgent
    };

    try {
        // Step 1: Warm the session by visiting the share page. Amazon's drive API returns
        // 503 inconsistently when called without a session context (session-id cookies).
        // Visiting the share page first causes Amazon to return these cookies, which we
        // then pass to all subsequent drive API calls for a reliable 200 response.
        log("fetchAmazonPhotos: warming session by visiting share page...");
        const sharePageUrl = `${origin}/photos/share/${shareId}?sort=sortOldestToNewest`;
        const sharePageRes = $http.send({
            url: sharePageUrl,
            method: "GET",
            headers: { "user-agent": userAgent, "accept": "text/html" },
            timeout: 10
        });
        log("fetchAmazonPhotos sharePageRes status: " + sharePageRes.statusCode);

        // Build Cookie header from session cookies returned by the share page.
        // PocketBase JSVM may expose cookies via res.cookies[] or via res.headers['set-cookie'].
        // Try both approaches for robustness.
        let cookieHeader = "";
        const cookieLog = "cookies type=" + typeof sharePageRes.cookies +
            " len=" + (sharePageRes.cookies ? sharePageRes.cookies.length : "null");
        log("fetchAmazonPhotos cookie debug: " + cookieLog);

        if (sharePageRes.cookies && sharePageRes.cookies.length > 0) {
            const firstCookie = sharePageRes.cookies[0];
            log("fetchAmazonPhotos first cookie keys: " + Object.keys(firstCookie || {}).join(","));
            // Try lowercase name/value (PocketBase JSVM standard)
            if (firstCookie.name) {
                cookieHeader = sharePageRes.cookies.map(c => `${c.name}=${c.value}`).join("; ");
            } else if (firstCookie.Name) {
                // Capitalized (Go-style)
                cookieHeader = sharePageRes.cookies.map(c => `${c.Name}=${c.Value}`).join("; ");
            }
        }

        // Fallback: parse Set-Cookie from headers directly
        if (!cookieHeader) {
            const setCookie = sharePageRes.headers && (
                sharePageRes.headers["set-cookie"] ||
                sharePageRes.headers["Set-Cookie"]
            );
            if (setCookie) {
                // Parse "name=value; ..." from each Set-Cookie header
                const rawHeaders = Array.isArray(setCookie) ? setCookie : [setCookie];
                cookieHeader = rawHeaders.map(h => h.split(";")[0].trim()).join("; ");
                log("fetchAmazonPhotos cookies from headers: " + cookieHeader);
            }
        }

        if (cookieHeader) {
            log("fetchAmazonPhotos session cookies built: " + cookieHeader);
        } else {
            log("fetchAmazonPhotos WARNING: no session cookies found, proceeding without them");
        }

        // Step 2: Build authenticated headers (including session cookies)
        const headers = Object.assign({}, baseHeaders);
        if (cookieHeader) {
            headers["cookie"] = cookieHeader;
        }

        log("fetchAmazonPhotos: fetching shareInfo for ID: " + shareId);
        const shareUrl = `${origin}/drive/v1/shares/${shareId}?shareId=${shareId}&resourceVersion=V2&ContentType=JSON`;
        const shareRes = $http.send({
            url: shareUrl,
            method: "GET",
            headers,
            timeout: 10
        });
        log("fetchAmazonPhotos shareInfo status: " + shareRes.statusCode);
        if (shareRes.statusCode !== 200 || !shareRes.json) {
            log("fetchAmazonPhotos shareInfo failed: " + shareRes.raw);
            return null;
        }

        const nodeInfoId = shareRes.json.nodeInfo && shareRes.json.nodeInfo.id;
        if (!nodeInfoId) {
            log("fetchAmazonPhotos shareInfo nodeInfo.id missing");
            return null;
        }
        log("fetchAmazonPhotos nodeInfo.id: " + nodeInfoId);

        log("fetchAmazonPhotos: fetching child folder ID...");
        const folderUrl = `${origin}/drive/v1/nodes/${nodeInfoId}/children?asset=ALL&limit=1&searchOnFamily=false&shareId=${shareId}&offset=0&resourceVersion=V2&ContentType=JSON`;
        const folderRes = $http.send({
            url: folderUrl,
            method: "GET",
            headers,
            timeout: 10
        });
        log("fetchAmazonPhotos folder status: " + folderRes.statusCode);
        if (folderRes.statusCode !== 200 || !folderRes.json || !folderRes.json.data || !folderRes.json.data.length) {
            log("fetchAmazonPhotos folder failed: " + folderRes.raw);
            return null;
        }

        const folderId = folderRes.json.data[0].id;
        log("fetchAmazonPhotos folderId: " + folderId);

        log("fetchAmazonPhotos: fetching list of child nodes with tempLink=true...");
        const images = [];
        let offset = 0;
        const limit = 200;
        let hasMore = true;

        while (hasMore && images.length < 5000) {
            const itemsUrl = `${origin}/drive/v1/nodes/${folderId}/children?asset=ALL&limit=${limit}&searchOnFamily=false&shareId=${shareId}&offset=${offset}&resourceVersion=V2&ContentType=JSON&tempLink=true`;
            log("fetchAmazonPhotos: fetching children page at offset=" + offset + " url: " + itemsUrl);
            const itemsRes = $http.send({
                url: itemsUrl,
                method: "GET",
                headers,
                timeout: 15
            });
            log("fetchAmazonPhotos items status: " + itemsRes.statusCode);
            if (itemsRes.statusCode !== 200 || !itemsRes.json || !itemsRes.json.data) {
                log("fetchAmazonPhotos items failed or empty at offset " + offset + ": " + (itemsRes.raw || ""));
                break;
            }

            const nodes = itemsRes.json.data;
            log("fetchAmazonPhotos found " + nodes.length + " nodes at offset " + offset);
            if (nodes.length === 0) {
                break;
            }

            for (const node of nodes) {
                if (node.status === "AVAILABLE" && node.tempLink) {
                    const isVideo = node.contentProperties && node.contentProperties.contentType && node.contentProperties.contentType.startsWith("video/");
                    const type = isVideo ? "VIDEO" : "IMAGE";
                    // Resolve the CDN proxy tempLink to the direct presigned URL.
                    // The CDN proxy (/cdproxy/templink/) has hotlink protection and blocks browser
                    // requests that include a Referer header. The presigned URL (/v2/download/presigned/)
                    // uses the same key but has no such restrictions (it's self-authenticating).
                    const presignedLink = node.tempLink.replace("/cdproxy/templink/", "/v2/download/presigned/");
                    const url = `${presignedLink}?shareId=${shareId}`;
                    images.push({
                        url,
                        type,
                        duration: 0
                    });
                }
            }

            if (nodes.length < limit) {
                hasMore = false;
            } else {
                offset += limit;
            }
        }

        return {
            images,
            albumName: (shareRes.json.nodeInfo && shareRes.json.nodeInfo.name) || "Amazon Photos Shared Album"
        };
    } catch (e) {
        log("fetchAmazonPhotos exception: " + e.message);
    }
    return null;
}
