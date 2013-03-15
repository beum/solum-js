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
    errorHandler: function () {}, // Deals with errors other than 400,
    suffix: "", // Suffix to add to all AJAX requests
    requestWrapper: null, // A key with which to wrap all AJAX requests parameters
    locale: "en"
  };

  /**
   * The ajax manager is a wrapper over the jQuery ajax function that allows for
   * symfony-style routes with dynamic URL parameters and query string parameters.
   *
   * It also holds onto any ongoing request and aborts it if another request is
   * attempted.
   */
  ajax.manager = function (config) {
    var self, prefix, ajaxMethod, badRequestHandler, errorHandler, suffix, requestWrapper, locale;
    self = this;

    // Merge the new config with the default configurations
    config = $.extend({}, ajax.defaultConfig, config);

    prefix            = config.prefix;
    ajaxMethod        = config.ajax;
    badRequestHandler = config.badRequestHandler;
    errorHandler      = config.errorHandler;
    suffix            = config.suffix;
    requestWrapper    = config.requestWrapper;
    locale            = config.locale;

    // Status flag should be one of: "OK","LOADING","FAILED","BAD_REQUEST"
    this.status = ko.observable("OK");

    // Store any current requests
    this.pendingRequests = [];

    // Provide simple computed functions to monitor status of the ajax manager
    this.isOK         = ko.computed(function () {return (this.status() === "OK"); }, this);
    this.isLoading    = ko.computed(function () {return (this.status() === "LOADING"); }, this);
    this.isFailed     = ko.computed(function () {return (this.status() === "FAILED"); }, this);
    this.isBadRequest = ko.computed(function () {return (this.status() === "BAD_REQUEST"); }, this);

    /**
     * A helper function to take the parameters and either replace them in the
     * base URL or add as query string params, or leave alone
     */
    this.generateURL = function (routeName, params, should_generate_query_string) {
      var route, data, url, i, isDataUndefined, doesParamNotExist;
      if (typeof ajax.routes[routeName] !== "object") {
        throw "AjaxManager.generateURL(): The requested route does not exist: " + routeName;
      } else {
        route = ajax.routes[routeName];
      }

      if (route.requires_locale && (route.url).indexOf(locale) < 0) {
          route.url = locale + '/' + route.url;
      }

      // Setup the route parameters by first extracting string-replacement parameters
      // defined in the route
      url = prefix + route.url + suffix;

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
      
      // Add the query string to the request with the appropriate requestWrapper
      // if one is defined
      if (should_generate_query_string) {
        if (requestWrapper) {
          data = {};
          data[requestWrapper] = params.data;
        } else {
          data = params.data;
        }
        
        url += '?' + jQuery.param(data);
      }

      return url;
    };

    /**
     * 
     */
    this.request = function (routeName, params, success, error_callbacks) {
      
      if (typeof ajax.routes[routeName] !== "object") {
        throw "AjaxManager.request(): The requested route does not exist";
      }
      if (ajax.routes[routeName].method === "post" && !params.data) {
        throw "AjaxManager.request(): params.data must exist if you are posting.";
      }

      return self.makeRequest(ajax.routes[routeName], params, success, error_callbacks);
    };

    /**
     * 
     */
    this.makeRequest = function (route, params, success, error_callbacks) {
      var cnt, url, data, request;
      
      // Set error callbacks to be an object
      error_callbacks = error_callbacks || {};

      self.status("LOADING");

      // Abort all requests if this is not a simultaneous request
      cnt = self.pendingRequests.length;
      if (cnt > 0 && (!params.isSimultaneousRequest || params.abortAllPendingRequests)) {
        cnt = 0;
        $.each(self.pendingRequests, function (idx, $ajaxInstance) {
          if (typeof $ajaxInstance !== 'object' || $ajaxInstance === null) {
            return;
          }
          
          if (!$ajaxInstance.isSimultaneousRequest || params.abortAllPendingRequests) {
            $ajaxInstance.abort();
          }
        });
      }

      url = self.generateURL(route.name, params);
      
      // Add the extra parameter wrapper if one was defined
      if (requestWrapper) {
        data = {};
        data[requestWrapper] = params.data;
      } else {
        data = params.data;
      }
      
      var setStatusIfNoRequestsPending = function (status) {
        var i, is_request_still_running = false;
        for (i in self.pendingRequests) {
            if (self.pendingRequests[i] !== null) {
              is_request_still_running = true;
            }
          }
          
          if (!is_request_still_running) {
            self.status(status);
          }
      };

      // Return the ajax object (if using jquery)
      // Assume makeAjaxRequest takes jquery-like parameters, otherwise expect
      // caller to implement an adapter to make it work
      request = ajaxMethod({
        url: url,
        type: route.method,
        data: data,

        // Set the timeout to 5 minutes - Should this be longer?
        timeout: 600000,

        // Delegate handling the data to the calling object
        success: function (data, textStatus, jqXHR) {
          self.pendingRequests[cnt] = null;
          setStatusIfNoRequestsPending("OK");
          return success(data);
        },
        statusCode: {
          400: function (jqXHR, textStatus, errorThrown) {
            var callback = badRequestHandler;
            self.pendingRequests[cnt] = null;
            setStatusIfNoRequestsPending("BAD_REQUEST");
            if (typeof error_callbacks[400] === 'function') {
              callback = error_callbacks[400];
            }
            return callback(jqXHR, textStatus, errorThrown);
          },
          403: function (jqXHR, textStatus, errorThrown) {
            var callback = badRequestHandler;
            setStatusIfNoRequestsPending("BAD_REQUEST");
            self.pendingRequests[cnt] = null;
            if (typeof error_callbacks[403] === 'function') {
              callback = error_callbacks[403];
            }
            return callback(jqXHR, textStatus, errorThrown);
          },
          500: function (jqXHR, textStatus, errorThrown) {
            var callback = errorHandler;
            self.status("FAILED");
            self.pendingRequests[cnt] = null;
            if (typeof error_callbacks[500] === 'function') {
              callback = error_callbacks[500];
            }
            return callback(jqXHR, textStatus, errorThrown);
          }
        },

        // Fire an error event to alert the page that something went wrong
        error: function (jqXHR, textStatus, errorThrown) {
          self.pendingRequests[cnt] = null;
          setStatusIfNoRequestsPending("BAD_REQUEST");
          
          if (textStatus === "abort" && typeof error_callbacks['abort'] === 'function') {
            return error_callbacks['abort'](jqXHR, textStatus, errorThrown);
          } else if (typeof error_callbacks['error'] === 'function') {
            return error_callbacks['error'](jqXHR, textStatus, errorThrown);
          } else {
            return errorHandler(jqXHR, textStatus, errorThrown);
          }
        }
      });
      
      // Add the request to the list of pending requests after adding the route
      // to identify it
      request.route = route.name;
      request.isSimultaneousRequest = params.isSimultaneousRequest;
      self.pendingRequests[cnt] = request;

      return request;
    };
  };

  // Convenience methods for adding additional routes vs just replacing the route
  // object
  routes = ajax.routes;
  ajax.addAjaxRoutes = function (newRoutes) {
    $.extend(routes, newRoutes);
  };
  
  return ajax;
}());
