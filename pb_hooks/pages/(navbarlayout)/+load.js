/**
 * Loader for the homepage startpage dashboard.
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
module.exports = function (context) {
    const logs = [];
    const log = (msg) => {
        logs.push("[" + new Date().toISOString() + "] " + msg);
    };
    const flushLogs = () => {
        try {
            $os.writeFile("./loader_log.txt", logs.join("\n"), 0644);
        } catch (e) {}
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
            weather_lat: "43.6532",
            weather_lon: "-79.3832",
            weather_unit: "celsius",
            search_engine: "https://www.google.com/search?q=",
            randomize: false,
            prioritize_videos: false,
            latest_pin_count: 6
        };

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
                    weather_lat: record.getString("weather_lat") || settings.weather_lat,
                    weather_lon: record.getString("weather_lon") || settings.weather_lon,
                    weather_unit: record.getString("weather_unit") || settings.weather_unit,
                    search_engine: record.getString("search_engine") || settings.search_engine,
                    randomize: record.getBool("randomize"),
                    prioritize_videos: record.getBool("prioritize_videos"),
                    latest_pin_count: record.getInt("latest_pin_count") || 6
                };
                log("Loaded settings from DB. search_engine: " + settings.search_engine);
            } else {
                log("No flame_settings record found in DB for user, using defaults.");
            }
        } catch (e) {
            log("Failed to load settings from DB: " + e.message);
        }

        // Fetch Immich share payload on backend to bypass CORS
        let images = [];
        let statusText = 'Loading slideshow...';
        const shareUrl = settings.search_engine || '';
        
        if (shareUrl) {
            log("Parsing share URL: " + shareUrl);
            const info = parseShareInfo(shareUrl);
            if (info) {
                log("Parsed Share Info successfully: " + JSON.stringify(info));
                const payload = fetchSharePayload(info.origin, info.shareKey, info.atToken, log);
                let assetIds = [];
                
                if (payload) {
                    log("Payload fetched. Keys: " + Object.keys(payload).join(", "));
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
                                    if (totalCount >= 500) break; // Limit to 500 images for slideshow
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
                                            const newAssets = [];
                                            for (let i = 0; i < ids.length; i++) {
                                                const isImg = isImageArray[i] !== false;
                                                newAssets.push({
                                                    id: ids[i],
                                                    type: isImg ? 'IMAGE' : 'VIDEO'
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
                    const atQuery = info.atToken ? `&at=${encodeURIComponent(info.atToken)}` : '';
                    const mapped = assetIds.map(asset => {
                        const thumbnailUrl = `${info.origin}/api/assets/${asset.id}/thumbnail?key=${encodeURIComponent(info.shareKey)}&size=preview${atQuery}`;
                        const url = asset.type === 'VIDEO'
                            ? `${info.origin}/api/assets/${asset.id}/video/playback?key=${encodeURIComponent(info.shareKey)}${atQuery}`
                            : thumbnailUrl;
                        return {
                            url,
                            thumbnailUrl,
                            type: asset.type
                        };
                    });

                    let videos = mapped.filter(x => x.type === 'VIDEO');
                    let photos = mapped.filter(x => x.type !== 'VIDEO');

                    function biasedShuffle(array) {
                        const len = array.length;
                        if (len <= 1) return;
                        const itemsWithScore = array.map((item, index) => {
                            // index 0 is newest, index len-1 is oldest.
                            // Adding (1 - index/len) * 0.5 creates a moderate bias towards newer photos.
                            const score = Math.random() + (1 - index / len) * 0.5;
                            return { item, score };
                        });
                        itemsWithScore.sort((a, b) => b.score - a.score);
                        for (let i = 0; i < len; i++) {
                            array[i] = itemsWithScore[i].item;
                        }
                    }

                    const pinCount = settings.latest_pin_count;
                    if (mapped.length > pinCount) {
                        const pinned = mapped.slice(0, pinCount);
                        const rest = mapped.slice(pinCount);

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
                            images = mapped;
                        }
                    } else {
                        // If total media count is less than or equal to pinCount, all are pinned
                        if (settings.prioritize_videos) {
                            let videos = mapped.filter(x => x.type === 'VIDEO');
                            let photos = mapped.filter(x => x.type !== 'VIDEO');
                            images = videos.concat(photos);
                        } else {
                            images = mapped;
                        }
                    }

                    statusText = `Loaded ${images.length} item${images.length === 1 ? '' : 's'} from Immich.`;
                    log("Successfully loaded " + images.length + " media items (randomize: " + settings.randomize + ", prioritize_videos: " + settings.prioritize_videos + ").");
                } else {
                    // Try og:image fallback
                    log("No assets found. Trying OG image fallback...");
                    const fallback = fetchOgImageFallback(shareUrl, log);
                    if (fallback && fallback.length > 0) {
                        images = fallback;
                        statusText = 'Loaded preview image from Immich.';
                        log("OG image fallback returned: " + JSON.stringify(fallback));
                    } else {
                        statusText = 'Unable to load images from Immich.';
                        log("OG image fallback returned empty.");
                    }
                }
            } else {
                statusText = 'No valid Immich share URL configured.';
                log("parseShareInfo returned null for " + shareUrl);
            }
        } else {
            statusText = 'No valid Immich share URL configured.';
            log("search_engine settings value is empty.");
        }

        flushLogs();
        return {
            isHome: true,
            settings,
            images,
            statusText,
            applications: [],
            categories: [],
            bookmarksByCategory: []
        };
    } catch (e) {
        log('Failed to load startpage data exception: ' + e.message);
        flushLogs();
        return {
            isHome: true,
            settings: {},
            images: [],
            statusText: 'Failed to load settings.',
            applications: [],
            categories: [],
            bookmarksByCategory: []
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
                type: type === 'VIDEO' ? 'VIDEO' : 'IMAGE'
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
