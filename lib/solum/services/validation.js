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
      var is_valid, are_sub_entities_valid, i, j, errors, curr_check = true;
      is_valid               = true;
      are_sub_entities_valid = true;

      // Clear entity-level errors
      entity.errors.entity.removeAll();

      // Loop through all of the properties and validate
      for (i in entity.properties) {
        // This will only be true if every property is valid because it is being
        // AND'd with the previous result
        curr_check = self.isPropertyValid(entity.properties[i]);
        is_valid = is_valid && curr_check;
      }

      // Confirm the entity-level constraints
      if (is_valid) {
        errors = self.isValid(entity, entity.constraints.entity_constraints);

        is_valid = (errors.length === 0);

        for (j in errors) {
          entity.errors.entity.push(errors[j]);
        }
      }

      return is_valid;
    };

    /**
     * Validate a single property - if it is a sub-entity, recursively validate
     * @param {type} property
     * @param {type} constraints
     * @param {type} errors
     * @returns {Boolean}
     */
    self.isPropertyValid = function (property) {
      var is_valid = true;

      var ent = property.__parent
        , key = property.__name
        , constraints = ent.constraints.properties[key]
        , errors      = ent.errors.properties[key]
        , err_msgs    = null;

      // Clear existing property errors
      errors.removeAll();

      // Check if the property is a sub-entity, if yes, recursively validate, if not
      // validate the property
      if (property.is_entity) {
        var are_sub_entities_valid = self.isEntityValid(property);

        // Add the error to the sub-entity's errors array
        // Note: If there is an error the view should be directly connected to
        //       the sub-entity's errors, however, this will indicate that the
        //       current entity is not valid
        if (!are_sub_entities_valid) {
          errors.push('errors.form.sub_entity.invalid');
          is_valid = false;
        }

        // Validate the KO observable property - Pass in the entire sub-entity
        // as it is an object and not a function
        err_msgs = self.isValid(property, constraints);

      // Validate each item if it is an entity collection
      } else if (property.is_entity_collection) {
        var collection = property(), curr_msgs, is_current_valid;

        for (var i in collection) {
          is_current_valid = self.isEntityValid(collection[i]);
          is_valid = is_valid && is_current_valid;
        }

        // Validate the KO observable property
        err_msgs = self.isValid(property(), constraints);
      } else {
        // Validate the KO observable property
        err_msgs = self.isValid(property(), constraints);
      }

      // Add new errors to the error object
      if (err_msgs.length > 0) {
        is_valid = false;
      }

      for (var j in err_msgs) {
        errors.push(err_msgs[j]);
      }

      return is_valid;
    };

    // Public method to validate an object/literal via a list of constraints
    self.isValid = function (subject, constraint_list) {
      var errors, isFailed, i;
      errors = [];

      for (i in constraint_list) {
        isFailed = false;

        if (constraint_list.hasOwnProperty(i)) {
          try {
            // Add a reference to the validator object to be used by constraints
            // that need recursive validation (entity collections)
            if (constraint_list[i].params) {
              constraint_list[i].params.validator = self;
            }
            constraint_list[i].test(subject);
          } catch (e) {
            errors.push(e.error);
            isFailed = true;
          }

          // Short circuit execution unless explicitly told otherwise
          if (isFailed && !constraint_list[i].continueOnFail) break;
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

  validation.constraints.general    = require('./constraints/general');
  validation.constraints.date       = require('./constraints/date');
  validation.constraints.string     = require('./constraints/string');
  validation.constraints.collection = require('./constraints/collection');

  return validation;
}());
