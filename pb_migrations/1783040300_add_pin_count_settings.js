/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("flame_settings")

  // add latest_pin_count
  collection.fields.addAt(12, new Field({
    "hidden": false,
    "id": "number1702814103",
    "name": "latest_pin_count",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number",
    "min": 0
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("flame_settings")

  collection.fields.removeById("number1702814103")

  return app.save(collection)
})
