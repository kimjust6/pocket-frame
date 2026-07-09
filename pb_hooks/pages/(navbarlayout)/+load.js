/**
 * Loader for the homepage startpage dashboard.
 * Slideshow homepage doesn't require collection data.
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
module.exports = function (context) {
    try {
        const user = context.request.auth
        if (!user) {
            context.response.redirect('/login')
            return
        }
        return {
            isHome: true,
            applications: [],
            categories: [],
            bookmarksByCategory: []
        };
    } catch (e) {
        console.error('Failed to load startpage data:', e);
        return {
            isHome: true,
            applications: [],
            categories: [],
            bookmarksByCategory: []
        };
    }
}
