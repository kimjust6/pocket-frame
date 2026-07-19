/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("flame_albums")

  // add fallback_urls
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "json_fallback_urls",
    "name": "fallback_urls",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  app.save(collection)

  // populate fallback_urls from amazon_url
  try {
    const records = app.findRecordsByFilter("flame_albums", "1=1", "", 5000, 0);
    if (records && records.length > 0) {
      records.forEach((record) => {
        const amazonUrl = record.getString("amazon_url");
        if (amazonUrl && amazonUrl.trim()) {
          record.set("fallback_urls", [amazonUrl.trim()]);
          app.save(record);
        } else {
          record.set("fallback_urls", []);
          app.save(record);
        }
      });
    }
  } catch (e) {
    console.error("Migration error populating fallback_urls: " + e.message);
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("flame_albums")
  collection.fields.removeById("json_fallback_urls")
  return app.save(collection)
})
