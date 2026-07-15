/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("flame_settings")

  // add cache_ttl
  collection.fields.addAt(18, new Field({
    "hidden": false,
    "id": "number_cache_ttl",
    "name": "cache_ttl",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number",
    "min": 1
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("flame_settings")

  collection.fields.removeById("number_cache_ttl")

  return app.save(collection)
})
