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

    literal.setLiteralWithoutRange("literal");
    assertThat(literal.getLiteral(), "literal");

	assertThat(literal.triples(), [':s :p "literal" .']);

    var dateLiteral = $.rdf.literal('"2013-01-01"^^xsd:date' , { namespaces: $.notepad.namespaces } );
    var dateResource = new Resource(dateLiteral);
    literal.setLiteral(dateResource);

    assertThat(literal.triples(), [':s :p "literal" .']);

});

test("create object with triple", function() {

	var s = $('<div about=":s">');
	var p = $('<div rel=":p">').appendTo(s).predicate();
	var o = $('<div>').appendTo(p).object();

	var object = o.data('notepadObject');
    assertThat(object.triples(), []);

    object.setObject(new Resource("literal"));
	assertThat(object.triples(), [':s :p "literal" .']);

    object.setObject(new Resource(':o'));
	assertThat(object.triples(), [':s :p :o .']);
});
