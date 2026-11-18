// Custom API hook for Pocket Frame Slideshow and Settings
// Endpoints:
//   GET  /api/custom/slideshow
//   GET  /api/custom/settings
//   POST /api/custom/settings

routerAdd("GET", "/api/custom/slideshow", (e) => {
    const helpers = require(__hooks + '/lib/slideshow_helpers.js');
    const user = helpers.getAuthUser(e);
    if (!user) {
        return e.json(401, { error: "Authentication required" });
    }

    const log = (msg) => {};

    // Evict expired entries from Go-native store
    const nowTime = Date.now();
    let lastEviction = 0;
    try {
        lastEviction = parseInt($app.store().get("flame_cache_last_eviction") || "0", 10);
    } catch (err) {}

    if (nowTime - lastEviction > 300000) {
        let cacheKeys = [];
        try {
            const rawKeys = $app.store().get("flame_cache_keys");
            if (rawKeys) cacheKeys = JSON.parse(rawKeys);
        } catch (err) {}

        const nextCacheKeys = [];
        let cacheKeysChanged = false;
        for (let i = 0; i < cacheKeys.length; i++) {
            const entry = cacheKeys[i];
            if (!entry) continue;
            let key = "";
            let expiresAt = 0;
            if (typeof entry === 'object' && entry !== null && entry.key) {
                key = entry.key;
                expiresAt = entry.expiresAt || 0;
            } else if (typeof entry === 'string') {
                key = entry;
                try {
                    const rawCache = $app.store().get("flame_cache_" + key);
                    if (rawCache) {
                        const cached = JSON.parse(rawCache);
                        expiresAt = cached.expiresAt || 0;
                    }
                } catch (err) {}
                cacheKeysChanged = true;
            }
            if (!key) {
                cacheKeysChanged = true;
                continue;
            }
            if (expiresAt < nowTime) {
                $app.store().remove("flame_cache_" + key);
                cacheKeysChanged = true;
            } else {
                nextCacheKeys.push({ key, expiresAt });
            }
        }
        if (cacheKeysChanged) {
            $app.store().set("flame_cache_keys", JSON.stringify(nextCacheKeys));
        }
        try {
            $app.store().set("flame_cache_last_eviction", nowTime.toString());
        } catch (err) {}
    }

    let settings = {
        id: 'defaultsettings',
        color_primary: "#d9d9d9",
        color_accent: "#50fbc2",
        color_background: "#282525",
        search_engine: "https://www.google.com/search?q=",
        fallback_url: "",
        fallback_urls: [],
        randomize: false,
        prioritize_videos: false,
        latest_pin_count: 6,
        slide_interval: 7,
        video_repeat_threshold: 5,
        video_repeat_count: 3,
        autoplay_fullscreen: false,
        cache_ttl: 604800
    };

    const userFilter = "user = {:user}";
    const filterParams = { user: user.id };

    try {
        const records = $app.findRecordsByFilter("flame_settings", userFilter, "", 1, 0, filterParams);
        let record = records && records.length ? records[0] : null;

        if (!record) {
            const collection = $app.findCollectionByNameOrId("flame_settings");
            record = new Record(collection);
            record.set("user", user.id);
            record.set("color_primary", settings.color_primary);
            record.set("color_accent", settings.color_accent);
            record.set("color_background", settings.color_background);
            record.set("search_engine", settings.search_engine);
            record.set("cache_ttl", settings.cache_ttl);
            $app.save(record);
        }

        if (record) {
            settings = {
                id: record.id,
                user: record.getString("user") || user.id,
                color_primary: record.getString("color_primary") || settings.color_primary,
                color_accent: record.getString("color_accent") || settings.color_accent,
                color_background: record.getString("color_background") || settings.color_background,
                search_engine: record.getString("search_engine") || settings.search_engine,
                fallback_url: record.getString("fallback_url") || settings.fallback_url,
                fallback_urls: [],
                active_album: record.getString("active_album") || "",
                randomize: record.getBool("randomize"),
                prioritize_videos: record.getBool("prioritize_videos"),
                latest_pin_count: record.getInt("latest_pin_count") || 6,
                slide_interval: record.getInt("slide_interval") || 7,
                video_repeat_threshold: record.getInt("video_repeat_threshold") || 5,
                video_repeat_count: record.getInt("video_repeat_count") || 3,
                autoplay_fullscreen: record.getBool("autoplay_fullscreen"),
                cache_ttl: record.getInt("cache_ttl") || 604800
            };

            let activeAlbum = null;
            if (settings.active_album) {
                try {
                    activeAlbum = $app.findRecordById("flame_albums", settings.active_album);
                } catch (err) {}
            }

            if (!activeAlbum) {
                try {
                    const albums = $app.findRecordsByFilter("flame_albums", "user = {:user}", "order,created", 1, 0, { user: user.id });
                    if (albums && albums.length > 0) {
                        activeAlbum = albums[0];
                        record.set("active_album", activeAlbum.id);
                        $app.save(record);
                    }
                } catch (err) {}
            }

            if (activeAlbum) {
                settings.search_engine = activeAlbum.getString("immich_url") || "";
                settings.fallback_url = activeAlbum.getString("amazon_url") || "";
                let fallbackUrls = [];
                try {
                    const rawStr = activeAlbum.getString("fallback_urls");
                    if (rawStr) fallbackUrls = JSON.parse(rawStr);
                } catch (err) {}
                if ((!fallbackUrls || fallbackUrls.length === 0) && settings.fallback_url) {
                    fallbackUrls = [settings.fallback_url];
                }
                settings.fallback_urls = fallbackUrls;
                settings.albumName = activeAlbum.getString("name") || "";
                settings.active_album = activeAlbum.id;
            }
        }
    } catch (err) {}

    let rawAssets = [];
    let images = [];
    let statusText = 'Loading slideshow...';
    let albumName = settings.albumName || '';
    const shareUrl = settings.search_engine || '';

    if (shareUrl) {
        const info = helpers.parseShareInfo(shareUrl);
        if (info) {
            const cacheKey = info.shareKey;
            let cached = null;
            try {
                const rawCache = $app.store().get("flame_cache_" + cacheKey);
                if (rawCache) cached = JSON.parse(rawCache);
            } catch (err) {}

            const now = Date.now();
            const CACHE_TTL_MS = helpers.getCacheTtlMs(settings);

            if (cached && cached.expiresAt > now && cached.assets && cached.assets.length > 0) {
                rawAssets = cached.assets;
                albumName = cached.albumName || albumName;
                statusText = `Loaded ${rawAssets.length} items from Immich (cached).`;
            } else {
                const payload = helpers.fetchSharePayload(info.origin, info.shareKey, info.atToken, log);
                let assetIds = [];
                if (payload) {
                    if (payload.album && payload.album.albumName) {
                        albumName = payload.album.albumName;
                    }
                    const directAssetIds = [];
                    helpers.collectAssetIds(payload.assets || [], directAssetIds);
                    if (directAssetIds.length > 0) {
                        assetIds = directAssetIds;
                    } else if (payload.album && payload.album.id) {
                        const albumId = payload.album.id;
                        const encodedKey = encodeURIComponent(info.shareKey);
                        const atQuery = info.atToken ? `&at=${encodeURIComponent(info.atToken)}` : '';
                        try {
                            const bucketsUrl = `${info.origin}/api/timeline/buckets?key=${encodedKey}&albumId=${albumId}${atQuery}`;
                            const bucketsRes = $http.send({
                                url: bucketsUrl,
                                method: "GET",
                                headers: { "accept": "application/json" },
                                timeout: 10
                            });
                            if (bucketsRes.statusCode === 200 && bucketsRes.json) {
                                const buckets = bucketsRes.json;
                                let totalCount = 0;
                                for (const bucket of buckets) {
                                    if (totalCount >= 5000) break;
                                    try {
                                        const bucketUrl = `${info.origin}/api/timeline/bucket?key=${encodedKey}&albumId=${albumId}&timeBucket=${encodeURIComponent(bucket.timeBucket)}${atQuery}`;
                                        const bucketRes = $http.send({
                                            url: bucketUrl,
                                            method: "GET",
                                            headers: { "accept": "application/json" },
                                            timeout: 10
                                        });
                                        if (bucketRes.statusCode === 200 && bucketRes.json && Array.isArray(bucketRes.json.id)) {
                                            const ids = bucketRes.json.id;
                                            const isImageArray = bucketRes.json.isImage || [];
                                            const durationArray = bucketRes.json.duration || [];
                                            for (let i = 0; i < ids.length; i++) {
                                                const isImg = isImageArray[i] !== false;
                                                const durMs = durationArray[i] || 0;
                                                assetIds.push({
                                                    id: ids[i],
                                                    type: isImg ? 'IMAGE' : 'VIDEO',
                                                    duration: durMs ? Math.round(durMs / 1000) : 0
                                                });
                                            }
                                            totalCount += ids.length;
                                        }
                                    } catch (bErr) {}
                                }
                            }
                        } catch (bErr) {}
                    }
                }

                if (assetIds.length > 0) {
                    rawAssets = assetIds;
                    statusText = `Loaded ${rawAssets.length} item${rawAssets.length === 1 ? '' : 's'} from Immich.`;
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
                        } catch (kErr) {}
                        let foundIndex = -1;
                        for (let idx = 0; idx < keysList.length; idx++) {
                            const item = keysList[idx];
                            if ((typeof item === 'string' && item === cacheKey) || (item && item.key === cacheKey)) {
                                foundIndex = idx;
                                break;
                            }
                        }
                        const newEntry = { key: cacheKey, expiresAt: newCache.expiresAt };
                        if (foundIndex > -1) {
                            keysList[foundIndex] = newEntry;
                        } else {
                            keysList.push(newEntry);
                        }
                        $app.store().set("flame_cache_keys", JSON.stringify(keysList));
                    } catch (sErr) {}
                } else if (cached && cached.assets && cached.assets.length > 0) {
                    rawAssets = cached.assets;
                    albumName = cached.albumName || albumName;
                    statusText = `Loaded ${rawAssets.length} items from Immich (stale cache).`;
                }
            }
        }
    }

    // Fallbacks if Immich had no assets
    if (rawAssets.length === 0 && settings.fallback_urls && settings.fallback_urls.length > 0) {
        const now = Date.now();
        const CACHE_TTL_MS = helpers.getCacheTtlMs(settings);
        let allFallbackAssets = [];
        let successfulAlbums = [];

        for (let i = 0; i < settings.fallback_urls.length; i++) {
            const url = settings.fallback_urls[i];
            if (!url) continue;
            const isAmazon = url.includes("amazon.") || url.includes("/photos/share/");
            const isGoogle = url.includes("photos.google.com") || url.includes("photos.app.goo.gl");

            let cacheKey = "";
            let fetcher = null;

            if (isAmazon) {
                const amazonInfo = helpers.parseAmazonShare(url);
                if (amazonInfo) {
                    cacheKey = "amz_" + amazonInfo.shareId;
                    fetcher = () => {
                        const payload = helpers.fetchAmazonPhotos(amazonInfo.origin, amazonInfo.shareId, log);
                        if (payload && payload.images && payload.images.length > 0) {
                            return { images: payload.images, albumName: payload.albumName || "Amazon Photos" };
                        }
                        return null;
                    };
                }
            } else if (isGoogle) {
                const urlMatch = url.match(/(https?:\/\/[^\s]+)/);
                const cleanUrl = urlMatch ? urlMatch[1] : url;
                cacheKey = "gphoto_" + $security.md5(cleanUrl);
                fetcher = () => helpers.fetchGooglePhotos(cleanUrl, log);
            }

            if (cacheKey && fetcher) {
                let cached = null;
                try {
                    const rawCache = $app.store().get("flame_cache_" + cacheKey);
                    if (rawCache) cached = JSON.parse(rawCache);
                } catch (e) {}

                if (cached && cached.expiresAt > now && cached.images && cached.images.length > 0) {
                    allFallbackAssets = allFallbackAssets.concat(cached.images);
                    successfulAlbums.push(cached.albumName || (isAmazon ? "Amazon Photos" : "Google Photos"));
                } else {
                    const result = fetcher();
                    if (result && result.images && result.images.length > 0) {
                        allFallbackAssets = allFallbackAssets.concat(result.images);
                        successfulAlbums.push(result.albumName || (isAmazon ? "Amazon Photos" : "Google Photos"));
                        const newCache = {
                            images: result.images,
                            albumName: result.albumName,
                            expiresAt: now + CACHE_TTL_MS
                        };
                        try {
                            $app.store().set("flame_cache_" + cacheKey, JSON.stringify(newCache));
                        } catch (e) {}
                    } else if (cached && cached.images && cached.images.length > 0) {
                        allFallbackAssets = allFallbackAssets.concat(cached.images);
                        successfulAlbums.push(cached.albumName || (isAmazon ? "Amazon Photos" : "Google Photos"));
                    }
                }
            }
        }

        if (allFallbackAssets.length > 0) {
            rawAssets = allFallbackAssets;
            const uniqueAlbums = Array.from(new Set(successfulAlbums));
            albumName = uniqueAlbums.join(" & ");
            statusText = `Loaded ${rawAssets.length} items from fallback albums (${albumName}).`;
        }
    }

    if (rawAssets.length === 0 && !statusText.includes('fallback')) {
        statusText = 'No valid Immich share URL configured.';
    }

    // Post processing
    if (rawAssets.length > 0) {
        const pinCount = settings.latest_pin_count;
        if (rawAssets.length > pinCount) {
            const pinned = rawAssets.slice(0, pinCount);
            const rest = rawAssets.slice(pinCount);

            if (settings.prioritize_videos) {
                let restVideos = rest.filter(x => x.type === 'VIDEO');
                let restPhotos = rest.filter(x => x.type !== 'VIDEO');
                if (settings.randomize) {
                    helpers.biasedShuffle(restVideos);
                    helpers.biasedShuffle(restPhotos);
                }
                images = pinned.concat(restVideos.concat(restPhotos));
            } else if (settings.randomize) {
                helpers.biasedShuffle(rest);
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
    } else if (shareUrl) {
        const fallback = helpers.fetchOgImageFallback(shareUrl, log);
        if (fallback && fallback.length > 0) {
            images = fallback.map(u => ({ url: u, type: 'IMAGE', duration: 0 }));
            statusText = 'Loaded preview image from Immich.';
        } else {
            statusText = 'Unable to load images from Immich.';
        }
    }

    let shareInfo = null;
    if (shareUrl) {
        const info = helpers.parseShareInfo(shareUrl);
        if (info) {
            shareInfo = {
                origin: info.origin,
                shareKey: info.shareKey,
                atToken: info.atToken
            };
        }
    }

    if (images && images.length > 0) {
        if (shareInfo) {
            const origin = shareInfo.origin;
            const shareKey = encodeURIComponent(shareInfo.shareKey);
            const atQuery = shareInfo.atToken ? `&at=${encodeURIComponent(shareInfo.atToken)}` : '';
            images = images.map(img => {
                if (img.id) {
                    const url = img.type === 'VIDEO'
                        ? `${origin}/api/assets/${img.id}/video/playback?key=${shareKey}${atQuery}`
                        : `${origin}/api/assets/${img.id}/thumbnail?key=${shareKey}&size=preview${atQuery}`;
                    return {
                        url,
                        type: img.type,
                        duration: img.duration || 0
                    };
                }
                return {
                    url: img.url,
                    type: img.type || 'IMAGE',
                    duration: img.duration || 0
                };
            });
        } else {
            images = images.map(img => {
                return {
                    url: img.url,
                    type: img.type || 'IMAGE',
                    duration: img.duration || 0
                };
            });
        }
    }

    return e.json(200, {
        settings,
        images,
        shareInfo,
        statusText,
        albumName
    });
});

// Route: GET /api/custom/settings
routerAdd("GET", "/api/custom/settings", (e) => {
    const helpers = require(__hooks + '/lib/slideshow_helpers.js');
    const user = helpers.getAuthUser(e);
    if (!user) {
        return e.json(401, { error: "Authentication required" });
    }

    const userFilter = "user = {:user}";
    const filterParams = { user: user.id };
    let settings = {
        id: 'defaultsettings',
        color_primary: "#d9d9d9",
        color_accent: "#50fbc2",
        color_background: "#282525",
        search_engine: "https://www.google.com/search?q=",
        randomize: false,
        prioritize_videos: false,
        latest_pin_count: 6,
        slide_interval: 7,
        video_repeat_threshold: 5,
        video_repeat_count: 3,
        autoplay_fullscreen: false,
        cache_ttl: 604800
    };

    let albums = [];
    try {
        const records = $app.findRecordsByFilter("flame_settings", userFilter, "", 1, 0, filterParams);
        let record = records && records.length ? records[0] : null;
        if (!record) {
            const collection = $app.findCollectionByNameOrId("flame_settings");
            record = new Record(collection);
            record.set("user", user.id);
            record.set("color_primary", settings.color_primary);
            record.set("color_accent", settings.color_accent);
            record.set("color_background", settings.color_background);
            record.set("search_engine", settings.search_engine);
            record.set("cache_ttl", settings.cache_ttl);
            $app.save(record);
        }
        if (record) {
            settings = {
                id: record.id,
                user: record.getString("user") || user.id,
                color_primary: record.getString("color_primary") || settings.color_primary,
                color_accent: record.getString("color_accent") || settings.color_accent,
                color_background: record.getString("color_background") || settings.color_background,
                search_engine: record.getString("search_engine") || settings.search_engine,
                fallback_url: record.getString("fallback_url") || settings.fallback_url,
                active_album: record.getString("active_album") || "",
                randomize: record.getBool("randomize"),
                prioritize_videos: record.getBool("prioritize_videos"),
                latest_pin_count: record.getInt("latest_pin_count") || 6,
                slide_interval: record.getInt("slide_interval") || 7,
                video_repeat_threshold: record.getInt("video_repeat_threshold") || 5,
                video_repeat_count: record.getInt("video_repeat_count") || 3,
                autoplay_fullscreen: record.getBool("autoplay_fullscreen"),
                cache_ttl: record.getInt("cache_ttl") || 604800
            };
        }

        const albumRecords = $app.findRecordsByFilter("flame_albums", userFilter, "order,created", 100, 0, filterParams);
        if (albumRecords && albumRecords.length > 0) {
            albums = albumRecords.map(rec => {
                let fallbackUrls = [];
                try {
                    const rawStr = rec.getString("fallback_urls");
                    if (rawStr) fallbackUrls = JSON.parse(rawStr);
                } catch (e) {}
                const amzUrl = rec.getString("amazon_url");
                if ((!fallbackUrls || fallbackUrls.length === 0) && amzUrl) {
                    fallbackUrls = [amzUrl];
                }

                return {
                    id: rec.id,
                    name: rec.getString("name"),
                    immich_url: rec.getString("immich_url"),
                    amazon_url: amzUrl,
                    fallback_urls: fallbackUrls,
                    order: rec.getInt("order")
                };
            });
        }
    } catch (err) {
        return e.json(500, { error: err.message });
    }

    return e.json(200, { settings, albums });
});

// Route: POST /api/custom/settings
routerAdd("POST", "/api/custom/settings", (e) => {
    const helpers = require(__hooks + '/lib/slideshow_helpers.js');
    const user = helpers.getAuthUser(e);
    if (!user) {
        return e.json(401, { error: "Authentication required" });
    }

    let body = {};
    try {
        const data = $apis.requestData(e);
        if (data) body = data;
    } catch (err) {}

    const action = body.action;

    try {
        if (action === 'save_settings') {
            const settingsId = body.settings_id;
            const record = $app.findRecordById("flame_settings", settingsId);
            if (body.color_primary !== undefined) record.set("color_primary", body.color_primary);
            if (body.color_accent !== undefined) record.set("color_accent", body.color_accent);
            if (body.color_background !== undefined) record.set("color_background", body.color_background);
            if (body.randomize !== undefined) record.set("randomize", !!body.randomize);
            if (body.prioritize_videos !== undefined) record.set("prioritize_videos", !!body.prioritize_videos);
            if (body.autoplay_fullscreen !== undefined) record.set("autoplay_fullscreen", !!body.autoplay_fullscreen);
            if (body.latest_pin_count !== undefined) record.set("latest_pin_count", parseInt(body.latest_pin_count, 10) || 6);
            if (body.slide_interval !== undefined) record.set("slide_interval", parseInt(body.slide_interval, 10) || 7);
            if (body.video_repeat_threshold !== undefined) record.set("video_repeat_threshold", parseInt(body.video_repeat_threshold, 10) || 5);
            if (body.video_repeat_count !== undefined) record.set("video_repeat_count", parseInt(body.video_repeat_count, 10) || 3);
            if (body.cache_ttl !== undefined) record.set("cache_ttl", parseInt(body.cache_ttl, 10) || 604800);
            if (body.active_album !== undefined) record.set("active_album", body.active_album || null);
            $app.save(record);
            return e.json(200, { success: true });
        }

        if (action === 'create_album') {
            const collection = $app.findCollectionByNameOrId("flame_albums");
            const record = new Record(collection);
            record.set("user", user.id);
            record.set("name", body.name || "Untitled Album");
            record.set("immich_url", body.immich_url || "");
            record.set("amazon_url", body.amazon_url || "");
            let fallbackUrls = body.fallback_urls || [];
            if (typeof fallbackUrls === 'string') {
                try { fallbackUrls = JSON.parse(fallbackUrls); } catch (err) { fallbackUrls = [fallbackUrls]; }
            }
            record.set("fallback_urls", fallbackUrls);
            record.set("order", parseInt(body.order, 10) || 0);
            $app.save(record);
            return e.json(200, { success: true, id: record.id });
        }

        if (action === 'update_album') {
            const albumId = body.album_id;
            const record = $app.findRecordById("flame_albums", albumId);
            if (body.name !== undefined) record.set("name", body.name);
            if (body.immich_url !== undefined) record.set("immich_url", body.immich_url || "");
            if (body.amazon_url !== undefined) record.set("amazon_url", body.amazon_url || "");
            let fallbackUrls = body.fallback_urls || [];
            if (typeof fallbackUrls === 'string') {
                try { fallbackUrls = JSON.parse(fallbackUrls); } catch (err) { fallbackUrls = [fallbackUrls]; }
            }
            record.set("fallback_urls", fallbackUrls);
            $app.save(record);
            return e.json(200, { success: true });
        }

        if (action === 'delete_album') {
            const albumId = body.album_id;
            $app.delete($app.findRecordById("flame_albums", albumId));
            const userFilter = "user = {:user}";
            const records = $app.findRecordsByFilter("flame_settings", userFilter, "", 1, 0, { user: user.id });
            const settingsRecord = records && records.length ? records[0] : null;
            if (settingsRecord && settingsRecord.getString("active_album") === albumId) {
                const albums = $app.findRecordsByFilter("flame_albums", userFilter, "order,created", 1, 0, { user: user.id });
                if (albums && albums.length > 0) {
                    settingsRecord.set("active_album", albums[0].id);
                } else {
                    settingsRecord.set("active_album", null);
                }
                $app.save(settingsRecord);
            }
            return e.json(200, { success: true });
        }

        if (action === 'swap_albums') {
            const albumA = $app.findRecordById("flame_albums", body.albumA_id);
            const albumB = $app.findRecordById("flame_albums", body.albumB_id);
            const orderA = parseInt(body.albumA_order, 10);
            const orderB = parseInt(body.albumB_order, 10);
            albumA.set("order", orderA);
            albumB.set("order", orderB);
            $app.save(albumA);
            $app.save(albumB);
            return e.json(200, { success: true });
        }

        if (action === 'set_active_album') {
            const userFilter = "user = {:user}";
            const records = $app.findRecordsByFilter("flame_settings", userFilter, "", 1, 0, { user: user.id });
            const settingsRecord = records && records.length ? records[0] : null;
            if (settingsRecord) {
                settingsRecord.set("active_album", body.album_id || null);
                $app.save(settingsRecord);
            }
            return e.json(200, { success: true });
        }

        return e.json(400, { error: "Unknown action: " + action });
    } catch (err) {
        return e.json(500, { error: err.message });
    }
});
