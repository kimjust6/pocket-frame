/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "id": "pbc_flamealbums",
    "name": "flame_albums",
    "type": "base",
    "listRule": "user = @request.auth.id",
    "viewRule": "user = @request.auth.id",
    "createRule": "@request.auth.id != \"\" && user = @request.auth.id",
    "updateRule": "user = @request.auth.id",
    "deleteRule": "user = @request.auth.id",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": true,
        "collectionId": "_pb_users_auth_",
        "hidden": false,
        "id": "relation3010000004",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "user",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "name": "name",
        "type": "text",
        "required": true,
        "presentable": true
      },
      {
        "name": "immich_url",
        "type": "text",
        "required": false
      },
      {
        "name": "amazon_url",
        "type": "text",
        "required": false
      },
      {
        "name": "order",
        "type": "number",
        "required": false
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ]
  });
  app.save(collection);

  const settingsCollection = app.findCollectionByNameOrId("flame_settings");
  settingsCollection.fields.addAt(19, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_flamealbums",
    "hidden": false,
    "id": "relation_active_album",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "active_album",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }));
  app.save(settingsCollection);

  // Migrate existing settings
  try {
    const settingsRecords = app.findRecordsByFilter("flame_settings", "1=1", "", 1000, 0);
    if (settingsRecords && settingsRecords.length > 0) {
      settingsRecords.forEach((settingsRecord) => {
        const immichUrl = settingsRecord.getString("search_engine");
        const amazonUrl = settingsRecord.getString("fallback_url");
        const userId = settingsRecord.getString("user");

        if (immichUrl || amazonUrl) {
          const albumRecord = new Record(collection);
          albumRecord.set("user", userId);
          albumRecord.set("name", "Default Album");
          albumRecord.set("immich_url", immichUrl);
          albumRecord.set("amazon_url", amazonUrl);
          albumRecord.set("order", 0);
          app.save(albumRecord);

          settingsRecord.set("active_album", albumRecord.id);
          app.save(settingsRecord);
        }
      });
    }
  } catch (e) {
    console.error("Migration error migrating settings to albums: " + e.message);
  }
}, (app) => {
  const settingsCollection = app.findCollectionByNameOrId("flame_settings");
  settingsCollection.fields.removeById("relation_active_album");
  app.save(settingsCollection);

  const collection = app.findCollectionByNameOrId("flame_albums");
  app.delete(collection);
})
