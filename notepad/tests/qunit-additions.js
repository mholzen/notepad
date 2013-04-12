QUnit.config.testTimeout = 5000;

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
            if (actual === undefined) { return false; }
            return actual.equals(expected);
        },

        describeTo: function(description) {
            description.append('equal to ').appendLiteral(expected);
        }
    });
};

module = function(label, options) {
    if (QUnit.file) {
        label = QUnit.file + ':  '+ label;
    }
    return QUnit.module(label,options)  
};

function wrapInEndpoint(element, endpoint) {
    var endpoint = endpoint || mock(new FusekiEndpoint("http://ex.com"));
    var endpointElement = $("<div>").appendTo("#qunit-fixture").endpoint({endpoint: endpoint});
    element.appendTo(endpointElement);
    return endpoint;
}

function testWithTriples(name, triples, testFunction) {
    asyncTest(name, function() {
        TempFusekiEndpoint(triples, testFunction);
    });
}


