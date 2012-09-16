module("resources and triples");
{
    test("triples and resources", function() {
        equal(new Resource("a"),"a");
        equal("a",new Resource("a"));
        ok(new Resource("_:blank").isBlank(), "a blank node should return an rdf resource blank node");
        ok(new Resource("http://example.com").isUri(), "a node with http:// should be of type uri");
        equal(new Resource("Text").toRdfResource().type,'literal', "a node with text should be of type literal");
        equal(new Resource('a').toRdfResource().toString(),'"a"', "a character in RDF should be double quoted");
        //equal(new Resource('"').toRdfResource().toString(),'"\\""', "a double quote in RDF should be escaped ");  // BUG in rdf.literal
        equal(new Resource('"').toString(),'"', "a double quote should be output as a double quote");

        var bnode1 = new Resource("[]");
        ok(bnode1.isBlank(), "resource created with [] should be blank");
        var bnode2 = new Resource("[]");
        notEqual(bnode1, bnode2, "[] should create a new blank node every time");

        var bnode1 = new Resource("_:blank");
        ok(bnode1.isBlank(), "resource created with _: should be blank");
        var bnode2 = new Resource("_:blank");
        deepEqual(bnode1, bnode2, "_:id should create identical blank nodes");

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
        equal(new Triple(r,r,r).toString(), ":123 :123 :123 .", "default prefix should be preserved in triples");

        //equal(new Triple(':1', ':2', ':3').toString(), ":1 :2 :3.", "a new triple should default to update");
        //equal(new Triple(':1', ':2', new Resource("foo")).toString(), ':1 :2 "foo".', "a new triple should default to update");
        equal(new Triple(':1', ':2', ':3').operation, "update", "a new triple should default to update");
        equal(new Triple(':1', ':2', ':3', 'delete').operation, "delete", "a new triple can be set to delete");

        ok(new Triple(':1', ':2', ':3').equals(new Triple(':1', ':2', ':3')), "two identical triples should be identical");

        var triples = new Triples(new Triple(':1', ':2', ':3'), new Triple(':4', ':5', ':6'));
        equal(triples[0].subject, ':1');
        equal(triples[0].predicate, ':2');
        equal(triples[0].object, ':3');
        equal(triples[1].subject, ':4');
        equal(triples[1].predicate, ':5');
        equal(triples[1].object, ':6');

        equal(triples.update().length, 2, "in a new list of triples, they should all be to updateable");
        equal(triples.delete().length, 0, "in a new list of triples, none should be to delete");
        equal(triples.sparql().length, 1, "there should be one sparql command");

        triples = new Triples(0);
        triples.push(new Triple(':1', ':2', ':3', "delete"));
        equal(triples.update().length, 0, "in a new list of triples, they should all be to deleted");
        equal(triples.delete().length, 1, "in a new list of triples, none should be to update");
        equal(triples.sparql().length, 1, "there should be one sparql command");
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
        var DEFAULT_NAMESPACES = {
            xsd:  "http://www.w3.org/2001/XMLSchema#",
            rdf:  "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            rdfs: "http://www.w3.org/2000/01/rdf-schema#",
            owl:  "http://www.w3.org/2002/07/owl#",
            '':   "http://localhost/this#",
        };

        var triples = new Triples(new Triple(':1', ':2', ':3'), new Triple(':4', ':5', ':6'));
        var data = triples.toDatabank();
        equal(data.size(), 2);
    });
}
module("given a collection of triples");
{
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

}
