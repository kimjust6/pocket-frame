/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("flame_settings")

  // add randomize
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "bool1702814101",
    "name": "randomize",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add prioritize_videos
  collection.fields.addAt(11, new Field({
    "hidden": false,
    "id": "bool1702814102",
    "name": "prioritize_videos",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("flame_settings")

  collection.fields.removeById("bool1702814101")
  collection.fields.removeById("bool1702814102")

  return app.save(collection)
})
