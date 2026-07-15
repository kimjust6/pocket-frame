/**
 * Loader for the Settings page.
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
module.exports = function (context) {
    try {
        const user = context.request.auth
        if (!user) {
            context.response.redirect('/login')
            return
        }
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
            latest_pin_count: 6,
            slide_interval: 7,
            video_repeat_threshold: 5,
            video_repeat_count: 3,
            autoplay_fullscreen: false,
            cache_ttl: 604800
        };

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
                record.set("weather_lat", settings.weather_lat);
                record.set("weather_lon", settings.weather_lon);
                record.set("weather_unit", settings.weather_unit);
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
                    weather_lat: record.getString("weather_lat") || settings.weather_lat,
                    weather_lon: record.getString("weather_lon") || settings.weather_lon,
                    weather_unit: record.getString("weather_unit") || settings.weather_unit,
                    search_engine: record.getString("search_engine") || settings.search_engine,
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
            console.error("Failed to load settings in settings loader:", e);
        }

        return {
            isHome: false,
            settings,
            applications: [],
            categories: [],
            bookmarks: []
        };
    } catch (e) {
        console.error("Failed in settings loader:", e);
        return {
            isHome: false,
            settings: {},
            applications: [],
            categories: [],
            bookmarks: []
        };
    }
}
