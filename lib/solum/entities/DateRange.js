/*global solum:true, $:true, ko:true, module:true */
/*
 * solum - date range entity
 * author: brandon eum
 * date: Sep 2012
 */

// Modularize so we can abstract the use of "solum" to root just in case we change the name
module.exports = function (solum) {
  var self, today, threeYearsAgo, localization, checkFormat, startConstraints;
  // Properties
  this.properties = {};
  this.properties.start = ko.observable('');
  this.properties.end   = ko.observable('');

  // Constraints
  this.constraints = {
    start: [
      solum.constructConstraint('general', 'notNull')        
    ],
    end: [
      solum.constructConstraint('general', 'notNull')
    ]
  };

};