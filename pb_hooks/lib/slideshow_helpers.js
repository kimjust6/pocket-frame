// Helpers for slideshow and settings API

function getAuthUser(e) {
    if (e.auth) return e.auth;

    // Try Authorization header
    try {
        const authHeader = e.request.header.get("Authorization") || e.request.header.get("authorization");
        if (authHeader) {
            const token = authHeader.replace(/^Bearer\s+/i, "").trim();
            if (token) {
                const user = $app.findAuthRecordByToken(token);
                if (user) return user;
            }
        }
    } catch (err) {}

    // Try pb_auth cookie
    try {
        const cookie = e.request.cookie("pb_auth");
        if (cookie && cookie.value) {
            let val = cookie.value;
            try { val = decodeURIComponent(val); } catch (e) {}
            const parsed = JSON.parse(val);
            if (parsed && parsed.token) {
                const user = $app.findAuthRecordByToken(parsed.token);
                if (user) return user;
            }
        }
    } catch (err) {}

    return null;
}

function getCacheTtlMs(settings) {
    let cacheTtlSec = 7 * 24 * 60 * 60; // 1 week default (604800 seconds)
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

function extractUrlCandidate(rawValue) {
    if (typeof rawValue !== 'string') return '';
    const trimmed = rawValue.trim();
    if (!trimmed) return '';
    const markdown = trimmed.match(/^\[[^\]]+\]\((https?:\/\/[^\s)]+)\)$/i);
    if (markdown && markdown[1]) return markdown[1].trim();
    return trimmed;
}

function normalizeHttpUrl(rawValue) {
    const candidate = extractUrlCandidate(rawValue);
    if (!candidate) return '';
    const withScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(candidate)
        ? candidate
        : `https://${candidate}`;
    const match = withScheme.match(/^(https?:\/\/)?([a-zA-Z0-9.-]+)(:\d+)?(\/.*)?$/);
    if (!match) return '';
    return withScheme;
}

function parseShareInfo(urlValue) {
    const normalized = normalizeHttpUrl(urlValue);
    if (!normalized) return null;
    const match = normalized.match(/^(https?:\/\/[^\/]+)\/share\/([^\/\?]+)(?:\?.*)?$/);
    if (!match) return null;
    const origin = match[1];
    const shareKey = match[2];
    let atToken = '';
    const atMatch = normalized.match(/[?&]at=([^&]+)/);
    if (atMatch) {
        atToken = decodeURIComponent(atMatch[1]);
    }
    return { origin, shareKey, atToken };
}

function collectAssetIds(value, bucket) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            collectAssetIds(value[i], bucket);
        }
        return;
    }
    if (typeof value.id === 'string') {
        const type = typeof value.type === 'string' ? value.type.toUpperCase() : '';
        if (!type || type === 'IMAGE' || type === 'VIDEO') {
            bucket.push({
                id: value.id,
                type: type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
                duration: value.duration ? Math.round(value.duration) : 0
            });
            return;
        }
    }
    const keys = Object.keys(value);
    for (let i = 0; i < keys.length; i++) {
        collectAssetIds(value[keys[i]], bucket);
    }
}

function fetchSharePayload(origin, shareKey, atToken, log) {
    const encodedKey = encodeURIComponent(shareKey);
    const atQuery = atToken ? `&at=${encodeURIComponent(atToken)}` : '';
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
            if (res.statusCode === 200 && res.json) {
                return res.json;
            }
        } catch (err) {
            log("fetchSharePayload url: " + url + " error: " + err.message);
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
            if (res.statusCode === 200 && res.json) {
                return res.json;
            }
        } catch (err) {
            log("fetchSharePayload header url: " + url + " error: " + err.message);
        }
    }
    return null;
}

function fetchOgImageFallback(urlValue, log) {
    try {
        log("fetchOgImageFallback trying: " + urlValue);
        const res = $http.send({
            url: urlValue,
            method: "GET",
            timeout: 10
        });
        if (res.statusCode === 200 && res.raw) {
            const html = res.raw;
            const match =
                html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
            if (match && match[1]) {
                return [match[1]];
            }
        }
    } catch (err) {
        log("fetchOgImageFallback error: " + err.message);
    }
    return [];
}

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
        log("fetchAmazonPhotos: warming session by visiting share page...");
        const sharePageUrl = `${origin}/photos/share/${shareId}?sort=sortOldestToNewest`;
        const sharePageRes = $http.send({
            url: sharePageUrl,
            method: "GET",
            headers: { "user-agent": userAgent, "accept": "text/html" },
            timeout: 10
        });

        let cookieHeader = "";
        if (sharePageRes.cookies && sharePageRes.cookies.length > 0) {
            const firstCookie = sharePageRes.cookies[0];
            if (firstCookie.name) {
                cookieHeader = sharePageRes.cookies.map(c => `${c.name}=${c.value}`).join("; ");
            } else if (firstCookie.Name) {
                cookieHeader = sharePageRes.cookies.map(c => `${c.Name}=${c.Value}`).join("; ");
            }
        }

        if (!cookieHeader) {
            const setCookie = sharePageRes.headers && (
                sharePageRes.headers["set-cookie"] ||
                sharePageRes.headers["Set-Cookie"]
            );
            if (setCookie) {
                const rawHeaders = Array.isArray(setCookie) ? setCookie : [setCookie];
                cookieHeader = rawHeaders.map(h => h.split(";")[0].trim()).join("; ");
            }
        }

        const headers = Object.assign({}, baseHeaders);
        if (cookieHeader) {
            headers["cookie"] = cookieHeader;
        }

        const shareUrl = `${origin}/drive/v1/shares/${shareId}?shareId=${shareId}&resourceVersion=V2&ContentType=JSON`;
        const shareRes = $http.send({
            url: shareUrl,
            method: "GET",
            headers,
            timeout: 10
        });
        if (shareRes.statusCode !== 200 || !shareRes.json) {
            return null;
        }

        const nodeInfoId = shareRes.json.nodeInfo && shareRes.json.nodeInfo.id;
        if (!nodeInfoId) return null;

        const folderUrl = `${origin}/drive/v1/nodes/${nodeInfoId}/children?asset=ALL&limit=1&searchOnFamily=false&shareId=${shareId}&offset=0&resourceVersion=V2&ContentType=JSON`;
        const folderRes = $http.send({
            url: folderUrl,
            method: "GET",
            headers,
            timeout: 10
        });
        if (folderRes.statusCode !== 200 || !folderRes.json || !folderRes.json.data || !folderRes.json.data.length) {
            return null;
        }

        const folderId = folderRes.json.data[0].id;
        const images = [];
        let offset = 0;
        const limit = 200;
        let hasMore = true;

        while (hasMore && images.length < 5000) {
            const itemsUrl = `${origin}/drive/v1/nodes/${folderId}/children?asset=ALL&limit=${limit}&searchOnFamily=false&shareId=${shareId}&offset=${offset}&resourceVersion=V2&ContentType=JSON&tempLink=true`;
            const itemsRes = $http.send({
                url: itemsUrl,
                method: "GET",
                headers,
                timeout: 15
            });
            if (itemsRes.statusCode !== 200 || !itemsRes.json || !itemsRes.json.data) {
                break;
            }

            const nodes = itemsRes.json.data;
            if (nodes.length === 0) break;

            for (const node of nodes) {
                if (node.status === "AVAILABLE" && node.tempLink) {
                    const isVideo = node.contentProperties && node.contentProperties.contentType && node.contentProperties.contentType.startsWith("video/");
                    const type = isVideo ? "VIDEO" : "IMAGE";
                    const presignedLink = node.tempLink.replace("/cdproxy/templink/", "/v2/download/presigned/");
                    const url = `${presignedLink}?shareId=${shareId}`;
                    images.push({ url, type, duration: 0 });
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

function fetchGooglePhotos(urlValue, log) {
    try {
        log("fetchGooglePhotos: fetching URL: " + urlValue);
        const res = $http.send({
            url: urlValue,
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            timeout: 15
        });
        if (res.statusCode !== 200 || !res.raw) return null;

        const html = res.raw;
        let albumName = "Google Photos Album";
        const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
                           html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
            albumName = titleMatch[1]
                .replace(/&#39;/g, "'")
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>');
        }

        const pattern = /"https:\/\/lh3\.googleusercontent\.com\/pw\/([^"=]+)"/g;
        const ids = new Set();
        let match;
        while ((match = pattern.exec(html)) !== null) {
            const id = match[1].replace(/\\/g, "");
            ids.add(id);
        }

        const images = [];
        for (const id of ids) {
            images.push({
                url: `https://lh3.googleusercontent.com/pw/${id}=w2048-h2048`,
                type: "IMAGE",
                duration: 0
            });
        }

        return { images, albumName };
    } catch (e) {
        log("fetchGooglePhotos exception: " + e.message);
    }
    return null;
}

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

module.exports = {
    getAuthUser,
    getCacheTtlMs,
    extractUrlCandidate,
    normalizeHttpUrl,
    parseShareInfo,
    collectAssetIds,
    fetchSharePayload,
    fetchOgImageFallback,
    parseAmazonShare,
    fetchAmazonPhotos,
    fetchGooglePhotos,
    biasedShuffle
};
