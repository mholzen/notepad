module("given a hostname", {
    setup: function() {
        this.hostname = "http://localhost:3030/test";
    }
});
asyncTest("when I create a fusekiendpoint", function() {
    expect(1);
    try {
        var jqxhr = this.endpoint.execute('this is not a sparql query');
        jqxhr.error(function() {
            ok(true, "we should receive an error");
        });
    } catch(err) {
        ok(true, "we should receive an error");
    }
    start();
});

module('given a FusekiEndpoint', {
    setup: function() {
        this.endpoint = new FusekiEndpoint('http://localhost:3030/test');
    },
});
test("when I query for prefixes, then", function() {
    assertThat(this.endpoint.prefixes(), containsString("PREFIX"));
});
test("when I delete all content, then", function() {
    stop();
    expect(2);
    var endpoint = this.endpoint;
    endpoint.clear( function(){
        ok(true, "the endpoint should clear");
        endpoint.getSubjectsLabelsByLabel('label',function(subjects) {
            equal(subjects.length,0, "the endpoint should be empty after clear");
            console.log(subjects);
            start();
        });
    }).error( function(){ start(); ok(false,"the endpoint should not generate an error"); });
});
test("when query for nodes by labels, then", function() {
    expect(2);
    stop();
    var endpoint = this.endpoint;
    endpoint.clear( function(){
        endpoint.execute("INSERT DATA { <a> rdfs:label 'label' }", function(data) {
            ok(true,"insert should be successful");
            setTimeout(function() {
                endpoint.getSubjectsLabelsByLabel('label',function(subjects) {
                    equal(subjects.length,1, "endpoint should have one label");
                    start();
                });
            }, 100);
        });
    }).error( function(){ start(); ok(false,"should not receive an error from Fuseki Server"); });
});
test("when I retrieve a literal with a double quote", function() {
    expect(2);
    stop();
    var endpoint = this.endpoint;
    endpoint.clear( function(){
        endpoint.execute("INSERT DATA { <s> rdfs:label 'a literal containing a \" double quote' }", function() {
            endpoint.execute('SELECT ?label WHERE { ?s rdfs:label ?label }',function(response) {
                console.log(response);
                equal(response.results.bindings.length,1, "endpoint should have one label");
                if (response.results.bindings.length === 1) {
                    var label = new Resource(response.results.bindings[0].label);
                    equal(label.toSparqlString(), '"a literal containing a \\" double quote"');
                }
                start();
            });
        });
    }).error( function(){ start(); ok(false,"should not receive an error from Fuseki Server"); });
});
asyncTest("when I create a named graph", function() {
    expect(5);

    // Make sure the graph is empty
    var now = Date.now();
    this.endpoint.graph = "http://www.vonholzen.org/notepad#graph-" + now;
    var endpoint = this.endpoint;
    this.endpoint.constructAll(function(receivedTriples) {
        equal(receivedTriples.length, 0, "the initial results should be empty");

        var triples = new Triples (
            new Triple('ex:a-'+now, 'ex:b', 'ex:c'), new Triple('ex:d-'+now, 'ex:e', 'ex:f')
        );
        endpoint.insertData(triples, function() {
            ok(true, "succesful insert");

            endpoint.constructAll(function(receivedTriples) {
                // Better test: testing for collection equality should be independant of order
                //assertThat(receivedTriples.toString(), equalTo(triples.toString()), "the returned graph should be identical to the initial graph");
                equal(receivedTriples.length, triples.length, "the result set should be the same size as the inserted set");

                endpoint.execute("select ?o { ?s ex:b ?o }", function(response) {
                    assertThat(response.results.bindings.length, equalTo(1), "one result returned");
                    if (response.results.bindings.length == 1) {
                        assertThat(response.results.bindings[0]['o'].value, equalTo('http://example.com/#c'), "one result returned");
                    }
                    start();
                });
            });
        });
    });
})

skippedTest("given a predicate p, when I post a triple with that predicate, then I can retrieve the collection of triples where p is the predicate", function(){
    this.endpoint.post(":a :pred :b", function() {
        this.endpoint.get(":pred", function(triples) {
            ok(triples.sparql("SELECT ?collection WHERE { :pred rdfs:member ?collection . ?collection rdfs:member :a }"));
        });
    });
});
asyncTest("when I update a triple, then", function() {
    var uri = $.notepad.getNewUri();
    var triple = new Triple(uri, ":p", ":o");
    var triples = new Triples(0);
    triples.push(triple);
    var endpoint = this.endpoint;
    endpoint.insertData(triples, function() {
        endpoint.getRdf(uri, function(triples) {
            assertThat(triples, hasItem(equalToObject(triple)), "describing the subject contains the triple");
            start();
        });
    });
});

// Skipped because the triplestore doesn't seem to rebind the basemodel anymore
skippedTest("when I update a triple affected by a semantic rule, then", function() {
    var uri = $.notepad.getNewUri();
    var triple = new Triple(uri, "rdf:type", "rdf:Property");
    var derivedTriple = new Triple(uri, "rdfs:subPropertyOf", uri);
    var triples = new Triples(0);
    triples.push(triple);
    var endpoint = this.endpoint;
    endpoint.insertData(triples, function() {
        endpoint.getRdf(uri, function(triples) {
            assertThat(triples, hasItem(equalToObject(derivedTriple)), "describing the subject contains the triple");
            start();
        });
    });
});
