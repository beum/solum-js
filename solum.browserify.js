(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    var global = typeof window !== 'undefined' ? window : {};
    var definedProcess = false;
    
    require.define = function (filename, fn) {
        if (!definedProcess && require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
            definedProcess = true;
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process,
                global
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",function(require,module,exports,__dirname,__filename,process,global){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process,global){var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
        && window.setImmediate;
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    if (name === 'evals') return (require)('vm')
    else throw new Error('No such module. (Possibly not yet loaded)')
};

(function () {
    var cwd = '/';
    var path;
    process.cwd = function () { return cwd };
    process.chdir = function (dir) {
        if (!path) path = require('path');
        cwd = path.resolve(dir, cwd);
    };
})();

});

require.define("/lib/solum/services/ajax.js",function(require,module,exports,__dirname,__filename,process,global){/*global solum:true, $:true, ko:true, module:true */

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
    requestWrapper: null // A key with which to wrap all AJAX requests parameters
  };

  /**
   * The ajax manager is a wrapper over the jQuery ajax function that allows for
   * symfony-style routes with dynamic URL parameters and query string parameters.
   *
   * It also holds onto any ongoing request and aborts it if another request is
   * attempted.
   */
  ajax.manager = function (config) {
    var self, prefix, ajaxMethod, badRequestHandler, errorHandler, suffix, requestWrapper;
    self = this;

    // Merge the new config with the default configurations
    config = $.extend({}, ajax.defaultConfig, config);

    prefix            = config.prefix;
    ajaxMethod        = config.ajax;
    badRequestHandler = config.badRequestHandler;
    errorHandler      = config.errorHandler;
    suffix            = config.suffix;
    requestWrapper    = config.requestWrapper;

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

      self.status("LOADING");

      // Abort all requests if this is not a simultaneous request
      cnt = self.pendingRequests.length;
      if (cnt > 0 && !params.isSimultaneousRequest) {
        cnt = 0;
        $.each(self.pendingRequests, function (idx, $ajaxInstance) {
          if (typeof $ajaxInstance === 'object' && $ajaxInstance !== null && !$ajaxInstance.isSimultaneousRequest) {
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
          self.status("OK");
          self.pendingRequests[cnt] = null;
          return success(data);
        },
        statusCode: {
          400: function (jqXHR, textStatus, errorThrown) {
            var callback = badRequestHandler;
            self.status("BAD_REQUEST");
            self.pendingRequests[cnt] = null;
            if (typeof error_callbacks[400] === 'function') {
              callback = error_callbacks[400];
            }
            return callback(jqXHR, textStatus, errorThrown);
          },
          403: function (jqXHR, textStatus, errorThrown) {
            var callback = badRequestHandler;
            self.status("BAD_REQUEST");
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
          self.status("FAILED");
          self.pendingRequests[cnt] = null;
          return errorHandler(jqXHR, textStatus, errorThrown);
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

});

require.define("/lib/solum/services/validation.js",function(require,module,exports,__dirname,__filename,process,global){/*global solum:true, $:true, ko:true, module:true */

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
      var is_valid, i, j, errors;
      is_valid = true;

      // Clear entity-level errors
      entity.errors.entity.removeAll();

      // Loop through all of the properties and validate
      for (i in entity.properties) {
        // Clear existing property errors
          entity.errors.properties[i].removeAll();

        // Check if the property is a sub-entity, if yes, recursively validate, if not
        // validate the property
        if (entity.properties[i].is_entity) {
          is_valid = self.isEntityValid(entity.properties[i]);

          // Add the error to the sub-entity's errors array
          // Note: If there is an error the view should be directly connected to
          //       the sub-entity's errors, however, this will indicate that the
          //       current entity is not valid
          if (!is_valid) {
            entity.errors.properties[i].push('errors.form.sub_entity.invalid');
          }
        } else {
          // Validate the KO observable property
          errors = self.isValid(entity.properties[i](), entity.constraints.properties[i]);

          // Add new errors to the error object
          for (j in errors) {
            entity.errors.properties[i].push(errors[j]);
          }

          if (errors.length > 0) {
            is_valid = false;
          }
        }
      }

      // Confirm the entity-level constraints
      if (is_valid) {
        errors = self.isValid(entity, entity.constraints.entity_constraints);
        for (j in errors) {
          entity.errors.entity.push(errors[j]);
        }
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

});

require.define("/lib/solum/services/constraints/general.js",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore');

/**
 * Constraints for any type of subject
 */
module.exports = (function () {
  "use strict";

  var general = {};

  /**
   * Validates that the field is not null or undefined
   */
  general.notNull = function (params, msg) {
    var self        = this;
    self.name       = 'general.notNull'
    self.defaultMsg = 'errors.form.general.not_null';
    self.msg        = (msg) ? msg : self.defaultMsg;
    self.params     = params;

    self.test = function (subject) {
      if (subject === '' || subject === null || subject === undefined) {
        throw {error: self.msg};
      }
      return true;
    };
  };

  /**
   * Checks the type of the subject using the typeof operator
   */
  general.type = function (params, msg) {
    var self        = this;
    self.name       = 'general.type';
    self.defaultMsg = 'errors.form.general.type';
    msg             = (msg) ? msg : self.defaultMsg;
    self.msg        = msg;
    self.params     = params;

    self.test = function (subject) {
      if ((self.params.type === "null" && subject !== null) || typeof subject !== self.params.type) {
        throw {error: self.msg};
      }
      return true;
    };
  };

  /**
   * Ensures the subject is one of the given choices
   */
  general.choice = function (params, msg) {
    var self        = this;
    self.name       = 'general.choice';
    self.defaultMsg = 'errors.form.general.type';
    msg             = (msg) ? msg : self.defaultMsg;
    self.msg        = msg;
    self.params     = params;

    self.test = function (subject) {;
      if (_.indexOf(self.params.choices, subject) === -1) {
        throw {error: msg};
      }
      return true;
    };
  };

  return general;
}());

});

require.define("/node_modules/underscore/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"underscore.js"}
});

require.define("/node_modules/underscore/underscore.js",function(require,module,exports,__dirname,__filename,process,global){//     Underscore.js 1.4.3
//     http://underscorejs.org
//     (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.4.3';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    return _.map(obj, function(value) {
      return (_.isFunction(method) ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // with specific `key:value` pairs.
  _.where = function(obj, attrs) {
    if (_.isEmpty(attrs)) return [];
    return _.filter(obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See: https://bugs.webkit.org/show_bug.cgi?id=80797
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value || _.identity);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      if (_.isArray(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(concat.apply(ArrayProto, arguments));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(args, "" + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Binding with arguments is also known as `curry`.
  // Delegates to **ECMAScript 5**'s native `Function.bind` if available.
  // We check for `func.bind` first, to fail fast when `func` is undefined.
  _.bind = function(func, context) {
    var args, bound;
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length == 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, result;
    var previous = 0;
    var later = function() {
      previous = new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(n);
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + (0 | Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = '' + ++idCounter;
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

});

require.define("/lib/solum/services/constraints/date.js",function(require,module,exports,__dirname,__filename,process,global){var moment = require('moment');

/**
 * Date related constraints
 */
module.exports = (function () {
  "use strict";
  var date         = {};

  /**
   * Check that the date format is valid
   *
   * TODO: Set the date format somewhere else
   */
  date.isValid = function (params, msg) {
    var self            = this;
    self.continueOnFail = false;
    self.defaultMsg     = 'errors.form.date.invalid';
    self.msg            = (msg) ? msg : self.defaultMsg;
    self.params         = params;

    self.test = function (subject) {
      // Must do a regex check because moment ignores non-numeric characters
      if (!self.params.format_regex.test(subject)) {
        throw {error: self.msg};
      } else if (!moment(subject, self.params.format).isValid()) {
        throw {error: self.msg};
      }
      return true;
    };
  };

  /**
   * Min Date Constraint
   */
  date.min = function (params, msg) {
    var self            = this;
    self.continueOnFail = false;
    self.defaultMsg     = 'errors.form.date.min';
    self.msg            = (msg) ? msg : self.defaultMsg;
    self.params         = params;

    self.test = function (subject) {
      var subj_moment = moment(subject, self.params.format);

      if (subj_moment.diff(self.params.min, 'days') < 0) {
        throw {error: self.msg, constraint: params.min};
      }
      return true;
    };
  };

  /**
   * Max Date Constraint
   */
  date.max = function (params, msg) {
    var self            = this;
    self.continueOnFail = false;
    self.defaultMsg     = 'errors.form.date.max';
    self.msg            = (msg) ? msg : self.defaultMsg;
    self.params         = params;

    self.test = function (subject) {
      var subj_moment = moment(subject, self.params.format);

      if (subj_moment.diff(self.params.max, 'days') > 0) {
        throw {error: self.msg, constraint: params.max};
      }
      return true;
    };
  };

  return date;
}());

});

require.define("/node_modules/moment/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"./moment.js"}
});

require.define("/node_modules/moment/moment.js",function(require,module,exports,__dirname,__filename,process,global){// moment.js
// version : 1.7.2
// author : Tim Wood
// license : MIT
// momentjs.com

(function (undefined) {

    /************************************
        Constants
    ************************************/

    var moment,
        VERSION = "1.7.2",
        round = Math.round, i,
        // internal storage for language config files
        languages = {},
        currentLanguage = 'en',

        // check for nodeJS
        hasModule = (typeof module !== 'undefined' && module.exports),

        // Parameters to check for on the lang config.  This list of properties
        // will be inherited from English if not provided in a language
        // definition.  monthsParse is also a lang config property, but it
        // cannot be inherited and as such cannot be enumerated here.
        langConfigProperties = 'months|monthsShort|weekdays|weekdaysShort|weekdaysMin|longDateFormat|calendar|relativeTime|ordinal|meridiem'.split('|'),

        // ASP.NET json date format regex
        aspNetJsonRegex = /^\/?Date\((\-?\d+)/i,

        // format tokens
        formattingTokens = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|YYYY|YY|a|A|hh?|HH?|mm?|ss?|SS?S?|zz?|ZZ?|.)/g,
        localFormattingTokens = /(\[[^\[]*\])|(\\)?(LT|LL?L?L?)/g,

        // parsing tokens
        parseMultipleFormatChunker = /([0-9a-zA-Z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+)/gi,

        // parsing token regexes
        parseTokenOneOrTwoDigits = /\d\d?/, // 0 - 99
        parseTokenOneToThreeDigits = /\d{1,3}/, // 0 - 999
        parseTokenThreeDigits = /\d{3}/, // 000 - 999
        parseTokenFourDigits = /\d{1,4}/, // 0 - 9999
        parseTokenWord = /[0-9a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+/i, // any word characters or numbers
        parseTokenTimezone = /Z|[\+\-]\d\d:?\d\d/i, // +00:00 -00:00 +0000 -0000 or Z
        parseTokenT = /T/i, // T (ISO seperator)

        // preliminary iso regex
        // 0000-00-00 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000
        isoRegex = /^\s*\d{4}-\d\d-\d\d(T(\d\d(:\d\d(:\d\d(\.\d\d?\d?)?)?)?)?([\+\-]\d\d:?\d\d)?)?/,
        isoFormat = 'YYYY-MM-DDTHH:mm:ssZ',

        // iso time formats and regexes
        isoTimes = [
            ['HH:mm:ss.S', /T\d\d:\d\d:\d\d\.\d{1,3}/],
            ['HH:mm:ss', /T\d\d:\d\d:\d\d/],
            ['HH:mm', /T\d\d:\d\d/],
            ['HH', /T\d\d/]
        ],

        // timezone chunker "+10:00" > ["10", "00"] or "-1530" > ["-15", "30"]
        parseTimezoneChunker = /([\+\-]|\d\d)/gi,

        // getter and setter names
        proxyGettersAndSetters = 'Month|Date|Hours|Minutes|Seconds|Milliseconds'.split('|'),
        unitMillisecondFactors = {
            'Milliseconds' : 1,
            'Seconds' : 1e3,
            'Minutes' : 6e4,
            'Hours' : 36e5,
            'Days' : 864e5,
            'Months' : 2592e6,
            'Years' : 31536e6
        },

        // format function strings
        formatFunctions = {},

        // tokens to ordinalize and pad
        ordinalizeTokens = 'DDD w M D d'.split(' '),
        paddedTokens = 'M D H h m s w'.split(' '),

        /*
         * moment.fn.format uses new Function() to create an inlined formatting function.
         * Results are a 3x speed boost
         * http://jsperf.com/momentjs-cached-format-functions
         *
         * These strings are appended into a function using replaceFormatTokens and makeFormatFunction
         */
        formatTokenFunctions = {
            // a = placeholder
            // b = placeholder
            // t = the current moment being formatted
            // v = getValueAtKey function
            // o = language.ordinal function
            // p = leftZeroFill function
            // m = language.meridiem value or function
            M    : function () {
                return this.month() + 1;
            },
            MMM  : function (format) {
                return getValueFromArray("monthsShort", this.month(), this, format);
            },
            MMMM : function (format) {
                return getValueFromArray("months", this.month(), this, format);
            },
            D    : function () {
                return this.date();
            },
            DDD  : function () {
                var a = new Date(this.year(), this.month(), this.date()),
                    b = new Date(this.year(), 0, 1);
                return ~~(((a - b) / 864e5) + 1.5);
            },
            d    : function () {
                return this.day();
            },
            dd   : function (format) {
                return getValueFromArray("weekdaysMin", this.day(), this, format);
            },
            ddd  : function (format) {
                return getValueFromArray("weekdaysShort", this.day(), this, format);
            },
            dddd : function (format) {
                return getValueFromArray("weekdays", this.day(), this, format);
            },
            w    : function () {
                var a = new Date(this.year(), this.month(), this.date() - this.day() + 5),
                    b = new Date(a.getFullYear(), 0, 4);
                return ~~((a - b) / 864e5 / 7 + 1.5);
            },
            YY   : function () {
                return leftZeroFill(this.year() % 100, 2);
            },
            YYYY : function () {
                return leftZeroFill(this.year(), 4);
            },
            a    : function () {
                return this.lang().meridiem(this.hours(), this.minutes(), true);
            },
            A    : function () {
                return this.lang().meridiem(this.hours(), this.minutes(), false);
            },
            H    : function () {
                return this.hours();
            },
            h    : function () {
                return this.hours() % 12 || 12;
            },
            m    : function () {
                return this.minutes();
            },
            s    : function () {
                return this.seconds();
            },
            S    : function () {
                return ~~(this.milliseconds() / 100);
            },
            SS   : function () {
                return leftZeroFill(~~(this.milliseconds() / 10), 2);
            },
            SSS  : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            Z    : function () {
                var a = -this.zone(),
                    b = "+";
                if (a < 0) {
                    a = -a;
                    b = "-";
                }
                return b + leftZeroFill(~~(a / 60), 2) + ":" + leftZeroFill(~~a % 60, 2);
            },
            ZZ   : function () {
                var a = -this.zone(),
                    b = "+";
                if (a < 0) {
                    a = -a;
                    b = "-";
                }
                return b + leftZeroFill(~~(10 * a / 6), 4);
            }
        };

    function getValueFromArray(key, index, m, format) {
        var lang = m.lang();
        return lang[key].call ? lang[key](m, format) : lang[key][index];
    }

    function padToken(func, count) {
        return function (a) {
            return leftZeroFill(func.call(this, a), count);
        };
    }
    function ordinalizeToken(func) {
        return function (a) {
            var b = func.call(this, a);
            return b + this.lang().ordinal(b);
        };
    }

    while (ordinalizeTokens.length) {
        i = ordinalizeTokens.pop();
        formatTokenFunctions[i + 'o'] = ordinalizeToken(formatTokenFunctions[i]);
    }
    while (paddedTokens.length) {
        i = paddedTokens.pop();
        formatTokenFunctions[i + i] = padToken(formatTokenFunctions[i], 2);
    }
    formatTokenFunctions.DDDD = padToken(formatTokenFunctions.DDD, 3);


    /************************************
        Constructors
    ************************************/


    // Moment prototype object
    function Moment(date, isUTC, lang) {
        this._d = date;
        this._isUTC = !!isUTC;
        this._a = date._a || null;
        this._lang = lang || false;
    }

    // Duration Constructor
    function Duration(duration) {
        var data = this._data = {},
            years = duration.years || duration.y || 0,
            months = duration.months || duration.M || 0,
            weeks = duration.weeks || duration.w || 0,
            days = duration.days || duration.d || 0,
            hours = duration.hours || duration.h || 0,
            minutes = duration.minutes || duration.m || 0,
            seconds = duration.seconds || duration.s || 0,
            milliseconds = duration.milliseconds || duration.ms || 0;

        // representation for dateAddRemove
        this._milliseconds = milliseconds +
            seconds * 1e3 + // 1000
            minutes * 6e4 + // 1000 * 60
            hours * 36e5; // 1000 * 60 * 60
        // Because of dateAddRemove treats 24 hours as different from a
        // day when working around DST, we need to store them separately
        this._days = days +
            weeks * 7;
        // It is impossible translate months into days without knowing
        // which months you are are talking about, so we have to store
        // it separately.
        this._months = months +
            years * 12;

        // The following code bubbles up values, see the tests for
        // examples of what that means.
        data.milliseconds = milliseconds % 1000;
        seconds += absRound(milliseconds / 1000);

        data.seconds = seconds % 60;
        minutes += absRound(seconds / 60);

        data.minutes = minutes % 60;
        hours += absRound(minutes / 60);

        data.hours = hours % 24;
        days += absRound(hours / 24);

        days += weeks * 7;
        data.days = days % 30;

        months += absRound(days / 30);

        data.months = months % 12;
        years += absRound(months / 12);

        data.years = years;

        this._lang = false;
    }


    /************************************
        Helpers
    ************************************/


    function absRound(number) {
        if (number < 0) {
            return Math.ceil(number);
        } else {
            return Math.floor(number);
        }
    }

    // left zero fill a number
    // see http://jsperf.com/left-zero-filling for performance comparison
    function leftZeroFill(number, targetLength) {
        var output = number + '';
        while (output.length < targetLength) {
            output = '0' + output;
        }
        return output;
    }

    // helper function for _.addTime and _.subtractTime
    function addOrSubtractDurationFromMoment(mom, duration, isAdding) {
        var ms = duration._milliseconds,
            d = duration._days,
            M = duration._months,
            currentDate;

        if (ms) {
            mom._d.setTime(+mom + ms * isAdding);
        }
        if (d) {
            mom.date(mom.date() + d * isAdding);
        }
        if (M) {
            currentDate = mom.date();
            mom.date(1)
                .month(mom.month() + M * isAdding)
                .date(Math.min(currentDate, mom.daysInMonth()));
        }
    }

    // check if is an array
    function isArray(input) {
        return Object.prototype.toString.call(input) === '[object Array]';
    }

    // compare two arrays, return the number of differences
    function compareArrays(array1, array2) {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++) {
            if (~~array1[i] !== ~~array2[i]) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function dateFromArray(input, asUTC, hoursOffset, minutesOffset) {
        var i, date, forValid = [];
        for (i = 0; i < 7; i++) {
            forValid[i] = input[i] = (input[i] == null) ? (i === 2 ? 1 : 0) : input[i];
        }
        // we store whether we used utc or not in the input array
        input[7] = forValid[7] = asUTC;
        // if the parser flagged the input as invalid, we pass the value along
        if (input[8] != null) {
            forValid[8] = input[8];
        }
        // add the offsets to the time to be parsed so that we can have a clean array
        // for checking isValid
        input[3] += hoursOffset || 0;
        input[4] += minutesOffset || 0;
        date = new Date(0);
        if (asUTC) {
            date.setUTCFullYear(input[0], input[1], input[2]);
            date.setUTCHours(input[3], input[4], input[5], input[6]);
        } else {
            date.setFullYear(input[0], input[1], input[2]);
            date.setHours(input[3], input[4], input[5], input[6]);
        }
        date._a = forValid;
        return date;
    }

    // Loads a language definition into the `languages` cache.  The function
    // takes a key and optionally values.  If not in the browser and no values
    // are provided, it will load the language file module.  As a convenience,
    // this function also returns the language values.
    function loadLang(key, values) {
        var i, m,
            parse = [];

        if (!values && hasModule) {
            values = require('./lang/' + key);
        }

        for (i = 0; i < langConfigProperties.length; i++) {
            // If a language definition does not provide a value, inherit
            // from English
            values[langConfigProperties[i]] = values[langConfigProperties[i]] ||
              languages.en[langConfigProperties[i]];
        }

        for (i = 0; i < 12; i++) {
            m = moment([2000, i]);
            parse[i] = new RegExp('^' + (values.months[i] || values.months(m, '')) +
                '|^' + (values.monthsShort[i] || values.monthsShort(m, '')).replace('.', ''), 'i');
        }
        values.monthsParse = values.monthsParse || parse;

        languages[key] = values;

        return values;
    }

    // Determines which language definition to use and returns it.
    //
    // With no parameters, it will return the global language.  If you
    // pass in a language key, such as 'en', it will return the
    // definition for 'en', so long as 'en' has already been loaded using
    // moment.lang.  If you pass in a moment or duration instance, it
    // will decide the language based on that, or default to the global
    // language.
    function getLangDefinition(m) {
        var langKey = (typeof m === 'string') && m ||
                      m && m._lang ||
                      null;

        return langKey ? (languages[langKey] || loadLang(langKey)) : moment;
    }


    /************************************
        Formatting
    ************************************/


    function removeFormattingTokens(input) {
        if (input.match(/\[.*\]/)) {
            return input.replace(/^\[|\]$/g, "");
        }
        return input.replace(/\\/g, "");
    }

    function makeFormatFunction(format) {
        var array = format.match(formattingTokens), i, length;

        for (i = 0, length = array.length; i < length; i++) {
            if (formatTokenFunctions[array[i]]) {
                array[i] = formatTokenFunctions[array[i]];
            } else {
                array[i] = removeFormattingTokens(array[i]);
            }
        }

        return function (mom) {
            var output = "";
            for (i = 0; i < length; i++) {
                output += typeof array[i].call === 'function' ? array[i].call(mom, format) : array[i];
            }
            return output;
        };
    }

    // format date using native date object
    function formatMoment(m, format) {
        var i = 5;

        function replaceLongDateFormatTokens(input) {
            return m.lang().longDateFormat[input] || input;
        }

        while (i-- && localFormattingTokens.test(format)) {
            format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
        }

        if (!formatFunctions[format]) {
            formatFunctions[format] = makeFormatFunction(format);
        }

        return formatFunctions[format](m);
    }


    /************************************
        Parsing
    ************************************/


    // get the regex to find the next token
    function getParseRegexForToken(token) {
        switch (token) {
        case 'DDDD':
            return parseTokenThreeDigits;
        case 'YYYY':
            return parseTokenFourDigits;
        case 'S':
        case 'SS':
        case 'SSS':
        case 'DDD':
            return parseTokenOneToThreeDigits;
        case 'MMM':
        case 'MMMM':
        case 'dd':
        case 'ddd':
        case 'dddd':
        case 'a':
        case 'A':
            return parseTokenWord;
        case 'Z':
        case 'ZZ':
            return parseTokenTimezone;
        case 'T':
            return parseTokenT;
        case 'MM':
        case 'DD':
        case 'YY':
        case 'HH':
        case 'hh':
        case 'mm':
        case 'ss':
        case 'M':
        case 'D':
        case 'd':
        case 'H':
        case 'h':
        case 'm':
        case 's':
            return parseTokenOneOrTwoDigits;
        default :
            return new RegExp(token.replace('\\', ''));
        }
    }

    // function to convert string input to date
    function addTimeToArrayFromToken(token, input, datePartArray, config) {
        var a, b;

        switch (token) {
        // MONTH
        case 'M' : // fall through to MM
        case 'MM' :
            datePartArray[1] = (input == null) ? 0 : ~~input - 1;
            break;
        case 'MMM' : // fall through to MMMM
        case 'MMMM' :
            for (a = 0; a < 12; a++) {
                if (getLangDefinition().monthsParse[a].test(input)) {
                    datePartArray[1] = a;
                    b = true;
                    break;
                }
            }
            // if we didn't find a month name, mark the date as invalid.
            if (!b) {
                datePartArray[8] = false;
            }
            break;
        // DAY OF MONTH
        case 'D' : // fall through to DDDD
        case 'DD' : // fall through to DDDD
        case 'DDD' : // fall through to DDDD
        case 'DDDD' :
            if (input != null) {
                datePartArray[2] = ~~input;
            }
            break;
        // YEAR
        case 'YY' :
            datePartArray[0] = ~~input + (~~input > 70 ? 1900 : 2000);
            break;
        case 'YYYY' :
            datePartArray[0] = ~~Math.abs(input);
            break;
        // AM / PM
        case 'a' : // fall through to A
        case 'A' :
            config.isPm = ((input + '').toLowerCase() === 'pm');
            break;
        // 24 HOUR
        case 'H' : // fall through to hh
        case 'HH' : // fall through to hh
        case 'h' : // fall through to hh
        case 'hh' :
            datePartArray[3] = ~~input;
            break;
        // MINUTE
        case 'm' : // fall through to mm
        case 'mm' :
            datePartArray[4] = ~~input;
            break;
        // SECOND
        case 's' : // fall through to ss
        case 'ss' :
            datePartArray[5] = ~~input;
            break;
        // MILLISECOND
        case 'S' :
        case 'SS' :
        case 'SSS' :
            datePartArray[6] = ~~ (('0.' + input) * 1000);
            break;
        // TIMEZONE
        case 'Z' : // fall through to ZZ
        case 'ZZ' :
            config.isUTC = true;
            a = (input + '').match(parseTimezoneChunker);
            if (a && a[1]) {
                config.tzh = ~~a[1];
            }
            if (a && a[2]) {
                config.tzm = ~~a[2];
            }
            // reverse offsets
            if (a && a[0] === '+') {
                config.tzh = -config.tzh;
                config.tzm = -config.tzm;
            }
            break;
        }

        // if the input is null, the date is not valid
        if (input == null) {
            datePartArray[8] = false;
        }
    }

    // date from string and format string
    function makeDateFromStringAndFormat(string, format) {
        // This array is used to make a Date, either with `new Date` or `Date.UTC`
        // We store some additional data on the array for validation
        // datePartArray[7] is true if the Date was created with `Date.UTC` and false if created with `new Date`
        // datePartArray[8] is false if the Date is invalid, and undefined if the validity is unknown.
        var datePartArray = [0, 0, 1, 0, 0, 0, 0],
            config = {
                tzh : 0, // timezone hour offset
                tzm : 0  // timezone minute offset
            },
            tokens = format.match(formattingTokens),
            i, parsedInput;

        for (i = 0; i < tokens.length; i++) {
            parsedInput = (getParseRegexForToken(tokens[i]).exec(string) || [])[0];
            if (parsedInput) {
                string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
            }
            // don't parse if its not a known token
            if (formatTokenFunctions[tokens[i]]) {
                addTimeToArrayFromToken(tokens[i], parsedInput, datePartArray, config);
            }
        }
        // handle am pm
        if (config.isPm && datePartArray[3] < 12) {
            datePartArray[3] += 12;
        }
        // if is 12 am, change hours to 0
        if (config.isPm === false && datePartArray[3] === 12) {
            datePartArray[3] = 0;
        }
        // return
        return dateFromArray(datePartArray, config.isUTC, config.tzh, config.tzm);
    }

    // date from string and array of format strings
    function makeDateFromStringAndArray(string, formats) {
        var output,
            inputParts = string.match(parseMultipleFormatChunker) || [],
            formattedInputParts,
            scoreToBeat = 99,
            i,
            currentDate,
            currentScore;
        for (i = 0; i < formats.length; i++) {
            currentDate = makeDateFromStringAndFormat(string, formats[i]);
            formattedInputParts = formatMoment(new Moment(currentDate), formats[i]).match(parseMultipleFormatChunker) || [];
            currentScore = compareArrays(inputParts, formattedInputParts);
            if (currentScore < scoreToBeat) {
                scoreToBeat = currentScore;
                output = currentDate;
            }
        }
        return output;
    }

    // date from iso format
    function makeDateFromString(string) {
        var format = 'YYYY-MM-DDT',
            i;
        if (isoRegex.exec(string)) {
            for (i = 0; i < 4; i++) {
                if (isoTimes[i][1].exec(string)) {
                    format += isoTimes[i][0];
                    break;
                }
            }
            return parseTokenTimezone.exec(string) ?
                makeDateFromStringAndFormat(string, format + ' Z') :
                makeDateFromStringAndFormat(string, format);
        }
        return new Date(string);
    }


    /************************************
        Relative Time
    ************************************/


    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, lang) {
        var rt = lang.relativeTime[string];
        return (typeof rt === 'function') ?
            rt(number || 1, !!withoutSuffix, string, isFuture) :
            rt.replace(/%d/i, number || 1);
    }

    function relativeTime(milliseconds, withoutSuffix, lang) {
        var seconds = round(Math.abs(milliseconds) / 1000),
            minutes = round(seconds / 60),
            hours = round(minutes / 60),
            days = round(hours / 24),
            years = round(days / 365),
            args = seconds < 45 && ['s', seconds] ||
                minutes === 1 && ['m'] ||
                minutes < 45 && ['mm', minutes] ||
                hours === 1 && ['h'] ||
                hours < 22 && ['hh', hours] ||
                days === 1 && ['d'] ||
                days <= 25 && ['dd', days] ||
                days <= 45 && ['M'] ||
                days < 345 && ['MM', round(days / 30)] ||
                years === 1 && ['y'] || ['yy', years];
        args[2] = withoutSuffix;
        args[3] = milliseconds > 0;
        args[4] = lang;
        return substituteTimeAgo.apply({}, args);
    }


    /************************************
        Top Level Functions
    ************************************/


    moment = function (input, format) {
        if (input === null || input === '') {
            return null;
        }
        var date,
            matched;
        // parse Moment object
        if (moment.isMoment(input)) {
            return new Moment(new Date(+input._d), input._isUTC, input._lang);
        // parse string and format
        } else if (format) {
            if (isArray(format)) {
                date = makeDateFromStringAndArray(input, format);
            } else {
                date = makeDateFromStringAndFormat(input, format);
            }
        // evaluate it as a JSON-encoded date
        } else {
            matched = aspNetJsonRegex.exec(input);
            date = input === undefined ? new Date() :
                matched ? new Date(+matched[1]) :
                input instanceof Date ? input :
                isArray(input) ? dateFromArray(input) :
                typeof input === 'string' ? makeDateFromString(input) :
                new Date(input);
        }

        return new Moment(date);
    };

    // creating with utc
    moment.utc = function (input, format) {
        if (isArray(input)) {
            return new Moment(dateFromArray(input, true), true);
        }
        // if we don't have a timezone, we need to add one to trigger parsing into utc
        if (typeof input === 'string' && !parseTokenTimezone.exec(input)) {
            input += ' +0000';
            if (format) {
                format += ' Z';
            }
        }
        return moment(input, format).utc();
    };

    // creating with unix timestamp (in seconds)
    moment.unix = function (input) {
        return moment(input * 1000);
    };

    // duration
    moment.duration = function (input, key) {
        var isDuration = moment.isDuration(input),
            isNumber = (typeof input === 'number'),
            duration = (isDuration ? input._data : (isNumber ? {} : input)),
            ret;

        if (isNumber) {
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        }

        ret = new Duration(duration);

        if (isDuration) {
            ret._lang = input._lang;
        }

        return ret;
    };

    // humanizeDuration
    // This method is deprecated in favor of the new Duration object.  Please
    // see the moment.duration method.
    moment.humanizeDuration = function (num, type, withSuffix) {
        return moment.duration(num, type === true ? null : type).humanize(type === true ? true : withSuffix);
    };

    // version number
    moment.version = VERSION;

    // default format
    moment.defaultFormat = isoFormat;

    // This function will load languages and then set the global language.  If
    // no arguments are passed in, it will simply return the current global
    // language key.
    moment.lang = function (key, values) {
        var i;

        if (!key) {
            return currentLanguage;
        }
        if (values || !languages[key]) {
            loadLang(key, values);
        }
        if (languages[key]) {
            // deprecated, to get the language definition variables, use the
            // moment.fn.lang method or the getLangDefinition function.
            for (i = 0; i < langConfigProperties.length; i++) {
                moment[langConfigProperties[i]] = languages[key][langConfigProperties[i]];
            }
            moment.monthsParse = languages[key].monthsParse;
            currentLanguage = key;
        }
    };

    // returns language data
    moment.langData = getLangDefinition;

    // compare moment object
    moment.isMoment = function (obj) {
        return obj instanceof Moment;
    };

    // for typechecking Duration objects
    moment.isDuration = function (obj) {
        return obj instanceof Duration;
    };

    // Set default language, other languages will inherit from English.
    moment.lang('en', {
        months : "January_February_March_April_May_June_July_August_September_October_November_December".split("_"),
        monthsShort : "Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),
        weekdays : "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),
        weekdaysShort : "Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),
        weekdaysMin : "Su_Mo_Tu_We_Th_Fr_Sa".split("_"),
        longDateFormat : {
            LT : "h:mm A",
            L : "MM/DD/YYYY",
            LL : "MMMM D YYYY",
            LLL : "MMMM D YYYY LT",
            LLLL : "dddd, MMMM D YYYY LT"
        },
        meridiem : function (hours, minutes, isLower) {
            if (hours > 11) {
                return isLower ? 'pm' : 'PM';
            } else {
                return isLower ? 'am' : 'AM';
            }
        },
        calendar : {
            sameDay : '[Today at] LT',
            nextDay : '[Tomorrow at] LT',
            nextWeek : 'dddd [at] LT',
            lastDay : '[Yesterday at] LT',
            lastWeek : '[last] dddd [at] LT',
            sameElse : 'L'
        },
        relativeTime : {
            future : "in %s",
            past : "%s ago",
            s : "a few seconds",
            m : "a minute",
            mm : "%d minutes",
            h : "an hour",
            hh : "%d hours",
            d : "a day",
            dd : "%d days",
            M : "a month",
            MM : "%d months",
            y : "a year",
            yy : "%d years"
        },
        ordinal : function (number) {
            var b = number % 10;
            return (~~ (number % 100 / 10) === 1) ? 'th' :
                (b === 1) ? 'st' :
                (b === 2) ? 'nd' :
                (b === 3) ? 'rd' : 'th';
        }
    });


    /************************************
        Moment Prototype
    ************************************/


    moment.fn = Moment.prototype = {

        clone : function () {
            return moment(this);
        },

        valueOf : function () {
            return +this._d;
        },

        unix : function () {
            return Math.floor(+this._d / 1000);
        },

        toString : function () {
            return this._d.toString();
        },

        toDate : function () {
            return this._d;
        },

        toArray : function () {
            var m = this;
            return [
                m.year(),
                m.month(),
                m.date(),
                m.hours(),
                m.minutes(),
                m.seconds(),
                m.milliseconds(),
                !!this._isUTC
            ];
        },

        isValid : function () {
            if (this._a) {
                // if the parser finds that the input is invalid, it sets
                // the eighth item in the input array to false.
                if (this._a[8] != null) {
                    return !!this._a[8];
                }
                return !compareArrays(this._a, (this._a[7] ? moment.utc(this._a) : moment(this._a)).toArray());
            }
            return !isNaN(this._d.getTime());
        },

        utc : function () {
            this._isUTC = true;
            return this;
        },

        local : function () {
            this._isUTC = false;
            return this;
        },

        format : function (inputString) {
            return formatMoment(this, inputString ? inputString : moment.defaultFormat);
        },

        add : function (input, val) {
            var dur = val ? moment.duration(+val, input) : moment.duration(input);
            addOrSubtractDurationFromMoment(this, dur, 1);
            return this;
        },

        subtract : function (input, val) {
            var dur = val ? moment.duration(+val, input) : moment.duration(input);
            addOrSubtractDurationFromMoment(this, dur, -1);
            return this;
        },

        diff : function (input, val, asFloat) {
            var inputMoment = this._isUTC ? moment(input).utc() : moment(input).local(),
                zoneDiff = (this.zone() - inputMoment.zone()) * 6e4,
                diff = this._d - inputMoment._d - zoneDiff,
                year = this.year() - inputMoment.year(),
                month = this.month() - inputMoment.month(),
                date = this.date() - inputMoment.date(),
                output;
            if (val === 'months') {
                output = year * 12 + month + date / 30;
            } else if (val === 'years') {
                output = year + (month + date / 30) / 12;
            } else {
                output = val === 'seconds' ? diff / 1e3 : // 1000
                    val === 'minutes' ? diff / 6e4 : // 1000 * 60
                    val === 'hours' ? diff / 36e5 : // 1000 * 60 * 60
                    val === 'days' ? diff / 864e5 : // 1000 * 60 * 60 * 24
                    val === 'weeks' ? diff / 6048e5 : // 1000 * 60 * 60 * 24 * 7
                    diff;
            }
            return asFloat ? output : round(output);
        },

        from : function (time, withoutSuffix) {
            return moment.duration(this.diff(time)).lang(this._lang).humanize(!withoutSuffix);
        },

        fromNow : function (withoutSuffix) {
            return this.from(moment(), withoutSuffix);
        },

        calendar : function () {
            var diff = this.diff(moment().sod(), 'days', true),
                calendar = this.lang().calendar,
                allElse = calendar.sameElse,
                format = diff < -6 ? allElse :
                diff < -1 ? calendar.lastWeek :
                diff < 0 ? calendar.lastDay :
                diff < 1 ? calendar.sameDay :
                diff < 2 ? calendar.nextDay :
                diff < 7 ? calendar.nextWeek : allElse;
            return this.format(typeof format === 'function' ? format.apply(this) : format);
        },

        isLeapYear : function () {
            var year = this.year();
            return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        },

        isDST : function () {
            return (this.zone() < moment([this.year()]).zone() ||
                this.zone() < moment([this.year(), 5]).zone());
        },

        day : function (input) {
            var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
            return input == null ? day :
                this.add({ d : input - day });
        },

        startOf: function (val) {
            // the following switch intentionally omits break keywords
            // to utilize falling through the cases.
            switch (val.replace(/s$/, '')) {
            case 'year':
                this.month(0);
                /* falls through */
            case 'month':
                this.date(1);
                /* falls through */
            case 'day':
                this.hours(0);
                /* falls through */
            case 'hour':
                this.minutes(0);
                /* falls through */
            case 'minute':
                this.seconds(0);
                /* falls through */
            case 'second':
                this.milliseconds(0);
                /* falls through */
            }
            return this;
        },

        endOf: function (val) {
            return this.startOf(val).add(val.replace(/s?$/, 's'), 1).subtract('ms', 1);
        },

        sod: function () {
            return this.clone().startOf('day');
        },

        eod: function () {
            // end of day = start of day plus 1 day, minus 1 millisecond
            return this.clone().endOf('day');
        },

        zone : function () {
            return this._isUTC ? 0 : this._d.getTimezoneOffset();
        },

        daysInMonth : function () {
            return moment.utc([this.year(), this.month() + 1, 0]).date();
        },

        // If passed a language key, it will set the language for this
        // instance.  Otherwise, it will return the language configuration
        // variables for this instance.
        lang : function (lang) {
            if (lang === undefined) {
                return getLangDefinition(this);
            } else {
                this._lang = lang;
                return this;
            }
        }
    };

    // helper for adding shortcuts
    function makeGetterAndSetter(name, key) {
        moment.fn[name] = function (input) {
            var utc = this._isUTC ? 'UTC' : '';
            if (input != null) {
                this._d['set' + utc + key](input);
                return this;
            } else {
                return this._d['get' + utc + key]();
            }
        };
    }

    // loop through and add shortcuts (Month, Date, Hours, Minutes, Seconds, Milliseconds)
    for (i = 0; i < proxyGettersAndSetters.length; i ++) {
        makeGetterAndSetter(proxyGettersAndSetters[i].toLowerCase(), proxyGettersAndSetters[i]);
    }

    // add shortcut for year (uses different syntax than the getter/setter 'year' == 'FullYear')
    makeGetterAndSetter('year', 'FullYear');


    /************************************
        Duration Prototype
    ************************************/


    moment.duration.fn = Duration.prototype = {
        weeks : function () {
            return absRound(this.days() / 7);
        },

        valueOf : function () {
            return this._milliseconds +
              this._days * 864e5 +
              this._months * 2592e6;
        },

        humanize : function (withSuffix) {
            var difference = +this,
                rel = this.lang().relativeTime,
                output = relativeTime(difference, !withSuffix, this.lang()),
                fromNow = difference <= 0 ? rel.past : rel.future;

            if (withSuffix) {
                if (typeof fromNow === 'function') {
                    output = fromNow(output);
                } else {
                    output = fromNow.replace(/%s/i, output);
                }
            }

            return output;
        },

        lang : moment.fn.lang
    };

    function makeDurationGetter(name) {
        moment.duration.fn[name] = function () {
            return this._data[name];
        };
    }

    function makeDurationAsGetter(name, factor) {
        moment.duration.fn['as' + name] = function () {
            return +this / factor;
        };
    }

    for (i in unitMillisecondFactors) {
        if (unitMillisecondFactors.hasOwnProperty(i)) {
            makeDurationAsGetter(i, unitMillisecondFactors[i]);
            makeDurationGetter(i.toLowerCase());
        }
    }

    makeDurationAsGetter('Weeks', 6048e5);


    /************************************
        Exposing Moment
    ************************************/


    // CommonJS module is defined
    if (hasModule) {
        module.exports = moment;
    }
    /*global ender:false */
    if (typeof ender === 'undefined') {
        // here, `this` means `window` in the browser, or `global` on the server
        // add `moment` as a global object via a string identifier,
        // for Closure Compiler "advanced" mode
        this['moment'] = moment;
    }
    /*global define:false */
    if (typeof define === "function" && define.amd) {
        define("moment", [], function () {
            return moment;
        });
    }
}).call(this);

});

require.define("/lib/solum/services/constraints/string.js",function(require,module,exports,__dirname,__filename,process,global){/**
 * All constraints related to strings
 */
module.exports = (function () {
  "use strict";

  var string = {};

  string.minLength = function (params, msg) {
    var self        = this;
    self.defaultMsg = 'errors.form.string.min_length';
    self.msg        = (msg) ? msg : self.defaultMsg;
    self.params     = params;

    self.test = function (subject) {
      if (subject.length < self.params.min) {
        throw {error: self.msg};
      }
      return true;
    };
  };

  string.maxLength = function (params, msg) {
    var self        = this;
    self.defaultMsg = 'errors.form.string.max_length';
    self.msg        = (msg) ? msg : self.defaultMsg;
    self.params     = params;

    this.test = function (subject) {
      if (subject.length > self.params.max) {
        throw {error: self.msg};
      }
      return true;
    };
  };

  string.match = function (params, msg) {
    var self        = this;
    self.defaultMsg = 'errors.form.string.match';
    self.msg        = (msg) ? msg : self.defaultMsg;
    self.params     = params;

    this.test = function (subject) {
      if (subject.match(self.params.regex)) {
        throw {error: self.msg};
      }
      return true;
    };
  };
  
  return string;
}());

});

require.define("/lib/solum/services/constraints/collection.js",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore');

/**
 * Methods for validating a collection of solum entities
 */
module.exports = (function () {
  "use strict";

  var collection = {};

  /**
   * Loops through a KO observable array of entities and validates each of them
   */
  collection.validate = function (params, msg) {
    var self        = this;
    self.name       = 'collection.validate';
    self.defaultMsg = 'errors.form.collection.validate';
    msg             = (msg) ? msg : self.defaultMsg;
    self.msg        = msg;
    self.params     = params;

    self.test = function (entities) {
      var i;

      for (i in entities) {
        if (!params.validator.isEntityValid(entities[i])) {
          throw {error: self.msg};
        }
      }

      return true;
    };
  };

  /**
   * Checks the uniqueness of a specific property across a collection of entities
   */
  collection.unique = function (params, msg) {
    var self        = this;
    self.name       = 'collection.unique';
    self.defaultMsg = 'errors.form.collection.unique';
    msg             = (msg) ? msg : self.defaultMsg;
    self.msg        = msg;
    self.params     = params;

    self.test = function (entities) {
      var values, unique_values
        , property = self.params.property;

      // Map the array of entities to flatten to a list of values
      values = _.map(entities, function (value, key, list) {
        return value[property]();
      });

      unique_values = _.uniq(values);

      if (values.length !== unique_values.length) {
        throw {error: self.msg};
      }

      return true;
    };
  };


  return collection;
}());


});

require.define("/lib/solum/services/translation.js",function(require,module,exports,__dirname,__filename,process,global){/*global solum:true, $:true, ko:true, module:true */

/*
 * solum.js - translation
 * author: brandon eum
 * date: Sep 2012
 */

/**
 * Dependencies:
 *  - Assumes knockout.js
 *  - Assumes solum.js
 */

/**
 *
 */
module.exports = (function (root) {
  "use strict";

  /**
   * Translation namespace for all objects/functions related to translation
   */
  var translation = {};

  /**
   * Container for all of the translation dictionaries available.
   */
  translation.dictionary = {en: {}};

  translation.addDictionary = function (dict) {
    // This will overwrite existing entries with the new dictionary
    translation.dictionary = $.extend(true, {}, dict, translation.dictionary);
  };

  /**
   * Use the global settings for the localization settings, but set no dictionary
   * by default.
   */
  translation.defaultConfig = {
    // Use the global locale
    //locale: root.config.locale,
    // Use the global date/number format localization
    //dateNumberLocalization: root.config.dateAndNumberFormatLocalization
  };

  /**
   * The mirage translator provides symfony2-style translation based on a dictionary
   * and date/number localization.
   */
  translation.translator = function (config) {
    var self, locale, dictionary, translations, localized_format;

    // Merge the new config with the default configurations
    config = $.extend({}, config, translation.defaultConfig);

    self             = this;
    locale           = 'en';//config.locale;
    dictionary       = translation.dictionary;
    translations     = dictionary[locale];
    //localized_format = config.dateNumberLocalization[locale];

    /**
     * Mimics the symfony translator, which will look in the specified dictionary,
     * find the correct translation based on '.' delimited keys and replace any
     * wildcards.
     */
    self.translate = function (text, replace) {
      var key, keys, trans, i, j, r, v;

      keys = text.split('.');
      trans = translations;

      // Loop through the keys and find the proper translation
      for (j in keys) {
        if (keys.hasOwnProperty(j)) {
          if (typeof trans[keys[j]] === 'string' || typeof trans[keys[j]] === 'object') {
            trans = trans[keys[j]];
          } else {
            // Could not find translation, use given text
            trans = text;
          }
        }
      }

      // Replace wildcards with the appropriate text replacement
      for (i in replace) {
        if (replace.hasOwnProperty(i)) {
          key = '%' + i + '%';

          // Does the text replacement need translation?
          if (!replace[i].mustTranslate) {
            trans = trans.replace(key, replace[i]);
          } else {
            // Use different translation engines depending on the type
            r = replace[i];
            v = r.value;
            if (r.type === 'date') {
              v = self.dateToLocalizedString(v);
            } else if (r.type === 'number') {
              v = self.numberToLocalizedNumberString(v);
            } else if (r.type === 'currency') {
              v = self.numberToLocalizedCurrencyString(v);
            } else {
              v = self.translate(v);
            }

            trans = trans.replace(key, v);
          }
        }
      }

      return trans;
    };

    /**
     * Translate a JS date object to a localized date string
     */
    self.dateToLocalizedString = function (dateObj) {
      if (!(dateObj instanceof Date)) {
        throw "Translator.dateToLocalizedString: tried to translate a non-date object.";
      }

      return dateObj.toString(localized_format.date.format);
    };

    self.numberToLocalizedNumberString = function (num) {};
    self.numberToLocalizedCurrencyString = function (num) {};
  };// END TRANSLATOR

  return translation;
}());

});

require.define("/lib/solum/services/storage.js",function(require,module,exports,__dirname,__filename,process,global){/*global solum:true, $:true, ko:true, module:true, localStorage:true, sessionStorage:true */

/*
 * solum.js - storage
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
   * Storage namespace, currently pertains only to HTML5, but could be other things
   * in the future
   */
  var storage       = {};
  storage.HTML5 = {};

  /**
   * Default configurations for the storage manager.
   */
  storage.HTML5.defaultConfig = {
    ttl: 7 * 24 * 60 * 60 * 1000,
    namespace: "",
    storage: localStorage // HTML5 storage object
  };

  /**
   *
   */
  storage.HTML5.manager = function (config) {
    var
      MetaDataWrapper,
      storageApi,
      ttl,
      namespace,
      storage,
      isStorageAvailable,
      maxedOut,
      isMaxedOut,
      apiAccessor;

    // Merge the new config with the default configurations
    config = $.extend(config, storage.HTML5.defaultConfig);

    /**
     * Sub-object that wraps saved values to capture created time, ttl, and the
     * value of the object being saved
     */
    MetaDataWrapper = function (value, ttl) {
      var now = new Date();

      this.created = now.getTime();
      this.ttl     = ttl;
      this.value   = value;
    };

    storageApi = {};

    // Store the Time To Live (TTL) default as 1 week
    ttl       = config.ttl;
    namespace = config.namespace;
    storage   = config.storage;

    // Check if this feature is supported
    isStorageAvailable = (typeof localStorage === "object" && localStorage !== null);
    isStorageAvailable = isStorageAvailable && (typeof sessionStorage === "object" && sessionStorage !== null);

    // Prevent saving new items if we are maxed out
    maxedOut   = false;
    isMaxedOut = function () { return isMaxedOut; };

    // Store the object in the metadata wrapper and return true upon succesful save
    storageApi.save = function (key, value) {
      if (maxedOut) {
        return false;
      }

      var w = new MetaDataWrapper(value, ttl);
      storage[key] = JSON.stringify(w);

      try {
        w = new MetaDataWrapper(value, ttl);
        storage[key] = JSON.stringify(w);
      } catch (e) {
        // Storage has reached it's limit
        if (e !== "QUOTA_EXCEEDED_ERR") {
          throw e;
        }

        maxedOut = true;
        return false;
      }

      return true;
    };

    // Get the object, check the TTL, and return the value object
    storageApi.get = function (key) {
      var
        badValues,
        type,
        o,
        created,
        ttl,
        d;

      badValues = {'null': true, 'undefined': true, 'false': true};
      type = typeof storage[key];
      if (type === 'undefined' || badValues[type]) {
        return null;
      }

      o = JSON.parse(storage[key]);

      // Check the type of the object
      created = Number(o.created);
      ttl     = Number(o.ttl);
      if (typeof o !== "object" || created === 0 || isNaN(created) || isNaN(ttl)) {
        return null;
      }

      // Check if it has exceeded it's time to live'
      d = new Date();
      if (d.getTime() -  created > ttl) {
        storageApi.remove(key);
        return null;
      }

      // Unwrap and return the base value
      return o.value;
    };

    // Use the storage API to remove the key/clear
    // Unset the maxed out flag
    storageApi.remove = function (key) {
      storage.removeItem(key);
      maxedOut = false;
    };
    storageApi.clear = function () {
      storage.clear();
      maxedOut = false;
    };

    // Return the public API as a single function that does standard feature checks
    apiAccessor = function (method, key, value) {
      if (typeof method !== 'string' || typeof storageApi[method] !== 'function') {
        throw "StorageManager: Method was not a string or does not exist, got type: " + (typeof method);
      }

      if (!isStorageAvailable) {
        return false;
      }

      var nskey = namespace + key;

      return storageApi[method](nskey, value);
    };

    // Add configuration methods outside the accessor
    apiAccessor.isMaxedOut = isMaxedOut;

    return apiAccessor;
  };

  return storage;
}());
});

require.define("/lib/solum/components/tables.js",function(require,module,exports,__dirname,__filename,process,global){/*global solum:true, $:true, ko:true, module:true */

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

});

require.define("/lib/solum/components/dates.js",function(require,module,exports,__dirname,__filename,process,global){/*global solum:true, $:true, ko:true, module:true */

/*
 * solum.js - date range model
 * author: brandon eum
 * date: Sep 2012
 */

/**
 * Dependencies:
 *  - Assumes jQuery
 *  - Assumes knockout.js
 *  - Assumes solum.js
 */

module.exports = (function () {
  // Access services library through root variable - easier to rename refactor later

  // Container for functions for the tables namespace
  var api  = {};

  /**
   * A smart-date object with a label and an associated date range
   */
  api.SmartDate = function () {
    var self = this;
    self.slug = ko.observable();
    self.name  = null;
    self.dates = {
      start: ko.observable(),
      end:   ko.observable()
    };

    /**
     * @param data A JSON representation of this object
     */
    self.fromJSON = function (data) {
      self.slug(data.slug);
      self.name = data.name;
      self.dates.start(data.dates.start);
      self.dates.end(data.dates.end);
    };
  };

  /**
   * A list of smart dates that can be toggled through to reset the date range
   *
   * TODO: Refactor the date range model to use a sub-object for smart dates
   */
  api.smartDateMenu = {};


  /**
   * Represents a combination of a smart date menu and range input to have back
   * and forth communication between the smart date menu and range input.
   */
  api.DateRange = function (root) {
    var self, ignoreDateSubscription;

    self = this;

    self.selectedSmartDate     = ko.observable();
    self.selectedSmartDateSlug = ko.observable();
    self.validator             = root.getService('validation', 'validator');

    // TODO: Figure out why we need this
    self.hasChanged            = false;

    self.dates = new root.constructEntity('DateRange'); // Instantiate a new date entity

    // Smart date options
    self.smartDates = ko.observableArray([]);

    // Convenience method to add smart date options
    self.addSmartDates = function (smart_dates) {
      var i, sd;
      for (i in smart_dates) {
        if (smart_dates.hasOwnProperty(i)) {
          sd = new api.SmartDate();
          sd.fromJSON(smart_dates[i]);
          self.smartDates.push(sd);
        }
      }
    };

    /**
     * Listens for any changes to the selectedSmartDateSlug
     *   which is the slug value of a SmartDate object.
     */
    self.selectedSmartDateSlug.subscribe(function (selectedSlug) {
      var s, found, i, start, end;

      // get the SmartDate object we are using here
      s = self.smartDates();

      found = false;
      for (i in s) {
        if (s.hasOwnProperty(i) && s[i].slug() === selectedSlug) {
          self.selectedSmartDate(s[i]);
          found = true;
        }
      }

      // Make sure it was a valid smart date
      if (found) {
        // update the dates.start and dates.end properties
        start = self.selectedSmartDate().dates.start();
        end   = self.selectedSmartDate().dates.end();

        // Need to avoid recursive calls to the start/end date subscriptions
        ignoreDateSubscription = true;
        self.dates.start(start);
        self.dates.end(end);
        ignoreDateSubscription = false;
      }
    });

    /**
     * When someone changes the date manually, it changes the date range to custom
     */
    ignoreDateSubscription = false;

    self.updateToCustom = function () {
      var start, end;
      start = self.dates.start();
      end   = self.dates.end();

      // Helps the page object determine whether or not to change the page back
      // to 1
      self.hasChanged = true;
      self.validator.isEntityValid(self.dates);

      if (self.selectedSmartDateSlug() !== 'custom' && !ignoreDateSubscription) {
        self.selectedSmartDateSlug('custom');

        // Will not create an infinite loop because the selectedSmartDateSlug is now 'custom'
        self.dates.start(start);
        self.dates.end(end);
      }
    };

    self.dates.start.subscribe(self.updateToCustom);
    self.dates.end.subscribe(self.updateToCustom);

    self.isCustomSelected = ko.computed(function () {
      return (self.selectedSmartDateSlug() === 'custom');
    }, this);
  };


  return api;
}());




});

require.define("/lib/solum/entities/DateRange.js",function(require,module,exports,__dirname,__filename,process,global){/*global solum:true, $:true, ko:true, module:true */

var moment = require('moment');

// Modularize so we can abstract the use of "solum" to root just in case we change the name
module.exports = function (solum) {
  var self         = this
    , format       = 'YYYY-MM-DD'
    , format_regex = /^[0-9]{4}-[0-1]{1}[0-9]{1}-[0-3]{1}[0-9]{1}$/;

  // Properties
  this.properties = {};
  this.properties.start = ko.observable('');
  this.properties.end   = ko.observable('');

  // Define an entity-level constraint
  // Manually construct them here
  // TODO: Need to figure out a more holistic solution to multi-property constraints

  var max_range_constraint    = {};
  max_range_constraint.name   = 'Date Range - Range greater than x duration';
  max_range_constraint.params = {max: 3, unit: 'years'};
  max_range_constraint.msg    = 'errors.form.date.max_range';

  max_range_constraint.test = function () {
    // Make sure that both dates are valid first
    if (self.errors.properties.start().length > 0 || self.errors.properties.end().length > 0) {
      return;
    }

    var start_moment = moment(self.properties.start(), format);
    var end_moment   = moment(self.properties.end(), format);
    if (start_moment.diff(end_moment, this.params.unit) > this.params.max) {
      throw {error: this.msg, constraint: this.params.max};
    }
  };

  var min_range_constraint    = {};
  min_range_constraint.name   = 'Date Range - start before end';
  min_range_constraint.params = {min: 0, unit: 'days'};
  min_range_constraint.msg    = 'errors.form.date.min_range';

  min_range_constraint.test = function () {
    // Make sure that both dates are valid first
    if (self.errors.properties.start().length > 0 || self.errors.properties.end().length > 0) {
      return;
    }

    var start_moment = moment(self.properties.start(), format);
    var end_moment   = moment(self.properties.end(), format);

    if (start_moment.diff(end_moment, this.params.unit) > this.params.min) {
      throw {error: this.msg, constraint: this.params.max};
    }
  };

  // Constraints
  var min_params = {
    format: format,
    format_regex: format_regex,
    min: moment().subtract('years', 3).startOf('year')
  };

  var max_params = {
    format: format,
    format_regex: format_regex,
    max: moment().startOf('day')
  };

  this.constraints = {};
  this.constraints.entity     = [];
  this.constraints.properties = {
    start: [
      solum.constructConstraint('general', 'notNull', {}, 'errors.form.date.not_null'),
      solum.constructConstraint('date', 'isValid', {format: format, format_regex: format_regex}),
      solum.constructConstraint('date', 'min', min_params),
      solum.constructConstraint('date', 'max', max_params),
      min_range_constraint,
      max_range_constraint
    ],
    end: [
      solum.constructConstraint('general', 'notNull', {}, 'errors.form.date.not_null'),
      solum.constructConstraint('date', 'isValid', {format: format, format_regex: format_regex}),
      solum.constructConstraint('date', 'min', min_params),
      solum.constructConstraint('date', 'max', max_params),
      min_range_constraint,
      max_range_constraint
    ]
  };

};

});

require.define("/lib/solum.js",function(require,module,exports,__dirname,__filename,process,global){/*global solum:true, $:true, ko:true, module:true */

/**
 * solum.js
 * Author: Brandon Eum
 * Created: Sep 2012
 */

/**
 * Dependencies:
 *  - Assumes jQuery
 *  - Assumes knockout.js
 */

solum = (function () {
  "use strict";

  var api, decorateEntity, getSingleton;

  // Keep as a function just in case we want to do something with it later
  api = function () {};

  /**
   * Provide a clean way to do inheritance in JS
   */
  api.extend = function (subclass, superclass) {
    var F = function () {};
    F.prototype = superclass.prototype;
    subclass.prototype = new F();
    subclass.prototype.constructor = subclass;

    // Provide the constructor of the superclass to the subclass
    subclass.superclass = superclass.prototype;
  };

  /**
   * Library-wide configurations that will be used by more than one service/model
   *
   * Right now, its just date/number localization, but could be other things in
   * the future.
   */
  api.config = {
    locale: "en",
    dateAndNumberFormatLocalization: {
      en: {
        date: {
          long_format: 'MMMM d, yyyy',
          format:      'yyyy-M-dd',
          pattern:     /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,
          delimiter:   '-',
          map:         {year: 2, month: 1, day: 0}
        },
        number: {
          thousand_delimiter: ',',
          decimal:            '.'
        },
        currency: {
          currency_symbol:    '&#36;',
          thousand_delimiter: ',',
          decimal:            '.'
        }
      }
    }
  };

  /**
   * The locale is used in the translator and validator (for date formats) and is
   * important enough that it deserves its own setter.
   */
  api.setLocale = function (loc) {
    api.config.locale = loc;
  };

  /**
   * The models namespace is for page models.  It should roughly be one model per
   * page, unless those pages have the exact same elements and user interactions.
   */
  api.models = {};

  api.getModel = function (group, model) {
    if (typeof api.models[group] !== 'object' || typeof api.models[group][model] !== 'function') {
      throw "The requested model does not exist.";
    }

    return new api.models[group][model]();
  };

  /**
   * The components namespace is not implemented in this file, but accepts plug-in
   * files that will use the services defined here to create re-useable models with
   * knockout and jquery.
   */
  api.components = {};

  api.getComponent = function (group, component) {
    if (typeof api.components[group] !== 'object' || typeof api.components[group][component] !== 'function') {
      throw "The requested component does not exist.";
    }

    return new api.components[group][component](api);
  };

  /**
   * The entities namespace is used to represent objects in your system.  They have
   * properties and methods and know how to validate themselves for client-side
   * validation.
   */
  api.entities = {};

  /**
   * Adds all of the necessary standard properties to the entity
   */
  decorateEntity = function (entity) {
    var i;

    // Setup a flag to indicate that this is an entity - for validation purposes
    entity.is_entity = true;

    // Setup error properties mirroring the actual properties
    entity.errors            = {};
    entity.errors.entity     = ko.observableArray([]);
    entity.errors.properties = {};

    for (i in entity.properties) {
      entity.errors.properties[i] = ko.observableArray([]);

      // Provide top-level access to obsevable properties
      entity[i] = entity.properties[i];
    }

    // Add a convenience method for checking if there are errors
    entity.hasError = ko.computed(function () {
      var i, has_property_error = false;
      for (i in this.errors.properties) {
        if (this.errors.properties[i]().length > 0) {
          has_property_error = true;
        }
      }

      return (has_property_error || this.errors.entity().length > 0);
    }, entity);

    // Add a mapper function
    if (typeof entity.toObject !== 'function') {
      entity.toObject = function () {
        var i, j, collection, obj = {};
        var self = this;
        for (i in self.properties) {
          // Call the toObject method on the nested entity
          if (self.properties[i].is_entity) {
            obj[i] = self.properties[i].toObject();

          // Collection of entities
          } else if (self.properties[i].is_entity_collection) {
            collection = self.properties[i]();
            obj[i]     = [];

            for (j in collection) {
              obj[i].push(collection[j].toObject());
            }
          // KO observable property - evaluate and set that property in return obj
          } else {
           obj[i] = self.properties[i]();
          }
        };

        return obj;
      };
    }

    // Take a plain javascript object and add its properties to this entity
    if (typeof entity.fromObject !== 'function') {
      entity.fromObject = function (obj) {
        var i, j, collection, ent, self = this;

        for (i in self.properties) {
          // Call fromObject on the embedded entity
          if (self.properties[i].is_entity) {
            self.properties[i].fromObject(obj[i]);

          // Entity Collection - Create new objects from the specified entity and
          // add to the collection
          } else if (self.properties[i].is_entity_collection) {
            collection = obj[i];
            
            // Empty the collection first before adding things back
            self.properties[i].removeAll();
            
            for (j in collection) {
              ent = api.constructEntity(self.properties[i].entity_type);
              ent.fromObject(collection[j]);
              self.properties[i].push(ent);
            }

          // KO observable property - set the value from the raw JS obj
          } else {
           self.properties[i](obj[i]);
          }
        };

        return obj;
      };
    }
  };

  /**
   * It is a requirement that entities have no arguments in their constructor so
   * that we can use a generic get method to get the entity.
   *
   * The second argument is optional, but the entity can be initialized with a
   * raw javascript object.
   */
  api.constructEntity = function (name, raw_obj) {
    if (typeof name !== 'string') {
      throw "The entity name must be a string";
    }
    var entity = new api.entities[name](api);

    decorateEntity(entity);

    if (raw_obj) {
      entity.fromObject(raw_obj);
    }

    return entity;
  };

  /**
   * Be lazy about constructing instances of each service, and only construct them
   * as needed.  They should be singleton objects, so store the single instance
   * here.
   */
  api.instances = {};

  /**
   * If an instance exists and !isReset, return that, otherwise construct and set
   * the singleton to be the newly constructed instance
   */
  getSingleton = function (group, name, config, isReset) {
    var isRightType, doesGroupExist, doesSvcExist;

    isRightType    = (typeof group === 'string' && typeof name === 'string');
    doesGroupExist = (typeof api.services[group] === 'object');
    doesSvcExist   = (doesGroupExist && typeof api.services[group][name] === 'function');

    if (!isRightType || !doesSvcExist) {
      throw "The requested service does not exist. Group: " + group + " , name: " + name;
    }

    // Check if an instances namespace for the group exists, otherwise create
    if (typeof api.instances[group] !== 'object') {
      api.instances[group] = {};
      api.instances[group][name] = null;
    }

    // Create the new singleton and set as the global instance
    if (api.instances[group][name] === null || isReset) {
      api.instances[group][name] = new api.services[group][name](config);
    }

    return api.instances[group][name];
  };

  /**
   * Get the singleton of one of the solum services, if it is not constructed,
   * construct it here.
   */
  api.getService = function (group, name, config) {
    return getSingleton(group, name, config, false);
  };

  /**
   * Configure the options for a particular service, this will instantiate the
   * service if it does not already exist.  This will also change the global config
   * for that service for all cases that you are using it.
   */
  api.configureService = function (group, name, config) {
    return getSingleton(group, name, config, true);
  };

  /**
   * Services namespace houses:
   *  - Ajax Management
   *  - Validation
   *  - Symfony-style Translation
   */
  api.services = {};

  // Return solum's public API
  return api;
}());

// Services
solum.services.ajax        = require('./solum/services/ajax');
solum.addAjaxRoutes        = solum.services.ajax.addAjaxRoutes;

solum.services.validation  = require('./solum/services/validation');
solum.constructConstraint  = solum.services.validation.constraints.constructConstraint;

solum.services.translation = require('./solum/services/translation');
solum.addDictionary        = solum.services.translation.addDictionary;

solum.services.storage     = require('./solum/services/storage');

// Components
solum.components.tables    = require('./solum/components/tables');
solum.components.dates     = require('./solum/components/dates');

// Entities
solum.entities.DateRange   = require('./solum/entities/DateRange');

module.exports = solum;
this.solum = solum;

});
require("/lib/solum.js");
})();
