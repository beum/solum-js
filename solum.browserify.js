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

require.define("/solum/services/ajax.js",function(require,module,exports,__dirname,__filename,process,global){/*global solum:true, $:true, ko:true, module:true */

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

});

require.define("/solum/services/validation.js",function(require,module,exports,__dirname,__filename,process,global){/*global solum:true, $:true, ko:true, module:true */

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
      var isValid, i, j, errors;
      isValid = true;

      // Loop through all of the properties and validate
      for (i in entity.properties) {
        // Validate the KO observable property
        errors = self.isValid(entity.properties[i](), entity.constraints[i]);

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
  
  validation.constraints.general = require('./constraints/general');
  validation.constraints.date    = require('./constraints/date');
  validation.constraints.string  = require('./constraints/string');
  
  return validation;
}());

});

require.define("/solum/services/constraints/general.js",function(require,module,exports,__dirname,__filename,process,global){/**
 * Constraints for any type of subject
 */

// Access services library (if needed) through root variable - easier to rename refactor later
module.exports = (function () {
  "use strict";

  var general = {};

  general.notNull = function (params, msg) {
    var self        = this;
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

  general.type = function (params, msg) {
    var self        = this;
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

  return general;
}());

});

require.define("/solum/services/constraints/date.js",function(require,module,exports,__dirname,__filename,process,global){/**
 * Date related constraints
 */
module.exports = (function () {
  "use strict";
  var date = {};
  
  date.min = function (params, msg) {
    var self            = this;
    self.continueOnFail = false;
    self.defaultMsg     = 'errors.form.date.min';
    self.msg            = (msg) ? msg : self.defaultMsg;
    self.params         = params;

    self.test = function (subject) {
      if (true) {
        throw {error: self.msg};
      }
      return true;
    };
  };

  /*
  var self, dateNumberFormat;

  self = this;
  dateNumberFormat = config.dateAndNumberFormatLocalization;


  // DATE Constraints

  self.date = function (subject, params) {
    var year, month, day, test;

    if (!dateNumberFormat.date.pattern.test(subject)) {
      throw {error: "errors.form.date.invalid_format"};
    }

    // Y/M/d value validation
    test  = Date.parseExact(subject, dateNumberFormat.date.format);

    if (test === null) {
      throw {error: "errors.form.date.invalid_format"};
    }

    year  = test.getFullYear();
    month = test.getMonth();
    day   = test.getDay() + 1; // 0 indexed for day of month

    try {
      Date.validateDay(day, year, month);
    } catch (e) {
      throw {error: "errors.form.date.invalid_format"};
    }

    return true;
  };

  self.minDate = function (subject, params) {
    var min, test;
    min  = params.minDate;
    test = Date.parseExact(subject, dateNumberFormat.date.format);

    if (test < min) {
      throw {error: "errors.form.date.min_date"};
    }

    return true;
  };

  self.maxDate = function (subject, params) {
    var max, test;
    max  = params.maxDate;
    test = Date.parseExact(subject, dateNumberFormat.date.format);
    if (test > max) {
      throw {error: "errors.form.date.max_date"};
    }

    return true;
  };/**/

  return date;
}());

});

require.define("/solum/services/constraints/string.js",function(require,module,exports,__dirname,__filename,process,global){/**
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

require.define("/solum/services/translation.js",function(require,module,exports,__dirname,__filename,process,global){/*global solum:true, $:true, ko:true, module:true */

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

require.define("/solum/services/storage.js",function(require,module,exports,__dirname,__filename,process,global){/*global solum:true, $:true, ko:true, module:true, localStorage:true, sessionStorage:true */

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

require.define("/solum/components/tables.js",function(require,module,exports,__dirname,__filename,process,global){/*global solum:true, $:true, ko:true, module:true */

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

require.define("/solum/components/dates.js",function(require,module,exports,__dirname,__filename,process,global){/*global solum:true, $:true, ko:true, module:true */

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

require.define("/solum/entities/DateRange.js",function(require,module,exports,__dirname,__filename,process,global){/*global solum:true, $:true, ko:true, module:true */
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
});

require.define("/solum.js",function(require,module,exports,__dirname,__filename,process,global){/*global solum:true, $:true, ko:true, module:true */

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
    
    // Setup error properties mirroring the actual properties
    entity.errors = {};
    for (i in entity.properties) {
      entity.errors[i] = ko.observableArray([]);
      
      // Provide top-level access to obsevable properties
      entity[i] = entity.properties[i];
    }

    // Add a convenience method for checking if there are errors
    entity.hasError = ko.computed(function () {
      var hasError, i;

      hasError = false;
      for (i in this.errors) {
        if (this.errors.hasOwnProperty(i) && this.errors[i]().length > 0) {
          hasError = true;
        }
      }

      return hasError;
    }, entity);

    
    var standardProperties = ['constraints', 'errors', 'hasError'];
    
    // Add a mapper function
    entity.toObject = function () {
      var i, obj = {};
      var self = this;
      for (i in self.properties) {
        // Call the toObject method on the nested entity
        if (typeof self.properties[i] === 'object') {
          obj[i] = self.properties[i].toObject();
        
        // KO observable property - evaluate and set that property in return obj
        } else {
         obj[i] = self.properties[i]();
        }
      };

      return obj;
    };

    // Take a plain javascript object and convert to an entity
    entity.fromObject = function (obj) {
      var i, self = this;
      
      for (i in self.properties) {
        // Call fromObject on the embedded entity
        if (typeof self.properties[i] === 'object') {
          obj[i] = self.properties[i].fromObject(obj[i]);
        
        // KO observable property - set the value from the raw JS obj
        } else {
         self.properties[i](obj[i]);
        }
      };

      return obj;
    };
  };

  /**
   * It is a requirement that entities have no arguments in their constructor so
   * that we can use a generic get method to get the entity.
   */
  api.constructEntity = function (name) {
    if (typeof name !== 'string') {
      throw "The entity name must be a string";
    }
    var entity = new api.entities[name](api);
    decorateEntity(entity);
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
require("/solum.js");
})();
