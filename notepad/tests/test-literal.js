test("init", function() {
    var element;

    element = $("<div>123</div>");
    element.literal();
    assertThat(element.data('notepadLiteral').getLiteral(), "123");

    element = $('<div><div class="value">123</div></div>');

    element.literal();
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
    literal.options.ranges = toTriples(toTriple(':p', 'rdfs:range', 'rdf:XMLLiteral'));

    literal.setLiteral('<div>foo</div>');

    assertThat(literal.element.html(), containsString('<div>foo</div>'));
});

skippedTest("findObjectLocation", function() {
    var dom = $('<div about=":marc"><div rel=":first">Marc</div></div>');

    var objectLocations = dom.findObjectLocations(':marc', ':first');
    assertThat(objectLocations.text(), 'Marc');

    var objects = objectLocations.object();
    objects.data('notepadObject').setObject(toResource("Marc"));
    assertThat(dom.text(), "Marc");

    var objectLocations = dom.findObjectLocations(':marc', ':first');
    assertThat(objectLocations.length, 1);

});

module("mock findEndpoint", {
    setup: function() {
        $.fn.findEndpoint = mockFunction("findEndpoint", $.fn.findEndpoint);
        when($.fn.findEndpoint)().then(function(arg) {
            return $.notepad.dev;
        });
  
    },
    teardown: function() {
        // I could restore findEndpoint if necessary
    }
});

test("create", function() {

    var element = $('<div>').literal();

    assertThat(element.data('notepadLiteral').triples(), []);

});

test("create with triple", function() {

	var s = $('<div about=":s">').appendTo("#fixture");
	var p = $('<div rel=":p">').appendTo(s).predicate();
	var l = $('<div>').appendTo(p).literal();

	var literal = l.data('notepadLiteral');
    assertThat(literal.triples(), []);

    literal._setLiteral("literal");
    assertThat(literal.getLiteral(), "literal");

	assertThat(literal.triples(), [':s :p "literal" .']);

    var dateLiteral = $.rdf.literal('"2013-01-01"^^xsd:date' , { namespaces: $.notepad.namespaces } );
    var dateResource = new Resource(dateLiteral);
    literal._setLiteral(dateResource);

    assertThat(literal.triples(), [':s :p "2013-01-01" .']);
    start();

});

test("discover predicate", function() {
    deepEqual($.notepad.discoverPredicate('a: foo'), {predicate: 'a', remainder: 'foo'});
    deepEqual($.notepad.discoverPredicate('http:foo'), undefined);
    deepEqual($.notepad.discoverPredicate('http protocol:foo'), {predicate: 'http protocol', remainder: 'foo'});
});