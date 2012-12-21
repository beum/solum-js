/*global solum:true, $:true, ko:true, module:true */

/*
 * solum.js - validation
 * author: brandon eum
 * date: Sep 2012
 */

/**
 * Dependencies:
 *  - Assumes knockout.js
 *  - Assumes solum.js
 */
module.exports = (function () {
  "use strict";

   /**
   * Validation namespace which includes the validator and the standard constraints
   */
  var validation = {};

  /**
   * Date/number format for the constraint engine
   */
  validation.defaultConfig = {

  };

  /**
   * Validation engine that uses the standard constraints, plus any user-specified
   * constraints to validate an object.
   */
  validation.validator = function (config) {
    var self;
    self = this;

    // No use yet, but leaving just in case
    config = $.extend(config, validation.defaultConfig);

    /**
     * Loop through all of the enumerable properties of an entity and validate
     * them against the constraints
     */
    self.isEntityValid = function (entity) {
      var isValid, i, stdProps, skip, j, errors;
      isValid = true;

      // Loop through all of the properties and validate
      for (i in entity) {
        if (entity.hasOwnProperty(i)) {
          // This check for entity standard properties is purely for IE8 support
          stdProps = ['errors', 'constraints', 'hasError'];
          skip = false;
          for (j in stdProps) {
            if (stdProps.hasOwnProperty(j) && i === stdProps[j]) {
              skip = true;
            }
          }

          // Skip standard properties
          if (!skip) {
            // Validate the KO observable property
            errors = self.isValid(entity[i](), entity.constraints[i]);

            // Clear existing errors
            entity.errors[i].removeAll();

            // Add new errors to the error object
            for (j in errors) {
              if (errors.hasOwnProperty(j)) {
                entity.errors[i].push(errors[j]);
              }
            }

            if (errors.length > 0) {
              isValid = false;
            }
          }
        }
      }
      return isValid;
    };

    // Public method to validate an object/literal via a list of constraints
    self.isValid = function (subject, constraintList) {
      var errors, isFailed, i;
      errors = [];

      for (i in constraintList) {
        isFailed = false;

        if (constraintList.hasOwnProperty(i)) {
          try {
            constraintList[i].test(subject);
          } catch (e) {
            errors.push(e.error);
            isFailed = true;
          }

          // Short circuit execution unless explicitly told otherwise
          if (isFailed && !constraintList[i].continueOnFail) break;
        }
      }

      return errors;
    };
  };// END VALIDATOR

  /**
   * Namespace for constraints for validation
   */
  validation.constraints = {};
  
  /**
   * Construct a constraint with the right parameters and translated message
   */
  validation.constraints.constructConstraint = function (group, name, params, msg) {
    var constraints = validation.constraints;
    if (!constraints[group] || !constraints[group][name]) {
      throw "ConstructConstraint: Constraint not found.";
    }

    return new validation.constraints[group][name](params, msg);
  };

  // Constraint Template - An example of what a constraint should look like
  validation.constraints.abstractConstraint = function (params, msg) {
    this.msg            = msg;
    this.params         = params;
    this.continueOnFail = false;
    this.test           = function (subject) {
      throw {error: self.msg};
    };
  };
  
  validation.constraints.general = require('./constraints/general');
  validation.constraints.date    = require('./constraints/date');
  validation.constraints.string  = require('./constraints/string');
  
  return validation;
}());
