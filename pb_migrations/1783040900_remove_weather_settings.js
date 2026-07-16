/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("flame_settings");

  const toRemove = [];
  for (let i = 0; i < collection.fields.length; i++) {
    const field = collection.fields[i];
    if (field && (field.name === "weather_lat" || field.name === "weather_lon" || field.name === "weather_unit")) {
      toRemove.push(field.id);
    }
  }

  toRemove.forEach(id => {
    collection.fields.removeById(id);
  });

  return app.save(collection);
}, (app) => {
  // Rollback is not supported for this clean up
})
