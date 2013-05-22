/**
 * Provide a way to turn primitives into solum entities
 * This allows people to use entity collection functions and validation on primitive
 * values
 */
var Primitive = function Primitive() {
  var self = this;

  this.properties = {};
  this.properties.value = ko.observable();

  // Enforced Constraints
  this.constraints = {};
  this.constraints.properties = {
    value: []
  };
};

/**
 * Return a string primitive as the serialization method
 * @returns string
 */
Primitive.prototype.toObject = function () {
  return this.value();
};

/**
 * The AgeDemographics property is a simple array of strings so we need to
 * serialize from a string primitive and not an object
 *
 * @param string value
 */
Primitive.prototype.fromObject = function (value) {
  this.value(value);
};

module.exports = Primitive;