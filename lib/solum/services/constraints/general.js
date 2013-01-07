var _ = require('underscore');

/**
 * Constraints for any type of subject
 */
module.exports = (function () {
  "use strict";

  var general = {};

  /**
   * Validates that the field is not null or undefined
   */
  general.notNull = function (params, msg) {
    var self        = this;
    self.name       = 'general.notNull'
    self.defaultMsg = 'errors.form.general.not_null';
    self.msg        = (msg) ? msg : self.defaultMsg;
    self.params     = params;

    self.test = function (subject) {
      if (subject === '' || subject === null || subject === undefined) {
        throw {error: self.msg};
      }
      return true;
    };
  };

  /**
   * Checks the type of the subject using the typeof operator
   */
  general.type = function (params, msg) {
    var self        = this;
    self.name       = 'general.type';
    self.defaultMsg = 'errors.form.general.type';
    msg             = (msg) ? msg : self.defaultMsg;
    self.msg        = msg;
    self.params     = params;

    self.test = function (subject) {
      if ((self.params.type === "null" && subject !== null) || typeof subject !== self.params.type) {
        throw {error: self.msg};
      }
      return true;
    };
  };

  /**
   * Ensures the subject is one of the given choices
   */
  general.choice = function (params, msg) {
    var self        = this;
    self.name       = 'general.choice';
    self.defaultMsg = 'errors.form.general.type';
    msg             = (msg) ? msg : self.defaultMsg;
    self.msg        = msg;
    self.params     = params;

    self.test = function (subject) {;
      if (_.indexOf(self.params.choices, subject) === -1) {
        throw {error: msg};
      }
      return true;
    };
  };

  return general;
}());
