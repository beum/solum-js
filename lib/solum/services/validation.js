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

// Access services library (if needed) through root variable - easier to rename refactor later
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

  validation.constraints = {};
  validation.constraints.general = require('./constraints/general_constraints');
  validation.constraints.date    = require('./constraints/date_constraints');
  validation.constraints.string  = require('./constraints/string_constraints');

  /**
   * Construct a constraint with the right parameters and translated message
   */
  validation.constructConstraint = function (group, name, params, msg) {
    var constraints = validation.constraints;
    if (!constraints[group] || !constraints[group][name]) {
      throw "ConstructConstraint: Constraint not found: " + group + ":" + name;
    }
    var constraint = validation.constraints[group][name];
    return new constraint(params, msg);
  };

  return validation;
}());