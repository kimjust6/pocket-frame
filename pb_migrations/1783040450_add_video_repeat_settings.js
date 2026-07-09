/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("flame_settings")

  // add video_repeat_threshold
  collection.fields.addAt(14, new Field({
    "hidden": false,
    "id": "number1702814105",
    "name": "video_repeat_threshold",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number",
    "min": 0
  }))

  // add video_repeat_count
  collection.fields.addAt(15, new Field({
    "hidden": false,
    "id": "number1702814106",
    "name": "video_repeat_count",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number",
    "min": 1
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("flame_settings")

  collection.fields.removeById("number1702814105")
  collection.fields.removeById("number1702814106")

  return app.save(collection)
})
