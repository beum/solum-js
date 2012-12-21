/*global solum:true, $:true, ko:true, module:true */

/*
 * solum.js - tables
 * author: brandon eum
 * date: Sep 2012
 */

/**
 * Dependencies:
 *  - Assumes knockout.js
 *  - Assumes solum.js
 */


// The tables object is a module which abstracts the solum keyword
// Access services library (if needed) through root variable - easier to rename refactor later
module.exports = (function () {
  "use strict";

  // Container for functions for the tables namespace
  var api  = {};

  /**
   * Paginated Table
   */
  api.paginatedTable = function () {
    // Prevent people from accidentally setting global variables by not using
    // the new keyword
    if (!(this instanceof api.paginatedTable)) {
      return new api.paginatedTable();
    }

    var self, tableApi;

    self = this;

    // Private variable to store all of the public methods, enumerated at the
    // bottom in the API section
    tableApi = {};

    // A public array of reports (has to be public for knockoutjs to manipulate)
    tableApi.list = ko.observableArray([]);

    // Set the page object, for information and for ajax requests, use the sister object directly
    tableApi.page = new api.page();

    // Knockout render functions
    tableApi.view              = {};
    tableApi.view.afterRender  = function () {};
    tableApi.view.afterAdd     = function () {};
    tableApi.view.beforeRemove = function () {};

    tableApi.addItem  = function (item) {
      self.list.push(item);
    };

    tableApi.addItems = function (items) {
      var i;
      if (typeof items !== "object" || items === null) {
        throw "Add items helper requires an array. Received: " + typeof items;
      }

      for (i in items) {
        if (items.hasOwnProperty(i)) {
          self.addItem(items[i]);
        }
      }

      return items;
    };

    // Remove method based on the key/value pair
    tableApi.removeItems = function (key, value) {
      var list, temp, i;
      list = self.list();
      temp = [];

      for (i in list) {
        if (list.hasOwnProperty(i) && (typeof list[i][key] === "undefined" || list[i][key] !== value)) {
          temp.push(list[i]);
        }
      }

      self.empty();
      self.addItems(temp);
    };

    // Helper to clear items.  This is different than removing because no ajax method
    // is called before clearing
    tableApi.empty = function () {
      self.list.splice(0, self.list().length);
    };

    // Reload function to empty then load list - Convenience function
    tableApi.reload = function (items) {
      self.empty();
      self.addItems(items);
    };

    /* PUBLIC tableApi - PUBLIC PROPERTIES AND METHODS HERE */
    // Properties
    this.list          = tableApi.list;
    this.view          = tableApi.view;
    this.page          = tableApi.page;

    // Methods
    this.addItem       = tableApi.addItem;
    this.addItems      = tableApi.addItems;

    this.removeItems    = tableApi.removeItems;
    this.empty         = tableApi.empty;
    this.reload        = tableApi.reload;
  }; // END Paginated Table

  api.groupedList = function () {
    var self, groupedListApi, empty;

    // Prevent people from accidentally setting global variables by not using
    // the new keyword
    if (!(this instanceof api.groupedList)) {
      return new api.groupedList();
    }

    self = this;

    // Private variable to store all of the public methods, enumerated at the
    // bottom in the API section
    groupedListApi = {};

    groupedListApi.groupedList = ko.observableArray([]);
    groupedListApi.table       = new api.paginatedTable();

    groupedListApi.view              = {};
    groupedListApi.view.afterRender  = function () {};
    groupedListApi.view.afterAdd     = function () {};
    groupedListApi.view.beforeRemove = function () {};

    // Property to group the list by
    groupedListApi.groupBy = ko.observable(null);
    groupedListApi.setGroupBy = function (p) {
      self.groupBy(p);
      self.groupItems();
    };

    // Clear all the elements in the list
    empty = function () {
      self.groupedList.splice(0, self.groupedList().length);
    };

    // Take the groupBy property and attempt to group the simple list by that
    // property
    groupedListApi.groupItems = function () {
      var p, list, temp, i, t;

      p = self.groupBy();
      empty();
      list = self.table.list();

      // If the group-by property does not exist, put everything into a null group
      if (!p) {
        self.groupedList.push({
          property: null,
          // Copy the simple list into the grouped list
          entries: list.slice(0)
        });

        return;
      }

      // Loop through the list and construct the grouped list
      temp = {};

      for (i in list) {
        if (list.hasOwnProperty(i)) {
          // If you are grouping by something it must exist on all objects in list
          if (typeof list[i][p] === "undefined") {
            throw "GroupedList.groupItems: group by property does not exist on one or more elements.";
          } else {
            // Every distinct value of the property is stored as a key in the object
            // if it doesn't exist, create an empty array for entries, otherwise push
            if (typeof temp[list[i][p]] !== "object") {
              temp[list[i][p]] = [];
            }

            temp[list[i][p]].push(list[i]);
          }
        }
      }

      // Push all of the new elements in
      t = null;
      for (i in temp) {
        if (temp.hasOwnProperty(i)) {
          // Create an object with the category as a property and insert into the array
          t = {property: i, entries: temp[i]};
          self.groupedList.push(t);
        }
      }
    };

    /* PUBLIC API - LIST PUBLIC METHODS AND PROPERTIES HERE */
    // Properties
    this.groupedList = groupedListApi.groupedList;
    this.table       = groupedListApi.table;
    this.view        = groupedListApi.view;

    // Methods
    this.groupBy     = groupedListApi.groupBy;
    this.setGroupBy  = groupedListApi.setGroupBy;
    this.groupItems  = groupedListApi.groupItems;
  }; // END GROUPEDLIST

  api.page = function () {
    var self, setSort;

    // Prevent people from accidentally setting global variables by not using
    // the new keyword
    if (!(this instanceof api.page)) {
      return new api.page();
    }

    self = this;

    // Will be called when the page or sort of the object is changed
    self.onChange = function () { return self; };

    self.page    = ko.observable(1);
    self.getPage = function () { return self.page(); };
    self.setPage = function (num) {
      var retVal = false;

      // Error conditions
      if (typeof num !== "number") {
        throw "Page: setPage only accepts a number";
      }
      if (num >= 1 && num <= self.getTotalPages() && num !== self.page()) {
        self.page(num);
        retVal = self.onChange();
      }
      
      return retVal;
    };

    // Convenience methods to set the page
    self.first    = function () { return self.setPage(1); };
    self.next     = function () { return self.setPage(self.page() + 1); };
    self.previous = function () { return self.setPage(self.page() - 1); };
    self.last     = function () { return self.setPage(self.totalPages()); };

    // Set the page to the first page or trigger the onChange
    self.setPageToFirstAndTriggerOnChange = function () {
      var ret;
      if (self.getPage() !== 1) {
        ret = self.first();
      } else {
        ret = self.onChange();
      }

      return ret;
    };

    // Keep track of the totals
    self.totalPages = ko.observable(0);
    self.getTotalPages = function () { return self.totalPages(); };

    self.totalCount = ko.observable(0);
    self.getTotalCount = function () { return self.totalCount(); };
    self.setTotalCount = function (num) {
      if (typeof num !== "number") {
        throw "Total count must be a number";
      }

      self.totalCount(num);
      self.totalPages(Math.ceil(self.totalCount() / self.pageSize()));

      return self;
    };

    self.defaultPageSize = 25;
    self.pageSize    = ko.observable(self.defaultPageSize);
    self.getPageSize = function () { return self.pageSize(); };
    self.setPageSize = function (num) {
      var retVal = false;
      if (typeof num !== "number") {
        throw "Page size must be a number";
      }

      if (num != self.getPageSize()) {
        self.pageSize(num);
        self.totalPages(Math.ceil(self.totalCount() / self.pageSize()));
        self.setPageToFirstAndTriggerOnChange();    
        retVal = true;
      }

      return retVal;
    };

    self.loadMore = function () {
      var ret;
      if (self.pageSize() >= self.totalCount()) {
        ret = false;
      } else {
        ret = self.setPageSize(self.pageSize() + self.defaultPageSize);
      }

      return ret;
    };

    // Make the following available for KO Computed Functions
    self.hasMore        = ko.computed(function () { return (self.pageSize() < self.totalCount()); });
    self.isFirstPage    = ko.computed(function () { return (self.page() === 1); });
    self.isNotFirstPage = ko.computed(function () { return (self.page() !== 1); });
    self.isLastPage     = ko.computed(function () { return (self.page() === self.totalPages()); });
    self.isNotLastPage  = ko.computed(function () { return (self.page() < self.totalPages()); });

    // Sort Parameters
    self.sortCol = ko.observable(0);
    self.getSortCol = function () { return self.sortCol(); };
    self.setSortCol = function (num) {
      if (typeof num !== "number") {
        throw "Sort column must be a number";
      }

      self.sortCol(num);
      self.setPageToFirstAndTriggerOnChange();
    };

    self.sortDir = ko.observable("A");
    self.getSortDir = function () { return self.sortDir(); };
    self.setSortDir = function (dir) {
      if (dir !== "A" && dir !== "D") {
        throw "Sort direction must be 'A' or 'D'";
      }

      self.sortDir(dir);
      self.setPageToFirstAndTriggerOnChange();
    };

    // Need a special private method for setting both the column and sort direction
    // without triggering the onChange function until both are done
    setSort = function (col, dir) {
      self.sortCol(col);
      self.sortDir(dir);
      self.setPageToFirstAndTriggerOnChange();
    };

    // Switch the primary sort column or invert the sort direction
    self.toggleSort = function (colIdx) {
      var sort, dir, ret;
      sort = null;
      dir  = 'A';

      // Changing the sort column to something else (default to ascending)
      if (colIdx !== self.getSortCol()) {
        dir = 'A';
        ret = setSort(colIdx, dir);
      } else {
        // Toggling direction of current sort column
        dir = (self.getSortDir() === 'A') ? 'D' : 'A';
        ret = setSort(colIdx, dir);
      }

      return ret;
    };

    self.toObj = function () {     
      return {
        page:           self.page(),
        limit:          self.pageSize(),
        sort_col:       self.getSortCol(),
        sort_dir:       self.getSortDir()
      }
       
    };

    // Rely on the setter's validation when de-serializing - order of setters matters
    self.fromObj = function (obj) {
      if (typeof obj !== "object" || obj === null) {
        throw "Page: fromObj() accepts only an object with the appropriate properties";
      }

      self.setTotalCount(obj.total_rows);      
      self.page(obj.page);

      return self;
    };
  }; // END Page

  /**
   * Specifically meant to represent a file tree, but could be applied to most
   * trees that have been flattened out into a list.
   */
  api.tree = function () {
    if (!(this instanceof api.tree)) {
      return new api.tree();
    }
    var self = this;

    // Maintain a list of files in the raw list element
    self.raw = new api.paginatedTable();

    // Transformed files into a nice object with hierarchy
    self.hierarchy = new ko.observable({});

    // Reset the hierarchy to an empty object
    self.reset = function () {
      self.hierarchy({});
    };

    // Add items and trigger hierarchy reset
    self.addItems = function (items) {
      self.raw.addItems(items);
      self.createHierarchyFromRawList();
    };

    self.createHierarchyFromRawList = function (delim) {
      var list, hierarchy, i, filepath, current, j, a, s, lastIdx;

      // Set the delimiter to be a slash by default
      delim = (typeof delim === 'undefined') ? '/' : delim;

      list = self.raw.list();
      hierarchy = {};
      for (i in list) {
        filepath = list[i].split(delim);

        // Reset the pointer to the current object
        current = hierarchy;
        lastIdx = filepath.length - 1;

        // Traverse down the hierarchy to split the files
        for (j in filepath) {
          s = filepath[j];

          // This is a leaf node (terminal node) and the value should be the full
          // file path
          if (j == lastIdx) {
            current[s] = list[i];
          } else if (typeof current[s] !== 'object' && s !== '') {
            // Make a new folder
            current[s] = {};
            current = current[s];
          } else if (s !== '') {
            // Folder exists
            current = current[s];
          }

          // Ignore empty strings that occur when paths start with '/'
        }
      }

      self.hierarchy(hierarchy);
    };

    return self;
  };


  return api;
}());
