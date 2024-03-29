$(document).ready(function() {

    var ns = {
        rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        rdfs: "http://www.w3.org/2000/01/rdf-schema#",
        xsd: "http://www.w3.org/2001/XMLSchema#",
        dc: "http://purl.org/dc/elements/1.1/",
        foaf: "http://xmlns.com/foaf/0.1/",
        cc: "http://creativecommons.org/ns#",
        vcard: "http://www.w3.org/2001/vcard-rdf/3.0#",
        ex: "http://www.example.com/",
        owl: "http://www.w3.org/2002/07/owl#",
    };

    module("rdfquery.js");

    test("can create a URI", function() {
        var uri = $.uri('http://example.com/resource#fragment');
        equal(uri,'http://example.com/resource#fragment');
    });

    test("can create a literal", function() {
        var literal = $.rdf.literal('1');
        equal(literal.toString(), '"1"^^<http://www.w3.org/2001/XMLSchema#integer>');

        literal = $.rdf.literal('"a"');
        equal(literal.toString(), '"a"');

        literal = $.rdf.literal('"a quoted literal with a \\" (an escaped double quote)"');
        equal(literal.toString(), '"a quoted literal with a \\" (an escaped double quote)"');

        // equal($.rdf.literal('a non-quoted string with a " (a quote character)').toString(),
        //     '"a non-quoted string with a \\" (a quote character)"');

        // equal($.rdf.literal('"\\\\""').toString(), '"\\""');

        // BUG: The following test fails if the previous test is not executed right before it
        // http://code.google.com/p/rdfquery/issues/detail?id=30
        equal($.rdf.literal('" \\" "').toString(), '" \\" "');
    });
    
    test("can create a resource", function() {
        var resource = $.rdf.resource('rdf:foo', {namespaces: {rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#"}});
        equal(resource.value.toString(), "http://www.w3.org/1999/02/22-rdf-syntax-ns#foo");
    });

    test("can create a CURIE", function() {
        var uri = "http://www.w3.org/1999/02/22-rdf-syntax-ns#foo";
        var curie = $.createCurie(uri, {namespaces: {rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#"}});
        equal(curie,'rdf:foo');
    });

    test("can create a new triple", function() {
        expect(4);
        var triple = $.rdf.triple($.rdf.blank('[]'), $.rdf.label, $.rdf.literal('"foo"'));
        equal(triple.subject.type,'bnode');
        equal(triple.property,$.rdf.label);
        equal(triple.object.value,'foo');
        
        triple = $.rdf.triple($.rdf.resource('<http://example.com/foo>'), $.rdf.label, $.rdf.literal('"foo"'));
        equal(triple.subject.type,'uri');
    
    });

    // test("can create a new triple with well known namespaces", function() {
    //     var triple = $.rdf.triple($.rdf.blank('[]'), 'rdfs:label', $.rdf.literal('"foo"'));
    //     equal(triple.property,$.rdf.label);
    // });

    function getTriple(label) {
        if (label===undefined) {
            label = "label";
        }
        return $.rdf.triple($.rdf.blank('[]'), $.rdf.label, $.rdf.literal('"'+label+'"'));
    }
    
    test("can add triples to a databank", function() {    
        var graph = $.rdf.databank();
        equal(graph.size(),0);
        graph.add(getTriple());
        equal(graph.size(),1);
        deepEqual(graph.triples()[0].subject.type,'bnode');
        graph.add(getTriple('label2'));
        equal(graph.size(),2);
    });

    test("can iterate over triples in a databank", function() {
        var graph = $.rdf.databank();
        graph.add(getTriple());
        equal(graph.triples().length,1, "triples are not of length 1" + graph.triples());
    });

    test("can query triples in a graph", function() {
        var graph = $.rdf.databank();
        graph.add(getTriple());
        var rdf = $.rdf( {databank: graph });
        console.debug(rdf.databank.size());
        console.debug(JSON.stringify(rdf.databank.dump()));
        console.debug(rdf.databank.dump({format: "text/turtle"}));
        equal(rdf.where('?s ?p ?o').length, 1, "the rdf object should contain one triple");
    });

    test("can reason with sameAs", function() {
        var rule = $.rdf.rule(['?subject1 owl:sameAs ?subject2', '?subject1 ?p ?o'], '?subject2 ?p ?o', { namespaces: ns });
        data = $.rdf.databank().prefix('owl', ns.owl).prefix('ex', ns.ex);
        data.add('<#me> ex:pred "123"');
        data.add('<#me> owl:sameAs <#me2>');
        equal(data.size(), 2);
        rule.run(data);
        equal(data.triples()[2], $.rdf.triple('<#me2> ex:pred "123"', { namespaces: ns }));
    });

    test("rdfa", function() {
        // $("<div id='container'>").attr('xmlns:notepad', 'http://ex.com/');

        // $('<span class="author" about="photo1.jpg" property="dc:creator">Joe</span>').appendTo('#main');
        // var rdf = $('#main > span').rdf();
        // assertThat(rdf.databank.triples().length, equalTo(1), "there should be one triple");

        // // Requires the attribute xmlns:dc in html (in parent?)
        // assertThat($('<span about="p.jpg" property="dc:creator">Joe</span>').appendTo('#main').rdf().databank.size(), 1);

        var rdf = $('<span xmlns:dc="http://purl.org/dc/elements/1.1/" about="p.jpg" property="dc:created" content="1234">1/1/2012</span>').rdf();
        assertThat(rdf.databank.size(), 1);
        rdf = rdf.where('<p.jpg> dc:created "1234"');
        assertThat(rdf.length, 1);
        
        // assertThat(JSON.stringify(rdf.dump({format: "text/turtle"})), "");

        // assertThat($('<span xmlns:dc="http://purl.org/dc/elements/1.1/" about="p.jpg" property="dc:created" content="123">1/1/2012</span>').appendTo('#main').rdf().databank.size(), 1);
        // assertThat($('<span xmlns:notepad="http://ex.com/" about="p.jpg" property="notepad:creator">Joe</span>').appendTo('#main').rdf().databank.size(), 1);
        // assertThat($('<span about="p.jpg" property="dc:creator">Joe</span>').appendTo('#main').rdfa().databank.size(), 1);
    });

    test("add JSON to a databank", function() {
        var json = { 
            "http://ex.com/1" : { 
                "http://www.w3.org/2000/01/rdf-schema#label" : [ { 
                    "type" : "literal" ,
                    "value" : 'Some text'
                    } ]
            }
        };
        var data = $.rdf.databank();
        data.load(json);
        assertThat(data.size(), 1);

    });

    
});
