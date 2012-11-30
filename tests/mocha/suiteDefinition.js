/*global module:true, describe:true, it:true */
/*
 * This runs the entire test suite with the right reference to the js source
 */

module.exports = function (lib) {
  "use strict";
  var
    solum,
    components_tables;

  describe('The library being used for this test suite:', function () {
    it('is: ' + lib, function () {});
  });

  // Load should globally
  require('/usr/lib/node_modules/should/lib/should');

  //solum = require('./lib/solum.js');
  //solum(lib);

  // Models
  components_tables = require('./lib/components/tables.js');
  components_tables('../' + lib);
};