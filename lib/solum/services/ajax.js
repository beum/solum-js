/*global solum:true, $:true, ko:true, module:true */

/*
 * solum.js - ajax
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
  var routes;

  /**
   * Ajax namespace for all of the ajax-related services and functions
   */
  var ajax = {};

  /**
   * Example route object for reference
   */
  ajax.routes = {
    exampleRoute: {
      name: 'exampleRoute',
      url:  '/example/{param}',
      method: 'GET',
      // These are replaces in the url matched with {} brackets
      params: [
        {name: "param", defaultValue: "my default"} // Leave "defaultValue" undefined to make it required
      ]
    }
  };

  /**
   * Allow users to view the default configuration of the Ajax Manager
   */
  ajax.defaultConfig = {
    prefix: "", // Prefix to add to all AJAX requests
    ajax: $.ajax, // Method to call to make an ajax request
    badRequestHandler: function () {}, // Deals with 400 errors
    errorHandler: function () {} // Deals with errors other than 400
  };

  /**
   * The ajax manager is a wrapper over the jQuery ajax function that allows for
   * symfony-style routes with dynamic URL parameters and query string parameters.
   *
   * It also holds onto any ongoing request and aborts it if another request is
   * attempted.
   */
  ajax.manager = function (config) {
    var self, prefix, ajaxMethod, badRequestHandler, errorHandler;
    self = this;

    // Merge the new config with the default configurations
    config = $.extend({}, ajax.defaultConfig, config);

    prefix            = config.prefix;
    ajaxMethod        = config.ajax;
    badRequestHandler = config.badRequestHandler;
    errorHandler      = config.errorHandler;

    // Status flag should be one of: "OK","LOADING","FAILED","BAD_REQUEST"
    this.status = ko.observable("OK");

    // Store any current requests
    this.pendingRequests = [];

    // Provide simple computed functions to monitor status of the ajax manager
    this.isOK         = ko.computed(function () {return (this.status() === "OK"); }, this);
    this.isLoading    = ko.computed(function () {return (this.status() === "LOADING"); }, this);
    this.isFailed     = ko.computed(function () {return (this.status() === "FAILED"); }, this);
    this.isBadRequest = ko.computed(function () {return (this.status() === "BAD_REQUEST"); }, this);

    // A helper function to take the parameters and either replace them in the
    // base URL or add as query string params, or leave alone
    this.generateURL = function (routeName, params) {
      var route, url, i, isDataUndefined, doesParamNotExist;
      if (typeof ajax.routes[routeName] !== "object") {
        throw "AjaxManager.generateURL(): The requested route does not exist: " + routeName;
      } else {
        route = ajax.routes[routeName];
      }

      // Setup the route parameters by first extracting string-replacement parameters
      // defined in the route
      url = prefix + route.url;

      for (i in route.params) {
        if (route.params.hasOwnProperty(i)) {
          isDataUndefined   = (typeof params.routeData === "undefined");
          doesParamNotExist = (typeof params.routeData[route.params[i].name] === 'undefined');
          doesParamNotExist = (doesParamNotExist && typeof route.params[i].defaultValue === "undefined");

          // A required parameter (no default value) does not exist
          if (isDataUndefined || doesParamNotExist) {
            throw "AjaxManager.generateURL: A required parameter was not included in the request: " + route.params[i].name;
          } else if (typeof params.routeData[route.params[i].name] !== "undefined") {
            url = url.replace("{" + route.params[i].name + "}", params.routeData[route.params[i].name]);
          } else if (typeof route.params[i].defaultValue !== "undefined") {
            url = url.replace("{" + route.params[i].name + "}", route.params[i].defaultValue);
          }
        }
      }

      return url;
    };

    this.request = function (routeName, params, success) {
      if (typeof ajax.routes[routeName] !== "object") {
        throw "AjaxManager.request(): The requested route does not exist";
      }
      if (ajax.routes[routeName].method === "post" && !params.data) {
        throw "AjaxManager.request(): params.data must exist if you are posting.";
      }

      return self.makeRequest(ajax.routes[routeName], params, success);
    };

    // Use the injected ajax request and error handling to make the ajax call
    this.makeRequest = function (route, params, success) {
      var cnt, url;

      self.status("LOADING");

      cnt = self.pendingRequests.length;
      if (cnt > 0 && !params.isSimultaneousRequest) {
        cnt = 0;
        $.each(self.pendingRequests, function (idx, $ajaxInstance) {
          if (typeof $ajaxInstance === 'object' && $ajaxInstance !== null) {
            $ajaxInstance.abort();
          }
        });
      }

      url = self.generateURL(route.name, params);

      // Return the ajax object (if using jquery)
      // Assume makeAjaxRequest takes jquery-like parameters, otherwise expect
      // caller to implement an adapter to make it work
      self.pendingRequests[cnt] = ajaxMethod({
        url: url,
        type: route.method,
        data: params.data,

        // Set the timeout to 5 minutes - Should this be longer?
        timeout: 600000,

        // Delegate handling the data to the calling object
        success: function (data, textStatus, jqXHR) {
          self.status("OK");
          self.pendingRequests[cnt] = null;
          return success(data);
        },
        statusCode: {
          400: function (jqXHR, textStatus, errorThrown) {
            self.status("BAD_REQUEST");
            self.pendingRequests[cnt] = null;
            return badRequestHandler(jqXHR, textStatus, errorThrown);
          }
        },

        // Fire an error event to alert the page that something went wrong
        error: function (jqXHR, textStatus, errorThrown) {
          self.status("FAILED");
          self.pendingRequests[cnt] = null;
          return errorHandler(jqXHR, textStatus, errorThrown);
        }
      });

      return self.pendingRequests[cnt];
    };
  }; // END AJAXMANAGER

  // Convenience methods for adding additional routes vs just replacing the route
  // object
  routes = ajax.routes;
  ajax.addAjaxRoutes = function (newRoutes) {
    $.extend(routes, newRoutes);
  };
  
  return ajax;
}());
