/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("flame_settings")

  // add autoplay_fullscreen
  collection.fields.addAt(16, new Field({
    "hidden": false,
    "id": "bool1702814107",
    "name": "autoplay_fullscreen",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("flame_settings")

  collection.fields.removeById("bool1702814107")

  return app.save(collection)
})
