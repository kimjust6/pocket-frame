// PocketBase hook to set Cache-Control headers for static assets
routerUse((e) => {
    try {
        if (e.request && e.request.url) {
            const path = e.request.url.Path || e.request.url.path || "";
            // Cache static assets like JS and CSS files for 1 year
            if (path.startsWith("/js/") || path === "/app.css") {
                e.response.header().set("Cache-Control", "public, max-age=31536000, immutable");
            } else if (path === "/favicon.ico") {
                // Cache favicon for 1 week
                e.response.header().set("Cache-Control", "public, max-age=604800");
            }
        }
    } catch (err) {
        // Silent catch to prevent breaking core routing if structures vary
    }
    return e.next();
});
