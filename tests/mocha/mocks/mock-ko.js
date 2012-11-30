/**
 * Mock Knockout.js for testing
 */
var ko = {};

ko.computed = function(f, context){
  // Must be able to call a computed from within the context of the object it
  // was instantiated in
  if(!context) context = this;

  // Return a new instance of the object
  if(!(this instanceof ko.computed)) return new ko.computed(f, context);

  var computed = f;

  var func = function(){ return computed.call(context); };
  func.isKoComputed = true;

  // Call the original function within the original context
  return func;
}

ko.observable = function(a){
  if(!(this instanceof ko.observable)) return new ko.observable(a);

  var self = this;
  this.val = a;

  var func = function(a) {
    if(typeof a == "undefined") return self.val;

    self.val = a;
  }

  // A little trick to make sure that the object was replaced properly
  func.isKoObservable = true;
  func.subscribe = function(f){ func.subscriberFunc = f; };

  return func;
}

ko.observableArray = function(){
  var a = [];

  if(!(this instanceof ko.observableArray)) return new ko.observableArray(a);

  var f = function() { return a };
  f.push = function(r) { a.push(r) };
  f.isKoObservableArray = true;
  f.splice = function(x, y) {
    a.splice(x, y);
  };

  return f;
}

module.exports = ko
