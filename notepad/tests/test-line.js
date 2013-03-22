test("discoverPredicate", function() {
    $.notepad.queries.describe_predicate = mock(Query);
    when($.notepad.queries.describe_predicate).execute(anything(), anything(), anything()).then(function() {
        arguments[2](toTriples(toTriple("rdfs:member", "rdfs:range", "xsd:string")));
    });
    $.notepad.queries.find_predicate_label_by_label = mock(Query);
    when($.notepad.queries.find_predicate_label_by_label).execute(anything(), anything(), anything()).then(function() {
        arguments[2](toTriples(toTriple(":p", "rdfs:label", "predicate")));
    });
    
    var container = $("<ul about=':s'>").appendTo("body").container();
    var el = $("<li>").appendTo(container).line();
    var line = el.data('notepadLine');

    line.getObject().uri().setLabel("predicate: literal");

    line.discoverPredicate();
    assertThat(line.getPredicate().getUri(), ":p");
    assertThat(line.getPredicateLabel().getLabel(), "predicate");
    assertThat(line.getObject().uri().getLabel(), "literal");
});

QUnit.file = "test-line.js";
module("given a new line", {
    setup: function() {
        // this.endpoint = mock(new FusekiEndpoint("http://ex.com"));
        this.endpoint = new Triples();
    	this.dom = $('<div id="container" about=":s"><div id="line"/></div>');
    	this.container = this.dom.container().data('notepadContainer');
        this.line = this.dom.find('#line').line().data('notepadLine');
    },
    teardown: function() {
        this.line.destroy();
    }
});
test("when I do nothing", function() {
	assertThat(this.line.getObject(), not(nil()), "it has an object");
	// this.line.setTriple(new Triple(":s", ":p", ":o"));
    // assertThat(this.line.getObject().length, 1, "initial line has 1 object");
});
test("when I access the child container", function() {
    // Current: predicate.getSubjectUri(). uses: closest() to find subjectUri. implies: predicate should be inside object
    // (a) move childContainer inside label
    //  label could own displaying child lines.  Which makes sense.
    // (b) change predicate.getSubjectUri() to use subjectElement.  set subjectElement.
    //      when moving a line (indent, unindent), the predicate's subjectElement stays pointing to the original object
    //      i'm going to be moving lines around

    this.line.getObject().setUri(":abc");

    var childContainer = this.line.getChildContainer();
    var childLine = childContainer.appendLine();

    var line2 = childLine.insertLineAfter();

    var line3 = childContainer.appendLine();
    line3.indent();

    var triple = new Triple(":abc", ":p", "123");
    childContainer.update(toTriples(triple));
    assertThat(childContainer.triples(), hasItem(equalToObject(triple)));
});
