/**
 * All constraints related to strings
 */
module.exports = (function () {
  "use strict";

  var string = {};

  string.minLength = function (params, msg) {
    var self        = this;
    self.defaultMsg = 'errors.form.string.min_length';
    self.msg        = (msg) ? msg : self.defaultMsg;
    self.params     = params;

    self.test = function (subject) {
      if (subject.length < self.params.min) {
        throw {error: self.msg};
      }
      return true;
    };
  };

  string.maxLength = function (params, msg) {
    var self        = this;
    self.defaultMsg = 'errors.form.string.max_length';
    self.msg        = (msg) ? msg : self.defaultMsg;
    self.params     = params;

    this.test = function (subject) {
      if (self.params.is_optional && !subject) {
        return true;
      }

      if (subject.length > self.params.max) {
        throw {error: self.msg};
      }
      return true;
    };
  };
  
  string.maxByteLength = function (params, msg) {
    var self        = this;
    self.defaultMsg = 'errors.form.string.max_length';
    self.msg        = (msg) ? msg : self.defaultMsg;
    self.params     = params;
   
    this.test = function (subject) {
   
      if (self.params.is_optional && !subject) {
        return true;
      }
     
      var escapedStr = encodeURI(subject)
      if (escapedStr.indexOf("%") != -1) {
        var byteCount  = escapedStr.split("%").length - 1
        if (byteCount  == 0) byteCount ++  //perverse case; can't happen with real UTF-8
        var tmp = escapedStr.length - (byteCount  * 3)
        byteCount = byteCount  + tmp
      } else {
        byteCount  = escapedStr.length
      }
 
      if (byteCount > self.params.max) {
        throw {error: self.msg};
      }
     
      return true;
    };
  };
  
  string.match = function (params, msg) {
    var self        = this;
    self.defaultMsg = 'errors.form.string.match';
    self.msg        = (msg) ? msg : self.defaultMsg;
    self.params     = params;

    this.test = function (subject) {
      if (self.params.is_optional && !subject) {
        return true;
      }

      if (!self.params.regex.test(subject)) {
        throw {error: self.msg};
      }
      return true;
    };
  };

  return string;
}());
