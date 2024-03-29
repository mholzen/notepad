test("create", function() {
    var element = $('<div>').literal();

    assertThat(element.data('notepadLiteral').triples(), []);
});

test("create with value", function() {
    var element = $("<div>123</div>").literal();
    assertThat(element.data('notepadLiteral').getLiteral(), "123");

    element = $('<div><div class="value">123</div></div>').literal();
    assertThat(element.data('notepadLiteral').getLiteral(), "123");
});

test("type URL", function() {
    var literal = $("<div>").literal().data('notepadLiteral');

    // via the browser, keyboard, user
    literal.element.find('[contenteditable="true"]').text('http://ex.com');
    assertThat(literal.getObject().isLiteral(), true);
    assertThat(literal.getObject(), 'http://ex.com');

    // via the API
    literal.setLiteral('http://another.example');
    assertThat(literal.getObject().isLiteral(), true);
    assertThat(literal.getObject(), 'http://another.example');
});

test("html", function() {
    var element = $('<div rel=":p">').literal();
    var literal = element.data('notepadLiteral');

    literal.setLiteral(toLiteral('<div>foo</div>','rdf:XMLLiteral'));
    assertThat(literal.element.html(), containsString('<div>foo</div>'));
});

test("retain datatype", function() {
  var literal = $("<div>").literal().data('notepadLiteral');
  literal.setLiteral(toLiteral('2010-10-10', 'xsd:dateTime'));
  assertThat(literal.datatype(), instanceOf($.notepad.xsddate));
  assertThat(literal.getLiteral().datatype(), 'xsd:dateTime');
});

testWithTriples("query for range", toTriples(toTriple(':p', 'rdfs:range', 'rdf:XMLLiteral')), function() {
    var element = $('<div rel=":p">').literal().endpoint({endpoint: this.endpoint});

    var literal = element.data('notepadLiteral');

    literal.discoverDatatype().done(function() {
        literal.setLiteral('<div>foo</div>');
        assertThat(literal.element.html(), containsString('<div>foo</div>'));
        start();
    });

});

test("create with triple", function() {

	var s = $('<div about=":s">').appendTo("#fixture");
	var p = $('<div rel=":p">').appendTo(s).predicate();
	var l = $('<div>').appendTo(p).literal();

	var literal = l.data('notepadLiteral');
    assertThat(literal.triples(), []);

    literal.setLiteral("literal");
    assertThat(literal.getLiteral(), "literal");

	assertThat(literal.triples(), [':s :p "literal" .']);

    var dateLiteral = $.rdf.literal('"2013-01-01"^^xsd:date' , { namespaces: $.notepad.namespaces } );
    var dateResource = new Resource(dateLiteral);
    literal.setLiteral(dateResource);

    assertThat(literal.triples(), [':s :p "2013-01-01" .']);
    start();

});

test("discover predicate", function() {
    deepEqual($.notepad.discoverPredicate('a: foo'), {predicate: 'a', remainder: 'foo'});
    deepEqual($.notepad.discoverPredicate('http:foo'), undefined);
    deepEqual($.notepad.discoverPredicate('http protocol:foo'), {predicate: 'http protocol', remainder: 'foo'});
});