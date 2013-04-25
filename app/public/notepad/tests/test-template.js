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
