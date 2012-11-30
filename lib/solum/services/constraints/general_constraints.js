/**
 * Constraints for any type of subject
 */


module.exports = (function () {
  "use strict";

  var abstractConstraint = require('./abstract_constraint');
  var general = {};

  general.notNull = function (params, msg) {
    var self = this;
    self.defaultMsg = 'errors.form.general.not_null';

    msg = (msg) ? msg : self.defaultMsg;
    abstractConstraint.call(self, params, msg);

    self.test = function (subject) {
      if (subject === '' || subject === null || subject === undefined) {
        throw {error: self.msg};
      }
      return true;
    };
  };

  general.type = function (params, msg) {
    var self = this;
    self.defaultMsg = 'errors.form.general.type';

    msg = (msg) ? msg : self.defaultMsg;
    abstractConstraint.call(self, params, msg);

    self.test = function (subject) {
      if ((self.params.type === "null" && subject !== null) || typeof subject !== self.params.type) {
        throw {error: self.msg};
      }
      return true;
    };
  };

  return general;
}());