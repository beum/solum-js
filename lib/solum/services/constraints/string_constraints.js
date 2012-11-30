/**
 * All constraints related to strings
 */
(function (root) {
  "use strict";

  var abstractConstraint = require('./abstract_constraint');
  var string = {};

  string.minLength = function (params, msg) {
    var self = this;
    self.defaultMsg = 'errors.form.string.min_length';

    msg = (msg) ? msg : self.defaultMsg;
    abstractConstraint.call(self, params, msg);

    self.test = function (subject) {
      if (subject.length < self.params.min) {
        throw {error: self.msg};
      }
      return true;
    };
  };

  string.maxLength = function (params, msg) {
    var self = this;
    self.defaultMsg = 'errors.form.string.max_length';

    msg = (msg) ? msg : self.defaultMsg;
    abstractConstraint.call(self, params, msg);

    this.test = function (subject) {
      if (subject.length > self.params.max) {
        throw {error: self.msg};
      }
      return true;
    };
  };

  string.match = function (params, msg) {
    var self = this;
    self.defaultMsg = 'errors.form.string.match';

    msg = (msg) ? msg : self.defaultMsg;
    abstractConstraint.call(self, params, msg);

    this.test = function (subject) {
      if (subject.match(self.params.regex)) {
        throw {error: self.msg};
      }
      return true;
    };
  };

  return string;
}());