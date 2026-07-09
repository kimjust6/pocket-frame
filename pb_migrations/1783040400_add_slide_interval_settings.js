/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("flame_settings")

  // add slide_interval
  collection.fields.addAt(13, new Field({
    "hidden": false,
    "id": "number1702814104",
    "name": "slide_interval",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number",
    "min": 1
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("flame_settings")

  collection.fields.removeById("number1702814104")

  return app.save(collection)
})
