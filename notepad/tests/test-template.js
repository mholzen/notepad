test("context", function() {

    var dateLiteral = $.rdf.literal('"2013-01-01"^^xsd:date' , { namespaces: $.notepad.namespaces } );
    var dateResource = new Resource(dateLiteral);
    var triple = new Triple(":s", ":p", dateResource);

    var template = new Template();
    var context = template.context(toTriples(triple));

    equal(context, []);


});

test("basic", function() {
    var templateString = '' +
    '{{#:p1}}' +
        'uri: {{uri}}' +
    '{{/:p1}}' +
    '{{#:p2}}' +
        'literal: {{xsd:string}}' +
    '{{/:p2}}' +
    '';

    var template = new Template(templateString);
    var triples = toTriples([toTriple(":s", ":p1", ":o"),toTriple(":s", ":p2", "literal")]);
    var result = template.render(triples);
    assertThat(result, containsString('uri: :o'));
    assertThat(result, containsString('literal: literal'));
});
