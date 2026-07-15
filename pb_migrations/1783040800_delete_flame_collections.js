/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  try {
    const bookmarks = app.findCollectionByNameOrId("pbc_bookmarksflam");
    app.delete(bookmarks);
  } catch (e) {
    console.log("Bookmarks collection already deleted or not found: " + e.message);
  }

  try {
    const categories = app.findCollectionByNameOrId("pbc_categories123");
    app.delete(categories);
  } catch (e) {
    console.log("Bookmark categories collection already deleted or not found: " + e.message);
  }

  try {
    const applications = app.findCollectionByNameOrId("pbc_applications");
    app.delete(applications);
  } catch (e) {
    console.log("Applications collection already deleted or not found: " + e.message);
  }
}, (app) => {
  // Rollback is not supported for this clean up migration
})
