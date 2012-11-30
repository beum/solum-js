/*global solum:true, $:true, ko:true, module:true */
/*
 * solum - date range entity
 * author: brandon eum
 * date: Sep 2012
 */

/**
 * Represents a start and end date with validation
 */
var DateRange = function () {
  "use strict";

  var self, today, threeYearsAgo, localization, checkFormat, startConstraints;
  // Properties
  this.start = ko.observable('');
  this.end   = ko.observable('');

  // Constraints
  self          = this;
  today         = Date.today();
  threeYearsAgo = Date.today().add({years: -3});

  localization =  root.config.dateAndNumberFormatLocalization;
  checkFormat = localization[root.config.locale];

  /* TODO: Use new constraint format
  startConstraints = [
    {
      constraint: 'notNull',
      msgTranslations: {
        START_END_DATE: {value: 'start date', mustTranslate: true, type: 'string'}
      }
    },
    {constraint: 'date', params: {localization: checkFormat}},
    {
      constraint: 'minDate',
      params: {minDate: threeYearsAgo},
      msgTranslations: {
        THREE_YEARS_AGO: {value: threeYearsAgo, mustTranslate: true, type: 'date'}
      }
    },
    {
      constraint: 'maxDate',
      params: {maxDate: today},
      msgTranslations: {
        TODAY: {value: today, mustTranslate: true, type: 'date'}
      }
    },
    {
      constraint: function (s, checkFormat) {
        var
          delim,
          map,
          vals,
          year,
          month,
          day,
          start,
          end;

        delim  = checkFormat.delim;
        map    = checkFormat.map;

        // Avoid situations where one of the dates is not initialized
        if (self.start() !== null || self.end() !== null) {
          // Y/M/d value validation
          vals  = self.start().split(delim);
          year  = Number(vals[map.year]);
          month = Number(vals[map.month]);
          day   = Number(vals[map.day]);
          start = new Date(year, month, day);

          vals    = self.end().split(delim);
          year    = Number(vals[map.year]);
          month   = Number(vals[map.month]);
          day     = Number(vals[map.day]);
          end = new Date(year, month, day);

          if (start > end) {
            throw {error: "errors.form.date.start_greater_than_end"};
          }
        }

        return true;
      },
      params: checkFormat
    }
  ];

  this.constraints = {
    start: startConstraints,
    end:   [
      {constraint: 'notNull'},
      {constraint: 'date', params: {localization: checkFormat}},
      {constraint: 'minDate', params: {minDate: threeYearsAgo}},
      {constraint: 'maxDate', params: {maxDate: today}}
    ]
  };/**/
};

module.exports = DateRange;