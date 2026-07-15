/**
 * Loader for the Settings page.
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
module.exports = function (context) {
    try {
        let user = context.request.auth
        if (!user) {
            try {
                const users = $app.findRecordsByFilter("users", "1=1", "", 1, 0);
                if (users && users.length) {
                    user = users[0];
                }
            } catch (e) {}
        }
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
            settings
        };
    } catch (e) {
        console.error("Failed in settings loader:", e);
        return {
            isHome: false,
            settings: {}
        };
    }
}
