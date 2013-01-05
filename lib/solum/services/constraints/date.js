var moment = require('moment');

/**
 * Date related constraints
 */
module.exports = (function () {
  "use strict";
  var date         = {};

  /**
   * Check that the date format is valid
   *
   * TODO: Set the date format somewhere else
   */
  date.isValid = function (params, msg) {
    var self            = this;
    self.continueOnFail = false;
    self.defaultMsg     = 'errors.form.date.invalid';
    self.msg            = (msg) ? msg : self.defaultMsg;
    self.params         = params;

    self.test = function (subject) {
      // Must do a regex check because moment ignores non-numeric characters
      if (!self.params.format_regex.test(subject)) {
        throw {error: self.msg};
      } else if (!moment(subject, self.params.format).isValid()) {
        throw {error: self.msg};
      }
      return true;
    };
  };

  /**
   * Min Date Constraint
   */
  date.min = function (params, msg) {
    var self            = this;
    self.continueOnFail = false;
    self.defaultMsg     = 'errors.form.date.min';
    self.msg            = (msg) ? msg : self.defaultMsg;
    self.params         = params;

    self.test = function (subject) {
      var subj_moment = moment(subject, self.params.format);

      if (subj_moment.diff(self.params.min, 'days') < 0) {
        throw {error: self.msg, constraint: params.min};
      }
      return true;
    };
  };

  /**
   * Max Date Constraint
   */
  date.max = function (params, msg) {
    var self            = this;
    self.continueOnFail = false;
    self.defaultMsg     = 'errors.form.date.max';
    self.msg            = (msg) ? msg : self.defaultMsg;
    self.params         = params;

    self.test = function (subject) {
      var subj_moment = moment(subject, self.params.format);

      if (subj_moment.diff(self.params.max, 'days') > 0) {
        throw {error: self.msg, constraint: params.max};
      }
      return true;
    };
  };

  return date;
}());
