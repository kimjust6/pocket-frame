/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("flame_settings")

  // add fallback_url
  collection.fields.addAt(17, new Field({
    "hidden": false,
    "id": "text_fallback_url",
    "name": "fallback_url",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("flame_settings")

  collection.fields.removeById("text_fallback_url")

  return app.save(collection)
})
