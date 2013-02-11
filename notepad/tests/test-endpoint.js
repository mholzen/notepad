QUnit.file = "test-endpoint.js";

var testEndpointUri = 'http://instruct.vonholzen.org:3030/test';

asyncTest("ask", 1, function() {
    var endpoint = new FusekiEndpoint(testEndpointUri);
    endpoint.query('ASK {?s ?p ?o}', function(response) {
        assertThat(response, hasMember('boolean'));
        start();
    });
});

asyncTest("canAnswer", function() {
    var endpoint = new FusekiEndpoint(testEndpointUri);
    endpoint.canAnswer().done(function(response) {
        assertThat(response, hasMember('boolean'));
        start();
    });
});

test("create", function() {
    var element = $("<div>").endpoint();
    var endpoint = element.data('notepadEndpoint');
    assertThat(endpoint.options.endpoint, containsString('localhost'));
});

module("given an element", {
    setup: function() {
        $("#qunit-fixture").append('<div id="endpoint">');
    },
    teardown: function() {
      $("#endpoint").remove();
    }
});

test("create with URI", function() {
    var element = $("#endpoint").endpoint({endpoint: testEndpointUri});
    var endpoint = element.data('notepadEndpoint');
    assertThat(endpoint.getEndpoint().uri, testEndpointUri);
    assertThat(endpoint.element.children('[property="notepad:endpoint"]').length, 0);
    endpoint.option('display', true);
    assertThat(endpoint.element.text(), containsString(testEndpointUri));
});

test("create with endpoint", function() {
    var endpoint = new ContainerChainEndpoint(this);
    var element = $("#endpoint").endpoint({endpoint: endpoint, display: false});
    var endpoint = element.data('notepadEndpoint');
    assertThat(endpoint.element.children('[property="notepad:endpoint"]').length, 0);
});

asyncTest("setUriToFirstResponding", function() {
    var element = $("#endpoint").endpoint();
    var endpoint = element.data('notepadEndpoint');
    endpoint.setUriToFirstResponding(['http://example.com', testEndpointUri],
        function() {
            assertThat(endpoint.options.endpoint, testEndpointUri);
            start(); 
        }).error(function() {
            // BUG:
            //  expected: this function should not be called (assuming instruct.vonholzen.org is up)
            //  actual: this function gets called because the Deferred object returned is for the first call
            // assertThat(false, "unexpected failure -- http://instruct.vonholzen.org:3030/dev should always be up");
        });
});

asyncTest("setUriToFirstResponding all failing", function() {
    var element = $("#endpoint").endpoint();
    var endpoint = element.data('notepadEndpoint');
    endpoint.setUriToFirstResponding(['http://example.com', 'http://this-site-should-not-exist-mvh.com'],
        function() {
            assertThat(false, "unexpected success");
            start(); 
        }).error(function() {
            assertThat(endpoint.options.endpoint, 'http://localhost:3030/dev');
            start();
        });
});

skippedTest("setUriToFirstRespondingUsingDeferred", function() {
    var element = $("#endpoint").endpoint();
    var endpoint = element.data('notepadEndpoint');
    endpoint.setUriToFirstResponding(['http://instruct.vonholzen.org:3030/dev']).complete(
        function() {
            assertThat(endpoint.options.uri, testEndpointUri);
            start();
        });
});
