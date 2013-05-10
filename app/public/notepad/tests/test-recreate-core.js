asyncTest("verify and reset core", function() {
    var endpoint = $.notepad.getEndpoint();
    endpoint.graph = ':core';

    var coreTriples = toTriples(
        'rdfs:member        rdfs:label           "member" ',
        'rdfs:member        inst:inverseLabel    "appears on" ',
        'rdf:type           rdfs:label           "a"',
        'rdfs:range         rdfs:label           "Range" ',

        'sd:SPARQL11Update     rdfs:range           sd:SPARQL11Update ',
        'sd:SPARQL11Update     rdfs:label           "Sparql" ',

        'inst:Session    rdfs:label          "Session"',

        'inst:All        sd:SPARQL11Update       "construct {?s ?p ?o} where {?s ?p ?o filter not exists {?s a inst:Session}}" ',
        'inst:All        rdfs:label           "All" ',

        'inst:Datasets   sd:SPARQL11Update      "construct {?s a inst:Dataset} where { graph ?s { ?session a inst:Session } }" ',
        'inst:Datasets   rdfs:label          "Datasets"',

        'inst:Sessions   sd:SPARQL11Update      "construct {?s a inst:Session} where {?s a inst:Session}" ',
        'inst:Sessions   rdfs:label          "Sessions"'
    );

    endpoint.clear().then(function() {
        return endpoint.insertData(coreTriples);
    }).then(function() {
        return endpoint.constructAll();
    }).then(function(all) {
        assertThat(all.length, equalTo(coreTriples.length), "core has the correct number of triples");
        console.log(all.pp());
        start();
    });
});