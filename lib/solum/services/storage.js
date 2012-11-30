/*global solum:true, $:true, ko:true, module:true, localStorage:true, sessionStorage:true */

/*
 * solum.js - storage
 * author: brandon eum
 * date: Sep 2012
 */

/**
 * Dependencies:
 *  - Assumes knockout.js
 *  - Assumes solum.js
 */

// Access services library (if needed) through root variable - easier to rename refactor later
module.exports = (function () {
  "use strict";

  /**
   * Storage namespace, currently pertains only to HTML5, but could be other things
   * in the future
   */
  var storage       = {};
  storage.HTML5 = {};

  /**
   * Default configurations for the storage manager.
   */
  storage.HTML5.defaultConfig = {
    ttl: 7 * 24 * 60 * 60 * 1000,
    namespace: "",
    storage: localStorage // HTML5 storage object
  };

  /**
   *
   */
  storage.HTML5.manager = function (config) {
    var
      MetaDataWrapper,
      storageApi,
      ttl,
      namespace,
      storage,
      isStorageAvailable,
      maxedOut,
      isMaxedOut,
      apiAccessor;

    // Merge the new config with the default configurations
    config = $.extend(config, storage.HTML5.defaultConfig);

    /**
     * Sub-object that wraps saved values to capture created time, ttl, and the
     * value of the object being saved
     */
    MetaDataWrapper = function (value, ttl) {
      var now = new Date();

      this.created = now.getTime();
      this.ttl     = ttl;
      this.value   = value;
    };

    storageApi = {};

    // Store the Time To Live (TTL) default as 1 week
    ttl       = config.ttl;
    namespace = config.namespace;
    storage   = config.storage;

    // Check if this feature is supported
    isStorageAvailable = (typeof localStorage === "object" && localStorage !== null);
    isStorageAvailable = isStorageAvailable && (typeof sessionStorage === "object" && sessionStorage !== null);

    // Prevent saving new items if we are maxed out
    maxedOut   = false;
    isMaxedOut = function () { return isMaxedOut; };

    // Store the object in the metadata wrapper and return true upon succesful save
    storageApi.save = function (key, value) {
      if (maxedOut) {
        return false;
      }

      var w = new MetaDataWrapper(value, ttl);
      storage[key] = JSON.stringify(w);

      try {
        w = new MetaDataWrapper(value, ttl);
        storage[key] = JSON.stringify(w);
      } catch (e) {
        // Storage has reached it's limit
        if (e !== "QUOTA_EXCEEDED_ERR") {
          throw e;
        }

        maxedOut = true;
        return false;
      }

      return true;
    };

    // Get the object, check the TTL, and return the value object
    storageApi.get = function (key) {
      var
        badValues,
        type,
        o,
        created,
        ttl,
        d;

      badValues = {'null': true, 'undefined': true, 'false': true};
      type = typeof storage[key];
      if (type === 'undefined' || badValues[type]) {
        return null;
      }

      o = JSON.parse(storage[key]);

      // Check the type of the object
      created = Number(o.created);
      ttl     = Number(o.ttl);
      if (typeof o !== "object" || created === 0 || isNaN(created) || isNaN(ttl)) {
        return null;
      }

      // Check if it has exceeded it's time to live'
      d = new Date();
      if (d.getTime() -  created > ttl) {
        storageApi.remove(key);
        return null;
      }

      // Unwrap and return the base value
      return o.value;
    };

    // Use the storage API to remove the key/clear
    // Unset the maxed out flag
    storageApi.remove = function (key) {
      storage.removeItem(key);
      maxedOut = false;
    };
    storageApi.clear = function () {
      storage.clear();
      maxedOut = false;
    };

    // Return the public API as a single function that does standard feature checks
    apiAccessor = function (method, key, value) {
      if (typeof method !== 'string' || typeof storageApi[method] !== 'function') {
        throw "StorageManager: Method was not a string or does not exist, got type: " + (typeof method);
      }

      if (!isStorageAvailable) {
        return false;
      }

      var nskey = namespace + key;

      return storageApi[method](nskey, value);
    };

    // Add configuration methods outside the accessor
    apiAccessor.isMaxedOut = isMaxedOut;

    return apiAccessor;
  };

  return storage;
}());