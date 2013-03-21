QUnit.file="test-rdf.js";
module("resources and triples");

test("resources", function() {
    equal(new Resource("a"),"a");
    equal("a",new Resource("a"));
    
    assertThat(new Resource('a'), equalToObject(new Resource('a')), "two identical resources compare equally using equals()");
    // The previous test is in lieu of the following, which fails because new Object() != new Object()
    //equal(new Resource("a"), new Resource("a"), "two identical resources must be equal");

    ok(new Resource("rdfs:member") == "rdfs:member");
    ok(toResource("rdfs:member") == toResource("rdfs:member"), "instances should be static final");
    ok(new Resource("_:blank").isBlank(), "a blank node should return an rdf resource blank node");
    ok(new Resource("http://example.com").isUri(), "a node with http:// should be of type uri");
    equal(new Resource("Text").toRdfResource().type,'literal', "a node with text should be of type literal");
    equal(new Resource('a').toRdfResource().toString(),'"a"', "a character in RDF should be double quoted");
    equal(new Resource('"').toSparqlString(),'"\\""', "a double quote in RDF should be escaped ");
    equal(new Resource('"').toString(),'"', "a double quote should be output as a double quote");

    var bnode1 = new Resource("[]");
    ok(bnode1.isBlank(), "resource created with [] should be blank");
    var bnode2 = new Resource("[]");
    notEqual(bnode1, bnode2, "[] should create a new blank node every time");

    var bnode1 = new Resource("_:blank");
    ok(bnode1.isBlank(), "resource created with _: should be blank");
    var bnode2 = new Resource("_:blank");
    deepEqual(bnode1, bnode2, "_:id should create identical blank nodes");

    var bnodeWithColons1 = new Resource("_:abc:123-456");   // Fuseki generates yet does not accept blank nodes several 'colons' or 'dashes'
    var bnodeWithColons2 = new Resource("_:abc:123-456");
    assertThat(bnodeWithColons1, equalToObject(bnodeWithColons2), "two blank nodes with dashes should be equal to eachother");

    var bnode3 = bnode1;
    equal(bnode3.toRdfResource(),bnode1.toRdfResource());
    
    var r1 = new Resource("_:blank");
    var r2 = new Resource(r1);
    deepEqual(r2, r1, "a new resource created from an existing resource should be equal");

    var label = new Resource("rdf:foo");
    equal(label.toString(), "rdf:foo", "a resource should preserve CURIEs");
    
    var literal = new Resource("foo");
    equal(literal, "foo", "a resource should contain a string literal");

    var r = new Resource(':123');
    equal(r.toString(),':123', "default prefix should be preserved");

    var resourceWithColon = new Resource("Hello my friend: how are you?");
    assertThat(resourceWithColon.isLiteral(), truth(), "a resource with ':' can be a literal");
});
test("string with known scheme prefix should be not interpreted as a namespace", function() {
    var r = new Resource('urn:uuid:02e123c8-8534-4b4d-b726-3db7eff2b6c3');
    assertThat(r.isUri());
    r = new Resource('http://example.com');
    assertThat(r.isUri());
    r = new Resource('the site http://example.com is awesome');
    assertThat(r.isLiteral());
});
test("triple", function() {

    var r = new Resource(':123');
    equal(new Triple(r,r,r).toString(), ":123 :123 :123 .", "default prefix should be preserved in triples");

    var triple = new Triple(':1', ':2', ':3');
    equal(triple.subject, ':1');
    equal(triple.predicate, ':2');
    equal(triple.object, ':3');

    equal(new Triple(':1', ':2', ':3').operation, "update", "a new triple should default to update");
    equal(new Triple(':1', ':2', ':3', 'delete').operation, "delete", "a new triple can be set to delete");

    ok(new Triple(':1', ':2', ':3').equals(new Triple(':1', ':2', ':3')), "two identical triples should be identical with .equal");
    assertThat(new Triple(':1', ':2', ':3'), equalToObject(new Triple(':1', ':2', ':3')), "two identical triples should be identical with ==");

    // Does not work
    //assertThat(new Triple(':1', ':2', ':3'), equalTo(new Triple(':1', ':2', ':3')), "two identical triples should be identical with ==");
});
test ("create a triple from another triple", function() {
    var triple = new Triple(':1', ':2', ':3');
    var triple2 = new Triple(triple);
    assertThat(triple, equalToObject(triple2));

    var rdftriple = $.rdf.triple("<#1> <#2> <#3>");
    var triple3 = new Triple(rdftriple);
    assertThat(triple3, equalToObject(triple));
});
test("triples", function() {
    var triples = new Triples(new Triple(':1', ':2', ':3'), new Triple(':4', ':5', ':6'));
    equal(triples[0].subject, ':1');
    equal(triples[0].predicate, ':2');
    equal(triples[0].object, ':3');
    equal(triples[1].subject, ':4');
    equal(triples[1].predicate, ':5');
    equal(triples[1].object, ':6');

    assertThat(triples, hasItem(equalToObject(new Triple(':1',':2',':3'))));
    assertThat(triples.subjects(), hasItem(':1'), "the subject list contains the first subject");
    assertThat(triples.subjects(), hasItem(':4'), "the subject list contains the second subject");
    assertThat(triples.subjects().length, equalTo(2), "the list of subjects has two items");

    assertThat(triples.triples().length, equalTo(2), "filtering without specifying any specifics returns all");
    assertThat(triples.triples(":1"), hasItem(equalToObject(triples[0])));
    assertThat(triples.triples(undefined, ":2"), hasItem(equalToObject(triples[0])));
    assertThat(triples.triples(undefined, undefined, ":3"), hasItem(equalToObject(triples[0])));
    assertThat(triples.triples(undefined, ":2", ":3"), hasItem(equalToObject(triples[0])));

    equal(triples.update().length, 2, "in a new list of triples, they should all be to updateable");
    equal(triples.delete().length, 0, "in a new list of triples, none should be to delete");

    triples = new Triples();
    triples.push(new Triple(':1', ':2', ':3', "delete"));
    equal(triples.update().length, 0, "in a new list of triples, they should all be to deleted");
    equal(triples.delete().length, 1, "in a new list of triples, none should be to update");
});

test('triples.literal', function() {
    var triples = toTriples(toTriple(':s', ':p1', '1'));
    assertThat(triples.literal(), '1');

    triples.add(toTriple(':s2', ':p2', '2'));
    assertThat(triples.literal(), '1,2');
    assertThat(triples.literal(':s'), '1');
    assertThat(triples.literal(undefined, ':p1'), '1');
});


test("triples from JSON", function() {
    var json = { 
        "http://ex.com/1" : { 
            "http://www.w3.org/2000/01/rdf-schema#label" : [ { 
                "type" : "literal" ,
                "value" : 'Some text'
                } ]
        }
    };
    var triples = $.notepad.toTriples(json);
    assertThat(triples.length, 1);

    triples.add({
        "http://ex.com/2" : { 
            "rdfs:label" : [{ value: "1", type: "literal" }]
        }
    });
    assertThat(triples.length, 2);

    var reification = $.notepad.toTriples(
            { "_:" : {
                "rdf:subject": [{ type: 'uri', value: ":s" }],
                "rdf:predicate": [{ type: 'uri', value: ":p" }],
                "rdf:object": [{ type: 'uri', value: ":o" }],
                "prov:activity": [{ type: 'uri', value: ":functionABC" }],
                "dc:created": [{ type: 'literal', value: Date.now().toString() }]
            } });
    assertThat(reification.length, 5);
    console.debug(reification.toPrettyString());

});

// Skipped because I can't seem to be able to mock Triples, maybe because it uses makeSubArray.
skippedTest("when I mock Triples", function() {
    var triples = new Triples();
    var mockTriples = mock(triples);
    assertThat(JsMockito.isMock(mockTriples), truth(), "the mock is recognized as such");

    mockTriples.sparql();
    // THIS SHOULD NOT PASS
    verify(mockTriples, times(5)).sparql();
});

test("when I create a resource from a Fuseki binding", function() {
    var literal = 'a string with a " double quote';
    equal(new Resource({type: "literal", value: literal}).toString(), 'a string with a " double quote');
    equal(new Resource({type: "literal", value: literal}).toSparqlString(), '"a string with a \\" double quote"');
});

test("resources from FusekiEndpoint", function() {
    var bnode1 = new Resource({type: 'bnode', value:'a'});
    ok(bnode1.isBlank(), "resource created with a {} should be blank");

    var bnode2 = new Resource({type: 'bnode', value:'b'});
    notEqual(bnode1, bnode2, "blank nodes created with different values should not be equal");
    
    var bnode3 = new Resource({type: 'bnode', value:'a'});
    deepEqual(bnode1, bnode3, "blank nodes created with the same values should be equal");
});
test("triples to rdfquery", function() {
    var triples = new Triples(new Triple(':1', ':2', ':3'), new Triple(':4', ':5', ':6'));
    var data = triples.toDatabank();
    equal(data.size(), 2);
});

module("given a collection of triples", {
    setup: function() {
        this.triples = new Triples(
            new Triple('ex:s','ex:p','ex:o'),
            new Triple('ex:s1','ex:p1','ex:o1'),
            new Triple('ex:s2','ex:p2','ex:o2'),
            new Triple('ex:s2','ex:p1','ex:o1')
        );
    },
    teardown: function() {
    }

});
test("when two subjects are the same, then", function() {
    var triples = new Triples(
        new Triple('ex:s1','ex:p','ex:o'),
        new Triple('ex:s1','owl:sameAs','ex:s2')
    );
    ok(triples.contains(new Triple('ex:s1', 'ex:p', 'ex:o')), "a collection should contain triples");
    ok(!triples.contains(new Triple('ex:s2', 'ex:p', 'ex:o')), "a collection should not contain derived triples");
    ok(triples.expresses(new Triple('ex:s1', 'ex:p', 'ex:o')), "a collection should express triples in the collection");
    ok(triples.expresses(new Triple('ex:s2', 'ex:p', 'ex:o')), "a collection should express triples with an identical subject");
    ok(!triples.expresses(new Triple('ex:s3', 'ex:p', 'ex:o')), "a collection should express an unknown triple");
});
test("when two predicates are the same, then", function() {
    var triples = new Triples(
        new Triple('ex:s','ex:p1','ex:o'),
        new Triple('ex:p2','owl:sameAs','ex:p1')
    );
    ok(triples.expresses(new Triple('ex:s', 'ex:p1', 'ex:o')), "a collection should express triples in the collection");
    ok(triples.expresses(new Triple('ex:s', 'ex:p2', 'ex:o')), "a collection should express triples with an identical predicate");
    ok(!triples.expresses(new Triple('ex:s', 'ex:p3', 'ex:o')), "a collection should express an unknown triple");
});
test("when I query for labels", function() {
    var triples = new Triples(
        new Triple(':s1','rdfs:label','label for s1'),
        new Triple(':s2','rdfs:label','label for s2'),
        new Triple(':s2','rdfs:label','label2 for s2')
    );
    equal(triples.getLabels(':s1').length, 1, "it should contain one label");
    ok(triples.getLabels(':s1').contains(triples[0]), "it should provide a label for s1");
    ok(triples.getLabels(':s2').contains(triples[1]), "it should provide the first of two labels for s2");
    ok(triples.getLabels(':s2').contains(triples[2]), "it should provide the second of two labels for s2");
    ok(!triples.getLabels(':s2').contains(triples[0]), "it should not provide a label for s1");
});