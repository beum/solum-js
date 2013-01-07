var _ = require('underscore');

/**
 * Methods for validating a collection of solum entities
 */
module.exports = (function () {
  "use strict";

  var collection = {};

  /**
   * Loops through a KO observable array of entities and validates each of them
   */
  collection.validate = function (params, msg) {
    var self        = this;
    self.name       = 'collection.validate';
    self.defaultMsg = 'errors.form.collection.validate';
    msg             = (msg) ? msg : self.defaultMsg;
    self.msg        = msg;
    self.params     = params;

    self.test = function (entities) {
      var i;

      for (i in entities) {
        if (!params.validator.isEntityValid(entities[i])) {
          throw {error: self.msg};
        }
      }

      return true;
    };
  };

  /**
   * Checks the uniqueness of a specific property across a collection of entities
   */
  collection.unique = function (params, msg) {
    var self        = this;
    self.name       = 'collection.unique';
    self.defaultMsg = 'errors.form.collection.unique';
    msg             = (msg) ? msg : self.defaultMsg;
    self.msg        = msg;
    self.params     = params;

    self.test = function (entities) {
      var values, unique_values
        , property = self.params.property;

      // Map the array of entities to flatten to a list of values
      values = _.map(entities, function (value, key, list) {
        return value[property]();
      });

      unique_values = _.uniq(values);

      if (values.length !== unique_values.length) {
        throw {error: self.msg};
      }

      return true;
    };
  };


  return collection;
}());

