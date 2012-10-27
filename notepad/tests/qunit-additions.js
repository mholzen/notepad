/**
 * testAsyncStepsWithPause
 * Executes any number of async Qunit tests with a pause between each step
 *
 * Author: Matthew O'Riordan, http://mattheworiordan.com
 *
 * Params:
 * @timeToWait: milliseconds between running method and running tests
 * @methods: 1+ function arguments passed in the format:
 *   function() {
 *      // execute code here which requires the tests to wait for @timeToWait
 *      return function() {
 *        // execute assertions here, will be executed after @timeToWait
 *      }
 *   }, ...
 */

function testAsyncStepsWithPause(pause) {
  var args = arguments;
  if (args.length > 1) {
    stop();
    var asyncTestFunction = args[1]();
    setTimeout(function() {
      asyncTestFunction();
      start();
      var params = [pause].concat(Array.prototype.slice.call(args, 2));
      testAsyncStepsWithPause.apply(this, params);
    }, pause)
  }
}

skippedTest = function(label, code) {};

var equalToObject = function(expected) {
    return new JsHamcrest.SimpleMatcher({
        matches: function(actual) {
            return actual.equals(expected);
        },

        describeTo: function(description) {
            description.append('equal to ').appendLiteral(expected);
        }
    });
};

var here = function() {
  console.log('here');  
}
var c = console;
