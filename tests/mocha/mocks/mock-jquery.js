/*global module:true, describe:true, it:true, module:true */
/**
 * Mock jquery for testing
 *
 */

var constructor = function () {};
var $ = function(){ return new constructor(); };
$.ajaxParams;
$.ajax = function (params) {
  var self = this;
  this.ajaxParams = params;
  this.abort   = function () { self.aborted = true; };
  this.aborted = false;
}
var jQuery = $

module.exports = jQuery;