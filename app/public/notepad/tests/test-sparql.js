(function($, undefined) {

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

module('endpoint', {
    setup: function() {
        this.endpoint = new FusekiEndpoint('http://localhost:3030/test');
    },
});
test("when I query for prefixes, then", function() {
    assertThat(this.endpoint.prefixes(), containsString("PREFIX"));
});
asyncTest("select", function() {
    expect(1);
    this.endpoint.execute('select * {?s ?p ?o}', function() {
        assertThat(true);
        start();
    });
});
asyncTest("construct", function() {
    expect(1);
    this.endpoint.execute('construct {?s ?p ?o} {?s ?p ?o}', function(triples) {
        assertThat(triples, hasMember(length));
        start();
    });
});
asyncTest("insert data", function() {
    expect(1);
    this.endpoint.execute('INSERT DATA {<> <> <>}', function() {
        assertThat(true);
        start();
    });
});

asyncTest("when I delete all content, then", function() {
    var endpoint = this.endpoint;
    endpoint.clear().then(function() {
        return endpoint.constructAll();
    }).then(function(results) {
        assertThat(results, []);
        start();
    });
});
asyncTest("when query for nodes by labels, then", function() {
    var endpoint = this.endpoint;
    endpoint.clear().then(function(){
        return endpoint.execute("INSERT DATA { <a> rdfs:label 'label' }");
    }).then(function() {
        return $.notepad.queries.find_subject_label_by_label.execute(endpoint, {label: 'label'});
    }).then(function(results) {
        assertThat(results.literal(), 'label');
        start();
    });
});
test("when I retrieve a literal with a double quote", function() {
    expect(3);
    stop();
    var endpoint = this.endpoint;
    endpoint.clear( function(){
        endpoint.execute("INSERT DATA { <s> rdfs:label 'a literal containing a \" double quote' }", function() {
            endpoint.execute('SELECT ?label WHERE { ?s rdfs:label ?label }',function(response) {
                equal(response.results.bindings.length,1, "endpoint should have one label");
                if (response.results.bindings.length === 1) {
                    var label = new Resource(response.results.bindings[0].label);
                    equal(label.toSparqlString(), '"a literal containing a \\" double quote"');
                }
                endpoint.execute('CONSTRUCT { ?s rdfs:label ?label } WHERE { ?s rdfs:label ?label }',function(response) {
                    equal(response[0].object.toString(), "a literal containing a \" double quote" );
                    start();
                });
            });
        });
    }).error( function(){ start(); ok(false,"should not receive an error from Fuseki Server"); });
});
asyncTest("when I create a named graph", function() {
    expect(5);

    // Make sure the graph is empty
    var now = Date.now();
    this.endpoint.graph = new Resource ("http://www.vonholzen.org/notepad#graph-" + now);
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
});

asyncTest("when I create a temp endpoint", function() {
    expect(1);
    var triples = new Triples(
        new Triple('ex:s','ex:p','ex:o'),
        new Triple('ex:s1','ex:p1','ex:o1'),
        new Triple('ex:s2','ex:p2','ex:o2'),
        new Triple('ex:s2','ex:p1','ex:o1')
    );

    var endpoint = TempFusekiEndpoint(triples, function() {
        this.execute("construct {ex:s1 ex:p1 ?o} { ex:s1 ex:p1 ?o }", function(triples) {
            assertThat(triples, hasItem(equalToObject(new Triple('ex:s1','ex:p1','ex:o1'))), "it returns the triple I just created");
            start();
        })
    });
});

skippedTest("given a predicate p, when I post a triple with that predicate, then I can retrieve the collection of triples where p is the predicate", function(){
    this.endpoint.post(":a :pred :b", function() {
        this.endpoint.get(":pred", function(triples) {
            ok(triples.sparql("SELECT ?collection WHERE { :pred rdfs:member ?collection . ?collection rdfs:member :a }"));
        });
    });
});
asyncTest("when I update a triple, then", function() {
    var uri = $.notepad.newUri();
    var triple = new Triple(uri, ":p", ":o");
    var triples = new Triples();
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
    var uri = $.notepad.newUri();
    var triple = new Triple(uri, "rdf:type", "rdf:Property");
    var derivedTriple = new Triple(uri, "rdfs:subPropertyOf", uri);
    var triples = new Triples();
    triples.push(triple);
    var endpoint = this.endpoint;
    endpoint.insertData(triples, function() {
        endpoint.getRdf(uri, function(triples) {
            assertThat(triples, hasItem(equalToObject(derivedTriple)), "describing the subject contains the triple");
            start();
        });
    });
});

asyncTest("meta", function() {
    var setup = '' +
'PREFIX ex: <http://example.com/#>' +
'INSERT DATA {' +
'    GRAPH ex:guid1 {' +
'        ex:c1 ex:member ex:o1 .' +
'    } ' +
'    GRAPH ex:guid2 {' +
'        ex:c1 ex:member ex:o2 .' +
'    } ' +
'    GRAPH ex:guid3 {' +
'        ex:c1 ex:member ex:o3 .' +
'    } ' +
'    GRAPH ex:guid4 {' +
'        ex:c1 ex:member ex:o4 .' +
'    } ' +
'    GRAPH ex:c1-meta {' +
'        ex:c1-meta notepad:orders ex:c1 . ' +
'        ex:guid1 rdfs:before ex:guid2 .' +
'        ex:guid2 rdfs:before ex:guid3 .' +
'        ex:guid3 rdfs:before ex:guid4 .' +
'    }' +
'}'+
'';

var find_content_all = '' +
'CONSTRUCT {  ' +
'   ex:c1 ?p ?o . ' +
'}' +
'{ ' +
'   graph ?g { ex:c1 ?p ?o } .' +
'} ' +
'';

var find_order = '' +
'CONSTRUCT {  ' +
'   ?before rdfs:before ?after . ' +
'}' +
'{ ' +
'  { graph ?meta { ' +
'     ?before rdfs:before ?after  . ' +
'     ?meta notepad:orders ex:c1 . ' +
'   } } ' +
'} ' +
'';

var find_content_given_meta = '' +
'CONSTRUCT {  ' +
'   ex:c1 ?p ?o . ' +
'}' +
'{ ' +
'   { graph ?g { ex:c1 ?p ?o } .} UNION { graph ?g1 { ex:c1 ?p ?o } } .' +
'   graph ?meta { ?meta notepad:orders ex:c1 . ?g rdfs:before ?g1 } ' +
'} ' +
'';



    var endpoint = this.endpoint;
    endpoint.execute(setup, function() {
        endpoint.execute(find_content_all, function(content) {
            assertThat(content.objects('ex:c1', 'ex:member'), hasItems('ex:o1', 'ex:o2', 'ex:o3', 'ex:o4'));

            endpoint.execute(find_order, function(order) {
                assertThat(order.object('ex:guid1', 'rdfs:before'), 'ex:guid2');
                assertThat(order.object('ex:guid2', 'rdfs:before'), 'ex:guid3');
                assertThat(order.object('ex:guid3', 'rdfs:before'), 'ex:guid4');

                // must evaluate how complex it is to use the save/apply an order given this form

                endpoint.execute(find_content_given_meta, function(content) {
                    assertThat(content.objects('ex:c1', 'ex:member'), hasItems('ex:o1', 'ex:o2', 'ex:o3', 'ex:o4'));

                    start();
                });
            });
        });
    });

});

    // For tests, set the empty prefix to the Dev point
    // $.notepad.namespaces[''] = 'http://localhost:3030/dev';

testWithTriples("testWithTriples", toTriples(":s :p :o"), function() {
    $.notepad.queries.describe.execute(this.endpoint, {about: ':s'}, function(triples) {
        assertThat(triples, hasItem(':s :p :o .'));
        start();
    });
});

module('dataset', {
    setup: function() {
        this.endpoint = new FusekiEndpoint('http://localhost:3030/test', $.notepad.newUri());
    },
});
asyncTest("deleteInsertData", function() {
    var endpoint = this.endpoint;

    endpoint.constructAll().then(function(response) {
        assertThat(response.length, 0);
        return endpoint.deleteInsertData(null, toTriples(':s :p :o'));
    }).then(function(response) {
        return endpoint.constructAll();
    }).then(function(response) {
        assertThat(response.length, 1);
        return endpoint.deleteInsertData(toTriples(':s :p :o'), null);
    }).then(function(response) {
        return endpoint.constructAll();
    }).then(function(response) {
        assertThat(response.length, 0);
        start();
    });
});

asyncTest("clear only affects current dataset", function() {
    var endpoint = this.endpoint;
    var anotherEndpoint = new FusekiEndpoint('http://localhost:3030/test', $.notepad.newUri());

    var timestamp = new Date().getTime();
    var initialTriples = toTriples(':s :p '+timestamp);

    endpoint.insertData(initialTriples).then(function() {
        return anotherEndpoint.insertData(initialTriples);
    }).then(function() {
        return endpoint.clear();
    }).then(function() {
        return endpoint.constructAll();
    }).then(function(triples) {
        assertThat(triples.length, 0, "the cleared endpoint should have no triples");
        return anotherEndpoint.constructAll();
    }).then(function(triples) {
        assertThat(triples.length, initialTriples.length, "the other endpoint should be unaffecte");
        start();
    });
});

}(jQuery));
