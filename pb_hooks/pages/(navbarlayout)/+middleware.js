const common = require(__hooks + '/lib/common.js')

// Configure your site URL here (no trailing slash)
const BASE_URL = 'https://link.jkim.win';

/**
 * Middleware function to provide site metadata and global data.
 * @param {import('pocketpages').MiddlewareContext} context - The middleware context.
 * @returns {Object} The metadata and data object.
 */
module.exports = function (context) {
    const user = context.request && context.request.auth ? context.request.auth : null

    if (!user) {
        context.response.redirect('/login')
        return
    }

    let settings = {
        id: 'defaultsettings',
        user: user.id,
        color_primary: "#d9d9d9",
        color_accent: "#50fbc2",
        color_background: "#282525",
        weather_lat: "43.6532",
        weather_lon: "-79.3832",
        weather_unit: "celsius",
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

    try {
        const records = $app.findRecordsByFilter("flame_settings", "user = {:user}", "", 1, 0, { user: user.id });
        const record = records && records.length ? records[0] : null;
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
        }
    } catch (e) {
        // collection doesn't exist yet or is empty
    }

    if (context.locals) {
        context.locals.settings = settings;
    }

    return {
        settings,
        metadata: [
            // Basic metadata
            {
                name: 'title',
                content: 'Pocket Frame',
            },
            {
                name: 'description',
                content: "Your self-hosted photo frame and slideshow manager.",
            },
            { name: 'url', content: BASE_URL },

            // Open Graph metadata
            {
                name: 'og:title',
                content: 'Pocket Frame',
            },
            { name: 'og:type', content: 'website' },
            { name: 'og:url', content: BASE_URL },
            {
                name: 'og:image',
                content: `${BASE_URL}/og-image.webp`,
            },
            { name: 'og:image:alt', content: 'Pocket Frame' },
            { name: 'og:image:width', content: '637' },
            { name: 'og:image:height', content: '425' },
            {
                name: 'og:description',
                content: "Your self-hosted photo frame and slideshow manager.",
            },
            { name: 'og:site_name', content: 'Pocket Frame' },
            { name: 'og:locale', content: 'en_US' },

            // Twitter Card metadata (optional, but helpful)
            { name: 'twitter:card', content: 'summary_large_image' },
            { name: 'twitter:site', content: '@MatchaLatteTea' },
            {
                name: 'twitter:title',
                content: 'Pocket Frame',
            },
            {
                name: 'twitter:description',
                content: "Your self-hosted photo frame and slideshow manager.",
            },
            {
                name: 'twitter:image',
                content: `${BASE_URL}/og-image.webp`,
            },
        ],
    }
}
