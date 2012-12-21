/**
 * Constraints for any type of subject
 */

// Access services library (if needed) through root variable - easier to rename refactor later
module.exports = (function () {
  "use strict";

  var general = {};

  general.notNull = function (params, msg) {
    var self        = this;
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

  general.type = function (params, msg) {
    var self        = this;
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

  return general;
}());
