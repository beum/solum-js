/*global solum:true, $:true, ko:true, module:true */

var moment = require('moment');

/*
 * solum - date range entity
 * author: brandon eum
 * date: Sep 2012
 */

// Modularize so we can abstract the use of "solum" to root just in case we change the name
solum.entities.DateRange = function (solum) {
  var self         = this
    , format       = 'YYYY-MM-DD';

  // Properties
  this.properties = {};
  this.properties.start = ko.observable('');
  this.properties.end   = ko.observable('');
  
  // Define an entity-level constraint
  // Manually construct them here
  // TODO: Need to figure out a more holistic solution to multi-property constraints
  
  var max_range_constraint    = {};
  max_range_constraint.params = {max: 3, unit: 'years'};
  max_range_constraint.msg    = 'errors.form.date.max_range';
    
  max_range_constraint.test = function () {
    var start_moment = moment(self.properties.start(), format);
    var end_moment   = moment(self.properties.end(), format);
    if (start_moment.diff(end_moment, this.params.unit) > this.params.max) {
      throw {error: this.msg, constraint: this.params.max};
    }
  };
  
  var min_range_constraint    = {};
  min_range_constraint.params = {min: 0, unit: 'days'};
  min_range_constraint.msg    = 'errors.form.date.min_range';
    
  min_range_constraint.test = function () {
    var start_moment = moment(self.properties.start(), format);
    var end_moment   = moment(self.properties.end(), format);
    
    if (start_moment.diff(end_moment, this.params.unit) > this.params.min) {
      throw {error: this.msg, constraint: this.params.max};
    }
  };

  // Constraints
  this.constraints = {
    start: [
      solum.constructConstraint('general', 'notNull'),
      solum.constructConstraint('date', 'isValid', {format: format}),
      solum.constructConstraint('date', 'min', {format: format, min: moment().subtract('years', 3).startOf('year')}),
      solum.constructConstraint('date', 'max', {format: format, max: moment()}),
      min_range_constraint,
      max_range_constraint
    ],
    end: [
      solum.constructConstraint('general', 'notNull'),
      solum.constructConstraint('date', 'isValid', {format: format}),
      solum.constructConstraint('date', 'min', {format: format, min: moment().subtract('years', 3).startOf('year')}),
      solum.constructConstraint('date', 'max', {format: format, max: moment()}),
      min_range_constraint,
      max_range_constraint
    ]
  };

};